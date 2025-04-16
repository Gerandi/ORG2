import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { MLModel, Algorithm, FeatureImportance, PredictionResult, TrainingOptions } from '../../types/ml';
import { mlService } from '../services';
import { useAuthContext } from './AuthContext';

interface MLContextProps {
  models: MLModel[];
  selectedModel: MLModel | null;
  algorithms: Algorithm[];
  featureImportance: FeatureImportance | null;
  isLoading: boolean;
  error: string | null;
  fetchModels: () => Promise<void>;
  selectModel: (id: number) => Promise<void>;
  createModel: (model: Partial<MLModel>) => Promise<void>;
  updateModel: (id: number, model: Partial<MLModel>) => Promise<void>;
  deleteModel: (id: number) => Promise<void>;
  trainModel: (id: number, options: TrainingOptions) => Promise<void>;
  fetchFeatureImportance: (id: number) => Promise<void>;
  predict: (id: number, inputData: any) => Promise<PredictionResult>;
  fetchAlgorithms: () => Promise<void>;
}

const MLContext = createContext<MLContextProps | undefined>(undefined);

export const MLProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const { isAuthenticated } = useAuthContext();
  const [models, setModels] = useState<MLModel[]>([]);
  const [selectedModel, setSelectedModel] = useState<MLModel | null>(null);
  const [algorithms, setAlgorithms] = useState<Algorithm[]>([]);
  const [featureImportance, setFeatureImportance] = useState<FeatureImportance | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  const fetchModels = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const data = await mlService.getModels();
      setModels(data);
    } catch (err) {
      setError('Failed to fetch ML models');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, []);
  
  const selectModel = useCallback(async (id: number): Promise<void> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const model = await mlService.getModel(id);
      setSelectedModel(model);
      setFeatureImportance(null);
    } catch (err) {
      setError('Failed to fetch ML model details');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, []);
  
  const createModel = useCallback(async (model: Partial<MLModel>): Promise<void> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const newModel = await mlService.createModel(model);
      setModels(prevModels => [...prevModels, newModel]);
    } catch (err) {
      setError('Failed to create ML model');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, []);
  
  const updateModel = useCallback(async (id: number, model: Partial<MLModel>): Promise<void> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const updatedModel = await mlService.updateModel(id, model);
      setModels(prevModels => prevModels.map(m => m.id === id ? updatedModel : m));
      
      if (selectedModel?.id === id) {
        setSelectedModel(updatedModel);
      }
    } catch (err) {
      setError('Failed to update ML model');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [selectedModel?.id]);
  
  const deleteModel = useCallback(async (id: number): Promise<void> => {
    setIsLoading(true);
    setError(null);
    
    try {
      await mlService.deleteModel(id);
      setModels(prevModels => prevModels.filter(m => m.id !== id));
      
      if (selectedModel?.id === id) {
        setSelectedModel(null);
        setFeatureImportance(null);
      }
    } catch (err) {
      setError('Failed to delete ML model');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [selectedModel?.id]);
  
  const trainModel = useCallback(async (id: number, options: TrainingOptions): Promise<void> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const updatedModel = await mlService.trainModel(id, options);
      setModels(prevModels => prevModels.map(m => m.id === id ? updatedModel : m));
      
      if (selectedModel?.id === id) {
        setSelectedModel(updatedModel);
      }
    } catch (err) {
      setError('Failed to train ML model');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [selectedModel?.id]);
  
  const fetchFeatureImportance = useCallback(async (id: number): Promise<void> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const importanceData = await mlService.getFeatureImportance(id);
      setFeatureImportance(importanceData);
    } catch (err) {
      setError('Failed to fetch feature importance');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, []);
  
  const predict = useCallback(async (id: number, inputData: any): Promise<PredictionResult> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await mlService.predict(id, inputData);
      return result;
    } catch (err) {
      setError('Failed to make prediction');
      console.error(err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);
  
  const fetchAlgorithms = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const data = await mlService.getAlgorithms();
      setAlgorithms(data);
    } catch (err) {
      setError('Failed to fetch algorithms');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, []);
  
  // Load models and algorithms on mount
  useEffect(() => {
    if (isAuthenticated) {
      fetchModels();
      fetchAlgorithms();
    } else {
      // Clear ML data if not authenticated
      setModels([]);
      setSelectedModel(null);
      setAlgorithms([]);
      setFeatureImportance(null);
    }
  }, [fetchModels, fetchAlgorithms, isAuthenticated]);
  
  return (
    <MLContext.Provider
      value={{
        models,
        selectedModel,
        algorithms,
        featureImportance,
        isLoading,
        error,
        fetchModels,
        selectModel,
        createModel,
        updateModel,
        deleteModel,
        trainModel,
        fetchFeatureImportance,
        predict,
        fetchAlgorithms
      }}
    >
      {children}
    </MLContext.Provider>
  );
};

export const useMLContext = (): MLContextProps => {
  const context = useContext(MLContext);
  
  if (context === undefined) {
    throw new Error('useMLContext must be used within a MLProvider');
  }
  
  return context;
};

export default MLContext;