from fastapi import APIRouter, HTTPException, status, Depends
from typing import List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import delete

from app.core.database import get_async_session
from app.auth.authentication import current_active_user
from app.models.models import Project, User
from app.schemas.project import ProjectCreate, ProjectUpdate, Project as ProjectSchema

router = APIRouter(
    prefix="/projects",
    tags=["projects"],
    responses={404: {"description": "Not found"}},
)

@router.get("/", response_model=List[ProjectSchema])
async def get_projects(
    db: AsyncSession = Depends(get_async_session),
    user: User = Depends(current_active_user)
):
    """
    Retrieve all projects.
    """
    # Implement authorization filter - superusers can see all projects, regular users only their own
    if user.is_superuser:
        query = select(Project)
    else:
        query = select(Project).where(Project.user_id == user.id)
    
    result = await db.execute(query)
    projects = result.scalars().all()
    
    return projects

@router.get("/{project_id}", response_model=ProjectSchema)
async def get_project(
    project_id: int,
    db: AsyncSession = Depends(get_async_session),
    user: User = Depends(current_active_user)
):
    """
    Retrieve a specific project by ID.
    """
    # Fetch the project from database
    query = select(Project).where(Project.id == project_id)
    result = await db.execute(query)
    project = result.scalar_one_or_none()
    
    # Check if project exists
    if project is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    
    # Check authorization - only owner or superuser can access
    if project.user_id != user.id and not user.is_superuser:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")
    
    return project

@router.post("/", response_model=ProjectSchema, status_code=status.HTTP_201_CREATED)
async def create_project(
    project_in: ProjectCreate,
    db: AsyncSession = Depends(get_async_session),
    user: User = Depends(current_active_user)
):
    """
    Create a new project.
    """
    # Create new Project instance from input data
    new_project = Project(
        name=project_in.name,
        description=project_in.description,
        type=project_in.type,
        user_id=user.id  # Set the user_id to the current authenticated user
    )
    
    # Add to database, commit transaction, and refresh instance to get auto-generated fields
    db.add(new_project)
    await db.commit()
    await db.refresh(new_project)
    
    return new_project

@router.put("/{project_id}", response_model=ProjectSchema)
async def update_project(
    project_id: int,
    project_update: ProjectUpdate,
    db: AsyncSession = Depends(get_async_session),
    user: User = Depends(current_active_user)
):
    """
    Update an existing project.
    """
    # Fetch the project from database
    query = select(Project).where(Project.id == project_id)
    result = await db.execute(query)
    project = result.scalar_one_or_none()
    
    # Check if project exists
    if project is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    
    # Check authorization - only owner or superuser can update
    if project.user_id != user.id and not user.is_superuser:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")
    
    # Update project attributes
    update_data = project_update.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(project, key, value)
    
    # Commit changes and refresh instance
    await db.commit()
    await db.refresh(project)
    
    return project

@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_project(
    project_id: int,
    db: AsyncSession = Depends(get_async_session),
    user: User = Depends(current_active_user)
):
    """
    Delete a project.
    """
    # Fetch the project from database
    query = select(Project).where(Project.id == project_id)
    result = await db.execute(query)
    project = result.scalar_one_or_none()
    
    # Check if project exists
    if project is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    
    # Check authorization - only owner or superuser can delete
    if project.user_id != user.id and not user.is_superuser:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")
    
    # Delete the project
    await db.execute(delete(Project).where(Project.id == project_id))
    await db.commit()
    
    # Return None (handled by FastAPI's status_code=204)
    return None