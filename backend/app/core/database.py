import os
from typing import AsyncGenerator
from dotenv import load_dotenv

from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker
from fastapi import Depends
from fastapi_users.db import SQLAlchemyUserDatabase

from app.models.models import User

# Load environment variables from .env file
load_dotenv()

# Database URL - use environment variable if available, otherwise use default
raw_url = os.getenv("DATABASE_URL", "sqlite+aiosqlite:///./orgai.db")

# Fix PostgreSQL URLs - ensure they use the correct driver
if raw_url.startswith('postgresql+asyncpg'):
    # Already correctly formatted for asyncpg
    DATABASE_URL = raw_url
elif raw_url.startswith('postgresql://'):
    # Convert standard postgresql:// URL to use asyncpg driver
    DATABASE_URL = raw_url.replace('postgresql://', 'postgresql+asyncpg://', 1)
else:
    DATABASE_URL = raw_url

print(f"Using database URL: {DATABASE_URL}")

engine = create_async_engine(DATABASE_URL)
async_session_maker = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


async def get_async_session() -> AsyncGenerator[AsyncSession, None]:
    """Get async database session."""
    async with async_session_maker() as session:
        yield session


async def get_user_db(session: AsyncSession = Depends(get_async_session)):
    """Get user database for authentication."""
    yield SQLAlchemyUserDatabase(session, User)