from fastapi import APIRouter, Depends, UploadFile, Form, File
from uuid import UUID

from src.database.db import AsyncSession, get_session
from src.services.user_service import UserService
from src.api.schemas.user_schema import UserOut, UserUpdate
from src.database.models import User, UserRole
from src.api.dependencies.require_role_dependency import require_roles
from src.redis.redis_service import RedisService

redis_service = RedisService()


user_route = APIRouter(
    prefix="/api",
    tags=["User"]
)

async def get_user_service(session: AsyncSession = Depends(get_session)):
    return UserService(session=session, redis_service=redis_service)


@user_route.get("/user", response_model=UserOut, status_code=200)
async def get_user_by_phone_number(
    phone_number: str,
    user: User = Depends(require_roles(UserRole.ADMIN, UserRole.USER)),
    userService: UserService = Depends(get_user_service)
):
    return await userService.get_user_by_phone_number(phone_number=phone_number)

@user_route.get("/user/profile", response_model=UserOut, status_code=200)
async def get_current_user_profile(
    user: User = Depends(require_roles(UserRole.ADMIN, UserRole.USER)),
    userService: UserService = Depends(get_user_service)
):
    return await userService.get_user_by_id(user_id=user.id)


@user_route.put("/user/update/profile", status_code=200)
async def update_profile(
    username: str | None = Form(None),
    phone_number: str | None = Form(None),
    description: str | None = Form(None),
    avatar_upload_file: UploadFile | None = File(None),
    user: User = Depends(require_roles(UserRole.ADMIN, UserRole.USER)),
    userService: UserService = Depends(get_user_service)
):
    user_update = UserUpdate(
        username=username,
        phone_number=phone_number,
        description=description,
    )

    return await userService.update_profile(
        current_user_id=user.id,
        user_update=user_update,
        avatar_file=avatar_upload_file,
    )


@user_route.get("/user/avatar", status_code=200)
async def get_current_user_avatar_image(
    user: User = Depends(require_roles(UserRole.ADMIN, UserRole.USER)),
    userService: UserService = Depends(get_user_service)
):
    return await userService.get_user_avatar_profile(user_id=user.id)


@user_route.get("/user/{user_id}/profile", response_model=UserOut, status_code=200)
async def get_user_profile(
    user_id: UUID,
    user: User = Depends(require_roles(UserRole.ADMIN, UserRole.USER)),
    userService: UserService = Depends(get_user_service)
):
    return await userService.get_user_by_id(user_id=user_id)


@user_route.get("/user/{user_id}/avatar", status_code=200)
async def get_user_avatar_image(
    user_id: UUID,
    user: User = Depends(require_roles(UserRole.ADMIN, UserRole.USER)),
    userService: UserService = Depends(get_user_service)
):
    return await userService.get_user_avatar_profile(user_id=user_id)


@user_route.get("/user/{user_id}/last_seen", status_code=200)
async def get_user_last_seen_at(
    user_id: UUID,
    user: User = Depends(require_roles(UserRole.ADMIN, UserRole.USER)),
    userService: UserService = Depends(get_user_service)
):
    return await userService.get_user_last_seen_at(user_id=user_id)
