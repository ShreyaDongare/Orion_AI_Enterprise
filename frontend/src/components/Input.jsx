import React, { forwardRef } from 'react';

export const Input = forwardRef(({
  label,
  error,
  icon: Icon,
  type = 'text',
  className = '',
  id,
  ...props
}, ref) => {
  return (
    <div className="w-full space-y-1.5">
      {label && (
        <label htmlFor={id} className="block text-xs font-semibold text-slate-700">
          {label}
        </label>
      )}
      <div className="relative flex items-center">
        {Icon && (
          <div className="absolute left-3.5 text-slate-400 pointer-events-none">
            <Icon className="w-4 h-4" />
          </div>
        )}
        <input
          id={id}
          ref={ref}
          type={type}
          className={`w-full bg-white text-slate-900 placeholder-slate-400 text-xs font-medium rounded-xl border border-slate-200 focus:border-blue-600 focus:ring-2 focus:ring-blue-500/15 outline-none transition-all duration-150 ${
            Icon ? 'pl-10' : 'pl-3.5'
          } pr-3.5 py-2.5 ${error ? 'border-red-500 focus:border-red-500 focus:ring-red-500/15' : ''} ${className}`}
          {...props}
        />
      </div>
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </div>
  );
});

Input.displayName = 'Input';

export const Textarea = forwardRef(({
  label,
  error,
  rows = 4,
  className = '',
  id,
  ...props
}, ref) => {
  return (
    <div className="w-full space-y-1.5">
      {label && (
        <label htmlFor={id} className="block text-xs font-semibold text-slate-700">
          {label}
        </label>
      )}
      <textarea
        id={id}
        ref={ref}
        rows={rows}
        className={`w-full bg-white text-slate-900 placeholder-slate-400 text-xs font-medium rounded-xl border border-slate-200 focus:border-blue-600 focus:ring-2 focus:ring-blue-500/15 outline-none transition-all duration-150 p-3 resize-none ${
          error ? 'border-red-500 focus:border-red-500 focus:ring-red-500/15' : ''
        } ${className}`}
        {...props}
      />
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </div>
  );
});

Textarea.displayName = 'Textarea';


