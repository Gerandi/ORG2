import React, { useState, useEffect } from 'react';
import { 
  Users, Download, RefreshCw, Play, Pause, 
  FastForward, SkipForward, Code, Grid, 
  Plus, Sliders, Share2, Maximize2, FileText,
  BarChart2, Layers, ArrowRight
} from 'lucide-react';
import { Heading, Text } from '../components/atoms/Typography';
import Card from '../components/atoms/Card';
import Button from '../components/atoms/Button';
import Tabs from '../components/molecules/Tabs';
import { useABMContext, useNetworkContext, useProjectContext } from '../shared/contexts';
import ModelDesignPanel from '../components/organisms/abm/ModelDesignPanel';
import SimulationControlPanel from '../components/organisms/abm/SimulationControlPanel';
import SimulationVisualization from '../components/organisms/abm/SimulationVisualization';
import ResultsAnalysisPanel from '../components/organisms/abm/ResultsAnalysisPanel';
import ModelValidationPanel from '../components/organisms/abm/ModelValidationPanel';
import ModelCreationModal from '../components/organisms/abm/ModelCreationModal';
import { ABMModel, Simulation } from '../types/abm';

const AgentBasedModeling: React.FC = () => {
  const [activeTab, setActiveTab] = useState('model-design');
  const [showModelModal, setShowModelModal] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [showParameters, setShowParameters] = useState(true);
  const [currentStep, setCurrentStep] = useState(0);
  const [maxSteps, setMaxSteps] = useState(500);
  
  const { 
    models, 
    selectedModel, 
    simulations,
    selectedSimulation,
    simulationResults,
    isLoading,
    error,
    fetchModels,
    selectModel,
    createModel,
    updateModel,
    fetchSimulations,
    selectSimulation,
    createSimulation,
    runSimulation,
    fetchSimulationResults
  } = useABMContext();

  const { networks } = useNetworkContext();
  
  // Get the currently selected project from the project context
  const { selectedProject } = useProjectContext();
  
  // Load models and simulations on mount and when the selected project changes
  useEffect(() => {
    if (selectedProject) {
      fetchModels(selectedProject.id);
      fetchSimulations(selectedProject.id);
    } else {
      // Clear models and simulations if no project is selected
      fetchModels(undefined);
      fetchSimulations(undefined);
    }
  }, [fetchModels, fetchSimulations, selectedProject]);
  
  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
  };
  
  const handleModelSelect = (id: number) => {
    selectModel(id);
  };
  
  const handleCreateModel = async (modelData: Partial<ABMModel>) => {
    await createModel(modelData);
    await fetchModels();
    setShowModelModal(false);
  };
  
  const handleUpdateModel = async (id: number, modelData: Partial<ABMModel>) => {
    await updateModel(id, modelData);
  };
  
  const handleSimulationSelect = (id: number) => {
    selectSimulation(id);
  };
  
  const handleCreateSimulation = async (simulationData: Partial<Simulation>) => {
    await createSimulation(simulationData);
    await fetchSimulations();
  };
  
  const handleRunSimulation = async (id: number, steps?: number) => {
    setIsRunning(true);
    try {
      await runSimulation(id, steps);
      await fetchSimulationResults(id);
    } catch (error) {
      console.error("Error running simulation:", error);
    } finally {
      setIsRunning(false);
    }
  };
  
  const toggleSimulation = () => {
    if (selectedSimulation) {
      if (isRunning) {
        // Pause simulation
        setIsRunning(false);
      } else {
        // Resume or start simulation
        setIsRunning(true);
        handleRunSimulation(selectedSimulation.id);
      }
    }
  };
  
  const fastForwardSimulation = () => {
    if (selectedSimulation) {
      handleRunSimulation(selectedSimulation.id, 50); // Run 50 steps quickly
    }
  };
  
  const skipToEndSimulation = () => {
    if (selectedSimulation) {
      handleRunSimulation(selectedSimulation.id, maxSteps - currentStep); // Run to end
    }
  };
  
  // Update currentStep when simulation data changes
  useEffect(() => {
    if (selectedSimulation) {
      setCurrentStep(selectedSimulation.steps_executed);
    }
  }, [selectedSimulation]);
  
  // Update maxSteps when model changes
  useEffect(() => {
    if (selectedModel) {
      setMaxSteps(selectedModel.attributes.time_steps || 500);
    }
  }, [selectedModel]);
  
  return (
    <div className="space-y-6">
      {/* Module Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <Users className="text-orange-600 mr-2" size={24} />
          <Heading level={2}>Agent-Based Modeling</Heading>
        </div>
        <div className="flex space-x-2">
          <Button 
            variant="outline" 
            className="flex items-center"
            onClick={() => {
              fetchModels();
              fetchSimulations();
            }}
            loading={isLoading}
          >
            <RefreshCw size={16} className="mr-1" />
            Refresh
          </Button>
          <Button 
            variant="outline" 
            className="flex items-center"
            disabled={!simulationResults}
          >
            <Download size={16} className="mr-1" />
            Export Results
          </Button>
          <Button 
            variant="primary" 
            className="flex items-center"
            onClick={() => setShowModelModal(true)}
          >
            <Plus size={16} className="mr-1" />
            New Model
          </Button>
        </div>
      </div>
      
      {/* Check if a project is selected */}
      {!selectedProject && (
        <Card className="text-center p-8">
          <Heading level={4}>No Project Selected</Heading>
          <Text className="mt-2 text-gray-600">
            Please select an active project from the dropdown in the header to view its content.
          </Text>
        </Card>
      )}
      
      {/* Only show content if a project is selected */}
      {selectedProject && (
        <>
          {/* Error message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
              <div className="flex">
                <div className="shrink-0">
                  <span className="h-5 w-5 text-red-400">!</span>
                </div>
                <div className="ml-3">
                  <Text variant="p" className="text-sm text-red-700">
                    {error}
                  </Text>
                </div>
              </div>
            </div>
          )}
          
          {/* Model Selection */}
          <Card padding="none" className="p-3">
            <div className="flex items-center">
              <div className="mr-3">
                <label htmlFor="model-select" className="block text-sm font-medium text-gray-700">
                  Model:
                </label>
              </div>
              <select 
                id="model-select"
                className="w-full max-w-xs p-2 text-sm border border-gray-300 rounded-md"
                value={selectedModel?.id || ''}
                onChange={(e) => {
                  const id = parseInt(e.target.value);
                  if (!isNaN(id)) {
                    handleModelSelect(id);
                  }
                }}
              >
                <option value="">Select a model</option>
                {models.map(model => (
                  <option key={model.id} value={model.id}>
                    {model.name} ({model.attributes.theory_framework.replace('_', ' ')})
                  </option>
                ))}
              </select>
              
              {selectedModel && (
                <div className="ml-4 text-sm text-gray-500 flex items-center">
                  Status: 
                  <span className={`ml-1 px-2 py-0.5 text-xs rounded-full ${
                    selectedModel.status === 'configured' ? 'bg-green-100 text-green-800' :
                    selectedModel.status === 'error' ? 'bg-red-100 text-red-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {selectedModel.status.charAt(0).toUpperCase() + selectedModel.status.slice(1)}
                  </span>
                </div>
              )}
            </div>
          </Card>
          
          {/* Module Tabs */}
          <Tabs
            items={[
              { id: 'model-design', label: 'Model Design' },
              { id: 'simulation', label: 'Simulation Execution' },
              { id: 'analysis', label: 'Results Analysis' },
              { id: 'validation', label: 'Model Validation' }
            ]}
            activeTab={activeTab}
            onChange={handleTabChange}
            variant="underline"
          />
          
          {/* Model Design Tab Content */}
          {activeTab === 'model-design' && (
            <ModelDesignPanel 
              model={selectedModel}
              networks={networks}
              onUpdateModel={handleUpdateModel}
              onContinue={() => setActiveTab('simulation')}
            />
          )}
          
          {/* Simulation Execution Tab Content */}
          {activeTab === 'simulation' && (
            <div className="flex h-[calc(100vh-16rem)] flex-col">
              {!selectedModel ? (
                <Card>
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <Layers className="h-12 w-12 text-gray-300 mb-4" />
                    <Heading level={4} className="mb-2 text-gray-700">No Model Selected</Heading>
                    <Text variant="caption" className="text-gray-500 mb-6 max-w-md">
                      Please select a model or create a new one.
                    </Text>
                    <Button 
                      variant="primary" 
                      onClick={() => setShowModelModal(true)}
                    >
                      <Plus size={16} className="mr-1" />
                      Create Model
                    </Button>
                  </div>
                </Card>
              ) : (
                <>
                  <div className="flex justify-between items-center mb-4">
                    <Heading level={3}>Simulation: {selectedModel.name}</Heading>
                    <div className="flex items-center">
                      <span className="text-sm mr-4">
                        Step: <span className="font-medium">{currentStep}</span> / {maxSteps}
                      </span>
                      <div className="flex space-x-2">
                        <Button 
                          variant="outline"
                          iconOnly
                          onClick={toggleSimulation}
                          disabled={!selectedSimulation}
                        >
                          {isRunning ? <Pause size={18} /> : <Play size={18} />}
                        </Button>
                        <Button 
                          variant="outline"
                          iconOnly
                          onClick={fastForwardSimulation}
                          disabled={!selectedSimulation || isRunning}
                        >
                          <FastForward size={18} />
                        </Button>
                        <Button 
                          variant="outline"
                          iconOnly
                          onClick={skipToEndSimulation}
                          disabled={!selectedSimulation || isRunning}
                        >
                          <SkipForward size={18} />
                        </Button>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex flex-1">
                    {/* Control panel */}
                    {showParameters && (
                      <SimulationControlPanel
                        model={selectedModel}
                        simulation={selectedSimulation}
                        onCreateSimulation={handleCreateSimulation}
                        onUpdateParameters={setShowParameters}
                        onRunSimulation={handleRunSimulation}
                        onTogglePanel={() => setShowParameters(!showParameters)}
                      />
                    )}
                    
                    {/* Visualization */}
                    <SimulationVisualization
                      model={selectedModel}
                      simulation={selectedSimulation}
                      results={simulationResults}
                      isRunning={isRunning}
                      currentStep={currentStep}
                      onToggleControlPanel={() => setShowParameters(!showParameters)}
                      showControlPanel={showParameters}
                    />
                  </div>
                </>
              )}
            </div>
          )}
          
          {/* Results Analysis Tab Content */}
          {activeTab === 'analysis' && (
            <ResultsAnalysisPanel
              model={selectedModel}
              simulation={selectedSimulation}
              results={simulationResults}
              onFetchResults={(id, level) => fetchSimulationResults(id, level)}
            />
          )}
          
          {/* Model Validation Tab Content */}
          {activeTab === 'validation' && (
            <ModelValidationPanel
              model={selectedModel}
              simulations={simulations.filter(s => s.model_id === selectedModel?.id)}
              onRunSimulation={handleRunSimulation}
              onSelectSimulation={handleSimulationSelect}
            />
          )}
          
          {/* Model Creation Modal */}
          {showModelModal && (
            <ModelCreationModal
              onClose={() => setShowModelModal(false)}
              onCreateModel={handleCreateModel}
              networks={networks}
            />
          )}
        </>
      )}
    </div>
  );
};

export default AgentBasedModeling;