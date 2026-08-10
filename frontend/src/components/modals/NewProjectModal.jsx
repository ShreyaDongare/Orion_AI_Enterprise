import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import Modal from '../Modal';
import { Input, Textarea } from '../Input';
import Button from '../Button';

import { FolderPlus } from 'lucide-react';

import { useProjectStore } from '../../store/useProjectStore';

import toast from 'react-hot-toast';

// ============================================================
// VALIDATION
// ============================================================

const projectSchema = z.object({
  name: z
    .string()
    .trim()
    .min(
      3,
      'Project name must be at least 3 characters'
    ),

  description: z
    .string()
    .trim()
    .min(
      10,
      'Please provide a descriptive scope summary'
    ),
});

// ============================================================
// NEW PROJECT MODAL
// ============================================================

export default function NewProjectModal({
  isOpen,
  onClose,
}) {
  const {
    createProject,
    error: projectError,
  } = useProjectStore();

  // ==========================================================
  // FORM
  // ==========================================================

  const {
    register,
    handleSubmit,
    reset,
    formState: {
      errors,
      isSubmitting,
    },
  } = useForm({
    resolver: zodResolver(
      projectSchema
    ),

    defaultValues: {
      name: '',
      description: '',
    },
  });

  // ==========================================================
  // CLOSE MODAL
  // ==========================================================

  const handleClose = () => {
    if (isSubmitting) {
      return;
    }

    reset();

    onClose();
  };

  // ==========================================================
  // SUBMIT
  // ==========================================================

  const onSubmit = async (data) => {
    try {
      // ------------------------------------------------------
      // Send project data to the REAL backend.
      // No mock project is created here.
      // ------------------------------------------------------

      const project =
        await createProject({
          name: data.name.trim(),
          description:
            data.description.trim(),
        });

      // ------------------------------------------------------
      // Verify backend response.
      // ------------------------------------------------------

      if (!project?.id) {
        throw new Error(
          'Backend did not return a valid project.'
        );
      }

      // ------------------------------------------------------
      // Success
      // ------------------------------------------------------

      toast.success(
        `Project "${project.name}" created successfully.`
      );

      reset();

      onClose();

    } catch (error) {
      console.error(
        'Project creation failed:',
        error
      );

      // ------------------------------------------------------
      // Show REAL backend error.
      // ------------------------------------------------------

      toast.error(
        error?.message ||
        projectError ||
        'Failed to create project.'
      );
    }
  };

  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Create Enterprise Project"
    >
      <form
        onSubmit={handleSubmit(
          onSubmit
        )}
        className="space-y-5"
      >

        {/* ====================================================
            PROJECT NAME
        ==================================================== */}

        <Input
          id="new-project-name"
          label="Project Title"
          placeholder="e.g., Q4 EMEA Expansion & Market Intelligence"
          error={
            errors.name?.message
          }
          disabled={isSubmitting}
          {...register('name')}
        />

        {/* ====================================================
            PROJECT DESCRIPTION
        ==================================================== */}

        <Textarea
          id="new-project-desc"
          label="Scope Description"
          rows={4}
          placeholder="Outline the primary objectives, target deliverables, and team collaboration scope..."
          error={
            errors.description?.message
          }
          disabled={isSubmitting}
          {...register(
            'description'
          )}
        />

        {/* ====================================================
            BACKEND ERROR
        ==================================================== */}

        {projectError && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
            {projectError}
          </div>
        )}

        {/* ====================================================
            ACTIONS
        ==================================================== */}

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>

          <Button
            id="new-project-submit"
            type="submit"
            variant="primary"
            size="sm"
            isLoading={isSubmitting}
            icon={FolderPlus}
            disabled={isSubmitting}
          >
            Create Project
          </Button>

        </div>

      </form>
    </Modal>
  );
}