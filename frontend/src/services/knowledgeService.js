import api from '../api/api';

export const knowledgeService = {
  // =========================================================
  // GET KNOWLEDGE COLLECTIONS
  // =========================================================

  async getCollections() {
    const response = await api.get(
      '/knowledge/collections'
    );

    return response.data;
  },

  // =========================================================
  // CREATE KNOWLEDGE COLLECTION
  // =========================================================

  async createCollection({
    name,
    description = '',
  }) {
    const response = await api.post(
      '/knowledge/collections',
      {
        name,
        description,
      }
    );

    return response.data;
  },

  // =========================================================
  // UPLOAD DOCUMENT
  // =========================================================

  async uploadDocument({
    collectionId,
    file,
    tags = [],
  }) {
    const formData = new FormData();

    formData.append(
      'collection_id',
      collectionId
    );

    formData.append(
      'file',
      file
    );

    formData.append(
      'tags',
      JSON.stringify(tags)
    );

    const response = await api.post(
      '/knowledge/documents',
      formData,
      {
        headers: {
          'Content-Type':
            'multipart/form-data',
        },
      }
    );

    return response.data;
  },

  // =========================================================
  // DELETE DOCUMENT
  // =========================================================

  async deleteDocument(docId) {
    await api.delete(
      `/knowledge/documents/${docId}`
    );

    return true;
  },
};