import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../shared/hooks';
import { Button } from '../components/atoms/Button';
import { Input } from '../components/atoms/Input';
import { Card } from '../components/atoms/Card';
import { Typography } from '../components/atoms/Typography';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  // Helper function to use admin account
  const useAdminAccount = () => {
    setEmail('admin@orgai.com');
    setPassword('admin123');
  };
  
  const { login, isLoading, error } = useAuth();
  const navigate = useNavigate();
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    
    // Basic field validation
    if (!email.trim()) {
      setLocalError('Email is required');
      return;
    }
    
    if (!password.trim()) {
      setLocalError('Password is required');
      return;
    }
    
    try {
      console.log('Login attempt with email:', email);
      const success = await login({ email, password });
      
      if (success) {
        console.log('Login successful, navigating to dashboard');
        navigate('/dashboard');
      } else {
        setLocalError('Invalid email or password. Please try again.');
      }
    } catch (err: any) {
      console.error('Login error:', err);
      
      // Extract error message from different formats
      if (err.response?.data?.detail) {
        if (typeof err.response.data.detail === 'string') {
          setLocalError(err.response.data.detail);
        } else if (Array.isArray(err.response.data.detail)) {
          setLocalError(err.response.data.detail.join(', '));
        } else {
          setLocalError(JSON.stringify(err.response.data.detail));
        }
      } else if (err.message) {
        setLocalError(err.message);
      } else {
        setLocalError('Authentication failed. Please try again.');
      }
    }
  };
  
  // Determine error message to display
  // Format error message more user-friendly if it's a technical error
  let displayError = error || localError;
  
  if (displayError && displayError.includes('Network Error')) {
    displayError = 'Unable to connect to the server. Please ensure the backend is running.';
  }
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <Card className="w-full max-w-md">
        <div className="p-6">
          <div className="text-center mb-8">
            <Typography variant="h1" className="text-3xl font-bold">OrgAI Platform</Typography>
            <Typography variant="p" className="text-gray-600 mt-2">
              Sign in to your account
            </Typography>
          </div>
          
          {displayError && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
              <Typography variant="p" className="text-red-600 text-sm">
                {displayError}
              </Typography>
            </div>
          )}
          
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                fullWidth
                autoFocus
                placeholder="Enter your email"
                className="w-full"
                aria-label="Email"
                disabled={isLoading}
              />
            </div>
            
            <div className="mb-6">
              <div className="flex items-center justify-between mb-1">
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                  Password
                </label>
                <Link to="/forgot-password" className="text-sm text-primary-600 hover:text-primary-700">
                  Forgot password?
                </Link>
              </div>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                fullWidth
                placeholder="Enter your password"
                className="w-full"
                aria-label="Password"
                disabled={isLoading}
              />
            </div>
            
            <div className="space-y-3">
              <Button 
                type="submit" 
                variant="primary" 
                isLoading={isLoading}
                disabled={isLoading} 
                fullWidth
              >
                {isLoading ? 'Signing in...' : 'Sign in'}
              </Button>
              
              <Button 
                type="button" 
                variant="secondary" 
                disabled={isLoading} 
                onClick={useAdminAccount}
                fullWidth
                className="mb-4"
              >
                Use Admin Account
              </Button>
            </div>
            
            <div className="text-center">
              <Typography variant="p" className="text-sm text-gray-600">
                Don't have an account?{' '}
                <Link to="/register" className="text-primary-600 hover:text-primary-700 font-medium">
                  Sign up
                </Link>
              </Typography>
            </div>
          </form>
        </div>
      </Card>
    </div>
  );
};

export default Login;