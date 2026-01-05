'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ScoutTerrainMark } from '@/components/ui/scout-logo'
import { ReviewNoteModal } from '@/components/weekly-review/ReviewNoteModal'
import { ReviewCard } from '@/components/weekly-review/ReviewCard'
import { DashboardKPIs } from '@/components/dashboard/DashboardKPIs'

interface ReviewAccount {
  account_plan_id: string
  account_name: string
  is_favorite: boolean
  in_weekly_review: boolean
  last_reviewed_at: string | null
  plan_status: string
  // Computed metrics
  pipeline_value: number
  opportunity_count: number
  stakeholder_count: number
  overdue_action_count: number
  this_week_action_count: number
  open_risk_count: number
  critical_risk_count: number
  days_since_engagement: number | null
  engagements_this_week: number
  unresolved_notes_count: number
  bant_gaps: string[]
  avg_bant_score: number | null
  pipeline_change: number | null
  needs_attention: boolean
  // Related data
  pursuits: Array<{
    pursuit_id: string
    name: string
    stage: string
    estimated_value: number
  }>
  risks: Array<{
    risk_id: string
    description: string
    severity: string
  }>
  notes: Array<{
    note_id: string
    note_text: string
    note_type: string
    created_at: string
  }>
  recent_engagements: Array<{
    engagement_id: string
    engagement_type: string
    engagement_date: string
    title: string
  }>
  overdue_actions: Array<{
    action_id: string
    title: string
    due_date: string
  }>
  this_week_actions: Array<{
    action_id: string
    title: string
    due_date: string
  }>
  bant_by_pursuit: Record<string, { B: number; A: number; N: number; T: number }>
}

interface Summary {
  total: number
  needsAttention: number
  totalPipeline: number
  totalRisks: number
}

export default function WeeklyReviewPage() {
  const [accounts, setAccounts] = useState<ReviewAccount[]>([])
  const [summary, setSummary] = useState<Summary>({ total: 0, needsAttention: 0, totalPipeline: 0, totalRisks: 0 })
  const [loading, setLoading] = useState(true)
  const [expandedAccount, setExpandedAccount] = useState<string | null>(null)
  const [noteModalAccount, setNoteModalAccount] = useState<ReviewAccount | null>(null)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const response = await fetch('/api/weekly-review')
      if (response.ok) {
        const data = await response.json()
        setAccounts(data.accounts || [])
        setSummary({
          total: data.summary?.total ?? 0,
          needsAttention: data.summary?.needsAttention ?? 0,
          totalPipeline: data.summary?.totalPipeline ?? 0,
          totalRisks: data.summary?.totalRisks ?? 0
        })
      }
    } catch (error) {
      console.error('Failed to load weekly review:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleMarkReviewed = async (accountId: string) => {
    try {
      await fetch(`/api/accounts/${accountId}/weekly-review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'mark_reviewed' }),
      })
      // Update local state
      setAccounts(accounts.map(a =>
        a.account_plan_id === accountId
          ? { ...a, last_reviewed_at: new Date().toISOString() }
          : a
      ))
    } catch (error) {
      console.error('Failed to mark reviewed:', error)
    }
  }

  const handleToggleFavorite = async (accountId: string) => {
    try {
      const response = await fetch(`/api/accounts/${accountId}/favorite`, { method: 'POST' })
      if (response.ok) {
        const data = await response.json()
        setAccounts(accounts.map(a =>
          a.account_plan_id === accountId
            ? { ...a, is_favorite: data.is_favorite }
            : a
        ))
      }
    } catch (error) {
      console.error('Failed to toggle favorite:', error)
    }
  }

  const handleRemoveFromReview = async (accountId: string) => {
    try {
      await fetch(`/api/accounts/${accountId}/weekly-review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'toggle' }),
      })
      setAccounts(accounts.filter(a => a.account_plan_id !== accountId))
      setSummary({ ...summary, total: summary.total - 1 })
    } catch (error) {
      console.error('Failed to remove from review:', error)
    }
  }

  const handleNoteAdded = () => {
    loadData() // Refresh data after adding note
    setNoteModalAccount(null)
  }

  const formatCurrency = (value: number | undefined | null): string => {
    if (value == null) return '$0'
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`
    if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`
    return `$${value.toLocaleString()}`
  }

  const needsAttentionAccounts = accounts.filter(a => a.needs_attention)
  const onTrackAccounts = accounts.filter(a => !a.needs_attention)

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--scout-parchment)' }}>
        <div className="text-center">
          <ScoutTerrainMark className="w-12 h-6 mx-auto mb-4" color="brown" />
          <p style={{ color: 'var(--scout-earth-light)' }}>Loading review...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--scout-parchment)' }}>
      {/* Header */}
      <div className="border-b" style={{ backgroundColor: 'var(--scout-white)', borderColor: 'var(--scout-border)' }}>
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <ScoutTerrainMark className="w-8 h-4" color="brown" />
              <div>
                <h1
                  className="text-xl font-bold"
                  style={{ color: 'var(--scout-saddle)', fontFamily: "'Bitter', Georgia, serif" }}
                >
                  Weekly Review
                </h1>
                <p className="text-sm" style={{ color: 'var(--scout-earth-light)' }}>
                  {summary.total} accounts in review • {formatCurrency(summary.totalPipeline)} pipeline
                </p>
              </div>
            </div>

            <Link
              href="/accounts"
              className="px-4 py-2 rounded-lg text-sm font-medium border transition-colors"
              style={{ borderColor: 'var(--scout-saddle)', color: 'var(--scout-saddle)' }}
            >
              + Add Accounts
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-6">
        {accounts.length === 0 ? (
          <div
            className="rounded-xl border p-12 text-center"
            style={{ backgroundColor: 'var(--scout-white)', borderColor: 'var(--scout-border)' }}
          >
            <ScoutTerrainMark className="w-16 h-8 mx-auto mb-4 opacity-30" color="brown" />
            <h2
              className="text-lg font-semibold mb-2"
              style={{ color: 'var(--scout-earth)', fontFamily: "'Bitter', Georgia, serif" }}
            >
              No accounts in weekly review
            </h2>
            <p className="text-sm mb-4" style={{ color: 'var(--scout-earth-light)' }}>
              Add accounts to your weekly review from the accounts page to track active deals.
            </p>
            <Link
              href="/accounts"
              className="inline-block px-4 py-2 rounded-lg text-sm font-medium text-white"
              style={{ backgroundColor: 'var(--scout-saddle)' }}
            >
              Go to Accounts
            </Link>
          </div>
        ) : (
          <>
            {/* Summary Stats */}
            <div className="grid grid-cols-4 gap-4 mb-6">
              <div
                className="rounded-xl border p-4 text-center"
                style={{ backgroundColor: 'var(--scout-white)', borderColor: 'var(--scout-border)' }}
              >
                <p className="text-2xl font-bold" style={{ color: 'var(--scout-earth)' }}>
                  {summary.total}
                </p>
                <p className="text-xs" style={{ color: 'var(--scout-earth-light)' }}>
                  In Review
                </p>
              </div>
              <div
                className="rounded-xl border p-4 text-center"
                style={{
                  backgroundColor: summary.needsAttention > 0 ? 'rgba(169, 68, 66, 0.05)' : 'white',
                  borderColor: summary.needsAttention > 0 ? 'var(--scout-clay)' : 'var(--scout-border)',
                }}
              >
                <p
                  className="text-2xl font-bold"
                  style={{ color: summary.needsAttention > 0 ? 'var(--scout-clay)' : 'var(--scout-trail)' }}
                >
                  {summary.needsAttention}
                </p>
                <p className="text-xs" style={{ color: 'var(--scout-earth-light)' }}>
                  Need Attention
                </p>
              </div>
              <div
                className="rounded-xl border p-4 text-center"
                style={{ backgroundColor: 'var(--scout-white)', borderColor: 'var(--scout-border)' }}
              >
                <p className="text-2xl font-bold" style={{ color: 'var(--scout-trail)' }}>
                  {formatCurrency(summary.totalPipeline)}
                </p>
                <p className="text-xs" style={{ color: 'var(--scout-earth-light)' }}>
                  Pipeline
                </p>
              </div>
              <div
                className="rounded-xl border p-4 text-center"
                style={{
                  backgroundColor: summary.totalRisks > 0 ? 'rgba(210, 105, 30, 0.05)' : 'white',
                  borderColor: summary.totalRisks > 0 ? 'var(--scout-sunset)' : 'var(--scout-border)',
                }}
              >
                <p
                  className="text-2xl font-bold"
                  style={{ color: summary.totalRisks > 0 ? 'var(--scout-sunset)' : 'var(--scout-trail)' }}
                >
                  {summary.totalRisks}
                </p>
                <p className="text-xs" style={{ color: 'var(--scout-earth-light)' }}>
                  Open Risks
                </p>
              </div>
            </div>

            {/* Weekly KPIs */}
            <DashboardKPIs
              kpis={[
                {
                  label: 'Total Pipeline',
                  value: summary.totalPipeline,
                  format: 'currency',
                  trend: 'up',
                  trendValue: 5,
                },
                {
                  label: 'Accounts in Review',
                  value: summary.total,
                  format: 'number',
                  trend: 'neutral',
                },
                {
                  label: 'Needs Attention',
                  value: summary.needsAttention,
                  format: 'number',
                  trend: summary.needsAttention > 0 ? 'down' : 'up',
                },
                {
                  label: 'Open Risks',
                  value: summary.totalRisks,
                  format: 'number',
                  trend: summary.totalRisks > 3 ? 'down' : 'up',
                },
                {
                  label: 'Avg Deal Size',
                  value: summary.total > 0 ? summary.totalPipeline / accounts.reduce((sum, a) => sum + a.opportunity_count, 0) || 0 : 0,
                  format: 'currency',
                  trend: 'neutral',
                },
                {
                  label: 'Overdue Actions',
                  value: accounts.reduce((sum, a) => sum + a.overdue_action_count, 0),
                  format: 'number',
                  trend: accounts.reduce((sum, a) => sum + a.overdue_action_count, 0) > 0 ? 'down' : 'up',
                },
                {
                  label: 'This Week Actions',
                  value: accounts.reduce((sum, a) => sum + a.this_week_action_count, 0),
                  format: 'number',
                  trend: 'neutral',
                },
                {
                  label: 'Avg BANT Score',
                  value: accounts.reduce((sum, a) => sum + (a.avg_bant_score || 0), 0) / Math.max(1, accounts.filter(a => a.avg_bant_score !== null).length),
                  format: 'number',
                  trend: 'neutral',
                },
              ]}
              title="Weekly Performance Snapshot"
            />

            {/* Needs Attention Section */}
            {needsAttentionAccounts.length > 0 && (
              <div className="mb-8">
                <h2
                  className="text-sm font-semibold mb-3 flex items-center gap-2"
                  style={{ color: 'var(--scout-clay)' }}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  NEEDS ATTENTION ({needsAttentionAccounts.length})
                </h2>
                <div className="space-y-3">
                  {needsAttentionAccounts.map(account => (
                    <ReviewCard
                      key={account.account_plan_id}
                      account={account}
                      isExpanded={expandedAccount === account.account_plan_id}
                      onToggleExpand={() => setExpandedAccount(
                        expandedAccount === account.account_plan_id ? null : account.account_plan_id
                      )}
                      onMarkReviewed={() => handleMarkReviewed(account.account_plan_id)}
                      onToggleFavorite={() => handleToggleFavorite(account.account_plan_id)}
                      onRemoveFromReview={() => handleRemoveFromReview(account.account_plan_id)}
                      onAddNote={() => setNoteModalAccount(account)}
                      formatCurrency={formatCurrency}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* On Track Section */}
            {onTrackAccounts.length > 0 && (
              <div>
                <h2
                  className="text-sm font-semibold mb-3 flex items-center gap-2"
                  style={{ color: 'var(--scout-trail)' }}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  ON TRACK ({onTrackAccounts.length})
                </h2>
                <div className="space-y-3">
                  {onTrackAccounts.map(account => (
                    <ReviewCard
                      key={account.account_plan_id}
                      account={account}
                      isExpanded={expandedAccount === account.account_plan_id}
                      onToggleExpand={() => setExpandedAccount(
                        expandedAccount === account.account_plan_id ? null : account.account_plan_id
                      )}
                      onMarkReviewed={() => handleMarkReviewed(account.account_plan_id)}
                      onToggleFavorite={() => handleToggleFavorite(account.account_plan_id)}
                      onRemoveFromReview={() => handleRemoveFromReview(account.account_plan_id)}
                      onAddNote={() => setNoteModalAccount(account)}
                      formatCurrency={formatCurrency}
                    />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Note Modal */}
      {noteModalAccount && (
        <ReviewNoteModal
          account={noteModalAccount}
          onClose={() => setNoteModalAccount(null)}
          onNoteAdded={handleNoteAdded}
        />
      )}
    </div>
  )
}
