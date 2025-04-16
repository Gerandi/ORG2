from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, EmailStr, Field


class UserBase(BaseModel):
    """Base user schema with common attributes."""
    email: EmailStr
    username: str
    is_active: Optional[bool] = True
    is_superuser: Optional[bool] = False
    first_name: Optional[str] = None
    last_name: Optional[str] = None


class UserCreate(UserBase):
    """Schema for user creation - requires password."""
    password: str = Field(..., min_length=8)


class UserUpdate(BaseModel):
    """Schema for user updates - all fields optional."""
    email: Optional[EmailStr] = None
    username: Optional[str] = None
    password: Optional[str] = None
    is_active: Optional[bool] = None
    is_superuser: Optional[bool] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None


class UserResponse(UserBase):
    """Response schema for users - includes ids and timestamps."""
    id: int
    created_at: datetime
    updated_at: datetime
    last_login: Optional[datetime] = None
    
    class Config:
        orm_mode = True