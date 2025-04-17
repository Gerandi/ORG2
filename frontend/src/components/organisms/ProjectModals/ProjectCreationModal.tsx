import React, { useState } from 'react';
import { X } from 'lucide-react';
import { Heading, Text } from '../../atoms/Typography';
import Button from '../../atoms/Button';
import Input from '../../atoms/Input';
import Select from '../../atoms/Select/Select';
import { useProjectContext } from '../../../shared/contexts/ProjectContext';
import { ProjectType } from '../../../types/project';

interface ProjectCreationModalProps {
  onClose: () => void;
  onSuccess?: () => void;
}

const ProjectCreationModal: React.FC<ProjectCreationModalProps> = ({ onClose, onSuccess }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<ProjectType>('GENERAL');
  const [localError, setLocalError] = useState<string | null>(null);

  const { createProject, isLoading, error } = useProjectContext();

  const projectTypeOptions = [
    { value: 'SNA', label: 'Social Network Analysis' },
    { value: 'ML', label: 'Machine Learning' },
    { value: 'ABM', label: 'Agent-Based Modeling' },
    { value: 'GENERAL', label: 'General Research' }
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      setLocalError('Please provide a project name');
      return;
    }

    setLocalError(null);

    try {
      await createProject({
        name,
        description,
        type
      });

      // Call success callback
      if (onSuccess) {
        onSuccess();
      }

      // Close modal
      onClose();
    } catch (err) {
      console.error('Project creation failed:', err);
      setLocalError('Failed to create project. Please try again.');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-md p-6">
        <div className="flex justify-between items-center mb-4">
          <Heading level={3}>Create New Project</Heading>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
          >
            <X size={20} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="project-name" className="block text-sm font-medium text-gray-700 mb-1">
              Project Name *
            </label>
            <Input
              id="project-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter project name"
              fullWidth
              required
            />
          </div>
          
          <div>
            <label htmlFor="project-description" className="block text-sm font-medium text-gray-700 mb-1">
              Description (Optional)
            </label>
            <textarea
              id="project-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe your project"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
              rows={3}
            />
          </div>
          
          <div>
            <label htmlFor="project-type" className="block text-sm font-medium text-gray-700 mb-1">
              Project Type
            </label>
            <Select
              id="project-type"
              options={projectTypeOptions}
              value={type}
              onChange={(e) => setType(e.target.value as ProjectType)}
              fullWidth
            />
          </div>

          {(localError || error) && (
            <div className="p-2 bg-red-50 border border-red-200 rounded text-sm text-red-600">
              {localError || error}
            </div>
          )}
          
          <div className="border-t border-gray-200 pt-4 flex justify-end space-x-3">
            <Button 
              variant="outline" 
              onClick={onClose}
              disabled={isLoading}
              type="button"
            >
              Cancel
            </Button>
            <Button 
              variant="primary"
              type="submit"
              loading={isLoading}
              disabled={isLoading || !name.trim()}
            >
              {isLoading ? 'Creating...' : 'Create Project'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProjectCreationModal;