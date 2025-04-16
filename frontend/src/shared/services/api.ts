import axios, { AxiosError, AxiosResponse } from 'axios';

interface ApiError {
  status: number;
  message: string;
  details?: any;
}

const apiService = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor
apiService.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
apiService.interceptors.response.use(
  (response: AxiosResponse) => {
    return response.data;
  },
  (error: AxiosError) => {
    const apiError: ApiError = {
      status: error.response?.status || (error.code === 'ECONNABORTED' ? 408 : 500), // Prioritize response status, handle timeout
      message: error.response?.data?.message || error.message || 'An unknown error occurred',
      details: error.response?.data?.details || undefined
    };
    
    // Handle specific error cases
    switch (apiError.status) {
      case 401:
        // Unauthorized - clear any local authentication state
        localStorage.removeItem('access_token');
        localStorage.removeItem('user');
        break;
      case 403:
        // Forbidden - user is authenticated but doesn't have permission
        console.warn('Access forbidden:', apiError.message);
        break;
      case 408:
        // Request timeout
        console.warn('Request timeout:', apiError.message);
        break;
      case 429:
        // Too many requests
        console.warn('Rate limit exceeded:', apiError.message);
        break;
    }
    
    return Promise.reject(apiError);
  }
);

export default apiService;