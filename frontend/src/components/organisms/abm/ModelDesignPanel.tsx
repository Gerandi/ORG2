import React, { useState, useEffect } from 'react';
import { 
  ABMModel, 
  AgentAttributeDefinition, 
  AgentStateVariableDefinition, 
  AgentBehaviorDefinition, 
  EnvironmentVariableDefinition,
  AttributeType,
  SpaceType
} from '../../../types/abm';
import { Network } from '../../../types/network';
import Card from '../../atoms/Card';
import { Heading, Text } from '../../atoms/Typography';
import Button from '../../atoms/Button';
import Select from '../../atoms/Select';
import Input from '../../atoms/Input';
import Textarea from '../../atoms/Textarea';
import { Users, Grid, Code, Settings, FileText, ArrowRight, Plus, Save } from 'lucide-react';
import { useABMContext } from '../../../shared/contexts';
import Checkbox from '../../atoms/Checkbox';

interface ModelDesignPanelProps {
  model: ABMModel | null;
  networks: Network[];
  onUpdateModel: (id: number, model: Partial<ABMModel>) => Promise<void>;
  onContinue: () => void;
}

const ModelDesignPanel: React.FC<ModelDesignPanelProps> = ({
  model,
  networks,
  onUpdateModel,
  onContinue
}) => {
  const { theories } = useABMContext();
  const [isLoading, setIsLoading] = useState(false);
  const [isCodeView, setIsCodeView] = useState(false);
  const [localModel, setLocalModel] = useState<ABMModel | null>(model);

  // Update local state when model changes from parent
  useEffect(() => {
    setLocalModel(model);
  }, [model]);

  // Get the selected theory details
  const selectedTheory = localModel ? 
    theories.find(t => t.id === localModel.simulation_type) : null;

  // Helper function to find space type in environment variables
  const getSpaceType = (): SpaceType => {
    if (!localModel) return 'network';
    const spaceTypeVar = localModel.environment_variables.find(v => v.name === 'space_type');
    return (spaceTypeVar?.default_value_json as SpaceType) || 'network';
  };
  
  // Helper function to find population size in agent attributes
  const getPopulationSize = (): number => {
    if (!localModel) return 100;
    const popSizeAttr = localModel.agent_attributes.find(a => a.name === 'population_size');
    return (popSizeAttr?.default_value_json as number) || 100;
  };
  
  // Helper function to find time steps in environment variables
  const getTimeSteps = (): number => {
    if (!localModel) return 500;
    const timeStepsVar = localModel.environment_variables.find(v => v.name === 'time_steps');
    return (timeStepsVar?.default_value_json as number) || 500;
  };

  const handleAddAttribute = () => {
    if (!localModel) return;
    
    setLocalModel(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        agent_attributes: [
          ...prev.agent_attributes,
          { 
            name: `attribute_${prev.agent_attributes.length + 1}`, 
            type: 'number' as AttributeType, 
            default_value_json: 0 
          }
        ]
      };
    });
  };

  const handleAddStateVariable = () => {
    if (!localModel) return;
    
    setLocalModel(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        agent_state_variables: [
          ...prev.agent_state_variables,
          { 
            name: `variable_${prev.agent_state_variables.length + 1}`, 
            type: 'number' as AttributeType, 
            default_value_json: 0 
          }
        ]
      };
    });
  };

  const handleAddBehavior = () => {
    if (!localModel) return;
    
    setLocalModel(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        agent_behaviors: [
          ...prev.agent_behaviors,
          { 
            name: `behavior_${prev.agent_behaviors.length + 1}`, 
            description: 'New behavior description', 
            parameters_json: {} 
          }
        ]
      };
    });
  };

  const handleAddEnvironmentVariable = () => {
    if (!localModel) return;
    
    setLocalModel(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        environment_variables: [
          ...prev.environment_variables,
          { 
            name: `env_var_${prev.environment_variables.length + 1}`, 
            type: 'number' as AttributeType, 
            default_value_json: 0 
          }
        ]
      };
    });
  };

  const handleNetworkChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setLocalModel(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        network_id: value ? parseInt(value, 10) : undefined
      };
    });
  };
  
  const handleSpaceTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value as SpaceType;
    
    setLocalModel(prev => {
      if (!prev) return prev;
      
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
  
  const handleTimeStepsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    
    setLocalModel(prev => {
      if (!prev) return prev;
      
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

  const handlePopulationSizeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    
    setLocalModel(prev => {
      if (!prev) return prev;
      
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

  const handleSaveModel = async () => {
    if (!localModel) return;
    
    setIsLoading(true);
    try {
      const updatedModel: Partial<ABMModel> = {
        status: 'configured',
        agent_attributes: localModel.agent_attributes,
        agent_state_variables: localModel.agent_state_variables,
        agent_behaviors: localModel.agent_behaviors,
        environment_variables: localModel.environment_variables,
        network_id: localModel.network_id
      };
      
      await onUpdateModel(localModel.id, updatedModel);
    } catch (error) {
      console.error("Error saving model:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!localModel) {
    return (
      <Card>
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Grid className="h-12 w-12 text-gray-300 mb-4" />
          <Heading level={4} className="mb-2 text-gray-700">No Model Selected</Heading>
          <Text variant="caption" className="text-gray-500 mb-6 max-w-md">
            Please select a model from the dropdown above or create a new model to begin.
          </Text>
        </div>
      </Card>
    );
  }
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <Heading level={3}>Model Design: {localModel.name}</Heading>
        <div className="flex space-x-2">
          <Button 
            variant="outline" 
            className="flex items-center"
            onClick={() => setIsCodeView(!isCodeView)}
          >
            <Code size={16} className="mr-1" />
            {isCodeView ? 'Visual Editor' : 'Code View'}
          </Button>
          <Button 
            variant="primary" 
            className="flex items-center"
            onClick={handleSaveModel}
            loading={isLoading}
          >
            <Save size={16} className="mr-1" />
            Save Model
          </Button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Agent Definition */}
        <Card>
          <div className="flex items-center mb-4">
            <Users size={16} className="text-orange-600 mr-2" />
            <Heading level={4}>Agent Definition</Heading>
          </div>
          
          <div className="space-y-4">
            <div className="p-3 border border-gray-200 rounded-md">
              <div className="flex items-center justify-between mb-2">
                <Text variant="p" className="font-medium">Agent Type: {localModel.simulation_type === 'team_assembly' ? 'Team Member' : 'Employee'}</Text>
                <Button variant="text" className="text-orange-600 text-xs">Edit</Button>
              </div>
              
              <div className="space-y-3">
                <div>
                  <Text variant="caption" className="text-gray-500 mb-1">Attributes</Text>
                  <div className="border border-gray-200 rounded-md max-h-48 overflow-y-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-3 py-1 text-left text-xs font-medium text-gray-500">Name</th>
                          <th className="px-3 py-1 text-left text-xs font-medium text-gray-500">Type</th>
                          <th className="px-3 py-1 text-left text-xs font-medium text-gray-500">Default</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {localModel.agent_attributes.map((attr, index) => (
                          <tr key={index} className={attr.name.includes('betweenness') ? 'bg-blue-50' : ''}>
                            <td className={`px-3 py-1 whitespace-nowrap text-xs ${attr.name.includes('betweenness') ? 'font-medium text-blue-700' : ''}`}>
                              {attr.name}
                            </td>
                            <td className="px-3 py-1 whitespace-nowrap text-xs">
                              {attr.type}
                            </td>
                            <td className="px-3 py-1 whitespace-nowrap text-xs">
                              {attr.default_value_json === true || attr.default_value_json === false 
                                ? attr.default_value_json.toString() 
                                : attr.default_value_json}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="mt-1 flex justify-end">
                    <Button 
                      variant="text" 
                      className="text-orange-600 text-xs"
                      onClick={handleAddAttribute}
                    >
                      + Add Attribute
                    </Button>
                  </div>
                </div>
                
                <div>
                  <Text variant="caption" className="text-gray-500 mb-1">State Variables</Text>
                  <div className="border border-gray-200 rounded-md max-h-48 overflow-y-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-3 py-1 text-left text-xs font-medium text-gray-500">Name</th>
                          <th className="px-3 py-1 text-left text-xs font-medium text-gray-500">Type</th>
                          <th className="px-3 py-1 text-left text-xs font-medium text-gray-500">Default</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {localModel.agent_state_variables.map((variable, index) => (
                          <tr key={index}>
                            <td className="px-3 py-1 whitespace-nowrap text-xs">
                              {variable.name}
                            </td>
                            <td className="px-3 py-1 whitespace-nowrap text-xs">
                              {variable.type}
                            </td>
                            <td className="px-3 py-1 whitespace-nowrap text-xs">
                              {variable.default_value_json === true || variable.default_value_json === false
                                ? variable.default_value_json.toString() 
                                : variable.default_value_json}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="mt-1 flex justify-end">
                    <Button 
                      variant="text" 
                      className="text-orange-600 text-xs"
                      onClick={handleAddStateVariable}
                    >
                      + Add State Variable
                    </Button>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="p-3 border border-gray-200 rounded-md">
              <div className="flex items-center justify-between mb-2">
                <Text variant="p" className="font-medium">Agent Initialization</Text>
              </div>
              
              <div className="space-y-3">
                <div>
                  <Text variant="caption" className="text-gray-500 mb-1">Population Size</Text>
                  <Input 
                    type="number" 
                    min="1"
                    value={getPopulationSize()}
                    onChange={handlePopulationSizeChange}
                  />
                </div>
                
                <div>
                  <Text variant="caption" className="text-gray-500 mb-1">Initialization Method</Text>
                  <Select defaultValue="import">
                    <option value="random">Random distribution</option>
                    <option value="import">Import from data</option>
                    <option value="custom">Custom function</option>
                  </Select>
                </div>
                
                <div>
                  <Text variant="caption" className="text-gray-500 mb-1">Data Source</Text>
                  <Select defaultValue="">
                    <option value="">Select a data source</option>
                    <option value="employee_metrics">Employee Performance Metrics (XLSX)</option>
                    <option value="communication_network">Employee Communication Network</option>
                  </Select>
                  {localModel.network_id && (
                    <Text variant="caption" className="mt-1 text-xs text-green-600 flex items-center">
                      <span className="mr-1">✓</span>
                      Network metrics will be imported as agent attributes
                    </Text>
                  )}
                </div>
              </div>
            </div>
          </div>
        </Card>
        
        {/* Behavior Rules */}
        <Card>
          <div className="flex items-center mb-4">
            <Code size={16} className="text-orange-600 mr-2" />
            <Heading level={4}>Behavior Rules</Heading>
          </div>
          
          <div className="space-y-4">
            {localModel.agent_behaviors.map((behavior, index) => (
              <div key={index} className="p-3 border border-gray-200 rounded-md">
                <div className="flex items-center justify-between mb-2">
                  <Text variant="p" className="font-medium">Rule: {behavior.name}</Text>
                  <Button variant="text" className="text-orange-600 text-xs">Edit</Button>
                </div>
                
                <Text variant="p" className="text-xs text-gray-600 mb-2">
                  {behavior.description}
                </Text>
                
                <div className="bg-gray-50 p-2 rounded border border-gray-200 text-xs font-mono overflow-x-auto">
                  <pre>
                    {behavior.name === 'update_opinion' ? 
                    `def update_opinion(agent, neighbors):
    if not neighbors:
        return
        
    # Get opinions of neighbors
    neighbor_opinions = []
    for neighbor in neighbors:
        neighbor_opinions.append(neighbor.opinion)
        
    if not neighbor_opinions:
        return
        
    # Calculate influence
    influence_strength = model.influence_strength
    conformity_bias = model.conformity_bias
    
    # Simple average of neighbor opinions
    average_opinion = sum(neighbor_opinions) / len(neighbor_opinions)
    
    # Update opinion with influence and conformity bias
    opinion_difference = average_opinion - agent.opinion
    conformity_effect = conformity_bias * opinion_difference
    
    # Final opinion update
    agent.opinion += influence_strength * opinion_difference + conformity_effect
    
    # Ensure opinion stays within bounds
    agent.opinion = max(0, min(1, agent.opinion))` :
                    
                    behavior.name === 'evaluate_adoption' ?
                    `def evaluate_adoption(agent, neighbors):
    if agent.adoption_status:
        return  # Already adopted
        
    # Count adopters in network neighborhood
    adopter_count = sum(1 for n in neighbors 
                     if n.adoption_status)
                     
    # Check if threshold is exceeded
    if adopter_count / max(1, len(neighbors)) > agent.adoption_threshold:
        agent.adoption_status = True
        agent.adoption_time = model.schedule.time` :
                      
                    `def ${behavior.name}(agent, neighbors):
    # Implement behavior logic here
    pass`}
                  </pre>
                </div>
                
                {behavior.name.includes('opinion') && (
                  <div className="mt-2 text-xs">
                    <div className="flex items-center">
                      <FileText size={12} className="mr-1 text-orange-600" />
                      <span className="text-orange-600">Based on Social Influence Theory</span>
                    </div>
                  </div>
                )}
                
                {behavior.name.includes('adoption') && (
                  <div className="mt-2 text-xs">
                    <div className="flex items-center">
                      <FileText size={12} className="mr-1 text-orange-600" />
                      <span className="text-orange-600">Based on Diffusion of Innovation Theory</span>
                    </div>
                  </div>
                )}
              </div>
            ))}
            
            <div className="mt-2 flex justify-center">
              <Button 
                variant="primary" 
                className="flex items-center"
                onClick={handleAddBehavior}
              >
                <Plus size={16} className="mr-1" />
                Add Behavior Rule
              </Button>
            </div>
          </div>
        </Card>
        
        {/* Environment & Interaction */}
        <Card>
          <div className="flex items-center mb-4">
            <Grid size={16} className="text-orange-600 mr-2" />
            <Heading level={4}>Environment & Interaction</Heading>
          </div>
          
          <div className="space-y-4">
            <div className="p-3 border border-gray-200 rounded-md">
              <div className="flex items-center justify-between mb-2">
                <Text variant="p" className="font-medium">Network Topology</Text>
              </div>
              
              <div className="space-y-3">
                <div>
                  <Text variant="caption" className="text-gray-500 mb-1">Space Type</Text>
                  <Select
                    value={getSpaceType()}
                    onChange={handleSpaceTypeChange}
                  >
                    <option value="network">Network</option>
                    <option value="continuous">Continuous Space</option>
                    <option value="grid">Grid</option>
                  </Select>
                </div>
                
                <div>
                  <Text variant="caption" className="text-gray-500 mb-1">Network Source</Text>
                  <Select
                    value={localModel.network_id?.toString() || ''}
                    onChange={handleNetworkChange}
                    disabled={getSpaceType() !== 'network'}
                  >
                    <option value="">Select a network</option>
                    {networks.map(network => (
                      <option key={network.id} value={network.id}>
                        {network.name}
                      </option>
                    ))}
                  </Select>
                </div>
                
                <div className="flex items-center">
                  <Checkbox
                    id="dynamic-network"
                    checked={false}
                    onChange={(e) => {
                      // This would typically update some environment variable
                    }}
                  />
                  <label htmlFor="dynamic-network" className="ml-2 text-sm">
                    Dynamic network (evolves during simulation)
                  </label>
                </div>
              </div>
            </div>
            
            <div className="p-3 border border-gray-200 rounded-md">
              <div className="flex items-center justify-between mb-2">
                <Text variant="p" className="font-medium">Environmental Variables</Text>
              </div>
              
              <div className="space-y-3">
                <div className="border border-gray-200 rounded-md max-h-48 overflow-y-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-1 text-left text-xs font-medium text-gray-500">Name</th>
                        <th className="px-3 py-1 text-left text-xs font-medium text-gray-500">Type</th>
                        <th className="px-3 py-1 text-left text-xs font-medium text-gray-500">Value</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {localModel.environment_variables.map((variable, index) => (
                        <tr key={index}>
                          <td className="px-3 py-1 whitespace-nowrap text-xs">
                            {variable.name}
                          </td>
                          <td className="px-3 py-1 whitespace-nowrap text-xs">
                            {variable.type}
                          </td>
                          <td className="px-3 py-1 whitespace-nowrap text-xs">
                            {variable.default_value_json === true || variable.default_value_json === false 
                              ? variable.default_value_json.toString() 
                              : variable.default_value_json}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="mt-1 flex justify-end">
                  <Button 
                    variant="text" 
                    className="text-orange-600 text-xs"
                    onClick={handleAddEnvironmentVariable}
                  >
                    + Add Variable
                  </Button>
                </div>
              </div>
            </div>
            
            <div className="p-3 border border-gray-200 rounded-md">
              <div className="flex items-center justify-between mb-2">
                <Text variant="p" className="font-medium">Time & Scheduling</Text>
              </div>
              
              <div className="space-y-3">
                <div>
                  <Text variant="caption" className="text-gray-500 mb-1">Step Definition</Text>
                  <Select defaultValue="async_random">
                    <option value="sync">Synchronous (all agents act simultaneously)</option>
                    <option value="async_random">Asynchronous (random order)</option>
                    <option value="async_priority">Asynchronous (priority-based)</option>
                  </Select>
                </div>
                
                <div>
                  <Text variant="caption" className="text-gray-500 mb-1">Maximum Steps</Text>
                  <Input 
                    type="number"
                    min="1"
                    value={getTimeSteps()}
                    onChange={handleTimeStepsChange}
                  />
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>
      
      <Card>
        <Heading level={3} className="mb-3">Theoretical Grounding</Heading>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-3 border border-gray-200 rounded-md bg-gray-50">
            <Text variant="p" className="font-medium text-sm mb-2">Research Question</Text>
            <Text variant="p" className="text-sm text-gray-600">
              {localModel.simulation_type === 'social_influence' ? 
                "How does organizational network structure influence the spread of opinions and conformity in organizations?" :
               localModel.simulation_type === 'diffusion_of_innovations' ?
                "How do innovations diffuse through an organizational network?" :
               localModel.simulation_type === 'team_assembly' ?
                "What team assembly mechanisms optimize team performance?" :
                "How does organizational network structure influence knowledge sharing within an organization?"}
            </Text>
            
            <div className="mt-3">
              <Text variant="p" className="text-xs font-medium text-gray-700 mb-1">Related OB Theories:</Text>
              <div className="flex flex-wrap gap-2">
                <span className="px-2 py-0.5 bg-orange-100 text-orange-800 rounded-full text-xs">
                  {selectedTheory?.name || localModel.simulation_type}
                </span>
                <span className="px-2 py-0.5 bg-orange-100 text-orange-800 rounded-full text-xs">
                  Social Network Theory
                </span>
                <span className="px-2 py-0.5 bg-orange-100 text-orange-800 rounded-full text-xs">
                  {localModel.simulation_type === 'social_influence' ? 'Group Dynamics' : 
                   localModel.simulation_type === 'diffusion_of_innovations' ? 'Innovation Theory' :
                   localModel.simulation_type === 'team_assembly' ? 'Team Formation Theory' : 
                   'Organizational Learning'}
                </span>
              </div>
            </div>
          </div>
          
          <div className="p-3 border border-gray-200 rounded-md bg-gray-50">
            <Text variant="p" className="font-medium text-sm mb-2">Model Parameters Grounding</Text>
            <div className="space-y-2 text-sm text-gray-600">
              <div className="flex items-start">
                <div className="w-28 text-xs font-medium text-gray-700">
                  {localModel.simulation_type === 'social_influence' ? 'Opinion Dynamics:' :
                   localModel.simulation_type === 'diffusion_of_innovations' ? 'Adoption Process:' :
                   localModel.simulation_type === 'team_assembly' ? 'Team Formation:' : 
                   'Knowledge Transfer:'}
                </div>
                <div className="flex-1 text-xs">
                  {localModel.simulation_type === 'social_influence' ? 
                    'Based on models of opinion formation in social networks (Friedkin & Johnsen, 2011)' :
                   localModel.simulation_type === 'diffusion_of_innovations' ?
                    "Based on Rogers' Diffusion of Innovations framework (Rogers, 2003)" :
                   localModel.simulation_type === 'team_assembly' ?
                    'Based on team assembly mechanisms in collaborative networks (Guimerà et al., 2005)' :
                    'Based on empirical studies of knowledge transfer in organizations (Argote & Ingram, 2000)'}
                </div>
              </div>
              <div className="flex items-start">
                <div className="w-28 text-xs font-medium text-gray-700">Parameter Values:</div>
                <div className="flex-1 text-xs">
                  Calibrated using empirical findings from organizational behavior research
                </div>
              </div>
              <div className="flex items-start">
                <div className="w-28 text-xs font-medium text-gray-700">Network Structure:</div>
                <div className="flex-1 text-xs">
                  {localModel.network_id ? 'Imported directly from empirical communication network data' : 'Synthetically generated based on organizational network literature'}
                </div>
              </div>
            </div>
            
            <div className="mt-3 text-xs text-orange-700 flex items-center cursor-pointer">
              <FileText size={14} className="mr-1" />
              <span>View reference literature</span>
            </div>
          </div>
        </div>
        
        <div className="mt-4 flex justify-end">
          <Button 
            variant="primary" 
            className="flex items-center"
            onClick={handleSaveModel}
            loading={isLoading}
          >
            Continue to Simulation
            <ArrowRight size={16} className="ml-1" />
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default ModelDesignPanel;