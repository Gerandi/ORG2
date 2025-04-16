import React, { useState, useEffect } from 'react';
import { ABMModel, Simulation } from '../../../types/abm';
import { Heading, Text } from '../../atoms/Typography';
import Button from '../../atoms/Button';
import Input from '../../atoms/Input';
import Select from '../../atoms/Select';
import Checkbox from '../../atoms/Checkbox';
import { ChevronDown, Play, RefreshCw, Settings } from 'lucide-react';

interface SimulationControlPanelProps {
  model: ABMModel;
  simulation: Simulation | null;
  onCreateSimulation: (simulationData: Partial<Simulation>) => Promise<void>;
  onUpdateParameters: (params: any) => void;
  onRunSimulation: (id: number, steps?: number) => Promise<void>;
  onTogglePanel: () => void;
}

const SimulationControlPanel: React.FC<SimulationControlPanelProps> = ({
  model,
  simulation,
  onCreateSimulation,
  onUpdateParameters,
  onRunSimulation,
  onTogglePanel
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [parameters, setParameters] = useState<Record<string, any>>({
    // Initial condition parameters
    population_size: model.attributes.num_agents,
    initial_adopters_percent: 5,
    seed_strategy: 'high_centrality',
    
    // Behavioral parameters
    communication_rate: 0.2,
    knowledge_transfer_efficiency: 0.1,
    innovation_threshold: 0.3,
    
    // Environmental parameters
    knowledge_decay_rate: 0.01,
    org_hierarchy_strength: 0.7
  });
  
  // Update parameters from model or simulation when those change
  useEffect(() => {
    if (model) {
      setParameters(prev => ({
        ...prev,
        population_size: model.attributes.num_agents
      }));
    }
    
    if (simulation?.parameters) {
      setParameters(simulation.parameters);
    }
  }, [model, simulation]);
  
  const handleParameterChange = (name: string, value: any) => {
    let parsedValue = value;
    
    // Convert string number values to numbers
    if (typeof value === 'string' && !isNaN(Number(value))) {
      if (value.includes('.')) {
        parsedValue = parseFloat(value);
      } else {
        parsedValue = parseInt(value, 10);
      }
    }
    
    setParameters(prev => ({
      ...prev,
      [name]: parsedValue
    }));
  };
  
  const handleApplyChanges = () => {
    onUpdateParameters(parameters);
  };
  
  const handleResetParameters = () => {
    // Reset to defaults based on model
    setParameters({
      population_size: model.attributes.num_agents,
      initial_adopters_percent: 5,
      seed_strategy: 'high_centrality',
      communication_rate: 0.2,
      knowledge_transfer_efficiency: 0.1,
      innovation_threshold: 0.3,
      knowledge_decay_rate: 0.01,
      org_hierarchy_strength: 0.7
    });
  };
  
  const handleCreateSimulation = async () => {
    setIsLoading(true);
    try {
      await onCreateSimulation({
        model_id: model.id,
        name: `${model.name} - Simulation ${new Date().toISOString().slice(0, 10)}`,
        status: 'created',
        parameters,
        steps_executed: 0
      });
    } catch (error) {
      console.error("Error creating simulation:", error);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleRunSimulation = async () => {
    if (!simulation) {
      // Create a simulation first, then run it
      setIsLoading(true);
      try {
        const newSimulation = await onCreateSimulation({
          model_id: model.id,
          name: `${model.name} - Simulation ${new Date().toISOString().slice(0, 10)}`,
          status: 'created',
          parameters,
          steps_executed: 0
        });
        await onRunSimulation((newSimulation as Simulation).id);
      } catch (error) {
        console.error("Error creating and running simulation:", error);
      } finally {
        setIsLoading(false);
      }
    } else {
      // Run existing simulation
      await onRunSimulation(simulation.id);
    }
  };
  
  return (
    <div className="w-72 bg-white border-r border-gray-200 p-4 flex flex-col overflow-y-auto">
      <div className="flex items-center justify-between mb-4">
        <Heading level={4}>Simulation Parameters</Heading>
        <button 
          className="text-gray-400 hover:text-gray-500"
          onClick={onTogglePanel}
        >
          <ChevronDown size={18} />
        </button>
      </div>
      
      <div className="space-y-4 flex-1 overflow-y-auto">
        {/* Initial Conditions Section */}
        <div className="p-3 border border-gray-200 rounded-md">
          <Text variant="p" className="font-medium text-sm mb-2">Initial Conditions</Text>
          
          <div className="space-y-3">
            <div>
              <Text variant="caption" className="text-gray-500 mb-1">Population Size</Text>
              <div className="flex items-center">
                <Input 
                  type="range" 
                  min="10" 
                  max="500" 
                  value={parameters.population_size}
                  onChange={(e) => handleParameterChange('population_size', parseInt(e.target.value))}
                  className="w-full mr-2"
                />
                <span className="text-xs w-8">{parameters.population_size}</span>
              </div>
            </div>
            
            <div>
              <Text variant="caption" className="text-gray-500 mb-1">Initial Adopters (%)</Text>
              <div className="flex items-center">
                <Input 
                  type="range" 
                  min="0" 
                  max="30" 
                  value={parameters.initial_adopters_percent}
                  onChange={(e) => handleParameterChange('initial_adopters_percent', parseInt(e.target.value))}
                  className="w-full mr-2"
                />
                <span className="text-xs w-8">{parameters.initial_adopters_percent}%</span>
              </div>
            </div>
            
            <div>
              <Text variant="caption" className="text-gray-500 mb-1">Seed Strategy</Text>
              <Select
                value={parameters.seed_strategy}
                onChange={(e) => handleParameterChange('seed_strategy', e.target.value)}
              >
                <option value="random">Random</option>
                <option value="high_centrality">High Centrality</option>
                <option value="peripheral">Peripheral</option>
                <option value="by_department">By Department</option>
              </Select>
            </div>
          </div>
        </div>
        
        {/* Behavioral Parameters Section */}
        <div className="p-3 border border-gray-200 rounded-md">
          <Text variant="p" className="font-medium text-sm mb-2">Behavioral Parameters</Text>
          
          <div className="space-y-3">
            <div>
              <Text variant="caption" className="text-gray-500 mb-1">Communication Rate</Text>
              <div className="flex items-center">
                <Input 
                  type="range" 
                  min="0" 
                  max="100" 
                  value={parameters.communication_rate * 100}
                  onChange={(e) => handleParameterChange('communication_rate', parseInt(e.target.value) / 100)}
                  className="w-full mr-2"
                />
                <span className="text-xs w-8">{parameters.communication_rate.toFixed(2)}</span>
              </div>
            </div>
            
            <div>
              <Text variant="caption" className="text-gray-500 mb-1">Knowledge Transfer Efficiency</Text>
              <div className="flex items-center">
                <Input 
                  type="range" 
                  min="0" 
                  max="100" 
                  value={parameters.knowledge_transfer_efficiency * 100}
                  onChange={(e) => handleParameterChange('knowledge_transfer_efficiency', parseInt(e.target.value) / 100)}
                  className="w-full mr-2"
                />
                <span className="text-xs w-8">{parameters.knowledge_transfer_efficiency.toFixed(2)}</span>
              </div>
            </div>
            
            <div>
              <Text variant="caption" className="text-gray-500 mb-1">Innovation Threshold</Text>
              <div className="flex items-center">
                <Input 
                  type="range" 
                  min="0" 
                  max="100" 
                  value={parameters.innovation_threshold * 100}
                  onChange={(e) => handleParameterChange('innovation_threshold', parseInt(e.target.value) / 100)}
                  className="w-full mr-2"
                />
                <span className="text-xs w-8">{parameters.innovation_threshold.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Environmental Variables Section */}
        <div className="p-3 border border-gray-200 rounded-md">
          <Text variant="p" className="font-medium text-sm mb-2">Environmental Variables</Text>
          
          <div className="space-y-3">
            <div>
              <Text variant="caption" className="text-gray-500 mb-1">Knowledge Decay Rate</Text>
              <div className="flex items-center">
                <Input 
                  type="range" 
                  min="0" 
                  max="10" 
                  value={parameters.knowledge_decay_rate * 100}
                  onChange={(e) => handleParameterChange('knowledge_decay_rate', parseInt(e.target.value) / 100)}
                  className="w-full mr-2"
                />
                <span className="text-xs w-8">{parameters.knowledge_decay_rate.toFixed(2)}</span>
              </div>
            </div>
            
            <div>
              <Text variant="caption" className="text-gray-500 mb-1">Org. Hierarchy Strength</Text>
              <div className="flex items-center">
                <Input 
                  type="range" 
                  min="0" 
                  max="100" 
                  value={parameters.org_hierarchy_strength * 100}
                  onChange={(e) => handleParameterChange('org_hierarchy_strength', parseInt(e.target.value) / 100)}
                  className="w-full mr-2"
                />
                <span className="text-xs w-8">{parameters.org_hierarchy_strength.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="pt-3 border-t border-gray-200 mt-3">
        {!simulation ? (
          <Button
            variant="primary"
            className="w-full flex items-center justify-center mb-2"
            onClick={handleCreateSimulation}
            loading={isLoading}
          >
            <Settings size={16} className="mr-1" />
            Create Simulation
          </Button>
        ) : (
          <div className="flex justify-between mb-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleResetParameters}
            >
              Reset Params
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleApplyChanges}
            >
              Apply Changes
            </Button>
          </div>
        )}
        
        <Button
          variant="primary"
          className="w-full flex items-center justify-center"
          onClick={handleRunSimulation}
          loading={isLoading}
        >
          <Play size={16} className="mr-1" />
          Run Simulation
        </Button>
      </div>
    </div>
  );
};

export default SimulationControlPanel;