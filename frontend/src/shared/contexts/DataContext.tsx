import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Dataset, ProcessingOptions, AnonymizationOptions, TieStrengthDefinition } from '../../types/data';
import { dataService } from '../services';
import { useAuthContext } from './AuthContext';

// Define interfaces for preview and stats
interface DatasetPreview {
  columns: string[];
  data: any[];
  total_rows: number;
}

interface DatasetStats {
  row_count: number;
  column_count: number;
  missing_values: Record<string, number>;
  data_types: Record<string, string>;
  statistics: Record<string, any>;
}

interface DataContextProps {
  datasets: Dataset[];
  selectedDataset: Dataset | null;
  dataPreview: DatasetPreview | null;
  dataStats: DatasetStats | null;
  isLoading: boolean;
  error: string | null;
  fetchDatasets: (projectId?: number) => Promise<void>;
  selectDataset: (id: number) => Promise<void>;
  createDataset: (dataset: Partial<Dataset>) => Promise<void>;
  updateDataset: (id: number, dataset: Partial<Dataset>) => Promise<void>;
  deleteDataset: (id: number) => Promise<void>;
  processDataset: (id: number, options: ProcessingOptions) => Promise<void>;
  anonymizeDataset: (id: number, options: AnonymizationOptions) => Promise<void>;
  uploadDataset: (file: File, name?: string, projectId?: number | null) => Promise<void>;
  defineTieStrength: (id: number, definition: TieStrengthDefinition) => Promise<void>;
  getDatasetPreview: (id: number, limit?: number) => Promise<void>;
  getDatasetStats: (id: number) => Promise<void>;
}

const DataContext = createContext<DataContextProps | undefined>(undefined);

export const DataProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const { isAuthenticated } = useAuthContext();
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [selectedDataset, setSelectedDataset] = useState<Dataset | null>(null);
  const [dataPreview, setDataPreview] = useState<DatasetPreview | null>(null);
  const [dataStats, setDataStats] = useState<DatasetStats | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  const fetchDatasets = useCallback(async (projectId?: number): Promise<void> => {
    // If no project is selected, clear datasets and return
    if (projectId === undefined) {
      setDatasets([]);
      setSelectedDataset(null);
      setDataPreview(null);
      setDataStats(null);
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      const data = await dataService.getDatasets(projectId);
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
    // Reset preview and stats when selecting a new dataset
    setDataPreview(null);
    setDataStats(null);
    
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
  
  const getDatasetPreview = useCallback(async (id: number, limit: number = 100): Promise<void> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const preview = await dataService.getDatasetPreview(id, limit);
      setDataPreview(preview);
    } catch (err) {
      setError('Failed to fetch dataset preview');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, []);
  
  const getDatasetStats = useCallback(async (id: number): Promise<void> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const stats = await dataService.getDatasetStats(id);
      setDataStats(stats);
    } catch (err) {
      setError('Failed to fetch dataset statistics');
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
      // Improved error handling for 403 errors
      if (err.response && err.response.status === 403) {
        setError("You don't have permission to delete this dataset");
      } else {
        setError('Failed to delete dataset');
      }
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
      // Improved error handling for 403 errors
      if (err.response && err.response.status === 403) {
        setError("You don't have permission to process this dataset");
      } else {
        setError('Failed to process dataset');
      }
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
      // Improved error handling for 403 errors
      if (err.response && err.response.status === 403) {
        setError("You don't have permission to anonymize this dataset");
      } else {
        setError('Failed to anonymize dataset');
      }
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [selectedDataset?.id]);
  
  const uploadDataset = useCallback(async (file: File, name?: string, projectId?: number | null): Promise<void> => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Pass projectId to the dataService
      const newDataset = await dataService.uploadDataset(file, name, projectId);
      setDatasets(prevDatasets => [...prevDatasets, newDataset]);
    } catch (err) {
      setError('Failed to upload dataset');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, []);
  
  const defineTieStrength = useCallback(async (id: number, definition: TieStrengthDefinition): Promise<void> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const updatedDataset = await dataService.defineTieStrength(id, definition);
      setDatasets(prevDatasets => prevDatasets.map(d => d.id === id ? updatedDataset : d));
      
      if (selectedDataset?.id === id) {
        setSelectedDataset(updatedDataset);
      }
    } catch (err) {
      // Improved error handling for 403 errors
      if (err.response && err.response.status === 403) {
        setError("You don't have permission to modify this dataset's tie strength");
      } else {
        setError('Failed to define tie strength');
      }
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [selectedDataset?.id]);
  
  useEffect(() => {
    if (isAuthenticated) {
      fetchDatasets();
    } else {
      // Clear data if not authenticated
      setDatasets([]);
      setSelectedDataset(null);
      setDataPreview(null);
      setDataStats(null);
    }
  }, [fetchDatasets, isAuthenticated]);
  
  return (
    <DataContext.Provider
      value={{
        datasets,
        selectedDataset,
        dataPreview,
        dataStats,
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
        defineTieStrength,
        getDatasetPreview,
        getDatasetStats,
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