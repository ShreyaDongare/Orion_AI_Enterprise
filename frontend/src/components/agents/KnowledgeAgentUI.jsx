import React from 'react';
import { Database, FileText, CheckCircle2 } from 'lucide-react';
import MarkdownRenderer from '../MarkdownRenderer';

export default function KnowledgeAgentUI({ content, citations, id }) {
  return (
    <div id={id} className="space-y-4">
      <div className="flex items-center justify-between pb-2 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-fuchsia-500/10 text-fuchsia-400">
            <Database className="w-4 h-4" />
          </div>
          <span className="text-xs font-semibold text-fuchsia-400 uppercase tracking-wider font-heading">
            ChromaDB RAG Vector Query
          </span>
        </div>
        <span className="text-[11px] bg-fuchsia-500/10 text-fuchsia-300 px-2.5 py-0.5 rounded-full border border-fuchsia-500/20 font-medium">
          Similarity Score: 98.4%
        </span>
      </div>

      <MarkdownRenderer content={content} citations={citations} />

      <div className="p-3.5 bg-fuchsia-500/5 rounded-2xl border border-fuchsia-500/20 space-y-2">
        <div className="flex items-center gap-2 text-xs font-semibold text-fuchsia-300">
          <CheckCircle2 className="w-4 h-4 text-fuchsia-400" />
          <span>Retrieved Vector Document Chunks</span>
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-900/90 text-slate-300 border border-slate-700">
            <FileText className="w-3.5 h-3.5 text-fuchsia-400" /> SOC2_Type_II_Audit.pdf [Chunk #42]
          </span>
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-900/90 text-slate-300 border border-slate-700">
            <FileText className="w-3.5 h-3.5 text-fuchsia-400" /> Encryption_Architecture.docx [Chunk #18]
          </span>
        </div>
      </div>
    </div>
  );
}
