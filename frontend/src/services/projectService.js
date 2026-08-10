import api from '../api/api';

// ============================================================
// PROJECT SERVICE
// REAL BACKEND ONLY
// ============================================================
//
// This service communicates only with the Flask backend.
//
// IMPORTANT:
// - No MOCK_PROJECTS
// - No fake project IDs
// - No fake fallback records
// - Backend errors are propagated to the UI
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

export const projectService = {
  // ==========================================================
  // GET ALL PROJECTS
  // ==========================================================

  async getProjects() {
    try {
      const response = await api.get('/projects');

      return Array.isArray(response.data)
        ? response.data
        : [];
    } catch (error) {
      console.error(
        'Failed to load projects:',
        error?.response?.status,
        error?.response?.data || error.message
      );

      throw new Error(
        normalizeError(error)
      );
    }
  },

  // ==========================================================
  // GET PROJECT BY ID
  // ==========================================================

  async getProjectById(id) {
    if (!id) {
      throw new Error(
        'Project ID is required.'
      );
    }

    try {
      const response = await api.get(
        `/projects/${id}`
      );

      if (!response.data) {
        throw new Error(
          'Backend did not return project data.'
        );
      }

      return response.data;
    } catch (error) {
      console.error(
        `Failed to load project ${id}:`,
        error?.response?.status,
        error?.response?.data || error.message
      );

      throw new Error(
        normalizeError(error)
      );
    }
  },

  // ==========================================================
  // CREATE PROJECT
  // ==========================================================

  async createProject(projectData) {
    if (!projectData || typeof projectData !== 'object') {
      throw new Error(
        'Project data is required.'
      );
    }

    if (
      !projectData.name ||
      typeof projectData.name !== 'string' ||
      !projectData.name.trim()
    ) {
      throw new Error(
        'Project name is required.'
      );
    }

    try {
      const payload = {
        ...projectData,
        name: projectData.name.trim(),
      };

      const response = await api.post(
        '/projects',
        payload
      );

      if (!response.data?.id) {
        throw new Error(
          'Backend created the project but did not return a project ID.'
        );
      }

      return response.data;
    } catch (error) {
      console.error(
        'Failed to create project:',
        error?.response?.status,
        error?.response?.data || error.message
      );

      throw new Error(
        normalizeError(error)
      );
    }
  },

  // ==========================================================
  // UPDATE PROJECT
  // ==========================================================

  async updateProject(id, projectData) {
    if (!id) {
      throw new Error(
        'Project ID is required.'
      );
    }

    if (
      !projectData ||
      typeof projectData !== 'object'
    ) {
      throw new Error(
        'Project update data is required.'
      );
    }

    try {
      const response = await api.put(
        `/projects/${id}`,
        projectData
      );

      if (!response.data) {
        throw new Error(
          'Backend did not return the updated project.'
        );
      }

      return response.data;
    } catch (error) {
      console.error(
        `Failed to update project ${id}:`,
        error?.response?.status,
        error?.response?.data || error.message
      );

      throw new Error(
        normalizeError(error)
      );
    }
  },

  // ==========================================================
  // DELETE PROJECT
  // ==========================================================

  async deleteProject(id) {
    if (!id) {
      throw new Error(
        'Project ID is required.'
      );
    }

    try {
      await api.delete(
        `/projects/${id}`
      );

      return true;
    } catch (error) {
      console.error(
        `Failed to delete project ${id}:`,
        error?.response?.status,
        error?.response?.data || error.message
      );

      throw new Error(
        normalizeError(error)
      );
    }
  },
};

export default projectService;