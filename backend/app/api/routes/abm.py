from fastapi import APIRouter, HTTPException, status, Depends, Query, Body
from typing import List, Dict, Any, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from enum import Enum
import json

from app.core.database import get_async_session
from app.auth.authentication import current_active_user
from app.models.user import User
from app.services.abm_simulation import ABMSimulationService, SimulationType

router = APIRouter(
    prefix="/abm",
    tags=["agent-based modeling"],
    responses={404: {"description": "Not found"}},
)

# ABM model storage (in-memory for MVP)
# In a real application, this would be stored in a database
ABM_MODELS = []
SIMULATIONS = []
MODEL_ID_COUNTER = 1
SIMULATION_ID_COUNTER = 1

@router.get("/models", response_model=List[Dict[str, Any]])
async def get_models():
    """
    Retrieve all ABM models.
    """
    return ABM_MODELS

@router.get("/models/{model_id}", response_model=Dict[str, Any])
async def get_model(model_id: int):
    """
    Retrieve a specific ABM model by ID.
    """
    for model in ABM_MODELS:
        if model["id"] == model_id:
            return model
    raise HTTPException(status_code=404, detail="Model not found")

@router.post("/models", response_model=Dict[str, Any], status_code=status.HTTP_201_CREATED)
async def create_model(
    name: str,
    description: Optional[str] = None,
    project_id: Optional[int] = None,
    network_id: Optional[int] = None,
    simulation_type: str = "social_influence",
    attributes: Optional[Dict[str, Any]] = None,
    user: User = Depends(current_active_user)
):
    """
    Create a new ABM model.
    """
    global MODEL_ID_COUNTER
    
    # Validate simulation type
    try:
        sim_type = SimulationType(simulation_type)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Invalid simulation type. Must be one of: {', '.join([e.value for e in SimulationType])}"
        )
    
    # Create model
    model = {
        "id": MODEL_ID_COUNTER,
        "name": name,
        "description": description or f"ABM model: {name}",
        "project_id": project_id,
        "network_id": network_id,
        "user_id": user.id,
        "status": "created",
        "simulation_type": simulation_type,
        "attributes": attributes or {},
        "created_at": str(dict(hour=10, minute=30, year=2025, month=4, day=1)),
        "updated_at": str(dict(hour=10, minute=30, year=2025, month=4, day=1))
    }
    
    ABM_MODELS.append(model)
    MODEL_ID_COUNTER += 1
    
    return model

@router.put("/models/{model_id}", response_model=Dict[str, Any])
async def update_model(model_id: int, model_update: Dict[str, Any]):
    """
    Update an existing ABM model.
    """
    for i, model in enumerate(ABM_MODELS):
        if model["id"] == model_id:
            # Update model, but don't allow modifying id, created_at
            ABM_MODELS[i] = {
                **model,
                **{k: v for k, v in model_update.items() if k not in ["id", "created_at"]},
                "updated_at": str(dict(hour=10, minute=30, year=2025, month=4, day=1))
            }
            return ABM_MODELS[i]
    
    raise HTTPException(status_code=404, detail="Model not found")

@router.delete("/models/{model_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_model(model_id: int):
    """
    Delete an ABM model.
    """
    for i, model in enumerate(ABM_MODELS):
        if model["id"] == model_id:
            ABM_MODELS.pop(i)
            return
    
    raise HTTPException(status_code=404, detail="Model not found")

@router.get("/simulations", response_model=List[Dict[str, Any]])
async def get_simulations():
    """
    Retrieve all ABM simulations.
    """
    return SIMULATIONS

@router.get("/simulations/{simulation_id}", response_model=Dict[str, Any])
async def get_simulation(simulation_id: int):
    """
    Retrieve a specific ABM simulation by ID.
    """
    # First check in-memory storage
    for simulation in SIMULATIONS:
        if simulation["id"] == simulation_id:
            return simulation
    
    # If not found, try to retrieve from ABM service
    # This would happen for simulations run after server restart
    try:
        # Convert integer ID to string (service uses UUID strings)
        results = ABMSimulationService.get_simulation_results(str(simulation_id))
        
        # Convert to format expected by API
        api_results = {
            "id": simulation_id,
            "name": f"Simulation {simulation_id}",
            "model_id": 0,  # We don't know the model ID since this is from stored results
            "status": "completed",
            "parameters": results.get("parameters", {}),
            "steps_executed": results.get("steps_executed", 0),
            "results_summary": results.get("final_state", {}),
            "created_at": "",
            "updated_at": ""
        }
        
        return api_results
        
    except Exception as e:
        raise HTTPException(status_code=404, detail="Simulation not found")

@router.post("/simulations", response_model=Dict[str, Any], status_code=status.HTTP_201_CREATED)
async def create_simulation(
    model_id: int,
    name: str,
    description: Optional[str] = None,
    parameters: Dict[str, Any] = None,
    user: User = Depends(current_active_user)
):
    """
    Create a new ABM simulation.
    """
    global SIMULATION_ID_COUNTER
    
    # Find the model
    model = None
    for m in ABM_MODELS:
        if m["id"] == model_id:
            model = m
            break
    
    if not model:
        raise HTTPException(status_code=404, detail="Model not found")
    
    # Create simulation
    simulation = {
        "id": SIMULATION_ID_COUNTER,
        "name": name,
        "description": description or f"Simulation for model: {model['name']}",
        "model_id": model_id,
        "user_id": user.id,
        "status": "created",
        "parameters": parameters or {},
        "steps_executed": 0,
        "results_summary": {},
        "created_at": str(dict(hour=10, minute=30, year=2025, month=4, day=1)),
        "updated_at": str(dict(hour=10, minute=30, year=2025, month=4, day=1))
    }
    
    SIMULATIONS.append(simulation)
    SIMULATION_ID_COUNTER += 1
    
    return simulation

@router.post("/simulations/{simulation_id}/run", response_model=Dict[str, Any])
async def run_simulation(simulation_id: int, steps: Optional[int] = None):
    """
    Run an ABM simulation for the specified number of steps.
    """
    # Find the simulation
    simulation_idx = -1
    simulation = None
    for i, s in enumerate(SIMULATIONS):
        if s["id"] == simulation_id:
            simulation = s
            simulation_idx = i
            break
    
    if not simulation:
        raise HTTPException(status_code=404, detail="Simulation not found")
    
    # Find the model
    model = None
    for m in ABM_MODELS:
        if m["id"] == simulation["model_id"]:
            model = m
            break
    
    if not model:
        raise HTTPException(status_code=404, detail="Model for this simulation not found")
    
    # Create a mock network for testing
    # In a real implementation, this would use the network from the model's network_id
    mock_network = {
        "nodes": [
            {"id": f"node_{i}", "department": ["HR", "Sales", "Engineering", "Finance", "Marketing"][i % 5]}
            for i in range(50)
        ],
        "edges": [
            {"source": f"node_{i}", "target": f"node_{j}", "weight": 1.0}
            for i in range(50) for j in range(i+1, min(i+5, 50))
        ]
    }
    
    # Determine steps to run
    if not steps:
        steps = simulation["parameters"].get("time_steps", 100)
    
    try:
        # Create ABM model
        abm_model = ABMSimulationService.create_model(
            simulation_type=SimulationType(model["simulation_type"]),
            network_data=mock_network,
            parameters=simulation["parameters"]
        )
        
        # Run simulation
        str_sim_id = str(simulation_id)  # Service uses string IDs
        results = ABMSimulationService.run_simulation(
            model=abm_model,
            steps=steps,
            simulation_id=str_sim_id
        )
        
        # Update simulation status
        if simulation_idx >= 0:
            SIMULATIONS[simulation_idx]["status"] = "completed"
            SIMULATIONS[simulation_idx]["steps_executed"] = steps
            SIMULATIONS[simulation_idx]["results_summary"] = results.get("final_state", {})
            SIMULATIONS[simulation_idx]["updated_at"] = str(dict(hour=10, minute=30, year=2025, month=4, day=1))
            
            return SIMULATIONS[simulation_idx]
        
        # If simulation not in memory, return the results directly
        return {
            "id": simulation_id,
            "name": simulation["name"],
            "model_id": simulation["model_id"],
            "status": "completed",
            "steps_executed": steps,
            "results_summary": results.get("final_state", {}),
            "parameters": simulation["parameters"]
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error running simulation: {str(e)}")

@router.get("/simulations/{simulation_id}/results", response_model=Dict[str, Any])
async def get_simulation_results(simulation_id: int, detail_level: str = "summary"):
    """
    Get the results of a completed simulation.
    """
    # First check in-memory storage
    for simulation in SIMULATIONS:
        if simulation["id"] == simulation_id:
            if simulation["status"] != "completed":
                raise HTTPException(status_code=400, detail="Simulation has not been completed")
            
            # For in-memory simulations, we might not have all details
            if detail_level == "summary":
                return {
                    "simulation_id": simulation_id,
                    "name": simulation["name"],
                    "results_summary": simulation["results_summary"]
                }
            else:
                # Try to get from ABM service for full details
                pass
    
    # Try to get from ABM service
    try:
        # Convert integer ID to string (service uses UUID strings)
        results = ABMSimulationService.get_simulation_results(str(simulation_id))
        
        if detail_level == "summary":
            return {
                "simulation_id": simulation_id,
                "name": f"Simulation {simulation_id}",
                "results_summary": results.get("final_state", {})
            }
        else:
            # Return full results
            return results
            
    except Exception as e:
        raise HTTPException(status_code=404, detail="Simulation results not found")

@router.post("/parameter-sweep", response_model=Dict[str, Any])
async def parameter_sweep(
    simulation_type: str,
    parameter_ranges: Dict[str, List[float]],
    steps: int = 100,
    metric_name: str = "culture_homogeneity",
    network_id: Optional[int] = None,
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
    
    # Create a mock network for testing
    # In a real implementation, this would use the network from network_id
    mock_network = {
        "nodes": [
            {"id": f"node_{i}", "department": ["HR", "Sales", "Engineering", "Finance", "Marketing"][i % 5]}
            for i in range(50)
        ],
        "edges": [
            {"source": f"node_{i}", "target": f"node_{j}", "weight": 1.0}
            for i in range(50) for j in range(i+1, min(i+5, 50))
        ]
    }
    
    try:
        # Run parameter sweep
        results = ABMSimulationService.parameter_sweep(
            simulation_type=sim_type,
            network_data=mock_network,
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