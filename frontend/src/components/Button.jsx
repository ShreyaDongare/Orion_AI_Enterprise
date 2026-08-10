import React from 'react';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';

export default function Button({
  children,
  variant = 'primary', // primary | secondary | outline | ghost | danger | blue | clay | glass
  size = 'md', // sm | md | lg
  isLoading = false,
  loading = false,
  isDisabled = false,
  disabled = false,
  icon: Icon,
  iconPosition = 'left',
  onClick,
  type = 'button',
  className = '',
  id,
  ...props
}) {
  const showLoading = Boolean(isLoading || loading);
  const showDisabled = Boolean(isDisabled || disabled || showLoading);

  const sizeClasses = {
    sm: 'px-3 py-1.5 text-xs rounded-lg gap-1.5 font-medium',
    md: 'px-4 py-2 text-xs font-medium rounded-xl gap-2',
    lg: 'px-5 py-2.5 text-sm font-semibold rounded-xl gap-2',
  };

  const variantClasses = {
    primary: 'bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-xs transition-colors',
    blue: 'bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-xs transition-colors',
    secondary: 'bg-slate-100 hover:bg-slate-200 text-slate-900 border border-slate-200 font-medium transition-colors',
    clay: 'bg-slate-100 hover:bg-slate-200 text-slate-900 border border-slate-200 font-medium transition-colors',
    glass: 'bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 shadow-xs font-medium transition-colors',
    outline: 'bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 shadow-xs font-medium transition-colors',
    danger: 'bg-red-600 hover:bg-red-700 text-white font-medium shadow-xs transition-colors',
    ghost: 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 font-medium transition-colors',
  };

  return (
    <motion.button
      id={id}
      type={type}
      whileTap={{ scale: showDisabled ? 1 : 0.98 }}
      disabled={showDisabled}
      onClick={onClick}
      className={`inline-flex items-center justify-center transition-all duration-150 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed select-none ${sizeClasses[size]} ${variantClasses[variant] || variantClasses.primary} ${className}`}
      {...props}
    >
      {showLoading ? (
        <Loader2 className="w-3 h-3 animate-spin text-current" />
      ) : (
        <>
          {Icon && iconPosition === 'left' && <Icon className="w-3.5 h-3.5 shrink-0" />}
          <span>{children}</span>
          {Icon && iconPosition === 'right' && <Icon className="w-3.5 h-3.5 shrink-0" />}
        </>
      )}
    </motion.button>
  );
}


