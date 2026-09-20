from fastapi import APIRouter, Depends
from uuid import UUID

from src.database.db import AsyncSession, get_session
from src.database.models import User, UserRole
from src.api.dependencies.require_role_dependency import require_roles
from src.services.chat_participant_service import ChatParticipantService
from src.api.schemas.chat_schema import ChatParticipantResponse
from src.redis.redis_service import RedisService

redis_service = RedisService()


chat_participant_route = APIRouter(
    prefix="/api",
    tags=["Chat_Participant"]
)

async def get_chat_participant_service(session: AsyncSession = Depends(get_session)):
    return ChatParticipantService(sesison=session, redis_service=redis_service)


@chat_participant_route.post("/chat/{chat_id}/add_participant", status_code=201)
async def add_participant_to_group_chat(
    chat_id: UUID,
    phone_number: str,
    user: User = Depends(require_roles(UserRole.ADMIN, UserRole.USER)),
    chatParticipantService: ChatParticipantService = Depends(get_chat_participant_service)
):
    return await chatParticipantService.add_participant_to_group_chat(
        chatId=chat_id, 
        phone_number=phone_number,
        current_user=user
    )


@chat_participant_route.delete("/chat/{chat_id}/participant/{user_id}/remove_participant", status_code=200)
async def remove_participant(
    chat_id: UUID,
    user_id: UUID,
    user: User = Depends(require_roles(UserRole.ADMIN, UserRole.USER)),
    chatParticipantService: ChatParticipantService = Depends(get_chat_participant_service)
):
    return await chatParticipantService.remove_participant_from_chat(
        chatId=chat_id, 
        userId=user_id, 
        current_user=user
    )


@chat_participant_route.get("/chat/{chat_id}/participants", response_model=list[ChatParticipantResponse], status_code=200)
async def get_participants(
    chat_id: UUID,
    user: User = Depends(require_roles(UserRole.ADMIN, UserRole.USER)),
    chatParticipantService: ChatParticipantService = Depends(get_chat_participant_service)
):
    return await chatParticipantService.get_participants_chat(
        chatId=chat_id,
        user=user
    )


@chat_participant_route.delete("/chat/{chat_id}/leave", status_code=200)
async def leave_chat(
    chat_id: UUID,
    user: User = Depends(require_roles(UserRole.ADMIN, UserRole.USER)),
    chatParticipantService: ChatParticipantService = Depends(get_chat_participant_service)
):
    return await chatParticipantService.leave_chat(
        chatId=chat_id,
        current_user=user
    )
