from datetime import datetime
from pydantic import BaseModel, ConfigDict
from typing import Optional
from uuid import UUID

from .user_schema import UserOut, CommonChatUserOut


class ChatCreate(BaseModel):
	title: Optional[str] = None
	description: Optional[str] = None


class ChatResponse(BaseModel):
	id: UUID
	is_group: bool
	title: Optional[str] = None
	chat_avatar_url: Optional[str] = None
	description: Optional[str] = None
	owner_id: Optional[UUID] = None

	model_config = ConfigDict(from_attributes=True)


class ChatUpdate(BaseModel):
	title: Optional[str] = None
	description: Optional[str] = None
	owner_id: Optional[UUID] = None


class ChatParticipantResponse(BaseModel):
	id: UUID
	chat_id: UUID
	user_id: UUID
	joined_at: datetime
	last_read_at: datetime | None = None
	user: UserOut

	model_config = ConfigDict(from_attributes=True)


class CommonChatParticipantResponse(BaseModel):
	user: CommonChatUserOut

	model_config = ConfigDict(from_attributes=True)

class CommonChatResponse(BaseModel):
	id: UUID
	title: str
	chat_participants: list[CommonChatParticipantResponse]

	model_config = ConfigDict(from_attributes=True)