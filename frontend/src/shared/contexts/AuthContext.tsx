import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User, LoginCredentials, RegisterData } from '../../types/auth';
import { authService } from '../services';

interface AuthContextProps {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => void;
  updateProfile: (data: Partial<User>) => Promise<void>;
  checkAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextProps | undefined>(undefined);

export const AuthProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  const login = useCallback(async (credentials: LoginCredentials): Promise<void> => {
    setIsLoading(true);
    setError(null);
    
    try {
      await authService.login(credentials);
      const currentUser = await authService.getCurrentUser();
      setUser(currentUser);
      setIsAuthenticated(true);
    } catch (err) {
      setError('Authentication failed. Please check your credentials.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, []);
  
  const register = useCallback(async (data: RegisterData): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('AuthContext: Attempting to register with:', data.username, data.email);
      const registeredUser = await authService.register(data);
      console.log('AuthContext: Registration successful:', registeredUser);
      
      try {
        console.log('AuthContext: Attempting login after registration');
        // Automatically log in after registration
        await login({ username: data.username, password: data.password });
        return true;
      } catch (loginErr) {
        console.error('AuthContext: Auto-login after registration failed:', loginErr);
        // Even if login fails, registration was successful
        setError('Registration successful, but automatic login failed. Please try logging in manually.');
        return true;
      }
    } catch (err: any) {
      console.error('AuthContext: Registration error details:', err);
      
      // Try to extract error message from various formats
      if (err.response?.data) {
        const errorData = err.response.data;
        console.error('AuthContext: Error response data:', errorData);
        
        if (typeof errorData === 'string') {
          setError(errorData);
        } else if (errorData.detail) {
          if (Array.isArray(errorData.detail)) {
            setError(errorData.detail.map((d: any) => d.msg || d).join(', '));
          } else {
            setError(String(errorData.detail));
          }
        } else {
          setError(JSON.stringify(errorData));
        }
      } else if (err.details) {
        setError(typeof err.details === 'string' ? err.details : JSON.stringify(err.details));
      } else if (err.message) {
        setError(`Registration failed: ${err.message}`);
      } else {
        setError('Registration failed. Please check your data and try again.');
      }
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [login]);
  
  const logout = useCallback((): void => {
    authService.logout();
    setUser(null);
    setIsAuthenticated(false);
  }, []);
  
  const updateProfile = useCallback(async (data: Partial<User>): Promise<void> => {
    setIsLoading(true);
    setError(null);
    
    try {
      if (user) {
        const updatedUser = await authService.updateProfile(user.id, data);
        setUser(updatedUser);
      }
    } catch (err) {
      setError('Failed to update profile. Please try again.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [user]);
  
  const checkAuth = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    
    try {
      // Check if token exists
      const token = authService.getToken();
      console.log('Checking authentication, token exists:', !!token);
      
      if (token) {
        // Verify token and get current user
        try {
          const isAuthenticated = await authService.checkAuth();
          console.log('Auth check result:', isAuthenticated);
          
          if (isAuthenticated) {
            const currentUser = await authService.getCurrentUser();
            console.log('Current user fetched:', currentUser?.username);
            setUser(currentUser);
            setIsAuthenticated(true);
          } else {
            // Token invalid
            console.warn('Token invalid, logging out');
            logout();
          }
        } catch (checkError) {
          console.error('Error checking authentication:', checkError);
          logout();
        }
      } else {
        // No token
        console.log('No authentication token found');
        setIsAuthenticated(false);
      }
    } catch (err) {
      console.error('Error in checkAuth:', err);
      logout();
    } finally {
      setIsLoading(false);
    }
  }, [logout]);
  
  // Check authentication status on initial load
  useEffect(() => {
    // Skip authentication check for login and register pages
    if (window.location.pathname === '/login' || window.location.pathname === '/register') {
      setIsLoading(false);
      return;
    }
    
    // Use a flag to prevent multiple calls
    let isMounted = true;
    
    const runAuthCheck = async () => {
      try {
        if (isMounted) {
          await checkAuth();
        }
      } catch (error) {
        console.error('Auth check failed:', error);
      }
    };
    
    runAuthCheck();
    
    // Cleanup function to prevent state updates after unmount
    return () => {
      isMounted = false;
    };
    
    // Deliberately omit checkAuth from dependencies to prevent loops
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        isLoading,
        error,
        login,
        register,
        logout,
        updateProfile,
        checkAuth
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuthContext = (): AuthContextProps => {
  const context = useContext(AuthContext);
  
  if (context === undefined) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  
  return context;
};

export default AuthContext;