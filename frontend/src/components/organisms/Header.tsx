import React from 'react';
import { Link } from 'react-router-dom';
import { LogOut, User, Settings, Bell } from 'lucide-react';
import { Button } from '../atoms/Button';
import { Typography } from '../atoms/Typography';
import { useAuthContext } from '../../shared/contexts';

interface HeaderProps {
  title?: string;
}

const Header: React.FC<HeaderProps> = ({ title = 'OrgAI Platform' }) => {
  const { user, logout } = useAuthContext();
  
  const handleLogout = () => {
    logout();
  };
  
  return (
    <header className="bg-white border-b border-gray-200 h-16 flex items-center justify-between px-4 md:px-6">
      <div className="flex items-center">
        <Typography variant="h1" className="text-xl font-bold text-gray-900">
          {title}
        </Typography>
      </div>
      
      <div className="flex items-center space-x-4">
        <button className="text-gray-500 hover:text-gray-700 p-2 rounded-full hover:bg-gray-100">
          <Bell size={20} />
        </button>
        
        <div className="relative">
          <div className="group">
            <button className="flex items-center space-x-2 p-2 rounded-full hover:bg-gray-100">
              <div className="bg-primary-100 text-primary-600 rounded-full h-8 w-8 flex items-center justify-center">
                {user?.first_name ? user.first_name[0] : user?.username ? user.username[0] : 'U'}
              </div>
              <div className="hidden md:block text-left">
                <Typography variant="span" className="block text-sm font-medium text-gray-700">
                  {user?.first_name && user?.last_name 
                    ? `${user.first_name} ${user.last_name}` 
                    : user?.username}
                </Typography>
                <Typography variant="span" className="block text-xs text-gray-500">
                  {user?.email}
                </Typography>
              </div>
            </button>
            
            <div className="absolute right-0 mt-1 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-50 hidden group-hover:block">
              <div className="py-1">
                <Link 
                  to="/profile" 
                  className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  <User size={16} className="mr-2" />
                  Profile
                </Link>
                
                <Link 
                  to="/settings" 
                  className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  <Settings size={16} className="mr-2" />
                  Settings
                </Link>
                
                <button 
                  onClick={handleLogout} 
                  className="flex items-center w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  <LogOut size={16} className="mr-2" />
                  Sign out
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;