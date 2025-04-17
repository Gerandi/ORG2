import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
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
import { abmService } from '../services';
import { useAuthContext } from './AuthContext';

interface CreateModelParams {
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

interface ABMContextProps {
  models: ABMModel[];
  selectedModel: ABMModel | null;
  simulations: Simulation[];
  selectedSimulation: Simulation | null;
  simulationResults: SimulationResults | null;
  theories: Theory[];
  isLoading: boolean;
  error: string | null;
  fetchModels: (projectId?: number) => Promise<void>;
  selectModel: (id: number) => Promise<void>;
  createModel: (model: CreateModelParams) => Promise<void>;
  updateModel: (id: number, model: Partial<ABMModel>) => Promise<void>;
  deleteModel: (id: number) => Promise<void>;
  fetchSimulations: (projectId?: number) => Promise<void>;
  selectSimulation: (id: number) => Promise<void>;
  createSimulation: (simulation: Partial<Simulation>) => Promise<void>;
  runSimulation: (id: number, steps?: number) => Promise<void>;
  fetchSimulationResults: (id: number, detailLevel?: 'summary' | 'full') => Promise<void>;
  fetchTheories: () => Promise<void>;
}

const ABMContext = createContext<ABMContextProps | undefined>(undefined);

export const ABMProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const { isAuthenticated } = useAuthContext();
  const [models, setModels] = useState<ABMModel[]>([]);
  const [selectedModel, setSelectedModel] = useState<ABMModel | null>(null);
  const [simulations, setSimulations] = useState<Simulation[]>([]);
  const [selectedSimulation, setSelectedSimulation] = useState<Simulation | null>(null);
  const [simulationResults, setSimulationResults] = useState<SimulationResults | null>(null);
  const [theories, setTheories] = useState<Theory[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  const fetchModels = useCallback(async (projectId?: number): Promise<void> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const data = await abmService.getModels(projectId);
      setModels(data);
    } catch (err) {
      setError('Failed to fetch ABM models');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, []);
  
  const selectModel = useCallback(async (id: number): Promise<void> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const model = await abmService.getModel(id);
      setSelectedModel(model);
    } catch (err) {
      setError('Failed to fetch ABM model details');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, []);
  
  const createModel = useCallback(async (modelParams: CreateModelParams): Promise<void> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const newModel = await abmService.createModel(modelParams);
      setModels(prevModels => [...prevModels, newModel]);
    } catch (err) {
      setError('Failed to create ABM model');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, []);
  
  const updateModel = useCallback(async (id: number, model: Partial<ABMModel>): Promise<void> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const updatedModel = await abmService.updateModel(id, model);
      setModels(prevModels => prevModels.map(m => m.id === id ? updatedModel : m));
      
      if (selectedModel?.id === id) {
        setSelectedModel(updatedModel);
      }
    } catch (err) {
      setError('Failed to update ABM model');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [selectedModel?.id]);
  
  const deleteModel = useCallback(async (id: number): Promise<void> => {
    setIsLoading(true);
    setError(null);
    
    try {
      await abmService.deleteModel(id);
      setModels(prevModels => prevModels.filter(m => m.id !== id));
      
      if (selectedModel?.id === id) {
        setSelectedModel(null);
      }
    } catch (err) {
      setError('Failed to delete ABM model');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [selectedModel?.id]);
  
  const fetchSimulations = useCallback(async (projectId?: number): Promise<void> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const data = await abmService.getSimulations(projectId);
      setSimulations(data);
    } catch (err) {
      setError('Failed to fetch simulations');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, []);
  
  const selectSimulation = useCallback(async (id: number): Promise<void> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const simulation = await abmService.getSimulation(id);
      setSelectedSimulation(simulation);
      setSimulationResults(null);
    } catch (err) {
      setError('Failed to fetch simulation details');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, []);
  
  const createSimulation = useCallback(async (simulation: Partial<Simulation>): Promise<void> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const newSimulation = await abmService.createSimulation(simulation);
      setSimulations(prevSimulations => [...prevSimulations, newSimulation]);
    } catch (err) {
      setError('Failed to create simulation');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, []);
  
  const runSimulation = useCallback(async (id: number, steps?: number): Promise<void> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const updatedSimulation = await abmService.runSimulation(id, steps);
      setSimulations(prevSimulations => prevSimulations.map(s => s.id === id ? updatedSimulation : s));
      
      if (selectedSimulation?.id === id) {
        setSelectedSimulation(updatedSimulation);
      }
    } catch (err) {
      setError('Failed to run simulation');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [selectedSimulation?.id]);
  
  const fetchSimulationResults = useCallback(async (id: number, detailLevel: 'summary' | 'full' = 'summary'): Promise<void> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const results = await abmService.getSimulationResults(id, detailLevel);
      setSimulationResults(results);
    } catch (err) {
      setError('Failed to fetch simulation results');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, []);
  
  const fetchTheories = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const data = await abmService.getTheories();
      setTheories(data);
    } catch (err) {
      setError('Failed to fetch theories');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, []);
  
  // Load models, simulations, and theories on mount
  useEffect(() => {
    if (isAuthenticated) {
      fetchModels();
      fetchSimulations();
      fetchTheories();
    } else {
      // Clear ABM data if not authenticated
      setModels([]);
      setSelectedModel(null);
      setSimulations([]);
      setSelectedSimulation(null);
      setSimulationResults(null);
      setTheories([]);
    }
  }, [fetchModels, fetchSimulations, fetchTheories, isAuthenticated]);
  
  return (
    <ABMContext.Provider
      value={{
        models,
        selectedModel,
        simulations,
        selectedSimulation,
        simulationResults,
        theories,
        isLoading,
        error,
        fetchModels,
        selectModel,
        createModel,
        updateModel,
        deleteModel,
        fetchSimulations,
        selectSimulation,
        createSimulation,
        runSimulation,
        fetchSimulationResults,
        fetchTheories
      }}
    >
      {children}
    </ABMContext.Provider>
  );
};

export const useABMContext = (): ABMContextProps => {
  const context = useContext(ABMContext);
  
  if (context === undefined) {
    throw new Error('useABMContext must be used within an ABMProvider');
  }
  
  return context;
};

export default ABMContext;