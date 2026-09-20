from sqlalchemy import DateTime, ForeignKey, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, DeclarativeBase, relationship
from sqlalchemy import Enum as SQLEnum
from sqlalchemy.dialects.postgresql import UUID
import uuid
import datetime
from datetime import timezone
from enum import Enum
from typing import Optional


class UserRole(str, Enum):
    USER = 'user'
    ADMIN = 'admin'

class MessageType(str, Enum):
    TEXT = "text"
    IMAGE = "image"
    VIDEO = "video"
    VOICE = "voice"
    FILE = "file"


class Base(DeclarativeBase):
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )

    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    updated_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )


class User(Base):
    __tablename__ = "users"

    username: Mapped[str] = mapped_column(
        unique=True,
        nullable=False,
        index=True
    )

    description: Mapped[str] = mapped_column(nullable=True)

    phone_number: Mapped[str] = mapped_column(
        unique=True,
        nullable=False
    )

    avatar_url: Mapped[str] = mapped_column(nullable=True)

    role: Mapped[UserRole] = mapped_column(default=UserRole.USER)
    password: Mapped[str] = mapped_column(nullable=False)

    last_seen_at: Mapped[datetime.datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    participation_in_chats: Mapped[list['ChatParticipant']] = relationship(back_populates="user")
    messages: Mapped[list["Message"]] = relationship(back_populates="sender")
    own_chats: Mapped[list['Chat']] = relationship(back_populates="owner")


class Chat(Base):
    __tablename__ = "chats"

    is_group: Mapped[bool] = mapped_column(default=False)
    title: Mapped[str | None] = mapped_column(default=None)
    chat_avatar_url: Mapped[str | None] = mapped_column(default=None)
    description: Mapped[str | None] = mapped_column(default=None)

    owner_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("users.id"))
    owner: Mapped[Optional['User']] = relationship(back_populates="own_chats")

    chat_participants: Mapped[list['ChatParticipant']] = relationship(
        back_populates="chat",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )
    
    chat_messages: Mapped[list['Message']] = relationship(back_populates="chat", cascade="all, delete-orphan")


class ChatParticipant(Base):
    __tablename__ = "chat_participants"

    __table_args__ = (
        UniqueConstraint("chat_id", "user_id"),
    )

    chat_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("chats.id", ondelete="CASCADE"))
    chat: Mapped['Chat'] = relationship(back_populates="chat_participants")

    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    user: Mapped['User'] = relationship(back_populates="participation_in_chats")

    joined_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True), 
        server_default=func.now(),
        default=lambda: datetime.datetime.now(datetime.UTC),
        nullable=False 
    )

    last_read_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=True
    )


class Message(Base):
    __tablename__ = "messages"
    
    chat_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("chats.id"), index=True)
    chat: Mapped['Chat'] = relationship(back_populates="chat_messages")

    sender_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), index=True)
    sender: Mapped['User'] = relationship(back_populates="messages")

    text: Mapped[Optional[str]] = mapped_column(nullable=True)

    message_type: Mapped[MessageType] = mapped_column(
        SQLEnum(
            MessageType,
            name="messagetype",
            values_callable=lambda enum_cls: [
                item.value for item in enum_cls
            ],
        ),
        default=MessageType.TEXT,
        server_default=MessageType.TEXT.value,
        nullable=False,
        index=True,
    )

    attachments: Mapped[list["MessageAttachment"]] = relationship(
        back_populates="message",
        cascade="all, delete-orphan"
    )

    sent_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now()
    )

    edited_at: Mapped[datetime.datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        default=None
    )

class MessageAttachment(Base):
    __tablename__ = "message_attachments"

    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True,
        default=uuid.uuid4
    )

    message_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("messages.id", ondelete="CASCADE"),
        index=True,
        nullable=False
    )

    message: Mapped["Message"] = relationship(
        back_populates="attachments"
    )

    file_name: Mapped[str] = mapped_column(
        nullable=False
    )

    file_key: Mapped[str] = mapped_column(
        nullable=False,
        unique=True
    )

    mime_type: Mapped[str] = mapped_column(
        nullable=False
    )

    size: Mapped[int] = mapped_column(
        nullable=False
    )

    duration: Mapped[float | None] = mapped_column(
        nullable=True
    )
