import { create } from 'zustand';
import { knowledgeService } from '../services/knowledgeService';


// ============================================================
// KNOWLEDGE STORE
// REAL BACKEND ONLY
// ============================================================

export const useKnowledgeStore = create(
  (set, get) => ({

    // ========================================================
    // DATABASE STATE
    // ========================================================

    collections: [],

    activeCollection: null,

    isLoading: false,

    isUploading: false,

    searchQuery: '',

    error: null,


    // ========================================================
    // UI
    // ========================================================

    setSearchQuery: (query) => {

      set({
        searchQuery:
          query || '',
      });

    },


    setActiveCollection: (
      collection
    ) => {

      set({
        activeCollection:
          collection || null,
      });

    },


    // ========================================================
    // LOAD COLLECTIONS
    // REAL BACKEND ONLY
    // ========================================================

    loadCollections: async () => {

      set({
        isLoading: true,
        error: null,
      });


      try {

        const data =
          await knowledgeService
            .getCollections();


        const collections =
          Array.isArray(data)
            ? data
            : [];


        set({

          collections,

          activeCollection:
            collections.length > 0
              ? collections[0]
              : null,

          isLoading: false,

          error: null,

        });


        return collections;

      } catch (error) {

        console.error(
          'Failed to load knowledge collections:',
          error
        );


        /*
         * IMPORTANT:
         *
         * Keep the last successful collection
         * data when a refresh fails.
         *
         * This prevents the Dashboard from
         * incorrectly showing 0 collections
         * during a temporary API/auth/network
         * problem.
         */

        set({

          isLoading: false,

          error:
            error?.response?.data?.message ||
            error?.message ||
            'Unable to load knowledge collections.',

        });


        return get().collections;

      }

    },


    // ========================================================
    // CREATE COLLECTION
    // ========================================================

    createCollection: async ({
      name,
      description = '',
    }) => {

      if (
        !name ||
        !name.trim()
      ) {

        const error =
          new Error(
            'Collection name is required.'
          );


        set({
          error:
            error.message,
        });


        throw error;

      }


      set({

        isLoading: true,

        error: null,

      });


      try {

        const newCollection =
          await knowledgeService
            .createCollection({

              name:
                name.trim(),

              description:
                description.trim(),

            });


        if (
          !newCollection?.id
        ) {

          throw new Error(
            'Backend did not return a valid collection.'
          );

        }


        console.log(
          'Knowledge collection created:',
          newCollection
        );


        // ====================================================
        // RELOAD REAL DATABASE DATA
        // ====================================================

        const collections =
          await get()
            .loadCollections();


        // ====================================================
        // SELECT CREATED COLLECTION
        // ====================================================

        const createdCollection =
          collections.find(
            (collection) =>
              collection.id ===
              newCollection.id
          ) ||
          newCollection;


        set({

          activeCollection:
            createdCollection,

          isLoading: false,

          error: null,

        });


        return createdCollection;

      } catch (error) {

        console.error(
          'Failed to create knowledge collection:',
          error
        );


        set({

          isLoading: false,

          error:
            error?.response?.data?.message ||
            error?.message ||
            'Unable to create knowledge collection.',

        });


        throw error;

      }

    },


    // ========================================================
    // UPLOAD DOCUMENT
    // ========================================================

    uploadDocument: async ({
      collectionId,
      file,
      tags = [],
    }) => {

      if (!collectionId) {

        const error =
          new Error(
            'Collection ID is required.'
          );


        set({
          error:
            error.message,
        });


        throw error;

      }


      if (!file) {

        const error =
          new Error(
            'File is required.'
          );


        set({
          error:
            error.message,
        });


        throw error;

      }


      set({

        isUploading: true,

        error: null,

      });


      try {

        const newDocument =
          await knowledgeService
            .uploadDocument({

              collectionId,

              file,

              tags,

            });


        console.log(
          'Document uploaded:',
          newDocument
        );


        // ====================================================
        // REFRESH REAL BACKEND DATA
        // ====================================================

        await get()
          .loadCollections();


        set({

          isUploading: false,

          error: null,

        });


        return newDocument;

      } catch (error) {

        console.error(
          'Failed to upload document:',
          error
        );


        set({

          isUploading: false,

          error:
            error?.response?.data?.message ||
            error?.message ||
            'Unable to upload document.',

        });


        throw error;

      }

    },


    // ========================================================
    // DELETE DOCUMENT
    // ========================================================

    deleteDocument: async (
      docId
    ) => {

      if (!docId) {

        return false;

      }


      try {

        await knowledgeService
          .deleteDocument(
            docId
          );


        // ====================================================
        // REFRESH REAL BACKEND DATA
        // ====================================================

        await get()
          .loadCollections();


        set({
          error: null,
        });


        return true;

      } catch (error) {

        console.error(
          'Failed to delete document:',
          error
        );


        set({

          error:
            error?.response?.data?.message ||
            error?.message ||
            'Unable to delete document.',

        });


        throw error;

      }

    },


    // ========================================================
    // CLEAR ERROR
    // ========================================================

    clearError: () => {

      set({
        error: null,
      });

    },

  })
);


// ============================================================
// DEFAULT EXPORT
// ============================================================

export default useKnowledgeStore;