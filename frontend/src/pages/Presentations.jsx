import React, { useEffect, useState } from 'react';
import {
  Presentation,
  ChevronLeft,
  ChevronRight,
  Download,
  Trash2,
} from 'lucide-react';

import Card from '../components/Card';
import Badge from '../components/Badge';
import Breadcrumb from '../components/Breadcrumb';
import Button from '../components/Button';

import presentationService from '../services/presentationService';

import toast from 'react-hot-toast';

export default function Presentations() {
  const [presentations, setPresentations] =
    useState([]);

  const [selectedPresentation, setSelectedPresentation] =
    useState(null);

  const [currentSlideIndex, setCurrentSlideIndex] =
    useState(0);

  const [isLoading, setIsLoading] =
    useState(true);

  const [error, setError] =
    useState(null);

  const [isDownloading, setIsDownloading] =
    useState(false);

  // ==========================================================
  // LOAD REAL PRESENTATIONS
  // ==========================================================

  const loadPresentations = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data =
        await presentationService.getPresentations();

      const realPresentations =
        Array.isArray(data)
          ? data
          : [];

      setPresentations(
        realPresentations
      );

      setSelectedPresentation(
        realPresentations.length > 0
          ? realPresentations[0]
          : null
      );

      setCurrentSlideIndex(0);
    } catch (error) {
      console.error(
        'Failed to load presentations:',
        error
      );

      setPresentations([]);
      setSelectedPresentation(null);

      setError(
        error?.message ||
          'Unable to load presentations.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPresentations();
  }, []);

  // ==========================================================
  // SELECT PRESENTATION
  // ==========================================================

  const handleSelectPresentation = (
    presentation
  ) => {
    setSelectedPresentation(
      presentation
    );

    setCurrentSlideIndex(0);
  };

  // ==========================================================
  // GET SLIDES
  // ==========================================================

  const getSlides = () => {
    if (!selectedPresentation) {
      return [];
    }

    const data =
      selectedPresentation.slides_data;

    if (Array.isArray(data)) {
      return data;
    }

    if (
      data &&
      Array.isArray(data.slides)
    ) {
      return data.slides;
    }

    return [];
  };

  const slides = getSlides();

  const currentSlide =
    slides[currentSlideIndex] || null;

  // ==========================================================
  // FORMAT DATE
  // ==========================================================

  const formatDate = (value) => {
    if (!value) {
      return 'Unknown date';
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return 'Unknown date';
    }

    return date.toLocaleDateString(
      'en-IN',
      {
        year: 'numeric',
        month: 'short',
        day: '2-digit',
      }
    );
  };

  // ==========================================================
  // DOWNLOAD
  // ==========================================================

  const handleDownload = async () => {
    if (!selectedPresentation?.id) {
      return;
    }

    setIsDownloading(true);

    try {
      await presentationService.downloadPresentation(
        selectedPresentation.id
      );

      toast.success(
        'Presentation downloaded.'
      );
    } catch (error) {
      toast.error(
        error?.message ||
          'Unable to download presentation.'
      );
    } finally {
      setIsDownloading(false);
    }
  };

  // ==========================================================
  // DELETE
  // ==========================================================

  const handleDelete = async () => {
    if (!selectedPresentation?.id) {
      return;
    }

    const confirmed = window.confirm(
      `Delete "${selectedPresentation.title}"?`
    );

    if (!confirmed) {
      return;
    }

    try {
      await presentationService.deletePresentation(
        selectedPresentation.id
      );

      toast.success(
        'Presentation deleted.'
      );

      await loadPresentations();
    } catch (error) {
      toast.error(
        error?.message ||
          'Unable to delete presentation.'
      );
    }
  };

  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <div className="space-y-6">

      <div>
        <Breadcrumb
          items={[
            {
              label: 'Generated Slides',
            },
          ]}
        />

        <div className="flex items-center gap-3">

          <div className="p-2 rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
            <Presentation className="w-5 h-5" />
          </div>

          <div>
            <h1 className="text-2xl font-bold font-heading text-slate-900">
              Executive Presentation Deck Generator
            </h1>

            <p className="text-xs text-slate-500 mt-1">
              Presentation decks generated by the
              Presentation Agent and stored in the
              database.
            </p>
          </div>

        </div>
      </div>

      {/* ERROR */}

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* LOADING */}

      {isLoading && (
        <div className="p-8 text-center bg-white border border-slate-200 rounded-xl text-sm text-slate-500">
          Loading presentations...
        </div>
      )}

      {/* EMPTY */}

      {!isLoading &&
        !error &&
        presentations.length === 0 && (
          <div className="p-10 text-center bg-white border border-slate-200 rounded-xl">

            <Presentation className="w-10 h-10 mx-auto text-slate-300 mb-3" />

            <h2 className="text-sm font-bold text-slate-800">
              No presentations found
            </h2>

            <p className="text-xs text-slate-500 mt-1">
              Presentations generated by the AI
              Presentation Agent will appear here.
            </p>

          </div>
        )}

      {/* REAL PRESENTATIONS */}

      {!isLoading &&
        presentations.length > 0 && (

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">

            {/* PRESENTATION LIST */}

            <div className="space-y-3">

              {presentations.map(
                (presentation) => (

                  <div
                    key={presentation.id}
                    onClick={() =>
                      handleSelectPresentation(
                        presentation
                      )
                    }
                    className={`
                      p-4
                      rounded-xl
                      border
                      transition-all
                      cursor-pointer
                      ${
                        selectedPresentation?.id ===
                        presentation.id
                          ? 'bg-blue-50 border-blue-200 shadow-xs'
                          : 'bg-white border-slate-200 hover:border-slate-300'
                      }
                    `}
                  >

                    <div className="flex items-center justify-between mb-2">

                      <Badge
                        variant="blue"
                        size="sm"
                      >
                        Presentation
                      </Badge>

                      <span className="text-[10px] text-slate-400 font-mono">
                        {formatDate(
                          presentation.created_at
                        )}
                      </span>

                    </div>

                    <h3 className="text-sm font-bold text-slate-900 font-heading">
                      {presentation.title}
                    </h3>

                  </div>
                )
              )}

            </div>

            {/* SLIDE VIEWER */}

            <div className="lg:col-span-3">

              <Card className="p-8 space-y-6 min-h-[420px] flex flex-col justify-between relative overflow-hidden bg-white border border-slate-200">

                {selectedPresentation ? (

                  <>
                    <div className="flex items-center justify-between border-b border-slate-100 pb-4">

                      <div className="flex items-center gap-2">

                        <Presentation className="w-4 h-4 text-blue-600" />

                        <span className="text-xs font-bold font-heading text-slate-900">
                          {selectedPresentation.title}
                        </span>

                      </div>

                      <div className="flex items-center gap-2">

                        <Badge
                          variant="blue"
                          size="sm"
                        >
                          Presentation Mode
                        </Badge>

                        <Button
                          variant="outline"
                          size="sm"
                          icon={Download}
                          isLoading={isDownloading}
                          onClick={handleDownload}
                        >
                          Download
                        </Button>

                        <button
                          type="button"
                          onClick={handleDelete}
                          className="p-2 rounded-lg border border-slate-200 text-slate-500 hover:text-red-600 hover:border-red-200 transition-colors"
                          title="Delete presentation"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>

                      </div>

                    </div>

                    {currentSlide ? (

                      <div className="space-y-4 my-auto max-w-3xl">

                        <h2 className="text-3xl font-extrabold font-heading text-slate-900 tracking-tight">
                          {currentSlide.title ||
                            `Slide ${
                              currentSlideIndex + 1
                            }`}
                        </h2>

                        {currentSlide.subtitle && (
                          <p className="text-sm font-semibold text-blue-600">
                            {currentSlide.subtitle}
                          </p>
                        )}

                        {Array.isArray(
                          currentSlide.bullets
                        ) &&
                          currentSlide.bullets.length > 0 && (

                            <ul className="space-y-2.5 pt-2">

                              {currentSlide.bullets.map(
                                (bullet, index) => (

                                  <li
                                    key={index}
                                    className="flex items-start gap-3 text-xs sm:text-sm text-slate-700"
                                  >

                                    <span className="w-1.5 h-1.5 rounded-full bg-blue-600 mt-2 shrink-0" />

                                    <span>
                                      {bullet}
                                    </span>

                                  </li>
                                )
                              )}

                            </ul>
                          )}

                        {currentSlide.content && (
                          <p className="text-sm text-slate-700 whitespace-pre-wrap">
                            {currentSlide.content}
                          </p>
                        )}

                      </div>

                    ) : (

                      <div className="flex flex-1 items-center justify-center text-sm text-slate-500">
                        No slide data is available.
                      </div>

                    )}

                    <div className="flex items-center justify-between border-t border-slate-100 pt-4 text-xs text-slate-500 font-mono">

                      <span>
                        Slide{' '}
                        {slides.length > 0
                          ? currentSlideIndex + 1
                          : 0}{' '}
                        of {slides.length}
                      </span>

                      <div className="flex items-center gap-2">

                        <button
                          type="button"
                          onClick={() =>
                            setCurrentSlideIndex(
                              Math.max(
                                0,
                                currentSlideIndex - 1
                              )
                            )
                          }
                          disabled={
                            currentSlideIndex === 0 ||
                            slides.length === 0
                          }
                          className="p-1.5 rounded-lg bg-slate-50 border border-slate-200 hover:border-blue-600 text-slate-700 disabled:opacity-40"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </button>

                        <span className="font-mono text-slate-900">
                          {slides.length > 0
                            ? currentSlideIndex + 1
                            : 0}{' '}
                          / {slides.length}
                        </span>

                        <button
                          type="button"
                          onClick={() =>
                            setCurrentSlideIndex(
                              Math.min(
                                slides.length - 1,
                                currentSlideIndex + 1
                              )
                            )
                          }
                          disabled={
                            slides.length === 0 ||
                            currentSlideIndex ===
                              slides.length - 1
                          }
                          className="p-1.5 rounded-lg bg-slate-50 border border-slate-200 hover:border-blue-600 text-slate-700 disabled:opacity-40"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>

                      </div>

                    </div>

                  </>

                ) : (

                  <div className="flex flex-1 items-center justify-center text-sm text-slate-500">
                    Select a presentation.
                  </div>

                )}

              </Card>

            </div>

          </div>
        )}

    </div>
  );
}