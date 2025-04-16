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
    
    # Add method needed by fastapi-users for Pydantic v2 compatibility
    def create_update_dict(self, **kwargs):
        exclude_unset = kwargs.pop("exclude_unset", True) 
        return self.model_dump(exclude_unset=exclude_unset, **kwargs)


class UserCreate(UserBase):
    """Schema for user creation - requires password."""
    password: str = Field(..., min_length=8)
    
    # Add this method specifically for fastapi-users compatibility with Pydantic v2
    def create_update_dict(self, **kwargs):
        # Return a dictionary of values for use in creating a User model
        exclude_unset = kwargs.pop("exclude_unset", True)
        return self.model_dump(exclude_unset=exclude_unset, **kwargs)


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
        from_attributes = True  # Updated from orm_mode for Pydantic v2
        populate_by_name = True  # Updated from allow_population_by_field_name for Pydantic v2