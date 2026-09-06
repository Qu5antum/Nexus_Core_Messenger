from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends
import logging

from src.database.db import AsyncSession, get_session
from src.auth.jwt_bearer import CurrentUser
from src.auth.jwt_handler import JWTHandler
from src.exception_handlers.user_exceptions import UnauthorizedException
from src.redis.redis_service import RedisService
from src.websocket.connectoin_manager import ConnectionManager
from src.websocket.websocket_service import WebsocketService
from src.services.message_service import MessageService

logger = logging.getLogger("websocket")

redis_service = RedisService()

jwt_handler = JWTHandler()
current_user = CurrentUser(jwt_handler=jwt_handler)
manager = ConnectionManager()

websocket_route = APIRouter(
    prefix="/api",
    tags=["Websocket"]
)

async def get_message_service(session: AsyncSession = Depends(get_session)):
    return MessageService(session=session, redis_service=redis_service)

def get_websocket_service(session: AsyncSession = Depends(get_session), message_service: MessageService = Depends(get_message_service)):
    return WebsocketService(session=session, manager=manager, message_service=message_service)

@websocket_route.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket, token: str, websocket_service: WebsocketService = Depends(get_websocket_service)):
    user_id = await current_user.get_current_user_ws(token=token)

    await websocket_service.connect(
        websocket=websocket,
        user_id=user_id
    )

    try:
        while True:
            data = await websocket.receive_json()

            event_type = data.get("type")

            if event_type is None:
                await websocket.send_json({
                    "type": "error",
                    "message": "Missing event type"
                })
                return

            await websocket_service.handle_event(
                websocket=websocket,
                user_id=user_id,
                data=data
            )

    except WebSocketDisconnect as e:
        logger.info(f"User disconnected: {e}")

        await websocket_service.disconnect(user_id=user_id, websocket=websocket)

    except UnauthorizedException as e:
        logger.error(f"User unauthorized: {e}")

        await websocket.close(code=1008)

        return 
        