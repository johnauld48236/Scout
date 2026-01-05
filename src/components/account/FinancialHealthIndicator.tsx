'use client'

import { useState } from 'react'

interface FinancialSignal {
  signal_id: string
  title?: string
  summary: string
  sentiment_score?: number
  signal_date: string
  source?: string
}

interface FinancialHealthIndicatorProps {
  signals: FinancialSignal[]
  className?: string
}

type HealthStatus = 'strong' | 'stable' | 'caution' | 'unknown'

export function FinancialHealthIndicator({ signals, className = '' }: FinancialHealthIndicatorProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  // Calculate health status from signals
  const calculateHealth = (): { status: HealthStatus; trend: 'up' | 'down' | 'flat'; score: number } => {
    if (signals.length === 0) {
      return { status: 'unknown', trend: 'flat', score: 0 }
    }

    // Calculate average sentiment from signals with scores
    const scoredSignals = signals.filter(s => s.sentiment_score !== null && s.sentiment_score !== undefined)
    if (scoredSignals.length === 0) {
      // No scored signals, use count-based heuristic
      return { status: 'stable', trend: 'flat', score: 0 }
    }

    const avgScore = scoredSignals.reduce((sum, s) => sum + (s.sentiment_score || 0), 0) / scoredSignals.length

    // Determine status
    let status: HealthStatus
    if (avgScore >= 0.3) status = 'strong'
    else if (avgScore >= -0.2) status = 'stable'
    else status = 'caution'

    // Calculate trend from recent vs older signals
    const sortedSignals = [...scoredSignals].sort((a, b) =>
      new Date(b.signal_date).getTime() - new Date(a.signal_date).getTime()
    )

    let trend: 'up' | 'down' | 'flat' = 'flat'
    if (sortedSignals.length >= 2) {
      const recentAvg = sortedSignals.slice(0, Math.ceil(sortedSignals.length / 2))
        .reduce((sum, s) => sum + (s.sentiment_score || 0), 0) / Math.ceil(sortedSignals.length / 2)
      const olderAvg = sortedSignals.slice(Math.ceil(sortedSignals.length / 2))
        .reduce((sum, s) => sum + (s.sentiment_score || 0), 0) / Math.floor(sortedSignals.length / 2)

      if (recentAvg - olderAvg > 0.15) trend = 'up'
      else if (recentAvg - olderAvg < -0.15) trend = 'down'
    }

    return { status, trend, score: avgScore }
  }

  const { status, trend, score } = calculateHealth()

  if (status === 'unknown') {
    return null // Don't show if no financial data
  }

  const getStatusColor = () => {
    switch (status) {
      case 'strong': return { bg: 'rgba(93, 122, 93, 0.15)', text: 'var(--scout-trail)', icon: '#5d7a5d' }
      case 'stable': return { bg: 'rgba(56, 152, 199, 0.15)', text: 'var(--scout-sky)', icon: '#3898c7' }
      case 'caution': return { bg: 'rgba(210, 105, 30, 0.15)', text: 'var(--scout-sunset)', icon: '#d2691e' }
      default: return { bg: 'var(--scout-parchment)', text: 'var(--scout-earth-light)', icon: '#8b7355' }
    }
  }

  const colors = getStatusColor()

  const getTrendIcon = () => {
    switch (trend) {
      case 'up': return '↑'
      case 'down': return '↓'
      default: return '→'
    }
  }

  const getStatusLabel = () => {
    switch (status) {
      case 'strong': return 'Strong'
      case 'stable': return 'Stable'
      case 'caution': return 'Caution'
      default: return 'Unknown'
    }
  }

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium transition-all hover:opacity-80"
        style={{ backgroundColor: colors.bg, color: colors.text }}
        title={`Financial Health: ${getStatusLabel()} (${signals.length} signals)`}
      >
        {/* Pulse indicator */}
        <span
          className="w-2 h-2 rounded-full animate-pulse"
          style={{ backgroundColor: colors.icon }}
        />
        <span>{getStatusLabel()}</span>
        <span className="opacity-70">{getTrendIcon()}</span>
      </button>

      {/* Expanded Panel */}
      {isExpanded && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsExpanded(false)}
          />
          <div
            className="absolute top-full left-0 mt-2 w-72 rounded-lg shadow-xl border z-50 p-3"
            style={{ backgroundColor: 'var(--scout-white)', borderColor: 'var(--scout-border)' }}
          >
            <div className="flex items-center justify-between mb-3">
              <h4
                className="text-sm font-semibold"
                style={{ color: 'var(--scout-saddle)', fontFamily: "'Bitter', Georgia, serif" }}
              >
                Financial Health
              </h4>
              <span
                className="text-xs px-2 py-0.5 rounded-full"
                style={{ backgroundColor: colors.bg, color: colors.text }}
              >
                {getStatusLabel()} {getTrendIcon()}
              </span>
            </div>

            {/* Score Bar */}
            <div className="mb-3">
              <div className="flex justify-between text-[10px] mb-1" style={{ color: 'var(--scout-earth-light)' }}>
                <span>Caution</span>
                <span>Strong</span>
              </div>
              <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--scout-border)' }}>
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${Math.max(0, Math.min(100, (score + 1) * 50))}%`,
                    backgroundColor: colors.icon,
                  }}
                />
              </div>
            </div>

            {/* Recent Signals */}
            <div className="space-y-2 max-h-48 overflow-y-auto">
              <p className="text-[10px] font-medium uppercase tracking-wide" style={{ color: 'var(--scout-earth-light)' }}>
                Recent Signals ({signals.length})
              </p>
              {signals.slice(0, 5).map(signal => (
                <div
                  key={signal.signal_id}
                  className="p-2 rounded text-xs"
                  style={{ backgroundColor: 'var(--scout-parchment)' }}
                >
                  <div className="flex items-start gap-2">
                    {signal.sentiment_score !== null && signal.sentiment_score !== undefined && (
                      <span
                        className="mt-0.5 w-1.5 h-1.5 rounded-full flex-shrink-0"
                        style={{
                          backgroundColor: signal.sentiment_score > 0.2
                            ? 'var(--scout-trail)'
                            : signal.sentiment_score < -0.2
                            ? 'var(--scout-clay)'
                            : 'var(--scout-sunset)'
                        }}
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="truncate" style={{ color: 'var(--scout-earth)' }}>
                        {signal.title || signal.summary.slice(0, 60)}
                      </p>
                      <p className="text-[10px] mt-0.5" style={{ color: 'var(--scout-earth-light)' }}>
                        {new Date(signal.signal_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        {signal.source && ` · ${signal.source}`}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {signals.length > 5 && (
              <p className="text-[10px] text-center mt-2" style={{ color: 'var(--scout-earth-light)' }}>
                +{signals.length - 5} more signals
              </p>
            )}
          </div>
        </>
      )}
    </div>
  )
}
