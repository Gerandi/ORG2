export interface User {
  id: number;
  email: string;
  username: string;
  is_active: boolean;
  is_superuser: boolean;
  first_name: string | null;
  last_name: string | null;
  created_at: string;
  updated_at: string;
  last_login: string | null;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface RegisterData {
  email: string;
  username: string;
  password: string;
  first_name?: string;
  last_name?: string;
  is_active?: boolean;
  is_superuser?: boolean;
  is_verified?: boolean;
  firstName?: string;  // Support for both snake_case and camelCase
  lastName?: string;   // Support for both snake_case and camelCase
}

export interface AuthResponse {
  access_token: string;
  refresh_token?: string;
  token_type: string;
}

export interface ResetPasswordData {
  token: string;
  password: string;
}