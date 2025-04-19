import React, { useState, useEffect } from 'react';
import { Play, Settings, BarChart, Database } from 'lucide-react';
import { Heading, Text } from '../../../components/atoms/Typography';
import Card from '../../../components/atoms/Card';
import Button from '../../../components/atoms/Button';
import Input from '../../../components/atoms/Input';
import Select from '../../../components/atoms/Select';
import Checkbox from '../../../components/atoms/Checkbox';
import { Algorithm, TrainingOptions } from '../../../types/ml';

interface TrainingConfigurationPanelProps {
  selectedAlgorithm: Algorithm;
  initialOptions: TrainingOptions;
  onSubmit: (options: TrainingOptions) => void;
  onBack: () => void;
  isLoading?: boolean;
}

const TrainingConfigurationPanel: React.FC<TrainingConfigurationPanelProps> = ({
  selectedAlgorithm,
  initialOptions,
  onSubmit,
  onBack,
  isLoading = false
}) => {
  const [trainingOptions, setTrainingOptions] = useState<TrainingOptions>(initialOptions);
  const [error, setError] = useState<string | null>(null);

  // Update local state when initialOptions change
  useEffect(() => {
    setTrainingOptions(initialOptions);
  }, [initialOptions]);

  // Handle input changes for simple fields
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    // Handle nested properties (e.g., cross_validation.method)
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setTrainingOptions((prev) => ({
        ...prev,
        [parent]: {
          ...(prev[parent as keyof TrainingOptions] as object),
          [child]: value
        }
      }));
    } else {
      // Convert to number if needed
      let parsedValue: string | number = value;
      if (e.target.type === 'number' || e.target.type === 'range') {
        parsedValue = parseFloat(value);
      }
      
      setTrainingOptions((prev) => ({
        ...prev,
        [name]: parsedValue
      }));
    }
  };

  // Handle checkbox changes
  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setTrainingOptions((prev) => ({
        ...prev,
        [parent]: {
          ...(prev[parent as keyof TrainingOptions] as object),
          [child]: checked
        }
      }));
    } else {
      setTrainingOptions((prev) => ({
        ...prev,
        [name]: checked
      }));
    }
  };

  // Handle algorithm parameter changes
  const handleAlgorithmParameterChange = (name: string, value: any) => {
    setTrainingOptions((prev) => ({
      ...prev,
      algorithm_parameters: {
        ...(prev.algorithm_parameters || {}),
        [name]: value
      }
    }));
  };

  // Handle submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic validation
    if (!trainingOptions.train_test_split || trainingOptions.train_test_split <= 0 || trainingOptions.train_test_split >= 1) {
      setError('Train/Test split must be between 0 and 1');
      return;
    }
    
    if (trainingOptions.cross_validation?.method === 'k_fold' && 
        (!trainingOptions.cross_validation.k || trainingOptions.cross_validation.k < 2)) {
      setError('Number of folds must be at least 2');
      return;
    }
    
    setError(null);
    onSubmit(trainingOptions);
  };

  return (
    <Card className="pb-6">
      <div className="flex items-center mb-4">
        <Settings className="mr-2 text-blue-600" size={24} />
        <Heading level={3}>Training Configuration</Heading>
      </div>
      
      <Text variant="p" className="mb-6 text-gray-600">
        Configure training parameters for your {selectedAlgorithm.name} model.
      </Text>
      
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-3 mb-4">
          <p className="text-sm text-red-700">{error}</p>
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
                    disabled={isLoading}
                  />
                  <span className="text-sm w-24">
                    {(trainingOptions.train_test_split * 100).toFixed(0)}% / {(100 - trainingOptions.train_test_split * 100).toFixed(0)}%
                  </span>
                </div>
              </div>
              
              <div className="flex items-center">
                <Checkbox
                  id="stratify"
                  name="algorithm_parameters.stratify"
                  checked={trainingOptions.algorithm_parameters?.stratify || false}
                  onChange={handleCheckboxChange}
                  disabled={isLoading}
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
                  name="algorithm_parameters.random_state"
                  type="number"
                  min="0"
                  value={trainingOptions.algorithm_parameters?.random_state || 42}
                  onChange={handleInputChange}
                  className="w-full"
                  disabled={isLoading}
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
                  disabled={isLoading}
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
                    disabled={isLoading}
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
                  disabled={isLoading || !selectedAlgorithm.type.includes('classification')}
                >
                  <option value="balanced">Balanced</option>
                  <option value="none">None</option>
                </Select>
                <Text variant="caption" className="mt-1 text-xs text-gray-500">
                  {selectedAlgorithm.type.includes('classification') 
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
                    onChange={handleCheckboxChange}
                    disabled={isLoading}
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
                        disabled={isLoading}
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
                        disabled={isLoading}
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
                            disabled={isLoading}
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
                            disabled={isLoading}
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
        
        {/* Navigation Buttons */}
        <div className="flex justify-between pt-6">
          <Button
            variant="outline"
            onClick={onBack}
            disabled={isLoading}
          >
            Back to Model Selection
          </Button>
          <Button
            variant="primary"
            type="submit"
            loading={isLoading}
          >
            <Play size={16} className="mr-1" />
            Train Model
          </Button>
        </div>
      </form>
    </Card>
  );
};

export default TrainingConfigurationPanel;