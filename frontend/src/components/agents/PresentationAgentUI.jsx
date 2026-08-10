import React, { useState } from 'react';
import { Presentation, Download, ChevronLeft, ChevronRight } from 'lucide-react';
import Button from '../Button';
import { presentationService } from '../../services/presentationService';
import toast from 'react-hot-toast';

export default function PresentationAgentUI({ content, slides, id }) {
  const [activeSlide, setActiveSlide] = useState(0);
  const [downloading, setDownloading] = useState(false);

  const slideList = slides || [
    { number: 1, title: 'Executive Strategy Overview', points: ['Unified AI Multi-Agent Workspace', 'RAG Vector Database Integration', 'SOC-2 Type II Compliance'] },
    { number: 2, title: 'Market Positioning', points: ['Enterprise Market Demand', 'Zero-Downtime Gemini Key Management', 'Scalable Flask REST Architecture'] },
    { number: 3, title: 'Financial ROI Projection', points: ['38.4% Operational Efficiency Gain', '1,420 Hours Saved Annually', 'Sub-second Intent Routing'] }
  ];

  const handleDownload = async () => {
    setDownloading(true);
    await presentationService.downloadPresentation('generated_presentation');
    toast.success('Slide deck exported to PowerPoint (.pptx)!');
    setDownloading(false);
  };

  return (
    <div id={id} className="space-y-4">
      <div className="flex items-center justify-between pb-2 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400">
            <Presentation className="w-4 h-4" />
          </div>
          <span className="text-xs font-semibold text-rose-400 uppercase tracking-wider font-heading">
            Slide Deck Architect
          </span>
        </div>
        <Button variant="clay" size="sm" icon={Download} isLoading={downloading} onClick={handleDownload}>
          Download PPTX
        </Button>
      </div>

      <p className="text-sm text-slate-300">{content}</p>

      {/* Slide Deck Interactive Previewer */}
      <div className="rounded-3xl glass-panel p-6 border border-rose-500/30 space-y-4 bg-gradient-to-br from-slate-900 to-slate-950">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <span className="text-xs font-bold text-rose-400 uppercase tracking-widest">
            Slide {activeSlide + 1} of {slideList.length}
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={activeSlide === 0}
              onClick={() => setActiveSlide((prev) => Math.max(0, prev - 1))}
              className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 transition-colors text-slate-200"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              disabled={activeSlide === slideList.length - 1}
              onClick={() => setActiveSlide((prev) => Math.min(slideList.length - 1, prev + 1))}
              className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 transition-colors text-slate-200"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="py-6 px-4 space-y-4 text-center sm:text-left min-h-[160px] flex flex-col justify-center">
          <h3 className="text-xl font-bold text-slate-100 font-heading">
            {slideList[activeSlide]?.title}
          </h3>
          <ul className="space-y-2 text-sm text-slate-300 list-disc list-inside">
            {slideList[activeSlide]?.points?.map((pt, i) => (
              <li key={i} className="leading-relaxed">{pt}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
