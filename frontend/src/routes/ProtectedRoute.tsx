import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthContext } from '../shared/contexts';
import {
  ProjectProvider,
  DataProvider,
  NetworkProvider,
  MLProvider,
  ABMProvider
} from '../shared/contexts';

interface ProtectedRouteProps {
  redirectPath?: string;
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  redirectPath = '/login',
  children
}) => {
  const { isAuthenticated, isLoading } = useAuthContext();
  const location = useLocation();
  
  // Show loading spinner while checking authentication
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
      </div>
    );
  }
  
  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to={redirectPath} state={{ from: location }} replace />;
  }
  
  // Apply all context providers only on authenticated routes
  return (
    <ProjectProvider>
      <DataProvider>
        <NetworkProvider>
          <MLProvider>
            <ABMProvider>
              {children}
            </ABMProvider>
          </MLProvider>
        </NetworkProvider>
      </DataProvider>
    </ProjectProvider>
  );
};

export default ProtectedRoute;