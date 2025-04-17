import React, { useState } from 'react';
import Modal from '../../molecules/Modal';
import { Heading, Text } from '../../atoms/Typography';
import Button from '../../atoms/Button';
import Input from '../../atoms/Input';
import Select from '../../atoms/Select';
import Textarea from '../../atoms/Textarea';
import { 
  ABMModel, 
  SpaceType, 
  TheoryFramework,
  AgentAttributeDefinition,
  AgentStateVariableDefinition,
  AgentBehaviorDefinition,
  EnvironmentVariableDefinition,
  AttributeType
} from '../../../types/abm';
import { Network } from '../../../types/network';
import { useABMContext } from '../../../shared/contexts';

interface ModelCreationModalProps {
  onClose: () => void;
  onCreateModel: (model: any) => Promise<void>;
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
  
  const [model, setModel] = useState({
    name: '',
    description: '',
    simulation_type: 'social_influence' as TheoryFramework,
    network_id: undefined as number | undefined,
    agent_attributes: [
      {
        name: 'population_size',
        type: 'number' as AttributeType,
        default_value_json: 100,
        min_value: 1,
        max_value: 1000
      }
    ] as AgentAttributeDefinition[],
    agent_state_variables: [] as AgentStateVariableDefinition[],
    agent_behaviors: [] as AgentBehaviorDefinition[],
    environment_variables: [
      {
        name: 'time_steps',
        type: 'number' as AttributeType,
        default_value_json: 500,
        min_value: 1,
        max_value: 10000
      },
      {
        name: 'space_type',
        type: 'string' as AttributeType,
        default_value_json: 'network',
        options_json: ['network', 'continuous', 'grid']
      }
    ] as EnvironmentVariableDefinition[]
  });

  // Add appropriate state variables based on the theory framework
  const updateStateVariablesByTheory = (theory: TheoryFramework) => {
    const baseStateVars: AgentStateVariableDefinition[] = [];
    
    if (theory === 'social_influence') {
      baseStateVars.push({
        name: 'opinion',
        type: 'number',
        default_value_json: 0.5,
        min_value: 0,
        max_value: 1
      });
    } else if (theory === 'diffusion_of_innovations') {
      baseStateVars.push({
        name: 'adoption_status',
        type: 'boolean',
        default_value_json: false
      });
      baseStateVars.push({
        name: 'adoption_threshold',
        type: 'number',
        default_value_json: 0.3,
        min_value: 0,
        max_value: 1
      });
    } else if (theory === 'team_assembly') {
      baseStateVars.push({
        name: 'skill_level',
        type: 'number',
        default_value_json: 0.5,
        min_value: 0,
        max_value: 1
      });
      baseStateVars.push({
        name: 'team_id',
        type: 'number',
        default_value_json: -1
      });
    } else if (theory === 'organizational_learning') {
      baseStateVars.push({
        name: 'knowledge',
        type: 'number',
        default_value_json: 0.1,
        min_value: 0,
        max_value: 1
      });
    }
    
    return baseStateVars;
  };
  
  // Update environment variables based on the theory framework
  const updateEnvironmentVariablesByTheory = (theory: TheoryFramework) => {
    const baseEnvVars = [...model.environment_variables];
    
    // Filter out any previous theory-specific variables
    const genericEnvVars = baseEnvVars.filter(v => 
      v.name === 'time_steps' || v.name === 'space_type'
    );
    
    if (theory === 'social_influence') {
      return [
        ...genericEnvVars,
        {
          name: 'influence_strength',
          type: 'number' as AttributeType,
          default_value_json: 0.1,
          min_value: 0,
          max_value: 1
        },
        {
          name: 'conformity_bias',
          type: 'number' as AttributeType,
          default_value_json: 0.3,
          min_value: 0,
          max_value: 1
        }
      ];
    } else if (theory === 'diffusion_of_innovations') {
      return [
        ...genericEnvVars,
        {
          name: 'initial_adopters',
          type: 'number' as AttributeType,
          default_value_json: 0.05,
          min_value: 0,
          max_value: 1
        },
        {
          name: 'influence_decay',
          type: 'number' as AttributeType,
          default_value_json: 0.1,
          min_value: 0,
          max_value: 1
        }
      ];
    } else if (theory === 'team_assembly') {
      return [
        ...genericEnvVars,
        {
          name: 'skill_weight',
          type: 'number' as AttributeType,
          default_value_json: 0.5,
          min_value: 0,
          max_value: 1
        },
        {
          name: 'social_weight',
          type: 'number' as AttributeType,
          default_value_json: 0.5,
          min_value: 0,
          max_value: 1
        }
      ];
    } else if (theory === 'organizational_learning') {
      return [
        ...genericEnvVars,
        {
          name: 'learning_rate',
          type: 'number' as AttributeType,
          default_value_json: 0.2,
          min_value: 0,
          max_value: 1
        },
        {
          name: 'forgetting_rate',
          type: 'number' as AttributeType,
          default_value_json: 0.05,
          min_value: 0,
          max_value: 0.5
        }
      ];
    }
    
    return genericEnvVars;
  };
  
  // Update agent behaviors based on the theory framework
  const updateBehaviorsByTheory = (theory: TheoryFramework) => {
    if (theory === 'social_influence') {
      return [{
        name: 'update_opinion',
        description: 'Agents update their opinions based on their neighbors',
        parameters_json: {}
      }];
    } else if (theory === 'diffusion_of_innovations') {
      return [{
        name: 'evaluate_adoption',
        description: 'Agents decide whether to adopt an innovation',
        parameters_json: {}
      }];
    } else if (theory === 'team_assembly') {
      return [{
        name: 'join_team',
        description: 'Agents evaluate and join teams',
        parameters_json: {}
      }, {
        name: 'collaborate',
        description: 'Agents collaborate with team members',
        parameters_json: {}
      }];
    } else if (theory === 'organizational_learning') {
      return [{
        name: 'learn',
        description: 'Agents acquire new knowledge',
        parameters_json: {}
      }, {
        name: 'share_knowledge',
        description: 'Agents share knowledge with connected agents',
        parameters_json: {}
      }];
    }
    
    return [];
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setModel(prev => ({ ...prev, [name]: value }));
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
    setModel(prev => {
      const newStateVars = updateStateVariablesByTheory(value);
      const newEnvVars = updateEnvironmentVariablesByTheory(value);
      const newBehaviors = updateBehaviorsByTheory(value);
      
      return {
        ...prev,
        simulation_type: value,
        agent_state_variables: newStateVars,
        environment_variables: newEnvVars,
        agent_behaviors: newBehaviors
      };
    });
  };
  
  const handleSpaceTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value as SpaceType;
    
    setModel(prev => {
      const updatedEnvVars = prev.environment_variables.map(v => {
        if (v.name === 'space_type') {
          return {
            ...v,
            default_value_json: value
          };
        }
        return v;
      });
      
      return {
        ...prev,
        environment_variables: updatedEnvVars
      };
    });
  };
  
  const handlePopulationSizeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    
    setModel(prev => {
      const updatedAttrs = prev.agent_attributes.map(a => {
        if (a.name === 'population_size') {
          return {
            ...a,
            default_value_json: value
          };
        }
        return a;
      });
      
      return {
        ...prev,
        agent_attributes: updatedAttrs
      };
    });
  };
  
  const handleTimeStepsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    
    setModel(prev => {
      const updatedEnvVars = prev.environment_variables.map(v => {
        if (v.name === 'time_steps') {
          return {
            ...v,
            default_value_json: value
          };
        }
        return v;
      });
      
      return {
        ...prev,
        environment_variables: updatedEnvVars
      };
    });
  };

  const getSpaceType = (): SpaceType => {
    const spaceTypeVar = model.environment_variables.find(v => v.name === 'space_type');
    return (spaceTypeVar?.default_value_json as SpaceType) || 'network';
  };
  
  const getPopulationSize = (): number => {
    const popSizeAttr = model.agent_attributes.find(a => a.name === 'population_size');
    return (popSizeAttr?.default_value_json as number) || 100;
  };
  
  const getTimeSteps = (): number => {
    const timeStepsVar = model.environment_variables.find(v => v.name === 'time_steps');
    return (timeStepsVar?.default_value_json as number) || 500;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!model.name) {
      setError('Model name is required');
      return;
    }
    
    const populationSize = getPopulationSize();
    if (populationSize <= 0) {
      setError('Number of agents must be greater than 0');
      return;
    }
    
    const timeSteps = getTimeSteps();
    if (timeSteps <= 0) {
      setError('Number of time steps must be greater than 0');
      return;
    }
    
    const spaceType = getSpaceType();
    if (spaceType === 'network' && !model.network_id) {
      setError('Network selection is required for network-based models');
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
                <label htmlFor="simulation_type" className="block text-sm font-medium text-gray-700 mb-1">
                  Theoretical Framework <span className="text-red-500">*</span>
                </label>
                <Select
                  id="simulation_type"
                  name="simulation_type"
                  value={model.simulation_type}
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
                  value={getSpaceType()}
                  onChange={handleSpaceTypeChange}
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
                <label htmlFor="population_size" className="block text-sm font-medium text-gray-700 mb-1">
                  Number of Agents <span className="text-red-500">*</span>
                </label>
                <Input
                  id="population_size"
                  name="population_size"
                  type="number"
                  min="1"
                  value={getPopulationSize()}
                  onChange={handlePopulationSizeChange}
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
                  value={getTimeSteps()}
                  onChange={handleTimeStepsChange}
                  required
                />
                <Text variant="caption" className="mt-1 text-xs text-gray-500">
                  Maximum simulation duration
                </Text>
              </div>
            </div>
            
            <div>
              <label htmlFor="network_id" className="block text-sm font-medium text-gray-700 mb-1">
                Network Source {getSpaceType() === 'network' && <span className="text-red-500">*</span>}
              </label>
              <Select
                id="network_id"
                name="network_id"
                value={model.network_id?.toString() || ''}
                onChange={handleNetworkChange}
                disabled={getSpaceType() !== 'network'}
                required={getSpaceType() === 'network'}
              >
                <option value="">No network (generate synthetic)</option>
                {networks.map(network => (
                  <option key={network.id} value={network.id}>
                    {network.name}
                  </option>
                ))}
              </Select>
              <Text variant="caption" className="mt-1 text-xs text-gray-500">
                {getSpaceType() === 'network' 
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