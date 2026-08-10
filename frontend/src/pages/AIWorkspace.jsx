import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

import {
  Send,
  Sparkles,
  Bot,
  User,
  Maximize2,
  Copy,
  RefreshCw,
  Zap,
  FileText,
  ChevronRight,
  Database,
  Plus,
  Trash2
} from 'lucide-react';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

import { AGENTS_CONFIG } from '../constants/agents';
import { useChatStore } from '../store/useChatStore';
import { useProjectStore } from '../store/useProjectStore';
import { useKnowledgeStore } from '../store/useKnowledgeStore';

import Button from '../components/Button';
import Badge from '../components/Badge';

import toast from 'react-hot-toast';


export default function AIWorkspace() {

  // ============================================================
  // CHAT STORE
  // ============================================================

  const {
    activeConversationId,
    setActiveConversation,
    messages = [],
    activeAgentId,
    setActiveAgent,
    sendMessage,
    isGenerating,
    conversations = [],
    createNewChat
  } = useChatStore();


  // ============================================================
  // SAFE STATE
  // ============================================================

  const safeMessages = Array.isArray(messages)
    ? messages
    : [];

  const safeConversations = Array.isArray(conversations)
    ? conversations
    : [];


  // ============================================================
  // OTHER STORES
  // ============================================================

  const { projects = [] } = useProjectStore();

  const {
    collections = []
  } = useKnowledgeStore();


  // ============================================================
  // LOCAL STATE
  // ============================================================

  const [inputPrompt, setInputPrompt] = useState('');

  const [selectedRAG, setSelectedRAG] = useState(
    collections?.[0]?.id || 'coll_1'
  );

  const [activeArtifact, setActiveArtifact] = useState(null);

  const [isCopied, setIsCopied] = useState(false);

  const [showConvDropdown, setShowConvDropdown] =
    useState(false);


  const messagesEndRef = useRef(null);


  // ============================================================
  // UPDATE DEFAULT RAG COLLECTION
  // ============================================================

  useEffect(() => {

    if (
      collections &&
      collections.length > 0 &&
      !collections.some(
        (collection) =>
          collection.id === selectedRAG
      )
    ) {

      setSelectedRAG(
        collections[0].id
      );
    }

  }, [collections, selectedRAG]);


  // ============================================================
  // INITIAL CHAT
  // ============================================================

  useEffect(() => {

    if (
      !activeConversationId &&
      projects.length > 0
    ) {

      createNewChat(
        projects[0].id,
        AGENTS_CONFIG[0].id,
        'Executive AI Strategy Session'
      );

    }

  }, [
    activeConversationId,
    projects,
    createNewChat
  ]);


  // ============================================================
  // AUTO SCROLL
  // ============================================================

  useEffect(() => {

    messagesEndRef.current?.scrollIntoView({
      behavior: 'smooth'
    });

  }, [
    safeMessages,
    isGenerating
  ]);


  // ============================================================
  // ACTIVE AGENT
  // ============================================================

  const activeAgent =
    AGENTS_CONFIG.find(
      (agent) =>
        agent.id === activeAgentId
    ) || AGENTS_CONFIG[0];


  // ============================================================
  // ACTIVE CONVERSATION
  // ============================================================

  const activeConversation =
    safeConversations.find(
      (conversation) =>
        conversation.id === activeConversationId
    ) || safeConversations[0];


  // ============================================================
  // SEND MESSAGE
  // ============================================================

  const handleSend = async (e) => {

    e?.preventDefault();

    if (
      !inputPrompt.trim() ||
      isGenerating
    ) {
      return;
    }

    const text = inputPrompt;

    setInputPrompt('');

    try {

      await sendMessage(
        text,
        {
          ragCollection: selectedRAG
        }
      );

    } catch (error) {

      console.error(
        'Failed to send message:',
        error
      );

      toast.error(
        error?.message ||
        'Failed to send message.'
      );

    }
  };


  // ============================================================
  // COPY
  // ============================================================

  const copyToClipboard = async (text) => {

    try {

      await navigator.clipboard.writeText(
        text || ''
      );

      setIsCopied(true);

      toast.success(
        'Content copied to clipboard'
      );

      setTimeout(
        () => setIsCopied(false),
        2000
      );

    } catch (error) {

      console.error(
        'Copy failed:',
        error
      );

      toast.error(
        'Unable to copy content.'
      );

    }
  };


  // ============================================================
  // NEW CHAT
  // ============================================================

  const handleNewChat = async () => {

    try {

      if (
        !projects ||
        projects.length === 0
      ) {

        toast.error(
          'No project is available. Please create a project first.'
        );

        return;
      }

      const projectId =
        projects[0].id;

      console.log(
        'Creating new workspace chat...'
      );

      console.log(
        'Project ID:',
        projectId
      );

      console.log(
        'Agent:',
        activeAgent.id
      );


      const newConversation =
        await createNewChat(
          projectId,
          activeAgent.id,
          `New ${activeAgent.name} Chat`
        );


      console.log(
        'New conversation:',
        newConversation
      );


      if (
        newConversation?.id
      ) {

        setShowConvDropdown(false);

        toast.success(
          'New workspace chat started'
        );

      } else {

        toast.error(
          'Unable to create a new conversation'
        );

      }

    } catch (error) {

      console.error(
        'New chat error:',
        error
      );

      toast.error(
        'Failed to start a new workspace chat'
      );

    }
  };


  // ============================================================
  // SOURCE NAME HELPER
  // ============================================================

  const getSourceName = (source) => {

    if (!source) {
      return 'Unknown document';
    }

    const value =
      source.document ||
      source.source ||
      source.filename ||
      source.file_name ||
      source.title ||
      'Unknown document';

    // Convert Windows paths to filenames
    const normalized =
      String(value)
        .replace(/\\/g, '/');

    return normalized.split('/').pop();
  };


  // ============================================================
  // SOURCE LIST
  // ============================================================

  const renderSources = (msg) => {

    if (
      !msg ||
      !Array.isArray(msg.sources) ||
      msg.sources.length === 0
    ) {
      return null;
    }


    return (

      <div className="mt-3 pt-3 border-t border-slate-200">

        {/* ====================================================
            SOURCES HEADER
        ==================================================== */}

        <div className="flex items-center gap-2 mb-2">

          <Database
            className="w-3.5 h-3.5 text-blue-600"
          />

          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
            Knowledge Sources
          </span>

        </div>


        {/* ====================================================
            SOURCE CARDS
        ==================================================== */}

        <div className="space-y-1.5">

          {msg.sources.map(
            (source, index) => {

              const documentName =
                getSourceName(source);

              const chunks =
                source.chunks_retrieved;


              return (

                <div
                  key={
                    source.document_id ||
                    `${documentName}-${index}`
                  }
                  className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg bg-white border border-slate-200"
                >

                  <div className="flex items-center gap-2 min-w-0">

                    <div className="w-7 h-7 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0">

                      <FileText
                        className="w-3.5 h-3.5 text-blue-600"
                      />

                    </div>

                    <div className="min-w-0">

                      <p
                        className="text-[11px] font-semibold text-slate-700 truncate"
                        title={documentName}
                      >
                        {documentName}
                      </p>

                      {chunks !== undefined && (
                        <p className="text-[10px] text-slate-400">
                          {chunks}{' '}
                          {chunks === 1
                            ? 'relevant chunk'
                            : 'relevant chunks'}
                        </p>
                      )}

                    </div>

                  </div>


                  {/* =================================================
                      RELEVANCE
                  ================================================= */}

                  {typeof source.distance === 'number' && (

                    <span className="text-[9px] font-mono text-slate-400 shrink-0">
                      Retrieved
                    </span>

                  )}

                </div>

              );

            }
          )}

        </div>

      </div>

    );
  };


  // ============================================================
  // RENDER
  // ============================================================

  return (

    <div className="h-[calc(100vh-6.5rem)] flex flex-col space-y-4">


      {/* ========================================================
          WORKSPACE HEADER
      ======================================================== */}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-xs relative z-20">

        <div className="flex items-center gap-3">

          <div className="p-2.5 rounded-xl bg-blue-600 text-white shrink-0">

            <Bot className="w-5 h-5" />

          </div>


          <div>

            <div className="flex items-center gap-2">

              <h1 className="text-base font-bold font-heading text-slate-900">

                {activeAgent.name}

              </h1>

              <Badge
                variant="blue"
                size="sm"
              >
                {activeAgent.role}
              </Badge>

            </div>


            <p className="text-xs text-slate-500 mt-0.5">

              {activeAgent.description}

            </p>

          </div>

        </div>


        {/* ======================================================
            TOOLBAR
        ====================================================== */}

        <div className="flex items-center gap-2">


          {/* ====================================================
              CONVERSATION SELECTOR
          ==================================================== */}

          <div className="relative">

            <button
              onClick={() =>
                setShowConvDropdown(
                  !showConvDropdown
                )
              }
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
            >

              <FileText
                className="w-3.5 h-3.5 text-blue-600"
              />

              <span className="max-w-[140px] truncate">

                {activeConversation?.title ||
                  'Active Session'}

              </span>

              <ChevronRight
                className={`w-3.5 h-3.5 text-slate-400 transition-transform ${
                  showConvDropdown
                    ? 'rotate-90'
                    : ''
                }`}
              />

            </button>


            {showConvDropdown && (

              <div className="absolute right-0 mt-2 w-64 bg-white border border-slate-200 rounded-xl shadow-lg p-2 z-50 space-y-1">


                <button
                  type="button"
                  onClick={(e) => {

                    e.preventDefault();

                    e.stopPropagation();

                    handleNewChat();

                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold transition-colors cursor-pointer"
                >

                  <Plus
                    className="w-3.5 h-3.5"
                  />

                  Start New Workspace Chat

                </button>


                <div className="h-px bg-slate-100 my-1" />


                <div className="max-h-48 overflow-y-auto space-y-1">

                  {safeConversations.map(
                    (conv) => (

                      <button
                        key={conv.id}
                        onClick={() => {

                          setActiveConversation(
                            conv.id
                          );

                          setShowConvDropdown(
                            false
                          );

                        }}
                        className={`w-full text-left p-2 rounded-lg text-xs transition-colors ${
                          activeConversationId ===
                          conv.id
                            ? 'bg-blue-50 text-blue-700 font-bold'
                            : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                        }`}
                      >

                        <p className="truncate">

                          {conv.title}

                        </p>

                        <span className="text-[10px] text-slate-400 font-mono">

                          {new Date(
                            conv.updated_at ||
                            Date.now()
                          ).toLocaleDateString()}

                        </span>

                      </button>

                    )
                  )}

                </div>

              </div>

            )}

          </div>


          {/* ====================================================
              AGENT SELECTOR
          ==================================================== */}

          <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">

            {AGENTS_CONFIG.map(
              (agent) => (

                <button
                  key={agent.id}
                  onClick={() =>
                    setActiveAgent(
                      agent.id
                    )
                  }
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
                    activeAgentId ===
                    agent.id
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-slate-50 text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200'
                  }`}
                >

                  <Bot
                    className="w-3.5 h-3.5"
                  />

                  <span>
                    {agent.name.split(' ')[0]}
                  </span>

                </button>

              )
            )}

          </div>

        </div>

      </div>


      {/* ========================================================
          MAIN LAYOUT
      ======================================================== */}

      <div className="flex-1 flex gap-4 min-h-0 relative z-10">


        {/* ======================================================
            CHAT
        ====================================================== */}

        <div
          className={`flex-1 flex flex-col bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden ${
            activeArtifact
              ? 'lg:w-1/2'
              : 'w-full'
          }`}
        >


          {/* ====================================================
              CHAT HISTORY
          ==================================================== */}

          <div className="flex-1 p-6 overflow-y-auto space-y-6">


            {/* ==================================================
                EMPTY STATE
            ================================================== */}

            {safeMessages.length === 0 ? (

              <div className="h-full flex flex-col items-center justify-center text-center max-w-md mx-auto space-y-4">

                <div className="p-3.5 rounded-xl bg-blue-50 text-blue-600 border border-blue-100">

                  <Sparkles className="w-6 h-6" />

                </div>


                <h3 className="text-base font-bold font-heading text-slate-900">

                  {activeAgent.name} Initialized

                </h3>


                <p className="text-xs text-slate-500 leading-relaxed">

                  Ask questions, request strategy reports,
                  market research data, executive presentation
                  slides, or cross-departmental analysis.

                </p>


                {/* =================================================
                    QUICK PROMPTS
                ================================================= */}

                <div className="w-full space-y-2 pt-2">

                  {(activeAgent.suggestedPrompts || [])
                    .map(
                      (prompt, idx) => (

                        <button
                          key={idx}
                          onClick={() =>
                            setInputPrompt(prompt)
                          }
                          className="w-full text-left p-3 rounded-xl bg-slate-50 hover:bg-blue-50/60 border border-slate-200 hover:border-blue-200 text-xs text-slate-700 hover:text-blue-700 transition-all flex items-center justify-between group"
                        >

                          <span>
                            "{prompt}"
                          </span>

                          <ChevronRight
                            className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-transform"
                          />

                        </button>

                      )
                    )}

                </div>

              </div>

            ) : (

              /* ==================================================
                 MESSAGES
              ================================================== */

              safeMessages.map(
                (msg) => {

                  const formattedTime =
                    msg.created_at
                      ? new Date(
                          msg.created_at
                        ).toLocaleTimeString(
                          [],
                          {
                            hour: '2-digit',
                            minute: '2-digit'
                          }
                        )
                      : (
                          msg.timestamp ||
                          'Just now'
                        );


                  return (

                    <div
                      key={msg.id}
                      className={`flex items-start gap-3.5 ${
                        msg.role === 'user'
                          ? 'flex-row-reverse'
                          : ''
                      }`}
                    >

                      {/* =================================================
                          AVATAR
                      ================================================= */}

                      <div
                        className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 font-semibold text-xs ${
                          msg.role === 'user'
                            ? 'bg-slate-100 text-slate-700 border border-slate-200'
                            : 'bg-blue-600 text-white'
                        }`}
                      >

                        {msg.role === 'user'
                          ? (
                            <User className="w-4 h-4" />
                          )
                          : (
                            <Bot className="w-4 h-4" />
                          )}

                      </div>


                      <div
                        className={`space-y-1.5 max-w-[85%] ${
                          msg.role === 'user'
                            ? 'text-right'
                            : ''
                        }`}
                      >


                        {/* =================================================
                            MESSAGE HEADER
                        ================================================= */}

                        <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono">

                          <span className="font-semibold text-slate-700">

                            {msg.role === 'user'
                              ? 'Executive User'
                              : msg.agentName ||
                                activeAgent.name}

                          </span>

                          <span>•</span>

                          <span>
                            {formattedTime}
                          </span>

                        </div>


                        {/* =================================================
                            MESSAGE BODY
                        ================================================= */}

                        <div
                          className={`p-4 rounded-xl text-xs leading-relaxed border text-left ${
                            msg.role === 'user'
                              ? 'bg-blue-600 text-white border-blue-600 font-sans'
                              : 'bg-slate-50 text-slate-900 border-slate-200 font-sans'
                          }`}
                        >


                          {/* =================================================
                              MARKDOWN RESPONSE
                          ================================================= */}

                          <div
                            className={`prose ${
                              msg.role === 'user'
                                ? 'prose-invert'
                                : ''
                            } prose-xs max-w-none space-y-2`}
                          >

                            <ReactMarkdown
                              remarkPlugins={[
                                remarkGfm
                              ]}
                            >
                              {msg.content}
                            </ReactMarkdown>

                          </div>


                          {/* =================================================
                              KNOWLEDGE SOURCES
                          ================================================= */}

                          {msg.role === 'assistant' &&
                            renderSources(msg)}


                          {/* =================================================
                              WEB CITATIONS
                          ================================================= */}

                          {msg.citations &&
                            msg.citations.length > 0 && (

                              <div className="mt-3 pt-3 border-t border-slate-200 space-y-1.5">

                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">

                                  Citations & Verified Sources

                                </span>


                                <div className="flex flex-wrap gap-1.5">

                                  {msg.citations.map(
                                    (citation, ci) => (

                                      <a
                                        key={ci}
                                        href={
                                          citation.url
                                        }
                                        target="_blank"
                                        rel="noreferrer"
                                        className="px-2.5 py-1 rounded-lg bg-white hover:bg-slate-100 text-[11px] text-blue-700 border border-slate-200 truncate max-w-xs transition-colors inline-block font-mono"
                                      >

                                        🔗{' '}
                                        {citation.title}

                                      </a>

                                    )
                                  )}

                                </div>

                              </div>

                            )}


                          {/* =================================================
                              SLIDE DECK
                          ================================================= */}

                          {msg.slides &&
                            msg.slides.length > 0 && (

                              <div className="mt-3 pt-3 border-t border-slate-200 space-y-2">

                                <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider">

                                  Generated Slide Deck Outline

                                </span>


                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">

                                  {msg.slides.map(
                                    (slide, si) => (

                                      <div
                                        key={si}
                                        className="p-3 rounded-lg bg-white border border-slate-200 space-y-1"
                                      >

                                        <p className="text-[11px] font-bold text-slate-900">

                                          {slide.number}.{' '}
                                          {slide.title}

                                        </p>


                                        <ul className="list-disc list-inside text-[10px] text-slate-600 space-y-0.5">

                                          {(slide.points || [])
                                            .map(
                                              (point, pti) => (

                                                <li key={pti}>
                                                  {point}
                                                </li>

                                              )
                                            )}

                                        </ul>

                                      </div>

                                    )
                                  )}

                                </div>

                              </div>

                            )}


                          {/* =================================================
                              ACTIONS
                          ================================================= */}

                          {msg.role === 'assistant' && (

                            <div className="mt-3 pt-2 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500">

                              <button
                                onClick={() =>
                                  copyToClipboard(
                                    msg.content
                                  )
                                }
                                className="flex items-center gap-1 hover:text-blue-600 transition-colors"
                              >

                                <Copy className="w-3 h-3" />

                                {isCopied
                                  ? 'Copied'
                                  : 'Copy Output'}

                              </button>


                              <button
                                onClick={() =>
                                  setActiveArtifact(
                                    msg.content
                                  )
                                }
                                className="flex items-center gap-1 text-blue-600 hover:underline font-semibold"
                              >

                                <Maximize2 className="w-3 h-3" />

                                Expand Artifact

                              </button>

                            </div>

                          )}

                        </div>

                      </div>

                    </div>

                  );

                }

              )

            )}


            {/* ======================================================
                GENERATING
            ====================================================== */}

            {isGenerating && (

              <div className="flex items-center gap-3">

                <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center animate-spin">

                  <RefreshCw className="w-4 h-4" />

                </div>


                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-blue-700 flex items-center gap-2">

                  <Sparkles className="w-4 h-4 animate-pulse text-blue-600" />

                  <span>

                    {activeAgent.name}
                    {' '}
                    is synthesizing reasoning stream...

                  </span>

                </div>

              </div>

            )}


            <div ref={messagesEndRef} />

          </div>


          {/* ========================================================
              INPUT BAR
          ======================================================== */}

          <div className="p-4 bg-white border-t border-slate-200 space-y-3">

            <div className="flex items-center justify-between text-xs text-slate-500 px-1">

              <div className="flex items-center gap-2">

                <Database className="w-3.5 h-3.5 text-blue-600" />

                <span>
                  RAG Context:
                </span>


                <select
                  value={selectedRAG}
                  onChange={(e) =>
                    setSelectedRAG(
                      e.target.value
                    )
                  }
                  className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs text-slate-800 outline-none focus:border-blue-600"
                >

                  {(collections || [])
                    .map(
                      (collection) => (

                        <option
                          key={collection.id}
                          value={collection.id}
                        >
                          {collection.name}
                        </option>

                      )
                    )}


                  {collections.length === 0 && (

                    <option value="coll_1">
                      Security & SOC2 Policies
                    </option>

                  )}

                </select>

              </div>


              <div className="flex items-center gap-1 text-[11px] text-emerald-700 font-mono font-medium">

                <Zap className="w-3 h-3 text-emerald-600" />

                Gemini 2.5 Pro High Reasoning

              </div>

            </div>


            {/* ======================================================
                MESSAGE FORM
            ====================================================== */}

            <form
              onSubmit={handleSend}
              className="relative flex items-center"
            >

              <input
                id="workspace-chat-input"
                type="text"
                value={inputPrompt}
                onChange={(e) =>
                  setInputPrompt(
                    e.target.value
                  )
                }
                placeholder={`Prompt ${activeAgent.name}...`}
                disabled={isGenerating}
                className="w-full bg-slate-50 text-slate-900 text-xs sm:text-sm rounded-xl border border-slate-200 pl-4 pr-12 py-3 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-500/15"
              />


              <button
                id="workspace-send-btn"
                type="submit"
                disabled={
                  !inputPrompt.trim() ||
                  isGenerating
                }
                className="absolute right-2 p-2 rounded-lg bg-blue-600 text-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-blue-700 transition-colors shadow-xs"
              >

                <Send className="w-4 h-4" />

              </button>

            </form>

          </div>

        </div>


        {/* ========================================================
            ARTIFACT SIDE PANEL
        ======================================================== */}

        <AnimatePresence>

          {activeArtifact && (

            <motion.div
              initial={{
                opacity: 0,
                x: 20
              }}
              animate={{
                opacity: 1,
                x: 0
              }}
              exit={{
                opacity: 0,
                x: 20
              }}
              className="w-full lg:w-1/2 bg-white border border-slate-200 rounded-xl shadow-lg flex flex-col overflow-hidden"
            >


              {/* ==================================================
                  ARTIFACT HEADER
              ================================================== */}

              <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-slate-50">

                <div className="flex items-center gap-2">

                  <Sparkles
                    className="w-4 h-4 text-blue-600"
                  />

                  <h3 className="text-sm font-bold font-heading text-slate-900">

                    Generated Artifact Preview

                  </h3>

                </div>


                <div className="flex items-center gap-2">

                  <Button
                    variant="outline"
                    size="sm"
                    icon={Copy}
                    onClick={() =>
                      copyToClipboard(
                        activeArtifact
                      )
                    }
                  >
                    Copy
                  </Button>


                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      setActiveArtifact(null)
                    }
                  >
                    Close
                  </Button>

                </div>

              </div>


              {/* ==================================================
                  ARTIFACT CONTENT
              ================================================== */}

              <div className="flex-1 p-6 overflow-y-auto bg-slate-50/50 font-mono text-xs text-slate-800">

                <ReactMarkdown
                  remarkPlugins={[
                    remarkGfm
                  ]}
                >
                  {activeArtifact}
                </ReactMarkdown>

              </div>

            </motion.div>

          )}

        </AnimatePresence>

      </div>

    </div>

  );
}