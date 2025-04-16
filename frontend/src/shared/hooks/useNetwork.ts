import { useState, useCallback } from 'react';
import { useNetworkContext } from '../contexts/NetworkContext';
import { NetworkModel, NetworkData, NetworkMetrics, Communities } from '../../types/network';

export const useNetwork = () => {
  const {
    networks,
    selectedNetwork,
    networkData,
    networkMetrics,
    communities,
    error,
    isLoading,
    fetchNetworks,
    selectNetwork,
    createNetwork,
    updateNetwork,
    deleteNetwork,
    fetchNetworkData,
    calculateNetworkMetrics,
    detectCommunities,
    predictLinks
  } = useNetworkContext();

  const [processingState, setProcessingState] = useState<Record<string, boolean>>({});
  const [localError, setLocalError] = useState<string | null>(null);

  // Helper to set processing state for specific actions
  const setProcessing = (action: string, state: boolean) => {
    setProcessingState(prev => ({ ...prev, [action]: state }));
  };

  // Enhanced network selection with data loading
  const handleSelectNetwork = useCallback(async (id: number, loadData: boolean = true) => {
    setProcessing('select', true);
    setLocalError(null);
    
    try {
      await selectNetwork(id);
      
      if (loadData) {
        await fetchNetworkData(id);
      }
      
      return true;
    } catch (error) {
      console.error('Error selecting network:', error);
      setLocalError('Failed to load network data');
      return false;
    } finally {
      setProcessing('select', false);
    }
  }, [selectNetwork, fetchNetworkData]);

  // Enhanced metrics calculation with error handling
  const handleCalculateMetrics = useCallback(async (id: number, metrics: string[]) => {
    if (!metrics.length) return;
    
    setProcessing('metrics', true);
    setLocalError(null);
    
    try {
      await calculateNetworkMetrics(id, metrics);
      return true;
    } catch (error) {
      console.error('Error calculating network metrics:', error);
      setLocalError('Failed to calculate network metrics');
      return false;
    } finally {
      setProcessing('metrics', false);
    }
  }, [calculateNetworkMetrics]);

  // Enhanced community detection with error handling
  const handleDetectCommunities = useCallback(async (id: number, algorithm: string = 'louvain') => {
    setProcessing('communities', true);
    setLocalError(null);
    
    try {
      await detectCommunities(id, algorithm);
      return true;
    } catch (error) {
      console.error('Error detecting communities:', error);
      setLocalError('Failed to detect network communities');
      return false;
    } finally {
      setProcessing('communities', false);
    }
  }, [detectCommunities]);

  // Enhanced link prediction with error handling
  const handlePredictLinks = useCallback(async (id: number, method: string = 'common_neighbors', k: number = 10) => {
    setProcessing('prediction', true);
    setLocalError(null);
    
    try {
      const predictions = await predictLinks(id, method, k);
      return predictions;
    } catch (error) {
      console.error('Error predicting links:', error);
      setLocalError('Failed to predict network links');
      return null;
    } finally {
      setProcessing('prediction', false);
    }
  }, [predictLinks]);

  return {
    networks,
    selectedNetwork,
    networkData,
    networkMetrics,
    communities,
    error: error || localError,
    isLoading: isLoading || Object.values(processingState).some(Boolean),
    isProcessing: processingState,
    fetchNetworks,
    selectNetwork: handleSelectNetwork,
    createNetwork,
    updateNetwork,
    deleteNetwork,
    fetchNetworkData,
    calculateMetrics: handleCalculateMetrics,
    detectCommunities: handleDetectCommunities,
    predictLinks: handlePredictLinks
  };
};

export default useNetwork;