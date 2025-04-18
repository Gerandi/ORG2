import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User, LoginCredentials, RegisterData } from '../../types/auth';
import { authService } from '../services';
import { useProjectContext } from './ProjectContext';

interface AuthContextProps {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (credentials: { email: string; password: string }) => Promise<void>;
  register: (data: RegisterData) => Promise<boolean>;
  logout: (allDevices?: boolean) => Promise<void>;
  updateProfile: (data: Partial<User>) => Promise<void>;
  checkAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextProps | undefined>(undefined);

export const AuthProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  // We need to use this pattern because useProjectContext depends on AuthContext
  // so we can't directly use it in the AuthProvider component (would create circular dependency)
  const projectContextRef = React.useRef<{clearSelectedProject?: () => void}>({});
  
  // This function will be called by the ProjectProvider to register its clearSelectedProject function
  const registerProjectContext = useCallback((clearFn: () => void) => {
    projectContextRef.current.clearSelectedProject = clearFn;
  }, []);
  
  const login = useCallback(async (credentials: { email: string; password: string }): Promise<void> => {
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
      
      // Wait a moment for the database to update properly
      await new Promise(resolve => setTimeout(resolve, 500));
      
      try {
        console.log('AuthContext: Attempting login after registration');
        // Automatically log in after registration using email
        await login({ email: data.email, password: data.password });
        return true;
      } catch (loginErr: any) {
        console.error('AuthContext: Auto-login after registration failed:', loginErr);
        
        // Provide detailed error for login failure
        if (loginErr.response?.data?.detail) {
          setError(`Registration successful, but automatic login failed: ${loginErr.response.data.detail}`);
        } else if (loginErr.message) {
          setError(`Registration successful, but automatic login failed: ${loginErr.message}`);
        } else {
          setError('Registration successful, but automatic login failed. Please try logging in manually.');
        }
        return false;
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
        } else if (errorData.message) {
          setError(errorData.message);
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
  
  const logout = useCallback(async (allDevices: boolean = false): Promise<void> => {
    try {
      // Clear selected project first
      if (projectContextRef.current.clearSelectedProject) {
        projectContextRef.current.clearSelectedProject();
      }
      
      await authService.logout(allDevices);
      setUser(null);
      setIsAuthenticated(false);
    } catch (error) {
      console.error('Error during logout:', error);
      // Even if API call fails, consider user logged out on the frontend
      setUser(null);
      setIsAuthenticated(false);
    }
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
        checkAuth,
        registerProjectContext
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

// Export a function to register the project context
export const useRegisterProjectContext = () => {
  const { registerProjectContext } = useContext(AuthContext) as any;
  return registerProjectContext;
};

export default AuthContext;