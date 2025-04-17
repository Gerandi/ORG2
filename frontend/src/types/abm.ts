export type ModelStatus = 'created' | 'configured' | 'running' | 'error';
export type SimulationStatus = 'created' | 'running' | 'completed' | 'error';
export type SpaceType = 'network' | 'continuous' | 'grid';
export type TheoryFramework = 'social_influence' | 'diffusion_of_innovations' | 'team_assembly' | 'organizational_learning';
export type AttributeType = 'string' | 'number' | 'boolean' | 'categorical';

export interface AgentAttributeDefinition {
  id?: number;
  name: string;
  type: AttributeType;
  default_value_json?: any;
  min_value?: number;
  max_value?: number;
  options_json?: any[] | null;
}

export interface AgentStateVariableDefinition {
  id?: number;
  name: string;
  type: AttributeType;
  default_value_json?: any;
  min_value?: number;
  max_value?: number;
  options_json?: any[] | null;
}

export interface AgentBehaviorDefinition {
  id?: number;
  name: string;
  description?: string;
  parameters_json?: Record<string, any>;
}

export interface EnvironmentVariableDefinition {
  id?: number;
  name: string;
  type: AttributeType;
  default_value_json?: any;
  min_value?: number;
  max_value?: number;
  options_json?: any[] | null;
}

export interface ABMModel {
  id: number;
  name: string;
  description?: string;
  created_at: string;
  updated_at: string;
  project_id?: number;
  network_id?: number;
  status: ModelStatus;
  simulation_type: TheoryFramework;
  agent_attributes: AgentAttributeDefinition[];
  agent_state_variables: AgentStateVariableDefinition[];
  agent_behaviors: AgentBehaviorDefinition[];
  environment_variables: EnvironmentVariableDefinition[];
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

export interface SimulationRun {
  steps: number;
  random_seed?: number;
  collect_data?: string[];
  parameter_values: Record<string, any>;
}