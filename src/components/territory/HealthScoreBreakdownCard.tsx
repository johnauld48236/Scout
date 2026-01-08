'use client'

import { useEffect, useState } from 'react'
import { TrendingUp, TrendingDown, Minus, RefreshCw } from 'lucide-react'

interface HealthScoreBreakdownCardProps {
  accountId: string
  accountType: 'prospect' | 'customer' | null
  npsScore?: number | null
  csatScore?: number | null
}

interface VectorInSignals {
  type: 'vector_in'
  escalation_risks: number
  sentiment_alerts: number
  pattern_warnings: number
}

interface VectorOutSignals {
  type: 'vector_out'
  stalled_deals: number
  missing_champion: number
  inactive_trails: number
}

interface HealthData {
  total_score: number
  health_band: 'healthy' | 'monitor' | 'at_risk' | 'critical'
  profile: 'vector_out' | 'vector_in'
  // Vector Out scores
  engagement_score?: number
  momentum_score?: number
  risk_score?: number
  intelligence_score?: number
  // Vector In scores (mapped from API response)
  sentiment_score?: number
  usage_score?: number
  support_score?: number
  customer_engagement_score?: number
  // Metadata
  calculated_at?: string
  score_inputs?: Record<string, unknown>
  exists?: boolean
  // Signal summary
  signal_summary?: VectorInSignals | VectorOutSignals
}

const HEALTH_BAND_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  healthy: { label: 'Healthy', bg: 'bg-green-100', text: 'text-green-700' },
  monitor: { label: 'Monitor', bg: 'bg-yellow-100', text: 'text-yellow-700' },
  at_risk: { label: 'At Risk', bg: 'bg-orange-100', text: 'text-orange-700' },
  critical: { label: 'Critical', bg: 'bg-red-100', text: 'text-red-700' },
}

function getBarColor(score: number, max: number): string {
  const percentage = (score / max) * 100
  if (percentage >= 80) return 'bg-green-500'
  if (percentage >= 60) return 'bg-yellow-500'
  if (percentage >= 40) return 'bg-orange-500'
  return 'bg-red-500'
}

function formatDetail(type: string, data: HealthData, npsScore?: number | null, csatScore?: number | null): string {
  switch (type) {
    case 'sentiment':
      const nps = npsScore !== null && npsScore !== undefined ? `NPS: ${npsScore > 0 ? '+' : ''}${npsScore}` : 'NPS: --'
      const csat = csatScore !== null && csatScore !== undefined ? `CSAT: ${csatScore}%` : 'CSAT: --'
      return `${nps}, ${csat}`
    case 'usage':
      return 'Placeholder (50%)'
    case 'support':
      const inputs = data.score_inputs as { support?: { critical_overdue?: number; high_overdue?: number } } | undefined
      const critical = inputs?.support?.critical_overdue || 0
      const high = inputs?.support?.high_overdue || 0
      if (critical === 0 && high === 0) return 'No overdue tickets'
      return `${critical} critical, ${high} high overdue`
    case 'customer_engagement':
      const engInputs = data.score_inputs as { engagement?: { days_since_contact?: number } } | undefined
      const days = engInputs?.engagement?.days_since_contact
      return days !== undefined ? `Last contact: ${days} days ago` : 'No contact data'
    case 'engagement':
      const voEngInputs = data.score_inputs as { engagement?: { days_since_contact?: number; contact_count_30d?: number } } | undefined
      const vodays = voEngInputs?.engagement?.days_since_contact
      return vodays !== undefined ? `Last contact: ${vodays} days` : 'No contact data'
    case 'momentum':
      const momInputs = data.score_inputs as { momentum?: { movement?: number } } | undefined
      const movement = momInputs?.momentum?.movement || 0
      return `Stage movement: ${movement > 0 ? '+' : ''}${movement}`
    case 'risk':
      const riskInputs = data.score_inputs as { risk?: { open_risks?: number; critical_risks?: number } } | undefined
      const openRisks = riskInputs?.risk?.open_risks || 0
      return `${openRisks} open risks`
    case 'intelligence':
      const intInputs = data.score_inputs as { intelligence?: { sparks_count?: number; stakeholders_mapped?: number } } | undefined
      const sparks = intInputs?.intelligence?.sparks_count || 0
      const stakeholders = intInputs?.intelligence?.stakeholders_mapped || 0
      return `${sparks} trails, ${stakeholders} stakeholders`
    default:
      return ''
  }
}

export function HealthScoreBreakdownCard({
  accountId,
  accountType,
  npsScore,
  csatScore,
}: HealthScoreBreakdownCardProps) {
  const [healthData, setHealthData] = useState<HealthData | null>(null)
  const [loading, setLoading] = useState(true)
  const [calculating, setCalculating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchHealth = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/accounts/${accountId}/health`)
      if (response.ok) {
        const data = await response.json()
        if (data.exists !== false) {
          setHealthData(data)
        } else {
          setHealthData(null)
        }
      }
    } catch (err) {
      setError('Failed to load health data')
    } finally {
      setLoading(false)
    }
  }

  const calculateHealth = async () => {
    try {
      setCalculating(true)
      const response = await fetch(`/api/accounts/${accountId}/health`, { method: 'POST' })
      if (response.ok) {
        const data = await response.json()
        setHealthData(data)
      }
    } catch (err) {
      setError('Failed to calculate health')
    } finally {
      setCalculating(false)
    }
  }

  useEffect(() => {
    fetchHealth()
  }, [accountId])

  if (loading) {
    return (
      <div
        className="rounded-xl border p-4 mt-4 animate-pulse"
        style={{ backgroundColor: 'var(--scout-white)', borderColor: 'var(--scout-border)' }}
      >
        <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
        <div className="h-20 bg-gray-100 rounded"></div>
      </div>
    )
  }

  if (error || !healthData) {
    // Show placeholder card when no health data
    return (
      <div
        className="rounded-xl border p-4 mt-4"
        style={{ backgroundColor: 'var(--scout-white)', borderColor: 'var(--scout-border)' }}
      >
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold" style={{ color: 'var(--scout-saddle)' }}>
            Account Health
          </span>
          <button
            onClick={calculateHealth}
            disabled={calculating}
            className="text-xs px-3 py-1 rounded-full font-medium flex items-center gap-1.5 transition-colors hover:opacity-80 disabled:opacity-50"
            style={{ backgroundColor: 'var(--scout-trail)', color: 'white' }}
          >
            {calculating ? (
              <>
                <RefreshCw className="w-3 h-3 animate-spin" />
                Calculating...
              </>
            ) : (
              <>
                <RefreshCw className="w-3 h-3" />
                Calculate
              </>
            )}
          </button>
        </div>
        <p className="text-xs mt-2" style={{ color: 'var(--scout-earth-light)' }}>
          Calculate health score based on account activity, risks, and engagement data.
        </p>
      </div>
    )
  }

  const isCustomer = accountType === 'customer' || healthData.profile === 'vector_in'
  const bandConfig = HEALTH_BAND_CONFIG[healthData.health_band] || HEALTH_BAND_CONFIG.monitor

  // Define components based on profile
  const vectorInComponents = [
    { key: 'sentiment', label: 'Sentiment', weight: '40%', score: healthData.sentiment_score || 0, max: 40 },
    { key: 'usage', label: 'Product Usage', weight: '30%', score: healthData.usage_score || 0, max: 30 },
    { key: 'support', label: 'Support Health', weight: '20%', score: healthData.support_score || 0, max: 20 },
    { key: 'customer_engagement', label: 'Engagement', weight: '10%', score: healthData.customer_engagement_score || 0, max: 10 },
  ]

  const vectorOutComponents = [
    { key: 'engagement', label: 'Engagement', weight: '25%', score: healthData.engagement_score || 0, max: 25 },
    { key: 'momentum', label: 'Momentum', weight: '25%', score: healthData.momentum_score || 0, max: 25 },
    { key: 'risk', label: 'Risk Load', weight: '25%', score: healthData.risk_score || 0, max: 25 },
    { key: 'intelligence', label: 'Intelligence', weight: '25%', score: healthData.intelligence_score || 0, max: 25 },
  ]

  const components = isCustomer ? vectorInComponents : vectorOutComponents

  return (
    <div
      className="rounded-xl border p-4 mt-4"
      style={{ backgroundColor: 'var(--scout-white)', borderColor: 'var(--scout-border)' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold" style={{ color: 'var(--scout-saddle)' }}>
            Account Health
          </span>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${bandConfig.bg} ${bandConfig.text}`}>
            {bandConfig.label}
          </span>
        </div>
        <div className="flex items-center gap-3">
          {/* Trend indicator - placeholder for now */}
          <div className="flex items-center gap-1 text-xs" style={{ color: 'var(--scout-earth-light)' }}>
            <Minus className="w-3 h-3" />
            <span>No change</span>
          </div>
          {/* Recalculate button */}
          <button
            onClick={calculateHealth}
            disabled={calculating}
            className="p-1 rounded hover:bg-gray-100 transition-colors disabled:opacity-50"
            title="Recalculate health score"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${calculating ? 'animate-spin' : ''}`} style={{ color: 'var(--scout-earth-light)' }} />
          </button>
        </div>
      </div>

      {/* Main score + breakdown */}
      <div className="flex gap-6">
        {/* Large score circle */}
        <div className="flex-shrink-0">
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center border-4"
            style={{
              borderColor: healthData.total_score >= 80 ? '#22c55e' :
                healthData.total_score >= 60 ? '#eab308' :
                healthData.total_score >= 40 ? '#f97316' : '#ef4444',
            }}
          >
            <span className="text-2xl font-bold" style={{ color: 'var(--scout-saddle)' }}>
              {healthData.total_score}
            </span>
          </div>
          <div className="text-center mt-1 text-[10px]" style={{ color: 'var(--scout-earth-light)' }}>
            / 100
          </div>
        </div>

        {/* Component breakdown */}
        <div className="flex-1 space-y-2">
          {components.map((comp) => (
            <div key={comp.key} className="flex items-center gap-2">
              <div className="w-24 text-xs font-medium truncate" style={{ color: 'var(--scout-earth)' }}>
                {comp.label}
              </div>
              <div className="w-10 text-[10px] text-right" style={{ color: 'var(--scout-earth-light)' }}>
                {comp.weight}
              </div>
              <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${getBarColor(comp.score, comp.max)}`}
                  style={{ width: `${(comp.score / comp.max) * 100}%` }}
                />
              </div>
              <div className="w-10 text-xs text-right" style={{ color: 'var(--scout-earth)' }}>
                {comp.score}/{comp.max}
              </div>
              <div
                className="w-32 text-[10px] truncate"
                style={{ color: 'var(--scout-earth-light)' }}
                title={formatDetail(comp.key, healthData, npsScore, csatScore)}
              >
                {formatDetail(comp.key, healthData, npsScore, csatScore)}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Signal Summary Row */}
      {healthData.signal_summary && (
        <div
          className="mt-3 pt-3 border-t flex flex-wrap gap-3"
          style={{ borderColor: 'var(--scout-border)' }}
        >
          {healthData.signal_summary.type === 'vector_in' ? (
            // Customer distress signals
            <>
              {healthData.signal_summary.escalation_risks > 0 && (
                <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-red-50 text-red-700">
                  <span>🚨</span>
                  <span>{healthData.signal_summary.escalation_risks} escalation{healthData.signal_summary.escalation_risks !== 1 ? 's' : ''}</span>
                </span>
              )}
              {healthData.signal_summary.sentiment_alerts > 0 && (
                <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-orange-50 text-orange-700">
                  <span>😤</span>
                  <span>{healthData.signal_summary.sentiment_alerts} sentiment</span>
                </span>
              )}
              {healthData.signal_summary.pattern_warnings > 0 && (
                <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-yellow-50 text-yellow-700">
                  <span>🔄</span>
                  <span>{healthData.signal_summary.pattern_warnings} pattern{healthData.signal_summary.pattern_warnings !== 1 ? 's' : ''}</span>
                </span>
              )}
              {healthData.signal_summary.escalation_risks === 0 &&
               healthData.signal_summary.sentiment_alerts === 0 &&
               healthData.signal_summary.pattern_warnings === 0 && (
                <span className="text-xs" style={{ color: 'var(--scout-trail)' }}>
                  ✓ No distress signals
                </span>
              )}
            </>
          ) : (
            // Prospect sales signals
            <>
              {healthData.signal_summary.stalled_deals > 0 && (
                <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-orange-50 text-orange-700">
                  <span>⏸️</span>
                  <span>{healthData.signal_summary.stalled_deals} stalled</span>
                </span>
              )}
              {healthData.signal_summary.missing_champion > 0 && (
                <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-yellow-50 text-yellow-700">
                  <span>👤</span>
                  <span>No champion</span>
                </span>
              )}
              {healthData.signal_summary.inactive_trails > 0 && (
                <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-blue-50 text-blue-700">
                  <span>🔍</span>
                  <span>{healthData.signal_summary.inactive_trails} inactive trail{healthData.signal_summary.inactive_trails !== 1 ? 's' : ''}</span>
                </span>
              )}
              {healthData.signal_summary.stalled_deals === 0 &&
               healthData.signal_summary.missing_champion === 0 &&
               healthData.signal_summary.inactive_trails === 0 && (
                <span className="text-xs" style={{ color: 'var(--scout-trail)' }}>
                  ✓ No warning signals
                </span>
              )}
            </>
          )}
        </div>
      )}

      {/* Footer - last calculated */}
      {healthData.calculated_at && (
        <div className="mt-3 pt-3 border-t text-[10px]" style={{ borderColor: 'var(--scout-border)', color: 'var(--scout-earth-light)' }}>
          Last calculated: {new Date(healthData.calculated_at).toLocaleDateString()} at{' '}
          {new Date(healthData.calculated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
      )}
    </div>
  )
}
