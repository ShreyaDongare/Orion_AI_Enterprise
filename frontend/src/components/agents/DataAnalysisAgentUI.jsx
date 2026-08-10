import React from 'react';
import { BarChart3, TrendingUp } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import MarkdownRenderer from '../MarkdownRenderer';

export default function DataAnalysisAgentUI({ content, dataChart, id }) {
  return (
    <div id={id} className="space-y-4">
      <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
        <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400">
          <BarChart3 className="w-4 h-4" />
        </div>
        <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider font-heading">
          Data Statistical Analysis Engine
        </span>
      </div>

      <MarkdownRenderer content={content} />

      {dataChart && dataChart.data && (
        <div className="p-4 rounded-3xl glass-panel border border-amber-500/20 space-y-3 bg-slate-950/60">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-slate-200 font-heading flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-amber-400" />
              {dataChart.title || 'Data Trend Visualization'}
            </h4>
            <span className="text-[10px] text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
              Interactive Chart
            </span>
          </div>

          <div className="h-64 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dataChart.data}>
                <XAxis dataKey="quarter" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#334155',
                    borderRadius: '12px',
                    fontSize: '12px',
                    color: '#f8fafc',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                <Bar dataKey="Enterprise" fill="#6366f1" radius={[6, 6, 0, 0]} />
                <Bar dataKey="MidMarket" fill="#a855f7" radius={[6, 6, 0, 0]} />
                <Bar dataKey="SMB" fill="#06b6d4" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
