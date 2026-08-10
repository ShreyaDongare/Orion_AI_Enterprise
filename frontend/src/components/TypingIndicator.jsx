import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';

export default function TypingIndicator({ agentName = 'AI Agent', id }) {
  return (
    <div id={id} className="flex items-center gap-3 p-3.5 glass-panel rounded-2xl max-w-xs border border-indigo-500/20 shadow-lg">
      <div className="p-1.5 rounded-xl bg-indigo-500/10 text-indigo-400">
        <Sparkles className="w-4 h-4 animate-spin" />
      </div>
      <div className="flex items-center gap-1.5">
        <span className="text-xs font-medium text-slate-300">{agentName} is thinking</span>
        <div className="flex items-center gap-1 ml-1">
          {[0, 1, 2].map((i) => (
            <motion.span
              key={i}
              animate={{ y: [0, -4, 0] }}
              transition={{
                duration: 0.6,
                repeat: Infinity,
                delay: i * 0.15,
              }}
              className="w-1.5 h-1.5 rounded-full bg-indigo-400"
            />
          ))}
        </div>
      </div>
    </div>
  );
}
