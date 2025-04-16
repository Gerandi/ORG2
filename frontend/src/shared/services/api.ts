import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';

export interface ApiError {
  status: number;
  message: string;
  details?: Record<string, unknown>;
}

class ApiService {
  public api: AxiosInstance; // Expose the axios instance for custom interceptors
  private static instance: ApiService;
  
  private constructor() {
    this.api = axios.create({
      baseURL: 'http://localhost:8000',
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 30000, // 30 seconds timeout
    });
    
    // Add request interceptor
    this.api.interceptors.request.use(
      (config) => {
        // Special case for authentication endpoints - never add a token
        const authEndpoints = ['/register', '/login'];
        const isAuthEndpoint = authEndpoints.some(endpoint => config.url?.includes(endpoint));
        
        if (isAuthEndpoint) {
          console.log(`Auth endpoint request: ${config.method?.toUpperCase()} ${config.url} - skipping auth token`);
          // Explicitly remove Authorization header to prevent conflicts
          if (config.headers) {
            delete config.headers.Authorization;
          }
          return config;
        }
        
        const token = localStorage.getItem('access_token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
          console.log(`Adding token to request: ${config.method?.toUpperCase()} ${config.url}`);
        } else {
          console.log(`Request without token: ${config.method?.toUpperCase()} ${config.url}`);
        }
        return config;
      },
      (error) => Promise.reject(this.handleError(error))
    );
    
    // Add response interceptor
    this.api.interceptors.response.use(
      (response) => {
        console.log(`Response success: ${response.config.method?.toUpperCase()} ${response.config.url}`);
        return response;
      },
      (error) => {
        // Handle common errors, like authentication issues
        const url = error.config?.url || 'unknown URL';
        const method = error.config?.method?.toUpperCase() || 'UNKNOWN';
        
        if (error.response?.status === 401) {
          // 401 handling is now in authService's token refresh interceptor
          console.error(`Authentication error (401) for ${method} ${url}: User is not authenticated`);
          console.log('Current token:', localStorage.getItem('access_token'));
        } else if (error.response?.status === 403) {
          console.error(`Authorization error (403) for ${method} ${url}: User does not have permission`);
        } else if (error.response?.status === 500) {
          console.error(`Server error (500) for ${method} ${url}:`, error.response?.data?.detail || 'Unknown server error');
        } else if (error.code === 'ECONNABORTED') {
          console.error(`Request timeout for ${method} ${url}: Server took too long to respond`);
        } else if (!error.response) {
          console.error(`Network error for ${method} ${url}: Unable to connect to server`);
        } else {
          console.error(`Error ${error.response?.status} for ${method} ${url}:`, error.response?.data);
        }
        
        return Promise.reject(this.handleError(error));
      }
    );
  }
  
  private handleError(error: AxiosError): ApiError {
    const apiError: ApiError = {
      status: error.response?.status || 500,
      message: 'An unknown error occurred',
      details: error.response?.data || error.message
    };
    
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      apiError.message = error.response.data?.detail || 
                         error.response.data?.message || 
                         `Error ${error.response.status}: ${error.response.statusText}`;
    } else if (error.request) {
      // The request was made but no response was received
      apiError.message = 'No response received from server';
    } else {
      // Something happened in setting up the request that triggered an Error
      apiError.message = error.message;
    }
    
    return apiError;
  }
  
  public static getInstance(): ApiService {
    if (!ApiService.instance) {
      ApiService.instance = new ApiService();
    }
    return ApiService.instance;
  }
  
  // Generic GET method
  public async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    try {
      const response: AxiosResponse<T> = await this.api.get(url, config);
      return response.data;
    } catch (error) {
      throw this.handleError(error as AxiosError);
    }
  }
  
  // Generic POST method
  public async post<T>(url: string, data?: Record<string, unknown> | FormData | unknown[], config?: AxiosRequestConfig): Promise<T> {
    try {
      const response: AxiosResponse<T> = await this.api.post(url, data, config);
      return response.data;
    } catch (error) {
      throw this.handleError(error as AxiosError);
    }
  }
  
  // Generic PUT method
  public async put<T>(url: string, data?: Record<string, unknown> | FormData, config?: AxiosRequestConfig): Promise<T> {
    try {
      const response: AxiosResponse<T> = await this.api.put(url, data, config);
      return response.data;
    } catch (error) {
      throw this.handleError(error as AxiosError);
    }
  }
  
  // Generic PATCH method
  public async patch<T>(url: string, data?: Record<string, unknown> | FormData, config?: AxiosRequestConfig): Promise<T> {
    try {
      const response: AxiosResponse<T> = await this.api.patch(url, data, config);
      return response.data;
    } catch (error) {
      throw this.handleError(error as AxiosError);
    }
  }
  
  // Generic DELETE method
  public async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    try {
      const response: AxiosResponse<T> = await this.api.delete(url, config);
      return response.data;
    } catch (error) {
      throw this.handleError(error as AxiosError);
    }
  }
}

export const apiService = ApiService.getInstance();
export default apiService;