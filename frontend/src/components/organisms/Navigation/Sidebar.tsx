import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Database, 
  Network, 
  BarChart2, 
  Users, 
  Settings, 
  HelpCircle 
} from 'lucide-react';

export interface SidebarItem {
  path: string;
  label: string;
  icon: React.ReactNode;
}

export interface SidebarProps {
  className?: string;
}

const Sidebar: React.FC<SidebarProps> = ({ className = '' }) => {
  // Sidebar navigation items
  const mainItems: SidebarItem[] = [
    { path: '/dashboard', label: 'Dashboard', icon: <LayoutDashboard size={18} /> },
    { path: '/projects', label: 'Projects', icon: <Database size={18} /> },
  ];
  
  const moduleItems: SidebarItem[] = [
    { path: '/data-management', label: 'Data Management', icon: <Database size={18} /> },
    { path: '/social-network-analysis', label: 'Social Network Analysis', icon: <Network size={18} /> },
    { path: '/machine-learning', label: 'Machine Learning', icon: <BarChart2 size={18} /> },
    { path: '/agent-based-modeling', label: 'Agent-Based Modeling', icon: <Users size={18} /> },
  ];
  
  const settingsItems: SidebarItem[] = [
    { path: '/settings', label: 'Settings', icon: <Settings size={18} /> },
    { path: '/help', label: 'Help & Documentation', icon: <HelpCircle size={18} /> },
  ];
  
  // Function to render navigation items
  const renderNavItems = (items: SidebarItem[]) => (
    items.map((item) => (
      <NavLink
        key={item.path}
        to={item.path}
        className={({ isActive }) => `
          flex items-center w-full px-4 py-2 text-left
          ${isActive ? 'bg-blue-600 text-white' : 'hover:bg-gray-700 text-white'}
        `}
      >
        <span className="mr-3">{item.icon}</span>
        {item.label}
      </NavLink>
    ))
  );
  
  return (
    <div className={`w-64 bg-gray-800 text-white flex flex-col ${className}`}>
      <div className="p-4 border-b border-gray-700">
        <h1 className="text-xl font-bold">OrgAI Platform</h1>
        <p className="text-xs text-gray-400 mt-1">Organizational Analysis</p>
      </div>
      
      <div className="flex-1 overflow-y-auto">
        <nav className="mt-4">
          <div className="px-4 py-2 text-xs font-semibold text-gray-400 uppercase">Main</div>
          {renderNavItems(mainItems)}
          
          <div className="px-4 py-2 text-xs font-semibold text-gray-400 uppercase mt-4">Modules</div>
          {renderNavItems(moduleItems)}
          
          <div className="px-4 py-2 text-xs font-semibold text-gray-400 uppercase mt-4">Settings</div>
          {renderNavItems(settingsItems)}
        </nav>
      </div>
      
      <div className="p-4 border-t border-gray-700">
        <div className="text-sm">
          <div className="flex items-center">
            <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center">
              <span className="font-semibold">AR</span>
            </div>
            <div className="ml-2">
              <div className="font-medium">Academic Researcher</div>
              <div className="text-xs text-gray-400">Research Institution</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;