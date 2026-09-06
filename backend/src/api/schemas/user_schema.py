from pydantic import BaseModel, EmailStr, field_validator, SecretStr, model_validator, ConfigDict
from uuid import UUID
from datetime import datetime
from typing import Optional, Self
import re

from src.database.models import UserRole

class DummyLoginRequest(BaseModel):
    role: UserRole


class UserBase(BaseModel):
    username: str
    phone_number: str
    description: str | None = None
    avatar_url: str | None = None

class UserCreate(UserBase):
    password: SecretStr
    confirm_password: SecretStr
    role: UserRole


class UserOut(UserBase):
    id: UUID
    last_seen_at: datetime | None = None
    
    model_config = ConfigDict(from_attributes=True)


class UserUpdate(BaseModel):
    username: Optional[str] = None
    phone_number: Optional[str] = None
    description: Optional[str] = None


class CommonChatUserOut(BaseModel):
    username: str

    model_config = ConfigDict(from_attributes=True)