import React, { useCallback } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar, Header } from '../components/organisms/Navigation';
import { useDataContext } from '../shared/contexts/DataContext';
import { useNetworkContext } from '../shared/contexts/NetworkContext';
import { useMLContext } from '../shared/contexts/MLContext';
import { useABMContext } from '../shared/contexts/ABMContext';
import { useUIContext } from '../shared/contexts/UIContext';
import ProjectCreationModal from '../components/organisms/ProjectModals/ProjectCreationModal';
import { useProjectContext } from '../shared/contexts/ProjectContext';

const getTitleFromPath = (path: string): string => {
  // Map routes to page titles
  const pageTitles: Record<string, string> = {
    '/dashboard': 'Dashboard Overview',
    '/projects': 'Research Projects',
    '/data-management': 'Data Management',
    '/social-network-analysis': 'Social Network Analysis',
    '/machine-learning': 'Machine Learning',
    '/agent-based-modeling': 'Agent-Based Modeling',
    '/settings': 'Settings',
    '/help': 'Help & Documentation',
  };
  
  return pageTitles[path] || 'OrgAI Platform';
};

const MainLayout: React.FC = () => {
  const location = useLocation();
  const title = getTitleFromPath(location.pathname);
  const { isCreateProjectModalOpen, closeCreateProjectModal } = useUIContext();
  const { fetchProjects } = useProjectContext();
  
  // Get contexts to handle project filtering
  const { fetchDatasets } = useDataContext();
  const { fetchNetworks } = useNetworkContext();
  const { fetchModels: fetchMLModels } = useMLContext();
  const { fetchModels: fetchABMModels, fetchSimulations } = useABMContext();
  
  const handleProjectChange = useCallback(async (projectId: number | null) => {
    // When project changes, refresh data from all contexts with the new project filter
    await Promise.all([
      fetchDatasets(projectId || undefined),
      fetchNetworks(projectId || undefined),
      fetchMLModels(projectId || undefined),
      fetchABMModels(projectId || undefined),
      fetchSimulations(projectId || undefined)
    ]);
  }, [fetchDatasets, fetchNetworks, fetchMLModels, fetchABMModels, fetchSimulations]);
  
  return (
    <div className="flex h-screen w-full bg-gray-50">
      {/* Sidebar */}
      <Sidebar />
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <Header 
          title={title}
          onProjectChange={handleProjectChange}
        />
        
        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>

        {/* Project Creation Modal - conditionally rendered */}
        {isCreateProjectModalOpen && (
          <ProjectCreationModal
            onClose={closeCreateProjectModal}
            onSuccess={() => {
              fetchProjects(); // Refresh project list after creation
              closeCreateProjectModal();
            }}
          />
        )}
      </div>
    </div>
  );
};

export default MainLayout;