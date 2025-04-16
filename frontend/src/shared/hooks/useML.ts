import { useState, useCallback } from 'react';
import { useMLContext } from '../contexts/MLContext';
import { MLModel, MLAlgorithm, PreparedData, ModelPrediction } from '../../types/ml';

export const useML = () => {
  const {
    models,
    selectedModel,
    algorithms,
    preparedData,
    predictions,
    featureImportance,
    isLoading,
    error,
    fetchModels,
    fetchAlgorithms,
    selectModel,
    createModel,
    deleteModel,
    prepareData,
    trainModel,
    predictWithModel,
    getFeatureImportance
  } = useMLContext();

  const [processingState, setProcessingState] = useState<Record<string, boolean>>({});
  const [localError, setLocalError] = useState<string | null>(null);

  // Helper to set processing state for specific actions
  const setProcessing = (action: string, state: boolean) => {
    setProcessingState(prev => ({ ...prev, [action]: state }));
  };

  // Enhanced data preparation with error handling and progress tracking
  const handlePrepareData = useCallback(async (
    datasetId: number,
    targetColumn: string,
    featureColumns?: string[],
    networkMetrics?: string[],
    networkId?: number,
    testSize: number = 0.2,
    options?: { 
      onProgress?: (progress: number) => void 
    }
  ) => {
    setProcessing('prepare', true);
    setLocalError(null);
    
    try {
      // Here we could implement a polling mechanism for progress if the backend supports it
      const result = await prepareData(
        datasetId,
        targetColumn,
        featureColumns,
        networkMetrics,
        networkId,
        testSize
      );
      
      return result;
    } catch (error) {
      console.error('Error preparing data:', error);
      setLocalError('Failed to prepare data for model training');
      return null;
    } finally {
      setProcessing('prepare', false);
    }
  }, [prepareData]);

  // Enhanced model training with error handling and progress tracking
  const handleTrainModel = useCallback(async (
    preparedDataId: number,
    algorithmId: string,
    hyperparameters: Record<string, any>,
    modelName?: string,
    options?: {
      onProgress?: (progress: number) => void
    }
  ) => {
    setProcessing('train', true);
    setLocalError(null);
    
    try {
      // Here we could implement a polling mechanism for progress if the backend supports it
      const result = await trainModel(
        preparedDataId,
        algorithmId,
        hyperparameters,
        modelName
      );
      
      return result;
    } catch (error) {
      console.error('Error training model:', error);
      setLocalError('Failed to train machine learning model');
      return null;
    } finally {
      setProcessing('train', false);
    }
  }, [trainModel]);

  // Enhanced prediction with error handling
  const handlePredict = useCallback(async (
    modelId: number,
    inputData: Record<string, any>[]
  ) => {
    setProcessing('predict', true);
    setLocalError(null);
    
    try {
      const result = await predictWithModel(modelId, inputData);
      return result;
    } catch (error) {
      console.error('Error making predictions:', error);
      setLocalError('Failed to make predictions with model');
      return null;
    } finally {
      setProcessing('predict', false);
    }
  }, [predictWithModel]);

  // Function to get a human-readable description of a model's performance
  const getModelPerformanceDescription = useCallback((model: MLModel): string => {
    if (!model || !model.metrics) {
      return 'No performance data available';
    }
    
    if (model.is_classification) {
      // For classification models, show accuracy and F1 score
      const accuracy = model.metrics.accuracy ? 
        `${(model.metrics.accuracy * 100).toFixed(1)}%` : 'N/A';
      
      const f1 = model.metrics.f1 ?
        `${(model.metrics.f1 * 100).toFixed(1)}%` : 'N/A';
      
      return `Accuracy: ${accuracy}, F1 Score: ${f1}`;
    } else {
      // For regression models, show R² and RMSE
      const r2 = model.metrics.r2 ?
        `${(model.metrics.r2).toFixed(3)}` : 'N/A';
      
      const rmse = model.metrics.rmse ?
        `${(model.metrics.rmse).toFixed(3)}` : 'N/A';
      
      return `R²: ${r2}, RMSE: ${rmse}`;
    }
  }, []);

  return {
    models,
    selectedModel,
    algorithms,
    preparedData,
    predictions,
    featureImportance,
    isLoading: isLoading || Object.values(processingState).some(Boolean),
    isProcessing: processingState,
    error: error || localError,
    fetchModels,
    fetchAlgorithms,
    selectModel,
    createModel,
    deleteModel,
    prepareData: handlePrepareData,
    trainModel: handleTrainModel,
    predictWithModel: handlePredict,
    getFeatureImportance,
    getModelPerformanceDescription
  };
};

export default useML;