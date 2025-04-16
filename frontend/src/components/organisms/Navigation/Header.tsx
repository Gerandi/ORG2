import React from 'react';
import Button from '../../atoms/Button';
import { PlusCircle, Bell, Search } from 'lucide-react';

export interface HeaderProps {
  title: string;
  onCreateProject?: () => void;
  className?: string;
}

const Header: React.FC<HeaderProps> = ({
  title,
  onCreateProject,
  className = '',
}) => {
  return (
    <header className={`bg-white shadow-sm px-6 py-3 flex items-center justify-between ${className}`}>
      <h2 className="text-lg font-medium">{title}</h2>
      
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
      </div>
    </header>
  );
};

export default Header;