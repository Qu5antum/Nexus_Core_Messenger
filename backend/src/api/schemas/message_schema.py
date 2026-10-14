from pydantic import BaseModel, ConfigDict
from uuid import UUID
from typing import Optional
from datetime import datetime

from .user_schema import UserOut
from .message_attachment_schema import MessageAttachmentResponse


class MessageRequest(BaseModel):
	text: str | None = None


class MessageResponse(BaseModel):
	id: UUID
	chat_id: UUID
	sender_id: UUID
	text: str | None
	sent_at: datetime
	edited_at: datetime | None
	sender: UserOut
	attachments: list[MessageAttachmentResponse]

	model_config = ConfigDict(from_attributes=True)


class MessageUpdate(BaseModel):
	text: Optional[str] = None


class ForwardMessageSchema(BaseModel):
    chat_ids: list[UUID]