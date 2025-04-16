from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, Field


class ProjectBase(BaseModel):
    """Base project schema with common attributes."""
    name: str
    type: str = Field(..., description="Project type (SNA, ML, ABM, GENERAL)")
    description: Optional[str] = None


class ProjectCreate(ProjectBase):
    """Schema for project creation."""
    pass


class ProjectUpdate(BaseModel):
    """Schema for project updates - all fields optional."""
    name: Optional[str] = None
    description: Optional[str] = None
    type: Optional[str] = None
    status: Optional[str] = None


class ProjectInDB(ProjectBase):
    """Project schema as stored in database."""
    id: int
    created_at: datetime
    updated_at: datetime
    status: str = "active"  # active, archived, completed, draft
    
    class Config:
        orm_mode = True


class Project(ProjectInDB):
    """Full project schema for API responses."""
    pass