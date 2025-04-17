import apiService from './api';
import { MLModel, Algorithm, FeatureImportance, PredictionResult, TrainingOptions } from '../../types/ml';

interface PrepareDataOptions {
  dataset_id: number;
  target_column: string;
  feature_columns?: string[];
  network_metrics?: string[];
  network_id?: number;
  test_size?: number;
}

interface CreateModelOptions {
  prepared_data: any;
  algorithm: string;
  hyperparameters: Record<string, any>;
  model_name: string;
  cross_validation?: number;
}

class MLService {
  private static instance: MLService;
  private readonly baseUrl = '/api/ml';
  
  private constructor() {}
  
  public static getInstance(): MLService {
    if (!MLService.instance) {
      MLService.instance = new MLService();
    }
    return MLService.instance;
  }
  
  // Get all ML models
  public async getModels(projectId?: number): Promise<MLModel[]> {
    try {
      const url = projectId ? `${this.baseUrl}/models?project_id=${projectId}` : `${this.baseUrl}/models`;
      return await apiService.get<MLModel[]>(url);
    } catch (error) {
      console.error('Error fetching ML models:', error);
      throw error;
    }
  }
  
  // Get a single ML model by ID
  public async getModel(id: number): Promise<MLModel> {
    try {
      return await apiService.get<MLModel>(`${this.baseUrl}/models/${id}`);
    } catch (error) {
      console.error(`Error fetching ML model ${id}:`, error);
      throw error;
    }
  }
  
  // Prepare data for ML model training
  public async prepareData(options: PrepareDataOptions): Promise<any> {
    try {
      const formData = new FormData();
      
      // Add required fields
      formData.append('dataset_id', String(options.dataset_id));
      formData.append('target_column', options.target_column);
      
      // Add optional fields
      if (options.feature_columns) {
        options.feature_columns.forEach(column => {
          formData.append('feature_columns', column);
        });
      }
      
      if (options.network_metrics) {
        options.network_metrics.forEach(metric => {
          formData.append('network_metrics', metric);
        });
      }
      
      if (options.network_id) {
        formData.append('network_id', String(options.network_id));
      }
      
      if (options.test_size) {
        formData.append('test_size', String(options.test_size));
      }
      
      return await apiService.post<any>(`${this.baseUrl}/prepare-data`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
    } catch (error) {
      console.error('Error preparing data for ML model:', error);
      throw error;
    }
  }
  
  // Create a new ML model
  public async createModel(options: CreateModelOptions): Promise<MLModel> {
    try {
      const formData = new FormData();
      
      // Add required fields
      formData.append('algorithm', options.algorithm);
      formData.append('hyperparameters', JSON.stringify(options.hyperparameters));
      formData.append('model_name', options.model_name);
      
      // Add optional fields
      if (options.cross_validation) {
        formData.append('cross_validation', String(options.cross_validation));
      }
      
      return await apiService.post<MLModel>(`${this.baseUrl}/models`, {
        prepared_data: options.prepared_data,
        algorithm: options.algorithm,
        hyperparameters: JSON.stringify(options.hyperparameters),
        model_name: options.model_name,
        cross_validation: options.cross_validation || 5
      });
    } catch (error) {
      console.error('Error creating ML model:', error);
      throw error;
    }
  }
  
  // Delete an ML model
  public async deleteModel(id: number): Promise<void> {
    try {
      return await apiService.delete<void>(`${this.baseUrl}/models/${id}`);
    } catch (error) {
      console.error(`Error deleting ML model ${id}:`, error);
      throw error;
    }
  }
  
  // Get feature importance for a model
  public async getFeatureImportance(id: number): Promise<FeatureImportance> {
    try {
      return await apiService.get<FeatureImportance>(`${this.baseUrl}/models/${id}/feature-importance`);
    } catch (error) {
      console.error(`Error fetching feature importance for model ${id}:`, error);
      throw error;
    }
  }
  
  // Make predictions using a model
  public async predict(id: number, inputData: any[]): Promise<PredictionResult> {
    try {
      return await apiService.post<PredictionResult>(`${this.baseUrl}/models/${id}/predict`, inputData);
    } catch (error) {
      console.error(`Error making predictions with model ${id}:`, error);
      throw error;
    }
  }
  
  // Get available ML algorithms
  public async getAlgorithms(problemType?: string): Promise<Algorithm[]> {
    try {
      const queryParam = problemType ? `?problem_type=${problemType}` : '';
      return await apiService.get<Algorithm[]>(`${this.baseUrl}/algorithms${queryParam}`);
    } catch (error) {
      console.error('Error fetching ML algorithms:', error);
      throw error;
    }
  }
  
  // Generate SHAP values for model interpretation
  public async generateShapValues(id: number, numSamples: number = 100): Promise<any> {
    try {
      return await apiService.post<any>(`${this.baseUrl}/models/${id}/shap`, { num_samples: numSamples });
    } catch (error) {
      console.error(`Error generating SHAP values for model ${id}:`, error);
      throw error;
    }
  }
  
  // Evaluate the predictive power of network features
  public async evaluateNetworkFeatures(networkId: number, datasetId: number, targetColumn: string, topK: number = 5): Promise<any> {
    try {
      return await apiService.post<any>(`${this.baseUrl}/evaluate-network-features`, {
        network_id: networkId,
        dataset_id: datasetId,
        target_column: targetColumn,
        top_k: topK
      });
    } catch (error) {
      console.error(`Error evaluating network features:`, error);
      throw error;
    }
  }
}

export const mlService = MLService.getInstance();
export default mlService;