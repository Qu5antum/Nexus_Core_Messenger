from collections import defaultdict
import logging
from uuid import UUID
from fastapi import WebSocket

logger = logging.getLogger("connection_manager")


class ConnectionManager:
    def __init__(self) -> None:
        self.active_connections: dict[str, set[WebSocket]] = defaultdict(set)

    @staticmethod
    def _key(user_id: UUID | str) -> str:
        return str(user_id)

    async def connect(self, user_id: UUID | str, websocket: WebSocket) -> None:
        """
        Accept a new websocket connection and register it.
        """
        key = self._key(user_id)
        await websocket.accept()
        self.active_connections[key].add(websocket)

        logger.info(
            "WebSocket connected. manager_id=%s user_id=%s connections=%s",
            id(self),
            key,
            len(self.active_connections[key]),
        )

    def disconnect(self, user_id: UUID | str, websocket: WebSocket) -> bool:
        """
        Remove a websocket connection. Returns True if a connection was removed.
        """
        key = self._key(user_id)
        connections = self.active_connections.get(key)
        if not connections or websocket not in connections:
            return False

        connections.discard(websocket)
        if not connections:
            self.active_connections.pop(key, None)

        logger.info(
            "WebSocket disconnected. manager_id=%s user_id=%s remaining=%s",
            id(self),
            key,
            len(connections),
        )
        return True

    async def send_to_user(self, user_id: UUID | str, message: dict) -> None:
        key = self._key(user_id)
        connections = self.active_connections.get(key)

        logger.info(
            "send_to_user manager_id=%s target=%s has_connections=%s count=%s type=%s",
            id(self),
            key,
            bool(connections),
            len(connections) if connections else 0,
            message.get("type"),
        )

        if not connections:
            return

        dead_connections: list[WebSocket] = []
        
        for websocket in list(connections):
            try:
                await websocket.send_json(message)
            except Exception as exc:
                logger.warning("Failed to send WS message to %s: %s", key, exc)
                dead_connections.append(websocket)

        for websocket in dead_connections:
            self.disconnect(key, websocket)

    async def send_to_users(
        self,
        user_ids: list[UUID | str],
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
        """
        for user_key in list(self.active_connections.keys()):
            await self.send_to_user(user_key, message)

    def is_online(self, user_id: UUID | str) -> bool:
        """
        Check whether the user has at least one active websocket.
        """
        key = self._key(user_id)
        return bool(self.active_connections.get(key))

    def get_online_users(self) -> list[str]:
        """
        Return IDs of all online users.
        """
        return list(self.active_connections.keys())