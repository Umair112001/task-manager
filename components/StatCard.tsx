'use client'

import { ReactNode } from 'react'

interface StatCardProps {
  title: string
  value: string | number
  unit?: string
  icon?: ReactNode
  percentage?: number
  trend?: 'up' | 'down' | 'stable'
  className?: string
}

export function StatCard({
  title,
  value,
  unit,
  icon,
  percentage,
  trend,
  className = '',
}: StatCardProps) {
  const getPercentageColor = (pct: number) => {
    if (pct < 30) return 'text-green-400'
    if (pct < 60) return 'text-yellow-400'
    return 'text-red-400'
  }

  return (
    <div className={`bg-card border border-border rounded-lg p-6 ${className}`}>
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-muted-foreground text-sm font-medium">{title}</p>
        </div>
        {icon && <div className="text-accent">{icon}</div>}
      </div>

      <div className="mb-2">
        <div className="text-3xl font-bold text-foreground">
          {typeof value === 'number' ? value.toFixed(1) : value}
        </div>
        {unit && <span className="text-muted-foreground text-sm ml-1">{unit}</span>}
      </div>

      {percentage !== undefined && (
        <div className="flex items-center gap-2">
          <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-accent transition-all"
              style={{ width: `${Math.min(percentage, 100)}%` }}
            />
          </div>
          <span className={`text-sm font-medium ${getPercentageColor(percentage)}`}>
            {percentage.toFixed(1)}%
          </span>
        </div>
      )}

      {trend && (
        <div className="mt-2 text-xs text-muted-foreground">
          {trend === 'up' && '↑ Increasing'}
          {trend === 'down' && '↓ Decreasing'}
          {trend === 'stable' && '→ Stable'}
        </div>
      )}
    </div>
  )
}
