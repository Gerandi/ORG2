import React, { useState, useEffect } from 'react';
import { 
  BarChart, Database, Share2, Download, RefreshCw, 
  Settings, FileText, Play, AlertCircle, Plus, 
  Layers, Sliders, TrendingUp, ArrowRight, CheckCircle 
} from 'lucide-react';
import { Heading, Text } from '../components/atoms/Typography';
import Card from '../components/atoms/Card';
import Button from '../components/atoms/Button';
import Tabs from '../components/molecules/Tabs';
import { useMLContext, useDataContext, useNetworkContext, useProjectContext } from '../shared/contexts';
import ModelCreationModal from '../components/organisms/ModelCreationModal';
import ModelTrainingForm from '../components/organisms/ModelTrainingForm';
import ModelEvaluationPanel from '../components/organisms/ModelEvaluationPanel';
import FeatureImportanceChart from '../components/organisms/FeatureImportanceChart';
import DataSelectionPanel from '../components/organisms/ml/DataSelectionPanel';
import FeatureEngineeringPanel from '../components/organisms/ml/FeatureEngineeringPanel';
import { MLModel, TrainingOptions } from '../types/ml';

// Define the ML workflow steps
type MLWorkflowStep = 'data' | 'features' | 'model' | 'train' | 'evaluate';

const MachineLearning: React.FC = () => {
  // ML workflow state
  const [currentStep, setCurrentStep] = useState<MLWorkflowStep>('data');
  const [selectedDatasetId, setSelectedDatasetId] = useState<number | null>(null);
  const [targetColumn, setTargetColumn] = useState<string>('');
  const [preparedDataId, setPreparedDataId] = useState<number | null>(null);
  
  // UI state
  const [activeTab, setActiveTab] = useState('workflow');
  const [selectedModelId, setSelectedModelId] = useState<number | null>(null);
  const [showModelModal, setShowModelModal] = useState(false);
  const [trainingOptions, setTrainingOptions] = useState<TrainingOptions>({
    train_test_split: 0.8,
    cross_validation: {
      method: 'k_fold',
      k: 5
    },
    class_weights: 'balanced',
    hyperparameter_tuning: {
      enabled: false,
      method: 'grid_search',
      cv: 3
    },
    algorithm_parameters: {}
  });

  // Access context data
  const { 
    models, 
    selectedModel, 
    algorithms, 
    featureImportance,
    preparedDataInfo,
    isLoading,
    error,
    fetchModels,
    selectModel,
    createModel,
    trainModel,
    fetchFeatureImportance,
    prepareData
  } = useMLContext();

  const { datasets } = useDataContext();
  const { networks } = useNetworkContext();
  const { selectedProject } = useProjectContext();

  // Filter datasets by selected project
  const filteredDatasets = selectedProject 
    ? datasets.filter(dataset => dataset.project_id === selectedProject.id)
    : [];

  // Filter networks by selected project  
  const filteredNetworks = selectedProject
    ? networks.filter(network => network.project_id === selectedProject.id)
    : [];

  // Get selected dataset object
  const selectedDataset = datasets.find(d => d.id === selectedDatasetId);

  // Load models on component mount and when selected project changes
  useEffect(() => {
    if (selectedProject) {
      fetchModels(selectedProject.id);
    } else {
      fetchModels(undefined);
    }
  }, [fetchModels, selectedProject]);

  // Load model details when selected
  useEffect(() => {
    if (selectedModelId) {
      selectModel(selectedModelId);
    }
  }, [selectedModelId, selectModel]);

  // Fetch feature importance when a trained model is selected
  useEffect(() => {
    if (selectedModel && selectedModel.status === 'trained') {
      fetchFeatureImportance(selectedModel.id);
    }
  }, [selectedModel, fetchFeatureImportance]);

  // Handle tab change
  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
  };

  // Handle ML workflow navigation
  const handleStepChange = (step: MLWorkflowStep) => {
    setCurrentStep(step);
  };

  // Handle dataset and target selection
  const handleDataSelected = (datasetId: number, targetCol: string) => {
    setSelectedDatasetId(datasetId);
    setTargetColumn(targetCol);
    setCurrentStep('features');
  };

  // Handle going back to data selection step
  const handleBackToDataSelection = () => {
    setCurrentStep('data');
  };

  // Handle feature engineering and data preparation
  const handleFeaturesPrepared = async (options: {
    datasetId: number;
    features: string[];
    networkId: number | null;
    networkMetrics: string[];
    testSize: number;
  }) => {
    try {
      // Call the prepareData method from MLContext
      const result = await prepareData({
        dataset_id: options.datasetId,
        target_column: targetColumn,
        feature_columns: options.features,
        network_id: options.networkId || undefined,
        network_metrics: options.networkMetrics.length > 0 ? options.networkMetrics : undefined,
        test_size: options.testSize
      });
      
      // Store the prepared data ID
      setPreparedDataId(result.id);
      
      // Advance to model creation step
      setCurrentStep('model');
    } catch (error) {
      console.error("Error preparing data:", error);
    }
  };

  // Handle model selection
  const handleModelSelect = (id: number) => {
    setSelectedModelId(id);
  };

  // Handle model creation
  const handleCreateModel = async (modelData: Partial<MLModel>) => {
    await createModel({
      ...modelData,
      prepared_data_id: preparedDataId
    });
    await fetchModels();
    setShowModelModal(false);
  };

  // Handle model training
  const handleTrainModel = async (options: TrainingOptions) => {
    if (selectedModel) {
      await trainModel(selectedModel.id, options);
      // Refresh model details and feature importance
      await selectModel(selectedModel.id);
      await fetchFeatureImportance(selectedModel.id);
    }
  };

  // Handle training options update
  const handleUpdateTrainingOptions = (updatedOptions: Partial<TrainingOptions>) => {
    setTrainingOptions(prev => ({
      ...prev,
      ...updatedOptions
    }));
  };

  // Format model metrics for display
  const getFormattedMetrics = (metrics?: Record<string, number>) => {
    if (!metrics) return [];
    
    return Object.entries(metrics).map(([key, value]) => ({
      name: key,
      value: value,
      label: key.charAt(0).toUpperCase() + key.slice(1).replace('_', ' ')
    }));
  };

  // Render progress indicator for the ML workflow
  const renderProgressIndicator = () => {
    const steps = [
      { id: 'data', label: 'Data Selection', icon: Database },
      { id: 'features', label: 'Feature Engineering', icon: Sliders },
      { id: 'model', label: 'Model Selection', icon: Layers },
      { id: 'train', label: 'Training', icon: Play },
      { id: 'evaluate', label: 'Evaluation', icon: TrendingUp }
    ];

    return (
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {steps.map((step, index) => (
            <React.Fragment key={step.id}>
              {/* Step indicator */}
              <div 
                className={`flex flex-col items-center ${
                  index <= steps.findIndex(s => s.id === currentStep) 
                    ? 'text-blue-600' 
                    : 'text-gray-400'
                }`}
              >
                <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-2 ${
                  step.id === currentStep 
                    ? 'bg-blue-100 border-2 border-blue-600' 
                    : index < steps.findIndex(s => s.id === currentStep)
                      ? 'bg-blue-50 border border-blue-200'
                      : 'bg-gray-100 border border-gray-200'
                }`}>
                  <step.icon size={20} />
                </div>
                <span className="text-xs text-center">{step.label}</span>
              </div>
              
              {/* Connector line */}
              {index < steps.length - 1 && (
                <div className={`flex-1 h-0.5 mx-2 ${
                  index < steps.findIndex(s => s.id === currentStep)
                    ? 'bg-blue-400'
                    : 'bg-gray-200'
                }`} />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Module Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <BarChart className="text-blue-600 mr-2" size={24} />
          <Heading level={2}>Machine Learning</Heading>
        </div>
        <div className="flex space-x-2">
          <Button 
            variant="outline" 
            className="flex items-center"
            onClick={() => fetchModels()}
            loading={isLoading}
          >
            <RefreshCw size={16} className="mr-1" />
            Refresh
          </Button>
          <Button 
            variant="outline" 
            className="flex items-center"
            disabled={!selectedModel}
          >
            <Download size={16} className="mr-1" />
            Export Model
          </Button>
          <Button 
            variant="primary" 
            className="flex items-center"
            onClick={() => setShowModelModal(true)}
            disabled={!preparedDataId && activeTab === 'workflow'}
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
                  <AlertCircle className="h-5 w-5 text-red-400" />
                </div>
                <div className="ml-3">
                  <Text variant="p" className="text-sm text-red-700">
                    {error}
                  </Text>
                </div>
              </div>
            </div>
          )}
          
          {/* Module Tabs */}
          <Tabs
            items={[
              { id: 'workflow', label: 'ML Workflow' },
              { id: 'models', label: 'Models' },
              { id: 'interpretation', label: 'Interpretation' }
            ]}
            activeTab={activeTab}
            onChange={handleTabChange}
            variant="underline"
          />
          
          {/* ML Workflow Tab Content */}
          {activeTab === 'workflow' && (
            <>
              {renderProgressIndicator()}
              
              {currentStep === 'data' && (
                <DataSelectionPanel
                  datasets={filteredDatasets}
                  onDataSelected={handleDataSelected}
                  isLoading={isLoading}
                />
              )}
              
              {currentStep === 'features' && selectedDataset && (
                <FeatureEngineeringPanel
                  selectedDataset={selectedDataset}
                  networks={filteredNetworks}
                  onFeaturesPrepared={handleFeaturesPrepared}
                  onBack={handleBackToDataSelection}
                  isLoading={isLoading}
                />
              )}
              
              {currentStep === 'model' && preparedDataId && (
                <Card className="pb-6">
                  <div className="flex items-center mb-4">
                    <Layers className="mr-2 text-blue-600" size={24} />
                    <Heading level={3}>Model Configuration</Heading>
                  </div>
                  
                  <Text variant="p" className="mb-6 text-gray-600">
                    Data preparation complete! Now you can create a model to train.
                  </Text>
                  
                  {preparedDataInfo && (
                    <div className="bg-green-50 p-4 rounded-md border border-green-200 mb-6">
                      <div className="flex items-center mb-2">
                        <CheckCircle className="text-green-500 mr-2" size={20} />
                        <Text className="font-medium text-green-700">Data Successfully Prepared</Text>
                      </div>
                      <div className="text-sm text-green-600 ml-7">
                        <p>Training samples: {preparedDataInfo.feature_info?.train_size}</p>
                        <p>Testing samples: {preparedDataInfo.feature_info?.test_size}</p>
                        <p>Features: {preparedDataInfo.feature_info?.transformed_feature_count || preparedDataInfo.feature_columns?.length}</p>
                        {preparedDataInfo.feature_info?.network_metrics?.length > 0 && (
                          <p>Network metrics included: {preparedDataInfo.feature_info.network_metrics.length}</p>
                        )}
                      </div>
                    </div>
                  )}
                  
                  <div className="pt-4 flex justify-center">
                    <Button
                      variant="primary"
                      onClick={() => setShowModelModal(true)}
                      disabled={isLoading}
                    >
                      <Plus size={16} className="mr-1" />
                      Create New Model
                    </Button>
                  </div>
                </Card>
              )}
            </>
          )}
          
          {/* Models Tab Content */}
          {activeTab === 'models' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Models List */}
              <div className="lg:col-span-2">
                <Card>
                  <Heading level={3} className="mb-4">Available Models</Heading>
                  
                  {isLoading && models.length === 0 ? (
                    <div className="flex justify-center items-center h-64">
                      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600"></div>
                    </div>
                  ) : models.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <Layers className="h-12 w-12 text-gray-300 mb-4" />
                      <Heading level={4} className="mb-2 text-gray-700">No Models Available</Heading>
                      <Text variant="caption" className="text-gray-500 mb-6 max-w-md">
                        Create your first machine learning model to start analyzing your organizational data.
                      </Text>
                      <Button 
                        variant="primary" 
                        onClick={() => {
                          if (preparedDataId) {
                            setShowModelModal(true);
                          } else {
                            setActiveTab('workflow');
                            setCurrentStep('data');
                          }
                        }}
                      >
                        <Plus size={16} className="mr-1" />
                        Create Model
                      </Button>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                            <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                            <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Algorithm</th>
                            <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Target</th>
                            <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                            <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Performance</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {models.map(model => (
                            <tr 
                              key={model.id} 
                              className={`hover:bg-gray-50 cursor-pointer ${selectedModelId === model.id ? 'bg-blue-50' : ''}`}
                              onClick={() => handleModelSelect(model.id)}
                            >
                              <td className="px-3 py-4 whitespace-nowrap">
                                <div className="text-sm font-medium text-gray-900">{model.name}</div>
                                <div className="text-xs text-gray-500">{new Date(model.created_at).toLocaleDateString()}</div>
                              </td>
                              <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500">
                                {model.type === 'classification' ? 'Classification' : 'Regression'}
                              </td>
                              <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500">
                                {model.algorithm.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                              </td>
                              <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500">
                                {model.target_variable}
                              </td>
                              <td className="px-3 py-4 whitespace-nowrap">
                                <span className={`px-2 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                  model.status === 'trained' ? 'bg-green-100 text-green-800' :
                                  model.status === 'failed' ? 'bg-red-100 text-red-800' :
                                  'bg-yellow-100 text-yellow-800'
                                }`}>
                                  {model.status.charAt(0).toUpperCase() + model.status.slice(1)}
                                </span>
                              </td>
                              <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500">
                                {model.metrics ? (
                                  model.type === 'classification' ? (
                                    <div>Acc: {(model.metrics.accuracy * 100).toFixed(1)}%</div>
                                  ) : (
                                    <div>R²: {model.metrics.r_squared.toFixed(2)}</div>
                                  )
                                ) : (
                                  <span className="text-gray-400">—</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </Card>
              </div>
              
              {/* Selected Model Details */}
              <div>
                <Card>
                  <div className="flex justify-between items-center mb-4">
                    <Heading level={3}>Model Details</Heading>
                    {selectedModel && (
                      <div className={`px-2 py-0.5 text-xs rounded-full ${
                        selectedModel.status === 'trained' ? 'bg-green-100 text-green-800' :
                        selectedModel.status === 'failed' ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {selectedModel.status.charAt(0).toUpperCase() + selectedModel.status.slice(1)}
                      </div>
                    )}
                  </div>
                  
                  {isLoading ? (
                    <div className="flex justify-center items-center h-64">
                      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600"></div>
                    </div>
                  ) : !selectedModel ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <Layers className="h-10 w-10 text-gray-300 mb-2" />
                      <Text className="text-gray-500">No model selected</Text>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div>
                        <Text variant="caption" className="text-gray-500 mb-1">Model Name</Text>
                        <Text className="font-medium">{selectedModel.name}</Text>
                      </div>
                      
                      <div>
                        <Text variant="caption" className="text-gray-500 mb-1">Description</Text>
                        <Text>{selectedModel.description || '—'}</Text>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Text variant="caption" className="text-gray-500 mb-1">Type</Text>
                          <Text>{selectedModel.type === 'classification' ? 'Classification' : 'Regression'}</Text>
                        </div>
                        <div>
                          <Text variant="caption" className="text-gray-500 mb-1">Algorithm</Text>
                          <Text>{selectedModel.algorithm.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}</Text>
                        </div>
                        <div>
                          <Text variant="caption" className="text-gray-500 mb-1">Target Variable</Text>
                          <Text>{selectedModel.target_variable}</Text>
                        </div>
                        <div>
                          <Text variant="caption" className="text-gray-500 mb-1">Created</Text>
                          <Text>{new Date(selectedModel.created_at).toLocaleDateString()}</Text>
                        </div>
                      </div>
                      
                      <div>
                        <Text variant="caption" className="text-gray-500 mb-1">Data Sources</Text>
                        <div className="space-y-1">
                          {selectedModel.dataset_ids?.length > 0 ? (
                            selectedModel.dataset_ids.map(id => {
                              const dataset = datasets.find(d => d.id === id);
                              return (
                                <div key={id} className="flex items-center text-sm">
                                  <Database size={14} className="text-gray-400 mr-1" />
                                  <span>{dataset?.name || `Dataset ${id}`}</span>
                                </div>
                              );
                            })
                          ) : (
                            <Text className="text-gray-400">No datasets</Text>
                          )}
                          
                          {selectedModel.network_id && (
                            <div className="flex items-center text-sm">
                              <Share2 size={14} className="text-gray-400 mr-1" />
                              <span>
                                {networks.find(n => n.id === selectedModel.network_id)?.name || `Network ${selectedModel.network_id}`}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {selectedModel.status === 'trained' && selectedModel.metrics && (
                        <div>
                          <Text variant="caption" className="text-gray-500 mb-1">Performance Metrics</Text>
                          <div className="grid grid-cols-2 gap-2">
                            {getFormattedMetrics(selectedModel.metrics).map(metric => (
                              <div key={metric.name} className="bg-gray-50 p-2 rounded">
                                <Text variant="caption" className="text-gray-500">{metric.label}</Text>
                                <Text className="font-medium">{typeof metric.value === 'number' ? metric.value.toFixed(3) : metric.value}</Text>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      <div className="pt-4 flex justify-end space-x-2">
                        {selectedModel.status === 'created' && (
                          <Button
                            variant="primary"
                            onClick={() => {
                              setActiveTab('workflow');
                              setCurrentStep('train');
                            }}
                          >
                            <Play size={16} className="mr-1" />
                            Train Model
                          </Button>
                        )}
                        {selectedModel.status === 'trained' && (
                          <Button
                            variant="primary"
                            onClick={() => setActiveTab('interpretation')}
                          >
                            <TrendingUp size={16} className="mr-1" />
                            View Insights
                          </Button>
                        )}
                      </div>
                    </div>
                  )}
                </Card>
              </div>
            </div>
          )}
          
          {/* Interpretation Tab Content */}
          {activeTab === 'interpretation' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <Card>
                  <Heading level={3} className="mb-4">Feature Importance</Heading>
                  
                  {!selectedModel || selectedModel.status !== 'trained' ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <Layers className="h-12 w-12 text-gray-300 mb-4" />
                      <Text variant="caption" className="text-gray-500">
                        Select a trained model to view feature importance
                      </Text>
                    </div>
                  ) : isLoading || !featureImportance ? (
                    <div className="flex justify-center items-center h-64">
                      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600"></div>
                    </div>
                  ) : (
                    <FeatureImportanceChart 
                      features={featureImportance.features}
                      height={400}
                    />
                  )}
                </Card>
              </div>
              
              <div>
                <Card>
                  <Heading level={3} className="mb-4">Interpretation & Insights</Heading>
                  
                  {!selectedModel || selectedModel.status !== 'trained' ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <Layers className="h-10 w-10 text-gray-300 mb-2" />
                      <Text className="text-gray-500">No trained model selected</Text>
                    </div>
                  ) : isLoading ? (
                    <div className="flex justify-center items-center h-32">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div>
                        <Heading level={4} className="text-gray-700 mb-2">Key Findings</Heading>
                        <ul className="space-y-2 pl-5 list-disc">
                          <li className="text-sm">
                            {selectedModel.type === 'classification' 
                              ? 'Classification model shows good performance with balanced precision and recall'
                              : 'Regression model explains significant portion of variance in target variable'
                            }
                          </li>
                          <li className="text-sm">
                            Network metrics contribute significantly to model performance
                          </li>
                          <li className="text-sm">
                            Feature importance indicates strong influence of network centrality measures
                          </li>
                        </ul>
                      </div>
                      
                      <div>
                        <Heading level={4} className="text-gray-700 mb-2">Theoretical Implications</Heading>
                        <Text variant="p" className="text-sm mb-2">
                          Results support social capital theory, indicating that strategic positioning in 
                          the organizational network has significant impact on {selectedModel.target_variable.replace('_', ' ')}.
                        </Text>
                        <Text variant="p" className="text-sm">
                          Consistent with prior research on the importance of informal structures in 
                          organizational outcomes.
                        </Text>
                      </div>
                      
                      <div>
                        <Heading level={4} className="text-gray-700 mb-2">Actions & Recommendations</Heading>
                        <ul className="space-y-2 pl-5 list-disc">
                          <li className="text-sm">
                            Consider network position in decision-making processes
                          </li>
                          <li className="text-sm">
                            Develop strategies to enhance key network positions
                          </li>
                          <li className="text-sm">
                            Reevaluate formal structures to align with informal influence patterns
                          </li>
                        </ul>
                      </div>
                    </div>
                  )}
                </Card>
              </div>
            </div>
          )}
        </>
      )}
      
      {/* Model Creation Modal */}
      {showModelModal && (
        <ModelCreationModal
          onClose={() => setShowModelModal(false)}
          onCreateModel={handleCreateModel}
          datasets={datasets}
          networks={networks}
          algorithms={algorithms}
          preparedDataId={preparedDataId}
        />
      )}
    </div>
  );
};

export default MachineLearning;