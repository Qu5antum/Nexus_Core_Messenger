import asyncio
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import logging
from contextlib import asynccontextmanager

from src.middleware.logging_middleware import logging_middleware
from src.core.logging import setup_logging
from src.exception_handlers.base_exception import BaseAppException
from src.api.endpoints.auth_endpoint import auth_route
from src.api.endpoints.chat_endpoint import chat_route
from src.api.endpoints.chat_participant_endpoint import chat_participant_route
from src.api.endpoints.user_endpoint import user_route
from src.api.endpoints.message_endpoint import message_route
from src.api.endpoints.admin_endpoints import admin_route
from src.api.endpoints.message_attachment_endpoint import message_attachment_route
from src.api.endpoints.websocket_endpoint import websocket_route, manager as websocket_manager
from src.database.db import AsyncSession, async_session
from src.redis.redis_service import RedisService
from src.subscriber.chat_subsriber import ChatSubscriber
from src.repositories.chat_participant_repository import ChatParticipantRepository
from src.core.config import settings

setup_logging()
logger = logging.getLogger("errors")

@asynccontextmanager
async def lifespan(app: FastAPI):
    subscriber_session = async_session()

    participant_repo = ChatParticipantRepository(
        session=subscriber_session
    )

    subscriber = ChatSubscriber(
        redis=redis_service,
        manager=websocket_manager,
        participant_repo=participant_repo,
    )

    subscriber_task = asyncio.create_task(
        subscriber.start()
    )

    logger.info("Chat subscriber task started")

    try:
        yield

    finally:
        logger.info("Application shutdown started")

        await subscriber.stop()

        subscriber_task.cancel()

        try:
            await subscriber_task
        except asyncio.CancelledError:
            pass

        await subscriber_session.close()

        await redis_service.close()

        logger.info("Application shutdown completed")

app = FastAPI(
    lifespan=lifespan,
    title=settings.APP_NAME,
    debug=settings.debug,
    docs_url="/docs",
)

app.middleware("http")(logging_middleware)

@app.exception_handler(BaseAppException)
async def app_exception_handler(request, exc):
    logger.error(
        "Unhandled exception",
        exc_info=True,
        extra={"path": request.url.path}
    )
    return JSONResponse(
        status_code=exc.status_code,
        content={"error": exc.message}
    )

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

redis_service = RedisService()
subscriber: ChatSubscriber | None = None
subscriber_task: asyncio.Task | None = None
subscriber_session: AsyncSession | None = None

app.include_router(auth_route)
app.include_router(user_route)
app.include_router(chat_route)
app.include_router(chat_participant_route)
app.include_router(message_route)
app.include_router(message_attachment_route)
app.include_router(admin_route)
app.include_router(websocket_route)


@app.get("/_info", status_code=200)
async def info():
    return {"app_name": settings.APP_NAME, "debug": settings.debug} 

