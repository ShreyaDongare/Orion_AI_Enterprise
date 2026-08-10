import { create } from 'zustand';
import { projectService } from '../services/projectService';


// ============================================================
// PROJECT STORE
// REAL BACKEND ONLY
// ============================================================

export const useProjectStore = create((set, get) => ({

  // ============================================================
  // DATABASE STATE
  // ============================================================

  projects: [],

  activeProject: null,

  isLoading: false,

  error: null,


  // ============================================================
  // FILTER / SEARCH STATE
  // ============================================================

  filterStatus: 'all',

  searchQuery: '',


  // ============================================================
  // UI ACTIONS
  // ============================================================

  setSearchQuery: (query) => {

    set({
      searchQuery:
        query || '',
    });

  },


  setFilterStatus: (status) => {

    set({
      filterStatus:
        status || 'all',
    });

  },


  setActiveProject: (project) => {

    set({
      activeProject:
        project || null,
    });

  },


  // ============================================================
  // LOAD PROJECTS
  // ============================================================

  loadProjects: async () => {

    set({
      isLoading: true,
      error: null,
    });


    try {

      const data =
        await projectService.getProjects();


      const projects =
        Array.isArray(data)
          ? data
          : [];


      set({
        projects,

        activeProject:
          projects.length > 0
            ? projects[0]
            : null,

        isLoading: false,

        error: null,
      });


      return projects;

    } catch (error) {

      console.error(
        'Failed to load projects:',
        error
      );


      /*
       * IMPORTANT:
       * Do NOT clear the existing projects when
       * a refresh request fails.
       *
       * This prevents the dashboard from suddenly
       * displaying "0 Projects" during a temporary
       * network/authentication/backend error.
       */

      set({
        isLoading: false,

        error:
          error?.message ||
          'Unable to load projects.',
      });


      return get().projects;

    }

  },


  // ============================================================
  // GET PROJECT BY ID
  // ============================================================

  getProjectById: async (id) => {

    if (!id) {

      throw new Error(
        'Project ID is required.'
      );

    }


    try {

      const project =
        await projectService.getProjectById(
          id
        );


      if (!project?.id) {

        throw new Error(
          'Backend did not return a valid project.'
        );

      }


      // Update the project in the local store.

      set((state) => {

        const existingProjects =
          Array.isArray(
            state.projects
          )
            ? state.projects
            : [];


        const exists =
          existingProjects.some(
            (item) =>
              item.id === project.id
          );


        return {

          projects:
            exists

              ? existingProjects.map(
                  (item) =>
                    item.id === project.id
                      ? project
                      : item
                )

              : [
                  project,
                  ...existingProjects,
                ],

          activeProject:
            project,

          error: null,

        };

      });


      return project;

    } catch (error) {

      console.error(
        `Failed to load project ${id}:`,
        error
      );


      set({
        error:
          error?.message ||
          'Unable to load project.',
      });


      throw error;

    }

  },


  // ============================================================
  // CREATE PROJECT
  // ============================================================

  createProject: async (
    projectData
  ) => {

    set({
      error: null,
    });


    try {

      const newProject =
        await projectService.createProject(
          projectData
        );


      if (!newProject?.id) {

        throw new Error(
          'Backend did not return a valid project.'
        );

      }


      set((state) => ({

        projects: [
          newProject,

          ...(Array.isArray(
            state.projects
          )
            ? state.projects
            : []),
        ],

        activeProject:
          newProject,

        error: null,

      }));


      return newProject;

    } catch (error) {

      console.error(
        'Failed to create project:',
        error
      );


      set({
        error:
          error?.message ||
          'Unable to create project.',
      });


      throw error;

    }

  },


  // ============================================================
  // UPDATE PROJECT
  // ============================================================

  updateProject: async (
    id,
    projectData
  ) => {

    if (!id) {

      throw new Error(
        'Project ID is required.'
      );

    }


    try {

      const updatedProject =
        await projectService.updateProject(
          id,
          projectData
        );


      if (!updatedProject?.id) {

        throw new Error(
          'Backend did not return the updated project.'
        );

      }


      set((state) => {

        const projects =
          Array.isArray(
            state.projects
          )
            ? state.projects
            : [];


        const updatedProjects =
          projects.map(
            (project) =>
              project.id === id
                ? updatedProject
                : project
          );


        return {

          projects:
            updatedProjects,

          activeProject:
            state.activeProject?.id === id
              ? updatedProject
              : state.activeProject,

          error: null,

        };

      });


      return updatedProject;

    } catch (error) {

      console.error(
        `Failed to update project ${id}:`,
        error
      );


      set({
        error:
          error?.message ||
          'Unable to update project.',
      });


      throw error;

    }

  },


  // ============================================================
  // DELETE PROJECT
  // ============================================================

  deleteProject: async (
    id
  ) => {

    if (!id) {

      throw new Error(
        'Project ID is required.'
      );

    }


    try {

      await projectService.deleteProject(
        id
      );


      set((state) => {

        const projects =
          Array.isArray(
            state.projects
          )
            ? state.projects
            : [];


        const filteredProjects =
          projects.filter(
            (project) =>
              project.id !== id
          );


        const deletedActiveProject =
          state.activeProject?.id === id;


        return {

          projects:
            filteredProjects,

          activeProject:
            deletedActiveProject
              ? (
                  filteredProjects[0] ||
                  null
                )
              : state.activeProject,

          error: null,

        };

      });


      return true;

    } catch (error) {

      console.error(
        `Failed to delete project ${id}:`,
        error
      );


      set({
        error:
          error?.message ||
          'Unable to delete project.',
      });


      throw error;

    }

  },


  // ============================================================
  // CLEAR ERROR
  // ============================================================

  clearError: () => {

    set({
      error: null,
    });

  },

}));


// ============================================================
// DEFAULT EXPORT
// ============================================================

export default useProjectStore;