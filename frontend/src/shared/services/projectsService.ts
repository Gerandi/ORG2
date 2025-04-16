import apiService from './api';
import { Project } from '../../types/project';

class ProjectsService {
  private static instance: ProjectsService;
  private readonly baseUrl = '/api/projects';
  
  private constructor() {}
  
  public static getInstance(): ProjectsService {
    if (!ProjectsService.instance) {
      ProjectsService.instance = new ProjectsService();
    }
    return ProjectsService.instance;
  }
  
  // Get all projects
  public async getProjects(): Promise<Project[]> {
    try {
      // Check if authenticated before fetching
      const token = localStorage.getItem('access_token');
      if (!token) {
        console.log('No authentication token, returning empty projects array');
        return [];
      }
      
      const projects = await apiService.get<Project[]>(this.baseUrl);
      return projects || [];
    } catch (error) {
      console.error('Error fetching projects:', error);
      // Return empty array for any error to prevent UI crashes
      return [];
    }
  }
  
  // Get a single project by ID
  public async getProject(id: number): Promise<Project> {
    return apiService.get<Project>(`${this.baseUrl}/${id}`);
  }
  
  // Create a new project
  public async createProject(project: Omit<Project, 'id' | 'created_at' | 'updated_at' | 'status'>): Promise<Project> {
    return apiService.post<Project>(this.baseUrl, project);
  }
  
  // Update a project
  public async updateProject(id: number, project: Partial<Project>): Promise<Project> {
    return apiService.put<Project>(`${this.baseUrl}/${id}`, project);
  }
  
  // Delete a project
  public async deleteProject(id: number): Promise<void> {
    return apiService.delete<void>(`${this.baseUrl}/${id}`);
  }
}

export const projectsService = ProjectsService.getInstance();
export default projectsService;