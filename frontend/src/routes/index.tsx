import React from 'react';
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import MainLayout from '../layouts/MainLayout';
import ProtectedRoute from './ProtectedRoute';

// Page imports will go here as we create them
const Dashboard = React.lazy(() => import('../pages/Dashboard'));
const Projects = React.lazy(() => import('../pages/Projects'));
const DataManagement = React.lazy(() => import('../pages/DataManagement'));
const SocialNetworkAnalysis = React.lazy(() => import('../pages/SocialNetworkAnalysis'));
const Login = React.lazy(() => import('../pages/Login'));
const Register = React.lazy(() => import('../pages/Register'));

// This will be our fallback for lazy-loaded routes
const PageLoading = () => (
  <div className="flex items-center justify-center h-full">
    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
  </div>
);

// Create the router
const router = createBrowserRouter([
  // Public routes
  {
    path: '/login',
    element: (
      <React.Suspense fallback={<PageLoading />}>
        <Login />
      </React.Suspense>
    ),
  },
  {
    path: '/register',
    element: (
      <React.Suspense fallback={<PageLoading />}>
        <Register />
      </React.Suspense>
    ),
  },
  
  // Protected routes
  {
    path: '/',
    element: <MainLayout />,
    children: [
      {
        index: true,
        element: <Navigate to="/dashboard" replace />,
      },
      {
        path: 'dashboard',
        element: (
          <ProtectedRoute>
            <React.Suspense fallback={<PageLoading />}>
              <Dashboard />
            </React.Suspense>
          </ProtectedRoute>
        ),
      },
      {
        path: 'projects',
        element: (
          <ProtectedRoute>
            <React.Suspense fallback={<PageLoading />}>
              <Projects />
            </React.Suspense>
          </ProtectedRoute>
        ),
      },
      {
        path: 'data-management',
        element: (
          <ProtectedRoute>
            <React.Suspense fallback={<PageLoading />}>
              <DataManagement />
            </React.Suspense>
          </ProtectedRoute>
        ),
      },
      {
        path: 'social-network-analysis',
        element: (
          <ProtectedRoute>
            <React.Suspense fallback={<PageLoading />}>
              <SocialNetworkAnalysis />
            </React.Suspense>
          </ProtectedRoute>
        ),
      },
    ]
  },
  
  // Catch all route
  {
    path: '*',
    element: <Navigate to="/dashboard" replace />,
  }
]);

const AppRouter: React.FC = () => {
  return <RouterProvider router={router} />;
};

export default AppRouter;