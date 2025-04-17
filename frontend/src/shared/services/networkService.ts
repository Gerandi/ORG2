import apiService from './api';
import { NetworkModel, NetworkData, NetworkMetrics, Communities } from '../../types/network';

interface NetworkFormData {
  dataset_id?: number;
  name: string;
  description?: string;
  directed: boolean;
  weighted: boolean;
  source_col?: string;
  target_col?: string;
  weight_col?: string;
}

class NetworkService {
  private static instance: NetworkService;
  private readonly baseUrl = '/api/network';
  
  private constructor() {}
  
  public static getInstance(): NetworkService {
    if (!NetworkService.instance) {
      NetworkService.instance = new NetworkService();
    }
    return NetworkService.instance;
  }
  
  // Get all network models
  public async getNetworks(projectId?: number): Promise<NetworkModel[]> {
    try {
      const url = projectId ? `${this.baseUrl}?project_id=${projectId}` : this.baseUrl;
      return await apiService.get<NetworkModel[]>(url);
    } catch (error) {
      console.error('Error fetching networks:', error);
      throw error;
    }
  }
  
  // Get a single network model by ID
  public async getNetwork(id: number): Promise<NetworkModel> {
    try {
      return await apiService.get<NetworkModel>(`${this.baseUrl}/${id}`);
    } catch (error) {
      console.error(`Error fetching network ${id}:`, error);
      throw error;
    }
  }
  
  // Create a new network model
  public async createNetwork(networkData: NetworkFormData): Promise<NetworkModel> {
    try {
      const formData = new FormData();
      
      // Add required fields
      formData.append('name', networkData.name);
      formData.append('directed', String(networkData.directed));
      formData.append('weighted', String(networkData.weighted));
      
      // Add optional fields
      if (networkData.dataset_id) {
        formData.append('dataset_id', String(networkData.dataset_id));
      }
      
      if (networkData.description) {
        formData.append('description', networkData.description);
      }
      
      if (networkData.source_col) {
        formData.append('source_col', networkData.source_col);
      }
      
      if (networkData.target_col) {
        formData.append('target_col', networkData.target_col);
      }
      
      if (networkData.weight_col) {
        formData.append('weight_col', networkData.weight_col);
      }
      
      return await apiService.post<NetworkModel>(this.baseUrl, formData);
    } catch (error) {
      console.error('Error creating network:', error);
      throw error;
    }
  }
  
  // Upload a network file directly
  public async uploadNetwork(file: File, name: string, description?: string, directed: boolean = false, weighted: boolean = false): Promise<NetworkModel> {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('name', name);
      formData.append('directed', String(directed));
      formData.append('weighted', String(weighted));
      
      if (description) {
        formData.append('description', description);
      }
      
      return await apiService.post<NetworkModel>(`${this.baseUrl}/upload`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
    } catch (error) {
      console.error('Error uploading network file:', error);
      throw error;
    }
  }
  
  // Update a network model
  public async updateNetwork(id: number, network: Partial<NetworkModel>): Promise<NetworkModel> {
    try {
      return await apiService.put<NetworkModel>(`${this.baseUrl}/${id}`, network);
    } catch (error) {
      console.error(`Error updating network ${id}:`, error);
      throw error;
    }
  }
  
  // Delete a network model
  public async deleteNetwork(id: number): Promise<void> {
    try {
      return await apiService.delete<void>(`${this.baseUrl}/${id}`);
    } catch (error) {
      console.error(`Error deleting network ${id}:`, error);
      throw error;
    }
  }
  
  // Get metrics for a network
  public async getNetworkMetrics(id: number): Promise<NetworkMetrics> {
    try {
      return await apiService.get<NetworkMetrics>(`${this.baseUrl}/${id}/metrics`);
    } catch (error) {
      console.error(`Error fetching network metrics for ${id}:`, error);
      throw error;
    }
  }
  
  // Calculate metrics for a network
  public async calculateNetworkMetrics(id: number, metrics: string[]): Promise<NetworkMetrics> {
    try {
      return await apiService.post<NetworkMetrics>(`${this.baseUrl}/${id}/metrics/calculate`, { metrics });
    } catch (error) {
      console.error(`Error calculating network metrics for ${id}:`, error);
      throw error;
    }
  }
  
  // Get community detection results for a network
  public async getNetworkCommunities(id: number): Promise<Communities> {
    try {
      return await apiService.get<Communities>(`${this.baseUrl}/${id}/communities`);
    } catch (error) {
      console.error(`Error fetching communities for network ${id}:`, error);
      throw error;
    }
  }
  
  // Detect communities in a network
  public async detectCommunities(id: number, algorithm: string = 'louvain'): Promise<Communities> {
    try {
      return await apiService.post<Communities>(`${this.baseUrl}/${id}/communities/detect`, { algorithm });
    } catch (error) {
      console.error(`Error detecting communities for network ${id}:`, error);
      throw error;
    }
  }
  
  // Get the actual network data (nodes and edges) for visualization
  public async getNetworkData(id: number): Promise<NetworkData> {
    try {
      return await apiService.get<NetworkData>(`${this.baseUrl}/${id}/data`);
    } catch (error) {
      console.error(`Error fetching network data for ${id}:`, error);
      throw error;
    }
  }
  
  // Predict links in a network
  public async predictLinks(id: number, method: string = 'common_neighbors', k: number = 10): Promise<any> {
    try {
      return await apiService.post<any>(`${this.baseUrl}/${id}/link-prediction`, { method, k });
    } catch (error) {
      console.error(`Error predicting links for network ${id}:`, error);
      throw error;
    }
  }
  
  // Export network to different formats
  public async exportNetwork(id: number, formats: string[] = ['graphml', 'gexf', 'json']): Promise<any> {
    try {
      return await apiService.post<any>(`${this.baseUrl}/${id}/export`, { formats });
    } catch (error) {
      console.error(`Error exporting network ${id}:`, error);
      throw error;
    }
  }
  
  // Calculate homophily for a given attribute
  public async calculateHomophily(id: number, attribute: string): Promise<any> {
    try {
      return await apiService.post<any>(`${this.baseUrl}/${id}/homophily`, { attribute });
    } catch (error) {
      console.error(`Error calculating homophily for network ${id}:`, error);
      throw error;
    }
  }
}

export const networkService = NetworkService.getInstance();
export default networkService;