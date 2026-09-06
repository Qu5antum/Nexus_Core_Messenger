from uuid import UUID
import logging
from typing import Optional

from src.database.db import AsyncSession
from src.database.models import Chat, ChatParticipant, Message, User
from src.exception_handlers.chat_exception import ChatNotFoundException, ChatNotBelongToUserException
from src.exception_handlers.user_exceptions import UserNotParticipantInChatException
from src.exception_handlers.message_exception import MessageNotFoundException
from src.exception_handlers.user_exceptions import UserNotFoundException
from src.repositories.chat_repository import ChatRepository
from src.repositories.chat_participant_repository import ChatParticipantRepository
from src.repositories.message_repository import MessageRepository
from src.repositories.user_repository import UserRepository

logger = logging.getLogger("helper")


class Helper:
	def __init__(self, session: AsyncSession):
		self.session = session
		self.user_repo = UserRepository(session=self.session)
		self.chat_repo = ChatRepository(session=self.session)
		self.chat_participant_repo = ChatParticipantRepository(session=self.session)
		self.message_repo = MessageRepository(session=self.session)

	async def get_chat_or_404(self, chatId: UUID) -> Optional[Chat]:
		chat = await self.chat_repo.get(id=chatId)

		if not chat:
			logger.warning(
				"Chat not found",
				extra={"chat_id": str(chatId)}
			)

			raise ChatNotFoundException("Chat not found")

		return chat

	async def get_owner_or_403(self, ownerId: UUID, chatId: UUID) -> Optional[Chat]:
		is_owner = await self.chat_repo.get_chat_by_owner_id(owner_id=ownerId, chat_id=chatId)
		
		if not is_owner:
			logger.warning(
				"User not owner of this chat",
				extra={
					"chat_id": str(chatId),
					"user_id": str(ownerId)
				}
			)

			raise ChatNotBelongToUserException("Permision denied, this group chat not belong to user")

		return is_owner

	async def get_participant_or_400(self, userId: UUID, chatId: UUID) -> Optional[ChatParticipant]:
		is_participant = await self.chat_participant_repo.is_participant(
			userId=userId,
			chatId=chatId
		)

		if not is_participant:
			logger.warning(
				"User not participant in chat",
				extra={
					"chat_id": str(chatId),
					"user_id": str(userId)
				}
			)

			raise UserNotParticipantInChatException("User not participant in chat")

		return is_participant

	async def get_message_or_404(self, messageId: UUID) -> Optional[Message]:
		message = await self.message_repo.get(id=messageId)

		if not message:
			logger.warning(
				"Message not found",
				extra={"message_id": str(messageId)}
			)

			raise MessageNotFoundException("Message not found")

		return message

	async def get_user_obj_or_404(self, user_id: UUID) -> Optional[User]:
		user = await self.user_repo.get_obj(id=user_id)

		if not user:
			logger.warning(
				"User not found",
				extra={"user_id": str(user_id)}
			)

			raise UserNotFoundException("User not found")

		return user