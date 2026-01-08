'use client'

import Link from 'next/link'
import { DataAnnotation } from './DataAnnotation'

interface Pursuit {
  pursuit_id: string
  name: string
  stage: string
  estimated_value: number
  target_close_date: string | null
  deal_type: string | null
}

interface Spark {
  spark_id: string
  title: string
  linked_pursuit_id: string | null
  converted_to_pursuit_id: string | null
}

interface PrototypeHealthBannerProps {
  accountId: string  // Account plan ID for API calls
  account: {
    company_name: string
    vertical: string
    headquarters: string
    annual_revenue?: string
    is_favorite: boolean
    in_weekly_review: boolean
  }
  health: {
    status: 'healthy' | 'at_risk' | 'critical'
    reason: string
  }
  signals: Array<{ title: string; type: string }>
  pursuits: Pursuit[]
  sparks: Spark[]
  vectorOutPipeline: number
  vectorInP1Count: number
  // Action handlers
  onFavoriteToggle?: () => void
  onWeeklyReviewToggle?: () => void
  onRefreshIntelligence?: () => void
}

function formatCurrency(value: number): string {
  if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`
  if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`
  return `$${value.toLocaleString()}`
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
}

export function PrototypeHealthBanner({
  accountId,
  account,
  health,
  signals,
  pursuits,
  sparks,
  vectorOutPipeline,
  vectorInP1Count,
  onFavoriteToggle,
  onWeeklyReviewToggle,
  onRefreshIntelligence,
}: PrototypeHealthBannerProps) {
  const getHealthColor = (status: string) => {
    switch (status) {
      case 'healthy': return { bg: 'rgba(93, 122, 93, 0.15)', text: 'var(--scout-trail)', icon: '🟢' }
      case 'at_risk': return { bg: 'rgba(210, 105, 30, 0.15)', text: 'var(--scout-sunset)', icon: '🟡' }
      case 'critical': return { bg: 'rgba(169, 68, 66, 0.15)', text: 'var(--scout-clay)', icon: '🔴' }
      default: return { bg: 'var(--scout-parchment)', text: 'var(--scout-earth)', icon: '⚪' }
    }
  }

  const healthStyle = getHealthColor(health.status)

  // Check if a pursuit has a linked spark
  const getPursuitSpark = (pursuitId: string): Spark | undefined => {
    return sparks.find(s => s.linked_pursuit_id === pursuitId || s.converted_to_pursuit_id === pursuitId)
  }

  // Filter active deals (not Closed Won/Lost)
  const activeDeals = pursuits.filter(p =>
    p.stage !== 'Closed Won' && p.stage !== 'Closed_Won' &&
    p.stage !== 'Closed Lost' && p.stage !== 'Closed_Lost'
  )

  return (
    <div
      className="rounded-xl border p-4 mb-6"
      style={{ backgroundColor: 'var(--scout-white)', borderColor: 'var(--scout-border)' }}
    >
      {/* Row 1: Company name, health, actions */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-3">
          <span className="text-xl">🏢</span>
          <div>
            <h1
              className="text-xl font-bold"
              style={{ color: 'var(--scout-saddle)', fontFamily: "'Bitter', Georgia, serif" }}
            >
              {account.company_name}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Health Badge */}
          <div
            className="flex items-center gap-2 px-3 py-1.5 rounded-full"
            style={{ backgroundColor: healthStyle.bg }}
          >
            <span>{healthStyle.icon}</span>
            <span className="text-sm font-medium capitalize" style={{ color: healthStyle.text }}>
              {health.status.replace('_', ' ')}
            </span>
            <DataAnnotation
              source="Derived from Vector Out + Vector In"
              note={health.reason}
            />
          </div>

          {/* Action buttons */}
          <button
            onClick={onFavoriteToggle}
            className={`p-2 rounded-lg border transition-colors ${account.is_favorite ? 'bg-yellow-50' : 'hover:bg-gray-50'}`}
            style={{ borderColor: 'var(--scout-border)' }}
            title={account.is_favorite ? 'Remove from Favorites' : 'Add to Favorites'}
          >
            {account.is_favorite ? '⭐' : '☆'}
          </button>
          <button
            onClick={onWeeklyReviewToggle}
            className={`p-2 rounded-lg border transition-colors ${account.in_weekly_review ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
            style={{ borderColor: 'var(--scout-border)' }}
            title={account.in_weekly_review ? 'Remove from Weekly Review' : 'Add to Weekly Review'}
          >
            📋
          </button>
          <button
            onClick={onRefreshIntelligence}
            className="p-2 rounded-lg border transition-colors hover:bg-gray-50"
            style={{ borderColor: 'var(--scout-border)' }}
            title="Refresh Intelligence"
          >
            🔄
          </button>
          <Link
            href={`/territory/${accountId}/whitespace`}
            className="px-3 py-1.5 text-sm font-medium rounded-lg border transition-colors hover:bg-gray-50 flex items-center gap-1.5"
            style={{ borderColor: 'var(--scout-border)', color: 'var(--scout-earth)' }}
            title="White Space Analysis"
          >
            <span>📊</span>
            <span>White Space</span>
          </Link>
        </div>
      </div>

      {/* Row 2: Metadata */}
      <div className="flex items-center gap-4 text-sm mb-3" style={{ color: 'var(--scout-earth-light)' }}>
        <span>{account.vertical}</span>
        <span>•</span>
        <span>{account.headquarters}</span>
        {account.annual_revenue && (
          <>
            <span>•</span>
            <span>{account.annual_revenue} revenue</span>
          </>
        )}
      </div>

      {/* Row 3: Active Deals Summary */}
      {activeDeals.length > 0 && (
        <div className="mb-3">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[10px] font-semibold tracking-wider" style={{ color: 'var(--scout-earth-light)' }}>
              ACTIVE DEALS
            </span>
            <span
              className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
              style={{ backgroundColor: 'rgba(93, 122, 93, 0.15)', color: 'var(--scout-trail)' }}
            >
              {formatCurrency(vectorOutPipeline)} pipeline
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {activeDeals.map(deal => {
              const linkedSpark = getPursuitSpark(deal.pursuit_id)
              return (
                <div
                  key={deal.pursuit_id}
                  className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-xs"
                  style={{
                    borderColor: linkedSpark ? 'var(--scout-sunset)' : 'var(--scout-border)',
                    backgroundColor: linkedSpark ? 'rgba(210, 105, 30, 0.05)' : 'transparent'
                  }}
                >
                  {linkedSpark && (
                    <span title={`Linked to Spark: ${linkedSpark.title}`} className="text-xs">💡</span>
                  )}
                  <span className="font-medium" style={{ color: 'var(--scout-saddle)' }}>
                    {deal.name}
                  </span>
                  <span style={{ color: 'var(--scout-trail)' }}>
                    {formatCurrency(deal.estimated_value)}
                  </span>
                  <span style={{ color: 'var(--scout-earth-light)' }}>
                    {deal.deal_type || deal.stage}
                  </span>
                  {deal.target_close_date && (
                    <span style={{ color: 'var(--scout-earth-light)' }}>
                      {formatDate(deal.target_close_date)}
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Row 4: Signal headlines */}
      {signals.length > 0 && (
        <div className="flex items-center gap-4 flex-wrap">
          {signals.slice(0, 3).map((signal, i) => (
            <div
              key={i}
              className="flex items-center gap-1.5 text-xs px-2 py-1 rounded"
              style={{ backgroundColor: 'var(--scout-parchment)' }}
            >
              <span>
                {signal.type === 'regulatory' && '📈'}
                {signal.type === 'buying_signal' && '💼'}
                {signal.type === 'risk' && '🔔'}
                {signal.type === 'leadership_change' && '👤'}
                {!['regulatory', 'buying_signal', 'risk', 'leadership_change'].includes(signal.type) && '📌'}
              </span>
              <span style={{ color: 'var(--scout-earth)' }}>{signal.title}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
