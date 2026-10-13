import api from '../api/api';

export const authService = {
  async register(userData) {
    const response = await api.post('/auth/register', userData);

    if (response.data?.access_token) {
      localStorage.setItem(
        'orion_access_token',
        response.data.access_token
      );

      localStorage.setItem(
        'orion_refresh_token',
        response.data.refresh_token || ''
      );
    }

    const user = await this.getCurrentUser();
    return { ...response.data, user };
  },

  async login(credentials) {
    const response = await api.post('/auth/login', credentials);

    if (response.data?.access_token) {
      localStorage.setItem(
        'orion_access_token',
        response.data.access_token
      );

      localStorage.setItem(
        'orion_refresh_token',
        response.data.refresh_token || ''
      );
    }

    const user = await this.getCurrentUser();
    return { ...response.data, user };
  },

  async getCurrentUser() {
    const response = await api.get('/auth/me');
    return response.data;
  },

  logout() {
    localStorage.removeItem('orion_access_token');
    localStorage.removeItem('orion_refresh_token');
  },
};