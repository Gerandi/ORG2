import React from 'react';
import { Link } from 'react-router-dom';
import Button from '../../atoms/Button';
import { PlusCircle, Bell, Search } from 'lucide-react';
import ProjectSelector from './ProjectSelector';
import { useUIContext } from '../../../shared/contexts/UIContext';

export interface HeaderProps {
  title: string;
  className?: string;
}

const Header: React.FC<HeaderProps> = ({
  title,
  className = '',
}) => {
  const { openCreateProjectModal } = useUIContext();

  const handleSearchClick = () => {
    alert('Search functionality not implemented yet.');
  };

  const handleNotificationsClick = () => {
    alert('Notifications not implemented yet.');
  };

  return (
    <header className={`bg-white shadow-sm px-6 py-3 flex items-center justify-between ${className}`}>
      <div className="flex items-center">
        <h2 className="text-lg font-medium">{title}</h2>
        <ProjectSelector />
      </div>
      
      <div className="flex items-center space-x-4">
        {/* Search */}
        <div className="relative" onClick={handleSearchClick}>
          <input
            type="text"
            placeholder="Search..."
            className="w-64 pl-10 pr-4 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            readOnly
          />
          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
            <Search size={16} className="text-gray-400" />
          </div>
        </div>
        
        {/* Notifications */}
        <Button variant="icon" onClick={handleNotificationsClick}>
          <Bell size={18} />
        </Button>
        
        {/* Create Project Button */}
        <Button
          variant="primary"
          size="sm"
          className="flex items-center"
          onClick={openCreateProjectModal}
        >
          <PlusCircle size={16} className="mr-1" />
          New Project
        </Button>
      </div>
    </header>
  );
};

export default Header;