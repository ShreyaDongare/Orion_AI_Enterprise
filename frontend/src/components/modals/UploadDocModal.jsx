import React, { useState } from 'react';
import Modal from '../Modal';
import FileUpload from '../FileUpload';
import Button from '../Button';
import { UploadCloud, Tag } from 'lucide-react';
import { useKnowledgeStore } from '../../store/useKnowledgeStore';
import toast from 'react-hot-toast';

export default function UploadDocModal({
  isOpen,
  onClose
}) {
  const {
    activeCollection,
    uploadDocument,
    isUploading
  } = useKnowledgeStore();

  const [selectedFiles, setSelectedFiles] =
    useState([]);

  const [tagInput, setTagInput] =
    useState('Compliance, RAG');

  const handleUpload = async () => {

    // ========================================================
    // VALIDATE FILE
    // ========================================================

    if (selectedFiles.length === 0) {
      toast.error(
        'Please select at least one document to upload.'
      );

      return;
    }

    // ========================================================
    // VALIDATE COLLECTION
    // ========================================================

    const targetCollId =
      activeCollection?.id;

    if (!targetCollId) {
      toast.error(
        'Please create and select a knowledge collection first.'
      );

      return;
    }

    // ========================================================
    // PREPARE TAGS
    // ========================================================

    const tags = tagInput
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean);

    // ========================================================
    // UPLOAD DOCUMENTS
    // ========================================================

    try {

      for (const file of selectedFiles) {

        await uploadDocument({
          collectionId: targetCollId,
          file,
          tags
        });

      }

      // ======================================================
      // SUCCESS
      // ======================================================

      toast.success(
        `${selectedFiles.length} document(s) uploaded and indexed successfully!`
      );

      setSelectedFiles([]);

      onClose();

    } catch (error) {

      console.error(
        'Document upload failed:',
        error
      );

      toast.error(
        error?.response?.data?.message ||
        error?.message ||
        'Document upload failed.'
      );
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
    >

      <div className="space-y-5">

        {/* ====================================================
            SELECTED COLLECTION
        ==================================================== */}

        <div className="text-sm text-slate-300">

          Selected Collection:{' '}

          <span className="font-semibold text-slate-900">
            {activeCollection?.name ||
              'No collection selected'}
          </span>

          {activeCollection && (
            <span className="text-emerald-400 ml-1">
              (Vector Indexed)
            </span>
          )}

        </div>

        {/* ====================================================
            FILE UPLOAD
        ==================================================== */}

        <FileUpload
          onFilesSelected={setSelectedFiles}
        />

        {/* ====================================================
            TAGS
        ==================================================== */}

        <div className="space-y-1.5">

          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
            Document Tags (comma separated)
          </label>

          <div className="relative flex items-center">

            <Tag className="w-4 h-4 text-slate-400 absolute left-3.5" />

            <input
              type="text"
              value={tagInput}
              onChange={(e) =>
                setTagInput(e.target.value)
              }
              placeholder="e.g. Audit, SOC2, Legal, Policy"
              className="w-full bg-slate-900/60 text-slate-100 text-sm rounded-xl border border-slate-700/80 pl-10 pr-3.5 py-2.5 outline-none focus:border-fuchsia-500"
            />

          </div>

        </div>

        {/* ====================================================
            ACTIONS
        ==================================================== */}

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">

          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            disabled={isUploading}
          >
            Cancel
          </Button>

          <Button
            variant="clay"
            size="sm"
            isLoading={isUploading}
            icon={UploadCloud}
            onClick={handleUpload}
          >
            Ingest & Vectorize
          </Button>

        </div>

      </div>

    </Modal>
  );
}