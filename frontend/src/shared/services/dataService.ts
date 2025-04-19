import apiService from './api';
import { Dataset, ProcessingOptions, AnonymizationOptions, TieStrengthDefinition } from '../../types/data';

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

class DataService {
  private static instance: DataService;
  private readonly baseUrl = '/api/data';
  
  private constructor() {}
  
  public static getInstance(): DataService {
    if (!DataService.instance) {
      DataService.instance = new DataService();
    }
    return DataService.instance;
  }
  
  // Get all datasets
  public async getDatasets(projectId?: number): Promise<Dataset[]> {
    try {
      const url = projectId ? `${this.baseUrl}?project_id=${projectId}` : this.baseUrl;
      const datasets = await apiService.get<Dataset[]>(url);
      return datasets || [];
    } catch (error) {
      console.error('Error fetching datasets:', error);
      // If we get an authentication error, ensure we return an empty array instead of failing
      if (error.status === 401 || error.response?.status === 401) {
        console.warn('Authentication error fetching datasets, returning empty array');
        return [];
      }
      // Return empty array for any error to prevent UI crashes
      return [];
    }
  }
  
  // Get a single dataset by ID
  public async getDataset(id: number): Promise<Dataset> {
    try {
      return await apiService.get<Dataset>(`${this.baseUrl}/${id}`);
    } catch (error) {
      console.error(`Error fetching dataset ${id}:`, error);
      throw error;
    }
  }
  
  // Create a new dataset (metadata only)
  public async createDataset(dataset: Partial<Dataset>): Promise<Dataset> {
    try {
      return await apiService.post<Dataset>(this.baseUrl, dataset);
    } catch (error) {
      console.error('Error creating dataset:', error);
      throw error;
    }
  }
  
  // Update a dataset
  public async updateDataset(id: number, dataset: Partial<Dataset>): Promise<Dataset> {
    try {
      return await apiService.put<Dataset>(`${this.baseUrl}/${id}`, dataset);
    } catch (error) {
      console.error(`Error updating dataset ${id}:`, error);
      throw error;
    }
  }
  
  // Delete a dataset
  public async deleteDataset(id: number): Promise<void> {
    try {
      return await apiService.delete<void>(`${this.baseUrl}/${id}`);
    } catch (error) {
      console.error(`Error deleting dataset ${id}:`, error);
      throw error;
    }
  }
  
  // Process a dataset
  public async processDataset(id: number, options: ProcessingOptions): Promise<Dataset> {
    try {
      return await apiService.post<Dataset>(`${this.baseUrl}/${id}/process`, options);
    } catch (error) {
      console.error(`Error processing dataset ${id}:`, error);
      // Add more detailed error information
      if (error.status === 500) {
        // Log potential dataset structure that might be causing the issue
        console.error('Processing options that caused error:', JSON.stringify(options, null, 2));
      }
      throw error;
    }
  }
  
  // Anonymize a dataset
  public async anonymizeDataset(id: number, options: AnonymizationOptions): Promise<Dataset> {
    try {
      return await apiService.post<Dataset>(`${this.baseUrl}/${id}/anonymize`, options);
    } catch (error) {
      console.error(`Error anonymizing dataset ${id}:`, error);
      // Add more detailed error information
      if (error.status === 500) {
        // Log potential dataset structure that might be causing the issue
        console.error('Anonymization options that caused error:', JSON.stringify(options, null, 2));
      }
      throw error;
    }
  }
  
  // Upload a dataset file (using FormData)
  public async uploadDataset(file: File, name?: string, projectId?: number): Promise<Dataset> {
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      if (name) {
        formData.append('dataset_name', name);
      }
      
      if (projectId) {
        formData.append('project_id', projectId.toString());
      }
      
      return await apiService.post<Dataset>(`${this.baseUrl}/upload`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
    } catch (error) {
      console.error('Error uploading dataset:', error);
      throw error;
    }
  }
  
  // Get dataset preview (sample data)
  public async getDatasetPreview(id: number, limit: number = 100): Promise<DatasetPreview> {
    try {
      return await apiService.get<DatasetPreview>(`${this.baseUrl}/${id}/preview?limit=${limit}`);
    } catch (error) {
      console.error(`Error fetching dataset preview ${id}:`, error);
      throw error;
    }
  }
  
  // Get dataset statistics
  public async getDatasetStats(id: number): Promise<DatasetStats> {
    try {
      return await apiService.get<DatasetStats>(`${this.baseUrl}/${id}/stats`);
    } catch (error) {
      console.error(`Error fetching dataset stats ${id}:`, error);
      throw error;
    }
  }
  
  // Define network tie strength based on a dataset
  public async defineTieStrength(
    datasetId: number, 
    definition: TieStrengthDefinition
  ): Promise<any> {
    try {
      return await apiService.post<any>(
        `${this.baseUrl}/${datasetId}/tie-strength`, 
        definition
      );
    } catch (error) {
      console.error(`Error defining tie strength for dataset ${datasetId}:`, error);
      throw error;
    }
  }
  
  // Download a dataset
  public async downloadDataset(id: number, format: 'csv' | 'xlsx' | 'json' = 'csv'): Promise<Blob> {
    try {
      return await apiService.get<Blob>(
        `${this.baseUrl}/${id}/download?format=${format}`,
        {
          responseType: 'blob',
        }
      );
    } catch (error) {
      console.error(`Error downloading dataset ${id}:`, error);
      throw error;
    }
  }
}

export const dataService = DataService.getInstance();
export default dataService;