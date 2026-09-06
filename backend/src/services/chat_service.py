import logging
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from uuid import UUID
from fastapi import UploadFile
from fastapi.responses import FileResponse
from pathlib import Path
import json

from src.database.db import AsyncSession
from src.database.models import User
from src.api.schemas.chat_schema import ChatCreate, ChatResponse, ChatUpdate, CommonChatResponse
from src.repositories.chat_repository import ChatRepository
from src.repositories.user_repository import UserRepository
from src.repositories.chat_participant_repository import ChatParticipantRepository
from src.exception_handlers.user_exceptions import UserNotFoundException, SelfActionNotAllowedException
from src.exception_handlers.chat_exception import ChatIsNotGroupException, InvalidChatCreationException
from src.exception_handlers.db_exception import DatabaseException
from src.exception_handlers.file_exception import FileNotFoundException
from .helper import Helper
from .file_service import FileService
from src.redis.redis_service import RedisService

logger = logging.getLogger("chat")


class ChatService:
	def __init__(self, session: AsyncSession, redis_service: RedisService):
		self.session = session
		self.user_repo = UserRepository(session=self.session)
		self.chat_repo = ChatRepository(session=self.session)
		self.chat_participant_repo = ChatParticipantRepository(session=self.session)
		self.helper = Helper(session=self.session)
		self.file_service = FileService()
		self.redis = redis_service

	async def create_private_chat(self, phone_number: str, current_user: User) -> ChatResponse:
		user_id = await self.user_repo.get_user_id_by_phone_number(phone_number=phone_number)

		if not user_id:
			logger.warning(
				"User not found by phone number",
				extra={"phone_number": phone_number}
			)

			raise UserNotFoundException("User not found")

		if user_id == current_user.id:
			logger.warning(
				"User can't create private chat for yourself",
				extra={"user_id": str(current_user.id)}
			)

			raise InvalidChatCreationException("User can't create private chat for yourself")

		chat_participant = await self.chat_participant_repo.get_private_chat_of_two_user(
			user_id=user_id,
			current_user_id=current_user.id
		)

		if chat_participant and not chat_participant.is_group:
			chat = await self.chat_repo.get(id=chat_participant.id)

			logger.info("Private chat already exists between these users")

			return ChatResponse.model_validate(chat)
		try:
			new_private_chat = await self.chat_repo.create()

			await self.chat_participant_repo.create(
				chat_id=new_private_chat.id,
				user_id=current_user.id
			)

			await self.chat_participant_repo.create(
				chat_id=new_private_chat.id,
				user_id=user_id
			)

			await self.session.commit()

		except IntegrityError:
			await self.session.rollback()

			logger.error(
				"Database Error",
				exc_info=True,
				extra={
					"to_user": user_id,
					"current_user": current_user.id
				}
			)

			raise DatabaseException("Database Error")

		logger.info(
			"New chat created, and chat participants added",
			extra={
					"to_user": user_id,
					"current_user": current_user.id
				}
			)

		return new_private_chat

	async def create_group_chat(self, chat: ChatCreate, user: User, file: UploadFile | None = None) -> ChatResponse:
		file_key: str | None = None

		try:
			new_group_chat = await self.chat_repo.create(
				is_group=True,
				title=chat.title,
				description=chat.description,
				owner_id=user.id
			)

			if file:
				file_key = (
					await self.file_service.save_chat_avatar_file(
						chat_id=new_group_chat.id,
						file=file
					)
				)

				new_group_chat.chat_avatar_url = file_key

			await self.chat_participant_repo.create(
				chat_id=new_group_chat.id,
				user_id=user.id
			)

			logger.info(
				"New participant added to chat",
				extra={"user_id": str(user.id)}
			)

			await self.session.commit()
			await self.session.refresh(new_group_chat)

			logger.info(
				"New group chat created",
				extra={"user_id": str(user.id)}
			)
	
			return new_group_chat

		except IntegrityError as e:
			await self.session.rollback()

			logger.error(
				f"Database error, chat not created: {e}",
				exc_info=True,
				extra={"user_id": str(user.id)}
			)

			if file_key:
				await self.file_service.delete_file(file_key=file_key)

			raise DatabaseException("Database error, chat not created")

		except SQLAlchemyError as e:
			await self.session.rollback()
		
			logger.error(
				f"Database error, chat not created: {e}",
				exc_info=True,
				extra={"user_id": str(user.id)}
			)

			if file_key:
				await self.file_service.delete_file(file_key=file_key)

			raise DatabaseException("Database error, chat not created")


	async def update_chat(self, chatId: UUID, chatUpdate: ChatUpdate, user: User, file: UploadFile | None = None) -> ChatResponse:
		chat = await self.helper.get_chat_or_404(chatId=chatId)

		if not chat.is_group:
			logger.warning(
				"This chat is not group you can't edit it",
				extra={"chat_id": str(chatId)}
			)

			raise ChatIsNotGroupException("This chat is not group you can't edit it")

		await self.helper.get_owner_or_403(ownerId=user.id, chatId=chatId)

		file_key: str | None = None

		try:
			data = chatUpdate.model_dump(exclude_unset=True, exclude_none=True)

			if chat.chat_avatar_url and file:
				await self.file_service.delete_file(file_key=chat.chat_avatar_url)

			if file:
				file_key = (
					await self.file_service.save_chat_avatar_file(
						chat_id=chatId,
						file=file
					)
				)

			chat.chat_avatar_url = file_key

			update_chat = await self.chat_repo.update(
				id=chatId,
				data=data
			)

			logger.info(
				"Chat successfully updated",
				extra={
					"chat_id": str(chatId),
					"user_id": str(user.id)
				}
			)
	
			return update_chat

		except IntegrityError as e:
			await self.session.rollback()

			logger.error(
				f"Database error, chat not updated {e}",
				exc_info=True,
				extra={
					"chat_id": str(chatId),
					"user_id": str(user.id)
				}
			)

			raise DatabaseException("Chat not updated")

		except SQLAlchemyError as e:
			await self.session.rollback()

			logger.error(
				f"Database error, chat not updated {e}",
				exc_info=True,
				extra={
					"chat_id": str(chatId),
					"user_id": str(user.id)
				}
			)

			raise DatabaseException("Chat not updated")


	async def delete_chat(self, chatId: UUID, user: User) -> dict[str, str]:
		chat = await self.helper.get_chat_or_404(chatId=chatId)

		if not chat.is_group:
			logger.warning(
				"Chat is private you can't delete it",
				extra={"chat_id": str(chatId)}
			)

			raise ChatIsNotGroupException("Chat is private you can't delete it")
		
		await self.helper.get_owner_or_403(ownerId=user.id, chatId=chatId)

		if chat.chat_avatar_url:
			await self.file_service.delete_file(file_key=chat.chat_avatar_url)

		await self.chat_repo.delete(id=chatId)

		logger.info(
			"Chat successfully deleted",
			extra={"chat_id": str(chatId)}
		)

		return {"detail": "Chat successfully deleted"}

	async def delete_chat_for_admin(self, chatId: UUID) -> dict[str, str]:
		chat = await self.helper.get_chat_or_404(chatId=chatId)

		if chat.chat_avatar_url:
			await self.file_service.delete_file(file_key=chat.chat_avatar_url)
		try:
			await self.chat_repo.delete(id=chatId)

			logger.info(
				"Chat successfully deleted",
				extra={"chat_id": str(chatId)}
			)

			return {"detail": "Chat successfully deleted"}

		except IntegrityError as e:
			await self.session.rollback()

			logger.error(
				f"Database error, chat not deleted: {e}",
				exc_info=True,
				extra={"chat_id": str(chatId)}
			)

			raise DatabaseException("Database error, chat not deleted")

		except SQLAlchemyError as e:
			await self.session.rollback()

			logger.error(
				f"Database error, chat not deleted: {e}",
				exc_info=True,
				extra={"chat_id": str(chatId)}
			)

			raise DatabaseException("Database error, chat not deleted")

	async def get_chat_by_id(self, chatId: UUID, user: User) -> ChatResponse: 
		await self.helper.get_chat_or_404(chatId=chatId)

		await self.helper.get_participant_or_400(userId=user.id, chatId=chatId)

		chat = await self.chat_repo.get_chat_if_private_title_as_username(chatId=chatId, current_user_id=user.id)

		logger.info(
			"Successful response response",
			extra={"chat_id": str(chatId)}
		)

		return ChatResponse.model_validate(chat)

	async def get_user_chats(self, user: User) -> list[ChatResponse]:
		cached_data = await self.redis.get(f"chat:{user.id}")

		if cached_data:
			logger.info("Chats fetched from Redis cached")

			return [
				ChatResponse.model_validate(item)
				for item in json.loads(cached_data)
			]
		
		chat_participants = await self.chat_participant_repo.get_user_participant_in_chats(userId=user.id)

		chat_ids = [
			participant.chat_id
			for participant in chat_participants
		]

		chats = await self.chat_repo.get_chats_by_ids(chatIds=chat_ids, current_user_id=user.id)

		serialized = [
			ChatResponse.model_validate(chat).model_dump(mode="json")
			for chat in chats
		]

		await self.redis.set(
			f"chat:{user.id}",
			json.dumps(serialized),
			expire_seconds=15
		)

		logger.info(
			"Successful chat responses",
			extra={"user_id": str(user.id)}
		)

		return [
			ChatResponse.model_validate(chat)
			for chat in chats
		]

	async def get_chat_avatar_image(self, chat_id: UUID, user_id: UUID) -> FileResponse:
		chat = await self.helper.get_chat_or_404(chatId=chat_id)

		await self.helper.get_participant_or_400(chatId=chat_id, userId=user_id)

		if not chat.is_group:
			chat = await self.chat_repo.change_private_chat_avatar(chat_id=chat.id, current_user_id=user_id)

		if not chat.chat_avatar_url:
			logger.warning("Avatar file not found")

			raise FileNotFoundException("Avatar file not found")

		file_path = Path(chat.chat_avatar_url)

		if not file_path.is_file():
			logger.warning("Avatar file not found")

			raise FileNotFoundException("Avatar file not found")

		return FileResponse(
			path=file_path,
			media_type="image/*"
		)

	async def get_users_common_groups(self, user_id: UUID, current_user_id: UUID) -> list[CommonChatResponse]:
		if user_id == current_user_id:
			logger.warning(
				"User can't get own common groups",
				extra={"user_id": str(current_user_id)}
			)

			raise SelfActionNotAllowedException("User can't get own common groups")

		cached_data = await self.redis.get(f"common_chat:{user_id}")

		if cached_data:
			logger.info("Common chats fetched from Redis cache")

			return [
				CommonChatResponse.model_validate(item)
				for item in json.loads(cached_data)
			]
		
		chats = await self.chat_repo.get_users_common_chat_by_user_ids(user_id=user_id, current_user_id=current_user_id)

		serialized = [
			CommonChatResponse.model_validate(chat).model_dump(mode="json")
			for chat in chats
		]

		await self.redis.set(
			"common_chat:all",
			json.dumps(serialized),
			expire_seconds=15
		)

		logger.info("Successful response of common chat of users")

		return [
			CommonChatResponse.model_validate(chat)
			for chat in chats
		]
