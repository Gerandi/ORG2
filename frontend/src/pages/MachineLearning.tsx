import React, { useState, useEffect } from 'react';
import { 
  BarChart, Database, Share2, Download, RefreshCw, 
  Settings, FileText, Play, AlertCircle, Plus, 
  Layers, Sliders, TrendingUp, ArrowRight 
} from 'lucide-react';
import { Heading, Text } from '../components/atoms/Typography';
import Card from '../components/atoms/Card';
import Button from '../components/atoms/Button';
import Tabs from '../components/molecules/Tabs';
import { useMLContext, useDataContext, useNetworkContext } from '../shared/contexts';
import ModelCreationModal from '../components/organisms/ModelCreationModal';
import ModelTrainingForm from '../components/organisms/ModelTrainingForm';
import ModelEvaluationPanel from '../components/organisms/ModelEvaluationPanel';
import FeatureImportanceChart from '../components/organisms/FeatureImportanceChart';
import { MLModel, TrainingOptions } from '../types/ml';

const MachineLearning: React.FC = () => {
  const [activeTab, setActiveTab] = useState('models');
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

  const { 
    models, 
    selectedModel, 
    algorithms, 
    featureImportance,
    isLoading,
    error,
    fetchModels,
    selectModel,
    createModel,
    trainModel,
    fetchFeatureImportance
  } = useMLContext();

  const { datasets } = useDataContext();
  const { networks } = useNetworkContext();

  // Load models on mount
  useEffect(() => {
    fetchModels();
  }, [fetchModels]);

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

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
  };

  const handleModelSelect = (id: number) => {
    setSelectedModelId(id);
  };

  const handleCreateModel = async (modelData: Partial<MLModel>) => {
    await createModel(modelData);
    await fetchModels();
  };

  const handleTrainModel = async (options: TrainingOptions) => {
    if (selectedModel) {
      await trainModel(selectedModel.id, options);
      // Refresh model details and feature importance
      await selectModel(selectedModel.id);
      await fetchFeatureImportance(selectedModel.id);
    }
  };

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
          >
            <Plus size={16} className="mr-1" />
            New Model
          </Button>
        </div>
      </div>
      
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
            value={selectedModelId || ''}
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
                {model.name} ({model.type} - {model.algorithm})
              </option>
            ))}
          </select>
          
          {selectedModel && (
            <div className="ml-4 text-sm text-gray-500 flex items-center">
              Status: 
              <span className={`ml-1 px-2 py-0.5 text-xs rounded-full ${
                selectedModel.status === 'trained' ? 'bg-green-100 text-green-800' :
                selectedModel.status === 'failed' ? 'bg-red-100 text-red-800' :
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
          { id: 'models', label: 'Models' },
          { id: 'training', label: 'Training & Validation' },
          { id: 'evaluation', label: 'Model Evaluation' },
          { id: 'interpretation', label: 'Interpretation' },
          { id: 'predictions', label: 'Predictions' }
        ]}
        activeTab={activeTab}
        onChange={handleTabChange}
        variant="underline"
      />
      
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
                    onClick={() => setShowModelModal(true)}
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
                      {selectedModel.dataset_ids.length > 0 ? (
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
                            <Text className="font-medium">{metric.value.toFixed(3)}</Text>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  <div className="pt-4 flex justify-end space-x-2">
                    {selectedModel.status === 'created' && (
                      <Button
                        variant="primary"
                        onClick={() => setActiveTab('training')}
                      >
                        <Play size={16} className="mr-1" />
                        Train Model
                      </Button>
                    )}
                    {selectedModel.status === 'trained' && (
                      <Button
                        variant="primary"
                        onClick={() => setActiveTab('predictions')}
                      >
                        <TrendingUp size={16} className="mr-1" />
                        Make Predictions
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </Card>
          </div>
        </div>
      )}
      
      {/* Training Tab Content */}
      {activeTab === 'training' && (
        <div>
          {!selectedModel ? (
            <Card>
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Layers className="h-12 w-12 text-gray-300 mb-4" />
                <Heading level={4} className="mb-2 text-gray-700">No Model Selected</Heading>
                <Text variant="caption" className="text-gray-500 mb-6 max-w-md">
                  Please select a model from the Models tab to train it.
                </Text>
                <Button 
                  variant="primary" 
                  onClick={() => setActiveTab('models')}
                >
                  Go to Models
                </Button>
              </div>
            </Card>
          ) : selectedModel.status === 'trained' ? (
            <Card>
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
                  <AlertCircle size={32} className="text-green-500" />
                </div>
                <Heading level={4} className="mb-2 text-gray-700">Model Already Trained</Heading>
                <Text variant="caption" className="text-gray-500 mb-6 max-w-md">
                  This model has already been trained. You can view the evaluation results or make predictions.
                </Text>
                <div className="flex space-x-4">
                  <Button 
                    variant="outline" 
                    onClick={() => setActiveTab('evaluation')}
                  >
                    View Evaluation
                  </Button>
                  <Button 
                    variant="primary" 
                    onClick={() => setActiveTab('predictions')}
                  >
                    Make Predictions
                  </Button>
                </div>
              </div>
            </Card>
          ) : (
            <ModelTrainingForm 
              model={selectedModel}
              algorithms={algorithms}
              trainingOptions={trainingOptions}
              onUpdateOptions={handleUpdateTrainingOptions}
              onSubmit={handleTrainModel}
              isLoading={isLoading}
            />
          )}
        </div>
      )}
      
      {/* Evaluation Tab Content */}
      {activeTab === 'evaluation' && (
        <div>
          {!selectedModel ? (
            <Card>
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Layers className="h-12 w-12 text-gray-300 mb-4" />
                <Heading level={4} className="mb-2 text-gray-700">No Model Selected</Heading>
                <Text variant="caption" className="text-gray-500 mb-6 max-w-md">
                  Please select a trained model to view its evaluation metrics.
                </Text>
                <Button 
                  variant="primary" 
                  onClick={() => setActiveTab('models')}
                >
                  Go to Models
                </Button>
              </div>
            </Card>
          ) : selectedModel.status !== 'trained' ? (
            <Card>
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-16 h-16 rounded-full bg-yellow-100 flex items-center justify-center mb-4">
                  <AlertCircle size={32} className="text-yellow-500" />
                </div>
                <Heading level={4} className="mb-2 text-gray-700">Model Not Trained</Heading>
                <Text variant="caption" className="text-gray-500 mb-6 max-w-md">
                  This model hasn't been trained yet. Please train the model to see evaluation metrics.
                </Text>
                <Button 
                  variant="primary" 
                  onClick={() => setActiveTab('training')}
                >
                  Go to Training
                </Button>
              </div>
            </Card>
          ) : (
            <ModelEvaluationPanel 
              model={selectedModel}
              featureImportance={featureImportance}
              isLoading={isLoading}
            />
          )}
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
      
      {/* Predictions Tab Content */}
      {activeTab === 'predictions' && (
        <Card>
          <Heading level={3} className="mb-4">Make Predictions</Heading>
          
          {!selectedModel ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Layers className="h-12 w-12 text-gray-300 mb-4" />
              <Heading level={4} className="mb-2 text-gray-700">No Model Selected</Heading>
              <Text variant="caption" className="text-gray-500 mb-6 max-w-md">
                Please select a trained model to make predictions.
              </Text>
              <Button 
                variant="primary" 
                onClick={() => setActiveTab('models')}
              >
                Go to Models
              </Button>
            </div>
          ) : selectedModel.status !== 'trained' ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-16 h-16 rounded-full bg-yellow-100 flex items-center justify-center mb-4">
                <AlertCircle size={32} className="text-yellow-500" />
              </div>
              <Heading level={4} className="mb-2 text-gray-700">Model Not Trained</Heading>
              <Text variant="caption" className="text-gray-500 mb-6 max-w-md">
                This model hasn't been trained yet. Please train the model before making predictions.
              </Text>
              <Button 
                variant="primary" 
                onClick={() => setActiveTab('training')}
              >
                Go to Training
              </Button>
            </div>
          ) : (
            <div className="py-8 text-center">
              <Text variant="caption" className="text-gray-500 mb-6 max-w-md mx-auto">
                Prediction functionality is coming soon! This feature will allow you to make 
                predictions on new data or explore what-if scenarios.
              </Text>
              <Button 
                variant="primary" 
                disabled
              >
                <Sliders size={16} className="mr-1" />
                Enter Prediction Data
              </Button>
            </div>
          )}
        </Card>
      )}
      
      {/* Model Creation Modal */}
      {showModelModal && (
        <ModelCreationModal
          onClose={() => setShowModelModal(false)}
          onCreateModel={handleCreateModel}
          datasets={datasets}
          networks={networks}
          algorithms={algorithms}
        />
      )}
    </div>
  );
};

export default MachineLearning;