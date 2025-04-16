export type ModelStatus = 'created' | 'configured' | 'running' | 'error';
export type SimulationStatus = 'created' | 'running' | 'completed' | 'error';
export type SpaceType = 'network' | 'continuous' | 'grid';
export type TheoryFramework = 'social_influence' | 'diffusion_of_innovations' | 'team_assembly' | 'organizational_learning';

export interface ABMModel {
  id: number;
  name: string;
  description?: string;
  created_at: string;
  updated_at: string;
  project_id?: number;
  network_id?: number;
  status: ModelStatus;
  attributes: {
    num_agents: number;
    time_steps: number;
    space_type: SpaceType;
    theory_framework: TheoryFramework;
    [key: string]: any;
  };
}

export interface Simulation {
  id: number;
  model_id: number;
  name: string;
  description?: string;
  created_at: string;
  updated_at: string;
  status: SimulationStatus;
  parameters: Record<string, any>;
  steps_executed: number;
  results_summary?: Record<string, any>;
}

export interface SimulationResults {
  simulation_id: number;
  name: string;
  results_summary: Record<string, any>;
  time_series_data?: {
    step: number[];
    [metric: string]: number[] | string[];
  };
  agent_states?: {
    final_distribution: Record<string, number>;
    cluster_analysis?: Record<string, any>;
  };
}

export interface TheoryParameter {
  name: string;
  type: 'float' | 'int' | 'boolean' | 'string';
  default: any;
  min?: number;
  max?: number;
  description?: string;
}

export interface Theory {
  id: TheoryFramework;
  name: string;
  description: string;
  key_parameters: TheoryParameter[];
  references: string[];
}

export interface AgentDefinition {
  attributes: {
    name: string;
    type: 'string' | 'number' | 'boolean' | 'categorical';
    default?: any;
    options?: string[];
    min?: number;
    max?: number;
  }[];
  state_variables: {
    name: string;
    type: 'string' | 'number' | 'boolean' | 'categorical';
    default?: any;
    options?: string[];
    min?: number;
    max?: number;
  }[];
  behaviors: {
    name: string;
    description: string;
    parameters?: Record<string, any>;
  }[];
}

export interface EnvironmentDefinition {
  type: SpaceType;
  parameters: Record<string, any>;
  global_variables: {
    name: string;
    type: 'string' | 'number' | 'boolean' | 'categorical';
    default?: any;
  }[];
}

export interface SimulationRun {
  steps: number;
  random_seed?: number;
  collect_data?: string[];
  parameter_values: Record<string, any>;
}