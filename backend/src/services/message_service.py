from uuid import UUID
import uuid
import logging
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from fastapi import UploadFile
from datetime import datetime, timezone
import json

from src.database.db import AsyncSession
from src.database.models import User, MessageType, Message
from src.repositories.message_repository import MessageRepository
from src.api.schemas.message_schema import MessageRequest, MessageResponse, MessageUpdate
from src.exception_handlers.db_exception import DatabaseException
from src.exception_handlers.message_exception import MessageNotFoundException
from src.exception_handlers.chat_exception import ChatNotFoundException
from src.exception_handlers.bad_request_exception import BadRequestException
from .helper import Helper
from src.publisher.chat_publisher import ChatPublisher
from src.redis.redis_service import RedisService
from src.repositories.message_attachment_repository import MessageAttachmentRepository
from .file_service import FileService
from .message_attachment_service import MessageAttachmentService
from src.repositories.chat_repository import ChatRepository
from src.repositories.chat_participant_repository import ChatParticipantRepository

logger = logging.getLogger("message")


class MessageService:
    def __init__(self, session: AsyncSession, redis_service: RedisService):
        self.session = session
        self.message_repo = MessageRepository(session=self.session)
        self.helper = Helper(session=self.session)
        self.redis = redis_service
        self.chat_pub = ChatPublisher(redis=self.redis)
        self.attachment_repo = MessageAttachmentRepository(session=self.session)
        self.file_service = FileService()
        self.attachment_service = MessageAttachmentService(session=self.session)
        self.chat_repo = ChatRepository(session=self.session)
        self.participant_repo = ChatParticipantRepository(session==self.session)

    @staticmethod
    def _get_message_type(content_type: str | None) -> MessageType:
        if not content_type:
            return MessageType.FILE

        if content_type.startswith("image/"):
            return MessageType.IMAGE

        if content_type.startswith("video/"):
            return MessageType.VIDEO

        if content_type.startswith("audio/"):
            return MessageType.VOICE

        return MessageType.FILE

    async def send_message(self, chatId: UUID, sender_id: UUID, message_create: MessageRequest, file: UploadFile | None = None) -> MessageResponse:
        await self.helper.get_chat_or_404(chatId=chatId)

        await self.helper.get_participant_or_400(
            userId=sender_id,
            chatId=chatId
        )

        if not message_create and not file:
            raise ValueError(
                "Message must contain text or file"
            )

        message_type = MessageType.TEXT

        file_key: str | None = None

        if file:
            message_type = self._get_message_type(
                file.content_type
            )

        try:
            new_message = await self.message_repo.create(
                text=message_create.text if message_create else None,
                sender_id=sender_id,
                chat_id=chatId,
                message_type=message_type
            )

            if file:
                attachment_id = uuid.uuid4()

                file_key, size = (
                    await self.file_service.save_message_file(
                        chat_id=chatId,
                        attachment_id=attachment_id,
                        file=file,
                        message_type=message_type.value
                    )
                )

                await self.attachment_repo.create(
                    id=attachment_id,
                    message_id=new_message.id,
                    file_name=file.filename,
                    file_key=file_key,
                    mime_type=file.content_type,
                    size=size,
                )

            await self.session.commit()

        except IntegrityError as e:
            await self.session.rollback()

            logger.error(
                f"Message not added, database error: {e}",
                exc_info=True,
                extra={
                    "chat_id": str(chatId),
                    "sender_id": str(sender_id)
                }
            )

            if file_key:
                await self.file_service.delete_file(file_key=file_key)

            raise DatabaseException("Message not added")

        except SQLAlchemyError as e:
            await self.session.rollback()

            logger.error(
                f"Message or file not added, database error: {e}",
                extra={
                    "chat_id": str(chatId),
                    "sender_id": str(sender_id)
                }
            )

            if file_key:
                await self.file_service.delete_file(file_key=file_key)

            raise DatabaseException("Message not added")

        message = await self.message_repo.get_message_with_sender(messageId=new_message.id)

        if not message:
            logger.error(
                "Created message not found after commit",
                extra={
                    "message_id": str(new_message.id),
                    "chat_id": str(chatId),
                },
            )

            raise DatabaseException("Created message not found")

        message_response = MessageResponse.model_validate(message)
        await self.chat_pub.publish_message(message=message_response)

        logger.info(
            "Message published to redis",
            extra={
                "chat_id": str(chatId),
                "message_id": str(new_message.id)
            }
        )

        logger.info(
            "Message added to database, Message successful response",
            extra={
                "chat_id": str(chatId),
                "sender_id": str(sender_id)
            }
        )

        return message_response

    async def edit_message(self, chat_id: UUID, message_id: UUID, sender_id: UUID, message_update: MessageUpdate) -> MessageResponse:
        await self.helper.get_chat_or_404(chatId=chat_id)
        await self.helper.get_participant_or_400(userId=sender_id, chatId=chat_id)

        message = await self.message_repo.get_message_with_chat_id_sender_id(chat_id=chat_id, sender_id=sender_id, message_id=message_id)

        if not message:
            logger.warning(
                "Message not found",
                extra={
                    "message_id": str(message_id),
                    "chat_id": str(chat_id),
                    "message_id": str(message_id)
                }
            )

            return MessageNotFoundException("Message not found")

        try:
            data = message_update.model_dump(exclude_unset=True)

            message.edited_at = datetime.now(
                timezone.utc
            )

            updated_message = await self.message_repo.update(
                id=message_id,
                data=data
            )

        except IntegrityError:
            await self.session.rollback()

            logger.error(
                "Message not updated, Database error",
                exc_info=True,
                extra={
                    "message_id": str(message_id),
                    "user_id": str(sender_id)
                }
            )

            raise DatabaseException("Message not updated")

        logger.info(
            "Message updated",
            extra={
                "message_id": str(message_id),
                "user_id": str(sender_id)
            }
        )

        return updated_message

    async def delete_message(self, chat_id: UUID, message_id: UUID, sender_id: UUID) -> dict[str, str]:
        await self.helper.get_chat_or_404(chatId=chat_id)
        await self.helper.get_participant_or_400(userId=sender_id, chatId=chat_id)

        message = await self.message_repo.get_message_with_chat_id_sender_id(chat_id=chat_id, sender_id=sender_id, message_id=message_id)

        if not message:
            logger.warning(
                "Message not found",
                extra={
                    "chat_id": str(chat_id),
                    "message_id": str(message_id),
                    "sender_id": str(sender_id)
                }
            )

            raise MessageNotFoundException("Message not found")

        await self.attachment_service.delete_files_in_attachments(message_id=message_id)

        try:
            await self.message_repo.delete(id=message_id)

            logger.info(
                "Message successfully deleted",
                extra={
                    "message_id": str(message_id),
                    "user_id": str(sender_id)
                }
            )

            return {"detail": "Message deleted"}

        except IntegrityError as e:
            await self.session.rollback()

            logger.error(
                f"Database error, message not deleted: {e}",
                exc_info=True,
                extra={
                    "chat_id": str(chat_id),
                    "sender_id": str(sender_id),
                    "message_id": str(message_id)
                }
            )

            raise DatabaseException("Database error, message not deleted")

        except SQLAlchemyError as e:
            await self.session.rollback()
            
            logger.error(
                f"Database error, message not deleted: {e}",
                exc_info=True,
                extra={
                    "chat_id": str(chat_id),
                    "sender_id": str(sender_id),
                    "message_id": str(message_id)
                }
            )

            raise DatabaseException("Database error, message not deleted")

    async def get_messages_in_chat(self, chatId: UUID, user: User) -> list[MessageResponse]:
        cached_data = await self.redis.get(f"message:{chatId}")

        if cached_data:
            logger.info("Messages fetched from Redis cache")

            return [
                MessageResponse.model_validate(item)
                for item in json.loads(cached_data)
            ]

        await self.helper.get_chat_or_404(chatId=chatId)

        await self.helper.get_participant_or_400(userId=user.id, chatId=chatId)

        messages = await self.message_repo.get_all_messages_by_chat_id(chatId=chatId)

        logger.info(
            "Successfull response messages",
            extra={"chat_id": str(chatId)}
        )

        serialized = [
            MessageResponse.model_validate(message).model_dump(mode="json")
            for message in messages
        ]

        await self.redis.set(
            f"message:{chatId}",
            json.dumps(serialized),
            expire_seconds=15
        )

        return [
            MessageResponse.model_validate(message)
            for message in messages
        ]

    async def get_message(self, messageId: UUID, user: User) -> MessageResponse:
        message = await self.helper.get_message_or_404(messageId=messageId)

        await self.helper.get_participant_or_400(
            userId=user.id,
            chatId=message.chat_id
        )

        logger.info(
            "Successfull response of message",
            extra={
                "message_id": str(messageId),
                "user_id": str(messageId)
            }
        )

        return message

    async def search_messages(self, messageText: str, chatId: UUID, user: User) -> list[MessageResponse]:
        await self.helper.get_chat_or_404(chatId=chatId)

        await self.helper.get_participant_or_400(
            userId=user.id,
            chatId=chatId
        )

        messages = await self.message_repo.search_message(message_text=messageText, chatId=chatId)

        logger.info(
            "Messages response",
            extra={"chat_id": str(chatId)}
        )

        return messages

    async def forward_message(self, current_user_id: UUID, chat_ids: list[UUID], message_id: UUID):
        unique_chat_ids = list(set(chat_ids))

        message = await self.message_repo.get_message_by_user_id(
            user_id=current_user_id, 
            message_id=message_id
        )

        if not message:
            logger.warning(
                "Message not found",
                extra={
                    "user_id": str(current_user_id),
                    "message_id": str(message_id)
                }
            )

            raise MessageNotFoundException("Message not found")

        is_exists = await self.chat_repo.is_chats_exists_by_multiple_ids(
            chat_ids=unique_chat_ids, 
            user_id=current_user_id
        )   

        if not is_exists:
            logger.warning(
                "Some chats does not exists",
                extra={
                    "user_id": str(current_user_id),
                    "message_id": str(message_id)
                }
            )

            raise ChatNotFoundException("Some chats does not exists")

        try:
            new_messages = []

            for chat_id in unique_chat_ids:
                if message.chat_id == chat_id:
                    continue

                new_message = Message(
                    chat_id = chat_id,
                    sender_id = message.sender_id,
                    text = message.text,
                    message_type = message.message_type,
                    forwarded_from_message_id = message.id,
                    attachments = message.attachments
                )

                new_messages.append(new_message)

            await self.message_repo.add_all(new_messages)

            return "Message successfully forwarded to chats"

        except IntegrityError as e:
            await self.session.rollback()

            logger.error(
                f"Database error, message not forwarded: {e}",
                extra={
                    "user_id": str(current_user_id),
                    "message_id": str(message_id)
                }
            )

            raise DatabaseException("Database error, message not forwarded")

        except SQLAlchemyError as e:
            await self.session.rollback()
            
            logger.error(
                f"Database error, message not forwarded: {e}",
                extra={
                    "user_id": str(current_user_id),
                    "message_id": str(message_id)
                }
            )

            raise DatabaseException("Database error, message not forwarded")
