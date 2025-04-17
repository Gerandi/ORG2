import { useState, useCallback, useEffect } from 'react';
import { useAuthContext } from '../contexts/AuthContext';
import { RegisterData, User } from '../../types/auth';

export const useAuth = () => {
  const {
    user,
    isAuthenticated,
    isLoading,
    error,
    login,
    register,
    logout,
    updateProfile,
    checkAuth
  } = useAuthContext();

  // Initialize state for login/register form
  const [formError, setFormError] = useState<string | null>(null);
  const [processing, setProcessing] = useState<boolean>(false);

  // Handle login with error handling
  const handleLogin = useCallback(async (credentials: { email: string; password: string }) => {
    setProcessing(true);
    setFormError(null);
    
    try {
      console.log('Attempting login with credentials in hook:', credentials);
      const result = await login(credentials);
      console.log('Login result:', result);
      return true;
    } catch (error) {
      console.error('Login error:', error);
      
      // Detailed error logging
      if (error.response) {
        console.error('Error response:', error.response.status, error.response.data);
        
        if (error.response.data?.detail === "LOGIN_BAD_CREDENTIALS") {
          setFormError('Invalid email or password. Please try again.');
        } else if (error.response.data?.detail) {
          setFormError(error.response.data.detail);
        }
      } else if (error instanceof Error) {
        setFormError(error.message);
      } else {
        setFormError('Failed to login. Please check your credentials.');
      }
      return false;
    } finally {
      setProcessing(false);
    }
  }, [login]);

  // Handle registration with error handling
  const handleRegister = useCallback(async (userData: RegisterData) => {
    setProcessing(true);
    setFormError(null);
    
    try {
      console.log('Handling registration for:', userData.email);
      
      // Add timestamps if missing from data
      const enrichedUserData = {
        ...userData,
        // Convert camelCase to snake_case if needed
        first_name: userData.first_name || userData.firstName,
        last_name: userData.last_name || userData.lastName,
      };
      
      console.log('Enriched user data:', enrichedUserData);
      
      // Try to register the user
      await register(enrichedUserData);
      console.log('Registration succeeded!');
      return true;
    } catch (error: any) {
      console.error('Registration error in useAuth:', error);
      
      // Handle different error formats
      if (error.response?.data) {
        // API error response
        const errorData = error.response.data;
        console.error('API error data:', errorData);
        
        if (typeof errorData === 'string') {
          setFormError(errorData);
        } else if (errorData.detail) {
          if (Array.isArray(errorData.detail)) {
            setFormError(errorData.detail.map((d: any) => d.msg || d).join(', '));
          } else {
            setFormError(String(errorData.detail));
          }
        } else if (errorData.message) {
          setFormError(errorData.message);
        } else {
          setFormError(JSON.stringify(errorData));
        }
      } else if (error.message) {
        setFormError(error.message);
      } else {
        setFormError('Registration failed. Please try again.');
      }
      
      return false;
    } finally {
      setProcessing(false);
    }
  }, [register]);

  // Handle logout with redirect
  const handleLogout = useCallback(async (allDevices: boolean = false) => {
    try {
      setProcessing(true);
      await logout(allDevices);
      // Redirect to login page
      window.location.href = '/login';
    } catch (error) {
      console.error('Logout error:', error);
      // Redirect anyway on error
      window.location.href = '/login';
    } finally {
      setProcessing(false);
    }
  }, [logout]);

  // Handle profile update with error handling
  const handleUpdateProfile = useCallback(async (data: Partial<User>) => {
    setProcessing(true);
    setFormError(null);
    
    try {
      if (!user) {
        throw new Error('User not authenticated');
      }
      
      await updateProfile(data);
      return true;
    } catch (error) {
      console.error('Profile update error:', error);
      if (error instanceof Error) {
        setFormError(error.message);
      } else {
        setFormError('Failed to update profile. Please try again.');
      }
      return false;
    } finally {
      setProcessing(false);
    }
  }, [updateProfile, user]);

  return {
    user,
    isAuthenticated,
    isLoading: isLoading || processing,
    error: error || formError,
    login: handleLogin,
    register: handleRegister,
    logout: handleLogout,
    updateProfile: handleUpdateProfile,
    checkAuth
  };
};

export default useAuth;