import React, { useState, useEffect } from 'react';
import { Layers, Info } from 'lucide-react';
import { Heading, Text } from '../../../components/atoms/Typography';
import Card from '../../../components/atoms/Card';
import Button from '../../../components/atoms/Button';
import Input from '../../../components/atoms/Input';
import Select from '../../../components/atoms/Select';
import { Algorithm } from '../../../types/ml';

interface ModelSelectionPanelProps {
  algorithms: Algorithm[];
  preparedDataInfo: any; // From preparedDataInfo in MLContext
  onModelSelected: (algorithmId: string, modelName: string) => void;
  onBack: () => void;
  isLoading?: boolean;
}

const ModelSelectionPanel: React.FC<ModelSelectionPanelProps> = ({
  algorithms,
  preparedDataInfo,
  onModelSelected,
  onBack,
  isLoading = false
}) => {
  const [selectedAlgorithmId, setSelectedAlgorithmId] = useState<string>('');
  const [modelName, setModelName] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  // Determine problem type from prepared data info
  const problemType = preparedDataInfo?.problem_type || 'classification';

  // Filter algorithms based on problem type
  const filteredAlgorithms = algorithms.filter(
    (algorithm) => algorithm.type.includes(problemType)
  );

  // Get the selected algorithm object
  const selectedAlgorithm = algorithms.find(
    (algorithm) => algorithm.id === selectedAlgorithmId
  );

  // Initialize with a default algorithm if available
  useEffect(() => {
    if (filteredAlgorithms.length > 0 && !selectedAlgorithmId) {
      setSelectedAlgorithmId(filteredAlgorithms[0].id);
    }
  }, [filteredAlgorithms, selectedAlgorithmId]);

  // Handle algorithm selection
  const handleAlgorithmChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedAlgorithmId(e.target.value);
  };

  // Handle model name input
  const handleModelNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setModelName(e.target.value);
  };

  // Handle form submission
  const handleContinue = () => {
    // Validate inputs
    if (!modelName.trim()) {
      setError('Please enter a model name');
      return;
    }
    
    if (!selectedAlgorithmId) {
      setError('Please select an algorithm');
      return;
    }

    setError(null);
    onModelSelected(selectedAlgorithmId, modelName);
  };

  return (
    <Card className="pb-6">
      <div className="flex items-center mb-4">
        <Layers className="mr-2 text-blue-600" size={24} />
        <Heading level={3}>Model Selection</Heading>
      </div>
      
      <Text variant="p" className="mb-6 text-gray-600">
        Select an algorithm and name your model to proceed with the training process.
      </Text>
      
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-3 mb-4">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}
      
      <div className="space-y-6">
        {/* Model Name Input */}
        <div>
          <label htmlFor="modelName" className="block text-sm font-medium text-gray-700 mb-1">
            Model Name <span className="text-red-500">*</span>
          </label>
          <Input
            id="modelName"
            value={modelName}
            onChange={handleModelNameChange}
            placeholder="Enter a descriptive name for your model"
            className="w-full"
            disabled={isLoading}
          />
        </div>
        
        {/* Algorithm Selection */}
        <div>
          <label htmlFor="algorithm" className="block text-sm font-medium text-gray-700 mb-1">
            Algorithm <span className="text-red-500">*</span>
          </label>
          <div className="flex items-center">
            <Select
              id="algorithm"
              value={selectedAlgorithmId}
              onChange={handleAlgorithmChange}
              className="w-full"
              disabled={isLoading || filteredAlgorithms.length === 0}
            >
              {filteredAlgorithms.length > 0 ? (
                filteredAlgorithms.map((algorithm) => (
                  <option key={algorithm.id} value={algorithm.id}>
                    {algorithm.name}
                  </option>
                ))
              ) : (
                <option value="">No compatible algorithms</option>
              )}
            </Select>
          </div>
        </div>
        
        {/* Algorithm Description */}
        {selectedAlgorithm && (
          <div className="bg-blue-50 p-4 rounded-md border border-blue-100">
            <div className="flex items-center mb-2">
              <Info size={18} className="text-blue-500 mr-2" />
              <Text variant="p" className="font-medium text-blue-700">
                {selectedAlgorithm.name}
              </Text>
            </div>
            <Text variant="p" className="text-sm text-blue-800">
              {selectedAlgorithm.description}
            </Text>
            
            <div className="mt-3">
              <Text variant="caption" className="text-blue-700 mb-1">Default Parameters:</Text>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {selectedAlgorithm.parameters.slice(0, 4).map((param) => (
                  <div key={param.name} className="flex">
                    <Text className="text-blue-800 font-medium mr-1">{param.name}:</Text>
                    <Text className="text-blue-700">
                      {typeof param.default === 'object'
                        ? JSON.stringify(param.default)
                        : String(param.default)}
                    </Text>
                  </div>
                ))}
                {selectedAlgorithm.parameters.length > 4 && (
                  <Text className="text-blue-700">
                    and {selectedAlgorithm.parameters.length - 4} more...
                  </Text>
                )}
              </div>
            </div>
          </div>
        )}
        
        {/* Problem Type Badge */}
        <div className="flex items-center">
          <div className="px-3 py-1 bg-gray-100 rounded-full text-xs font-medium text-gray-800">
            {problemType === 'classification' ? 'Classification Problem' : 'Regression Problem'}
          </div>
        </div>
        
        {/* Navigation Buttons */}
        <div className="flex justify-between pt-4">
          <Button
            variant="outline"
            onClick={onBack}
            disabled={isLoading}
          >
            Back to Feature Engineering
          </Button>
          <Button
            variant="primary"
            onClick={handleContinue}
            loading={isLoading}
          >
            Continue to Training Configuration
          </Button>
        </div>
      </div>
    </Card>
  );
};

export default ModelSelectionPanel;