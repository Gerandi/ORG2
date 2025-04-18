import apiService from './api';
import { 
  ABMModel, 
  Simulation, 
  SimulationResults, 
  Theory,
  AgentAttributeDefinition,
  AgentStateVariableDefinition,
  AgentBehaviorDefinition,
  EnvironmentVariableDefinition
} from '../../types/abm';

interface CreateModelOptions {
  name: string;
  description?: string;
  project_id?: number;
  network_id?: number;
  simulation_type: string;
  agent_attributes?: AgentAttributeDefinition[];
  agent_state_variables?: AgentStateVariableDefinition[];
  agent_behaviors?: AgentBehaviorDefinition[];
  environment_variables?: EnvironmentVariableDefinition[];
}

interface CreateSimulationOptions {
  model_id: number;
  name: string;
  description?: string;
  parameters?: Record<string, any>;
}

interface ParameterSweepOptions {
  simulation_type: string;
  parameter_ranges: Record<string, number[]>;
  steps?: number;
  metric_name?: string;
  network_id?: number;
}

class ABMService {
  private static instance: ABMService;
  private readonly baseUrl = '/api/abm';
  
  private constructor() {}
  
  public static getInstance(): ABMService {
    if (!ABMService.instance) {
      ABMService.instance = new ABMService();
    }
    return ABMService.instance;
  }
  
  // Get all ABM models
  public async getModels(projectId?: number): Promise<ABMModel[]> {
    try {
      const url = projectId ? `${this.baseUrl}/models?project_id=${projectId}` : `${this.baseUrl}/models`;
      return await apiService.get<ABMModel[]>(url);
    } catch (error) {
      console.error('Error fetching ABM models:', error);
      throw error;
    }
  }
  
  // Get a single ABM model by ID
  public async getModel(id: number): Promise<ABMModel> {
    try {
      return await apiService.get<ABMModel>(`${this.baseUrl}/models/${id}`);
    } catch (error) {
      console.error(`Error fetching ABM model ${id}:`, error);
      throw error;
    }
  }
  
  // Create a new ABM model
  public async createModel(options: CreateModelOptions): Promise<ABMModel> {
    try {
      const payload = {
        name: options.name,
        description: options.description,
        project_id: options.project_id,
        network_id: options.network_id,
        simulation_type: options.simulation_type,
        agent_attributes: options.agent_attributes || [],
        agent_state_variables: options.agent_state_variables || [],
        agent_behaviors: options.agent_behaviors || [],
        environment_variables: options.environment_variables || []
      };
      return await apiService.post<ABMModel>(`${this.baseUrl}/models`, payload);
    } catch (error) {
      console.error('Error creating ABM model:', error);
      throw error;
    }
  }
  
  // Update an ABM model
  public async updateModel(id: number, model: Partial<ABMModel>): Promise<ABMModel> {
    try {
      return await apiService.put<ABMModel>(`${this.baseUrl}/models/${id}`, model);
    } catch (error) {
      console.error(`Error updating ABM model ${id}:`, error);
      throw error;
    }
  }
  
  // Delete an ABM model
  public async deleteModel(id: number): Promise<void> {
    try {
      return await apiService.delete<void>(`${this.baseUrl}/models/${id}`);
    } catch (error) {
      console.error(`Error deleting ABM model ${id}:`, error);
      throw error;
    }
  }
  
  // Get all simulations
  public async getSimulations(projectId?: number): Promise<Simulation[]> {
    try {
      const url = projectId ? `${this.baseUrl}/simulations?project_id=${projectId}` : `${this.baseUrl}/simulations`;
      return await apiService.get<Simulation[]>(url);
    } catch (error) {
      console.error('Error fetching simulations:', error);
      throw error;
    }
  }
  
  // Get a single simulation by ID
  public async getSimulation(id: number): Promise<Simulation> {
    try {
      return await apiService.get<Simulation>(`${this.baseUrl}/simulations/${id}`);
    } catch (error) {
      console.error(`Error fetching simulation ${id}:`, error);
      throw error;
    }
  }
  
  // Create a new simulation
  public async createSimulation(options: CreateSimulationOptions): Promise<Simulation> {
    try {
      return await apiService.post<Simulation>(`${this.baseUrl}/simulations`, options);
    } catch (error) {
      console.error('Error creating simulation:', error);
      throw error;
    }
  }
  
  // Run a simulation
  public async runSimulation(id: number, steps?: number): Promise<Simulation> {
    try {
      return await apiService.post<Simulation>(`${this.baseUrl}/simulations/${id}/run`, { steps });
    } catch (error) {
      console.error(`Error running simulation ${id}:`, error);
      throw error;
    }
  }
  
  // Get simulation results
  public async getSimulationResults(id: number, detailLevel: 'summary' | 'full' = 'summary'): Promise<SimulationResults> {
    try {
      return await apiService.get<SimulationResults>(
        `${this.baseUrl}/simulations/${id}/results?detail_level=${detailLevel}`
      );
    } catch (error) {
      console.error(`Error fetching simulation results ${id}:`, error);
      throw error;
    }
  }
  
  // Get available theoretical frameworks
  public async getTheories(): Promise<Theory[]> {
    try {
      return await apiService.get<Theory[]>(`${this.baseUrl}/theories`);
    } catch (error) {
      console.error('Error fetching theories:', error);
      throw error;
    }
  }
  
  // Run a parameter sweep to analyze model sensitivity
  public async parameterSweep(options: ParameterSweepOptions): Promise<any> {
    try {
      return await apiService.post<any>(`${this.baseUrl}/parameter-sweep`, options);
    } catch (error) {
      console.error('Error running parameter sweep:', error);
      throw error;
    }
  }
}

export const abmService = ABMService.getInstance();
export default abmService;