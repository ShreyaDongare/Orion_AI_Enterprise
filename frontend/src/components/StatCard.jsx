import React from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown } from 'lucide-react';

export default function StatCard({
  title,
  value,
  change,
  isPositive = true,
  icon: Icon,
  description,
  id,
}) {
  return (
    <motion.div
      id={id}
      whileHover={{ y: -2 }}
      className="p-5 rounded-xl bg-white border border-slate-200 shadow-xs transition-all hover:border-slate-300 hover:shadow-sm"
    >
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 font-heading">
          {title}
        </span>
        {Icon && (
          <div className="p-2 rounded-lg bg-blue-50 text-blue-600 border border-blue-100">
            <Icon className="w-4 h-4" />
          </div>
        )}
      </div>

      <div className="mt-3 flex items-baseline justify-between">
        <h3 className="text-2xl font-bold text-slate-900 font-heading tracking-tight">{value}</h3>
        {change && (
          <div
            className={`flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md border ${
              isPositive
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-rose-50 text-rose-700 border-rose-200'
            }`}
          >
            {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            <span>{change}</span>
          </div>
        )}
      </div>

      {description && <p className="text-xs text-slate-500 mt-1.5 leading-normal">{description}</p>}
    </motion.div>
  );
}


