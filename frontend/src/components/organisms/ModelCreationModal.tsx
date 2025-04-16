import React, { useState } from 'react';
import Modal from '../molecules/Modal';
import { Heading, Text } from '../atoms/Typography';
import Button from '../atoms/Button';
import Input from '../atoms/Input';
import Select from '../atoms/Select';
import Textarea from '../atoms/Textarea';
import { MLModel, Algorithm } from '../../types/ml';
import { Dataset } from '../../types/data';
import { Network } from '../../types/network';

interface ModelCreationModalProps {
  onClose: () => void;
  onCreateModel: (model: Partial<MLModel>) => Promise<void>;
  datasets: Dataset[];
  networks: Network[];
  algorithms: Algorithm[];
}

const ModelCreationModal: React.FC<ModelCreationModalProps> = ({
  onClose,
  onCreateModel,
  datasets,
  networks,
  algorithms
}) => {
  const [model, setModel] = useState<Partial<MLModel>>({
    name: '',
    description: '',
    type: 'classification',
    algorithm: 'random_forest',
    target_variable: '',
    dataset_ids: [],
    status: 'created'
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setModel(prev => ({ ...prev, [name]: value }));
  };

  const handleDatasetChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const options = e.target.options;
    const selectedValues = [];
    
    for (let i = 0; i < options.length; i++) {
      if (options[i].selected) {
        selectedValues.push(parseInt(options[i].value, 10));
      }
    }
    
    setModel(prev => ({ ...prev, dataset_ids: selectedValues }));
  };

  const handleNetworkChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setModel(prev => ({ ...prev, network_id: value ? parseInt(value, 10) : undefined }));
  };

  const handleAlgorithmChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const algorithm = e.target.value as MLModel['algorithm'];
    
    // Get the compatible algorithm
    const selectedAlgorithm = algorithms.find(a => a.id === algorithm);
    
    // If the current model type is not compatible with the selected algorithm,
    // update the model type to the first compatible type
    if (selectedAlgorithm && !selectedAlgorithm.type.includes(model.type as any)) {
      setModel(prev => ({ 
        ...prev, 
        algorithm,
        type: selectedAlgorithm.type[0]
      }));
    } else {
      setModel(prev => ({ ...prev, algorithm }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!model.name) {
      setError('Model name is required');
      return;
    }
    
    if (!model.dataset_ids || model.dataset_ids.length === 0) {
      setError('At least one dataset must be selected');
      return;
    }
    
    if (!model.target_variable) {
      setError('Target variable is required');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      await onCreateModel(model);
      onClose();
    } catch (err) {
      setError('Failed to create model. Please try again.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  // Filter algorithms based on the selected model type
  const filteredAlgorithms = algorithms.filter(algorithm => 
    algorithm.type.includes(model.type as any)
  );

  return (
    <Modal isOpen onClose={onClose} size="lg">
      <div className="p-6">
        <Heading level={3} className="mb-4">Create New Model</Heading>
        
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-md">
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                Model Name <span className="text-red-500">*</span>
              </label>
              <Input
                id="name"
                name="name"
                value={model.name}
                onChange={handleInputChange}
                placeholder="Enter model name"
                required
              />
            </div>
            
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <Textarea
                id="description"
                name="description"
                value={model.description || ''}
                onChange={handleInputChange}
                placeholder="Describe the purpose of this model"
                rows={3}
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-1">
                  Model Type <span className="text-red-500">*</span>
                </label>
                <Select
                  id="type"
                  name="type"
                  value={model.type}
                  onChange={handleInputChange}
                  required
                >
                  <option value="classification">Classification</option>
                  <option value="regression">Regression</option>
                </Select>
              </div>
              
              <div>
                <label htmlFor="algorithm" className="block text-sm font-medium text-gray-700 mb-1">
                  Algorithm <span className="text-red-500">*</span>
                </label>
                <Select
                  id="algorithm"
                  name="algorithm"
                  value={model.algorithm}
                  onChange={handleAlgorithmChange}
                  required
                >
                  {filteredAlgorithms.map(algorithm => (
                    <option key={algorithm.id} value={algorithm.id}>
                      {algorithm.name}
                    </option>
                  ))}
                </Select>
                {filteredAlgorithms.find(a => a.id === model.algorithm)?.description && (
                  <Text variant="caption" className="mt-1 text-xs text-gray-500">
                    {filteredAlgorithms.find(a => a.id === model.algorithm)?.description}
                  </Text>
                )}
              </div>
            </div>
            
            <div>
              <label htmlFor="dataset_ids" className="block text-sm font-medium text-gray-700 mb-1">
                Datasets <span className="text-red-500">*</span>
              </label>
              <Select
                id="dataset_ids"
                name="dataset_ids"
                multiple
                value={model.dataset_ids?.map(id => id.toString())}
                onChange={handleDatasetChange}
                className="h-24"
                required
              >
                {datasets.map(dataset => (
                  <option key={dataset.id} value={dataset.id}>
                    {dataset.name} ({dataset.file_type})
                  </option>
                ))}
              </Select>
              <Text variant="caption" className="mt-1 text-xs text-gray-500">
                Hold Ctrl/Cmd to select multiple datasets
              </Text>
            </div>
            
            <div>
              <label htmlFor="network_id" className="block text-sm font-medium text-gray-700 mb-1">
                Network (Optional)
              </label>
              <Select
                id="network_id"
                name="network_id"
                value={model.network_id?.toString() || ''}
                onChange={handleNetworkChange}
              >
                <option value="">No network</option>
                {networks.map(network => (
                  <option key={network.id} value={network.id}>
                    {network.name}
                  </option>
                ))}
              </Select>
              <Text variant="caption" className="mt-1 text-xs text-gray-500">
                Include network metrics as features
              </Text>
            </div>
            
            <div>
              <label htmlFor="target_variable" className="block text-sm font-medium text-gray-700 mb-1">
                Target Variable <span className="text-red-500">*</span>
              </label>
              <Input
                id="target_variable"
                name="target_variable"
                value={model.target_variable}
                onChange={handleInputChange}
                placeholder="Column name to predict"
                required
              />
              <Text variant="caption" className="mt-1 text-xs text-gray-500">
                Enter the exact column name from your dataset to predict
              </Text>
            </div>
          </div>
          
          <div className="mt-6 flex justify-end space-x-3">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              type="submit"
              loading={isLoading}
            >
              Create Model
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  );
};

export default ModelCreationModal;