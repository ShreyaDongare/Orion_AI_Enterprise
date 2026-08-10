import api from '../api/api';

// ==========================================================
// NORMALIZE API ERROR
// ==========================================================

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

  if (
    data?.errors &&
    typeof data.errors === 'object'
  ) {
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


// ==========================================================
// CHECK WHETHER VALUE IS A REAL POSTGRESQL UUID
// ==========================================================

const isValidUUID = (value) => {
  if (
    !value ||
    typeof value !== 'string'
  ) {
    return false;
  }

  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
};


// ==========================================================
// CHAT SERVICE
// ==========================================================

export const chatService = {

  // ========================================================
  // CREATE REAL DATABASE CONVERSATION
  // ========================================================

  async createConversation({
    projectId = null,
    title = 'New Enterprise Workspace Chat',
    agentType = 'chat',
  } = {}) {

    try {

      const payload = {
        title,
        agent_type:
          agentType || 'chat',
      };


      /*
       * IMPORTANT:
       *
       * The frontend may still have a mock project ID
       * such as "proj_1".
       *
       * PostgreSQL expects a UUID.
       *
       * Therefore:
       * - Send project_id only when it is a real UUID.
       * - Otherwise backend will use the default/first project.
       */

      if (
        isValidUUID(projectId)
      ) {
        payload.project_id =
          projectId;
      }


      console.log(
        'Creating OrionAI conversation:',
        payload
      );


      const response =
        await api.post(
          '/chat/conversations',
          payload
        );


      console.log(
        'Created real conversation:',
        response.data
      );


      if (
        !response.data?.id
      ) {
        throw new Error(
          'Backend created the conversation but did not return a conversation ID.'
        );
      }


      return response.data;

    } catch (error) {

      console.error(
        'Conversation creation failed:',
        error?.response?.status,
        error?.response?.data ||
          error.message
      );


      throw new Error(
        normalizeError(error)
      );
    }
  },


  // ========================================================
  // GET CONVERSATIONS
  // ========================================================

  async getConversations(
    projectId = null
  ) {

    try {

      const params = {};


      /*
       * Only send project_id when it is a
       * real PostgreSQL UUID.
       */

      if (
        isValidUUID(projectId)
      ) {
        params.project_id =
          projectId;
      }


      const response =
        await api.get(
          '/chat/conversations',
          {
            params,
          }
        );


      return Array.isArray(
        response.data
      )
        ? response.data
        : [];

    } catch (error) {

      console.error(
        'Failed to load conversations:',
        error?.response?.status,
        error?.response?.data ||
          error.message
      );


      throw new Error(
        normalizeError(error)
      );
    }
  },


  // ========================================================
  // GET MESSAGES
  // ========================================================

  async getMessages(
    conversationId
  ) {

    if (!conversationId) {
      return [];
    }


    /*
     * Conversation IDs created by the backend
     * should always be UUIDs.
     */

    if (
      !isValidUUID(conversationId)
    ) {

      console.warn(
        'Ignoring invalid conversation ID:',
        conversationId
      );

      return [];
    }


    try {

      const response =
        await api.get(
          `/chat/messages/${conversationId}`
        );


      return Array.isArray(
        response.data
      )
        ? response.data
        : [];

    } catch (error) {

      console.error(
        'Failed to load messages:',
        error?.response?.status,
        error?.response?.data ||
          error.message
      );


      throw new Error(
        normalizeError(error)
      );
    }
  },


  // ========================================================
  // SEND MESSAGE
  // ========================================================

  async sendMessage({
    conversationId,
    message,
    agentType = 'chat',
    ragCollection = null,
  }) {

    // ======================================================
    // VALIDATE CONVERSATION
    // ======================================================

    if (!conversationId) {

      throw new Error(
        'No conversation ID is available. Please start a new conversation first.'
      );
    }


    if (
      !isValidUUID(conversationId)
    ) {

      throw new Error(
        'Invalid conversation ID. Please start a new conversation first.'
      );
    }


    // ======================================================
    // VALIDATE MESSAGE
    // ======================================================

    if (
      !message ||
      typeof message !== 'string' ||
      !message.trim()
    ) {

      throw new Error(
        'Message cannot be empty.'
      );
    }


    // ======================================================
    // NORMALIZE AGENT
    // ======================================================

    const normalizedAgent =
      agentType ||
      'chat';


    // ======================================================
    // BUILD REQUEST PAYLOAD
    // ======================================================

    const payload = {
      conversation_id:
        conversationId,

      message:
        message.trim(),

      /*
       * IMPORTANT:
       *
       * This tells the backend which agent
       * the user selected in the frontend.
       */

      agent_type:
        normalizedAgent,

      /*
       * Knowledge Agent can use a specific
       * RAG collection.
       *
       * For other agents this can be null.
       */

      rag_collection:
        ragCollection || null,
    };


    console.log(
      'Sending OrionAI request:',
      payload
    );


    // ======================================================
    // SEND REQUEST TO FLASK
    // ======================================================

    try {

      const response =
        await api.post(
          '/chat/message',
          payload
        );


      console.log(
        'OrionAI backend response:',
        response.data
      );


      // ====================================================
      // NORMALIZE SOURCES
      // ====================================================

      /*
       * Do not remove sources.
       *
       * Knowledge Agent may return:
       *
       * sources: [...]
       *
       * Other agents may return:
       *
       * sources: []
       */

      const normalizedResponse = {
        ...response.data,

        sources:
          Array.isArray(
            response.data?.sources
          )
            ? response.data.sources
            : [],
      };


      return normalizedResponse;

    } catch (error) {

      console.error(
        'OrionAI chat API error:',
        error?.response?.status,
        error?.response?.data ||
          error.message
      );


      throw new Error(
        normalizeError(error)
      );
    }
  },


  // ========================================================
  // DELETE CONVERSATION
  // ========================================================

  async deleteConversation(
    conversationId
  ) {

    if (!conversationId) {
      return true;
    }


    if (
      !isValidUUID(conversationId)
    ) {

      console.warn(
        'Ignoring delete for invalid conversation ID:',
        conversationId
      );

      return true;
    }


    try {

      await api.delete(
        `/chat/conversations/${conversationId}`
      );


      return true;

    } catch (error) {

      console.error(
        'Failed to delete conversation:',
        error?.response?.status,
        error?.response?.data ||
          error.message
      );


      throw new Error(
        normalizeError(error)
      );
    }
  },
};


export default chatService;