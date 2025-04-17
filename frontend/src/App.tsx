import React from 'react';
import AppRouter from './routes';
import { AuthProvider } from './shared/contexts/AuthContext';
import { ProjectProvider } from './shared/contexts/ProjectContext';
import { DataProvider } from './shared/contexts/DataContext';
import { NetworkProvider } from './shared/contexts/NetworkContext';
import { MLProvider } from './shared/contexts/MLContext';
import { ABMProvider } from './shared/contexts/ABMContext';
import { UIProvider } from './shared/contexts/UIContext';

function App() {
  return (
    <AuthProvider>
      <ProjectProvider>
        <DataProvider>
          <NetworkProvider>
            <MLProvider>
              <ABMProvider>
                <UIProvider>
                  <AppRouter />
                </UIProvider>
              </ABMProvider>
            </MLProvider>
          </NetworkProvider>
        </DataProvider>
      </ProjectProvider>
    </AuthProvider>
  );
}

export default App;