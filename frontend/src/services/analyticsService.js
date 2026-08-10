import api from '../api/api';

// ============================================================
// ANALYTICS SERVICE
// REAL BACKEND ONLY
// ============================================================

const normalizeError = (error) => {
  const data = error?.response?.data;

  if (typeof data?.message === 'string') {
    return data.message;
  }

  if (typeof data?.error === 'string') {
    return data.error;
  }

  if (typeof data?.detail === 'string') {
    return data.detail;
  }

  return (
    error?.message ||
    'Unable to load analytics.'
  );
};

export const analyticsService = {
  // ==========================================================
  // GET REAL ANALYTICS
  // ==========================================================

  async getAnalytics() {
    try {
      const response = await api.get('/analytics');

      if (!response.data) {
        throw new Error(
          'Backend did not return analytics data.'
        );
      }

      return response.data;
    } catch (error) {
      console.error(
        'Failed to load analytics:',
        error?.response?.status,
        error?.response?.data || error?.message
      );

      // IMPORTANT:
      // Do NOT return mock/fake analytics.
      throw new Error(
        normalizeError(error)
      );
    }
  },
};

export default analyticsService;