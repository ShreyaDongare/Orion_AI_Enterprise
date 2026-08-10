import api from '../api/api';

export const emailService = {

  // ============================================================
  // GET EMAILS FROM DATABASE
  // ============================================================

  async getEmails() {
    try {
      const response = await api.get('/emails');

      return Array.isArray(response.data)
        ? response.data
        : [];

    } catch (error) {

      console.error(
        'Failed to load emails:',
        error
      );

      throw error;
    }
  },


  // ============================================================
  // GET SINGLE EMAIL
  // ============================================================

  async getEmailById(id) {

    if (!id) {
      throw new Error(
        'Email ID is required.'
      );
    }

    try {

      const response = await api.get(
        `/emails/${id}`
      );

      return response.data;

    } catch (error) {

      console.error(
        'Failed to load email:',
        error
      );

      throw error;
    }
  },


  // ============================================================
  // CREATE EMAIL
  // ============================================================

  async createEmail(emailData) {

    try {

      const response = await api.post(
        '/emails',
        emailData
      );

      return response.data;

    } catch (error) {

      console.error(
        'Failed to create email:',
        error
      );

      throw error;
    }
  },


  // ============================================================
  // DELETE EMAIL
  // ============================================================

  async deleteEmail(id) {

    if (!id) {
      throw new Error(
        'Email ID is required.'
      );
    }

    try {

      await api.delete(
        `/emails/${id}`
      );

      return true;

    } catch (error) {

      console.error(
        'Failed to delete email:',
        error
      );

      throw error;
    }
  },
};

export default emailService;