import { create } from 'zustand';
import { authService } from '../services/authService';

export const useAuthStore = create((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,

  login: async (credentials) => {
    set({
      isLoading: true,
      error: null,
    });

    try {
      const data = await authService.login(credentials);

      set({
        user: data.user || null,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });

      return true;
    } catch (err) {
      const message =
        err.response?.data?.error ||
        err.response?.data?.message ||
        err.message ||
        'Login failed';

      set({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: message,
      });

      return false;
    }
  },

  register: async (userData) => {
    set({
      isLoading: true,
      error: null,
    });

    try {
      const data = await authService.register(userData);

      set({
        user: data.user || null,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });

      return true;
    } catch (err) {
      const message =
        err.response?.data?.error ||
        err.response?.data?.message ||
        err.message ||
        'Registration failed';

      set({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: message,
      });

      return false;
    }
  },

  logout: () => {
    authService.logout();

    set({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
    });
  },

  checkAuth: async () => {
    const token = localStorage.getItem('orion_access_token');

    if (!token) {
      set({
        user: null,
        isAuthenticated: false,
        isLoading: false,
      });

      return false;
    }

    set({
      isLoading: true,
      error: null,
    });

    try {
      const user = await authService.getCurrentUser();

      set({
        user,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });

      return true;
    } catch (err) {
      authService.logout();

      set({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      });

      return false;
    }
  },
}));