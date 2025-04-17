from fastapi import APIRouter, HTTPException, status, Depends, Query, Body, Form
from typing import List, Dict, Any, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from sqlalchemy import delete, update
import networkx as nx
import json
import os
import uuid

from app.core.database import get_async_session
from app.auth.authentication import current_active_user
from app.models.models import (
    ABMModel, ABMSimulation, Network, User,
    AgentAttributeDefinition, AgentStateVariableDefinition, 
    AgentBehaviorDefinition, EnvironmentVariableDefinition
)
from app.schemas.abm import ABMModelCreate, ABMModelUpdate, ABMModel as ABMModelSchema
from app.schemas.abm import SimulationCreate, SimulationUpdate, Simulation as SimulationSchema
from app.services.abm_simulation import ABMSimulationService, SimulationType

router = APIRouter(
    prefix="/abm",
    tags=["agent-based modeling"],
    responses={404: {"description": "Not found"}},
)

@router.get("/models", response_model=List[ABMModelSchema])
async def get_models(
    project_id: Optional[int] = Query(None),
    db: AsyncSession = Depends(get_async_session),
    user: User = Depends(current_active_user)
):
    """
    Retrieve all ABM models.
    """
    # Implement authorization filter with eager loading of relationships
    if user.is_superuser:
        query = select(ABMModel).options(
            selectinload(ABMModel.agent_attributes),
            selectinload(ABMModel.agent_state_variables),
            selectinload(ABMModel.agent_behaviors),
            selectinload(ABMModel.environment_variables)
        )
    else:
        query = select(ABMModel).where(ABMModel.user_id == user.id).options(
            selectinload(ABMModel.agent_attributes),
            selectinload(ABMModel.agent_state_variables),
            selectinload(ABMModel.agent_behaviors),
            selectinload(ABMModel.environment_variables)
        )
    
    # Add project filter if provided
    if project_id is not None:
        query = query.where(ABMModel.project_id == project_id)
    
    result = await db.execute(query)
    models = result.scalars().all()
    
    return models

@router.get("/models/{model_id}", response_model=ABMModelSchema)
async def get_model(
    model_id: int,
    db: AsyncSession = Depends(get_async_session),
    user: User = Depends(current_active_user)
):
    """
    Retrieve a specific ABM model by ID.
    """
    # Fetch the model from database with eager loading of relationships
    query = select(ABMModel).where(ABMModel.id == model_id).options(
        selectinload(ABMModel.agent_attributes),
        selectinload(ABMModel.agent_state_variables),
        selectinload(ABMModel.agent_behaviors),
        selectinload(ABMModel.environment_variables)
    )
    
    result = await db.execute(query)
    model = result.scalar_one_or_none()
    
    # Check if model exists
    if model is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Model not found")
    
    # Check authorization
    if model.user_id != user.id and not user.is_superuser:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")
    
    return model

@router.post("/models", response_model=ABMModelSchema, status_code=status.HTTP_201_CREATED)
async def create_model(
    model_in: ABMModelCreate,
    db: AsyncSession = Depends(get_async_session),
    user: User = Depends(current_active_user)
):
    """
    Create a new ABM model with structured definitions.
    """
    # Validate simulation type
    try:
        sim_type = SimulationType(model_in.simulation_type)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Invalid simulation type. Must be one of: {', '.join([e.value for e in SimulationType])}"
        )
    
    # Create new ABMModel instance
    new_model = ABMModel(
        name=model_in.name,
        description=model_in.description or f"ABM model: {model_in.name}",
        project_id=model_in.project_id,
        network_id=model_in.network_id,
        user_id=user.id,
        status="created",
        simulation_type=model_in.simulation_type
    )
    
    # Create agent attribute definitions
    for attr in model_in.agent_attributes:
        attr_def = AgentAttributeDefinition(
            name=attr.name,
            type=attr.type,
            default_value_json=attr.default_value_json,
            min_value=attr.min_value,
            max_value=attr.max_value,
            options_json=attr.options_json
        )
        new_model.agent_attributes.append(attr_def)
    
    # Create agent state variable definitions
    for state_var in model_in.agent_state_variables:
        state_var_def = AgentStateVariableDefinition(
            name=state_var.name,
            type=state_var.type,
            default_value_json=state_var.default_value_json,
            min_value=state_var.min_value,
            max_value=state_var.max_value,
            options_json=state_var.options_json
        )
        new_model.agent_state_variables.append(state_var_def)
    
    # Create agent behavior definitions
    for behavior in model_in.agent_behaviors:
        behavior_def = AgentBehaviorDefinition(
            name=behavior.name,
            description=behavior.description,
            parameters_json=behavior.parameters_json
        )
        new_model.agent_behaviors.append(behavior_def)
    
    # Create environment variable definitions
    for env_var in model_in.environment_variables:
        env_var_def = EnvironmentVariableDefinition(
            name=env_var.name,
            type=env_var.type,
            default_value_json=env_var.default_value_json,
            min_value=env_var.min_value,
            max_value=env_var.max_value,
            options_json=env_var.options_json
        )
        new_model.environment_variables.append(env_var_def)
    
    # Save to database
    db.add(new_model)
    await db.commit()
    await db.refresh(new_model)
    
    return new_model

@router.put("/models/{model_id}", response_model=ABMModelSchema)
async def update_model(
    model_id: int,
    model_update: ABMModelUpdate,
    db: AsyncSession = Depends(get_async_session),
    user: User = Depends(current_active_user)
):
    """
    Update an existing ABM model with structured definitions.
    """
    # Fetch the model from database with eager loading of relationships
    query = select(ABMModel).where(ABMModel.id == model_id).options(
        selectinload(ABMModel.agent_attributes),
        selectinload(ABMModel.agent_state_variables),
        selectinload(ABMModel.agent_behaviors),
        selectinload(ABMModel.environment_variables)
    )
    result = await db.execute(query)
    model = result.scalar_one_or_none()
    
    # Check if model exists
    if model is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Model not found")
    
    # Check authorization
    if model.user_id != user.id and not user.is_superuser:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")
    
    # Update simple attributes
    update_data = model_update.model_dump(exclude_unset=True)
    
    # Remove definition lists from update_data (we'll handle them separately)
    agent_attributes = update_data.pop("agent_attributes", None)
    agent_state_variables = update_data.pop("agent_state_variables", None)
    agent_behaviors = update_data.pop("agent_behaviors", None)
    environment_variables = update_data.pop("environment_variables", None)
    
    # Update the simple fields
    for key, value in update_data.items():
        setattr(model, key, value)
    
    # Update agent attribute definitions if provided
    if agent_attributes is not None:
        # Delete existing agent attribute definitions
        await db.execute(delete(AgentAttributeDefinition).where(
            AgentAttributeDefinition.abm_model_id == model_id
        ))
        
        # Create new agent attribute definitions
        for attr in agent_attributes:
            attr_def = AgentAttributeDefinition(
                name=attr.name,
                type=attr.type,
                default_value_json=attr.default_value_json,
                min_value=attr.min_value,
                max_value=attr.max_value,
                options_json=attr.options_json,
                abm_model_id=model_id
            )
            db.add(attr_def)
    
    # Update agent state variable definitions if provided
    if agent_state_variables is not None:
        # Delete existing agent state variable definitions
        await db.execute(delete(AgentStateVariableDefinition).where(
            AgentStateVariableDefinition.abm_model_id == model_id
        ))
        
        # Create new agent state variable definitions
        for state_var in agent_state_variables:
            state_var_def = AgentStateVariableDefinition(
                name=state_var.name,
                type=state_var.type,
                default_value_json=state_var.default_value_json,
                min_value=state_var.min_value,
                max_value=state_var.max_value,
                options_json=state_var.options_json,
                abm_model_id=model_id
            )
            db.add(state_var_def)
    
    # Update agent behavior definitions if provided
    if agent_behaviors is not None:
        # Delete existing agent behavior definitions
        await db.execute(delete(AgentBehaviorDefinition).where(
            AgentBehaviorDefinition.abm_model_id == model_id
        ))
        
        # Create new agent behavior definitions
        for behavior in agent_behaviors:
            behavior_def = AgentBehaviorDefinition(
                name=behavior.name,
                description=behavior.description,
                parameters_json=behavior.parameters_json,
                abm_model_id=model_id
            )
            db.add(behavior_def)
    
    # Update environment variable definitions if provided
    if environment_variables is not None:
        # Delete existing environment variable definitions
        await db.execute(delete(EnvironmentVariableDefinition).where(
            EnvironmentVariableDefinition.abm_model_id == model_id
        ))
        
        # Create new environment variable definitions
        for env_var in environment_variables:
            env_var_def = EnvironmentVariableDefinition(
                name=env_var.name,
                type=env_var.type,
                default_value_json=env_var.default_value_json,
                min_value=env_var.min_value,
                max_value=env_var.max_value,
                options_json=env_var.options_json,
                abm_model_id=model_id
            )
            db.add(env_var_def)
    
    # Commit changes
    await db.commit()
    
    # Refresh model with loaded relationships
    query = select(ABMModel).where(ABMModel.id == model_id).options(
        selectinload(ABMModel.agent_attributes),
        selectinload(ABMModel.agent_state_variables),
        selectinload(ABMModel.agent_behaviors),
        selectinload(ABMModel.environment_variables)
    )
    result = await db.execute(query)
    updated_model = result.scalar_one_or_none()
    
    return updated_model

@router.delete("/models/{model_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_model(
    model_id: int,
    db: AsyncSession = Depends(get_async_session),
    user: User = Depends(current_active_user)
):
    """
    Delete an ABM model.
    """
    # Fetch the model from database
    query = select(ABMModel).where(ABMModel.id == model_id)
    result = await db.execute(query)
    model = result.scalar_one_or_none()
    
    # Check if model exists
    if model is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Model not found")
    
    # Check authorization
    if model.user_id != user.id and not user.is_superuser:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")
    
    # Delete the model - cascade will handle deleting related definitions
    await db.execute(delete(ABMModel).where(ABMModel.id == model_id))
    await db.commit()
    
    return None

@router.get("/simulations", response_model=List[SimulationSchema])
async def get_simulations(
    project_id: Optional[int] = Query(None),
    db: AsyncSession = Depends(get_async_session),
    user: User = Depends(current_active_user)
):
    """
    Retrieve all ABM simulations.
    """
    # Base query with authorization filter
    if user.is_superuser:
        query = select(ABMSimulation)
    else:
        query = select(ABMSimulation).where(ABMSimulation.user_id == user.id)
    
    # Add project filter if provided
    # For simulations, we need to join with ABMModel to filter by project_id
    if project_id is not None:
        query = (
            select(ABMSimulation)
            .join(ABMModel, ABMSimulation.model_id == ABMModel.id)
            .where(ABMModel.project_id == project_id)
        )
        # Re-apply authorization filter after join
        if not user.is_superuser:
            query = query.where(ABMSimulation.user_id == user.id)
    
    result = await db.execute(query)
    simulations = result.scalars().all()
    
    return simulations

@router.get("/simulations/{simulation_id}", response_model=SimulationSchema)
async def get_simulation(
    simulation_id: int,
    db: AsyncSession = Depends(get_async_session),
    user: User = Depends(current_active_user)
):
    """
    Retrieve a specific ABM simulation by ID.
    """
    # Fetch the simulation from database
    query = select(ABMSimulation).where(ABMSimulation.id == simulation_id)
    result = await db.execute(query)
    simulation = result.scalar_one_or_none()
    
    # Check if simulation exists
    if simulation is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Simulation not found")
    
    # Check authorization
    if simulation.user_id != user.id and not user.is_superuser:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")
    
    return simulation

@router.post("/simulations", response_model=SimulationSchema, status_code=status.HTTP_201_CREATED)
async def create_simulation(
    simulation_in: SimulationCreate,
    db: AsyncSession = Depends(get_async_session),
    user: User = Depends(current_active_user)
):
    """
    Create a new ABM simulation.
    """
    # Find the model
    query = select(ABMModel).where(ABMModel.id == simulation_in.model_id)
    result = await db.execute(query)
    model = result.scalar_one_or_none()
    
    if model is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Model not found")
    
    # Check model authorization
    if model.user_id != user.id and not user.is_superuser:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to use this model")
    
    # Create new ABMSimulation instance
    new_simulation = ABMSimulation(
        name=simulation_in.name,
        description=simulation_in.description or f"Simulation for model: {model.name}",
        model_id=simulation_in.model_id,
        user_id=user.id,
        status="created",
        parameters=simulation_in.parameters or {},
        steps_executed=0,
        results_summary={}
    )
    
    # Save to database
    db.add(new_simulation)
    await db.commit()
    await db.refresh(new_simulation)
    
    return new_simulation

@router.post("/simulations/{simulation_id}/run", response_model=SimulationSchema)
async def run_simulation(
    simulation_id: int,
    steps: Optional[int] = None,
    db: AsyncSession = Depends(get_async_session),
    user: User = Depends(current_active_user)
):
    """
    Run an ABM simulation for the specified number of steps.
    """
    # Fetch the simulation from database
    query = select(ABMSimulation).where(ABMSimulation.id == simulation_id)
    result = await db.execute(query)
    db_simulation = result.scalar_one_or_none()
    
    # Check if simulation exists
    if db_simulation is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Simulation not found")
    
    # Check authorization
    if db_simulation.user_id != user.id and not user.is_superuser:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")
    
    # Fetch the associated model with all definition relationships
    query = select(ABMModel).where(ABMModel.id == db_simulation.model_id).options(
        selectinload(ABMModel.agent_attributes),
        selectinload(ABMModel.agent_state_variables),
        selectinload(ABMModel.agent_behaviors),
        selectinload(ABMModel.environment_variables)
    )
    result = await db.execute(query)
    db_model = result.scalar_one_or_none()
    
    if db_model is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Model for this simulation not found")
    
    # Initialize a graph G
    G = nx.Graph()
    
    # If model has a network_id, use that network for simulation
    if db_model.network_id:
        # Fetch the network
        query = select(Network).where(Network.id == db_model.network_id)
        result = await db.execute(query)
        db_network = result.scalar_one_or_none()
        
        if db_network is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Network for this model not found")
        
        # Load graph from network file
        file_path = db_network.file_path
        if not file_path or not os.path.exists(file_path):
            raise HTTPException(status_code=400, detail="Network file not found")
        
        # Load graph
        if file_path.endswith(".graphml"):
            G = nx.read_graphml(file_path)
        elif file_path.endswith(".gexf"):
            G = nx.read_gexf(file_path)
        elif file_path.endswith(".gml"):
            G = nx.read_gml(file_path)
        else:
            raise HTTPException(status_code=400, detail="Unsupported network file format")
    else:
        # Create a default network if none specified
        G = nx.Graph()
        # Add some nodes and edges for testing
        for i in range(50):
            G.add_node(str(i), department=["HR", "Sales", "Engineering", "Finance", "Marketing"][i % 5])
        for i in range(50):
            for j in range(i+1, min(i+5, 50)):
                G.add_edge(str(i), str(j), weight=1.0)
    
    # Determine steps to run
    if not steps:
        steps = db_simulation.parameters.get("time_steps", 100)
    
    try:
        # Convert structured model definitions to parameters
        agent_attributes_list = [{
            "name": attr.name,
            "type": attr.type,
            "default_value": attr.default_value_json,
            "min_value": attr.min_value,
            "max_value": attr.max_value,
            "options": attr.options_json
        } for attr in db_model.agent_attributes]
        
        agent_state_variables_list = [{
            "name": var.name,
            "type": var.type,
            "default_value": var.default_value_json,
            "min_value": var.min_value,
            "max_value": var.max_value,
            "options": var.options_json
        } for var in db_model.agent_state_variables]
        
        agent_behaviors_list = [{
            "name": behavior.name,
            "description": behavior.description,
            "parameters": behavior.parameters_json
        } for behavior in db_model.agent_behaviors]
        
        environment_variables_list = [{
            "name": env_var.name,
            "type": env_var.type,
            "default_value": env_var.default_value_json,
            "min_value": env_var.min_value,
            "max_value": env_var.max_value,
            "options": env_var.options_json
        } for env_var in db_model.environment_variables]
        
        # Create ABM model with structured definitions
        abm_model = ABMSimulationService.create_model(
            simulation_type=SimulationType(db_model.simulation_type),
            network_data=G,
            agent_attributes=agent_attributes_list,
            agent_state_variables=agent_state_variables_list,
            agent_behaviors=agent_behaviors_list,
            environment_variables=environment_variables_list,
            simulation_parameters=db_simulation.parameters
        )
        
        # Run simulation
        str_sim_id = str(simulation_id)  # Service uses string IDs
        results = ABMSimulationService.run_simulation(
            model=abm_model,
            steps=steps,
            simulation_id=str_sim_id
        )
        
        # Update simulation status in database
        db_simulation.status = "completed"
        db_simulation.steps_executed = steps
        db_simulation.results_summary = results.get("final_state", {})
        db_simulation.results_file_path = results.get("results_file_path")
        
        await db.commit()
        await db.refresh(db_simulation)
        
        return db_simulation
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error running simulation: {str(e)}")

@router.get("/simulations/{simulation_id}/results", response_model=Dict[str, Any])
async def get_simulation_results(
    simulation_id: int,
    detail_level: str = "summary",
    db: AsyncSession = Depends(get_async_session),
    user: User = Depends(current_active_user)
):
    """
    Get the results of a completed simulation.
    """
    # Fetch the simulation from database
    query = select(ABMSimulation).where(ABMSimulation.id == simulation_id)
    result = await db.execute(query)
    db_simulation = result.scalar_one_or_none()
    
    # Check if simulation exists
    if db_simulation is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Simulation not found")
    
    # Check authorization
    if db_simulation.user_id != user.id and not user.is_superuser:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")
    
    # Check if simulation is completed
    if db_simulation.status != "completed":
        raise HTTPException(status_code=400, detail="Simulation has not been completed")
    
    # Return appropriate level of detail
    if detail_level == "summary":
        return {
            "simulation_id": simulation_id,
            "name": db_simulation.name,
            "results_summary": db_simulation.results_summary
        }
    else:
        # Full detail - load from file if available
        if db_simulation.results_file_path and os.path.exists(db_simulation.results_file_path):
            try:
                with open(db_simulation.results_file_path, 'r') as f:
                    full_results = json.load(f)
                return full_results
            except Exception:
                raise HTTPException(status_code=404, detail="Full results file not found or corrupted")
        else:
            raise HTTPException(status_code=404, detail="Full results file not found")

@router.post("/parameter-sweep", response_model=Dict[str, Any])
async def parameter_sweep(
    simulation_type: str,
    parameter_ranges: Dict[str, List[float]],
    network_id: Optional[int] = None,
    steps: int = 100,
    metric_name: str = "culture_homogeneity",
    db: AsyncSession = Depends(get_async_session),
    user: User = Depends(current_active_user)
):
    """
    Run a parameter sweep to analyze model sensitivity.
    """
    # Validate simulation type
    try:
        sim_type = SimulationType(simulation_type)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Invalid simulation type. Must be one of: {', '.join([e.value for e in SimulationType])}"
        )
    
    # Initialize a graph G
    G = nx.Graph()
    
    # If network_id provided, fetch and use that network
    if network_id:
        # Fetch the network
        query = select(Network).where(Network.id == network_id)
        result = await db.execute(query)
        db_network = result.scalar_one_or_none()
        
        if db_network is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Network not found")
        
        # Check authorization
        if db_network.user_id != user.id and not user.is_superuser:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to use this network")
        
        # Load graph from network file
        file_path = db_network.file_path
        if not file_path or not os.path.exists(file_path):
            raise HTTPException(status_code=400, detail="Network file not found")
        
        # Load graph
        if file_path.endswith(".graphml"):
            G = nx.read_graphml(file_path)
        elif file_path.endswith(".gexf"):
            G = nx.read_gexf(file_path)
        elif file_path.endswith(".gml"):
            G = nx.read_gml(file_path)
        else:
            raise HTTPException(status_code=400, detail="Unsupported network file format")
    else:
        # Create a default network if none specified
        G = nx.Graph()
        # Add some nodes and edges for testing
        for i in range(50):
            G.add_node(str(i), department=["HR", "Sales", "Engineering", "Finance", "Marketing"][i % 5])
        for i in range(50):
            for j in range(i+1, min(i+5, 50)):
                G.add_edge(str(i), str(j), weight=1.0)
    
    try:
        # Run parameter sweep
        results = ABMSimulationService.parameter_sweep(
            simulation_type=sim_type,
            network_data=G,
            parameter_ranges=parameter_ranges,
            steps=steps,
            metric_name=metric_name
        )
        
        return results
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error running parameter sweep: {str(e)}")

@router.get("/theories", response_model=List[Dict[str, Any]])
async def get_theories():
    """
    Get available theoretical frameworks for ABM models.
    """
    try:
        theories = ABMSimulationService.get_theory_info()
        return theories
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving theories: {str(e)}")