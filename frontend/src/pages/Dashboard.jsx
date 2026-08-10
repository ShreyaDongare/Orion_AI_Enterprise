import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Sparkles,
  Bot,
  Database,
  FolderPlus,
  ArrowRight,
  Zap,
  FileText,
  Presentation,
  Mail,
  Activity,
  Clock,
  CheckCircle2,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import api from '../api/api';

import StatCard from '../components/StatCard';
import Card from '../components/Card';
import Button from '../components/Button';
import Badge from '../components/Badge';
import Breadcrumb from '../components/Breadcrumb';

import { AGENTS_CONFIG } from '../constants/agents';

import { useProjectStore } from '../store/useProjectStore';
import { useChatStore } from '../store/useChatStore';
import { useKnowledgeStore } from '../store/useKnowledgeStore';

import NewProjectModal from '../components/modals/NewProjectModal';


// ============================================================
// HELPERS
// ============================================================

const formatDate = (date) => {
  if (!date) return 'N/A';

  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) {
    return 'N/A';
  }

  return parsed.toLocaleDateString();
};


const formatDateTime = (date) => {
  if (!date) return 'N/A';

  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) {
    return 'N/A';
  }

  return parsed.toLocaleString();
};


// ============================================================
// DASHBOARD
// ============================================================

export default function Dashboard() {

  const navigate = useNavigate();


  // ============================================================
  // EXISTING STORES
  // ============================================================

  const {
    projects,
    loadProjects,
    isLoading: projectsLoading,
    error: projectsError,
  } = useProjectStore();


  const {
    conversations,
    loadConversations,
  } = useChatStore();


  const {
    collections,
    loadCollections,
  } = useKnowledgeStore();


  // ============================================================
  // DASHBOARD OUTPUT DATA
  // ============================================================

  const [
    reports,
    setReports,
  ] = useState([]);


  const [
    presentations,
    setPresentations,
  ] = useState([]);


  const [
    emails,
    setEmails,
  ] = useState([]);


  const [
    outputsLoading,
    setOutputsLoading,
  ] = useState(true);


  const [
    outputsError,
    setOutputsError,
  ] = useState(null);


  const [
    isNewProjectModalOpen,
    setIsNewProjectModalOpen,
  ] = useState(false);


  // ============================================================
  // LOAD PROJECTS
  // ============================================================

  useEffect(() => {

    loadProjects();

  }, [loadProjects]);


  // ============================================================
  // LOAD CONVERSATIONS
  // ============================================================

  useEffect(() => {

    loadConversations();

  }, [loadConversations]);


  // ============================================================
  // LOAD KNOWLEDGE COLLECTIONS
  // ============================================================

  useEffect(() => {

    loadCollections();

  }, [loadCollections]);


  // ============================================================
  // LOAD REPORTS / PRESENTATIONS / EMAILS
  // ============================================================

  useEffect(() => {

    let mounted = true;


    const loadDashboardOutputs = async () => {

      setOutputsLoading(true);
      setOutputsError(null);


      try {

        const [
          reportsResponse,
          presentationsResponse,
          emailsResponse,
        ] = await Promise.all([
          api.get('/reports'),
          api.get('/presentations'),
          api.get('/emails'),
        ]);


        if (!mounted) {
          return;
        }


        setReports(
          Array.isArray(
            reportsResponse.data
          )
            ? reportsResponse.data
            : []
        );


        setPresentations(
          Array.isArray(
            presentationsResponse.data
          )
            ? presentationsResponse.data
            : []
        );


        setEmails(
          Array.isArray(
            emailsResponse.data
          )
            ? emailsResponse.data
            : []
        );


      } catch (error) {

        console.error(
          'Failed to load dashboard outputs:',
          error.response?.data ||
          error.message
        );


        if (mounted) {

          setOutputsError(
            'Unable to load reports, presentations, and emails.'
          );

        }

      } finally {

        if (mounted) {

          setOutputsLoading(false);

        }

      }

    };


    loadDashboardOutputs();


    return () => {

      mounted = false;

    };

  }, []);


  // ============================================================
  // LAUNCH AGENT
  // ============================================================

  const handleLaunchAgent = async (
    agentId
  ) => {

    const activeProject =
      projects[0];


    if (!activeProject?.id) {

      setIsNewProjectModalOpen(
        true
      );

      return;

    }


    const targetAgent =
      AGENTS_CONFIG.find(
        (agent) =>
          agent.id === agentId
      );


    await createNewChat(
      activeProject.id,
      agentId,
      `New ${
        targetAgent?.name ||
        'AI'
      } Session`
    );


    navigate('/workspace');

  };


  // ============================================================
  // TOTAL OUTPUTS
  // ============================================================

  const totalOutputs =
    reports.length +
    presentations.length +
    emails.length;


  // ============================================================
  // RECENT ACTIVITY
  // ============================================================

  const recentActivity =
    useMemo(() => {

      const activity = [];


      // --------------------------------------------------------
      // Projects
      // --------------------------------------------------------

      projects.forEach(
        (project) => {

          if (
            project.created_at ||
            project.updated_at
          ) {

            activity.push({
              id:
                `project-${project.id}`,

              type:
                'Project',

              title:
                project.name ||
                'Untitled Project',

              date:
                project.updated_at ||
                project.created_at,

              icon:
                FolderPlus,

              route:
                '/projects',
            });

          }

        }
      );


      // --------------------------------------------------------
      // Reports
      // --------------------------------------------------------

      reports.forEach(
        (report) => {

          activity.push({
            id:
              `report-${report.id}`,

            type:
              'Report',

            title:
              report.title ||
              'Untitled Report',

            date:
              report.created_at,

            icon:
              FileText,

            route:
              '/reports',
          });

        }
      );


      // --------------------------------------------------------
      // Presentations
      // --------------------------------------------------------

      presentations.forEach(
        (presentation) => {

          activity.push({
            id:
              `presentation-${presentation.id}`,

            type:
              'Presentation',

            title:
              presentation.title ||
              'Untitled Presentation',

            date:
              presentation.created_at,

            icon:
              Presentation,

            route:
              '/presentations',
          });

        }
      );


      // --------------------------------------------------------
      // Emails
      // --------------------------------------------------------

      emails.forEach(
        (email) => {

          activity.push({
            id:
              `email-${email.id}`,

            type:
              'Email',

            title:
              email.subject ||
              'Untitled Email',

            date:
              email.created_at,

            icon:
              Mail,

            route:
              '/emails',
          });

        }
      );


      // --------------------------------------------------------
      // Sort newest first
      // --------------------------------------------------------

      return activity
        .filter(
          (item) =>
            item.date
        )
        .sort(
          (a, b) =>
            new Date(b.date) -
            new Date(a.date)
        )
        .slice(0, 6);

    }, [
      projects,
      reports,
      presentations,
      emails,
    ]);


  // ============================================================
  // RENDER
  // ============================================================

  return (

    <div className="space-y-6">


      {/* ======================================================
          HEADER
      ====================================================== */}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">

        <div>

          <Breadcrumb
            items={[
              {
                label:
                  'Executive Overview',
              },
            ]}
          />

          <h1 className="text-2xl font-bold font-heading text-slate-900 tracking-tight">

            Enterprise AI Command Center

          </h1>

          <p className="text-xs text-slate-500 mt-1">

            Multi-agent orchestrator,
            vector document retrieval,
            and workspace analytics.

          </p>

        </div>


        <div className="flex items-center gap-2.5">

          <Button
            id="dashboard-new-project-btn"
            variant="outline"
            size="sm"
            icon={FolderPlus}
            onClick={() =>
              setIsNewProjectModalOpen(true)
            }
          >
            New Project
          </Button>


          <Button
            id="dashboard-launch-workspace-btn"
            variant="blue"
            size="sm"
            icon={Sparkles}
            onClick={() =>
              navigate('/workspace')
            }
          >
            Launch Multi-Agent
          </Button>

        </div>

      </div>


      {/* ======================================================
          TOP STAT CARDS
      ====================================================== */}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">


        <StatCard
          title="AI Agents"
          value={`${AGENTS_CONFIG.length}`}
          change="Available"
          isPositive={true}
          icon={Bot}
          description="Specialized OrionAI agents"
        />


        <StatCard
          title="Projects"
          value={`${projects.length}`}
          change="Live"
          isPositive={true}
          icon={FolderPlus}
          description="Projects from PostgreSQL"
        />


        <StatCard
          title="Conversations"
          value={`${conversations.length}`}
          change="Live"
          isPositive={true}
          icon={FileText}
          description="Workspace conversations"
        />


        <StatCard
          title="Knowledge Collections"
          value={`${collections.length}`}
          change="Live"
          isPositive={true}
          icon={Database}
          description="Knowledge collections"
        />

      </div>


      {/* ======================================================
          OUTPUT STATISTICS
      ====================================================== */}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">


        <StatCard
          title="Reports"
          value={
            outputsLoading
              ? '...'
              : `${reports.length}`
          }
          change="Generated"
          isPositive={true}
          icon={FileText}
          description="Executive reports"
        />


        <StatCard
          title="Presentations"
          value={
            outputsLoading
              ? '...'
              : `${presentations.length}`
          }
          change="Generated"
          isPositive={true}
          icon={Presentation}
          description="AI presentations"
        />


        <StatCard
          title="Emails"
          value={
            outputsLoading
              ? '...'
              : `${emails.length}`
          }
          change="Generated"
          isPositive={true}
          icon={Mail}
          description="Executive communications"
        />

      </div>


      {/* ======================================================
          TOTAL OUTPUT SUMMARY
      ====================================================== */}

      <Card className="bg-white border border-slate-200 p-5">

        <div className="flex items-center justify-between">

          <div className="flex items-center gap-3">

            <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600 border border-blue-100">

              <Activity className="w-5 h-5" />

            </div>

            <div>

              <h2 className="text-sm font-bold text-slate-900 font-heading">

                OrionAI Output Activity

              </h2>

              <p className="text-xs text-slate-500">

                Reports, presentations, and emails generated by OrionAI

              </p>

            </div>

          </div>


          <div className="text-right">

            <p className="text-2xl font-bold text-slate-900">

              {outputsLoading
                ? '...'
                : totalOutputs}

            </p>

            <p className="text-[10px] text-slate-400 uppercase tracking-wider">

              Total Outputs

            </p>

          </div>

        </div>

      </Card>


      {/* ======================================================
          AGENTS
      ====================================================== */}

      <div className="space-y-3">

        <div className="flex items-center justify-between">

          <div>

            <h2 className="text-base font-bold font-heading text-slate-900 flex items-center gap-2">

              <Zap className="w-4 h-4 text-blue-600" />

              Specialized Enterprise Agents

            </h2>

            <p className="text-xs text-slate-500">

              Select a specialized agent node to launch targeted AI workflows

            </p>

          </div>


          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              navigate('/workspace')
            }
          >
            View All Agents

            <ArrowRight className="w-3.5 h-3.5" />

          </Button>

        </div>


        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

          {AGENTS_CONFIG.map(
            (agent) => (

              <motion.div
                key={agent.id}
                whileHover={{
                  y: -2,
                }}
                onClick={() =>
                  handleLaunchAgent(
                    agent.id
                  )
                }
                className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs hover:border-slate-300 hover:shadow-sm cursor-pointer transition-all group flex flex-col justify-between"
              >

                <div>

                  <div className="flex items-center justify-between mb-3">

                    <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600 border border-blue-100">

                      <Bot className="w-4 h-4" />

                    </div>


                    <Badge
                      variant="blue"
                      size="sm"
                    >
                      Ready
                    </Badge>

                  </div>


                  <h3 className="text-sm font-bold text-slate-900 font-heading group-hover:text-blue-600 transition-colors">

                    {agent.name}

                  </h3>


                  <p className="text-[11px] text-blue-600 font-medium my-0.5">

                    {agent.role}

                  </p>


                  <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">

                    {agent.description}

                  </p>

                </div>


                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-slate-600 group-hover:text-blue-600 transition-colors">

                  <span>
                    Start AI Session
                  </span>

                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />

                </div>

              </motion.div>

            )
          )}

        </div>

      </div>


      {/* ======================================================
          PROJECTS + KNOWLEDGE
      ====================================================== */}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">


        {/* ====================================================
            PROJECTS
        ==================================================== */}

        <div className="lg:col-span-2 space-y-3">

          <div className="flex items-center justify-between">

            <h2 className="text-base font-bold font-heading text-slate-900">

              Active Enterprise Projects

            </h2>


            <Button
              variant="ghost"
              size="sm"
              onClick={() =>
                navigate('/projects')
              }
            >
              Manage Projects
            </Button>

          </div>


          <div className="space-y-3">

            {projectsLoading ? (

              <div className="p-6 text-center text-sm text-slate-500 bg-white border border-slate-200 rounded-xl">

                Loading projects...

              </div>

            ) : projectsError ? (

              <div className="p-6 text-center text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl">

                {projectsError}

              </div>

            ) : projects.length === 0 ? (

              <div className="p-6 text-center text-sm text-slate-500 bg-white border border-slate-200 rounded-xl">

                No projects found.
                Create your first project.

              </div>

            ) : (

              projects
                .slice(0, 3)
                .map(
                  (project) => (

                    <Card
                      key={project.id}
                      hover={true}
                      onClick={() =>
                        navigate(
                          '/projects'
                        )
                      }
                      className="bg-white border border-slate-200 p-4"
                    >

                      <div className="flex items-start justify-between">

                        <div className="space-y-1">

                          <h3 className="text-sm font-bold text-slate-900 font-heading">

                            {project.name}

                          </h3>


                          <p className="text-xs text-slate-500 line-clamp-1">

                            {project.description ||
                              'No description available'}

                          </p>

                        </div>


                        <Badge
                          variant="emerald"
                          size="sm"
                        >
                          {project.status ||
                            'Active'}
                        </Badge>

                      </div>


                      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-mono">

                        <div className="flex items-center gap-4">

                          <span>

                            {project.conversations_count ||
                              0}{' '}
                            Chats

                          </span>


                          <span>

                            {project.documents_count ||
                              0}{' '}
                            RAG Docs

                          </span>

                        </div>


                        <span>

                          Updated{' '}

                          {formatDate(
                            project.updated_at
                          )}

                        </span>

                      </div>

                    </Card>

                  )
                )

            )}

          </div>

        </div>


        {/* ====================================================
            KNOWLEDGE
        ==================================================== */}

        <div className="space-y-3">

          <h2 className="text-base font-bold font-heading text-slate-900">

            Vector Knowledge Feeds

          </h2>


          <Card className="space-y-4 bg-white border border-slate-200 p-4">

            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">

              <Database className="w-4 h-4 text-blue-600" />

              <span className="text-xs font-bold text-slate-900 font-heading">

                ChromaDB Collections

              </span>

            </div>


            <div className="space-y-2.5">

              {collections.length === 0 ? (

                <div className="p-4 text-center text-xs text-slate-500">

                  No knowledge collections found.

                </div>

              ) : (

                collections
                  .slice(0, 5)
                  .map(
                    (collection) => (

                      <div
                        key={collection.id}
                        className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1"
                      >

                        <div className="flex items-center justify-between">

                          <p className="text-xs font-semibold text-slate-900">

                            {collection.name}

                          </p>


                          <span className="text-[10px] text-blue-600 font-mono font-medium">

                            {collection.documents_count ||
                              0}{' '}
                            docs

                          </span>

                        </div>


                        <p className="text-[11px] text-slate-500 line-clamp-1">

                          {collection.description ||
                            'No description available'}

                        </p>

                      </div>

                    )
                  )

              )}

            </div>


            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() =>
                navigate('/knowledge')
              }
            >

              Explore Knowledge Base

            </Button>

          </Card>

        </div>

      </div>


      {/* ======================================================
          RECENT ACTIVITY
      ====================================================== */}

      <div className="space-y-3">

        <div className="flex items-center justify-between">

          <div>

            <h2 className="text-base font-bold font-heading text-slate-900 flex items-center gap-2">

              <Clock className="w-4 h-4 text-blue-600" />

              Recent OrionAI Activity

            </h2>

            <p className="text-xs text-slate-500">

              Latest projects and AI-generated outputs

            </p>

          </div>

        </div>


        <Card className="bg-white border border-slate-200 p-4">

          {outputsError ? (

            <div className="p-4 text-center text-xs text-red-600 bg-red-50 rounded-lg">

              {outputsError}

            </div>

          ) : outputsLoading ? (

            <div className="p-6 text-center text-sm text-slate-500">

              Loading activity...

            </div>

          ) : recentActivity.length === 0 ? (

            <div className="p-6 text-center text-sm text-slate-500">

              No recent activity yet.

            </div>

          ) : (

            <div className="divide-y divide-slate-100">

              {recentActivity.map(
                (activity) => {

                  const Icon =
                    activity.icon;

                  return (

                    <div
                      key={activity.id}
                      onClick={() =>
                        navigate(
                          activity.route
                        )
                      }
                      className="flex items-center justify-between gap-4 py-3 cursor-pointer hover:bg-slate-50 px-2 rounded-lg transition-colors"
                    >

                      <div className="flex items-center gap-3 min-w-0">

                        <div className="p-2 rounded-lg bg-blue-50 text-blue-600">

                          <Icon className="w-4 h-4" />

                        </div>


                        <div className="min-w-0">

                          <p className="text-xs font-semibold text-slate-900 truncate">

                            {activity.title}

                          </p>


                          <p className="text-[10px] text-slate-500">

                            {activity.type}

                          </p>

                        </div>

                      </div>


                      <div className="flex items-center gap-2 shrink-0">

                        <span className="text-[10px] text-slate-400 font-mono">

                          {formatDateTime(
                            activity.date
                          )}

                        </span>


                        <ArrowRight className="w-3.5 h-3.5 text-slate-400" />

                      </div>

                    </div>

                  );

                }
              )}

            </div>

          )}

        </Card>

      </div>


      {/* ======================================================
          MODAL
      ====================================================== */}

      <NewProjectModal
        isOpen={
          isNewProjectModalOpen
        }
        onClose={() =>
          setIsNewProjectModalOpen(
            false
          )
        }
      />

    </div>

  );

}