import { create } from 'zustand';
import { chatService } from '../services/chatService';
import { AGENT_TYPES } from '../constants/agents';


// ============================================================
// HELPERS
// ============================================================

const getAgentType = (
  selectedAgent,
  activeAgentId
) => {

  return (
    selectedAgent ||
    activeAgentId ||
    AGENT_TYPES.GENERAL
  );

};


// ============================================================
// CHAT STORE
// REAL BACKEND ONLY
// ============================================================

export const useChatStore = create(
  (set, get) => ({

    // ========================================================
    // STATE
    // ========================================================

    conversations: [],

    activeConversationId: null,

    messages: [],

    selectedAgent:
      AGENT_TYPES.GENERAL,

    activeAgentId:
      AGENT_TYPES.GENERAL,

    isTyping: false,

    isGenerating: false,

    isLoadingMessages: false,

    isLoadingConversations: false,

    searchQuery: '',

    error: null,


    // ========================================================
    // SEARCH
    // ========================================================

    setSearchQuery: (query) => {

      set({
        searchQuery:
          query || '',
      });

    },


    // ========================================================
    // AGENT SELECTION
    // ========================================================

    setSelectedAgent: (
      agentType
    ) => {

      const selected =
        agentType ||
        AGENT_TYPES.GENERAL;


      set({

        selectedAgent:
          selected,

        activeAgentId:
          selected,

      });

    },


    setActiveAgent: (
      agentType
    ) => {

      const selected =
        agentType ||
        AGENT_TYPES.GENERAL;


      set({

        selectedAgent:
          selected,

        activeAgentId:
          selected,

      });

    },


    // ========================================================
    // GENERATION STATE
    // ========================================================

    setIsGenerating: (
      value
    ) => {

      const generating =
        Boolean(value);


      set({

        isGenerating:
          generating,

        isTyping:
          generating,

      });

    },


    // ========================================================
    // CREATE CONVERSATION
    // REAL BACKEND ONLY
    // ========================================================

    createNewChat: async (
      projectId = null,
      agentType =
        AGENT_TYPES.GENERAL,
      title =
        'New Enterprise Workspace Chat'
    ) => {

      set({

        error: null,

        isLoadingMessages:
          true,

      });


      try {

        const selectedAgent =
          agentType ||
          AGENT_TYPES.GENERAL;


        const newConversation =
          await chatService.createConversation({

            projectId,

            title,

            agentType:
              selectedAgent,

          });


        if (
          !newConversation?.id
        ) {

          throw new Error(
            'Backend did not return a valid conversation ID.'
          );

        }


        set((state) => ({

          conversations: [

            newConversation,

            ...(Array.isArray(
              state.conversations
            )
              ? state.conversations
              : []),

          ],

          activeConversationId:
            newConversation.id,

          messages: [],

          selectedAgent:
            selectedAgent,

          activeAgentId:
            selectedAgent,

          isLoadingMessages:
            false,

          error: null,

        }));


        return newConversation;

      } catch (error) {

        console.error(
          'Failed to create OrionAI conversation:',
          error
        );


        set({

          isLoadingMessages:
            false,

          error:
            error?.message ||
            'Unable to create a new conversation.',

        });


        throw error;

      }

    },


    // ========================================================
    // SELECT CONVERSATION
    // LOAD MESSAGES FROM BACKEND
    // ========================================================

    setActiveConversation:
      async (
        conversationId
      ) => {

        if (!conversationId) {

          set({

            activeConversationId:
              null,

            messages: [],

            isLoadingMessages:
              false,

          });

          return;

        }


        set({

          activeConversationId:
            conversationId,

          isLoadingMessages:
            true,

          error: null,

        });


        try {

          const messages =
            await chatService.getMessages(
              conversationId
            );


          set({

            messages:
              Array.isArray(messages)
                ? messages
                : [],

            isLoadingMessages:
              false,

          });

        } catch (error) {

          console.error(
            'Failed to load conversation messages:',
            error
          );


          set({

            messages: [],

            isLoadingMessages:
              false,

            error:
              error?.message ||
              'Unable to load conversation messages.',

          });

        }

      },


    // ========================================================
    // LOAD CONVERSATIONS
    // REAL POSTGRESQL DATA ONLY
    // ========================================================

    loadConversations:
      async (
        projectId = null
      ) => {

        set({

          isLoadingConversations:
            true,

          error: null,

        });


        try {

          const conversations =
            await chatService.getConversations(
              projectId
            );


          const safeConversations =
            Array.isArray(
              conversations
            )
              ? conversations
              : [];


          set({

            conversations:
              safeConversations,

            isLoadingConversations:
              false,

            error: null,

          });


          return safeConversations;

        } catch (error) {

          console.error(
            'Failed to load conversations:',
            error
          );


          /*
           * IMPORTANT:
           *
           * Keep existing conversations if
           * the refresh request fails.
           *
           * This prevents the Dashboard from
           * incorrectly showing 0 conversations.
           */

          set({

            isLoadingConversations:
              false,

            error:
              error?.message ||
              'Unable to load conversations.',

          });


          return get().conversations;

        }

      },


    // ========================================================
    // SEND MESSAGE
    // REAL FLASK API
    // ========================================================

    sendMessage: async (
      text,
      options = {}
    ) => {

      const {

        activeConversationId,

        selectedAgent,

        activeAgentId,

        messages,

      } = get();


      if (
        !text ||
        typeof text !== 'string' ||
        !text.trim()
      ) {

        return null;

      }


      const currentAgent =
        getAgentType(
          selectedAgent,
          activeAgentId
        );


      // ======================================================
      // CONVERSATION REQUIRED
      // ======================================================

      if (
        !activeConversationId
      ) {

        const errorMessage = {

          id:
            `msg_error_${Date.now()}`,

          role:
            'assistant',

          content:
            'Please start a new conversation before sending a message.',

          agent_type:
            currentAgent,

          agentName:
            'OrionAI System',

          created_at:
            new Date().toISOString(),

          isError: true,

        };


        set((state) => ({

          messages: [

            ...(Array.isArray(
              state.messages
            )
              ? state.messages
              : []),

            errorMessage,

          ],

          isTyping: false,

          isGenerating: false,

        }));


        return null;

      }


      const currentMessages =
        Array.isArray(messages)
          ? messages
          : [];


      // ======================================================
      // OPTIMISTIC USER MESSAGE
      // ======================================================

      const userMessage = {

        id:
          `msg_user_${Date.now()}`,

        role:
          'user',

        content:
          text.trim(),

        agent_type:
          currentAgent,

        created_at:
          new Date().toISOString(),

      };


      set({

        messages: [

          ...currentMessages,

          userMessage,

        ],

        isTyping: true,

        isGenerating: true,

        error: null,

      });


      // ======================================================
      // REAL FLASK REQUEST
      // ======================================================

      try {

        const response =
          await chatService.sendMessage({

            conversationId:
              activeConversationId,

            message:
              text.trim(),

            agentType:
              currentAgent,

            ragCollection:
              options?.ragCollection ||
              null,

        });


        // ====================================================
        // NORMALIZE REAL BACKEND RESPONSE
        // ====================================================

        const assistantContent =
          response?.response ??
          response?.content ??
          response?.output ??
          response?.message ??
          'The AI agent returned an empty response.';


        // ====================================================
        // REAL ASSISTANT MESSAGE
        // ====================================================

        const assistantMessage = {

          id:
            response?.id ||
            `msg_ai_${Date.now()}`,

          role:
            'assistant',

          content:
            String(
              assistantContent
            ),

          agent_type:
            response?.agent_used ||
            response?.agent_type ||
            currentAgent,

          agentName:
            response?.agent_used ||
            response?.agent_type ||
            currentAgent,

          sources:
            Array.isArray(
              response?.sources
            )
              ? response.sources
              : [],

          citations:
            Array.isArray(
              response?.citations
            )
              ? response.citations
              : [],

          slides:
            Array.isArray(
              response?.slides
            )
              ? response.slides
              : [],

          created_at:
            response?.created_at ||
            new Date().toISOString(),

        };


        // ====================================================
        // UPDATE MESSAGE UI
        // ====================================================

        set((state) => ({

          messages: [

            ...(Array.isArray(
              state.messages
            )
              ? state.messages
              : []),

            assistantMessage,

          ],

          isTyping: false,

          isGenerating: false,

          error: null,

        }));


        // ====================================================
        // REFRESH REAL CONVERSATION DATA
        // ====================================================

        try {

          await get()
            .loadConversations();

        } catch (
          refreshError
        ) {

          console.warn(
            'Conversation list refresh failed:',
            refreshError
          );

        }


        return assistantMessage;


      } catch (error) {

        console.error(
          'OrionAI chat request failed:',
          error
        );


        const errorMessage = {

          id:
            `msg_error_${Date.now()}`,

          role:
            'assistant',

          content:
            error?.message ||
            'Unable to connect to the OrionAI backend. Please make sure the Flask server is running.',

          agent_type:
            currentAgent,

          agentName:
            'OrionAI System',

          created_at:
            new Date().toISOString(),

          isError: true,

        };


        set((state) => ({

          messages: [

            ...(Array.isArray(
              state.messages
            )
              ? state.messages
              : []),

            errorMessage,

          ],

          isTyping: false,

          isGenerating: false,

          error:
            error?.message ||
            'OrionAI backend request failed.',

        }));


        return null;

      }

    },


    // ========================================================
    // DELETE CONVERSATION
    // REAL DATABASE DELETE
    // ========================================================

    deleteConversation:
      async (
        conversationId
      ) => {

        if (!conversationId) {

          return;

        }


        try {

          await chatService.deleteConversation(
            conversationId
          );


          set((state) => {

            const conversations =
              Array.isArray(
                state.conversations
              )
                ? state.conversations
                : [];


            const filtered =
              conversations.filter(
                (conversation) =>
                  conversation.id !==
                  conversationId
              );


            const currentActive =
              state.activeConversationId;


            const nextActive =
              currentActive ===
              conversationId

                ? (
                    filtered.length > 0
                      ? filtered[0].id
                      : null
                  )

                : currentActive;


            return {

              conversations:
                filtered,

              activeConversationId:
                nextActive,

              messages: [],

              error: null,

            };

          });


          // ==================================================
          // RELOAD REAL DATABASE DATA
          // ==================================================

          await get()
            .loadConversations();


        } catch (error) {

          console.error(
            'Failed to delete conversation:',
            error
          );


          set({

            error:
              error?.message ||
              'Unable to delete conversation.',

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

export default useChatStore;