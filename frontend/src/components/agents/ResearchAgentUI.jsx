import React from 'react';
import { Globe, ExternalLink, ShieldCheck, Search } from 'lucide-react';
import MarkdownRenderer from '../MarkdownRenderer';

export default function ResearchAgentUI({ content, citations, id }) {
  return (
    <div id={id} className="space-y-4">
      <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
        <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
          <Globe className="w-4 h-4" />
        </div>
        <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider font-heading">
          Research Intelligence Output
        </span>
        <span className="ml-auto flex items-center gap-1 text-[11px] text-slate-400 bg-slate-900 px-2 py-0.5 rounded-full border border-slate-800">
          <ShieldCheck className="w-3 h-3 text-emerald-400" /> Web Verified
        </span>
      </div>

      <MarkdownRenderer content={content} citations={citations} />

      {citations && citations.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          {citations.map((cite, index) => (
            <a
              key={index}
              href={cite.url || '#'}
              target="_blank"
              rel="noreferrer"
              className="glass-panel p-3 rounded-2xl hover:border-emerald-500/40 transition-all flex items-start justify-between group"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-[11px] text-emerald-400 font-medium">
                  <Search className="w-3 h-3" /> Source Citation #{index + 1}
                </div>
                <p className="text-xs font-semibold text-slate-200 group-hover:text-emerald-300 transition-colors line-clamp-1">
                  {cite.title}
                </p>
              </div>
              <ExternalLink className="w-4 h-4 text-slate-400 group-hover:text-emerald-400 shrink-0 mt-0.5" />
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
