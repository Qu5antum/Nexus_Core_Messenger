from uuid import UUID

from src.database.db import AsyncSession
from src.repositories.chat_repository import ChatRepository
from src.repositories.chat_participant_repository import ChatParticipantRepository


class WebsocketHelper:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.chat_repo = ChatRepository(self.session)
        self.chat_participant_repo = ChatParticipantRepository(self.session)

    async def get_related_user_ids(self, user_id: UUID) -> set[UUID]:
        chat_participants = await self.chat_participant_repo.get_user_participant_in_chats(userId=user_id)
                        
        chat_ids = [
            participant.chat_id
            for participant in chat_participants
        ]

        chats = await self.chat_repo.get_chats_by_ids(chatIds=chat_ids, current_user_id=user_id)

        user_ids: set[UUID] = set()

        for chat in chats:
            participants = await self.chat_participant_repo.get_participants(
                chat.id
            )

            for participant in participants:
                if participant.user_id != user_id:
                    user_ids.add(participant.user_id)

        return user_ids