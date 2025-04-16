export type ModelType = 'classification' | 'regression';
export type ModelStatus = 'created' | 'trained' | 'failed';
export type AlgorithmType = 'random_forest' | 'logistic_regression' | 'linear_regression' | 'svm' | 'neural_network';

export interface MLModel {
  id: number;
  name: string;
  description?: string;
  created_at: string;
  updated_at: string;
  type: ModelType;
  algorithm: AlgorithmType;
  target_variable: string;
  project_id?: number;
  dataset_ids: number[];
  network_id?: number;
  status: ModelStatus;
  metrics?: Record<string, number>;
}

export interface Feature {
  name: string;
  importance: number;
  category: string;
}

export interface FeatureImportance {
  model_id: number;
  features: Feature[];
}

export interface AlgorithmParameter {
  name: string;
  type: 'int' | 'float' | 'categorical' | 'tuple';
  default: any;
  min?: number;
  max?: number;
  options?: string[];
  description?: string;
}

export interface Algorithm {
  id: AlgorithmType;
  name: string;
  type: ModelType[];
  description: string;
  parameters: AlgorithmParameter[];
}

export interface ClassificationPrediction {
  id: number | string;
  prediction: number | string;
  probability?: number;
}

export interface RegressionPrediction {
  id: number | string;
  prediction: number;
}

export interface PredictionResult {
  model_id: number;
  predictions: Array<ClassificationPrediction | RegressionPrediction>;
}

export interface TrainingOptions {
  train_test_split?: number;
  cross_validation?: {
    method: 'k_fold' | 'stratified_k_fold' | 'leave_one_out' | 'time_series';
    k?: number;
  };
  class_weights?: 'balanced' | 'none' | Record<string | number, number>;
  hyperparameter_tuning?: {
    enabled: boolean;
    method: 'grid_search' | 'random_search';
    parameters?: Record<string, any[]>;
    cv?: number;
  };
  algorithm_parameters?: Record<string, any>;
}