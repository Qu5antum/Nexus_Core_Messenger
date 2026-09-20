from uuid import UUID
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from typing import Optional
from datetime import datetime

from .base_repository import BaseRepository
from src.database.models import Message


class MessageRepository(BaseRepository):
    model = Message

    async def get_all_messages_by_chat_id(self, chatId: UUID):
        result = await self.session.execute(
            select(self.model)
            .options(selectinload(self.model.sender))
            .options(selectinload(self.model.attachments))
            .where(self.model.chat_id == chatId)
        )

        return result.scalars().all()

    async def search_message(self, message_text: str, chatId: UUID):
        result = await self.session.execute(
            select(self.model)
            .where(
                self.model.chat_id == chatId,
                self.model.text.ilike(f"%{message_text}%")
            )
        )

        return result.scalars().all()

    async def get_message_with_sender(self, messageId: UUID) -> Optional[Message]:
        result = await self.session.execute(
            select(self.model)
            .options(selectinload(self.model.sender))
            .options(selectinload(self.model.attachments))
            .where(self.model.id == messageId)
        )

        return result.scalar_one_or_none()

    async def get_message_with_chat_id_sender_id(self, chat_id: UUID, sender_id: UUID, message_id: UUID) -> Optional[Message]:
        result = await self.session.execute(
            select(self.model)
            .where(
                self.model.id==message_id,
                self.model.chat_id==chat_id,
                self.model.sender_id==sender_id
            )
            .options(selectinload(self.model.attachments))
        )

        return result.scalar_one_or_none()

    async def get_unread_messages_count_in_chat_of_user(self, chat_id: UUID, sender_id: UUID, last_read_at: datetime | None = None) -> int:
        query = (
            select(func.count(self.model.id))
            .where(
                self.model.chat_id == chat_id,
                self.model.sender_id != sender_id
            )
        )

        if last_read_at:
            query = query.where(self.model.sent_at > last_read_at)

        result = await self.session.execute(query)

        message_count = result.scalar_one_or_none()

        return message_count or 0