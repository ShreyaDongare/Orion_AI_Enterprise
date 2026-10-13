import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles,
  Bot,
  ArrowRight,
  ShieldCheck,
  Zap,
  Database,
  BarChart3,
  FileText,
  Presentation,
  Mail,
  CheckCircle2,
  Lock,
  Play,
  Layers,
  Cpu,
  Globe,
  TrendingUp,
  ChevronDown,
  Building,
  User,
  Send,
  MessageSquare,
  Search,
  Sliders,
  Award,
  Check,
  X
} from 'lucide-react';
import LandingNavbar from '../components/LandingNavbar';
import Button from '../components/Button';
import Badge from '../components/Badge';
import Card from '../components/Card';
import toast from 'react-hot-toast';

export default function LandingPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('demo');
  const [activeFaq, setActiveFaq] = useState(0);
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);
  const [billingCycle, setBillingCycle] = useState('monthly');

  // Contact form local state
  const [contactForm, setContactForm] = useState({
    name: '',
    email: '',
    company: '',
    message: ''
  });
  const [isSubmittingContact, setIsSubmittingContact] = useState(false);

  const handleContactSubmit = (e) => {
    e.preventDefault();
    if (!contactForm.name || !contactForm.email) {
      toast.error('Please fill in your name and corporate email.');
      return;
    }
    setIsSubmittingContact(true);
    setTimeout(() => {
      setIsSubmittingContact(false);
      toast.success('Thank you! An Enterprise Specialist will contact you within 2 hours.');
      setContactForm({ name: '', email: '', company: '', message: '' });
    }, 1000);
  };

  const agentShowcase = [
    {
      id: 'research',
      name: 'Research Agent',
      role: 'Deep Web & Industry Intelligence',
      icon: Search,
      badge: 'Blue',
      description: 'Gathers competitive analysis, market reports, and global industry trends in real time.',
      prompt: 'Synthesize Q3 AI market adoption across EMEA and APAC regions.'
    },
    {
      id: 'report',
      name: 'Report Generation Agent',
      role: 'Executive Briefings & Audits',
      icon: FileText,
      badge: 'Purple',
      description: 'Compiles structured markdown executive reports, SOC2 audits, and compliance briefs.',
      prompt: 'Draft an executive summary for our SOC2 Type II compliance audit.'
    },
    {
      id: 'analysis',
      name: 'Data Analysis Agent',
      role: 'Quantitative Analytics & Financial Modeling',
      icon: BarChart3,
      badge: 'Emerald',
      description: 'Parses complex tabular datasets, financial forecasts, and KPI metrics into interactive charts.',
      prompt: 'Analyze token usage trajectory and estimate Q4 cost savings.'
    },
    {
      id: 'presentation',
      name: 'Presentation Builder Agent',
      role: 'Slide Decks & Visual Storytelling',
      icon: Presentation,
      badge: 'Purple',
      description: 'Generates multi-slide executive decks with key bullet points, metrics, and presenter notes.',
      prompt: 'Create a 3-slide deck on OrionAI enterprise security architecture.'
    },
    {
      id: 'email',
      name: 'Email Automation Agent',
      role: 'Strategic Communications & Outreach',
      icon: Mail,
      badge: 'Rose',
      description: 'Crafts persuasive executive correspondence, board syncs, and stakeholder announcements.',
      prompt: 'Draft an urgent email to board members regarding Q4 milestones.'
    },
    {
      id: 'executive',
      name: 'Executive Assistant Agent',
      role: 'Strategy & Decision Support',
      icon: Bot,
      badge: 'Amber',
      description: 'Acts as a chief of staff for high-level decision prioritization and cross-departmental coordination.',
      prompt: 'Outline key risk mitigation strategies for EMEA multi-cloud expansion.'
    },
    {
      id: 'rag',
      name: 'Knowledge Base (RAG)',
      role: 'ChromaDB Vector Retrieval Engine',
      icon: Database,
      badge: 'Cyan',
      description: 'Indexes internal enterprise PDFs, contracts, and policies into cosine-similarity vector embeddings.',
      prompt: 'Retrieve security policies regarding key rotation and zero-trust access.'
    },
    {
      id: 'chat',
      name: 'AI Chat Assistant',
      role: 'Multi-Agent Conversational Hub',
      icon: Sparkles,
      badge: 'Indigo',
      description: 'Conversational agent orchestrator automatically routing prompts to specialized domain nodes.',
      prompt: 'How does OrionAI maintain low model latency across global teams?'
    }
  ];

  const workflowSteps = [
    { step: '01', title: 'Authenticate Session', desc: 'Secure enterprise single sign-on with role-based access control.' },
    { step: '02', title: 'Create Enterprise Project', desc: 'Isolate workspace conversations, vector knowledge files, and analytics.' },
    { step: '03', title: 'Upload & Index Documents', desc: 'Auto-chunk and vectorize PDFs, DOCX, and spreadsheets into ChromaDB.' },
    { step: '04', title: 'Intent Auto-Classification', desc: 'Gemini 2.5 Pro analyzes intent and dispatches tasks to specialized agent nodes.' },
    { step: '05', title: 'Multi-Agent Execution', desc: 'Parallel execution across research, data analysis, and document drafting nodes.' },
    { step: '06', title: 'Results & Artifact Generation', desc: 'Real-time markdown reports, presentation slide decks, and interactive charts.' }
  ];

  const faqs = [
    {
      q: 'How does OrionAI Enterprise ensure corporate data security?',
      a: 'We enforce client-side AES-256 payload encryption before storing vector embeddings. All LLM calls pass through server-side proxies, preventing key exposure and ensuring strict compliance with SOC2 Type II standards.'
    },
    {
      q: 'Can we ingest custom corporate documents for RAG vector search?',
      a: 'Yes! Our Knowledge Base module supports PDF, DOCX, CSV, and TXT uploads. Files are automatically chunked, embedded, and indexed in ChromaDB for sub-second retrieval.'
    },
    {
      q: 'How does the multi-agent routing engine work?',
      a: 'The central Orchestrator Agent evaluates incoming user prompts, classifies the intent (e.g., market research vs. slide design), and dispatches sub-tasks to specialized agent nodes in parallel.'
    },
    {
      q: 'What underlying AI models power OrionAI Enterprise?',
      a: 'OrionAI is powered by Gemini 2.5 Pro with high-reasoning capabilities, streaming inference, and structured tool outputs.'
    },
    {
      q: 'Is there an enterprise API or export mechanism?',
      a: 'Yes, generated reports, presentation decks, and email drafts can be copied or exported with a single click, and all vector collections are accessible via workspace REST APIs.'
    }
  ];

  return (
    <div className="landing-shell min-h-screen bg-[#F8FAFC] text-slate-900 relative overflow-x-hidden font-sans">
      <LandingNavbar />

      {/* ================= HERO SECTION ================= */}
      <section className="relative pt-32 pb-16 md:pt-40 md:pb-24 px-6 z-10 max-w-7xl mx-auto text-center space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white border border-slate-200 text-blue-700 text-xs font-semibold shadow-xs"
        >
          <Sparkles className="w-3.5 h-3.5 text-blue-600" />
          <span>OrionAI Enterprise 2.5 Multi-Agent Platform</span>
          <Badge variant="emerald" size="sm">SOC2 Type II</Badge>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight text-slate-900 font-heading max-w-4xl mx-auto leading-[1.1]"
        >
          An enterprise AI platform for <span className="orion-gradient-text">autonomous teams</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="text-base sm:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed"
        >
          Orchestrate specialized AI agents for deep market research, quantitative data modeling, executive slide decks, and vector knowledge retrieval.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4"
        >
          <Button
            variant="blue"
            size="lg"
            icon={ArrowRight}
            iconPosition="right"
            onClick={() => navigate('/register')}
          >
            Start Enterprise Trial
          </Button>

          <Button
            variant="outline"
            size="lg"
            icon={Play}
            onClick={() => setIsVideoModalOpen(true)}
          >
            Watch Platform Overview
          </Button>
        </motion.div>

        {/* Feature Highlights Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-12 text-left">
          {[
            { icon: Bot, label: 'Multi-Agent Suite', value: '8 Autonomous Agents' },
            { icon: Database, label: 'Vector Database', value: 'Sub-Second RAG' },
            { icon: ShieldCheck, label: 'Enterprise Security', value: 'AES-256 & SOC2' },
            { icon: Zap, label: 'Model Performance', value: 'Gemini 2.5 Pro' },
          ].map((item, idx) => {
            const Icon = item.icon;
            return (
              <Card key={idx} hover={true} className="p-4 bg-white border border-slate-200">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-50 text-blue-600 border border-blue-100">
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider font-heading">{item.label}</p>
                    <p className="text-sm font-bold text-slate-900 font-heading">{item.value}</p>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </section>

      {/* ================= INTERACTIVE AGENT SHOWCASE ================= */}
      <section id="agents" className="py-20 px-6 max-w-7xl mx-auto space-y-12">
        <div className="text-center space-y-3">
          <Badge variant="blue">Specialized Intelligence</Badge>
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 font-heading tracking-tight">
            Meet the OrionAI Agent Fleet
          </h2>
          <p className="text-sm text-slate-600 max-w-xl mx-auto">
            Each agent is fine-tuned with domain instructions, custom prompt logic, and output validation.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {agentShowcase.map((agent) => {
            const Icon = agent.icon;
            return (
              <Card
                key={agent.id}
                hover={true}
                className="p-5 flex flex-col justify-between space-y-4 bg-white border border-slate-200 shadow-xs hover:border-slate-300"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
                      <Icon className="w-5 h-5" />
                    </div>
                    <Badge variant="slate" size="sm">Active Node</Badge>
                  </div>

                  <div>
                    <h3 className="text-base font-bold text-slate-900 font-heading">{agent.name}</h3>
                    <p className="text-[11px] text-blue-600 font-mono font-medium mt-0.5">{agent.role}</p>
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed">{agent.description}</p>
                </div>

                <div className="pt-3 border-t border-slate-100 space-y-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono">Sample Prompt</span>
                  <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-[11px] text-slate-700 font-mono line-clamp-2">
                    "{agent.prompt}"
                  </div>
                  <button
                    onClick={() => navigate('/workspace')}
                    className="w-full mt-2 py-1.5 px-3 rounded-lg bg-slate-50 hover:bg-blue-50 text-slate-700 hover:text-blue-700 text-xs font-semibold border border-slate-200 transition-colors flex items-center justify-center gap-1.5"
                  >
                    <span>Deploy Agent</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </Card>
            );
          })}
        </div>
      </section>

      {/* ================= WORKFLOW STEPS ================= */}
      <section id="workflow" className="py-20 px-6 max-w-7xl mx-auto space-y-12">
        <div className="text-center space-y-3">
          <Badge variant="cyan">Execution Pipeline</Badge>
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 font-heading tracking-tight">
            How OrionAI Executes Complex Workflows
          </h2>
          <p className="text-sm text-slate-600 max-w-xl mx-auto">
            From raw user prompts to verified enterprise deliverables in 6 structured stages.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {workflowSteps.map((s, idx) => (
            <Card key={idx} className="p-6 bg-white border border-slate-200 relative overflow-hidden">
              <div className="text-3xl font-extrabold text-slate-200 font-mono mb-2">{s.step}</div>
              <h3 className="text-base font-bold text-slate-900 font-heading mb-2">{s.title}</h3>
              <p className="text-xs text-slate-600 leading-relaxed">{s.desc}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* ================= PRICING SECTION ================= */}
      <section id="pricing" className="py-20 px-6 max-w-7xl mx-auto space-y-12">
        <div className="text-center space-y-3">
          <Badge variant="purple">Transparent Licensing</Badge>
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 font-heading tracking-tight">
            Simple Enterprise Pricing
          </h2>
          <p className="text-sm text-slate-600 max-w-xl mx-auto">
            Predictable seat-based pricing with custom model routing and dedicated support.
          </p>

          <div className="inline-flex items-center gap-2 p-1 rounded-xl bg-slate-100 border border-slate-200 mt-4">
            <button
              onClick={() => setBillingCycle('monthly')}
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                billingCycle === 'monthly' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Monthly Billing
            </button>
            <button
              onClick={() => setBillingCycle('annual')}
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                billingCycle === 'annual' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Annual Billing (20% Off)
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            {
              name: 'Starter Team',
              price: billingCycle === 'monthly' ? '$49' : '$39',
              period: '/ seat / month',
              description: 'Essential multi-agent access for small departments.',
              features: [
                'Up to 5 Team Seats',
                'All 8 Specialized Agents',
                '1GB Vector Knowledge Base',
                'Standard Model Speeds',
                'Email Support'
              ],
              buttonText: 'Start Free Trial',
              popular: false
            },
            {
              name: 'Enterprise Business',
              price: billingCycle === 'monthly' ? '$99' : '$79',
              period: '/ seat / month',
              description: 'Advanced analytics, high-capacity RAG, and custom agent prompts.',
              features: [
                'Up to 25 Team Seats',
                'Priority Agent Routing',
                '10GB Vector Knowledge Base',
                'Custom Prompt Engineering',
                '24/7 Priority Support',
                'Export to PDF / Slides / CSV'
              ],
              buttonText: 'Deploy Enterprise Business',
              popular: true
            },
            {
              name: 'Custom Dedicated',
              price: 'Custom',
              period: 'tailored plans',
              description: 'Dedicated cloud instances, custom SLA, and SOC2 compliance guarantees.',
              features: [
                'Unlimited Team Seats',
                'Dedicated VPC Ingestion',
                'Unlimited Vector RAG Storage',
                'Dedicated Account Manager',
                '99.99% Uptime SLA',
                'On-Premise Deployment Option'
              ],
              buttonText: 'Contact Enterprise Sales',
              popular: false
            }
          ].map((plan, idx) => (
            <Card
              key={idx}
              className={`p-6 bg-white border flex flex-col justify-between relative ${
                plan.popular ? 'border-blue-600 ring-2 ring-blue-500/10 shadow-md' : 'border-slate-200'
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-blue-600 text-white text-[10px] font-bold font-mono tracking-wider uppercase">
                  Most Popular
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 font-heading">{plan.name}</h3>
                  <p className="text-xs text-slate-500 mt-1">{plan.description}</p>
                </div>

                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-extrabold text-slate-900 font-heading">{plan.price}</span>
                  <span className="text-xs text-slate-500 font-mono">{plan.period}</span>
                </div>

                <ul className="space-y-2.5 pt-4 border-t border-slate-100">
                  {plan.features.map((feat, i) => (
                    <li key={i} className="flex items-center gap-2 text-xs text-slate-700">
                      <Check className="w-4 h-4 text-blue-600 shrink-0" />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="pt-6">
                <Button
                  variant={plan.popular ? 'blue' : 'outline'}
                  size="md"
                  className="w-full"
                  onClick={() => navigate('/register')}
                >
                  {plan.buttonText}
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* ================= FAQ SECTION ================= */}
      <section id="faq" className="py-20 px-6 max-w-4xl mx-auto space-y-12">
        <div className="text-center space-y-3">
          <Badge variant="amber">Frequently Asked</Badge>
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 font-heading tracking-tight">
            Enterprise Questions & Answers
          </h2>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, idx) => (
            <div
              key={idx}
              className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs transition-colors"
            >
              <button
                onClick={() => setActiveFaq(activeFaq === idx ? -1 : idx)}
                className="w-full p-5 text-left flex items-center justify-between font-bold text-slate-900 text-sm font-heading"
              >
                <span>{faq.q}</span>
                <ChevronDown
                  className={`w-4 h-4 text-slate-400 transition-transform ${
                    activeFaq === idx ? 'rotate-180 text-blue-600' : ''
                  }`}
                />
              </button>
              <AnimatePresence>
                {activeFaq === idx && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="px-5 pb-5 text-xs text-slate-600 leading-relaxed border-t border-slate-100 pt-3"
                  >
                    {faq.a}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      </section>

      {/* ================= CONTACT SECTION ================= */}
      <section id="contact" className="py-20 px-6 max-w-4xl mx-auto space-y-8">
        <Card className="p-8 bg-white border border-slate-200 space-y-6">
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-bold text-slate-900 font-heading">Contact Enterprise Sales</h2>
            <p className="text-xs text-slate-600 max-w-md mx-auto">
              Ready to deploy OrionAI across your organization? Reach out to our solution architects today.
            </p>
          </div>

          <form onSubmit={handleContactSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name</label>
                <input
                  type="text"
                  placeholder="Sarah Jenkins"
                  value={contactForm.name}
                  onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-900 outline-none focus:border-blue-600"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Corporate Email</label>
                <input
                  type="email"
                  placeholder="s.jenkins@acme.com"
                  value={contactForm.email}
                  onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-900 outline-none focus:border-blue-600"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Company & Team Size</label>
              <input
                type="text"
                placeholder="Acme Corp (250+ employees)"
                value={contactForm.company}
                onChange={(e) => setContactForm({ ...contactForm, company: e.target.value })}
                className="w-full p-2.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-900 outline-none focus:border-blue-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Use Case Description</label>
              <textarea
                rows={3}
                placeholder="Tell us about your multi-agent automation requirements..."
                value={contactForm.message}
                onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
                className="w-full p-2.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-900 outline-none focus:border-blue-600 resize-none"
              />
            </div>

            <Button
              type="submit"
              variant="blue"
              size="md"
              className="w-full justify-center"
              loading={isSubmittingContact}
              icon={Send}
            >
              Submit Enterprise Request
            </Button>
          </form>
        </Card>
      </section>

      {/* ================= FOOTER ================= */}
      <footer className="border-t border-slate-200 py-12 px-6 bg-white">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-blue-600 text-white">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
            <span className="text-sm font-bold text-slate-900 font-heading">OrionAI Enterprise</span>
          </div>

          <p className="text-xs text-slate-500 font-mono">
            © {new Date().getFullYear()} OrionAI Systems Inc. All rights reserved.
          </p>

          <div className="flex items-center gap-6 text-xs text-slate-500 font-medium">
            <a href="#features" className="hover:text-slate-900">Privacy Policy</a>
            <a href="#features" className="hover:text-slate-900">Terms of Service</a>
            <a href="#features" className="hover:text-slate-900">Security Compliance</a>
          </div>
        </div>
      </footer>

      {/* Video Modal Placeholder */}
      <AnimatePresence>
        {isVideoModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl border border-slate-200 p-6 max-w-2xl w-full shadow-2xl relative space-y-4"
            >
              <button
                onClick={() => setIsVideoModalOpen(false)}
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-900"
              >
                <X className="w-5 h-5" />
              </button>

              <h3 className="text-lg font-bold text-slate-900 font-heading">OrionAI 2.5 Architecture Walkthrough</h3>
              <div className="aspect-video bg-slate-100 rounded-xl border border-slate-200 flex flex-col items-center justify-center gap-3">
                <div className="p-4 rounded-full bg-blue-600 text-white shadow-md">
                  <Play className="w-6 h-6 fill-current" />
                </div>
                <p className="text-xs text-slate-500 font-mono">Platform overview video recording</p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
