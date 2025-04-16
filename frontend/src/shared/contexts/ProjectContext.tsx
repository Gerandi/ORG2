import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Project } from '../../types/project';
import projectsService from '../services/projectsService';
import { useAuthContext } from './AuthContext';

interface ProjectContextProps {
  projects: Project[];
  selectedProject: Project | null;
  isLoading: boolean;
  error: string | null;
  fetchProjects: () => Promise<void>;
  selectProject: (id: number) => Promise<void>;
  createProject: (project: Omit<Project, 'id' | 'created_at' | 'updated_at' | 'status'>) => Promise<void>;
  updateProject: (id: number, project: Partial<Project>) => Promise<void>;
  deleteProject: (id: number) => Promise<void>;
}

const ProjectContext = createContext<ProjectContextProps | undefined>(undefined);

export const ProjectProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const { isAuthenticated } = useAuthContext();
  const [projects, setProjects] = useState<Project[]>([]);
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
  
  const selectProject = async (id: number): Promise<void> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const project = await projectsService.getProject(id);
      setSelectedProject(project);
    } catch (err) {
      setError('Failed to fetch project details');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };
  
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
        setSelectedProject(null);
      }
    } catch (err) {
      setError('Failed to delete project');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };
  
  useEffect(() => {
    if (isAuthenticated) {
      fetchProjects();
    } else {
      // Clear projects if not authenticated
      setProjects([]);
      setSelectedProject(null);
    }
  }, [fetchProjects, isAuthenticated]);
  
  return (
    <ProjectContext.Provider
      value={{
        projects,
        selectedProject,
        isLoading,
        error,
        fetchProjects,
        selectProject,
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