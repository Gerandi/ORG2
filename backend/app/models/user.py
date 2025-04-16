from datetime import datetime
from typing import List, Optional

from sqlalchemy import Column, String, Integer, DateTime, Boolean, ForeignKey, Table
from sqlalchemy.orm import relationship
from fastapi_users.db import SQLAlchemyBaseUserTable, SQLAlchemyUserDatabase
from sqlalchemy.ext.declarative import declarative_base

Base = declarative_base()

# Association tables for many-to-many relationships
user_project = Table(
    "user_project",
    Base.metadata,
    Column("user_id", Integer, ForeignKey("users.id"), primary_key=True),
    Column("project_id", Integer, ForeignKey("projects.id"), primary_key=True),
)


class User(SQLAlchemyBaseUserTable[int], Base):
    """User model with FastAPI-Users integration."""
    
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True)
    email = Column(String(length=320), unique=True, index=True, nullable=False)
    hashed_password = Column(String(length=1024), nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    is_superuser = Column(Boolean, default=False, nullable=False)
    is_verified = Column(Boolean, default=False, nullable=False)
    
    # Additional user fields
    username = Column(String(length=50), unique=True, index=True)
    first_name = Column(String(length=50))
    last_name = Column(String(length=50))
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    last_login = Column(DateTime, nullable=True)