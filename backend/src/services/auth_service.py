from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from jose import JWTError
from datetime import timedelta
import logging

from src.database.db import AsyncSession
from src.repositories.user_repository import UserRepository
from src.exception_handlers.user_exceptions import UserNotFoundException, UnauthorizedException, UserAlreadyExists
from src.exception_handlers.db_exception import DatabaseException
from src.auth.utils import verify_password, hash_password
from src.core.config import settings
from src.auth.jwt_handler import JWTHandler
from src.api.schemas.user_schema import UserCreate

logger = logging.getLogger("auth")


class AuthService:
    def __init__(self, session: AsyncSession, jwt_handler: JWTHandler):
        self.session = session
        self.user_repo = UserRepository(session=session)
        self.jwt_handler = jwt_handler

    async def auth_user(self, credents: OAuth2PasswordRequestForm) -> dict:
        user = await self.user_repo.get_user_with_username(username=credents.username)

        if not user:
            logger.warning(
                "User not found",
                extra={"username": credents.username}
            )
            raise UserNotFoundException("User not found.")
        
        if not verify_password(credents.password, user.password):
            logger.warning(
                "Invalid credentials",
                extra={"email": credents.username}
            )
            raise UnauthorizedException("Invalid credentials.")
        
        access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)

        access_token = self.jwt_handler.create_access_token(
            subject=str(user.id),
            role=user.role,
            expires_delta=access_token_expires
        )

        refresh_token = self.jwt_handler.create_refresh_token(subject=user.username)

        logger.info(
            "User login success",
            extra={"user_id": str(user.id)}
        )

        return {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "bearer",
            "role": user.role
        }
    
    async def refresh_token(self, refresh_token: str) -> dict:
        try:
            payload = self.jwt_handler.decode_token(refresh_token)

            if payload.get("token_type") != "refresh":
                logger.warning(
                    "Invalid token type",
                    extra={"refresh_token": refresh_token}
                )
                raise UnauthorizedException("Invalid token type.")
            
            username = payload.get("sub")

            user = await self.user_repo.get_user_with_username(username=username)

            if not user:
                logger.warning(
                    "User not found",
                    extra={"username": username}
                )
                raise UserNotFoundException("User not found.")
            
            if not user.is_active:
                logger.warning(
                    "Inactive user login attempt",
                    extra={"user_id": str(user.id)}
                )
                raise UnauthorizedException("User is inactive.")
            

            access_token_expires = timedelta(
                minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
            )

            access_token = self.jwt_handler.create_access_token(
                subject=str(user.id),
                role=user.role,
                expires_delta=access_token_expires
            )

            logger.info(
                "Refresh token succes",
                extra={"user_id": str(user.id)}
            )

            return {
                "access_token": access_token,
                "token_type": "bearer"
            }
        except JWTError:
            logger.error(
                "Token expired",
                exc_info=True,
                extra={"user_id": str(user.id)}
            )
            raise UnauthorizedException("Token expired.")
    
    async def add_new_user(self, user: UserCreate) -> dict:
        existing_user= await self.user_repo.get_user_with_username(username=user.username)

        if existing_user:
            logger.warning(
                "User already exists",
                extra={"username": user.username}
            )
            raise UserAlreadyExists("The user already exists.")

        
        hashed_password = hash_password(user.password)
        
        try:
            new_user = await self.user_repo.create(
                username=user.username,
                password=hashed_password,
                role=user.role,
                phone_number=user.phone_number
            )

            await self.session.commit()

            logger.info(
                "User inserted in db",
                extra={"username": str(new_user.id)}
            )
            
            return {"detail": "The user has been successfully registered"}       

        except (SQLAlchemyError, IntegrityError) as e:
            await self.session.rollback()

            logger.error(
                f"Database insert error: {e}",
                exc_info=True,
                extra={"username": user.username}
            )
            raise DatabaseException("Database error") from e