import React from 'react';
import { motion } from 'framer-motion';

export default function Card({
  children,
  variant = 'flat', // flat | border | shadow
  hoverable = false,
  hover = false,
  className = '',
  id,
  onClick,
  ...props
}) {
  const isHoverable = Boolean(hoverable || hover);
  const variantStyles = {
    flat: 'bg-white border border-slate-200 p-5 rounded-xl shadow-xs transition-all duration-150',
    border: 'bg-white border border-slate-200 p-5 rounded-xl transition-all duration-150',
    shadow: 'bg-white border border-slate-200 p-5 rounded-xl shadow-sm transition-all duration-150',
    clay: 'bg-white border border-slate-200 p-5 rounded-xl shadow-xs transition-all duration-150',
    glass: 'bg-white border border-slate-200 p-5 rounded-xl shadow-xs transition-all duration-150',
  };

  return (
    <motion.div
      id={id}
      onClick={onClick}
      whileHover={isHoverable ? { y: -2, transition: { duration: 0.15 } } : {}}
      className={`${variantStyles[variant] || variantStyles.flat} ${
        isHoverable ? 'cursor-pointer hover:border-slate-300 hover:shadow-md' : ''
      } ${className}`}
      {...props}
    >
      {children}
    </motion.div>
  );
}


