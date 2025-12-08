import apiClient from './apiClient';

export interface RegisterData {
  username: string;
  email: string;
  password: string;
  fullname: string;
}

export interface LoginData {
  username: string;
  password: string;
}

export interface User {
  id: string;
  username: string;
  email: string;
  fullname: string;
  isAdmin: boolean;
  createdAt?: string;
}

export interface AuthResponse {
  status: string;
  message: string;
  data: {
    token: string;
    user: User;
  };
}

export const authAPI = {
  register: async (data: RegisterData): Promise<AuthResponse> => {
    const response = await apiClient.post('/auth/register', data);
    return response.data;
  },

  login: async (data: LoginData): Promise<AuthResponse> => {
    const response = await apiClient.post('/auth/login', data);
    return response.data;
  },

  logout: async (): Promise<void> => {
    try {
      await apiClient.post('/auth/logout');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('isLoggedIn');
    }
  },

  getCurrentUser: async (): Promise<{ status: string; data: { user: User } }> => {
    const response = await apiClient.get('/auth/me');
    return response.data;
  }
};


