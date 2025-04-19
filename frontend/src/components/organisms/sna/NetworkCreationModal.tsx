import React, { useState, useEffect } from 'react';
import { X, Network } from 'lucide-react';
import { Heading, Text } from '../../atoms/Typography';
import Button from '../../atoms/Button';
import Input from '../../atoms/Input';
import Select from '../../atoms/Select';
import { Dataset } from '../../../types/data';
import { useDataContext } from '../../../shared/contexts';

interface NetworkCreationModalProps {
  onClose: () => void;
  onCreateNetwork: (networkData: {
    name: string;
    description?: string;
    dataset_id: number;
    directed: boolean;
    weighted: boolean;
    tie_strength_definition?: string;
  }) => Promise<void>;
}

const NetworkCreationModal: React.FC<NetworkCreationModalProps> = ({ 
  onClose, 
  onCreateNetwork 
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [datasetId, setDatasetId] = useState<number | ''>('');
  const [directed, setDirected] = useState(true);
  const [weighted, setWeighted] = useState(true);
  const [tieStrengthDefinition, setTieStrengthDefinition] = useState('frequency_based');
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { datasets, fetchDatasets, isLoading: isLoadingDatasets } = useDataContext();

  // Fetch datasets on mount
  useEffect(() => {
    fetchDatasets();
  }, [fetchDatasets]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic validation
    if (!name.trim()) {
      setError('Network name is required');
      return;
    }
    
    if (datasetId === '') {
      setError('Please select a dataset');
      return;
    }
    
    setError(null);
    setIsCreating(true);
    
    try {
      await onCreateNetwork({
        name,
        description: description || undefined,
        dataset_id: Number(datasetId),
        directed,
        weighted,
        tie_strength_definition: tieStrengthDefinition
      });
      
      onClose();
    } catch (err) {
      console.error('Failed to create network:', err);
      setError('Failed to create network. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-2xl p-6">
        <div className="flex justify-between items-center mb-4">
          <Heading level={3} className="flex items-center">
            <Network className="text-purple-600 mr-2" size={24} />
            Create Network
          </Heading>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
          >
            <X size={20} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 mb-6">
            <div>
              <label htmlFor="network-name" className="block text-sm font-medium text-gray-700 mb-1">
                Network Name <span className="text-red-500">*</span>
              </label>
              <Input
                id="network-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter network name"
                fullWidth
                required
              />
            </div>
            
            <div>
              <label htmlFor="network-description" className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                id="network-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe this network (optional)"
                className="w-full p-2 border border-gray-300 rounded-md text-sm"
                rows={3}
              />
            </div>
            
            <div>
              <label htmlFor="dataset" className="block text-sm font-medium text-gray-700 mb-1">
                Source Dataset <span className="text-red-500">*</span>
              </label>
              <Select
                id="dataset"
                value={datasetId.toString()}
                onChange={(e) => setDatasetId(e.target.value ? Number(e.target.value) : '')}
                options={[
                  { value: "", label: "Select a dataset" },
                  ...datasets.map(dataset => ({
                    value: dataset.id.toString(),
                    label: `${dataset.name} (${dataset.type})`
                  }))
                ]}
                fullWidth
                disabled={isLoadingDatasets}
              />
              {isLoadingDatasets && (
                <Text variant="caption" className="text-gray-500 mt-1">
                  Loading datasets...
                </Text>
              )}
            </div>
            
            <div className="bg-gray-50 p-4 rounded-md border border-gray-200">
              <Heading level={5} className="mb-3">Network Properties</Heading>
              
              <div className="space-y-3">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="directed"
                    checked={directed}
                    onChange={(e) => setDirected(e.target.checked)}
                    className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                  />
                  <label htmlFor="directed" className="ml-2 block text-sm text-gray-700">
                    Directed Network (connections have direction)
                  </label>
                </div>
                
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="weighted"
                    checked={weighted}
                    onChange={(e) => setWeighted(e.target.checked)}
                    className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                  />
                  <label htmlFor="weighted" className="ml-2 block text-sm text-gray-700">
                    Weighted Network (connections have strength)
                  </label>
                </div>
                
                {weighted && (
                  <div className="mt-2 pl-6">
                    <label htmlFor="tie-strength" className="block text-sm font-medium text-gray-700 mb-1">
                      Tie Strength Definition
                    </label>
                    <Select
                      id="tie-strength"
                      value={tieStrengthDefinition}
                      onChange={(e) => setTieStrengthDefinition(e.target.value)}
                      options={[
                        { value: "frequency_based", label: "Frequency Based" },
                        { value: "duration_based", label: "Duration Based" },
                        { value: "multi_attribute", label: "Multi-attribute" },
                        { value: "custom", label: "Custom Definition" }
                      ]}
                      fullWidth
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-600">
              {error}
            </div>
          )}
          
          <div className="flex justify-end space-x-3">
            <Button 
              type="button" 
              variant="outline" 
              onClick={onClose}
              disabled={isCreating}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              variant="primary"
              style={{ backgroundColor: '#9333ea', borderColor: '#9333ea' }}
              isLoading={isCreating}
              disabled={isCreating}
            >
              Create Network
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NetworkCreationModal;