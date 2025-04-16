import React, { useState } from 'react';
import { MLModel, Algorithm, TrainingOptions } from '../../types/ml';
import Card from '../atoms/Card';
import { Heading, Text } from '../atoms/Typography';
import Button from '../atoms/Button';
import Input from '../atoms/Input';
import Select from '../atoms/Select';
import Checkbox from '../atoms/Checkbox';
import { Settings, Play, BarChart, Database, Sliders } from 'lucide-react';

interface ModelTrainingFormProps {
  model: MLModel;
  algorithms: Algorithm[];
  trainingOptions: TrainingOptions;
  onUpdateOptions: (options: Partial<TrainingOptions>) => void;
  onSubmit: (options: TrainingOptions) => Promise<void>;
  isLoading: boolean;
}

const ModelTrainingForm: React.FC<ModelTrainingFormProps> = ({
  model,
  algorithms,
  trainingOptions,
  onUpdateOptions,
  onSubmit,
  isLoading
}) => {
  const [validationError, setValidationError] = useState<string | null>(null);
  
  // Get the selected algorithm details
  const selectedAlgorithm = algorithms.find(a => a.id === model.algorithm);
  
  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target as HTMLInputElement;
    
    if (name.includes('.')) {
      // Handle nested properties
      const [parent, child] = name.split('.');
      onUpdateOptions({
        [parent]: {
          ...trainingOptions[parent as keyof TrainingOptions],
          [child]: type === 'checkbox' 
            ? (e.target as HTMLInputElement).checked 
            : type === 'number' 
              ? parseFloat(value) 
              : value
        }
      });
    } else {
      // Handle top-level properties
      onUpdateOptions({
        [name]: type === 'checkbox' 
          ? (e.target as HTMLInputElement).checked 
          : type === 'number' 
            ? parseFloat(value) 
            : value
      });
    }
  };
  
  const handleNestedInputChange = (
    parent: string,
    child: string,
    value: any
  ) => {
    onUpdateOptions({
      [parent]: {
        ...trainingOptions[parent as keyof TrainingOptions],
        [child]: value
      }
    });
  };
  
  const handleHyperparameterTuningChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const enabled = e.target.checked;
    onUpdateOptions({
      hyperparameter_tuning: {
        ...trainingOptions.hyperparameter_tuning,
        enabled
      }
    });
  };
  
  const handleAlgorithmParameterChange = (name: string, value: any) => {
    onUpdateOptions({
      algorithm_parameters: {
        ...trainingOptions.algorithm_parameters,
        [name]: value
      }
    });
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);
    
    // Basic validation
    if (!trainingOptions.train_test_split || trainingOptions.train_test_split <= 0 || trainingOptions.train_test_split >= 1) {
      setValidationError('Train/test split must be between 0 and 1');
      return;
    }
    
    if (trainingOptions.cross_validation?.method === 'k_fold' && 
        (!trainingOptions.cross_validation.k || trainingOptions.cross_validation.k < 2)) {
      setValidationError('Number of folds must be at least 2');
      return;
    }
    
    await onSubmit(trainingOptions);
  };
  
  return (
    <div className="space-y-6">
      <Card>
        <div className="flex justify-between items-center mb-4">
          <Heading level={3}>Train Model: {model.name}</Heading>
          <div>
            <span className="text-sm text-gray-500 mr-2">Type:</span>
            <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
              {model.type === 'classification' ? 'Classification' : 'Regression'}
            </span>
          </div>
        </div>
        
        {validationError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-md">
            {validationError}
          </div>
        )}
        
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Data Splitting Section */}
            <div>
              <div className="flex items-center mb-3">
                <Database size={16} className="text-blue-600 mr-2" />
                <Heading level={4}>Data Splitting</Heading>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label htmlFor="train_test_split" className="block text-sm font-medium text-gray-700 mb-1">
                    Train/Test Split Ratio
                  </label>
                  <div className="flex items-center">
                    <Input
                      id="train_test_split"
                      name="train_test_split"
                      type="range"
                      min="0.5"
                      max="0.9"
                      step="0.05"
                      value={trainingOptions.train_test_split}
                      onChange={handleInputChange}
                      className="w-full mr-2"
                    />
                    <span className="text-sm w-24">
                      {(trainingOptions.train_test_split * 100).toFixed(0)}% / {(100 - trainingOptions.train_test_split * 100).toFixed(0)}%
                    </span>
                  </div>
                </div>
                
                <div className="flex items-center">
                  <Checkbox
                    id="stratify"
                    name="stratify"
                    checked={trainingOptions.algorithm_parameters?.stratify || false}
                    onChange={(e) => handleAlgorithmParameterChange('stratify', e.target.checked)}
                  />
                  <label htmlFor="stratify" className="ml-2 block text-sm text-gray-700">
                    Stratify by target variable
                  </label>
                </div>
                
                <div>
                  <label htmlFor="random_state" className="block text-sm font-medium text-gray-700 mb-1">
                    Random State
                  </label>
                  <Input
                    id="random_state"
                    name="random_state"
                    type="number"
                    min="0"
                    value={trainingOptions.algorithm_parameters?.random_state || 42}
                    onChange={(e) => handleAlgorithmParameterChange('random_state', parseInt(e.target.value))}
                    className="w-full"
                  />
                  <Text variant="caption" className="mt-1 text-xs text-gray-500">
                    Ensures reproducible results
                  </Text>
                </div>
              </div>
            </div>
            
            {/* Cross Validation Section */}
            <div>
              <div className="flex items-center mb-3">
                <BarChart size={16} className="text-blue-600 mr-2" />
                <Heading level={4}>Cross-Validation</Heading>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label htmlFor="cv_method" className="block text-sm font-medium text-gray-700 mb-1">
                    Cross-Validation Method
                  </label>
                  <Select
                    id="cv_method"
                    name="cross_validation.method"
                    value={trainingOptions.cross_validation?.method || 'k_fold'}
                    onChange={handleInputChange}
                  >
                    <option value="k_fold">K-Fold Cross-Validation</option>
                    <option value="stratified_k_fold">Stratified K-Fold</option>
                    <option value="leave_one_out">Leave-One-Out</option>
                    <option value="time_series">Time Series Split</option>
                  </Select>
                </div>
                
                {(trainingOptions.cross_validation?.method === 'k_fold' || trainingOptions.cross_validation?.method === 'stratified_k_fold') && (
                  <div>
                    <label htmlFor="cv_k" className="block text-sm font-medium text-gray-700 mb-1">
                      Number of Folds (k)
                    </label>
                    <Input
                      id="cv_k"
                      name="cross_validation.k"
                      type="number"
                      min="2"
                      value={trainingOptions.cross_validation?.k || 5}
                      onChange={handleInputChange}
                      className="w-full"
                    />
                  </div>
                )}
                
                <div>
                  <label htmlFor="class_weights" className="block text-sm font-medium text-gray-700 mb-1">
                    Class Weights
                  </label>
                  <Select
                    id="class_weights"
                    name="class_weights"
                    value={trainingOptions.class_weights === 'balanced' ? 'balanced' : 'none'}
                    onChange={handleInputChange}
                    disabled={model.type !== 'classification'}
                  >
                    <option value="balanced">Balanced</option>
                    <option value="none">None</option>
                  </Select>
                  <Text variant="caption" className="mt-1 text-xs text-gray-500">
                    {model.type === 'classification' 
                      ? 'Handles class imbalance by adjusting weights'
                      : 'Not applicable for regression models'}
                  </Text>
                </div>
              </div>
            </div>
            
            {/* Algorithm Parameters Section */}
            <div>
              <div className="flex items-center mb-3">
                <Settings size={16} className="text-blue-600 mr-2" />
                <Heading level={4}>Algorithm Parameters</Heading>
              </div>
              
              <div className="space-y-4">
                {/* Hyperparameter Tuning */}
                <div className="p-3 border border-gray-200 rounded-md">
                  <div className="flex items-center mb-2">
                    <Checkbox
                      id="hp_tuning"
                      name="hyperparameter_tuning.enabled"
                      checked={trainingOptions.hyperparameter_tuning?.enabled || false}
                      onChange={handleHyperparameterTuningChange}
                    />
                    <label htmlFor="hp_tuning" className="ml-2 block text-sm font-medium text-gray-700">
                      Enable Hyperparameter Tuning
                    </label>
                  </div>
                  
                  {trainingOptions.hyperparameter_tuning?.enabled && (
                    <div className="space-y-3 mt-3">
                      <div>
                        <label htmlFor="hp_method" className="block text-sm font-medium text-gray-700 mb-1">
                          Tuning Method
                        </label>
                        <Select
                          id="hp_method"
                          name="hyperparameter_tuning.method"
                          value={trainingOptions.hyperparameter_tuning?.method || 'grid_search'}
                          onChange={handleInputChange}
                        >
                          <option value="grid_search">Grid Search</option>
                          <option value="random_search">Random Search</option>
                        </Select>
                      </div>
                      
                      <div>
                        <label htmlFor="hp_cv" className="block text-sm font-medium text-gray-700 mb-1">
                          CV Folds for Tuning
                        </label>
                        <Input
                          id="hp_cv"
                          name="hyperparameter_tuning.cv"
                          type="number"
                          min="2"
                          value={trainingOptions.hyperparameter_tuning?.cv || 3}
                          onChange={handleInputChange}
                          className="w-full"
                        />
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Algorithm-specific parameters */}
                {selectedAlgorithm && (
                  <div className="space-y-3">
                    <Heading level={5}>{selectedAlgorithm.name} Parameters</Heading>
                    
                    {selectedAlgorithm.parameters.map(param => {
                      const paramValue = trainingOptions.algorithm_parameters?.[param.name] ?? param.default;
                      
                      return (
                        <div key={param.name}>
                          <label 
                            htmlFor={`param_${param.name}`} 
                            className="block text-sm font-medium text-gray-700 mb-1"
                          >
                            {param.name.replace(/_/g, ' ')}
                          </label>
                          
                          {param.type === 'categorical' && (
                            <Select
                              id={`param_${param.name}`}
                              value={paramValue}
                              onChange={(e) => handleAlgorithmParameterChange(param.name, e.target.value)}
                            >
                              {param.options?.map(option => (
                                <option key={option} value={option}>
                                  {option}
                                </option>
                              ))}
                            </Select>
                          )}
                          
                          {(param.type === 'int' || param.type === 'float') && (
                            <Input
                              id={`param_${param.name}`}
                              type="number"
                              value={paramValue}
                              min={param.min}
                              max={param.max}
                              step={param.type === 'float' ? 0.01 : 1}
                              onChange={(e) => handleAlgorithmParameterChange(
                                param.name, 
                                param.type === 'int' 
                                  ? parseInt(e.target.value) 
                                  : parseFloat(e.target.value)
                              )}
                              className="w-full"
                            />
                          )}
                          
                          {param.description && (
                            <Text variant="caption" className="mt-1 text-xs text-gray-500">
                              {param.description}
                            </Text>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
          
          <div className="mt-6 flex justify-end">
            <Button
              variant="primary"
              type="submit"
              loading={isLoading}
              className="flex items-center"
            >
              <Play size={16} className="mr-1" />
              Train Model
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};

export default ModelTrainingForm;