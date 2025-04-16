import apiService from './api';
import { User, LoginCredentials, RegisterData, AuthResponse, ResetPasswordData } from '../../types/auth';

class AuthService {
  private static instance: AuthService;
  private readonly baseUrl = '/api/auth'; // This is correct now after backend fix
  private readonly tokenKey = 'access_token';
  private readonly refreshTokenKey = 'refresh_token';
  private refreshPromise: Promise<AuthResponse> | null = null;
  
  private constructor() {
    // Set up token refresh logic for expired tokens
    this.setupTokenRefresh();
  }
  
  public static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }
  
  private setupTokenRefresh() {
    // Add an axios interceptor to catch 401 errors and attempt token refresh
    apiService.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;
        
        // If the error is 401 (Unauthorized) and we haven't already tried refreshing the token
        if (error.response?.status === 401 && !originalRequest._retry) {
          // Mark that we've tried refreshing for this request
          originalRequest._retry = true;
          
          try {
            // Attempt to refresh the token
            const newToken = await this.refreshToken();
            
            if (newToken) {
              // Update the request with the new token
              originalRequest.headers.Authorization = `Bearer ${newToken}`;
              // Retry the request
              return apiService.api(originalRequest);
            }
          } catch (refreshError) {
            // If refresh fails, log out the user
            console.error('Token refresh failed:', refreshError);
            this.logout();
            
            // Redirect to login page
            window.location.href = '/login';
          }
        }
        
        // For other errors, just reject the promise
        return Promise.reject(error);
      }
    );
  }
  
  // Login user
  public async login(credentials: LoginCredentials): Promise<AuthResponse> {
    // FastAPI-Users expects x-www-form-urlencoded format for login
    const formData = new URLSearchParams();
    // Use standard OAuth2 fields exactly as the Swagger UI uses
    formData.append('grant_type', 'password');
    formData.append('username', credentials.username);
    formData.append('password', credentials.password);
    formData.append('scope', '');
    formData.append('client_id', 'string');
    formData.append('client_secret', 'string');
    
    console.log('Attempting login with credentials:', credentials.username);
    
    try {
      // First try enhanced endpoint with access & refresh tokens
      try {
        const response = await apiService.post<AuthResponse>(
          `${this.baseUrl}/login/access-refresh-token`, 
          formData.toString(),
          {
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded'
            }
          }
        );
        
        console.log('Auth response received from enhanced endpoint:', response);
        
        // Store both tokens
        if (response && response.access_token) {
          console.log('Storing tokens in localStorage');
          localStorage.setItem(this.tokenKey, response.access_token);
          
          if (response.refresh_token) {
            localStorage.setItem(this.refreshTokenKey, response.refresh_token);
          }
          
          return response;
        }
      } catch (enhancedError) {
        console.log('Enhanced login endpoint failed, trying standard endpoint', enhancedError);
      }
      
      // Fall back to regular login - the standard FastAPI-Users endpoint
      const fallbackResponse = await apiService.post<AuthResponse>(
        `${this.baseUrl}/login`, // Standard login endpoint from fastapi-users
        formData.toString(),
        {
          headers: {
            'accept': 'application/json',
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );
      
      // Store token
      if (fallbackResponse && fallbackResponse.access_token) {
        localStorage.setItem(this.tokenKey, fallbackResponse.access_token);
      }
      
      return fallbackResponse;
    } catch (error) {
      console.error('Login API error:', error);
      
      // Add better error handling for Network Error (CORS issues)
      if (error.message === 'Network Error') {
        console.error('Network Error - This may be a CORS issue or the server is not running');
        error.details = 'Unable to connect to the server. Please ensure the backend is running.';
      }
      
      throw error;
    }
  }
  
  // Register user
  public async register(userData: RegisterData): Promise<User> {
    // Form the complete registration data, using snake_case for backend compatibility
    const registrationData = {
      email: userData.email,
      username: userData.username,
      password: userData.password,
      is_active: true,
      is_superuser: false,
      is_verified: false
    };
    
    // Use the snake_case fields for backend compatibility
    if (userData.first_name || userData.firstName) {
      registrationData["first_name"] = userData.first_name || userData.firstName;
    }
    
    if (userData.last_name || userData.lastName) {
      registrationData["last_name"] = userData.last_name || userData.lastName;
    }
    
    console.log('Sending registration data:', registrationData);
    
    try {
      // Direct API call to avoid interceptors that might add Authorization headers
      const response = await apiService.post<User>(`${this.baseUrl}/register`, registrationData, {
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      console.log('Registration response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Registration failed:', error);
      
      if (error.response?.data) {
        console.error('Error response:', error.response.status, error.response.data);
        
        // If error contains validation errors from Pydantic, extract them
        if (error.response.data.detail && Array.isArray(error.response.data.detail)) {
          const validationErrors = error.response.data.detail.map(err => 
            `${err.loc.join('.')} - ${err.msg}`
          ).join('; ');
          
          error.message = validationErrors || error.message;
        } else if (typeof error.response.data === 'string') {
          error.message = error.response.data;
        } else if (error.response.data.detail) {
          error.message = error.response.data.detail;
        }
      } else if (error.message === 'Network Error') {
        // Add more descriptive information for CORS issues
        console.error('Network Error - This may be a CORS issue or the server is not running');
        error.message = 'Unable to connect to the server. Please ensure the backend is running.';
      }
      
      // Re-throw for proper error handling up the chain
      throw error;
    }
  }
  
  // Logout user
  public async logout(allDevices: boolean = false): Promise<void> {
    // Get the tokens before removing them
    const accessToken = localStorage.getItem(this.tokenKey);
    const refreshToken = localStorage.getItem(this.refreshTokenKey);
    
    // Remove tokens from localStorage
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.refreshTokenKey);
    
    // Call the logout API to blacklist the tokens
    try {
      await apiService.post(`${this.baseUrl}/logout`, {
        access_token: accessToken,
        refresh_token: refreshToken,
        all_devices: allDevices
      });
    } catch (error) {
      console.error('Error logging out:', error);
      // Even if the API call fails, we've already removed tokens from localStorage
    }
  }
  
  // Get current user
  public async getCurrentUser(): Promise<User> {
    return apiService.get<User>(`${this.baseUrl}/me`);
  }
  
  // Refresh token
  public async refreshToken(): Promise<string | null> {
    // If we're already refreshing, return the existing promise
    if (this.refreshPromise) {
      try {
        const response = await this.refreshPromise;
        return response.access_token;
      } catch (error) {
        return null;
      }
    }
    
    const refreshToken = localStorage.getItem(this.refreshTokenKey);
    if (!refreshToken) {
      return null;
    }
    
    // Create a new refresh promise
    this.refreshPromise = apiService.post<AuthResponse>(
      `${this.baseUrl}/refresh-token`,
      { refresh_token: refreshToken }
    );
    
    try {
      // Wait for the refresh request to complete
      const response = await this.refreshPromise;
      
      // Store the new tokens
      localStorage.setItem(this.tokenKey, response.access_token);
      localStorage.setItem(this.refreshTokenKey, response.refresh_token);
      
      // Clear the promise
      this.refreshPromise = null;
      
      // Return the new token
      return response.access_token;
    } catch (error) {
      // Clear the promise and return null
      this.refreshPromise = null;
      return null;
    }
  }
  
  // Check if user is authenticated
  public async checkAuth(): Promise<boolean> {
    try {
      // First check if we have tokens
      const hasToken = !!this.getToken();
      const hasRefreshToken = !!localStorage.getItem(this.refreshTokenKey);
      
      if (!hasToken && !hasRefreshToken) {
        return false;
      }
      
      // If we only have a refresh token, try to refresh
      if (!hasToken && hasRefreshToken) {
        const newToken = await this.refreshToken();
        if (!newToken) {
          return false;
        }
      }
      
      // Make an API call to verify the token
      const response = await apiService.get<{is_authenticated: boolean}>(`${this.baseUrl}/check-auth`);
      return response.is_authenticated;
    } catch (error) {
      // If the token is invalid and refresh fails, return false
      return false;
    }
  }
  
  // Request password reset
  public async requestPasswordReset(email: string): Promise<void> {
    return apiService.post(`${this.baseUrl}/forgot-password`, { email });
  }
  
  // Reset password
  public async resetPassword(data: ResetPasswordData): Promise<void> {
    return apiService.post(`${this.baseUrl}/reset-password`, data);
  }
  
  // Update user profile
  public async updateProfile(userId: number, data: Partial<User>): Promise<User> {
    return apiService.patch<User>(`/api/users/${userId}`, data);
  }
  
  // Get token from localStorage
  public getToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }
  
  // Get refresh token from localStorage
  public getRefreshToken(): string | null {
    return localStorage.getItem(this.refreshTokenKey);
  }
}

export const authService = AuthService.getInstance();
export default authService;