import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar, Header } from '../components/organisms/Navigation';
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

  return (
    <div className="flex h-screen w-full bg-gray-50">
      {/* Sidebar */}
      <Sidebar />
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <Header 
          title={title}
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