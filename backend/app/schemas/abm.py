from typing import Dict, List, Optional, Any, Union
from datetime import datetime
from pydantic import BaseModel, Field, validator, ConfigDict


class AgentAttributeDefinitionBase(BaseModel):
    """Base schema for agent attribute definitions."""
    name: str
    type: str
    default_value_json: Optional[Any] = None
    min_value: Optional[float] = None
    max_value: Optional[float] = None
    options_json: Optional[List[Any]] = None


class AgentAttributeDefinitionCreate(AgentAttributeDefinitionBase):
    """Schema for creating agent attribute definitions."""
    pass


class AgentAttributeDefinitionUpdate(BaseModel):
    """Schema for updating agent attribute definitions."""
    name: Optional[str] = None
    type: Optional[str] = None
    default_value_json: Optional[Any] = None
    min_value: Optional[float] = None
    max_value: Optional[float] = None
    options_json: Optional[List[Any]] = None


class AgentAttributeDefinitionInDB(AgentAttributeDefinitionBase):
    """Schema for agent attribute definitions as stored in database."""
    id: int
    abm_model_id: int
    
    model_config = ConfigDict(from_attributes=True)


class AgentAttributeDefinition(AgentAttributeDefinitionInDB):
    """Full agent attribute definition schema for API responses."""
    pass


class AgentStateVariableDefinitionBase(BaseModel):
    """Base schema for agent state variable definitions."""
    name: str
    type: str
    default_value_json: Optional[Any] = None
    min_value: Optional[float] = None
    max_value: Optional[float] = None
    options_json: Optional[List[Any]] = None


class AgentStateVariableDefinitionCreate(AgentStateVariableDefinitionBase):
    """Schema for creating agent state variable definitions."""
    pass


class AgentStateVariableDefinitionUpdate(BaseModel):
    """Schema for updating agent state variable definitions."""
    name: Optional[str] = None
    type: Optional[str] = None
    default_value_json: Optional[Any] = None
    min_value: Optional[float] = None
    max_value: Optional[float] = None
    options_json: Optional[List[Any]] = None


class AgentStateVariableDefinitionInDB(AgentStateVariableDefinitionBase):
    """Schema for agent state variable definitions as stored in database."""
    id: int
    abm_model_id: int
    
    model_config = ConfigDict(from_attributes=True)


class AgentStateVariableDefinition(AgentStateVariableDefinitionInDB):
    """Full agent state variable definition schema for API responses."""
    pass


class AgentBehaviorDefinitionBase(BaseModel):
    """Base schema for agent behavior definitions."""
    name: str
    description: Optional[str] = None
    parameters_json: Optional[Dict[str, Any]] = None


class AgentBehaviorDefinitionCreate(AgentBehaviorDefinitionBase):
    """Schema for creating agent behavior definitions."""
    pass


class AgentBehaviorDefinitionUpdate(BaseModel):
    """Schema for updating agent behavior definitions."""
    name: Optional[str] = None
    description: Optional[str] = None
    parameters_json: Optional[Dict[str, Any]] = None


class AgentBehaviorDefinitionInDB(AgentBehaviorDefinitionBase):
    """Schema for agent behavior definitions as stored in database."""
    id: int
    abm_model_id: int
    
    model_config = ConfigDict(from_attributes=True)


class AgentBehaviorDefinition(AgentBehaviorDefinitionInDB):
    """Full agent behavior definition schema for API responses."""
    pass


class EnvironmentVariableDefinitionBase(BaseModel):
    """Base schema for environment variable definitions."""
    name: str
    type: str
    default_value_json: Optional[Any] = None
    min_value: Optional[float] = None
    max_value: Optional[float] = None
    options_json: Optional[List[Any]] = None


class EnvironmentVariableDefinitionCreate(EnvironmentVariableDefinitionBase):
    """Schema for creating environment variable definitions."""
    pass


class EnvironmentVariableDefinitionUpdate(BaseModel):
    """Schema for updating environment variable definitions."""
    name: Optional[str] = None
    type: Optional[str] = None
    default_value_json: Optional[Any] = None
    min_value: Optional[float] = None
    max_value: Optional[float] = None
    options_json: Optional[List[Any]] = None


class EnvironmentVariableDefinitionInDB(EnvironmentVariableDefinitionBase):
    """Schema for environment variable definitions as stored in database."""
    id: int
    abm_model_id: int
    
    model_config = ConfigDict(from_attributes=True)


class EnvironmentVariableDefinition(EnvironmentVariableDefinitionInDB):
    """Full environment variable definition schema for API responses."""
    pass


class ABMModelBase(BaseModel):
    """Base ABM model schema with common attributes."""
    name: str
    simulation_type: str
    description: Optional[str] = None


class ABMModelCreate(ABMModelBase):
    """Schema for ABM model creation."""
    project_id: Optional[int] = None
    network_id: Optional[int] = None
    agent_attributes: List[AgentAttributeDefinitionCreate] = Field(default=[])
    agent_state_variables: List[AgentStateVariableDefinitionCreate] = Field(default=[])
    agent_behaviors: List[AgentBehaviorDefinitionCreate] = Field(default=[])
    environment_variables: List[EnvironmentVariableDefinitionCreate] = Field(default=[])


class ABMModelUpdate(BaseModel):
    """Schema for ABM model updates - all fields optional."""
    name: Optional[str] = None
    description: Optional[str] = None
    simulation_type: Optional[str] = None
    status: Optional[str] = None
    agent_attributes: Optional[List[AgentAttributeDefinitionCreate]] = None
    agent_state_variables: Optional[List[AgentStateVariableDefinitionCreate]] = None
    agent_behaviors: Optional[List[AgentBehaviorDefinitionCreate]] = None
    environment_variables: Optional[List[EnvironmentVariableDefinitionCreate]] = None


class ABMModelInDB(ABMModelBase):
    """ABM model schema as stored in database."""
    id: int
    created_at: datetime
    updated_at: datetime
    status: str
    project_id: Optional[int] = None
    network_id: Optional[int] = None
    
    model_config = ConfigDict(from_attributes=True)


class ABMModel(ABMModelInDB):
    """Full ABM model schema for API responses."""
    agent_attributes: List[AgentAttributeDefinition] = []
    agent_state_variables: List[AgentStateVariableDefinition] = []
    agent_behaviors: List[AgentBehaviorDefinition] = []
    environment_variables: List[EnvironmentVariableDefinition] = []


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
    
    model_config = ConfigDict(from_attributes=True)


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