import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Network, Share2, Download, RefreshCw, Settings, Plus, FileText } from 'lucide-react';
import { Heading, Text } from '../components/atoms/Typography';
import Card from '../components/atoms/Card';
import Button from '../components/atoms/Button';
import Tabs from '../components/molecules/Tabs';
import { useNetworkContext } from '../shared/contexts';
import NetworkGraph from '../components/organisms/NetworkGraph';
import NetworkControls from '../components/organisms/NetworkControls';
import NetworkMetricsPanel from '../components/organisms/NetworkMetricsPanel';
import NetworkToolbar from '../components/organisms/NetworkToolbar';
import NetworkLegend from '../components/organisms/NetworkLegend';
import NetworkCreationModal from '../components/organisms/NetworkCreationModal';
import { Node, NetworkModel } from '../types/network';
import * as d3 from 'd3';

const SocialNetworkAnalysis: React.FC = () => {
  const [activeTab, setActiveTab] = useState('visualization');
  const [showMetricsPanel, setShowMetricsPanel] = useState(true);
  const [showControls, setShowControls] = useState(true);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [showNetworkModal, setShowNetworkModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [colorCategories, setColorCategories] = useState<Map<string, string>>(new Map());
  
  // Ref for SVG download
  const networkContainerRef = useRef<HTMLDivElement>(null);

  const { 
    networks, 
    selectedNetwork, 
    networkData, 
    networkMetrics, 
    communities, 
    visualizationOptions,
    isLoading,
    error,
    fetchNetworks,
    selectNetwork,
    createNetwork,
    fetchNetworkData,
    fetchNetworkMetrics,
    calculateNetworkMetrics,
    fetchCommunities,
    updateVisualizationOptions
  } = useNetworkContext();

  // Load networks on mount
  useEffect(() => {
    fetchNetworks();
  }, [fetchNetworks]);

  // Load network data when a network is selected
  useEffect(() => {
    if (selectedNetwork) {
      fetchNetworkData(selectedNetwork.id);
      fetchNetworkMetrics(selectedNetwork.id);
      fetchCommunities(selectedNetwork.id);
    }
  }, [selectedNetwork, fetchNetworkData, fetchNetworkMetrics, fetchCommunities]);

  // Update color categories for legend based on node color option
  useEffect(() => {
    if (!networkData?.nodes) return;
    
    const categories = new Map<string, string>();
    const colorScale = d3.scaleOrdinal(visualizationOptions.node_color.scale || d3.schemeCategory10);
    const colorBy = visualizationOptions.node_color.by;
    const attribute = visualizationOptions.node_color.attribute;
    
    networkData.nodes.forEach(node => {
      let category: string;
      
      if (colorBy === 'community' && communities) {
        // Find community for this node
        for (const [communityId, community] of Object.entries(communities.communities)) {
          if (community.nodes.includes(node.id)) {
            category = `Community ${communityId}`;
            if (!categories.has(category)) {
              categories.set(category, colorScale(communityId) as string);
            }
            break;
          }
        }
      } else if (colorBy === 'attribute' && attribute) {
        category = node.attributes[attribute]?.toString() || 'Unknown';
        if (!categories.has(category)) {
          categories.set(category, colorScale(category) as string);
        }
      } else {
        // Default to department
        category = node.attributes['department']?.toString() || 'Unknown';
        if (!categories.has(category)) {
          categories.set(category, colorScale(category) as string);
        }
      }
    });
    
    setColorCategories(categories);
  }, [networkData, visualizationOptions, communities]);

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
  };

  const handleNodeClick = (node: Node) => {
    setSelectedNode(node);
  };

  const handleCreateNetwork = async (networkData: any) => {
    await createNetwork(networkData);
    await fetchNetworks();
  };

  // UI Event Handlers
  const handleRefresh = () => {
    fetchNetworks();
    if (selectedNetwork) {
      fetchNetworkData(selectedNetwork.id);
      fetchNetworkMetrics(selectedNetwork.id);
      fetchCommunities(selectedNetwork.id);
    }
  };

  const handleDownload = useCallback(() => {
    if (!networkContainerRef.current) return;
    
    try {
      // Get the SVG element
      const svgElement = networkContainerRef.current.querySelector('svg');
      if (!svgElement) return;
      
      // Clone the SVG to avoid modifying the original
      const svgClone = svgElement.cloneNode(true) as SVGSVGElement;
      
      // Set width and height attributes
      svgClone.setAttribute('width', svgElement.clientWidth.toString());
      svgClone.setAttribute('height', svgElement.clientHeight.toString());
      
      // Convert SVG to a data URL
      const svgData = new XMLSerializer().serializeToString(svgClone);
      const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
      const svgUrl = URL.createObjectURL(svgBlob);
      
      // Create download link
      const downloadLink = document.createElement('a');
      downloadLink.href = svgUrl;
      downloadLink.download = `network_${selectedNetwork?.id || 'graph'}.svg`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
      URL.revokeObjectURL(svgUrl);
    } catch (error) {
      console.error('Error downloading SVG:', error);
    }
  }, [selectedNetwork]);

  const handleShareGraph = () => {
    // This would implement sharing functionality
    alert('Share functionality would be implemented here');
  };

  const handleZoomIn = () => {
    // This would be implemented via a ref to the NetworkGraph component
    alert('Zoom functionality would be implemented here');
  };

  const handleZoomOut = () => {
    // This would be implemented via a ref to the NetworkGraph component
    alert('Zoom functionality would be implemented here');
  };

  const handleResetView = () => {
    // This would be implemented via a ref to the NetworkGraph component
    alert('Reset view functionality would be implemented here');
  };

  const handleSearch = (term: string) => {
    // This would highlight nodes matching the search
    console.log('Searching for:', term);
  };

  const handleExportMetrics = () => {
    if (!networkMetrics) return;
    
    try {
      // Convert metrics to JSON string
      const metricsJson = JSON.stringify(networkMetrics, null, 2);
      const blob = new Blob([metricsJson], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      // Create download link
      const a = document.createElement('a');
      a.href = url;
      a.download = `network_${selectedNetwork?.id}_metrics.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting metrics:', error);
    }
  };

  const handleGenerateReport = () => {
    // This would generate a comprehensive network report
    alert('Report generation would be implemented here');
  };

  return (
    <div className="space-y-6">
      {/* Module Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <Network className="text-purple-600 mr-2" size={24} />
          <Heading level={2}>Social Network Analysis</Heading>
        </div>
        <div className="flex space-x-2">
          <Button 
            variant="outline" 
            className="flex items-center"
            onClick={handleRefresh}
            loading={isLoading}
          >
            <RefreshCw size={16} className="mr-1" />
            Refresh
          </Button>
          <Button 
            variant="outline" 
            className="flex items-center"
            onClick={handleDownload}
            disabled={!networkData}
          >
            <Download size={16} className="mr-1" />
            Export
          </Button>
          <Button 
            variant="primary" 
            className="flex items-center"
            style={{ backgroundColor: '#9333ea', borderColor: '#9333ea' }}
            onClick={() => setShowNetworkModal(true)}
          >
            <Plus size={16} className="mr-1" />
            New Network
          </Button>
        </div>
      </div>
      
      {/* Network Selection */}
      <Card padding="none" className="p-3">
        <div className="flex items-center">
          <div className="mr-3">
            <label htmlFor="network-select" className="block text-sm font-medium text-gray-700">
              Network:
            </label>
          </div>
          <select 
            id="network-select"
            className="w-full max-w-xs p-2 text-sm border border-gray-300 rounded-md"
            value={selectedNetwork?.id || ''}
            onChange={(e) => {
              const id = parseInt(e.target.value);
              if (!isNaN(id)) {
                selectNetwork(id);
              }
            }}
          >
            <option value="">Select a network</option>
            {networks.map(network => (
              <option key={network.id} value={network.id}>
                {network.name} ({network.node_count} nodes, {network.edge_count} edges)
              </option>
            ))}
          </select>
          
          {selectedNetwork && (
            <div className="ml-4 text-sm text-gray-500">
              Created: {new Date(selectedNetwork.created_at).toLocaleDateString()} | 
              Updated: {new Date(selectedNetwork.updated_at).toLocaleDateString()}
            </div>
          )}
        </div>
      </Card>
      
      {/* Error message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <div className="shrink-0">
              <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
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
          { id: 'visualization', label: 'Network Visualization' },
          { id: 'metrics', label: 'Network Metrics' },
          { id: 'communities', label: 'Community Detection' },
          { id: 'prediction', label: 'Link Prediction' },
          { id: 'dynamics', label: 'Dynamic Analysis' }
        ]}
        activeTab={activeTab}
        onChange={handleTabChange}
        variant="underline"
      />
      
      {/* Network Visualization Tab Content */}
      {activeTab === 'visualization' && (
        <div className="flex h-[calc(100vh-16rem)]">
          {/* Left Panel - Controls */}
          {showControls && (
            <div className="w-64 bg-white border-r border-gray-200 p-4 flex flex-col overflow-y-auto">
              <NetworkControls 
                visualizationOptions={visualizationOptions}
                onOptionsChange={updateVisualizationOptions}
                networkAttributes={{
                  departments: ['Marketing', 'Sales', 'Engineering', 'HR', 'Finance'],
                  roles: ['Manager', 'Director', 'Specialist', 'Assistant', 'Coordinator'],
                  otherAttributes: ['tenure', 'performance', 'team']
                }}
              />
            </div>
          )}
          
          {/* Center Panel - Network Visualization */}
          <div className="flex-1 relative flex flex-col" ref={networkContainerRef}>
            {/* Visualization Toolbar */}
            <NetworkToolbar 
              onZoomIn={handleZoomIn}
              onZoomOut={handleZoomOut}
              onReset={handleResetView}
              onDownload={handleDownload}
              onShareGraph={handleShareGraph}
              onToggleSettings={() => setShowControls(!showControls)}
              onToggleMetrics={() => setShowMetricsPanel(!showMetricsPanel)}
              onSearch={handleSearch}
              showMetricsPanel={showMetricsPanel}
              searchTerm={searchTerm}
              setSearchTerm={setSearchTerm}
            />
            
            {/* Network Visualization Canvas */}
            <div className="flex-1 bg-gray-50 relative">
              {isLoading && !networkData ? (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
                </div>
              ) : !networkData ? (
                <div className="absolute inset-0 flex items-center justify-center flex-col">
                  <Network className="h-16 w-16 text-gray-300 mb-4" />
                  <Text variant="caption" className="text-gray-400">
                    {networks.length > 0 
                      ? 'Select a network from the dropdown above' 
                      : 'No networks available. Create a new network to get started.'}
                  </Text>
                  {networks.length === 0 && (
                    <Button 
                      variant="primary" 
                      className="mt-4"
                      style={{ backgroundColor: '#9333ea', borderColor: '#9333ea' }}
                      onClick={() => setShowNetworkModal(true)}
                    >
                      <Plus size={16} className="mr-1" />
                      New Network
                    </Button>
                  )}
                </div>
              ) : (
                // Render the D3.js network graph
                <NetworkGraph
                  nodes={networkData.nodes}
                  edges={networkData.edges}
                  directed={networkData.directed}
                  weighted={networkData.weighted}
                  visualizationOptions={visualizationOptions}
                  onNodeClick={handleNodeClick}
                  width={networkContainerRef.current?.clientWidth}
                  height={networkContainerRef.current?.clientHeight}
                />
              )}
              
              {/* Legend */}
              {networkData && colorCategories.size > 0 && (
                <div className="absolute bottom-4 left-4">
                  <NetworkLegend 
                    visualizationOptions={visualizationOptions}
                    colorCategories={colorCategories}
                  />
                </div>
              )}
            </div>
          </div>
          
          {/* Right Panel - Node/Network Details */}
          {showMetricsPanel && (
            <div className="w-72 bg-white border-l border-gray-200 flex flex-col">
              <NetworkMetricsPanel 
                network={selectedNetwork}
                metrics={networkMetrics}
                communities={communities}
                selectedNode={selectedNode}
                onGenerateReport={handleGenerateReport}
                onExportMetrics={handleExportMetrics}
                isLoading={isLoading}
              />
            </div>
          )}
        </div>
      )}
      
      {/* Other tabs content */}
      {activeTab === 'metrics' && (
        <Card>
          <Heading level={3}>Network Metrics</Heading>
          <Text variant="caption" className="mt-2">
            Network metrics calculation and analysis tools will be implemented here.
          </Text>
        </Card>
      )}
      
      {activeTab === 'communities' && (
        <Card>
          <Heading level={3}>Community Detection</Heading>
          <Text variant="caption" className="mt-2">
            Community detection algorithms and visualization will be implemented here.
          </Text>
        </Card>
      )}
      
      {activeTab === 'prediction' && (
        <Card>
          <Heading level={3}>Link Prediction</Heading>
          <Text variant="caption" className="mt-2">
            Link prediction models and analysis will be implemented here.
          </Text>
        </Card>
      )}
      
      {activeTab === 'dynamics' && (
        <Card>
          <Heading level={3}>Dynamic Analysis</Heading>
          <Text variant="caption" className="mt-2">
            Dynamic network analysis tools and visualization will be implemented here.
          </Text>
        </Card>
      )}
      
      {/* Network Creation Modal */}
      {showNetworkModal && (
        <NetworkCreationModal
          onClose={() => setShowNetworkModal(false)}
          onCreateNetwork={handleCreateNetwork}
        />
      )}
    </div>
  );
};

export default SocialNetworkAnalysis;