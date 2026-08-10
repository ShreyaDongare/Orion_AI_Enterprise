import api from '../api/api';


// ============================================================
// PRESENTATION SERVICE
// ============================================================

const presentationService = {

  // ============================================================
  // GET PRESENTATIONS
  // ============================================================

  async getPresentations(projectId = null) {

    try {

      const params = {};

      if (projectId) {
        params.project_id = projectId;
      }

      const response = await api.get(
        '/presentations',
        {
          params,
        }
      );

      return response.data || [];

    } catch (error) {

      console.error(
        'Failed to load presentations:',
        error.response?.data ||
        error.message
      );

      throw error;
    }
  },


  // ============================================================
  // GET SINGLE PRESENTATION
  // ============================================================

  async getPresentation(
    presentationId
  ) {

    if (!presentationId) {
      throw new Error(
        'Presentation ID is required.'
      );
    }

    try {

      const response = await api.get(
        `/presentations/${presentationId}`
      );

      return response.data;

    } catch (error) {

      console.error(
        'Failed to load presentation:',
        error.response?.data ||
        error.message
      );

      throw error;
    }
  },


  // ============================================================
  // DOWNLOAD PRESENTATION
  // ============================================================

  async downloadPresentation(
    presentationId,
    title = 'Presentation'
  ) {

    if (!presentationId) {
      throw new Error(
        'Presentation ID is required.'
      );
    }

    try {

      console.log(
        'Downloading presentation:',
        presentationId
      );

      const response = await api.get(
        `/presentations/${presentationId}/download`,
        {
          responseType: 'blob',
        }
      );

      // --------------------------------------------------------
      // Create Blob
      // --------------------------------------------------------

      const blob = new Blob(
        [response.data],
        {
          type:
            'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        }
      );

      // --------------------------------------------------------
      // Create temporary URL
      // --------------------------------------------------------

      const url =
        window.URL.createObjectURL(blob);

      // --------------------------------------------------------
      // Create download link
      // --------------------------------------------------------

      const link =
        document.createElement('a');

      link.href = url;

      const safeTitle =
        String(title || 'Presentation')
          .replace(
            /[^a-zA-Z0-9_-]+/g,
            '_'
          )
          .replace(
            /^_+|_+$/g,
            ''
          );

      link.download =
        `OrionAI_${safeTitle || 'Presentation'}.pptx`;

      document.body.appendChild(
        link
      );

      link.click();

      document.body.removeChild(
        link
      );

      // --------------------------------------------------------
      // Cleanup
      // --------------------------------------------------------

      window.URL.revokeObjectURL(
        url
      );

      console.log(
        'Presentation downloaded successfully.'
      );

      return true;

    } catch (error) {

      console.error(
        'Failed to download presentation:',
        error.response?.data ||
        error.message
      );

      throw error;
    }
  },


  // ============================================================
  // DELETE PRESENTATION
  // ============================================================

  async deletePresentation(
    presentationId
  ) {

    if (!presentationId) {
      throw new Error(
        'Presentation ID is required.'
      );
    }

    try {

      await api.delete(
        `/presentations/${presentationId}`
      );

      console.log(
        'Presentation deleted:',
        presentationId
      );

      return true;

    } catch (error) {

      console.error(
        'Failed to delete presentation:',
        error.response?.data ||
        error.message
      );

      throw error;
    }
  },
};


// ============================================================
// EXPORT
// ============================================================

export { presentationService };

export default presentationService;