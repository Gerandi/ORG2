import React, { useState, useEffect } from 'react';
import { Plus, FileText, Edit, Trash } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useProjectContext } from '../shared/contexts/ProjectContext';
import Card from '../components/atoms/Card';
import { Heading, Text } from '../components/atoms/Typography';
import Button from '../components/atoms/Button';
import { ProjectType } from '../types/project';
import ProjectCreationModal from '../components/organisms/ProjectModals/ProjectCreationModal';

const ProjectTypeLabel: React.FC<{ type: ProjectType }> = ({ type }) => {
  const typeColors = {
    SNA: 'bg-purple-100 text-purple-800',
    ML: 'bg-blue-100 text-blue-800',
    ABM: 'bg-orange-100 text-orange-800',
    GENERAL: 'bg-gray-100 text-gray-800',
  };
  
  return (
    <span className={`px-2 py-1 rounded-full text-xs ${typeColors[type]}`}>
      {type}
    </span>
  );
};

const ProjectsPage: React.FC = () => {
  const navigate = useNavigate();
  const { projects, isLoading, error, fetchProjects, deleteProject, selectProject } = useProjectContext();
  
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<number | null>(null);
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  
  // Load projects on component mount
  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);
  
  const handleCreateProject = () => {
    setShowCreateModal(true);
  };
  
  const handleCreateSuccess = () => {
    fetchProjects();
  };
  
  const handleViewProject = async (projectId: number) => {
    await selectProject(projectId);
    // Navigate to a project detail page or set it as the active project globally
    // For now, we'll just log it
    console.log(`Selected project: ${projectId}`);
  };
  
  const handleDeleteClick = (projectId: number) => {
    setShowDeleteConfirm(projectId);
  };
  
  const confirmDelete = async (projectId: number) => {
    try {
      await deleteProject(projectId);
    } catch (err) {
      console.error('Error deleting project:', err);
    } finally {
      setShowDeleteConfirm(null);
    }
  };
  
  const cancelDelete = () => {
    setShowDeleteConfirm(null);
  };
  
  if (isLoading) {
    return <div className="flex justify-center p-8">Loading projects...</div>;
  }
  
  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <Heading level={2}>Research Projects</Heading>
        <Button 
          variant="primary" 
          className="flex items-center"
          onClick={handleCreateProject}
        >
          <Plus size={16} className="mr-1" />
          New Project
        </Button>
      </div>
      
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md text-red-700">
          {error}
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {projects.map(project => (
          <Card key={project.id} className="relative">
            {/* Project header */}
            <div className="flex justify-between items-start mb-3">
              <ProjectTypeLabel type={project.type} />
              
              <div className="flex space-x-1">
                <Button variant="icon" title="Edit Project">
                  <Edit size={16} />
                </Button>
                <Button 
                  variant="icon" 
                  title="Delete Project"
                  onClick={() => handleDeleteClick(project.id)}
                >
                  <Trash size={16} />
                </Button>
              </div>
            </div>
            
            {/* Project content */}
            <Heading level={4} className="mb-2">{project.name}</Heading>
            
            <Text variant="caption" className="mb-4">
              {project.description || 'No description provided.'}
            </Text>
            
            <div className="flex justify-between items-center pt-3 border-t border-gray-200">
              <Text variant="small" className="text-gray-500">
                Last updated: {new Date(project.updated_at).toLocaleDateString()}
              </Text>
              
              <Button 
                variant="outline" 
                size="sm" 
                className="flex items-center"
                onClick={() => handleViewProject(project.id)}
              >
                <FileText size={14} className="mr-1" />
                View
              </Button>
            </div>
            
            {/* Delete confirmation modal */}
            {showDeleteConfirm === project.id && (
              <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-90 rounded-lg">
                <div className="p-4 text-center">
                  <Heading level={4} className="mb-2">Delete Project?</Heading>
                  <Text variant="caption" className="mb-4">
                    This action cannot be undone.
                  </Text>
                  <div className="flex justify-center space-x-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={cancelDelete}
                    >
                      Cancel
                    </Button>
                    <Button 
                      variant="primary" 
                      size="sm" 
                      onClick={() => confirmDelete(project.id)}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </Card>
        ))}
      </div>
      
      {projects.length === 0 && (
        <Card className="py-8 text-center">
          <FileText size={48} className="mx-auto mb-2 text-gray-400" />
          <Heading level={3}>No Projects Yet</Heading>
          <Text variant="caption">
            Create your first research project to get started.
          </Text>
        </Card>
      )}
      
      {/* Project Creation Modal */}
      {showCreateModal && (
        <ProjectCreationModal 
          onClose={() => setShowCreateModal(false)} 
          onSuccess={handleCreateSuccess}
        />
      )}
    </div>
  );
};

export default ProjectsPage;