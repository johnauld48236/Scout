'use client'

interface KPI {
  label: string
  value: number | string
  format: 'currency' | 'percentage' | 'number'
  trend?: 'up' | 'down' | 'neutral'
  trendValue?: number | string
  target?: number
}

interface DashboardKPIsProps {
  kpis: KPI[]
  title?: string
  compact?: boolean
}

export function DashboardKPIs({ kpis, title, compact = false }: DashboardKPIsProps) {
  const formatValue = (value: number | string, format: 'currency' | 'percentage' | 'number') => {
    if (typeof value === 'string') return value
    switch (format) {
      case 'currency':
        if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`
        if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`
        return `$${value.toLocaleString()}`
      case 'percentage':
        return `${value.toFixed(1)}%`
      case 'number':
        return value.toLocaleString()
      default:
        return String(value)
    }
  }

  const getTrendColor = (trend?: 'up' | 'down' | 'neutral') => {
    switch (trend) {
      case 'up': return 'var(--status-success)'
      case 'down': return 'var(--status-danger)'
      default: return 'var(--text-tertiary)'
    }
  }

  if (compact) {
    return (
      <div className="flex flex-wrap gap-4">
        {kpis.map((kpi, index) => (
          <div
            key={index}
            className="flex items-center gap-3 px-4 py-2 rounded-lg"
            style={{ backgroundColor: 'var(--bg-tertiary)' }}
          >
            <div>
              <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{kpi.label}</p>
              <p className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
                {formatValue(kpi.value, kpi.format)}
              </p>
            </div>
            {kpi.trend && kpi.trendValue !== undefined && (
              <div
                className="flex items-center gap-1 text-xs font-medium"
                style={{ color: getTrendColor(kpi.trend) }}
              >
                {kpi.trend === 'up' ? '↑' : kpi.trend === 'down' ? '↓' : '→'}
                {typeof kpi.trendValue === 'number' ? `${kpi.trendValue}%` : kpi.trendValue}
              </div>
            )}
          </div>
        ))}
      </div>
    )
  }

  return (
    <div
      className="rounded-lg border p-4"
      style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-primary)' }}
    >
      {title && (
        <h3
          className="text-sm font-semibold mb-4"
          style={{ color: 'var(--text-primary)' }}
        >
          {title}
        </h3>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {kpis.map((kpi, index) => (
          <div key={index} className="text-center">
            <p className="text-xs mb-1" style={{ color: 'var(--text-tertiary)' }}>
              {kpi.label}
            </p>
            <p className="text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>
              {formatValue(kpi.value, kpi.format)}
            </p>

            {kpi.trend && (
              <div
                className="flex items-center justify-center gap-1 mt-1 text-xs font-medium"
                style={{ color: getTrendColor(kpi.trend) }}
              >
                {kpi.trend === 'up' ? '↑' : kpi.trend === 'down' ? '↓' : '→'}
                {kpi.trendValue !== undefined && (
                  <span>
                    {typeof kpi.trendValue === 'number'
                      ? `${kpi.trendValue > 0 ? '+' : ''}${kpi.trendValue}%`
                      : kpi.trendValue}
                  </span>
                )}
              </div>
            )}

            {kpi.target !== undefined && typeof kpi.value === 'number' && (
              <div className="mt-2">
                <div
                  className="h-1.5 rounded-full overflow-hidden"
                  style={{ backgroundColor: 'var(--bg-tertiary)' }}
                >
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${Math.min(100, (kpi.value / kpi.target) * 100)}%`,
                      backgroundColor: kpi.value >= kpi.target ? 'var(--status-success)' : 'var(--accent-primary)',
                    }}
                  />
                </div>
                <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                  {Math.round((kpi.value / kpi.target) * 100)}% of {formatValue(kpi.target, kpi.format)}
                </p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
