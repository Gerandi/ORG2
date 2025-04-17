from fastapi import APIRouter, HTTPException, status, Depends, Query, Body, Form
from typing import List, Dict, Any, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import delete, update
import networkx as nx
import json
import os
import uuid

from app.core.database import get_async_session
from app.auth.authentication import current_active_user
from app.models.models import ABMModel, ABMSimulation, Network, User
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
    # Implement authorization filter
    if user.is_superuser:
        query = select(ABMModel)
    else:
        query = select(ABMModel).where(ABMModel.user_id == user.id)
    
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
    
    return model

@router.post("/models", response_model=ABMModelSchema, status_code=status.HTTP_201_CREATED)
async def create_model(
    model_in: ABMModelCreate,
    db: AsyncSession = Depends(get_async_session),
    user: User = Depends(current_active_user)
):
    """
    Create a new ABM model.
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
        simulation_type=model_in.simulation_type,
        attributes=model_in.attributes or {}
    )
    
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
    Update an existing ABM model.
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
    
    # Update model attributes
    update_data = model_update.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(model, key, value)
    
    # Commit changes
    await db.commit()
    await db.refresh(model)
    
    return model

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
    
    # Delete the model
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
    
    # Fetch the associated model
    query = select(ABMModel).where(ABMModel.id == db_simulation.model_id)
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
        # Create ABM model
        abm_model = ABMSimulationService.create_model(
            simulation_type=SimulationType(db_model.simulation_type),
            network_data=G,
            parameters=db_simulation.parameters
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