import logging
from uuid import UUID
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
import json

from src.database.db import AsyncSession
from src.database.models import User
from src.repositories.chat_repository import ChatRepository
from src.repositories.chat_participant_repository import ChatParticipantRepository
from src.repositories.user_repository import UserRepository
from src.exception_handlers.chat_exception import ChatIsNotGroupException, OwnerCantLeaveChatException, InvalidChatCreationException
from src.exception_handlers.user_exceptions import UserNotFoundException, UserAlreadyParticipantInChatException
from src.exception_handlers.db_exception import DatabaseException
from src.api.schemas.chat_schema import ChatParticipantResponse
from .helper import Helper
from .file_service import FileService
from src.redis.redis_service import RedisService

logger = logging.getLogger("chat_participant")


class ChatParticipantService:
	def __init__(self, sesison: AsyncSession, redis_service: RedisService):
		self.session = sesison
		self.user_repo = UserRepository(session=self.session)
		self.chat_repo = ChatRepository(session=self.session)
		self.chat_participant_repo = ChatParticipantRepository(session=self.session)
		self.helper = Helper(session=self.session)
		self.file_service = FileService()
		self.redis = redis_service

	async def add_participant_to_group_chat(self, chatId: UUID, phone_number: str, current_user: User) -> dict[str, str]:
		chat = await self.helper.get_chat_or_404(chatId=chatId)
		
		if not chat.is_group:
			logger.warning(
				"Chat is private, not group chat",
				extra={"chat_id": str(chatId)}
			)

			raise ChatIsNotGroupException("Chat is not group, you can't add participant")

		await self.helper.get_owner_or_403(ownerId=current_user.id, chatId=chatId)
		
		user = await self.user_repo.get_user_by_phone_number(phone_number=phone_number)

		if not user:
			logger.warning(
				"User not found by id",
				extra={"phone_number": phone_number}
			)

			raise UserNotFoundException("User not found")

		if user.id == current_user.id:
			logger.warning(
				"User can't add yourself to chat",
				extra={
					"chat_id": str(chatId),
					"user_id": str(current_user.id)
				}
			)

			raise InvalidChatCreationException("User can't add yourself to chat")

		is_participant = await self.chat_participant_repo.is_participant(userId=user.id, chatId=chatId)

		if is_participant:
			logger.warning(
				"User already participant of the chat",
				extra={
					"chat_id": str(chatId),
					"user_id": str(current_user.id)
				}
			)
			
			raise UserAlreadyParticipantInChatException("User already in the chat")

		try:
			await self.chat_participant_repo.create(
				chat_id=chatId,
				user_id=user.id
			)

			await self.session.commit()

			logger.info(
				"New participant added to the chat",
				extra={
					"chat_id": str(chatId),
					"user_id": str(user.id)
				}
			)
	
			return {"detail": "New participant added to the chat"}

		except IntegrityError as e:
			await self.session.rollback()

			logger.error(
				f"Database error, new participant not created: {e}",
				exc_info=True,
				extra={"user_id": str(user.id)}
			)

			raise DatabaseException("Participant not added in chat")

		except SQLAlchemyError as e:
			await self.session.rollback()

			logger.error(
				f"Database error, new participant not created: {e}",
				exc_info=True,
				extra={"user_id": str(user.id)}
			)

			raise DatabaseException("Participant not added in chat")


	async def remove_participant_from_chat(self, chatId: UUID, userId: UUID, current_user: User) -> dict[str, str]:
		chat = await self.helper.get_chat_or_404(chatId=chatId)
	
		if not chat.is_group:
			logger.warning(
				"Chat is private, not group chat",
				extra={"chat_id": str(chatId)}
			)

			raise ChatIsNotGroupException("Chat is not group, you can't add participant")
		
		user = await self.user_repo.get(id=userId)

		if not user:
			logger.warning(
				"User not found by id",
				extra={"user_id": str(userId)}
			)

			raise UserNotFoundException("User not found")

		is_participant = await self.helper.get_participant_or_400(userId=userId, chatId=chatId)

		await self.helper.get_owner_or_403(ownerId=current_user.id, chatId=chatId)

		try:
			await self.chat_participant_repo.delete(id=is_participant.id)

			logger.info(
				"User successfully removed from the chat",
				extra={
					"chat_id": str(chatId),
					"user_id": str(current_user.id)
				}
			)

			return {"detail": "User removed from the chat"}

		except IntegrityError as e:
			await self.session.rollback()

			logger.error(
				f"Database error, participant not removed: {e}",
				exc_info=True,
				extra={
					"chat_id": str(chatId),
					"user_id": str(current_user.id)
				}
			)

			raise DatabaseException("Database error, pariticpant not removed")

		except SQLAlchemyError as e:
			await self.session.rollback()

			logger.error(
				f"Database error, participant not removed: {e}",
				exc_info=True,
				extra={
					"chat_id": str(chatId),
					"user_id": str(current_user.id)
				}
			)

			raise DatabaseException("Database error, pariticpant not removed")

	async def get_participants_chat(self, chatId: UUID, user: User) -> list[ChatParticipantResponse]:
		cached_data = await self.redis.get(f"participant:{chatId}")

		if cached_data:
			logger.info("Participants fetched from Redis cache")

			return [
				ChatParticipantResponse.model_validate(item)
				for item in json.loads(cached_data)
			]

		await self.helper.get_chat_or_404(chatId=chatId)

		await self.helper.get_participant_or_400(userId=user.id, chatId=chatId)

		participants = await self.chat_participant_repo.get_participants(chatId=chatId)

		serialized = [
			ChatParticipantResponse.model_validate(participant).model_dump(mode="json")
			for participant in participants
		]

		await self.redis.set(
			f"participant:{chatId}",
			json.dumps(serialized),
			expire_seconds=15
		)

		logger.info(
			"Successful response of participants in chat",
			extra={"chat_id": str(chatId)}
		)

		return [
			ChatParticipantResponse.model_validate(participant)
			for participant in participants
		]

	async def leave_chat(self, chatId: UUID, current_user: User) -> dict[str, str]: 
		try:
			chat = await self.helper.get_chat_or_404(chatId=chatId)

			is_participant = await self.helper.get_participant_or_400(userId=current_user.id, chatId=chatId)

			if chat.owner_id == current_user.id:
				chat_participants = await self.chat_participant_repo.get_participants(chatId=chatId)

				if len(chat_participants) == 1:
					await self.chat_participant_repo.delete(id=is_participant.id)
					
					logger.info(
						"Owner deleted from chat",
						extra={
							"user_id": str(current_user.id),
							"chat_id": str(chatId)
						}
					)

					if chat.chat_avatar_url:
						await self.file_service.delete_file(file_key=chat.chat_avatar_url)

					await self.chat_repo.delete(id=chat.id)

					logger.info(
						"Chat group is empty, chat deleted",
						extra={
							"user_id": str(current_user.id),
							"chat_id": str(chatId)
						}
					)

					return {"detail": "User successfully leaved from chat"}

				logger.warning(
					"Owner can't leave chat if chat has participants",
					extra={
						"user_id": str(current_user.id),
						"chat_id": str(chatId)
					}
				)

				raise OwnerCantLeaveChatException("Owner can't leave chat, if chat has participants, make owner another user or remove every user from chat")

			await self.chat_participant_repo.delete(id=is_participant.id)

			logger.info(
				"Successfully removed from chat",
				extra={
					"user_id": str(current_user.id),
					"chat_id": str(chatId)
				}
			)

			return {"detail": "User successfully leaved from chat"}

		except IntegrityError as e:
			await self.session.rollback()
			
			logger.error(
				f"Database error, participant not removed: {e}",
				exc_info=True,
				extra={
					"chat_id": str(chatId),
					"user_id": str(current_user.id)
				}
			)

			raise DatabaseException("Database error, pariticpant not removed")

		except SQLAlchemyError as e:
			await self.session.rollback()
			
			logger.error(
				f"Database error, participant not removed: {e}",
				exc_info=True,
				extra={
					"chat_id": str(chatId),
					"user_id": str(current_user.id)
				}
			)

			raise DatabaseException("Database error, pariticpant not removed")
