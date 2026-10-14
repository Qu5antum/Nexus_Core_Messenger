from uuid import UUID
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from typing import Optional

from .base_repository import BaseRepository
from src.database.models import ChatParticipant, Chat


class ChatParticipantRepository(BaseRepository):
	model = ChatParticipant

	async def get_private_chat_of_two_user(self, user_id: UUID, current_user_id: UUID):
		participant_subquery = (
			select(self.model.chat_id)
			.where(
				self.model.user_id.in_([
					user_id,
					current_user_id
				])
			)
			.group_by(self.model.chat_id)
			.having(
				func.count(
					func.distinct(self.model.user_id)
				) == 2
			)
			.subquery()
		)

		result = await self.session.execute(
			select(Chat)
			.where(
				Chat.id.in_(
					select(
						participant_subquery.c.chat_id
					)
				),
				Chat.is_group.is_(False)
			)
			.options(selectinload(Chat.chat_participants))
		)

		return result.scalar_one_or_none()

	async def is_participant(self, userId: UUID, chatId: UUID):
		result = await self.session.execute(
			select(self.model)
			.where(
				self.model.user_id == userId,
				self.model.chat_id == chatId
			)
		)

		return result.scalar_one_or_none()

	async def get_participants(self, chatId: UUID):
		result = await self.session.execute(
			select(self.model)
			.options(selectinload(self.model.user))
			.where(self.model.chat_id == chatId)
		)

		return result.scalars().all()

	async def get_user_participant_in_chats(self, userId: UUID):
		result = await self.session.execute(
			select(self.model)
			.where(self.model.user_id == userId)
		)

		return result.scalars().all()