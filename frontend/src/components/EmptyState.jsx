import React from 'react';
import { FolderOpen } from 'lucide-react';
import Button from './Button';

export default function EmptyState({
  title = 'No records found',
  description = 'There are no items matching your criteria in this view.',
  icon: Icon = FolderOpen,
  actionLabel,
  onAction,
  id,
}) {
  return (
    <div id={id} className="flex flex-col items-center justify-center p-12 text-center glass-panel rounded-3xl border border-slate-800 my-4 space-y-4">
      <div className="p-4 rounded-3xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 shadow-inner">
        <Icon className="w-8 h-8" />
      </div>
      <div className="max-w-md space-y-1">
        <h4 className="text-base font-semibold text-slate-100 font-heading">{title}</h4>
        <p className="text-xs text-slate-400 leading-relaxed">{description}</p>
      </div>
      {actionLabel && onAction && (
        <Button variant="primary" size="sm" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
