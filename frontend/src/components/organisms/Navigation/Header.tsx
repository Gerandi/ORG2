import React from 'react';
import { Link } from 'react-router-dom';
import Button from '../../atoms/Button';
import DropdownMenu from '../../molecules/DropdownMenu';
import { PlusCircle, Bell, Search, User, Settings, LogOut } from 'lucide-react';
import ProjectSelector from './ProjectSelector';
import { useAuthContext } from '../../../shared/contexts/AuthContext';

export interface HeaderProps {
  title: string;
  onCreateProject?: () => void;
  onProjectChange?: (projectId: number | null) => void;
  className?: string;
}

const Header: React.FC<HeaderProps> = ({
  title,
  onCreateProject,
  onProjectChange,
  className = '',
}) => {
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

  return (
    <header className={`bg-white shadow-sm px-6 py-3 flex items-center justify-between ${className}`}>
      <div className="flex items-center">
        <h2 className="text-lg font-medium">{title}</h2>
        <ProjectSelector onProjectChange={onProjectChange} />
      </div>
      
      <div className="flex items-center space-x-4">
        {/* Search */}
        <div className="relative">
          <input
            type="text"
            placeholder="Search..."
            className="w-64 pl-10 pr-4 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
            <Search size={16} className="text-gray-400" />
          </div>
        </div>
        
        {/* Notifications */}
        <Button variant="icon">
          <Bell size={18} />
        </Button>
        
        {/* Create Project Button */}
        {onCreateProject && (
          <Button
            variant="primary"
            size="sm"
            className="flex items-center"
            onClick={onCreateProject}
          >
            <PlusCircle size={16} className="mr-1" />
            New Project
          </Button>
        )}
        
        {/* User Menu - using our new DropdownMenu component */}
        {user && (
          <DropdownMenu
            align="right"
            trigger={
              <div className="flex items-center">
                <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-medium mr-2">
                  {getUserInitials()}
                </div>
                <div className="hidden md:block">
                  <div className="text-sm font-medium">{user.name || user.username || 'User'}</div>
                  {user.email && <div className="text-xs text-gray-500">{user.email}</div>}
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
        )}
      </div>
    </header>
  );
};

export default Header;