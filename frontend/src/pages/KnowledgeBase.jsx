import React, { useEffect, useState } from 'react';
import {
  Database,
  UploadCloud,
  FileText,
  Search,
  Trash2,
  FolderPlus,
} from 'lucide-react';

import Card from '../components/Card';
import Button from '../components/Button';
import Badge from '../components/Badge';
import Breadcrumb from '../components/Breadcrumb';

import { useKnowledgeStore } from '../store/useKnowledgeStore';
import UploadDocModal from '../components/modals/UploadDocModal';

import toast from 'react-hot-toast';

export default function KnowledgeBase() {
  const {
    collections = [],
    activeCollection,
    setActiveCollection,
    loadCollections,
    createCollection,
    deleteDocument,
    isLoading,
    isUploading,
    error,
  } = useKnowledgeStore();

  const [isUploadOpen, setIsUploadOpen] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');

  const [isCreateCollectionOpen, setIsCreateCollectionOpen] =
    useState(false);

  const [collectionName, setCollectionName] = useState('');

  const [collectionDescription, setCollectionDescription] =
    useState('');

  // ============================================================
  // LOAD COLLECTIONS
  // ============================================================

  useEffect(() => {
    loadCollections();
  }, [loadCollections]);

  // ============================================================
  // GET DOCUMENTS
  // ============================================================

  const rawDocs =
    activeCollection?.documents ||
    (collections.length > 0
      ? collections[0]?.documents
      : []) ||
    [];

  // ============================================================
  // SEARCH DOCUMENTS
  // ============================================================

  const filteredDocs = rawDocs.filter((doc) => {
    const docTitle = (
      doc.title ||
      doc.name ||
      ''
    ).toLowerCase();

    const tags = Array.isArray(doc.tags)
      ? doc.tags
      : [];

    const query = searchQuery.toLowerCase();

    return (
      docTitle.includes(query) ||
      tags.some((tag) =>
        String(tag)
          .toLowerCase()
          .includes(query)
      )
    );
  });

  // ============================================================
  // CREATE COLLECTION
  // ============================================================

  const handleCreateCollection = async () => {
    if (!collectionName.trim()) {
      toast.error(
        'Collection name is required.'
      );

      return;
    }

    try {
      await createCollection({
        name: collectionName.trim(),
        description:
          collectionDescription.trim(),
      });

      toast.success(
        'Knowledge collection created.'
      );

      setCollectionName('');

      setCollectionDescription('');

      setIsCreateCollectionOpen(false);
    } catch (error) {
      toast.error(
        error?.response?.data?.message ||
          error?.message ||
          'Failed to create collection.'
      );
    }
  };

  // ============================================================
  // DELETE DOCUMENT
  // ============================================================

  const handleDeleteDoc = async (
    id,
    name
  ) => {
    if (
      !confirm(
        `Remove document "${name}" from RAG index?`
      )
    ) {
      return;
    }

    try {
      await deleteDocument(id);

      toast.success(
        'Document un-indexed from ChromaDB.'
      );
    } catch (error) {
      toast.error(
        error?.response?.data?.message ||
          error?.message ||
          'Failed to delete document.'
      );
    }
  };

  // ============================================================
  // FORMAT FILE SIZE
  // ============================================================

  const formatFileSize = (size) => {
    if (
      size === undefined ||
      size === null ||
      size === ''
    ) {
      return 'N/A';
    }

    const numericSize = Number(size);

    if (
      Number.isNaN(numericSize) ||
      numericSize <= 0
    ) {
      return '0 MB';
    }

    if (numericSize < 1024) {
      return `${numericSize} B`;
    }

    if (numericSize < 1024 * 1024) {
      return `${(
        numericSize / 1024
      ).toFixed(1)} KB`;
    }

    return `${(
      numericSize /
      (1024 * 1024)
    ).toFixed(2)} MB`;
  };

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <div className="space-y-6">

      {/* ======================================================
          PAGE HEADER
      ====================================================== */}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">

        <div>

          <Breadcrumb
            items={[
              {
                label: 'Vector Knowledge RAG',
              },
            ]}
          />

          <h1 className="text-2xl font-bold font-heading text-slate-900 tracking-tight">
            Knowledge Base & RAG Index
          </h1>

          <p className="text-xs text-slate-500 mt-1">
            Enterprise document embeddings vector
            store powered by ChromaDB & cosine
            similarity retrieval.
          </p>

        </div>

        <div className="flex items-center gap-2">

          {/* NEW COLLECTION */}

          <Button
            id="kb-create-collection-btn"
            variant="secondary"
            size="sm"
            icon={FolderPlus}
            onClick={() =>
              setIsCreateCollectionOpen(true)
            }
          >
            New Collection
          </Button>

          {/* UPLOAD DOCUMENT */}

          <Button
            id="kb-upload-doc-btn"
            variant="blue"
            size="sm"
            icon={UploadCloud}
            onClick={() => {

              if (!activeCollection) {
                toast.error(
                  'Create or select a knowledge collection first.'
                );

                return;
              }

              setIsUploadOpen(true);
            }}
          >
            Ingest & Vectorize Doc
          </Button>

        </div>

      </div>

      {/* ======================================================
          COLLECTION SWITCHER
      ====================================================== */}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

        {isLoading ? (

          <div className="col-span-full p-6 text-sm text-slate-500">
            Loading knowledge collections...
          </div>

        ) : error ? (

          <div className="col-span-full p-6 text-sm text-red-600">
            {error}
          </div>

        ) : collections.length === 0 ? (

          <div className="col-span-full p-8 text-center border border-dashed border-slate-300 rounded-xl">

            <Database className="w-8 h-8 mx-auto text-slate-400 mb-3" />

            <p className="text-sm font-semibold text-slate-700">
              No knowledge collections found
            </p>

            <p className="text-xs text-slate-500 mt-1">
              Create your first collection to start
              uploading enterprise documents.
            </p>

            <button
              onClick={() =>
                setIsCreateCollectionOpen(
                  true
                )
              }
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700"
            >
              <FolderPlus className="w-4 h-4" />
              Create Collection
            </button>

          </div>

        ) : (

          collections.map((collection) => (

            <div
              key={collection.id}
              onClick={() =>
                setActiveCollection(
                  collection
                )
              }
              className={`p-4 rounded-xl border transition-all cursor-pointer ${
                activeCollection?.id ===
                collection.id
                  ? 'bg-blue-50 border-blue-200 shadow-xs'
                  : 'bg-white border-slate-200 hover:border-slate-300'
              }`}
            >

              <div className="flex items-center justify-between mb-2">

                <Database
                  className={`w-4 h-4 ${
                    activeCollection?.id ===
                    collection.id
                      ? 'text-blue-600'
                      : 'text-slate-400'
                  }`}
                />

                <Badge
                  variant="blue"
                  size="sm"
                >
                  {collection.documents_count ||
                    0}{' '}
                  Docs
                </Badge>

              </div>

              <h3 className="text-sm font-bold text-slate-900 font-heading">
                {collection.name}
              </h3>

              <p className="text-xs text-slate-500 mt-1 line-clamp-1">
                {collection.description ||
                  'No description'}
              </p>

            </div>

          ))

        )}

      </div>

      {/* ======================================================
          DOCUMENTS TABLE
      ====================================================== */}

      <Card className="space-y-4 bg-white border border-slate-200 p-5">

        {/* SEARCH */}

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">

          <div className="relative flex-1 max-w-md">

            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />

            <input
              type="text"
              value={searchQuery}
              onChange={(e) =>
                setSearchQuery(
                  e.target.value
                )
              }
              placeholder="Search vector indexed documents or tags..."
              className="w-full bg-slate-50 text-xs rounded-xl border border-slate-200 pl-9 pr-3 py-2 text-slate-900 outline-none focus:border-blue-600"
            />

          </div>

          <span className="text-xs text-slate-500 font-mono">
            {filteredDocs.length} Documents
            Vectorized
          </span>

        </div>

        {/* TABLE */}

        <div className="overflow-x-auto">

          <table className="w-full text-left text-xs">

            <thead>

              <tr className="border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider font-heading">

                <th className="py-3 px-4">
                  Document Title
                </th>

                <th className="py-3 px-4">
                  Size
                </th>

                <th className="py-3 px-4">
                  Vector Status
                </th>

                <th className="py-3 px-4">
                  Tags
                </th>

                <th className="py-3 px-4 text-right">
                  Action
                </th>

              </tr>

            </thead>

            <tbody className="divide-y divide-slate-100">

              {filteredDocs.length === 0 ? (

                <tr>

                  <td
                    colSpan="5"
                    className="py-10 text-center text-sm text-slate-500"
                  >
                    {activeCollection
                      ? 'No documents have been indexed in this collection.'
                      : 'Select a collection to view indexed documents.'}
                  </td>

                </tr>

              ) : (

                filteredDocs.map((doc) => (

                  <tr
                    key={doc.id}
                    className="hover:bg-slate-50 transition-colors"
                  >

                    {/* DOCUMENT TITLE */}

                    <td className="py-3.5 px-4 font-semibold text-slate-900">

                      <div className="flex items-center gap-2">

                        <FileText className="w-4 h-4 text-blue-600 shrink-0" />

                        <span>
                          {doc.title ||
                            doc.name ||
                            'Untitled document'}
                        </span>

                      </div>

                    </td>

                    {/* SIZE */}

                    <td className="py-3.5 px-4 text-slate-500 font-mono">

                      {formatFileSize(
                        doc.size
                      )}

                    </td>

                    {/* VECTOR STATUS */}

                    <td className="py-3.5 px-4">

                      <Badge
                        variant={
                          doc.vector_status ===
                          'Indexed'
                            ? 'emerald'
                            : 'blue'
                        }
                        size="sm"
                      >
                        {doc.vector_status ||
                          'Indexed'}
                      </Badge>

                    </td>

                    {/* TAGS */}

                    <td className="py-3.5 px-4">

                      <div className="flex flex-wrap gap-1">

                        {Array.isArray(
                          doc.tags
                        ) &&
                        doc.tags.length > 0 ? (

                          doc.tags.map(
                            (tag, index) => (

                              <span
                                key={`${tag}-${index}`}
                                className="px-2 py-0.5 rounded-md bg-slate-100 text-[10px] text-slate-700 font-mono"
                              >
                                #{tag}
                              </span>

                            )
                          )

                        ) : (

                          <span className="text-slate-400">
                            No tags
                          </span>

                        )}

                      </div>

                    </td>

                    {/* DELETE */}

                    <td className="py-3.5 px-4 text-right">

                      <button
                        onClick={() =>
                          handleDeleteDoc(
                            doc.id,
                            doc.title ||
                              doc.name ||
                              'document'
                          )
                        }
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-slate-100 transition-colors"
                        title="Delete document"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>

                    </td>

                  </tr>

                ))

              )}

            </tbody>

          </table>

        </div>

      </Card>

      {/* ======================================================
          CREATE COLLECTION MODAL
      ====================================================== */}

      {isCreateCollectionOpen && (

        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">

          <div className="w-full max-w-md rounded-2xl bg-white shadow-xl">

            {/* HEADER */}

            <div className="p-5 border-b border-slate-100">

              <div className="flex items-center justify-between">

                <div>

                  <h2 className="text-lg font-bold text-slate-900">
                    Create Knowledge Collection
                  </h2>

                  <p className="text-xs text-slate-500 mt-1">
                    Create a collection for your
                    enterprise documents.
                  </p>

                </div>

                <button
                  onClick={() =>
                    setIsCreateCollectionOpen(
                      false
                    )
                  }
                  className="text-slate-400 hover:text-slate-700"
                >
                  ✕
                </button>

              </div>

            </div>

            {/* FORM */}

            <div className="p-5 space-y-4">

              {/* NAME */}

              <div>

                <label className="block text-xs font-semibold text-slate-700 mb-2">
                  Collection Name
                </label>

                <input
                  type="text"
                  value={collectionName}
                  onChange={(e) =>
                    setCollectionName(
                      e.target.value
                    )
                  }
                  placeholder="e.g. Enterprise Security"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-600"
                />

              </div>

              {/* DESCRIPTION */}

              <div>

                <label className="block text-xs font-semibold text-slate-700 mb-2">
                  Description
                </label>

                <textarea
                  value={
                    collectionDescription
                  }
                  onChange={(e) =>
                    setCollectionDescription(
                      e.target.value
                    )
                  }
                  placeholder="Describe what documents this collection contains..."
                  rows={4}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none resize-none focus:border-blue-600"
                />

              </div>

            </div>

            {/* ACTIONS */}

            <div className="p-5 border-t border-slate-100 flex justify-end gap-2">

              <Button
                variant="secondary"
                size="sm"
                onClick={() => {

                  setCollectionName('');

                  setCollectionDescription('');

                  setIsCreateCollectionOpen(
                    false
                  );

                }}
              >
                Cancel
              </Button>

              <Button
                variant="blue"
                size="sm"
                icon={FolderPlus}
                onClick={
                  handleCreateCollection
                }
                disabled={isLoading}
              >
                {isLoading
                  ? 'Creating...'
                  : 'Create Collection'}
              </Button>

            </div>

          </div>

        </div>

      )}

      {/* ======================================================
          UPLOAD DOCUMENT MODAL
      ====================================================== */}

      <UploadDocModal
        isOpen={isUploadOpen}
        onClose={() =>
          setIsUploadOpen(false)
        }
      />

    </div>
  );
}