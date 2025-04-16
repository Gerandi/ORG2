import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar, Header } from '../components/organisms/Navigation';

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
  
  const handleCreateProject = () => {
    // This would open a modal or navigate to project creation page
    console.log('Create project clicked');
  };
  
  return (
    <div className="flex h-screen w-full bg-gray-50">
      {/* Sidebar */}
      <Sidebar />
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <Header 
          title={title}
          onCreateProject={handleCreateProject}
        />
        
        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default MainLayout;