import api from '../api/api';

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

  if (data?.errors && typeof data.errors === 'object') {
    return Object.entries(data.errors)
      .map(([field, value]) => {
        const message = Array.isArray(value)
          ? value.join(', ')
          : String(value);

        return `${field}: ${message}`;
      })
      .join(' | ');
  }

  return (
    error?.message ||
    'Unable to connect to the OrionAI backend.'
  );
};

const reportService = {
  // ==========================================================
  // GET REPORTS
  // ==========================================================

  async getReports() {
    try {
      const response = await api.get('/reports');

      return Array.isArray(response.data)
        ? response.data
        : [];
    } catch (error) {
      console.error(
        'Failed to load reports:',
        error?.response?.status,
        error?.response?.data || error.message
      );

      throw new Error(
        normalizeError(error)
      );
    }
  },

  // ==========================================================
  // GET SINGLE REPORT
  // ==========================================================

  async getReportById(id) {
    if (!id) {
      throw new Error(
        'Report ID is required.'
      );
    }

    try {
      const response = await api.get(
        `/reports/${id}`
      );

      return response.data;
    } catch (error) {
      console.error(
        'Failed to load report:',
        error?.response?.status,
        error?.response?.data || error.message
      );

      throw new Error(
        normalizeError(error)
      );
    }
  },

  // ==========================================================
  // DOWNLOAD REPORT
  // ==========================================================

  async downloadReport(id) {
    if (!id) {
      throw new Error(
        'Report ID is required.'
      );
    }

    try {
      const response = await api.get(
        `/reports/${id}/download`,
        {
          responseType: 'blob',
        }
      );

      const blob = new Blob(
        [response.data],
        {
          type:
            response.headers?.['content-type'] ||
            'application/pdf',
        }
      );

      const url =
        window.URL.createObjectURL(blob);

      const link =
        document.createElement('a');

      link.href = url;

      link.setAttribute(
        'download',
        `report_${id}.pdf`
      );

      document.body.appendChild(link);

      link.click();

      link.remove();

      window.URL.revokeObjectURL(url);

      return true;

    } catch (error) {
      console.error(
        'Failed to download report:',
        error?.response?.status,
        error?.response?.data || error.message
      );

      throw new Error(
        normalizeError(error)
      );
    }
  },

  // ==========================================================
  // DELETE REPORT
  // ==========================================================

  async deleteReport(id) {
    if (!id) {
      throw new Error(
        'Report ID is required.'
      );
    }

    try {
      await api.delete(
        `/reports/${id}`
      );

      return true;

    } catch (error) {
      console.error(
        'Failed to delete report:',
        error?.response?.status,
        error?.response?.data || error.message
      );

      throw new Error(
        normalizeError(error)
      );
    }
  },
};

export { reportService };

export default reportService;