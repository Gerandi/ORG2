import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth, useFormValidation } from '../shared/hooks';
import { Button } from '../components/atoms/Button';
import { Input } from '../components/atoms/Input';
import { Card } from '../components/atoms/Card';
import { Typography } from '../components/atoms/Typography';

const Register: React.FC = () => {
  const navigate = useNavigate();
  const { register, isLoading, error } = useAuth();
  const [localError, setLocalError] = useState<string | null>(null);
  
  // Form validation using our custom hook
  const {
    formData,
    errors,
    touched,
    handleChange,
    validateForm,
    setFieldValue,
    isValid,
    handleBlur
  } = useFormValidation(
    {
      email: '',
      username: '',
      password: '',
      confirmPassword: '',
      firstName: '',
      lastName: '',
    },
    {
      email: {
        required: true,
        pattern: /\S+@\S+\.\S+/,
        custom: (value) => !value.includes('@') ? 'Invalid email format' : null
      },
      username: {
        required: true,
        minLength: 3,
        custom: (value) => /\s/.test(value) ? 'Username cannot contain spaces' : null
      },
      password: {
        required: true,
        minLength: 8,
        custom: (value) => {
          // At least one uppercase, one lowercase, and one digit
          const hasUpper = /[A-Z]/.test(value);
          const hasLower = /[a-z]/.test(value);
          const hasDigit = /\d/.test(value);
          
          if (!hasUpper || !hasLower || !hasDigit) {
            return 'Password must contain at least one uppercase letter, one lowercase letter, and one digit';
          }
          return null;
        }
      },
      confirmPassword: {
        required: true,
        custom: (value, data) => value !== data.password ? 'Passwords do not match' : null
      },
      firstName: {},
      lastName: {}
    }
  );
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    
    if (validateForm()) {
      try {
        const success = await register({
          email: formData.email,
          username: formData.username,
          password: formData.password,
          firstName: formData.firstName,  // Use camelCase in frontend
          lastName: formData.lastName     // The auth service will convert these to snake_case
        });
        
        if (success) {
          navigate('/dashboard');
        } else {
          setLocalError('Failed to create account. Please try again.');
        }
      } catch (err) {
        console.error('Registration error:', err);
        setLocalError('An unexpected error occurred during registration.');
      }
    }
  };
  
  // Add an effect to run validation on all fields when the component mounts
  // Run validation once on mount, but don't re-run on every render
  useEffect(() => {
    // Use a timeout to ensure this doesn't block rendering
    const timer = setTimeout(() => {
      validateForm();
    }, 0);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Determine error message to display
  const displayError = error || localError;
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <Card className="w-full max-w-md">
        <div className="p-6">
          <div className="text-center mb-8">
            <Typography variant="h1" className="text-3xl font-bold">Create Account</Typography>
            <Typography variant="p" className="text-gray-600 mt-2">
              Join the OrgAI platform
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
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                onBlur={handleBlur}
                required
                fullWidth
                autoFocus
                placeholder="Enter your email"
                className="w-full"
                error={touched.email && !!errors.email}
                helpText={touched.email ? errors.email : undefined}
                disabled={isLoading}
              />
            </div>
            
            <div className="mb-4">
              <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
                Username
              </label>
              <Input
                id="username"
                name="username"
                type="text"
                value={formData.username}
                onChange={handleChange}
                onBlur={handleBlur}
                required
                fullWidth
                placeholder="Choose a username"
                className="w-full"
                error={touched.username && !!errors.username}
                helpText={touched.username ? errors.username : undefined}
                disabled={isLoading}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-1">
                  First Name
                </label>
                <Input
                  id="firstName"
                  name="firstName"
                  type="text"
                  value={formData.firstName}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  fullWidth
                  placeholder="First name"
                  className="w-full"
                  disabled={isLoading}
                />
              </div>
              <div>
                <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-1">
                  Last Name
                </label>
                <Input
                  id="lastName"
                  name="lastName"
                  type="text"
                  value={formData.lastName}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  fullWidth
                  placeholder="Last name"
                  className="w-full"
                  disabled={isLoading}
                />
              </div>
            </div>
            
            <div className="mb-4">
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <Input
                id="password"
                name="password"
                type="password"
                value={formData.password}
                onChange={handleChange}
                onBlur={handleBlur}
                required
                fullWidth
                placeholder="Create a password"
                className="w-full"
                error={touched.password && !!errors.password}
                helpText={touched.password ? errors.password : undefined}
                disabled={isLoading}
              />
              <Typography variant="p" className="text-xs text-gray-500 mt-1">
                Password must be at least 8 characters with uppercase, lowercase and digits
              </Typography>
            </div>
            
            <div className="mb-6">
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                Confirm Password
              </label>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                value={formData.confirmPassword}
                onChange={handleChange}
                onBlur={handleBlur}
                required
                fullWidth
                placeholder="Confirm your password"
                className="w-full"
                error={touched.confirmPassword && !!errors.confirmPassword}
                helpText={touched.confirmPassword ? errors.confirmPassword : undefined}
                disabled={isLoading}
              />
            </div>
            
            <Button 
              type="submit" 
              variant="primary" 
              isLoading={isLoading}
              // Always enabled - validation happens on submit
              disabled={false} 
              fullWidth
              className="mb-4"
            >
              {isLoading ? 'Creating account...' : 'Create account'}
            </Button>
            
            <div className="text-center">
              <Typography variant="p" className="text-sm text-gray-600">
                Already have an account?{' '}
                <Link to="/login" className="text-primary-600 hover:text-primary-700 font-medium">
                  Sign in
                </Link>
              </Typography>
            </div>
          </form>
        </div>
      </Card>
    </div>
  );
};

export default Register;