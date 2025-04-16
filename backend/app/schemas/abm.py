from typing import Dict, List, Optional, Any
from datetime import datetime
from pydantic import BaseModel, Field, validator


class ABMModelBase(BaseModel):
    """Base ABM model schema with common attributes."""
    name: str
    simulation_type: str
    description: Optional[str] = None
    attributes: Optional[Dict[str, Any]] = Field(
        default=None,
        description="Additional model attributes",
        example={
            "num_agents": 50,
            "time_steps": 100,
            "space_type": "network"
        }
    )


class ABMModelCreate(ABMModelBase):
    """Schema for ABM model creation."""
    project_id: Optional[int] = None
    network_id: Optional[int] = None


class ABMModelUpdate(BaseModel):
    """Schema for ABM model updates - all fields optional."""
    name: Optional[str] = None
    description: Optional[str] = None
    simulation_type: Optional[str] = None
    status: Optional[str] = None
    attributes: Optional[Dict[str, Any]] = None


class ABMModelInDB(ABMModelBase):
    """ABM model schema as stored in database."""
    id: int
    created_at: datetime
    updated_at: datetime
    status: str
    project_id: Optional[int] = None
    network_id: Optional[int] = None
    
    class Config:
        orm_mode = True


class ABMModel(ABMModelInDB):
    """Full ABM model schema for API responses."""
    pass


class SimulationBase(BaseModel):
    """Base simulation schema with common attributes."""
    name: str
    model_id: int
    description: Optional[str] = None
    parameters: Optional[Dict[str, Any]] = Field(
        default=None,
        description="Simulation parameters",
        example={
            "influence_threshold": 0.5,
            "random_seed": 42,
            "homophily_factor": 0.7
        }
    )


class SimulationCreate(SimulationBase):
    """Schema for simulation creation."""
    pass


class SimulationUpdate(BaseModel):
    """Schema for simulation updates - all fields optional."""
    name: Optional[str] = None
    description: Optional[str] = None
    parameters: Optional[Dict[str, Any]] = None
    status: Optional[str] = None


class SimulationInDB(SimulationBase):
    """Simulation schema as stored in database."""
    id: int
    created_at: datetime
    updated_at: datetime
    status: str
    steps_executed: int
    results_summary: Optional[Dict[str, Any]] = None
    results_file_path: Optional[str] = None
    
    class Config:
        orm_mode = True


class Simulation(SimulationInDB):
    """Full simulation schema for API responses."""
    pass


class SimulationResults(BaseModel):
    """Schema for simulation results."""
    simulation_id: int
    name: str
    results_summary: Dict[str, Any]
    time_series_data: Optional[Dict[str, List[Any]]] = None
    agent_states: Optional[Dict[str, Any]] = None


class Theory(BaseModel):
    """Schema for theoretical frameworks."""
    id: str
    name: str
    description: str
    key_parameters: List[Dict[str, Any]]
    references: List[str]