from collections import defaultdict
from datetime import datetime, timezone
from uuid import UUID
from fastapi import WebSocket
import logging

logger = logging.getLogger("connection_manager")


class ConnectionManager:
    def __init__(self):
        self.active_connections: dict[UUID, set[WebSocket]] = defaultdict(set)

    async def connect(self, user_id: UUID, websocket: WebSocket) -> None:
        """
        Accept a new websocket connection and register it.
        """
        await websocket.accept()
        self.active_connections[user_id].add(websocket)

        logger.info(
            "WebSocket connected",
            extra={
                "user_id": str(user_id),
                "connections": len(self.active_connections[user_id]),
            }
        )
        

    def disconnect(self, user_id: UUID, websocket: WebSocket) -> bool:
        """
        Remove a websocket connection.
        """
        connections = self.active_connections.get(user_id)

        if not connections:
            return False

        connections.discard(websocket)

        if not connections:
            del self.active_connections[user_id]
            return True

        return False

    async def send_to_user(self, user_id: UUID, message: dict) -> None:
        """
        Send message to every active connection of the user.
        """
        connections = self.active_connections.get(user_id)

        if not connections:
            return

        dead_connections = []

        for websocket in connections:
            try:
                await websocket.send_json(message)
            except Exception:
                dead_connections.append(websocket)

        for websocket in dead_connections:
            self.disconnect(user_id, websocket)

    async def send_to_users(
        self,
        user_ids: list[UUID],
        message: dict,
    ) -> None:
        """
        Send the same message to multiple users.
        """
        for user_id in user_ids:
            await self.send_to_user(user_id, message)

    async def broadcast(self, message: dict) -> None:
        """
        Send message to every connected websocket.
        Usually useful for notifications or admin events.
        """
        for user_id in list(self.active_connections.keys()):
            await self.send_to_user(user_id, message)

    def is_online(self, user_id: UUID) -> bool:
        """
        Check whether the user has at least one active websocket.
        """
        return (
            user_id in self.active_connections
            and len(self.active_connections[user_id]) > 0
        )

    def get_online_users(self) -> list[UUID]:
        """
        Return IDs of all online users.
        """
        return list(self.active_connections.keys())