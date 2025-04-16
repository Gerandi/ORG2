import os
from typing import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker
from fastapi import Depends
from fastapi_users.db import SQLAlchemyUserDatabase

from app.models.models import User

# Database URL - use environment variable if available, otherwise use default
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite+aiosqlite:///./orgai.db")

engine = create_async_engine(DATABASE_URL)
async_session_maker = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


async def get_async_session() -> AsyncGenerator[AsyncSession, None]:
    """Get async database session."""
    async with async_session_maker() as session:
        yield session


async def get_user_db(session: AsyncSession = Depends(get_async_session)):
    """Get user database for authentication."""
    yield SQLAlchemyUserDatabase(session, User)