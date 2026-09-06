import logging
from fastapi import WebSocket
from uuid import UUID

from src.database.db import AsyncSession
from src.websocket.connectoin_manager import ConnectionManager
from src.services.message_service import MessageService
from src.api.schemas.message_schema import MessageRequest
from src.repositories.user_repository import UserRepository
from src.repositories.chat_participant_repository import ChatParticipantRepository
from src.repositories.chat_repository import ChatRepository
from .helper import WebsocketHelper

logger = logging.getLogger("websocket_service")


class WebsocketService:
    def __init__(self, session: AsyncSession, manager: ConnectionManager, message_service: MessageService):
        self.session = session
        self.manager = manager
        self.message_service = message_service
        self.user_repo = UserRepository(self.session)
        self.chat_repo = ChatRepository(self.session)
        self.chat_participant_repo = ChatParticipantRepository(self.session)
        self.helper = WebsocketHelper(session=self.session)
        

    async def connect(self, websocket: WebSocket, user_id: UUID) -> None:
        was_online = not self.manager.is_online(user_id=user_id)

        await self.manager.connect(
            websocket=websocket,
            user_id=user_id,
        )

        if was_online:
            await self.notify_user_online(user_id=user_id)

    async def disconnect(self, user_id: UUID, websocket: WebSocket,) -> None:
        became_offline = self.manager.disconnect(
            user_id=user_id,
            websocket=websocket,
        )

        if not became_offline:
            return

        await self.user_repo.update_user_last_seen(user_id=user_id)
        await self.notify_user_offline(user_id=user_id)

    async def handle_event(self, websocket: WebSocket, user_id: UUID, data: dict) -> None:
        match data["type"]:
            case "send_message":
                try:
                    chat_id = UUID(data["chat_id"])
                except ValueError:
                    await websocket.send_json({
                        "type": "error",
                        "message": "Invalid chat_id"
                    })
                    return
                
                message = MessageRequest.model_validate(data["payload"])

                await self.message_service.send_message(
                    chatId=chat_id,
                    sender_id=user_id,
                    message_create=message,
                )

            case "ping":
                await websocket.send_json(
                    {
                        "type": "pong"
                    }
                )

            case _:
                await websocket.send_json(
                    {
                        "type": "error",
                        "message": "Unknown event"
                    }
                )

    async def notify_user_online(self, user_id: UUID) -> None:
        user_ids = await self.helper.get_related_user_ids(user_id=user_id)

        await self.manager.send_to_users(
            list(user_ids),
            {
                "type": "user.online",
                "user_id": str(user_id)
            }
        )

    async def notify_user_offline(self, user_id: UUID) -> None:
        user_ids = await self.helper.get_related_user_ids(user_id=user_id)
        
        await self.manager.send_to_users(
            list(user_ids),
            {
                "type": "user.offline",
                "user_id": str(user_id)
            }
        )