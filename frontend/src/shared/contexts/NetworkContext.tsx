import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { NetworkModel, NetworkData, NetworkMetrics, Communities, VisualizationOptions } from '../../types/network';
import { networkService } from '../services';
import { useAuthContext } from './AuthContext';

interface NetworkContextProps {
  networks: NetworkModel[];
  selectedNetwork: NetworkModel | null;
  networkData: NetworkData | null;
  networkMetrics: NetworkMetrics | null;
  communities: Communities | null;
  predictedLinks: Array<{source: string, target: string, score: number}> | null;
  visualizationOptions: VisualizationOptions;
  isLoading: boolean;
  error: string | null;
  fetchNetworks: (projectId?: number) => Promise<void>;
  selectNetwork: (id: number) => Promise<void>;
  createNetwork: (network: Partial<NetworkModel>) => Promise<void>;
  updateNetwork: (id: number, network: Partial<NetworkModel>) => Promise<void>;
  deleteNetwork: (id: number) => Promise<void>;
  fetchNetworkData: (id: number) => Promise<void>;
  fetchNetworkMetrics: (id: number) => Promise<void>;
  calculateNetworkMetrics: (id: number, metrics: string[]) => Promise<void>;
  fetchCommunities: (id: number) => Promise<void>;
  detectCommunities: (id: number, algorithm: string) => Promise<void>;
  predictLinks: (id: number, method: string, k: number) => Promise<void>;
  updateVisualizationOptions: (options: Partial<VisualizationOptions>) => void;
}

const defaultVisualizationOptions: VisualizationOptions = {
  layout: {
    type: 'force',
    parameters: {}
  },
  node_size: {
    by: 'degree',
    scale: [5, 20]
  },
  node_color: {
    by: 'department',
    scale: ['#4F46E5', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4']
  },
  edge_width: {
    by: 'weight',
    scale: [1, 5]
  },
  show_labels: true,
  label_property: 'label',
  filters: {
    min_tie_strength: 0
  }
};

const NetworkContext = createContext<NetworkContextProps | undefined>(undefined);

export const NetworkProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const { isAuthenticated } = useAuthContext();
  const [networks, setNetworks] = useState<NetworkModel[]>([]);
  const [selectedNetwork, setSelectedNetwork] = useState<NetworkModel | null>(null);
  const [networkData, setNetworkData] = useState<NetworkData | null>(null);
  const [networkMetrics, setNetworkMetrics] = useState<NetworkMetrics | null>(null);
  const [communities, setCommunities] = useState<Communities | null>(null);
  const [predictedLinks, setPredictedLinks] = useState<Array<{source: string, target: string, score: number}> | null>(null);
  const [visualizationOptions, setVisualizationOptions] = useState<VisualizationOptions>(defaultVisualizationOptions);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  const fetchNetworks = useCallback(async (projectId?: number): Promise<void> => {
    // If no project is selected, clear networks and return
    if (projectId === undefined) {
      setNetworks([]);
      setSelectedNetwork(null);
      setNetworkData(null);
      setNetworkMetrics(null);
      setCommunities(null);
      setPredictedLinks(null);
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      const data = await networkService.getNetworks(projectId);
      setNetworks(data);
    } catch (err) {
      setError('Failed to fetch networks');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, []);
  
  const selectNetwork = useCallback(async (id: number): Promise<void> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const network = await networkService.getNetwork(id);
      setSelectedNetwork(network);
      
      // Reset related data
      setNetworkData(null);
      setNetworkMetrics(null);
      setCommunities(null);
    } catch (err) {
      setError('Failed to fetch network details');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, []);
  
  const createNetwork = useCallback(async (network: Partial<NetworkModel>): Promise<void> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const newNetwork = await networkService.createNetwork(network);
      setNetworks(prevNetworks => [...prevNetworks, newNetwork]);
    } catch (err) {
      setError('Failed to create network');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, []);
  
  const updateNetwork = useCallback(async (id: number, network: Partial<NetworkModel>): Promise<void> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const updatedNetwork = await networkService.updateNetwork(id, network);
      setNetworks(prevNetworks => prevNetworks.map(n => n.id === id ? updatedNetwork : n));
      
      if (selectedNetwork?.id === id) {
        setSelectedNetwork(updatedNetwork);
      }
    } catch (err) {
      setError('Failed to update network');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [selectedNetwork?.id]);
  
  const deleteNetwork = useCallback(async (id: number): Promise<void> => {
    setIsLoading(true);
    setError(null);
    
    try {
      await networkService.deleteNetwork(id);
      setNetworks(prevNetworks => prevNetworks.filter(n => n.id !== id));
      
      if (selectedNetwork?.id === id) {
        setSelectedNetwork(null);
        setNetworkData(null);
        setNetworkMetrics(null);
        setCommunities(null);
      }
    } catch (err) {
      setError('Failed to delete network');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [selectedNetwork?.id]);
  
  const fetchNetworkData = useCallback(async (id: number): Promise<void> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const data = await networkService.getNetworkData(id);
      setNetworkData(data);
    } catch (err) {
      setError('Failed to fetch network data');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, []);
  
  const fetchNetworkMetrics = useCallback(async (id: number): Promise<void> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const metrics = await networkService.getNetworkMetrics(id);
      setNetworkMetrics(metrics);
    } catch (err) {
      setError('Failed to fetch network metrics');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, []);
  
  const calculateNetworkMetrics = useCallback(async (id: number, metrics: string[]): Promise<void> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const calculatedMetrics = await networkService.calculateNetworkMetrics(id, metrics);
      setNetworkMetrics(calculatedMetrics);
    } catch (err) {
      setError('Failed to calculate network metrics');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, []);
  
  const fetchCommunities = useCallback(async (id: number): Promise<void> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const communityData = await networkService.getNetworkCommunities(id);
      setCommunities(communityData);
    } catch (err) {
      setError('Failed to fetch community detection results');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, []);
  
  const detectCommunities = useCallback(async (id: number, algorithm: string): Promise<void> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const communityData = await networkService.detectCommunities(id, algorithm);
      setCommunities(communityData);
    } catch (err) {
      setError('Failed to detect communities');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, []);
  
  const predictLinks = useCallback(async (id: number, method: string, k: number): Promise<void> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const results = await networkService.predictLinks(id, method, k);
      setPredictedLinks(results);
    } catch (err) {
      setError('Failed to predict links');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, []);
  
  const updateVisualizationOptions = useCallback((options: Partial<VisualizationOptions>): void => {
    setVisualizationOptions(prevOptions => ({
      ...prevOptions,
      ...options
    }));
  }, []);
  
  // Load networks on mount
  useEffect(() => {
    if (isAuthenticated) {
      fetchNetworks();
    } else {
      // Clear networks if not authenticated
      setNetworks([]);
      setSelectedNetwork(null);
      setNetworkData(null);
      setNetworkMetrics(null);
      setCommunities(null);
    }
  }, [fetchNetworks, isAuthenticated]);
  
  return (
    <NetworkContext.Provider
      value={{
        networks,
        selectedNetwork,
        networkData,
        networkMetrics,
        communities,
        predictedLinks,
        visualizationOptions,
        isLoading,
        error,
        fetchNetworks,
        selectNetwork,
        createNetwork,
        updateNetwork,
        deleteNetwork,
        fetchNetworkData,
        fetchNetworkMetrics,
        calculateNetworkMetrics,
        fetchCommunities,
        detectCommunities,
        predictLinks,
        updateVisualizationOptions
      }}
    >
      {children}
    </NetworkContext.Provider>
  );
};

export const useNetworkContext = (): NetworkContextProps => {
  const context = useContext(NetworkContext);
  
  if (context === undefined) {
    throw new Error('useNetworkContext must be used within a NetworkProvider');
  }
  
  return context;
};

export default NetworkContext;