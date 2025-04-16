import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../shared/hooks';
import { Button } from '../components/atoms/Button';
import { Input } from '../components/atoms/Input';
import { Card } from '../components/atoms/Card';
import { Typography } from '../components/atoms/Typography';

const Login: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  
  const { login, isLoading, error } = useAuth();
  const navigate = useNavigate();
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    
    try {
      console.log('Login attempt with username:', username);
      const success = await login({ username, password });
      
      if (success) {
        console.log('Login successful, navigating to dashboard');
        navigate('/dashboard');
      } else {
        setLocalError('Failed to login. Please try again.');
      }
    } catch (err) {
      console.error('Login error:', err);
      setLocalError('An unexpected error occurred during login.');
    }
  };
  
  // Determine error message to display
  const displayError = error || localError;
  
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
              <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
                Username
              </label>
              <Input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                fullWidth
                autoFocus
                placeholder="Enter your username"
                className="w-full"
                aria-label="Username"
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
            
            <Button 
              type="submit" 
              variant="primary" 
              isLoading={isLoading}
              disabled={isLoading} 
              fullWidth
              className="mb-4"
            >
              {isLoading ? 'Signing in...' : 'Sign in'}
            </Button>
            
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