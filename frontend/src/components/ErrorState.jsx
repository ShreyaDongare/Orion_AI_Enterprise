import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import Button from './Button';

export default function ErrorState({
  title = 'Something went wrong',
  description = 'Failed to load enterprise data from backend API.',
  onRetry,
  id,
}) {
  return (
    <div id={id} className="flex flex-col items-center justify-center p-8 text-center glass-panel rounded-3xl border border-rose-500/30 my-4 space-y-3 bg-rose-500/5">
      <div className="p-3 rounded-2xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
        <AlertTriangle className="w-6 h-6" />
      </div>
      <div className="max-w-md space-y-1">
        <h4 className="text-base font-semibold text-slate-100 font-heading">{title}</h4>
        <p className="text-xs text-slate-400">{description}</p>
      </div>
      {onRetry && (
        <Button variant="secondary" size="sm" icon={RefreshCw} onClick={onRetry}>
          Try Again
        </Button>
      )}
    </div>
  );
}
