from sqlalchemy import select
from typing import Optional
from uuid import UUID
from datetime import datetime, timezone

from .base_repository import BaseRepository
from src.database.models import User


class UserRepository(BaseRepository):
    model = User

    async def get_user_with_username(self, username: str) -> Optional[User]:
        result = await self.session.execute(
            select(self.model).where(self.model.username == username)
        )

        return result.scalar_one_or_none()

    async def get_user_id_by_phone_number(self, phone_number: str) -> Optional[User]:
        result = await self.session.execute(
            select(self.model.id).where(self.model.phone_number == phone_number)
        )

        return result.scalar_one_or_none()

    async def get_user_by_phone_number(self, phone_number: str) -> Optional[User]:
        result = await self.session.execute(
            select(self.model).where(self.model.phone_number == phone_number)
        )

        return result.scalar_one_or_none()

    async def get_username_by_user_id(self, userId: UUID):
        result = await self.session.execute(
            select(self.model.username)
            .where(self.model.id == userId)
        )

        return result.scalar_one_or_none()

    async def get_user_avatar_url_by_id(self, user_id: UUID):
        result = await self.session.execute(
            select(self.model.avatar_url)
            .where(self.model.id==user_id)
        )

        return result.scalar_one_or_none()

    async def update_user_last_seen(self, user_id: UUID) -> None:
        user = await self.session.get(self.model, user_id)

        if not user:
            return 

        user.last_seen_at = datetime.now(timezone.utc)
        await self.session.commit()