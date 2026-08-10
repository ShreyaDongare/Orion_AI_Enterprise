import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  FolderPlus,
  Folder,
  MessageSquare,
  Database,
  Trash2,
  ArrowRight,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import Card from '../components/Card';
import Button from '../components/Button';
import Badge from '../components/Badge';
import Breadcrumb from '../components/Breadcrumb';

import { useProjectStore } from '../store/useProjectStore';
import NewProjectModal from '../components/modals/NewProjectModal';

import toast from 'react-hot-toast';

export default function Projects() {
  const navigate = useNavigate();

  const {
    projects,
    loadProjects,
    deleteProject,
    setActiveProject,
    isLoading,
    error,
  } = useProjectStore();

  const [isModalOpen, setIsModalOpen] =
    useState(false);

  // ==========================================================
  // LOAD REAL PROJECTS
  // ==========================================================

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  // ==========================================================
  // DELETE PROJECT
  // ==========================================================

  const handleDelete = async (
    id,
    name,
    e
  ) => {
    e.stopPropagation();

    const confirmed = window.confirm(
      `Are you sure you want to delete "${name}"?`
    );

    if (!confirmed) {
      return;
    }

    try {
      await deleteProject(id);

      toast.success(
        `Project "${name}" removed.`
      );
    } catch (error) {
      toast.error(
        error?.message ||
          'Unable to delete project.'
      );
    }
  };

  // ==========================================================
  // SELECT PROJECT
  // ==========================================================

  const handleSelect = (project) => {
    if (!project?.id) {
      return;
    }

    setActiveProject(project);

    navigate('/workspace');
  };

  // ==========================================================
  // RENDER
  // ==========================================================

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
                label: 'Projects Workspace',
              },
            ]}
          />

          <h1 className="text-2xl font-bold font-heading text-slate-900 tracking-tight">
            Enterprise Projects
          </h1>

          <p className="text-xs text-slate-500 mt-1">
            Organize multi-agent conversations,
            vector knowledge collections, and
            executive outputs.
          </p>
        </div>

        <Button
          id="projects-create-btn"
          variant="blue"
          size="sm"
          icon={FolderPlus}
          onClick={() =>
            setIsModalOpen(true)
          }
        >
          Create Project
        </Button>

      </div>

      {/* ======================================================
          ERROR
      ====================================================== */}

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* ======================================================
          LOADING
      ====================================================== */}

      {isLoading && (
        <div className="p-8 text-center text-sm text-slate-500 bg-white border border-slate-200 rounded-xl">
          Loading projects...
        </div>
      )}

      {/* ======================================================
          EMPTY STATE
      ====================================================== */}

      {!isLoading &&
        !error &&
        projects.length === 0 && (
          <div className="p-10 text-center bg-white border border-slate-200 rounded-xl">

            <Folder className="w-10 h-10 mx-auto text-slate-300 mb-3" />

            <h2 className="text-sm font-bold text-slate-800">
              No projects found
            </h2>

            <p className="text-xs text-slate-500 mt-1 mb-4">
              Create your first real enterprise
              project to get started.
            </p>

            <Button
              variant="blue"
              size="sm"
              icon={FolderPlus}
              onClick={() =>
                setIsModalOpen(true)
              }
            >
              Create Project
            </Button>

          </div>
        )}

      {/* ======================================================
          REAL PROJECTS
      ====================================================== */}

      {!isLoading &&
        projects.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

            {projects.map((project) => (

              <Card
                key={project.id}
                hover={true}
                onClick={() =>
                  handleSelect(project)
                }
                className="bg-white border border-slate-200 p-5 flex flex-col justify-between space-y-4"
              >

                {/* PROJECT CONTENT */}

                <div>

                  <div className="flex items-start justify-between">

                    <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
                      <Folder className="w-4 h-4" />
                    </div>

                    <div className="flex items-center gap-2">

                      <Badge
                        variant="emerald"
                        size="sm"
                      >
                        {project.status ||
                          'active'}
                      </Badge>

                      <button
                        type="button"
                        onClick={(event) =>
                          handleDelete(
                            project.id,
                            project.name,
                            event
                          )
                        }
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-slate-100 transition-colors"
                        aria-label={`Delete ${project.name}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>

                    </div>

                  </div>

                  <div className="mt-4 space-y-1">

                    <h3 className="text-base font-bold text-slate-900 font-heading">
                      {project.name}
                    </h3>

                    <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                      {project.description ||
                        'No description available.'}
                    </p>

                  </div>

                </div>

                {/* PROJECT METADATA */}

                <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-mono">

                  <div className="flex items-center gap-4">

                    <span className="flex items-center gap-1">

                      <MessageSquare className="w-3.5 h-3.5 text-blue-600" />

                      {project.conversations_count ??
                        0}{' '}
                      Chats

                    </span>

                    <span className="flex items-center gap-1">

                      <Database className="w-3.5 h-3.5 text-cyan-600" />

                      {project.documents_count ??
                        0}{' '}
                      Vector Docs

                    </span>

                  </div>

                  <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 transition-colors" />

                </div>

              </Card>

            ))}

          </div>
        )}

      {/* ======================================================
          NEW PROJECT MODAL
      ====================================================== */}

      <NewProjectModal
        isOpen={isModalOpen}
        onClose={() =>
          setIsModalOpen(false)
        }
      />

    </div>
  );
}