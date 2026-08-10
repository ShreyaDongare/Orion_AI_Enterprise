import React from 'react';
import { Briefcase, CheckSquare, Clock } from 'lucide-react';
import MarkdownRenderer from '../MarkdownRenderer';

export default function ExecutiveAgentUI({ content, id }) {
  return (
    <div id={id} className="space-y-4">
      <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
        <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400">
          <Briefcase className="w-4 h-4" />
        </div>
        <span className="text-xs font-semibold text-blue-400 uppercase tracking-wider font-heading">
          Executive Assistant Planning & Briefing
        </span>
      </div>

      <MarkdownRenderer content={content} />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
        <div className="p-4 rounded-2xl glass-panel border border-blue-500/20 space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-blue-400">
            <CheckSquare className="w-4 h-4" /> Priority Directives
          </div>
          <ul className="text-xs text-slate-300 space-y-1.5 list-disc list-inside">
            <li>Review Q3 EMEA Expansion budget matrix</li>
            <li>Approve SOC2 compliance audit documentation</li>
            <li>Finalize C-Suite board pitch presentation</li>
          </ul>
        </div>

        <div className="p-4 rounded-2xl glass-panel border border-indigo-500/20 space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-indigo-400">
            <Clock className="w-4 h-4" /> Operational Schedule
          </div>
          <ul className="text-xs text-slate-300 space-y-1.5">
            <li className="flex justify-between"><span>09:00 AM</span> <span className="text-slate-400">Executive Briefing</span></li>
            <li className="flex justify-between"><span>11:30 AM</span> <span className="text-slate-400">RAG Vector Audit</span></li>
            <li className="flex justify-between"><span>02:00 PM</span> <span className="text-slate-400">Product Strategy Review</span></li>
          </ul>
        </div>
      </div>
    </div>
  );
}
