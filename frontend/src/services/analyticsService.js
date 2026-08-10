import api from '../api/api';
import { MOCK_ANALYTICS } from '../constants/mockData';

export const analyticsService = {
  async getAnalytics() {
    try {
      const response = await api.get('/analytics');
      return response.data;
    } catch (error) {
      return MOCK_ANALYTICS;
    }
  }
};
