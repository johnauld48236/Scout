'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ScoutTerrainMark } from '@/components/ui/scout-logo'

interface Signal {
  signal_id: string
  title?: string
  summary: string
  signal_type?: string
  signal_date: string
}

interface AccountHealthBannerProps {
  accountId: string
  accountName: string
  industry?: string
  headquarters?: string
  employeeCount?: number
  website?: string
  signals: Signal[]
  divisionsCount: number
  stakeholdersCount: number
  pursuitsCount: number
  isFavorite: boolean
  inWeeklyReview: boolean
  lastRefreshed?: string
  onRefresh?: () => void
}

export function AccountHealthBanner({
  accountId,
  accountName,
  industry,
  headquarters,
  employeeCount,
  website,
  signals,
  divisionsCount,
  stakeholdersCount,
  pursuitsCount,
  isFavorite,
  inWeeklyReview,
  lastRefreshed,
  onRefresh,
}: AccountHealthBannerProps) {
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Calculate health based on data completeness and signals
  const getHealth = () => {
    let score = 0
    if (divisionsCount > 0) score += 20
    if (stakeholdersCount >= 3) score += 30
    if (signals.length > 0) score += 25
    if (pursuitsCount > 0) score += 25

    if (score >= 80) return { label: 'Strong', color: 'var(--scout-trail)', bg: 'rgba(93, 122, 93, 0.15)' }
    if (score >= 50) return { label: 'Moderate', color: 'var(--scout-sunset)', bg: 'rgba(210, 105, 30, 0.15)' }
    return { label: 'Building', color: 'var(--scout-sky)', bg: 'rgba(56, 152, 199, 0.15)' }
  }

  const health = getHealth()
  const recentSignals = signals.slice(0, 3)

  const handleRefresh = async () => {
    if (isRefreshing) return
    setIsRefreshing(true)
    try {
      onRefresh?.()
    } finally {
      setTimeout(() => setIsRefreshing(false), 2000)
    }
  }

  const formatLastRefreshed = () => {
    if (!lastRefreshed) return null
    const date = new Date(lastRefreshed)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffHours / 24)

    if (diffHours < 1) return 'Just now'
    if (diffHours < 24) return `${diffHours}h ago`
    return `${diffDays}d ago`
  }

  return (
    <div
      className="border-b sticky top-0 z-20"
      style={{ backgroundColor: 'var(--scout-white)', borderColor: 'var(--scout-border)' }}
    >
      <div className="max-w-7xl mx-auto px-6 py-3">
        <div className="flex items-center justify-between">
          {/* Left: Company Info */}
          <div className="flex items-center gap-4">
            <Link
              href="/accounts"
              className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
              style={{ color: 'var(--scout-earth-light)' }}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </Link>

            <div className="flex items-center gap-3">
              <ScoutTerrainMark className="w-6 h-3" color="brown" />
              <div>
                <div className="flex items-center gap-2">
                  <h1
                    className="text-lg font-bold"
                    style={{ color: 'var(--scout-saddle)', fontFamily: "'Bitter', Georgia, serif" }}
                  >
                    {accountName}
                  </h1>
                  <span
                    className="px-2 py-0.5 text-xs font-medium rounded-full"
                    style={{ backgroundColor: health.bg, color: health.color }}
                  >
                    {health.label}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--scout-earth-light)' }}>
                  {industry && <span>{industry}</span>}
                  {headquarters && (
                    <>
                      <span>·</span>
                      <span>{headquarters}</span>
                    </>
                  )}
                  {employeeCount && (
                    <>
                      <span>·</span>
                      <span>{employeeCount.toLocaleString()} employees</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Center: Signal Headlines */}
          {recentSignals.length > 0 && (
            <div className="hidden lg:flex items-center gap-4 max-w-md">
              {recentSignals.map((signal, idx) => (
                <div
                  key={signal.signal_id}
                  className="flex items-center gap-1.5 text-xs truncate"
                  style={{ color: 'var(--scout-earth)' }}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                      signal.signal_type?.includes('risk') ? 'bg-red-500' :
                      signal.signal_type?.includes('event') ? 'bg-amber-500' :
                      'bg-blue-500'
                    }`}
                  />
                  <span className="truncate">{signal.title || signal.summary.slice(0, 40)}</span>
                </div>
              ))}
            </div>
          )}

          {/* Right: Actions */}
          <div className="flex items-center gap-3">
            {/* Last Refreshed */}
            {lastRefreshed && (
              <span className="text-xs" style={{ color: 'var(--scout-earth-light)' }}>
                Refreshed {formatLastRefreshed()}
              </span>
            )}

            {/* Refresh Button */}
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50"
              style={{ color: 'var(--scout-sky)' }}
              title="Refresh Intelligence"
            >
              <svg
                className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>

            {/* Favorite */}
            <button
              className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
              style={{ color: isFavorite ? 'var(--scout-sunset)' : 'var(--scout-earth-light)' }}
              title="Toggle Favorite"
            >
              <svg className="w-4 h-4" fill={isFavorite ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
              </svg>
            </button>

            {/* Weekly Review */}
            <button
              className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
              style={{ color: inWeeklyReview ? 'var(--scout-trail)' : 'var(--scout-earth-light)' }}
              title="Toggle Weekly Review"
            >
              <svg className="w-4 h-4" fill={inWeeklyReview ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
