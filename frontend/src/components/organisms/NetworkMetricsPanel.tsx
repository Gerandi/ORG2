import React from 'react';
import { BarChart2, User, Network, RefreshCw } from 'lucide-react';
import { Node, NetworkModel, NetworkMetrics, Communities } from '../../types/network';
import { Heading, Text } from '../atoms/Typography';
import Card from '../atoms/Card';
import Button from '../atoms/Button';
import { useNetworkContext } from '../../shared/contexts';

interface NetworkMetricsPanelProps {
  network: NetworkModel | null;
  metrics: NetworkMetrics | null;
  communities: Communities | null;
  selectedNode: Node | null;
  onGenerateReport?: () => void;
  onExportMetrics?: () => void;
  isLoading?: boolean;
}

const NetworkMetricsPanel: React.FC<NetworkMetricsPanelProps> = ({
  network,
  metrics,
  communities,
  selectedNode,
  onGenerateReport,
  onExportMetrics,
  isLoading = false
}) => {
  // Access the metrics calculation function from context
  const { calculateNetworkMetrics } = useNetworkContext();

  // Helper function to format metric values
  const formatMetric = (value: number | undefined): string => {
    if (value === undefined) return 'N/A';
    return typeof value === 'number' ? value.toFixed(3) : value.toString();
  };

  // Get node metrics for selected node
  const nodeMetrics = selectedNode && metrics?.node_metrics[selectedNode.id];

  // Get community for selected node
  const getNodeCommunity = (): string | null => {
    if (!selectedNode || !communities) return null;
    
    // Check if communities has node_community mapping
    if (communities.node_community && communities.node_community[selectedNode.id] !== undefined) {
      return communities.node_community[selectedNode.id].toString();
    }
    
    // Otherwise search through communities the old way
    const communityEntries = Object.entries(communities.communities || {});
    for (const [communityId, community] of communityEntries) {
      if (community.nodes.includes(selectedNode.id)) {
        return communityId;
      }
    }
    return null;
  };

  // Get top nodes by metric (e.g., degree, betweenness)
  const getTopNodesByMetric = (metric: 'degree' | 'betweenness' | 'closeness' | 'eigenvector', count: number = 5): Array<{id: string, value: number}> => {
    if (!metrics?.node_metrics) return [];
    
    return Object.entries(metrics.node_metrics)
      .map(([id, nodeMetrics]) => ({
        id,
        value: nodeMetrics[metric] || 0
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, count);
  };

  const handleRecalculateMetrics = () => {
    if (network) {
      calculateNetworkMetrics(network.id, ['all']);
    }
  };

  const topDegreeNodes = getTopNodesByMetric('degree');
  
  return (
    <div className="network-metrics-panel h-full flex flex-col">
      <div className="border-b border-gray-200 p-3 flex justify-between items-center">
        <Heading level={4}>Network Overview</Heading>
        <Button 
          variant="outline" 
          size="sm" 
          className="flex items-center"
          onClick={handleRecalculateMetrics}
          disabled={isLoading || !network}
        >
          <RefreshCw size={14} className="mr-1" />
          Recalculate
        </Button>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4">
        {isLoading ? (
          <div className="flex justify-center items-center h-48">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          </div>
        ) : !network ? (
          <div className="text-center py-8 text-gray-500">
            <Network className="mx-auto h-10 w-10 text-gray-400 mb-2" />
            <Text>No network selected</Text>
          </div>
        ) : (
          <>
            <div className="mb-5">
              <Heading level={5} className="mb-2 text-gray-700">Network Statistics</Heading>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Nodes:</span>
                  <span>{network.node_count}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Edges:</span>
                  <span>{network.edge_count}</span>
                </div>
                
                {metrics && (
                  <>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Density:</span>
                      <span>{formatMetric(metrics.global_metrics.density)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Avg. Clustering:</span>
                      <span>{formatMetric(metrics.global_metrics.clustering)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Avg. Path Length:</span>
                      <span>{formatMetric(metrics.global_metrics.average_path_length)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Diameter:</span>
                      <span>{formatMetric(metrics.global_metrics.diameter)}</span>
                    </div>
                    {metrics.global_metrics.modularity !== undefined && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Modularity:</span>
                        <span>{formatMetric(metrics.global_metrics.modularity)}</span>
                      </div>
                    )}
                  </>
                )}
                
                {communities && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Communities:</span>
                    <span>{communities.num_communities}</span>
                  </div>
                )}
              </div>
            </div>
            
            <div className="mb-5">
              <div className="flex justify-between items-center mb-2">
                <Heading level={5} className="text-gray-700">Top Nodes by Centrality</Heading>
                <button className="text-xs text-primary-600">View All</button>
              </div>
              
              {topDegreeNodes.length > 0 ? (
                <div className="border border-gray-200 rounded-md overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Node</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Degree</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Between.</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {topDegreeNodes.map((node) => (
                        <tr 
                          key={node.id} 
                          className={`hover:bg-gray-50 cursor-pointer ${selectedNode?.id === node.id ? 'bg-blue-50' : ''}`}
                        >
                          <td className="px-3 py-2 whitespace-nowrap text-xs font-medium">
                            {node.id}
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap text-xs">
                            {formatMetric(metrics?.node_metrics[node.id]?.degree)}
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap text-xs">
                            {formatMetric(metrics?.node_metrics[node.id]?.betweenness)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <Text variant="caption" className="text-gray-500">
                  No centrality metrics calculated yet
                </Text>
              )}
            </div>
            
            {selectedNode && (
              <div>
                <Heading level={5} className="mb-2 text-gray-700">Node Details</Heading>
                <div className="p-3 border border-gray-200 rounded-md bg-gray-50">
                  <div className="flex items-center mb-3">
                    <div className="w-8 h-8 rounded-full bg-primary-500 flex items-center justify-center text-white font-medium">
                      {selectedNode.id.substring(1)}
                    </div>
                    <div className="ml-2">
                      <div className="text-sm font-medium">{selectedNode.label || selectedNode.id}</div>
                      <div className="text-xs text-gray-500">
                        {selectedNode.attributes?.role || 'No role'} • {selectedNode.attributes?.department || 'No department'}
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-2 text-sm">
                    {Object.entries(selectedNode.attributes || {}).map(([key, value]) => (
                      <div key={key} className="flex justify-between">
                        <span className="text-gray-500">{key}:</span>
                        <span>{value?.toString() || 'N/A'}</span>
                      </div>
                    ))}
                    
                    {getNodeCommunity() && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">Community:</span>
                        <span>{getNodeCommunity()}</span>
                      </div>
                    )}
                  </div>
                  
                  {nodeMetrics && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <div className="text-sm font-medium mb-2">Centrality Metrics</div>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-500">Degree:</span>
                          <span>{formatMetric(nodeMetrics.degree)}</span>
                        </div>
                        {nodeMetrics.betweenness !== undefined && (
                          <div className="flex justify-between">
                            <span className="text-gray-500">Betweenness:</span>
                            <span>{formatMetric(nodeMetrics.betweenness)}</span>
                          </div>
                        )}
                        {nodeMetrics.closeness !== undefined && (
                          <div className="flex justify-between">
                            <span className="text-gray-500">Closeness:</span>
                            <span>{formatMetric(nodeMetrics.closeness)}</span>
                          </div>
                        )}
                        {nodeMetrics.eigenvector !== undefined && (
                          <div className="flex justify-between">
                            <span className="text-gray-500">Eigenvector:</span>
                            <span>{formatMetric(nodeMetrics.eigenvector)}</span>
                          </div>
                        )}
                        {nodeMetrics.clustering !== undefined && (
                          <div className="flex justify-between">
                            <span className="text-gray-500">Clustering:</span>
                            <span>{formatMetric(nodeMetrics.clustering)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
      
      <div className="p-3 border-t border-gray-200">
        <div className="flex space-x-2">
          <Button
            variant="primary"
            size="sm"
            className="flex-1"
            onClick={onGenerateReport}
            disabled={!network || isLoading}
          >
            Network Report
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={onExportMetrics}
            disabled={!metrics || isLoading}
          >
            Export Metrics
          </Button>
        </div>
      </div>
    </div>
  );
};

export default NetworkMetricsPanel;