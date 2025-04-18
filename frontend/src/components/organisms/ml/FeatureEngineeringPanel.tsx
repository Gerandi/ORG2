import React, { useState, useEffect } from 'react';
import { Heading, Text } from '../../../components/atoms/Typography';
import Card from '../../../components/atoms/Card';
import Button from '../../../components/atoms/Button';
import { Sliders, ArrowLeft, Network, Share2, CheckCircle, XCircle, Info, ArrowRight } from 'lucide-react';
import { Dataset } from '../../../types/data';
import { Network as NetworkType } from '../../../types/network';

interface FeatureEngineeringPanelProps {
  selectedDataset: Dataset;
  networks: NetworkType[];
  onFeaturesPrepared: (preparedDataId: number) => void;
  onBack: () => void;
  isLoading?: boolean;
}

const NETWORK_METRICS = [
  { id: 'degree_centrality', name: 'Degree Centrality', description: 'Measures the number of direct connections a node has' },
  { id: 'betweenness_centrality', name: 'Betweenness Centrality', description: 'Measures how often a node appears on shortest paths between other nodes' },
  { id: 'closeness_centrality', name: 'Closeness Centrality', description: 'Measures the average distance from a node to all other nodes' },
  { id: 'eigenvector_centrality', name: 'Eigenvector Centrality', description: 'Measures the influence of a node based on the connections of its connections' },
  { id: 'clustering_coefficient', name: 'Clustering Coefficient', description: 'Measures how clustered the connections of a node are' },
  { id: 'effective_size', name: 'Effective Size', description: 'Measures the non-redundant contacts in a node\'s network' },
  { id: 'constraint', name: 'Constraint', description: 'Measures how constrained a node is within its local network' }
];

const DEFAULT_TEST_SIZE = 0.2;

const FeatureEngineeringPanel: React.FC<FeatureEngineeringPanelProps> = ({ 
  selectedDataset, 
  networks, 
  onFeaturesPrepared, 
  onBack, 
  isLoading = false 
}) => {
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([]);
  const [selectedNetworkId, setSelectedNetworkId] = useState<number | null>(null);
  const [selectedNetworkMetrics, setSelectedNetworkMetrics] = useState<string[]>([]);
  const [testSize, setTestSize] = useState<number>(DEFAULT_TEST_SIZE);
  const [error, setError] = useState<string | null>(null);
  const [selectAllFeatures, setSelectAllFeatures] = useState<boolean>(true);

  // Get filtered networks for the current project
  const filteredNetworks = networks.filter(n => 
    n.project_id === selectedDataset.project_id
  );

  // Get selected network
  const selectedNetwork = filteredNetworks.find(n => n.id === selectedNetworkId);

  // Initialize selected features when dataset changes
  useEffect(() => {
    if (selectedDataset && selectedDataset.columns) {
      setSelectedFeatures(selectedDataset.columns);
      setSelectAllFeatures(true);
    } else {
      setSelectedFeatures([]);
    }
  }, [selectedDataset]);

  const handleFeatureChange = (feature: string) => {
    if (selectedFeatures.includes(feature)) {
      setSelectedFeatures(selectedFeatures.filter(f => f !== feature));
      setSelectAllFeatures(false);
    } else {
      setSelectedFeatures([...selectedFeatures, feature]);
      if (selectedFeatures.length + 1 === selectedDataset.columns?.length) {
        setSelectAllFeatures(true);
      }
    }
  };

  const handleToggleAllFeatures = () => {
    if (selectAllFeatures) {
      setSelectedFeatures([]);
      setSelectAllFeatures(false);
    } else {
      setSelectedFeatures(selectedDataset.columns || []);
      setSelectAllFeatures(true);
    }
  };

  const handleNetworkChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const networkId = parseInt(e.target.value);
    setSelectedNetworkId(isNaN(networkId) ? null : networkId);
    setSelectedNetworkMetrics([]); // Reset network metrics when network changes
  };

  const handleNetworkMetricToggle = (metricId: string) => {
    if (selectedNetworkMetrics.includes(metricId)) {
      setSelectedNetworkMetrics(selectedNetworkMetrics.filter(id => id !== metricId));
    } else {
      setSelectedNetworkMetrics([...selectedNetworkMetrics, metricId]);
    }
  };

  const handleTestSizeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    if (!isNaN(value) && value >= 0.1 && value <= 0.5) {
      setTestSize(value);
    }
  };

  const handlePrepareData = () => {
    if (selectedFeatures.length === 0) {
      setError('Please select at least one feature');
      return;
    }
    
    if (selectedNetworkId && selectedNetworkMetrics.length === 0) {
      setError('Please select at least one network metric or deselect the network');
      return;
    }
    
    setError(null);
    // The actual API call is handled by the parent component
    // We just notify it with the selected parameters
    onFeaturesPrepared({
      datasetId: selectedDataset.id,
      features: selectedFeatures,
      networkId: selectedNetworkId,
      networkMetrics: selectedNetworkMetrics,
      testSize: testSize
    });
  };

  return (
    <Card className="pb-6">
      <div className="flex items-center mb-4">
        <Sliders className="mr-2 text-blue-600" size={24} />
        <Heading level={3}>Feature Engineering</Heading>
      </div>
      
      <Text variant="p" className="mb-6 text-gray-600">
        Select features and customize your dataset for machine learning.
      </Text>
      
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-3 mb-4">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}
      
      <div className="space-y-8">
        {/* Dataset Info */}
        <div className="bg-blue-50 p-4 rounded-md border border-blue-100">
          <p className="font-medium text-blue-800 mb-1">Selected Dataset</p>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <span className="text-gray-600">Name:</span> {selectedDataset.name}
            </div>
            <div>
              <span className="text-gray-600">Rows:</span> {selectedDataset.rows}
            </div>
            <div>
              <span className="text-gray-600">Columns:</span> {selectedDataset.columns?.length || 'Unknown'}
            </div>
          </div>
        </div>
        
        {/* Feature Selection */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center">
              <Heading level={4} className="mr-1">Feature Selection</Heading>
              <div className="ml-1 group relative">
                <Info size={16} className="text-gray-400 cursor-help" />
                <div className="invisible group-hover:visible absolute left-0 top-6 p-2 bg-gray-800 text-white text-xs rounded w-64 z-10">
                  Select the columns from your dataset to use as features for your model
                </div>
              </div>
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={handleToggleAllFeatures}
            >
              {selectAllFeatures ? 'Deselect All' : 'Select All'}
            </Button>
          </div>
          
          <div className="bg-gray-50 p-4 rounded-md border border-gray-200 max-h-64 overflow-y-auto">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {selectedDataset.columns?.map(column => (
                <div key={column} className="flex items-center">
                  <input
                    type="checkbox"
                    id={`feature-${column}`}
                    checked={selectedFeatures.includes(column)}
                    onChange={() => handleFeatureChange(column)}
                    className="mr-2 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    disabled={isLoading}
                  />
                  <label htmlFor={`feature-${column}`} className="text-sm text-gray-700">
                    {column}
                  </label>
                </div>
              ))}
            </div>
          </div>
          
          <div className="mt-1 text-sm text-gray-500">
            Selected {selectedFeatures.length} of {selectedDataset.columns?.length || 0} features
          </div>
        </div>
        
        {/* Network Integration */}
        <div>
          <div className="flex items-center mb-2">
            <Heading level={4} className="mr-1">Network Integration</Heading>
            <div className="ml-1 group relative">
              <Info size={16} className="text-gray-400 cursor-help" />
              <div className="invisible group-hover:visible absolute left-0 top-6 p-2 bg-gray-800 text-white text-xs rounded w-64 z-10">
                Incorporate network metrics as additional features for your model
              </div>
            </div>
          </div>
          
          {filteredNetworks.length === 0 ? (
            <div className="bg-gray-50 border border-gray-200 rounded-md p-4 text-center">
              <Share2 className="mx-auto mb-2 text-gray-400" size={24} />
              <Text className="text-gray-500">
                No networks available for the current project
              </Text>
            </div>
          ) : (
            <>
              <div className="mb-4">
                <label htmlFor="network-select" className="block text-sm font-medium text-gray-700 mb-1">
                  Select Network (Optional)
                </label>
                <select
                  id="network-select"
                  className="w-full p-2 border border-gray-300 rounded-md"
                  value={selectedNetworkId || ''}
                  onChange={handleNetworkChange}
                  disabled={isLoading}
                >
                  <option value="">None (No network metrics)</option>
                  {filteredNetworks.map(network => (
                    <option key={network.id} value={network.id}>
                      {network.name} ({network.node_count} nodes, {network.edge_count} edges)
                    </option>
                  ))}
                </select>
              </div>
              
              {selectedNetworkId && (
                <>
                  <div className="mb-2 text-sm font-medium text-gray-700">
                    Select Network Metrics
                  </div>
                  <div className="bg-gray-50 p-4 rounded-md border border-gray-200 max-h-52 overflow-y-auto">
                    <div className="space-y-2">
                      {NETWORK_METRICS.map(metric => (
                        <div key={metric.id} className="flex items-start">
                          <input
                            type="checkbox"
                            id={`metric-${metric.id}`}
                            checked={selectedNetworkMetrics.includes(metric.id)}
                            onChange={() => handleNetworkMetricToggle(metric.id)}
                            className="mt-1 mr-2 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            disabled={isLoading}
                          />
                          <label htmlFor={`metric-${metric.id}`} className="text-sm">
                            <span className="font-medium text-gray-700">{metric.name}</span>
                            <p className="text-gray-500 text-xs">{metric.description}</p>
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </>
          )}
        </div>
        
        {/* Data Splitting */}
        <div>
          <div className="flex items-center mb-2">
            <Heading level={4} className="mr-1">Data Splitting</Heading>
            <div className="ml-1 group relative">
              <Info size={16} className="text-gray-400 cursor-help" />
              <div className="invisible group-hover:visible absolute left-0 top-6 p-2 bg-gray-800 text-white text-xs rounded w-64 z-10">
                Define how to split your data into training and testing sets
              </div>
            </div>
          </div>
          
          <div className="bg-gray-50 p-4 rounded-md border border-gray-200">
            <div>
              <label htmlFor="test-size" className="block text-sm font-medium text-gray-700 mb-1">
                Test Size: {testSize * 100}%
              </label>
              <input
                id="test-size"
                type="range"
                min="0.1"
                max="0.5"
                step="0.05"
                value={testSize}
                onChange={handleTestSizeChange}
                className="w-full"
                disabled={isLoading}
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>Small (10%)</span>
                <span>Balanced (20%)</span>
                <span>Large (50%)</span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Action Buttons */}
        <div className="pt-4 flex justify-between">
          <Button
            variant="outline"
            onClick={onBack}
            disabled={isLoading}
          >
            <ArrowLeft size={16} className="mr-1" />
            Back to Data Selection
          </Button>
          
          <Button
            variant="primary"
            onClick={handlePrepareData}
            disabled={isLoading || selectedFeatures.length === 0}
            loading={isLoading}
          >
            <ArrowRight size={16} className="mr-1" />
            Prepare Data
          </Button>
        </div>
      </div>
    </Card>
  );
};

export default FeatureEngineeringPanel;