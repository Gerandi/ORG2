from fastapi import APIRouter, HTTPException, status
from typing import List, Dict, Any, Optional
from datetime import datetime

router = APIRouter(
    prefix="/projects",
    tags=["projects"],
    responses={404: {"description": "Not found"}},
)

# Mock data for demonstration purposes
MOCK_PROJECTS = [
    {
        "id": 1,
        "name": "Communication Patterns Study",
        "description": "Analysis of communication patterns in a medium-sized organization",
        "created_at": "2025-04-01T10:00:00",
        "updated_at": "2025-04-14T15:30:00",
        "type": "SNA",
        "status": "active"
    },
    {
        "id": 2,
        "name": "Team Performance Prediction",
        "description": "Machine learning model to predict team performance based on collaboration metrics",
        "created_at": "2025-03-15T09:30:00",
        "updated_at": "2025-04-10T14:20:00",
        "type": "ML",
        "status": "active"
    },
    {
        "id": 3,
        "name": "Organizational Culture Simulation",
        "description": "Agent-based model simulating the evolution of organizational culture",
        "created_at": "2025-02-20T11:45:00",
        "updated_at": "2025-04-05T16:10:00",
        "type": "ABM",
        "status": "active"
    }
]

@router.get("/", response_model=List[Dict[str, Any]])
async def get_projects():
    """
    Retrieve all projects.
    """
    return MOCK_PROJECTS

@router.get("/{project_id}", response_model=Dict[str, Any])
async def get_project(project_id: int):
    """
    Retrieve a specific project by ID.
    """
    for project in MOCK_PROJECTS:
        if project["id"] == project_id:
            return project
    raise HTTPException(status_code=404, detail="Project not found")

@router.post("/", response_model=Dict[str, Any], status_code=status.HTTP_201_CREATED)
async def create_project(project: Dict[str, Any]):
    """
    Create a new project.
    """
    # Basic validation
    required_fields = ["name", "type"]
    for field in required_fields:
        if field not in project:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Missing required field: {field}"
            )
    
    # In a real implementation, this would save to a database
    new_project = {
        "id": len(MOCK_PROJECTS) + 1,
        **project,
        "created_at": datetime.now().isoformat(),
        "updated_at": datetime.now().isoformat(),
        "status": project.get("status", "active")
    }
    
    MOCK_PROJECTS.append(new_project)
    return new_project

@router.put("/{project_id}", response_model=Dict[str, Any])
async def update_project(project_id: int, project_update: Dict[str, Any]):
    """
    Update an existing project.
    """
    for i, project in enumerate(MOCK_PROJECTS):
        if project["id"] == project_id:
            # Update project, but don't allow modifying id, created_at
            MOCK_PROJECTS[i] = {
                **project,
                **{k: v for k, v in project_update.items() if k not in ["id", "created_at"]},
                "updated_at": datetime.now().isoformat()
            }
            return MOCK_PROJECTS[i]
    
    raise HTTPException(status_code=404, detail="Project not found")

@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_project(project_id: int):
    """
    Delete a project.
    """
    for i, project in enumerate(MOCK_PROJECTS):
        if project["id"] == project_id:
            MOCK_PROJECTS.pop(i)
            return
    
    raise HTTPException(status_code=404, detail="Project not found")