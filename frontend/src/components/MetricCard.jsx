// =============================================================================
// components/MetricCard.jsx
// =============================================================================
import React from 'react'
import { TrendingUp } from 'lucide-react'

const colorMap = {
  pink:  { bg: 'bg-pink-50',   icon: 'text-pink-600',   border: 'border-pink-100' },
  slate: { bg: 'bg-slate-100', icon: 'text-slate-600',  border: 'border-slate-200' },
  rose:  { bg: 'bg-rose-50',   icon: 'text-rose-600',   border: 'border-rose-100' },
  gray:  { bg: 'bg-slate-200', icon: 'text-slate-700',  border: 'border-slate-300' },
}

const MetricCard = ({ title, value, icon: Icon, color = 'pink', subtitle }) => {
  const colors = colorMap[color] || colorMap.pink

  return (
    <div className="card animate-slide-up">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
            {title}
          </p>
          <p className="text-3xl font-bold text-slate-800 mt-1 truncate">
            {value}
          </p>
          {subtitle && (
            <p className="text-xs text-slate-500 mt-2 flex items-center gap-1">
              <TrendingUp size={12} className="text-pink-500" />
              {subtitle}
            </p>
          )}
        </div>

        <div className={`flex-shrink-0 w-12 h-12 rounded-2xl ${colors.bg} ${colors.border} border
                         flex items-center justify-center ml-4`}>
          <Icon size={22} className={colors.icon} strokeWidth={2} />
        </div>
      </div>
    </div>
  )
}

export default MetricCard
