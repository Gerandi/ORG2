import React, { useState } from 'react';
import Modal from '../../molecules/Modal';
import { Heading, Text } from '../../atoms/Typography';
import Button from '../../atoms/Button';
import Input from '../../atoms/Input';
import Select from '../../atoms/Select';
import Textarea from '../../atoms/Textarea';
import { ABMModel, SpaceType, TheoryFramework } from '../../../types/abm';
import { Network } from '../../../types/network';
import { useABMContext } from '../../../shared/contexts';

interface ModelCreationModalProps {
  onClose: () => void;
  onCreateModel: (model: Partial<ABMModel>) => Promise<void>;
  networks: Network[];
}

const ModelCreationModal: React.FC<ModelCreationModalProps> = ({
  onClose,
  onCreateModel,
  networks
}) => {
  const { theories } = useABMContext();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [model, setModel] = useState<Partial<ABMModel>>({
    name: '',
    description: '',
    status: 'created',
    attributes: {
      num_agents: 100,
      time_steps: 500,
      space_type: 'network' as SpaceType,
      theory_framework: 'social_influence' as TheoryFramework
    }
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setModel(prev => ({ ...prev, [name]: value }));
  };

  const handleAttributeChange = (name: string, value: any) => {
    setModel(prev => ({
      ...prev,
      attributes: {
        ...prev.attributes,
        [name]: value
      }
    }));
  };

  const handleNetworkChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setModel(prev => ({ 
      ...prev, 
      network_id: value ? parseInt(value, 10) : undefined 
    }));
  };
  
  const handleTheoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value as TheoryFramework;
    handleAttributeChange('theory_framework', value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!model.name) {
      setError('Model name is required');
      return;
    }
    
    if (!model.attributes?.num_agents || model.attributes.num_agents <= 0) {
      setError('Number of agents must be greater than 0');
      return;
    }
    
    if (!model.attributes?.time_steps || model.attributes.time_steps <= 0) {
      setError('Number of time steps must be greater than 0');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      await onCreateModel(model);
    } catch (err) {
      setError('Failed to create model. Please try again.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal isOpen onClose={onClose} size="lg">
      <div className="p-6">
        <Heading level={3} className="mb-4">Create New Agent-Based Model</Heading>
        
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
                <label htmlFor="theory_framework" className="block text-sm font-medium text-gray-700 mb-1">
                  Theoretical Framework <span className="text-red-500">*</span>
                </label>
                <Select
                  id="theory_framework"
                  name="theory_framework"
                  value={model.attributes?.theory_framework}
                  onChange={handleTheoryChange}
                  required
                >
                  {theories.map(theory => (
                    <option key={theory.id} value={theory.id}>
                      {theory.name}
                    </option>
                  ))}
                  {theories.length === 0 && (
                    <>
                      <option value="social_influence">Social Influence</option>
                      <option value="diffusion_of_innovations">Diffusion of Innovations</option>
                      <option value="team_assembly">Team Assembly</option>
                      <option value="organizational_learning">Organizational Learning</option>
                    </>
                  )}
                </Select>
                <Text variant="caption" className="mt-1 text-xs text-gray-500">
                  Theoretical foundation for model behaviors and assumptions
                </Text>
              </div>
              
              <div>
                <label htmlFor="space_type" className="block text-sm font-medium text-gray-700 mb-1">
                  Space Type <span className="text-red-500">*</span>
                </label>
                <Select
                  id="space_type"
                  name="space_type"
                  value={model.attributes?.space_type}
                  onChange={(e) => handleAttributeChange('space_type', e.target.value)}
                  required
                >
                  <option value="network">Network</option>
                  <option value="continuous">Continuous Space</option>
                  <option value="grid">Grid</option>
                </Select>
                <Text variant="caption" className="mt-1 text-xs text-gray-500">
                  Environment where agents interact
                </Text>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="num_agents" className="block text-sm font-medium text-gray-700 mb-1">
                  Number of Agents <span className="text-red-500">*</span>
                </label>
                <Input
                  id="num_agents"
                  name="num_agents"
                  type="number"
                  min="1"
                  value={model.attributes?.num_agents || 100}
                  onChange={(e) => handleAttributeChange('num_agents', parseInt(e.target.value))}
                  required
                />
                <Text variant="caption" className="mt-1 text-xs text-gray-500">
                  Population size for the simulation
                </Text>
              </div>
              
              <div>
                <label htmlFor="time_steps" className="block text-sm font-medium text-gray-700 mb-1">
                  Maximum Time Steps <span className="text-red-500">*</span>
                </label>
                <Input
                  id="time_steps"
                  name="time_steps"
                  type="number"
                  min="1"
                  value={model.attributes?.time_steps || 500}
                  onChange={(e) => handleAttributeChange('time_steps', parseInt(e.target.value))}
                  required
                />
                <Text variant="caption" className="mt-1 text-xs text-gray-500">
                  Maximum simulation duration
                </Text>
              </div>
            </div>
            
            <div>
              <label htmlFor="network_id" className="block text-sm font-medium text-gray-700 mb-1">
                Network Source {model.attributes?.space_type === 'network' && <span className="text-red-500">*</span>}
              </label>
              <Select
                id="network_id"
                name="network_id"
                value={model.network_id?.toString() || ''}
                onChange={handleNetworkChange}
                disabled={model.attributes?.space_type !== 'network'}
                required={model.attributes?.space_type === 'network'}
              >
                <option value="">No network (generate synthetic)</option>
                {networks.map(network => (
                  <option key={network.id} value={network.id}>
                    {network.name}
                  </option>
                ))}
              </Select>
              <Text variant="caption" className="mt-1 text-xs text-gray-500">
                {model.attributes?.space_type === 'network' 
                  ? 'Select an existing network or generate a synthetic one' 
                  : 'Network selection only applies for network-based models'}
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