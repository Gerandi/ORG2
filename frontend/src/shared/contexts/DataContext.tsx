import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Dataset, ProcessingOptions, AnonymizationOptions } from '../../types/data';
import { dataService } from '../services';
import { useAuthContext } from './AuthContext';

interface DataContextProps {
  datasets: Dataset[];
  selectedDataset: Dataset | null;
  isLoading: boolean;
  error: string | null;
  fetchDatasets: () => Promise<void>;
  selectDataset: (id: number) => Promise<void>;
  createDataset: (dataset: Partial<Dataset>) => Promise<void>;
  updateDataset: (id: number, dataset: Partial<Dataset>) => Promise<void>;
  deleteDataset: (id: number) => Promise<void>;
  processDataset: (id: number, options: ProcessingOptions) => Promise<void>;
  anonymizeDataset: (id: number, options: AnonymizationOptions) => Promise<void>;
  uploadDataset: (file: File, name?: string) => Promise<void>;
}

const DataContext = createContext<DataContextProps | undefined>(undefined);

export const DataProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const { isAuthenticated } = useAuthContext();
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [selectedDataset, setSelectedDataset] = useState<Dataset | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  const fetchDatasets = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const data = await dataService.getDatasets();
      setDatasets(data);
    } catch (err) {
      setError('Failed to fetch datasets');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, []);
  
  const selectDataset = useCallback(async (id: number): Promise<void> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const dataset = await dataService.getDataset(id);
      setSelectedDataset(dataset);
    } catch (err) {
      setError('Failed to fetch dataset details');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, []);
  
  const createDataset = useCallback(async (dataset: Partial<Dataset>): Promise<void> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const newDataset = await dataService.createDataset(dataset);
      setDatasets(prevDatasets => [...prevDatasets, newDataset]);
    } catch (err) {
      setError('Failed to create dataset');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, []);
  
  const updateDataset = useCallback(async (id: number, dataset: Partial<Dataset>): Promise<void> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const updatedDataset = await dataService.updateDataset(id, dataset);
      setDatasets(prevDatasets => prevDatasets.map(d => d.id === id ? updatedDataset : d));
      
      if (selectedDataset?.id === id) {
        setSelectedDataset(updatedDataset);
      }
    } catch (err) {
      setError('Failed to update dataset');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [selectedDataset?.id]);
  
  const deleteDataset = useCallback(async (id: number): Promise<void> => {
    setIsLoading(true);
    setError(null);
    
    try {
      await dataService.deleteDataset(id);
      setDatasets(prevDatasets => prevDatasets.filter(d => d.id !== id));
      
      if (selectedDataset?.id === id) {
        setSelectedDataset(null);
      }
    } catch (err) {
      setError('Failed to delete dataset');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [selectedDataset?.id]);
  
  const processDataset = useCallback(async (id: number, options: ProcessingOptions): Promise<void> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const updatedDataset = await dataService.processDataset(id, options);
      setDatasets(prevDatasets => prevDatasets.map(d => d.id === id ? updatedDataset : d));
      
      if (selectedDataset?.id === id) {
        setSelectedDataset(updatedDataset);
      }
    } catch (err) {
      setError('Failed to process dataset');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [selectedDataset?.id]);
  
  const anonymizeDataset = useCallback(async (id: number, options: AnonymizationOptions): Promise<void> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const updatedDataset = await dataService.anonymizeDataset(id, options);
      setDatasets(prevDatasets => prevDatasets.map(d => d.id === id ? updatedDataset : d));
      
      if (selectedDataset?.id === id) {
        setSelectedDataset(updatedDataset);
      }
    } catch (err) {
      setError('Failed to anonymize dataset');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [selectedDataset?.id]);
  
  const uploadDataset = useCallback(async (file: File, name?: string): Promise<void> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const newDataset = await dataService.uploadDataset(file, name);
      setDatasets(prevDatasets => [...prevDatasets, newDataset]);
    } catch (err) {
      setError('Failed to upload dataset');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, []);
  
  useEffect(() => {
    if (isAuthenticated) {
      fetchDatasets();
    } else {
      // Clear data if not authenticated
      setDatasets([]);
      setSelectedDataset(null);
    }
  }, [fetchDatasets, isAuthenticated]);
  
  return (
    <DataContext.Provider
      value={{
        datasets,
        selectedDataset,
        isLoading,
        error,
        fetchDatasets,
        selectDataset,
        createDataset,
        updateDataset,
        deleteDataset,
        processDataset,
        anonymizeDataset,
        uploadDataset,
      }}
    >
      {children}
    </DataContext.Provider>
  );
};

export const useDataContext = (): DataContextProps => {
  const context = useContext(DataContext);
  
  if (context === undefined) {
    throw new Error('useDataContext must be used within a DataProvider');
  }
  
  return context;
};

export default DataContext;