import React, { useEffect, useState } from 'react';
import { Project } from '../../../types/project';
import { useProjectContext } from '../../../shared/contexts/ProjectContext';

interface ProjectSelectorProps {
  onProjectChange?: (projectId: number | null) => void;
}

const ProjectSelector: React.FC<ProjectSelectorProps> = ({ onProjectChange }) => {
  const { projects, selectedProject, selectProject } = useProjectContext();
  const [isOpen, setIsOpen] = useState(false);

  const handleSelectProject = async (project: Project | null) => {
    if (project) {
      await selectProject(project.id);
    } else {
      // Handle "All Projects" selection
      // We'll set selectedProject to null but still pass this to consumers
    }
    
    if (onProjectChange) {
      onProjectChange(project?.id || null);
    }
    
    setIsOpen(false);
  };

  return (
    <div className="relative ml-4">
      <button
        className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="mr-1">Project:</span>
        <span className="font-semibold text-blue-600 truncate max-w-[150px]">
          {selectedProject ? selectedProject.name : 'All Projects'}
        </span>
        <svg
          className="w-5 h-5 ml-2 -mr-1 text-gray-400"
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute right-0 z-10 mt-2 w-56 origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
          <div className="py-1">
            <button
              className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              onClick={() => handleSelectProject(null)}
            >
              All Projects
            </button>
            {projects.map((project) => (
              <button
                key={project.id}
                className={`block w-full text-left px-4 py-2 text-sm ${
                  selectedProject?.id === project.id
                    ? 'bg-blue-100 text-blue-900'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
                onClick={() => handleSelectProject(project)}
              >
                {project.name}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectSelector;