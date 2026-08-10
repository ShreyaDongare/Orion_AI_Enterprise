export const AGENT_TYPES = {
  GENERAL: 'chat',
  RESEARCH: 'research',
  REPORT: 'report',
  DATA_ANALYSIS: 'data_analysis',
  PRESENTATION: 'presentation',
  EMAIL: 'email',
  EXECUTIVE: 'executive',
  KNOWLEDGE: 'knowledge',
};

export const AGENTS_CONFIG = [
  {
    id: AGENT_TYPES.GENERAL,
    name: 'General AI Assistant',
    role: 'Universal Enterprise Assistant',
    description: 'Multipurpose conversational assistant for brainstorming, quick Q&A, and task guidance.',
    icon: 'Sparkles',
    color: 'from-blue-500 to-indigo-600',
    badgeColor: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
    glowColor: 'glow-indigo',
    suggestedPrompts: [
      'Summarize our quarterly strategy goals',
      'Draft a pitch outline for new clients',
      'How do I optimize cross-department workflow?'
    ]
  },
  {
    id: AGENT_TYPES.RESEARCH,
    name: 'Research Agent',
    role: 'Deep Market & Web Intelligence',
    description: 'Performs web intelligence, competitor benchmarking, market trend discovery, and citation extraction.',
    icon: 'Globe',
    color: 'from-emerald-400 to-teal-600',
    badgeColor: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    glowColor: 'glow-cyan',
    suggestedPrompts: [
      'Research AI SaaS market size and growth forecast for 2026',
      'Analyze top 3 competitors in enterprise automation',
      'Find recent regulatory compliance standards for cloud AI'
    ]
  },
  {
    id: AGENT_TYPES.REPORT,
    name: 'Report Generation Agent',
    role: 'Executive Document Specialist',
    description: 'Synthesizes complex data into beautifully formatted executive reports, memos, and formal whitepapers.',
    icon: 'FileText',
    color: 'from-violet-500 to-purple-700',
    badgeColor: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    glowColor: 'glow-purple',
    suggestedPrompts: [
      'Generate a Q3 Executive Performance Report',
      'Create an enterprise risk assessment report',
      'Draft a software architecture evaluation document'
    ]
  },
  {
    id: AGENT_TYPES.DATA_ANALYSIS,
    name: 'Data Analysis Agent',
    role: 'Quantitative & Statistical Analyst',
    description: 'Parses CSV, Excel, and database records to compute metrics, generate charts, and uncover hidden trends.',
    icon: 'BarChart3',
    color: 'from-amber-400 to-orange-600',
    badgeColor: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    glowColor: 'glow-indigo',
    suggestedPrompts: [
      'Analyze sales conversion rates from uploaded CSV',
      'Identify customer churn patterns in Q2 data',
      'Calculate revenue projection and growth curves'
    ]
  },
  {
    id: AGENT_TYPES.PRESENTATION,
    name: 'Presentation Builder Agent',
    role: 'Slide Deck Architect',
    description: 'Converts notes, raw text, or briefs into visual slide decks, slide outlines, and pitch structures.',
    icon: 'Presentation',
    color: 'from-pink-500 to-rose-600',
    badgeColor: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
    glowColor: 'glow-purple',
    suggestedPrompts: [
      'Build a 10-slide Enterprise Investor Pitch Deck',
      'Outline an AI Strategy Presentation for C-suite',
      'Create a product roadmap presentation deck'
    ]
  },
  {
    id: AGENT_TYPES.EMAIL,
    name: 'Email Automation Agent',
    role: 'Corporate Communications Director',
    description: 'Drafts high-converting sales emails, executive correspondence, customer announcements, and follow-ups.',
    icon: 'Mail',
    color: 'from-cyan-400 to-blue-600',
    badgeColor: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
    glowColor: 'glow-cyan',
    suggestedPrompts: [
      'Draft an enterprise sales outreach email to CTOs',
      'Write a formal contract renewal notification',
      'Compose an internal team launch announcement'
    ]
  },
  {
    id: AGENT_TYPES.EXECUTIVE,
    name: 'Executive Assistant Agent',
    role: 'Strategic Operations Coordinator',
    description: 'Manages high-level schedule priorities, categorizes tasks, prepares daily briefings, and tracks OKRs.',
    icon: 'Briefcase',
    color: 'from-blue-600 to-indigo-800',
    badgeColor: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    glowColor: 'glow-indigo',
    suggestedPrompts: [
      'Prepare my morning executive briefing for today',
      'Prioritize top 5 strategic initiatives for Q4',
      'Organize action items from yesterday’s board meeting'
    ]
  },
  {
    id: AGENT_TYPES.KNOWLEDGE,
    name: 'Knowledge Base (RAG) Agent',
    role: 'Enterprise Search & Vector Retriever',
    description: 'Queries internal document collections via ChromaDB RAG to answer questions with precise citations.',
    icon: 'Database',
    color: 'from-fuchsia-500 to-pink-700',
    badgeColor: 'bg-fuchsia-500/10 text-fuchsia-400 border-fuchsia-500/20',
    glowColor: 'glow-purple',
    suggestedPrompts: [
      'Query HR policy documents regarding remote work',
      'What are our security compliance requirements for SOC2?',
      'Search product documentation for API rate limits'
    ]
  }
];
