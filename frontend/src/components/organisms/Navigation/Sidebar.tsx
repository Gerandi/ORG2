import React from 'react';
import { NavLink, Link } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Database, 
  Network, 
  BarChart2, 
  Users, 
  Settings, 
  HelpCircle,
  User,
  LogOut
} from 'lucide-react';
import DropdownMenu from '../../molecules/DropdownMenu';
import Button from '../../atoms/Button';
import { useAuthContext } from '../../../shared/contexts/AuthContext';

export interface SidebarItem {
  path: string;
  label: string;
  icon: React.ReactNode;
}

export interface SidebarProps {
  className?: string;
}

const Sidebar: React.FC<SidebarProps> = ({ className = '' }) => {
  const { user, logout } = useAuthContext();
  
  // Function to get user initials from name or email
  const getUserInitials = () => {
    if (!user) return '';
    
    if (user.name) {
      return user.name
        .split(' ')
        .map(name => name[0])
        .join('')
        .toUpperCase();
    }
    
    if (user.username) {
      return user.username.substring(0, 2).toUpperCase();
    }
    
    if (user.email) {
      return user.email.substring(0, 2).toUpperCase();
    }
    
    return 'U';
  };

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
          flex items-center w-full px-4 py-2 text-left transition-colors duration-150 ease-in-out
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
      
      {user && (
        <div className="p-4 border-t border-gray-700">
          <DropdownMenu
            direction="up"
            align="left"
            className="w-full"
            trigger={
              <div className="flex items-center w-full">
                <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-medium mr-2">
                  {getUserInitials()}
                </div>
                <div className="flex-1">
                  <div className="font-medium">{user.name || user.username || 'User'}</div>
                  {user.email && <div className="text-xs text-gray-400">{user.email}</div>}
                </div>
              </div>
            }
          >
            <Link
              to="/profile"
              className="flex items-center w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
            >
              <User size={16} className="mr-2" />
              Profile
            </Link>
            <Link
              to="/settings"
              className="flex items-center w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
            >
              <Settings size={16} className="mr-2" />
              Settings
            </Link>
            <Button
              variant="ghost"
              className="flex items-center justify-start w-full px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
              onClick={() => logout()}
            >
              <LogOut size={16} className="mr-2" />
              Sign out
            </Button>
          </DropdownMenu>
        </div>
      )}
    </div>
  );
};

export default Sidebar;