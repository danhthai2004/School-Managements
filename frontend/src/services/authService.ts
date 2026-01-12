import api from './api';
import type { LoginResponse } from '../types/auth.types';

export const authService = {
  // Login with Google
  loginWithGoogle: async (idToken: string): Promise<LoginResponse> => {
    const response = await api.post('/auth/google', { idToken });
    return response.data;
  },

  // Logout
  logout: async (): Promise<void> => {
    await api.post('/auth/logout');
  },

  // Get current user
  getCurrentUser: async () => {
    const response = await api.get('/auth/me');
    return response.data;
  },
};
