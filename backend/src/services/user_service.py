import logging
from uuid import UUID
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from fastapi import UploadFile
from fastapi.responses import FileResponse
from pathlib import Path
import json
from datetime import datetime

from src.database.db import AsyncSession
from src.api.schemas.user_schema import UserOut, UserUpdate
from src.repositories.user_repository import UserRepository
from src.exception_handlers.user_exceptions import UserNotFoundException
from src.exception_handlers.db_exception import DatabaseException
from src.services.file_service import FileService
from .helper import Helper
from src.exception_handlers.file_exception import FileNotFoundException
from src.redis.redis_service import RedisService

logger = logging.getLogger("user")


class UserService:
    def __init__(self, session: AsyncSession, redis_service: RedisService):
        self.session = session
        self.user_repo = UserRepository(session=self.session)
        self.file_service = FileService()
        self.helper = Helper(session=self.session)
        self.redis = redis_service

    async def get_user_by_phone_number(self, phone_number: str) -> UserOut:
        user = await self.user_repo.get_user_by_phone_number(phone_number=phone_number)

        if not user: 
            logger.warning(
                "User not found by this number",
                extra={"phone_number": phone_number}
            )

            return UserNotFoundException("User not found")

        logger.info("Successful response of user")

        return user

    async def get_user_by_id(self, user_id: UUID) -> UserOut:
        cached_data = await self.redis.get(f"user:{user_id}")

        if cached_data:
            logger.info("User fetched from Redis cached")

            return UserOut.model_validate(json.loads(cached_data))
        
        user = await self.helper.get_user_obj_or_404(user_id=user_id)

        serialized = UserOut.model_validate(user).model_dump(mode="json")

        await self.redis.set(
            f"user:{user_id}",
            json.dumps(serialized),
            expire_seconds=15
        )

        logger.info("Successful response of user by id")

        return UserOut.model_validate(user)

    async def update_profile(self, current_user_id: UUID, user_update: UserUpdate, avatar_file: UploadFile | None = None) -> dict[str, str]:
        user = await self.helper.get_user_obj_or_404(user_id=current_user_id)

        file_key: str | None = None

        try:
            data = user_update.model_dump(
                exclude_unset=True,
                exclude_none=True,
            )

            if user.avatar_url and avatar_file:
                await self.file_service.delete_file(file_key=user.avatar_url)

            if avatar_file:
                file_key = (
                    await self.file_service.save_avatar_file(
                        user_id=current_user_id,
                        file=avatar_file
                    )
                )

            user.avatar_url = file_key

            await self.user_repo.update(id=current_user_id, data=data)

            logger.info("User profile successfully updated")

            return {"detail": "User profile updated"}

        except IntegrityError as e:
            await self.session.rollback()

            logger.error(
                f"Error, profile not updated: {e}",
                extra={"user_id": str(current_user_id)}
            )

            if file_key:
                await self.file_service.delete_file(file_key=file_key)

            raise DatabaseException("Database error")

        except SQLAlchemyError as e:
            await self.session.rollback()

            logger.error(
                f"Error, profile not updated: {e}",
                extra={"user_id": str(current_user_id)}
            )

            if file_key:
                await self.file_service.delete_file(file_key=file_key)

            raise DatabaseException("Database error")    

    async def get_user_avatar_profile(self, user_id: UUID) -> FileResponse:
        user = await self.helper.get_user_obj_or_404(user_id=user_id)

        if not user.avatar_url:
            logger.warning("Avatar file not found")

            raise FileNotFoundException("Avatar file not found")

        file_path = Path(user.avatar_url)

        if not file_path.is_file():
            logger.warning("Avatar file not found")

            raise FileNotFoundException("Avatar file not found")

        return FileResponse(
            path=file_path,
            media_type="image/*"
        )

    async def get_user_last_seen_at(self, user_id: UUID) -> datetime | None:
        last_seen_at = await self.user_repo.get_user_last_seen_at(user_id=user_id)

        logger.info("Successful response of last seen of user")

        return last_seen_at