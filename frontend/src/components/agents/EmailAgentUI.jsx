import React, { useState } from 'react';
import { Mail, Copy, Check } from 'lucide-react';
import Button from '../Button';
import toast from 'react-hot-toast';

export default function EmailAgentUI({ content, id }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    toast.success('Email draft copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div id={id} className="space-y-4">
      <div className="flex items-center justify-between pb-2 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400">
            <Mail className="w-4 h-4" />
          </div>
          <span className="text-xs font-semibold text-cyan-400 uppercase tracking-wider font-heading">
            Corporate Email Draft Specialist
          </span>
        </div>
        <Button variant="clay" size="sm" icon={copied ? Check : Copy} onClick={handleCopy}>
          {copied ? 'Copied' : 'Copy Email'}
        </Button>
      </div>

      <div className="p-5 rounded-3xl glass-panel border border-cyan-500/20 font-mono text-xs leading-relaxed text-slate-200 whitespace-pre-wrap bg-slate-950/80">
        {content}
      </div>
    </div>
  );
}
