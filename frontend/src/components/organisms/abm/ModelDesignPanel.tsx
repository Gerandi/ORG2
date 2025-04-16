import React, { useState } from 'react';
import { ABMModel, AgentDefinition, EnvironmentDefinition } from '../../../types/abm';
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
  const [agentDefinition, setAgentDefinition] = useState<AgentDefinition>({
    attributes: [
      { name: 'role', type: 'string', default: 'employee' },
      { name: 'department', type: 'string', default: 'sales' },
      { name: 'knowledge_level', type: 'number', default: 0.5, min: 0, max: 1 },
      { name: 'communication_rate', type: 'number', default: 0.2, min: 0, max: 1 },
      { name: 'influence', type: 'number', default: 0.3, min: 0, max: 1 }
    ],
    state_variables: [
      { name: 'innovation_adoption', type: 'boolean', default: false },
      { name: 'knowledge', type: 'number', default: 0.0, min: 0, max: 1 },
      { name: 'satisfaction', type: 'number', default: 0.7, min: 0, max: 1 }
    ],
    behaviors: [
      { 
        name: 'knowledge_transfer', 
        description: 'Agents share knowledge with connected agents based on communication rate and proximity.',
        parameters: { efficiency: 0.1 }
      },
      { 
        name: 'innovation_adoption', 
        description: 'Agents may adopt innovation based on threshold model of collective behavior.',
        parameters: { threshold: 0.3 }
      }
    ]
  });
  
  const [environmentDefinition, setEnvironmentDefinition] = useState<EnvironmentDefinition>({
    type: 'network',
    parameters: {
      topology: 'import',
      dynamic: false
    },
    global_variables: [
      { name: 'innovation_seed_pct', type: 'number', default: 0.05 },
      { name: 'knowledge_decay_rate', type: 'number', default: 0.01 },
      { name: 'org_hierarchy_strength', type: 'number', default: 0.7 }
    ]
  });

  // Get the selected theory details
  const selectedTheory = model ? 
    theories.find(t => t.id === model.attributes.theory_framework) : null;

  const handleAddAttribute = () => {
    setAgentDefinition(prev => ({
      ...prev,
      attributes: [
        ...prev.attributes,
        { name: `attribute_${prev.attributes.length + 1}`, type: 'number', default: 0 }
      ]
    }));
  };

  const handleAddStateVariable = () => {
    setAgentDefinition(prev => ({
      ...prev,
      state_variables: [
        ...prev.state_variables,
        { name: `variable_${prev.state_variables.length + 1}`, type: 'number', default: 0 }
      ]
    }));
  };

  const handleAddBehavior = () => {
    setAgentDefinition(prev => ({
      ...prev,
      behaviors: [
        ...prev.behaviors,
        { 
          name: `behavior_${prev.behaviors.length + 1}`, 
          description: 'New behavior description', 
          parameters: {} 
        }
      ]
    }));
  };

  const handleAddEnvironmentVariable = () => {
    setEnvironmentDefinition(prev => ({
      ...prev,
      global_variables: [
        ...prev.global_variables,
        { name: `env_var_${prev.global_variables.length + 1}`, type: 'number', default: 0 }
      ]
    }));
  };

  const handleSaveModel = async () => {
    if (!model) return;
    
    setIsLoading(true);
    try {
      // Copy the agent definition and environment definition to the model's attributes
      const updatedModel: Partial<ABMModel> = {
        status: 'configured',
        attributes: {
          ...model.attributes,
          agent_definition: agentDefinition,
          environment_definition: environmentDefinition
        }
      };
      
      await onUpdateModel(model.id, updatedModel);
    } catch (error) {
      console.error("Error saving model:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!model) {
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
        <Heading level={3}>Model Design: {model.name}</Heading>
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
                <Text variant="p" className="font-medium">Agent Type: Employee</Text>
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
                        {agentDefinition.attributes.map((attr, index) => (
                          <tr key={index} className={attr.name.includes('betweenness') ? 'bg-blue-50' : ''}>
                            <td className={`px-3 py-1 whitespace-nowrap text-xs ${attr.name.includes('betweenness') ? 'font-medium text-blue-700' : ''}`}>
                              {attr.name}
                            </td>
                            <td className="px-3 py-1 whitespace-nowrap text-xs">
                              {attr.type}
                            </td>
                            <td className="px-3 py-1 whitespace-nowrap text-xs">
                              {typeof attr.default === 'boolean' 
                                ? attr.default.toString() 
                                : attr.default}
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
                        {agentDefinition.state_variables.map((variable, index) => (
                          <tr key={index}>
                            <td className="px-3 py-1 whitespace-nowrap text-xs">
                              {variable.name}
                            </td>
                            <td className="px-3 py-1 whitespace-nowrap text-xs">
                              {variable.type}
                            </td>
                            <td className="px-3 py-1 whitespace-nowrap text-xs">
                              {typeof variable.default === 'boolean' 
                                ? variable.default.toString() 
                                : variable.default}
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
                    value={model.attributes.num_agents}
                    onChange={(e) => {
                      // This would typically update the model attributes
                    }}
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
                  {model.network_id && (
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
            {agentDefinition.behaviors.map((behavior, index) => (
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
                    {behavior.name === 'knowledge_transfer' ? 
                    `def knowledge_transfer(agent, neighbors):
    for neighbor in neighbors:
        if random.random() < agent.communication_rate:
            knowledge_delta = ${behavior.parameters?.efficiency} * (agent.knowledge_level - 
                           neighbor.knowledge_level)
            if knowledge_delta > 0:
                neighbor.knowledge += knowledge_delta
                agent.knowledge -= knowledge_delta * 0.1` :
                    
                    behavior.name === 'innovation_adoption' ?
                    `def innovation_adoption(agent, neighbors):
    if agent.innovation_adoption:
        return  # Already adopted
        
    # Count adopters in network neighborhood
    adopter_count = sum(1 for n in neighbors 
                     if n.innovation_adoption)
    adoption_threshold = ${behavior.parameters?.threshold} - (0.1 * agent.influence)
    
    # Adopt if threshold is met
    if adopter_count / max(1, len(neighbors)) > adoption_threshold:
        agent.innovation_adoption = True` :
                      
                    `def ${behavior.name}(agent, neighbors):
    # Implement behavior logic here
    pass`}
                  </pre>
                </div>
                
                {behavior.name.includes('knowledge') && (
                  <div className="mt-2 text-xs">
                    <div className="flex items-center">
                      <FileText size={12} className="mr-1 text-orange-600" />
                      <span className="text-orange-600">Based on Social Influence Theory</span>
                    </div>
                  </div>
                )}
                
                {behavior.name.includes('innovation') && (
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
                  <Text variant="caption" className="text-gray-500 mb-1">Topology Type</Text>
                  <Select
                    value={environmentDefinition.parameters.topology as string}
                    onChange={(e) => setEnvironmentDefinition(prev => ({
                      ...prev,
                      parameters: {
                        ...prev.parameters,
                        topology: e.target.value
                      }
                    }))}
                  >
                    <option value="random">Random</option>
                    <option value="small_world">Small-world</option>
                    <option value="scale_free">Scale-free</option>
                    <option value="complete">Complete</option>
                    <option value="import">Import from SNA</option>
                  </Select>
                </div>
                
                <div>
                  <Text variant="caption" className="text-gray-500 mb-1">Network Source</Text>
                  <Select
                    value={model.network_id?.toString() || ''}
                    onChange={(e) => {
                      // This would typically update the model
                    }}
                    disabled={environmentDefinition.parameters.topology !== 'import'}
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
                    checked={environmentDefinition.parameters.dynamic as boolean}
                    onChange={(e) => setEnvironmentDefinition(prev => ({
                      ...prev,
                      parameters: {
                        ...prev.parameters,
                        dynamic: e.target.checked
                      }
                    }))}
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
                      {environmentDefinition.global_variables.map((variable, index) => (
                        <tr key={index}>
                          <td className="px-3 py-1 whitespace-nowrap text-xs">
                            {variable.name}
                          </td>
                          <td className="px-3 py-1 whitespace-nowrap text-xs">
                            {variable.type}
                          </td>
                          <td className="px-3 py-1 whitespace-nowrap text-xs">
                            {variable.default}
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
                    value={model.attributes.time_steps}
                    onChange={(e) => {
                      // This would typically update the model attributes
                    }}
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
              How does organizational network structure influence the diffusion of innovations and knowledge sharing within an organization?
            </Text>
            
            <div className="mt-3">
              <Text variant="p" className="text-xs font-medium text-gray-700 mb-1">Related OB Theories:</Text>
              <div className="flex flex-wrap gap-2">
                <span className="px-2 py-0.5 bg-orange-100 text-orange-800 rounded-full text-xs">
                  {selectedTheory?.name || 'Social Influence'}
                </span>
                <span className="px-2 py-0.5 bg-orange-100 text-orange-800 rounded-full text-xs">
                  Social Learning Theory
                </span>
                <span className="px-2 py-0.5 bg-orange-100 text-orange-800 rounded-full text-xs">
                  Social Network Theory
                </span>
              </div>
            </div>
          </div>
          
          <div className="p-3 border border-gray-200 rounded-md bg-gray-50">
            <Text variant="p" className="font-medium text-sm mb-2">Model Parameters Grounding</Text>
            <div className="space-y-2 text-sm text-gray-600">
              <div className="flex items-start">
                <div className="w-28 text-xs font-medium text-gray-700">Knowledge Transfer:</div>
                <div className="flex-1 text-xs">
                  Based on empirical studies of knowledge transfer in R&D teams (Chen et al., 2023)
                </div>
              </div>
              <div className="flex items-start">
                <div className="w-28 text-xs font-medium text-gray-700">Innovation Adoption:</div>
                <div className="flex-1 text-xs">
                  Calibrated using threshold values from Rogers' Diffusion of Innovation framework
                </div>
              </div>
              <div className="flex items-start">
                <div className="w-28 text-xs font-medium text-gray-700">Network Structure:</div>
                <div className="flex-1 text-xs">
                  {model.network_id ? 'Imported directly from empirical communication network data' : 'Synthetically generated based on organizational network literature'}
                </div>
              </div>
            </div>
            
            <div className="mt-3 text-xs text-orange-700 flex items-center">
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