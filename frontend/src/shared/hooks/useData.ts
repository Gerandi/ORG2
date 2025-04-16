import { useState, useCallback } from 'react';
import { useDataContext } from '../contexts/DataContext';
import { Dataset, DatasetPreview, ProcessingOptions, AnonymizationOptions } from '../../types/data';

export const useData = () => {
  const {
    datasets,
    selectedDataset,
    dataPreview,
    isLoading,
    error,
    fetchDatasets,
    selectDataset,
    uploadDataset,
    deleteDataset,
    previewDataset,
    processDataset,
    anonymizeDataset
  } = useDataContext();

  const [processingState, setProcessingState] = useState<Record<string, boolean>>({});
  const [localError, setLocalError] = useState<string | null>(null);

  // Helper to set processing state for specific actions
  const setProcessing = (action: string, state: boolean) => {
    setProcessingState(prev => ({ ...prev, [action]: state }));
  };

  // Enhanced dataset upload with progress tracking (if supported)
  const handleUploadDataset = useCallback(async (
    file: File, 
    name: string, 
    description?: string,
    onProgress?: (progress: number) => void
  ) => {
    setProcessing('upload', true);
    setLocalError(null);
    
    try {
      // Custom uploading with progress tracking could be implemented here
      // This would require modifying the dataService to support progress tracking
      const result = await uploadDataset(file, name, description);
      return result;
    } catch (error) {
      console.error('Error uploading dataset:', error);
      setLocalError('Failed to upload dataset');
      return null;
    } finally {
      setProcessing('upload', false);
    }
  }, [uploadDataset]);

  // Enhanced dataset processing with error handling
  const handleProcessDataset = useCallback(async (
    datasetId: number,
    options: ProcessingOptions
  ) => {
    setProcessing('process', true);
    setLocalError(null);
    
    try {
      const result = await processDataset(datasetId, options);
      return result;
    } catch (error) {
      console.error('Error processing dataset:', error);
      setLocalError('Failed to process dataset');
      return null;
    } finally {
      setProcessing('process', false);
    }
  }, [processDataset]);

  // Enhanced dataset anonymization with error handling
  const handleAnonymizeDataset = useCallback(async (
    datasetId: number,
    options: AnonymizationOptions
  ) => {
    setProcessing('anonymize', true);
    setLocalError(null);
    
    try {
      const result = await anonymizeDataset(datasetId, options);
      return result;
    } catch (error) {
      console.error('Error anonymizing dataset:', error);
      setLocalError('Failed to anonymize dataset');
      return null;
    } finally {
      setProcessing('anonymize', false);
    }
  }, [anonymizeDataset]);

  // Function to check file size and type before uploading
  const validateFile = useCallback((file: File): string | null => {
    // Maximum file size (10MB)
    const MAX_SIZE = 10 * 1024 * 1024;
    
    // Allowed file types
    const ALLOWED_TYPES = [
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/json'
    ];
    
    if (file.size > MAX_SIZE) {
      return `File size exceeds maximum allowed size (10MB)`;
    }
    
    if (!ALLOWED_TYPES.includes(file.type)) {
      return `File type not supported. Please upload CSV, Excel, or JSON files.`;
    }
    
    return null;
  }, []);

  return {
    datasets,
    selectedDataset,
    dataPreview,
    isLoading: isLoading || Object.values(processingState).some(Boolean),
    isProcessing: processingState,
    error: error || localError,
    fetchDatasets,
    selectDataset,
    uploadDataset: handleUploadDataset,
    deleteDataset,
    previewDataset,
    processDataset: handleProcessDataset,
    anonymizeDataset: handleAnonymizeDataset,
    validateFile
  };
};

export default useData;