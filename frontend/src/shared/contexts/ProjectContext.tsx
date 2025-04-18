import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Project } from '../../types/project';
import projectsService from '../services/projectsService';
import { useAuthContext, useRegisterProjectContext } from './AuthContext';
import useLocalStorage from '../hooks/useLocalStorage';

interface ProjectContextProps {
  projects: Project[];
  selectedProject: Project | null;
  isLoading: boolean;
  error: string | null;
  fetchProjects: () => Promise<void>;
  selectProject: (id: number | null) => Promise<void>;
  clearSelectedProject: () => void;
  createProject: (project: Omit<Project, 'id' | 'created_at' | 'updated_at' | 'status'>) => Promise<void>;
  updateProject: (id: number, project: Partial<Project>) => Promise<void>;
  deleteProject: (id: number) => Promise<void>;
}

const ProjectContext = createContext<ProjectContextProps | undefined>(undefined);

export const ProjectProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const { isAuthenticated } = useAuthContext();
  const registerProjectContext = useRegisterProjectContext();
  
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useLocalStorage<number | null>('selectedProjectId', null);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  const fetchProjects = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const data = await projectsService.getProjects();
      setProjects(data);
    } catch (err) {
      setError('Failed to fetch projects');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, []);
  
  const selectProject = async (id: number | null): Promise<void> => {
    // If id is null, clear the selection
    if (id === null) {
      setSelectedProjectId(null);
      setSelectedProject(null);
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      const project = await projectsService.getProject(id);
      setSelectedProject(project);
      setSelectedProjectId(id);
    } catch (err) {
      setError('Failed to fetch project details');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const clearSelectedProject = useCallback(() => {
    setSelectedProjectId(null);
    setSelectedProject(null);
  }, [setSelectedProjectId]);
  
  const createProject = async (project: Omit<Project, 'id' | 'created_at' | 'updated_at' | 'status'>): Promise<void> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const newProject = await projectsService.createProject(project);
      setProjects([...projects, newProject]);
    } catch (err) {
      setError('Failed to create project');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };
  
  const updateProject = async (id: number, project: Partial<Project>): Promise<void> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const updatedProject = await projectsService.updateProject(id, project);
      setProjects(projects.map(p => p.id === id ? updatedProject : p));
      
      if (selectedProject?.id === id) {
        setSelectedProject(updatedProject);
      }
    } catch (err) {
      setError('Failed to update project');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };
  
  const deleteProject = async (id: number): Promise<void> => {
    setIsLoading(true);
    setError(null);
    
    try {
      await projectsService.deleteProject(id);
      setProjects(projects.filter(p => p.id !== id));
      
      if (selectedProject?.id === id) {
        clearSelectedProject();
      }
    } catch (err) {
      setError('Failed to delete project');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Load project details from localStorage on mount
  useEffect(() => {
    if (isAuthenticated && selectedProjectId && !selectedProject && !isLoading) {
      selectProject(selectedProjectId);
    } else if (!selectedProjectId && selectedProject) {
      setSelectedProject(null);
    }
  }, [selectedProjectId, isAuthenticated, selectedProject, isLoading]);
  
  useEffect(() => {
    if (isAuthenticated) {
      fetchProjects();
    } else {
      // Clear projects if not authenticated
      setProjects([]);
      setSelectedProject(null);
    }
  }, [fetchProjects, isAuthenticated]);

  useEffect(() => {
    if (registerProjectContext) {
      registerProjectContext(clearSelectedProject);
    }
  }, [registerProjectContext, clearSelectedProject]);
  
  return (
    <ProjectContext.Provider
      value={{
        projects,
        selectedProject,
        isLoading,
        error,
        fetchProjects,
        selectProject,
        clearSelectedProject,
        createProject,
        updateProject,
        deleteProject,
      }}
    >
      {children}
    </ProjectContext.Provider>
  );
};

export const useProjectContext = (): ProjectContextProps => {
  const context = useContext(ProjectContext);
  
  if (context === undefined) {
    throw new Error('useProjectContext must be used within a ProjectProvider');
  }
  
  return context;
};

export default ProjectContext;