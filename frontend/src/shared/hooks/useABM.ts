import { useState, useCallback } from 'react';
import { useABMContext } from '../contexts/ABMContext';
import { ABMModel, Simulation, SimulationResults, Theory } from '../../types/abm';

export const useABM = () => {
  const {
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
  } = useABMContext();

  const [processingState, setProcessingState] = useState<Record<string, boolean>>({});
  const [localError, setLocalError] = useState<string | null>(null);

  // Helper to set processing state for specific actions
  const setProcessing = (action: string, state: boolean) => {
    setProcessingState(prev => ({ ...prev, [action]: state }));
  };

  // Enhanced simulation running with progress tracking
  const handleRunSimulation = useCallback(async (
    id: number, 
    steps?: number,
    options?: {
      onProgress?: (progress: number) => void,
      pollInterval?: number
    }
  ) => {
    setProcessing('run', true);
    setLocalError(null);
    
    try {
      // Start the simulation
      await runSimulation(id, steps);
      
      // If progress tracking is requested, implement polling
      if (options?.onProgress && options.pollInterval) {
        let completed = false;
        let progress = 0;
        
        while (!completed && progress < 100) {
          // Wait for the specified interval
          await new Promise(resolve => setTimeout(resolve, options.pollInterval));
          
          // Fetch the current simulation state
          try {
            const simulation = await fetchSimulationResults(id);
            
            // Calculate progress based on the simulation status
            if (simulation) {
              if (simulation.status === 'completed') {
                progress = 100;
                completed = true;
              } else if (simulation.status === 'in_progress' && simulation.progress) {
                progress = simulation.progress;
              }
              
              options.onProgress(progress);
            }
          } catch (pollError) {
            console.error('Error polling simulation status:', pollError);
          }
        }
      }
      
      // Fetch the final results
      const results = await fetchSimulationResults(id);
      return results;
    } catch (error) {
      console.error('Error running simulation:', error);
      setLocalError('Failed to run simulation');
      return null;
    } finally {
      setProcessing('run', false);
    }
  }, [runSimulation, fetchSimulationResults]);

  // Enhanced model creation with validation
  const handleCreateModel = useCallback(async (model: Partial<ABMModel>) => {
    setProcessing('create', true);
    setLocalError(null);
    
    // Validate required fields
    if (!model.name || !model.simulation_type) {
      setLocalError('Model name and simulation type are required');
      setProcessing('create', false);
      return null;
    }
    
    try {
      const result = await createModel(model);
      return result;
    } catch (error) {
      console.error('Error creating ABM model:', error);
      setLocalError('Failed to create ABM model');
      return null;
    } finally {
      setProcessing('create', false);
    }
  }, [createModel]);

  // Get a theory by ID or name
  const getTheory = useCallback((idOrName: string) => {
    return theories.find(
      theory => theory.id === idOrName || theory.name.toLowerCase() === idOrName.toLowerCase()
    );
  }, [theories]);

  // Get simulation status label and color
  const getSimulationStatusInfo = useCallback((simulation: Simulation) => {
    const status = simulation.status || 'unknown';
    
    switch (status.toLowerCase()) {
      case 'completed':
        return { label: 'Completed', color: 'green' };
      case 'in_progress':
        return { label: 'Running', color: 'blue' };
      case 'pending':
        return { label: 'Pending', color: 'orange' };
      case 'failed':
        return { label: 'Failed', color: 'red' };
      default:
        return { label: 'Unknown', color: 'gray' };
    }
  }, []);

  return {
    models,
    selectedModel,
    simulations,
    selectedSimulation,
    simulationResults,
    theories,
    isLoading: isLoading || Object.values(processingState).some(Boolean),
    isProcessing: processingState,
    error: error || localError,
    fetchModels,
    selectModel,
    createModel: handleCreateModel,
    updateModel,
    deleteModel,
    fetchSimulations,
    selectSimulation,
    createSimulation,
    runSimulation: handleRunSimulation,
    fetchSimulationResults,
    fetchTheories,
    getTheory,
    getSimulationStatusInfo
  };
};

export default useABM;