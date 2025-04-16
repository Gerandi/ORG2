import React from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';
import {
  AuthProvider,
  ProjectProvider,
  DataProvider,
  NetworkProvider,
  MLProvider,
  ABMProvider
} from './shared/contexts';

// Only wrap app with AuthProvider - other providers are applied in ProtectedRoute
createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </React.StrictMode>,
);