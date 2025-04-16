import os
import json
import logging
import uuid
import numpy as np
import networkx as nx
import pandas as pd
from typing import Dict, List, Any, Optional, Tuple, Union
from datetime import datetime
import mesa
from mesa import Agent, Model
# Mesa 3.0 uses AgentSet for activation instead of RandomActivation
from mesa.space import NetworkGrid
from mesa.datacollection import DataCollector
from enum import Enum
from fastapi import HTTPException

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create simulations directory if it doesn't exist
SIMULATIONS_DIR = "simulations"
os.makedirs(SIMULATIONS_DIR, exist_ok=True)

# Define simulation types
class SimulationType(str, Enum):
    SOCIAL_INFLUENCE = "social_influence"
    DIFFUSION = "diffusion_of_innovations"
    TEAM_ASSEMBLY = "team_assembly"
    ORGANIZATIONAL_LEARNING = "organizational_learning"

# Base class for all agents
class OrgAgent(Agent):
    """Base agent class for organizational simulations."""
    
    def __init__(self, unique_id, model, attributes=None):
        super().__init__(unique_id, model)
        self.attributes = attributes or {}
        
    def step(self):
        """
        This method is called for each agent in each simulation step.
        Subclasses must implement their own behavior.
        """
        pass

# Social Influence Model
class SocialInfluenceAgent(OrgAgent):
    """Agent for social influence simulations."""
    
    def __init__(self, unique_id, model, attributes=None):
        super().__init__(unique_id, model, attributes)
        # Opinion can be any continuous value between 0 and 1
        self.opinion = attributes.get("initial_opinion", np.random.random())
        
    def step(self):
        """
        Update opinion based on the opinions of neighbors, weighted by influence
        and affected by conformity bias.
        """
        neighbors = self.model.grid.get_neighbors(self.pos, include_center=False)
        
        if not neighbors:
            return
            
        # Get opinions of neighbors
        neighbor_opinions = []
        for neighbor in neighbors:
            # Get agent at this node
            agents = self.model.grid.get_cell_list_contents([neighbor])
            if agents:
                neighbor_agent = agents[0]
                neighbor_opinions.append(neighbor_agent.opinion)
        
        if not neighbor_opinions:
            return
            
        # Calculate influence
        influence_strength = self.model.influence_strength
        conformity_bias = self.model.conformity_bias
        
        # Simple average of neighbor opinions
        average_opinion = sum(neighbor_opinions) / len(neighbor_opinions)
        
        # Update opinion with both influence and conformity bias
        # Conformity bias increases the pull toward the average
        opinion_difference = average_opinion - self.opinion
        conformity_effect = conformity_bias * opinion_difference
        
        # Final opinion update with both direct influence and conformity
        self.opinion += influence_strength * opinion_difference + conformity_effect
        
        # Ensure opinion stays within bounds
        self.opinion = max(0, min(1, self.opinion))

class SocialInfluenceModel(Model):
    """Model for simulating social influence in organizations."""
    
    def __init__(
        self, 
        G: nx.Graph, 
        influence_strength: float = 0.1, 
        conformity_bias: float = 0.3,
        initial_opinions: Dict[str, float] = None,
        random_seed: int = None
    ):
        """
        Initialize the model.
        
        Args:
            G: NetworkX graph representing the organizational structure
            influence_strength: How strongly agents are influenced (0-1)
            conformity_bias: Tendency to conform to group average (0-1)
            initial_opinions: Initial opinions of agents (node_id -> opinion value)
            random_seed: Random seed for reproducibility
        """
        super().__init__()
        self.G = G
        self.influence_strength = influence_strength
        self.conformity_bias = conformity_bias
        self.initial_opinions = initial_opinions or {}
        
        # Set random seed if provided
        if random_seed is not None:
            self.random_seed = random_seed
            np.random.seed(random_seed)
        
        # Set up the network grid
        self.grid = NetworkGrid(self.G)
        
        # In Mesa 3.0, we don't need to explicitly create a scheduler
        # as agents are managed through self.agents (AgentSet)
        
        # Create agents for each node in the network
        for node_id in self.G.nodes():
            # Get node attributes
            node_attrs = self.G.nodes[node_id]
            
            # Set initial opinion (from parameters, from node attribute, or random)
            if node_id in self.initial_opinions:
                initial_opinion = self.initial_opinions[node_id]
            elif "opinion" in node_attrs:
                initial_opinion = node_attrs["opinion"]
            else:
                initial_opinion = np.random.random()
                
            # Add to node attributes
            attributes = dict(node_attrs)
            attributes["initial_opinion"] = initial_opinion
            
            # Create agent
            a = SocialInfluenceAgent(node_id, self, attributes)
            
            # In Mesa 3.0, agents are automatically registered with the model
            # We just need to place them on the grid
            self.grid.place_agent(a, node_id)
        
        # Set up data collection
        self.datacollector = DataCollector(
            # Collect agent-level data
            agent_reporters={
                "opinion": "opinion"
            },
            # Collect model-level data
            model_reporters={
                "opinion_variance": self.get_opinion_variance,
                "opinion_mean": self.get_opinion_mean,
                "culture_homogeneity": self.get_culture_homogeneity,
                "subculture_count": self.get_subculture_count
            }
        )
    
    def step(self):
        """Run one step of the model."""
        # Collect data
        self.datacollector.collect(self)
        
        # Execute agent steps - using Mesa 3.0 AgentSet approach
        self.agents.shuffle_do("step")
    
    def get_opinion_variance(self):
        """Calculate variance of opinions."""
        opinions = [agent.opinion for agent in self.agents]
        return np.var(opinions)
    
    def get_opinion_mean(self):
        """Calculate mean opinion."""
        opinions = [agent.opinion for agent in self.agents]
        return np.mean(opinions)
    
    def get_culture_homogeneity(self):
        """
        Calculate cultural homogeneity (inverse of variance).
        1 = complete homogeneity, 0 = maximum heterogeneity
        """
        variance = self.get_opinion_variance()
        if variance > 0:
            return 1 - min(variance, 0.25) / 0.25  # Normalize, assuming max variance is 0.25
        return 1
    
    def get_subculture_count(self, threshold=0.1):
        """
        Estimate number of subcultures by clustering opinions.
        """
        opinions = [agent.opinion for agent in self.agents]
        
        # A simple approach: count the number of distinct opinion clusters
        # Sort opinions
        sorted_opinions = sorted(opinions)
        
        # Count clusters (groups separated by more than threshold)
        clusters = 1
        for i in range(1, len(sorted_opinions)):
            if sorted_opinions[i] - sorted_opinions[i-1] > threshold:
                clusters += 1
                
        return clusters

# Diffusion of Innovations Model
class DiffusionAgent(OrgAgent):
    """Agent for diffusion of innovations simulations."""
    
    def __init__(self, unique_id, model, attributes=None):
        super().__init__(unique_id, model, attributes)
        # Whether the agent has adopted the innovation
        self.adopted = attributes.get("initial_adoption", False)
        # Time step when adoption occurred (-1 if not adopted)
        self.adoption_time = -1
        # Threshold for adoption
        self.adoption_threshold = attributes.get("adoption_threshold", self.model.default_threshold)
        
    def step(self):
        """
        Decide whether to adopt the innovation based on network neighbors.
        """
        # Skip if already adopted
        if self.adopted:
            return
            
        neighbors = self.model.grid.get_neighbors(self.pos, include_center=False)
        
        if not neighbors:
            return
            
        # Count adopted neighbors
        adopted_count = 0
        total_influence = 0
        
        for neighbor in neighbors:
            # Get agent at this node
            agents = self.model.grid.get_cell_list_contents([neighbor])
            if agents:
                neighbor_agent = agents[0]
                if neighbor_agent.adopted:
                    adopted_count += 1
                    
                    # Apply influence decay based on time since adoption
                    if neighbor_agent.adoption_time >= 0:
                        # In Mesa 3.0, we need to use datacollector to determine the current step
                        current_step = self.model.datacollector._agent_records.index.get_level_values(0).max() if hasattr(self.model, 'datacollector') and hasattr(self.model.datacollector, '_agent_records') else 0
                        time_since_adoption = current_step - neighbor_agent.adoption_time
                        decay_factor = max(0, 1 - self.model.influence_decay * time_since_adoption)
                        total_influence += decay_factor
        
        # Decide whether to adopt
        if total_influence / len(neighbors) >= self.adoption_threshold:
            self.adopted = True
            self.adoption_time = self.model.schedule.time

class DiffusionModel(Model):
    """Model for simulating diffusion of innovations in organizations."""
    
    def __init__(
        self, 
        G: nx.Graph, 
        initial_adopters: float = 0.05, 
        default_threshold: float = 0.3,
        influence_decay: float = 0.1,
        seed_nodes: List[str] = None,
        random_seed: int = None
    ):
        """
        Initialize the model.
        
        Args:
            G: NetworkX graph representing the organizational structure
            initial_adopters: Proportion of initial adopters (0-1)
            default_threshold: Default threshold for adoption (0-1)
            influence_decay: Rate at which influence decays over time (0-1)
            seed_nodes: Specific nodes to seed as initial adopters
            random_seed: Random seed for reproducibility
        """
        super().__init__()
        self.G = G
        self.default_threshold = default_threshold
        self.influence_decay = influence_decay
        
        # Set random seed if provided
        if random_seed is not None:
            self.random_seed = random_seed
            np.random.seed(random_seed)
        
        # Set up the network grid
        self.grid = NetworkGrid(self.G)
        
        # In Mesa 3.0, we don't need to explicitly create a scheduler
        # as agents are managed through self.agents (AgentSet)
        
        # Determine initial adopters
        all_nodes = list(self.G.nodes())
        if seed_nodes:
            initial_adopter_nodes = seed_nodes
        else:
            num_initial = max(1, int(initial_adopters * len(all_nodes)))
            initial_adopter_nodes = np.random.choice(all_nodes, size=num_initial, replace=False)
            
        # Create agents for each node in the network
        for node_id in self.G.nodes():
            # Get node attributes
            node_attrs = self.G.nodes[node_id]
            
            # Set initial adoption status
            is_initial_adopter = node_id in initial_adopter_nodes
            
            # Add to node attributes
            attributes = dict(node_attrs)
            attributes["initial_adoption"] = is_initial_adopter
            
            # Create agent
            a = DiffusionAgent(node_id, self, attributes)
            
            # Set adoption time for initial adopters
            if is_initial_adopter:
                a.adopted = True
                a.adoption_time = 0
            
            # In Mesa 3.0, agents are automatically registered with the model
            # We just need to place them on the grid
            self.grid.place_agent(a, node_id)
        
        # Set up data collection
        self.datacollector = DataCollector(
            # Collect agent-level data
            agent_reporters={
                "adopted": "adopted",
                "adoption_time": "adoption_time"
            },
            # Collect model-level data
            model_reporters={
                "adoption_rate": self.get_adoption_rate,
                "new_adoptions": self.get_new_adoptions
            }
        )
        
        # Collect initial data
        self.datacollector.collect(self)
    
    def step(self):
        """Run one step of the model."""
        # Execute agent steps - using Mesa 3.0 AgentSet approach
        self.agents.shuffle_do("step")
        
        # Collect data
        self.datacollector.collect(self)
    
    def get_adoption_rate(self):
        """Calculate the current adoption rate."""
        adopted_count = sum(1 for agent in self.agents if agent.adopted)
        return adopted_count / len(self.agents)
    
    def get_new_adoptions(self):
        """Calculate the number of new adoptions in the current step."""
        current_step = self.datacollector._agent_records.index.get_level_values(0).max()
        return sum(1 for agent in self.agents 
                  if agent.adopted and agent.adoption_time == current_step - 1)
    
    def get_time_to_percentage(self, percentage):
        """
        Calculate the time it took to reach a certain adoption percentage.
        Returns -1 if that percentage was never reached.
        """
        target_count = int(percentage * len(self.agents))
        
        # Get adoption history from datacollector
        model_vars = self.datacollector.get_model_vars_dataframe()
        if "adoption_rate" not in model_vars:
            return -1
            
        adoption_rates = model_vars["adoption_rate"]
        
        for step, rate in enumerate(adoption_rates):
            if rate * len(self.agents) >= target_count:
                return step
                
        return -1

class ABMSimulationService:
    """Service for running and managing agent-based simulations."""
    
    @staticmethod
    def create_model(
        simulation_type: SimulationType,
        network_data: Dict[str, Any],
        parameters: Dict[str, Any]
    ) -> Union[Model, Dict[str, Any]]:
        """
        Create an agent-based model based on the simulation type.
        
        Args:
            simulation_type: Type of simulation to create
            network_data: Network data containing nodes and edges
            parameters: Parameters for the simulation
            
        Returns:
            Mesa Model instance or dict with error information
        """
        try:
            # Create NetworkX graph from network data
            G = nx.Graph()
            
            # Add nodes with attributes
            for node in network_data.get("nodes", []):
                node_id = node.pop("id")
                G.add_node(node_id, **node)
            
            # Add edges
            for edge in network_data.get("edges", []):
                source = edge.pop("source")
                target = edge.pop("target")
                
                # Handle weight if present
                if "weight" in edge:
                    weight = edge.pop("weight")
                    G.add_edge(source, target, weight=weight, **edge)
                else:
                    G.add_edge(source, target, **edge)
            
            # Create model based on simulation type
            if simulation_type == SimulationType.SOCIAL_INFLUENCE:
                # Extract parameters
                influence_strength = parameters.get("influence_strength", 0.1)
                conformity_bias = parameters.get("conformity_bias", 0.3)
                initial_opinions = parameters.get("initial_opinions", {})
                random_seed = parameters.get("random_seed", None)
                
                # Create model
                model = SocialInfluenceModel(
                    G=G,
                    influence_strength=influence_strength,
                    conformity_bias=conformity_bias,
                    initial_opinions=initial_opinions,
                    random_seed=random_seed
                )
                
                return model
                
            elif simulation_type == SimulationType.DIFFUSION:
                # Extract parameters
                initial_adopters = parameters.get("initial_adopters", 0.05)
                default_threshold = parameters.get("adoption_threshold", 0.3)
                influence_decay = parameters.get("influence_decay", 0.1)
                seed_nodes = parameters.get("seed_nodes", None)
                random_seed = parameters.get("random_seed", None)
                
                # Create model
                model = DiffusionModel(
                    G=G,
                    initial_adopters=initial_adopters,
                    default_threshold=default_threshold,
                    influence_decay=influence_decay,
                    seed_nodes=seed_nodes,
                    random_seed=random_seed
                )
                
                return model
                
            elif simulation_type == SimulationType.TEAM_ASSEMBLY:
                # For now, return a placeholder - this would be a real implementation
                return {
                    "error": "Team assembly simulation not fully implemented",
                    "simulation_type": simulation_type,
                    "node_count": G.number_of_nodes(),
                    "edge_count": G.number_of_edges()
                }
                
            elif simulation_type == SimulationType.ORGANIZATIONAL_LEARNING:
                # For now, return a placeholder - this would be a real implementation
                return {
                    "error": "Organizational learning simulation not fully implemented",
                    "simulation_type": simulation_type,
                    "node_count": G.number_of_nodes(),
                    "edge_count": G.number_of_edges()
                }
                
            else:
                return {
                    "error": f"Unsupported simulation type: {simulation_type}",
                    "node_count": G.number_of_nodes(),
                    "edge_count": G.number_of_edges()
                }
                
        except Exception as e:
            logger.error(f"Error creating model: {e}")
            return {"error": f"Error creating model: {str(e)}"}
    
    @staticmethod
    def run_simulation(
        model: Model,
        steps: int,
        simulation_id: str = None
    ) -> Dict[str, Any]:
        """
        Run a simulation for the specified number of steps.
        
        Args:
            model: Mesa Model instance
            steps: Number of steps to run
            simulation_id: Optional ID for the simulation
            
        Returns:
            Dictionary containing simulation results
        """
        try:
            # If error info was returned instead of a model
            if isinstance(model, dict) and "error" in model:
                return model
                
            # Generate simulation ID if not provided
            if not simulation_id:
                simulation_id = str(uuid.uuid4())
                
            # Create directory for this simulation
            simulation_dir = os.path.join(SIMULATIONS_DIR, simulation_id)
            os.makedirs(simulation_dir, exist_ok=True)
            
            # Run simulation
            for _ in range(steps):
                model.step()
                
            # Get simulation results
            results = {}
            
            # Get model type to determine specific results
            if isinstance(model, SocialInfluenceModel):
                # Get agent data
                agent_data = model.datacollector.get_agent_vars_dataframe()
                model_data = model.datacollector.get_model_vars_dataframe()
                
                # Calculate final state metrics
                final_opinions = [agent.opinion for agent in model.schedule.agents]
                
                # Final state summary
                results = {
                    "simulation_id": simulation_id,
                    "simulation_type": "social_influence",
                    "steps_executed": steps,
                    "final_state": {
                        "culture_homogeneity": float(model.get_culture_homogeneity()),
                        "subculture_count": int(model.get_subculture_count()),
                        "opinion_variance": float(np.var(final_opinions)),
                        "opinion_mean": float(np.mean(final_opinions))
                    },
                    "parameters": {
                        "influence_strength": model.influence_strength,
                        "conformity_bias": model.conformity_bias,
                        "node_count": model.grid.G.number_of_nodes(),
                        "edge_count": model.grid.G.number_of_edges()
                    }
                }
                
                # Save time series data
                if not model_data.empty:
                    # Convert to dict for JSON serialization
                    time_series = model_data.to_dict(orient="list")
                    
                    # Add to results
                    results["time_series"] = {
                        "opinion_variance": [float(x) for x in time_series.get("opinion_variance", [])],
                        "culture_homogeneity": [float(x) for x in time_series.get("culture_homogeneity", [])],
                        "subculture_count": [int(x) for x in time_series.get("subculture_count", [])],
                    }
                    
                    # Save convergence time (time until culture_homogeneity > 0.95)
                    homogeneity_series = time_series.get("culture_homogeneity", [])
                    for i, h in enumerate(homogeneity_series):
                        if h > 0.95:
                            results["final_state"]["convergence_time"] = i
                            break
                    else:
                        results["final_state"]["convergence_time"] = -1
                
            elif isinstance(model, DiffusionModel):
                # Get agent data
                agent_data = model.datacollector.get_agent_vars_dataframe()
                model_data = model.datacollector.get_model_vars_dataframe()
                
                # Calculate final adoption rate
                final_adoption_rate = model.get_adoption_rate()
                
                # Calculate time to reach certain adoption percentages
                time_to_50pct = model.get_time_to_percentage(0.5)
                time_to_90pct = model.get_time_to_percentage(0.9)
                
                # Final state summary
                results = {
                    "simulation_id": simulation_id,
                    "simulation_type": "diffusion_of_innovations",
                    "steps_executed": steps,
                    "final_state": {
                        "final_adoption_rate": float(final_adoption_rate),
                        "time_to_50pct": int(time_to_50pct),
                        "time_to_90pct": int(time_to_90pct)
                    },
                    "parameters": {
                        "default_threshold": model.default_threshold,
                        "influence_decay": model.influence_decay,
                        "node_count": model.grid.G.number_of_nodes(),
                        "edge_count": model.grid.G.number_of_edges()
                    }
                }
                
                # Save time series data
                if not model_data.empty:
                    # Convert to dict for JSON serialization
                    time_series = model_data.to_dict(orient="list")
                    
                    # Add to results
                    results["time_series"] = {
                        "adoption_rate": [float(x) for x in time_series.get("adoption_rate", [])],
                        "new_adoptions": [int(x) for x in time_series.get("new_adoptions", [])],
                    }
                    
                    # Determine adoption curve shape
                    adoption_rates = time_series.get("adoption_rate", [])
                    new_adoptions = time_series.get("new_adoptions", [])
                    
                    if len(new_adoptions) > 3:
                        # Look for peak in new adoptions - classic S-curve has a peak
                        peak_idx = np.argmax(new_adoptions)
                        if peak_idx > 0 and peak_idx < len(new_adoptions) - 1:
                            results["final_state"]["adoption_curve"] = "s-shaped"
                        else:
                            results["final_state"]["adoption_curve"] = "linear"
            
            else:
                # Generic results for other model types
                results = {
                    "simulation_id": simulation_id,
                    "simulation_type": model.__class__.__name__,
                    "steps_executed": steps,
                    "status": "completed",
                    "message": "Simulation completed, but specific result extraction not implemented for this model type."
                }
                
            # Save results file
            results_path = os.path.join(simulation_dir, "results.json")
            with open(results_path, "w") as f:
                json.dump(results, f)
                
            return results
                
        except Exception as e:
            logger.error(f"Error running simulation: {e}")
            return {
                "error": f"Error running simulation: {str(e)}",
                "simulation_id": simulation_id
            }
    
    @staticmethod
    def get_simulation_results(simulation_id: str) -> Dict[str, Any]:
        """
        Retrieve simulation results.
        
        Args:
            simulation_id: ID of the simulation
            
        Returns:
            Dictionary containing simulation results
        """
        try:
            # Check if simulation directory exists
            simulation_dir = os.path.join(SIMULATIONS_DIR, simulation_id)
            if not os.path.exists(simulation_dir):
                raise HTTPException(status_code=404, detail=f"Simulation {simulation_id} not found")
                
            # Load results file
            results_path = os.path.join(simulation_dir, "results.json")
            if not os.path.exists(results_path):
                raise HTTPException(status_code=404, detail=f"Results for simulation {simulation_id} not found")
                
            with open(results_path, "r") as f:
                results = json.load(f)
                
            return results
                
        except HTTPException as e:
            raise e
        except Exception as e:
            logger.error(f"Error retrieving simulation results: {e}")
            raise HTTPException(status_code=500, detail=f"Error retrieving simulation results: {str(e)}")
    
    @staticmethod
    def parameter_sweep(
        simulation_type: SimulationType,
        network_data: Dict[str, Any],
        parameter_ranges: Dict[str, List[float]],
        steps: int,
        metric_name: str
    ) -> Dict[str, Any]:
        """
        Run parameter sweep to analyze sensitivity.
        
        Args:
            simulation_type: Type of simulation to create
            network_data: Network data containing nodes and edges
            parameter_ranges: Dict mapping parameter names to list of values to test
            steps: Number of steps to run each simulation
            metric_name: Name of the metric to track
            
        Returns:
            Dictionary containing parameter sweep results
        """
        try:
            # Validate parameter ranges
            if not parameter_ranges or len(parameter_ranges) > 2:
                raise ValueError("Parameter sweep requires 1-2 parameters")
                
            # Prepare sweep results
            sweep_id = str(uuid.uuid4())
            sweep_dir = os.path.join(SIMULATIONS_DIR, f"sweep_{sweep_id}")
            os.makedirs(sweep_dir, exist_ok=True)
            
            sweep_results = {
                "sweep_id": sweep_id,
                "simulation_type": simulation_type,
                "parameters": parameter_ranges,
                "steps": steps,
                "metric": metric_name,
                "results": []
            }
            
            # Handle 1D or 2D parameter sweep
            param_names = list(parameter_ranges.keys())
            
            if len(param_names) == 1:
                # 1D parameter sweep
                param_name = param_names[0]
                param_values = parameter_ranges[param_name]
                
                for value in param_values:
                    # Create parameters for this run
                    parameters = {param_name: value}
                    
                    # Create and run model
                    model = ABMSimulationService.create_model(
                        simulation_type=simulation_type,
                        network_data=network_data,
                        parameters=parameters
                    )
                    
                    # Run simulation
                    sim_id = f"{sweep_id}_{param_name}_{value}"
                    sim_results = ABMSimulationService.run_simulation(
                        model=model,
                        steps=steps,
                        simulation_id=sim_id
                    )
                    
                    # Extract metric value
                    metric_value = None
                    if "final_state" in sim_results and metric_name in sim_results["final_state"]:
                        metric_value = sim_results["final_state"][metric_name]
                        
                    # Add to results
                    sweep_results["results"].append({
                        "parameters": {param_name: value},
                        "metric_value": metric_value,
                        "simulation_id": sim_id
                    })
                    
            elif len(param_names) == 2:
                # 2D parameter sweep
                param1, param2 = param_names
                values1 = parameter_ranges[param1]
                values2 = parameter_ranges[param2]
                
                # Create grid for visualization
                grid_values = []
                
                for val1 in values1:
                    row = []
                    for val2 in values2:
                        # Create parameters for this run
                        parameters = {param1: val1, param2: val2}
                        
                        # Create and run model
                        model = ABMSimulationService.create_model(
                            simulation_type=simulation_type,
                            network_data=network_data,
                            parameters=parameters
                        )
                        
                        # Run simulation
                        sim_id = f"{sweep_id}_{param1}_{val1}_{param2}_{val2}"
                        sim_results = ABMSimulationService.run_simulation(
                            model=model,
                            steps=steps,
                            simulation_id=sim_id
                        )
                        
                        # Extract metric value
                        metric_value = None
                        if "final_state" in sim_results and metric_name in sim_results["final_state"]:
                            metric_value = sim_results["final_state"][metric_name]
                            
                        # Add to results
                        sweep_results["results"].append({
                            "parameters": {param1: val1, param2: val2},
                            "metric_value": metric_value,
                            "simulation_id": sim_id
                        })
                        
                        # Add to grid
                        row.append(metric_value)
                        
                    grid_values.append(row)
                    
                # Add grid representation for heatmap
                sweep_results["grid"] = {
                    "x_param": param1,
                    "y_param": param2,
                    "x_values": values1,
                    "y_values": values2,
                    "values": grid_values
                }
            
            # Save sweep results
            results_path = os.path.join(sweep_dir, "sweep_results.json")
            with open(results_path, "w") as f:
                json.dump(sweep_results, f)
                
            return sweep_results
                
        except Exception as e:
            logger.error(f"Error running parameter sweep: {e}")
            return {"error": f"Error running parameter sweep: {str(e)}"}
    
    @staticmethod
    def get_theory_info() -> List[Dict[str, Any]]:
        """
        Get information about available theoretical frameworks.
        
        Returns:
            List of dictionaries containing theory information
        """
        return [
            {
                "id": "social_influence",
                "name": "Social Influence Theory",
                "description": "Models how individuals' attitudes and behaviors are influenced by others in their social network.",
                "key_parameters": [
                    {"name": "influence_strength", "type": "float", "default": 0.1, "min": 0.0, "max": 1.0, 
                     "description": "How strongly agents are influenced by their neighbors"},
                    {"name": "conformity_bias", "type": "float", "default": 0.3, "min": 0.0, "max": 1.0,
                     "description": "Tendency to conform to the group average opinion"}
                ],
                "metrics": [
                    {"name": "culture_homogeneity", "description": "Degree of opinion convergence (0-1)"},
                    {"name": "subculture_count", "description": "Number of distinct opinion clusters"},
                    {"name": "convergence_time", "description": "Time steps until culture reaches high homogeneity"}
                ],
                "references": [
                    "Friedkin, N. E. (1998). A structural theory of social influence. Cambridge University Press.",
                    "Cialdini, R. B., & Goldstein, N. J. (2004). Social influence: Compliance and conformity. Annual Review of Psychology, 55, 591-621."
                ]
            },
            {
                "id": "diffusion_of_innovations",
                "name": "Diffusion of Innovations",
                "description": "Models how new ideas, products, or practices spread through a social system.",
                "key_parameters": [
                    {"name": "initial_adopters", "type": "float", "default": 0.05, "min": 0.0, "max": 1.0,
                     "description": "Proportion of agents who start with the innovation"},
                    {"name": "adoption_threshold", "type": "float", "default": 0.3, "min": 0.0, "max": 1.0,
                     "description": "Threshold of neighbor influence needed for adoption"},
                    {"name": "influence_decay", "type": "float", "default": 0.1, "min": 0.0, "max": 1.0,
                     "description": "Rate at which influence of adopters decays over time"}
                ],
                "metrics": [
                    {"name": "final_adoption_rate", "description": "Proportion of agents who adopt the innovation"},
                    {"name": "time_to_50pct", "description": "Time steps until 50% adoption is reached"},
                    {"name": "adoption_curve", "description": "Shape of the adoption curve (s-shaped, linear, etc.)"}
                ],
                "references": [
                    "Rogers, E. M. (2003). Diffusion of innovations (5th ed.). Free Press.",
                    "Bass, F. M. (1969). A new product growth for model consumer durables. Management Science, 15(5), 215-227."
                ]
            },
            {
                "id": "team_assembly",
                "name": "Team Assembly Mechanisms",
                "description": "Models how teams form and evolve based on skill complementarity and social connections.",
                "key_parameters": [
                    {"name": "skill_weight", "type": "float", "default": 0.5, "min": 0.0, "max": 1.0,
                     "description": "Importance of skill complementarity in team formation"},
                    {"name": "social_weight", "type": "float", "default": 0.5, "min": 0.0, "max": 1.0,
                     "description": "Importance of social connections in team formation"},
                    {"name": "team_stability", "type": "float", "default": 0.7, "min": 0.0, "max": 1.0,
                     "description": "Likelihood of team members remaining in the team"}
                ],
                "metrics": [
                    {"name": "team_performance", "description": "Estimated performance of teams"},
                    {"name": "team_diversity", "description": "Skill diversity within teams"},
                    {"name": "clustering_coefficient", "description": "Degree of clustering in the team network"}
                ],
                "references": [
                    "Guimerà, R., Uzzi, B., Spiro, J., & Amaral, L. A. N. (2005). Team assembly mechanisms determine collaboration network structure and team performance. Science, 308(5722), 697-702.",
                    "Contractor, N. S., DeChurch, L. A., Carson, J., Carter, D. R., & Keegan, B. (2012). The topology of collective leadership. The Leadership Quarterly, 23(6), 994-1011."
                ]
            },
            {
                "id": "organizational_learning",
                "name": "Organizational Learning",
                "description": "Models how organizations acquire, process, and retain knowledge over time.",
                "key_parameters": [
                    {"name": "learning_rate", "type": "float", "default": 0.2, "min": 0.0, "max": 1.0,
                     "description": "Rate at which agents learn from experiences"},
                    {"name": "forgetting_rate", "type": "float", "default": 0.05, "min": 0.0, "max": 1.0,
                     "description": "Rate at which agents forget knowledge over time"},
                    {"name": "knowledge_transfer_efficiency", "type": "float", "default": 0.3, "min": 0.0, "max": 1.0,
                     "description": "Efficiency of knowledge transfer between agents"}
                ],
                "metrics": [
                    {"name": "organizational_knowledge", "description": "Total knowledge level in the organization"},
                    {"name": "knowledge_distribution", "description": "How evenly knowledge is distributed"},
                    {"name": "exploration_exploitation_ratio", "description": "Balance between exploring new knowledge and exploiting existing knowledge"}
                ],
                "references": [
                    "March, J. G. (1991). Exploration and exploitation in organizational learning. Organization Science, 2(1), 71-87.",
                    "Argote, L., & Miron-Spektor, E. (2011). Organizational learning: From experience to knowledge. Organization Science, 22(5), 1123-1137."
                ]
            }
        ]