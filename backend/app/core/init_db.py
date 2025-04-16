import asyncio
import os
from typing import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker

# Import all models to ensure they're included in Base.metadata
from app.models.models import Base

# Database URL - use environment variable if available, otherwise use default
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite+aiosqlite:///./orgai.db")

engine = create_async_engine(DATABASE_URL)
async_session_maker = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


async def get_async_session() -> AsyncGenerator[AsyncSession, None]:
    """Get async database session."""
    async with async_session_maker() as session:
        yield session


async def init_db(reset: bool = False):
    """
    Initialize database by creating all tables.
    
    Args:
        reset: If True, drops all existing tables before creating new ones.
    """
    print(f"Initializing database at {DATABASE_URL}...")
    
    # Create all tables from all Base metadata
    async with engine.begin() as conn:
        # Drop all existing tables if reset is True
        if reset:
            print("Dropping all existing tables...")
            await conn.run_sync(Base.metadata.drop_all)
        
        # Create all tables
        print("Creating tables...")
        await conn.run_sync(Base.metadata.create_all)
    
    print("Database initialization completed!")


if __name__ == "__main__":
    """Execute this script directly to initialize the database."""
    asyncio.run(init_db())