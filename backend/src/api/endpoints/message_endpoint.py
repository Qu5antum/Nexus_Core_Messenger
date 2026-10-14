from fastapi import APIRouter, Depends, UploadFile, File, Form
from uuid import UUID

from src.database.db import AsyncSession, get_session
from src.database.models import User, UserRole
from src.services.message_service import MessageService
from src.api.schemas.message_schema import MessageResponse, MessageRequest, MessageUpdate, ForwardMessageSchema
from src.api.dependencies.require_role_dependency import require_roles
from src.redis.redis_service import RedisService


message_route = APIRouter(
    prefix="/api",
    tags=["Message"]
)

redis_service = RedisService()

async def get_message_service(session: AsyncSession = Depends(get_session)):
    return MessageService(session=session, redis_service=redis_service)


@message_route.post("/chat/{chat_id}/message/send", response_model=MessageResponse, status_code=201)
async def send_message(
    chat_id: UUID,
    message: str | None = Form(None),
    file: UploadFile | None = File(None),
    user: User = Depends(require_roles(UserRole.ADMIN, UserRole.USER)),
    messageService: MessageService = Depends(get_message_service)
):
    message = MessageRequest(
        text=message
    )

    return await messageService.send_message(
        chatId=chat_id, 
        sender_id=user.id, 
        message_create=message,
        file=file
    )

@message_route.put("/chat/{chat_id}/message/{message_id}/update", response_model=MessageResponse, status_code=200)
async def edit_message(
    chat_id: UUID,
    message_id: UUID,
    message_update: MessageUpdate,
    user: User = Depends(require_roles(UserRole.ADMIN, UserRole.USER)),
    messageService: MessageService = Depends(get_message_service)
):
    return await messageService.edit_message(
        chat_id=chat_id,
        message_id=message_id,
        sender_id=user.id,
        message_update=message_update
    )


@message_route.delete("/chat/{chat_id}/message/{message_id}/delete", status_code=200)
async def delete_message(
    chat_id: UUID,
    message_id: UUID,
    user: User = Depends(require_roles(UserRole.ADMIN, UserRole.USER)),
    messageService: MessageService = Depends(get_message_service)
):
    return await messageService.delete_message(
        chat_id=chat_id,
        message_id=message_id,
        sender_id=user.id
    )


@message_route.get("/chat/{chat_id}/messages", response_model=list[MessageResponse], status_code=200)
async def get_messages_in_chat(
    chat_id: UUID,
    user: User = Depends(require_roles(UserRole.ADMIN, UserRole.USER)),
    messageService: MessageService = Depends(get_message_service)
):
    return await messageService.get_messages_in_chat(
        chatId=chat_id,
        user=user
    )


@message_route.get("/message/{message_id}", response_model=MessageResponse, status_code=200)
async def get_message_by_id(
    message_id: UUID,
    user: User = Depends(require_roles(UserRole.ADMIN, UserRole.USER)),
    messageService: MessageService = Depends(get_message_service)
):
    return await messageService.get_message(
        messageId=message_id,
        user=user
    )


@message_route.get("/chat/{chat_id}/message/search_message", response_model=list[MessageResponse], status_code=200)
async def search_message(
    chat_id: UUID,
    messageText: str,
    user: User = Depends(require_roles(UserRole.ADMIN, UserRole.USER)),
    messageService: MessageService = Depends(get_message_service)
):
    return await messageService.search_messages(
        messageText=messageText,
        chatId=chat_id,
        user=user
    )


@message_route.post("/chat/message/{message_id}/forward_message", status_code=201)
async def forward_message(
    message_id: UUID,
    body: ForwardMessageSchema,
    user: User = Depends(require_roles(UserRole.ADMIN, UserRole.USER)),
    messageService: MessageService = Depends(get_message_service)
):
    return await messageService.forward_message(
        current_user_id=user.id,
        chat_ids=body.chat_ids,
        message_id=message_id
    )