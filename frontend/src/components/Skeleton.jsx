import React from 'react';

export default function Skeleton({ className = '', id }) {
  return (
    <div
      id={id}
      className={`animate-pulse bg-slate-800/80 rounded-2xl border border-slate-700/50 ${className}`}
    />
  );
}
