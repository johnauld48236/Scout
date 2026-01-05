'use client'

import Link from 'next/link'

interface GapCategory {
  name: string
  label: string
  target: number
  closed: number
  pipeline: number
  weightedPipeline: number
  dealCount: number
}

interface GapAnalysisProps {
  categories: GapCategory[]
  totalTarget: number
  totalClosed: number
  totalPipeline: number
}

function formatCurrency(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`
  return `$${value.toLocaleString()}`
}

function GapCard({ category }: { category: GapCategory }) {
  const gap = Math.max(0, category.target - category.closed)
  const closedPct = category.target > 0 ? (category.closed / category.target) * 100 : 0
  const pipelinePct = category.target > 0 ? (category.pipeline / category.target) * 100 : 0
  // Coverage is pipeline / gap (how much of the remaining gap is covered by pipeline)
  const coverage = gap > 0 ? (category.pipeline / gap) * 100 : (closedPct >= 100 ? 100 : 0)

  const getStatusColor = () => {
    if (closedPct >= 100) return 'var(--status-success)'
    if (coverage >= 100) return 'var(--status-success)'
    if (coverage >= 70) return 'var(--status-warning)'
    return 'var(--status-danger)'
  }

  const getStatusBg = () => {
    if (closedPct >= 100) return 'var(--status-success-bg)'
    if (coverage >= 100) return 'var(--status-success-bg)'
    if (coverage >= 70) return 'var(--status-warning-bg)'
    return 'var(--status-danger-bg)'
  }

  // Determine action link based on category
  const getActionLink = () => {
    if (category.name === 'new_business') {
      return { href: '/tam/list', label: 'Explore TAM →' }
    }
    if (category.name === 'upsell') {
      return { href: '/accounts', label: 'View Account Plans →' }
    }
    if (category.name === 'renewal') {
      return { href: '/accounts', label: 'Review Renewals →' }
    }
    return null
  }

  const action = getActionLink()

  return (
    <div
      className="rounded-lg border p-4"
      style={{
        backgroundColor: 'var(--bg-primary)',
        borderColor: 'var(--border-primary)',
        boxShadow: 'var(--shadow-sm)'
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
          {category.label}
        </h3>
        <span
          className="text-xs px-2 py-0.5 rounded-full font-medium"
          style={{ backgroundColor: getStatusBg(), color: getStatusColor() }}
        >
          {closedPct >= 100 ? 'Achieved' : coverage >= 100 ? 'Covered' : `${Math.round(coverage)}% covered`}
        </span>
      </div>

      {/* Progress Bar - Shows closed + pipeline */}
      <div className="mb-3">
        <div
          className="h-3 rounded-full overflow-hidden flex"
          style={{ backgroundColor: 'var(--bg-tertiary)' }}
        >
          {/* Closed portion - solid green */}
          <div
            className="h-full"
            style={{
              width: `${Math.min(closedPct, 100)}%`,
              backgroundColor: 'var(--status-success)'
            }}
          />
          {/* Pipeline portion - lighter blue */}
          {closedPct < 100 && pipelinePct > 0 && (
            <div
              className="h-full"
              style={{
                width: `${Math.min(pipelinePct, 100 - closedPct)}%`,
                backgroundColor: 'var(--accent-primary)',
                opacity: 0.6
              }}
            />
          )}
        </div>
        {/* Legend */}
        <div className="flex items-center gap-3 mt-1">
          <span className="flex items-center gap-1 text-[10px]" style={{ color: 'var(--text-muted)' }}>
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--status-success)' }} />
            Closed
          </span>
          <span className="flex items-center gap-1 text-[10px]" style={{ color: 'var(--text-muted)' }}>
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--accent-primary)', opacity: 0.6 }} />
            Pipeline
          </span>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        <div>
          <p className="text-[10px] uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Target</p>
          <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
            {formatCurrency(category.target)}
          </p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Closed</p>
          <p className="text-sm font-semibold" style={{ color: 'var(--status-success)' }}>
            {formatCurrency(category.closed)}
          </p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Pipeline</p>
          <p className="text-sm font-semibold" style={{ color: 'var(--accent-primary)' }}>
            {formatCurrency(category.pipeline)}
            {category.dealCount > 0 && (
              <span className="text-[10px] font-normal ml-1" style={{ color: 'var(--text-muted)' }}>
                ({category.dealCount})
              </span>
            )}
          </p>
        </div>
      </div>

      {/* Gap indicator */}
      {gap > 0 && (
        <div
          className="p-2 rounded-md mb-3"
          style={{ backgroundColor: 'var(--status-danger-bg)' }}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium" style={{ color: 'var(--status-danger)' }}>
              Gap: {formatCurrency(gap)}
            </span>
            {coverage < 100 && (
              <span className="text-xs" style={{ color: 'var(--status-danger)' }}>
                Need {formatCurrency(gap - category.pipeline)} more
              </span>
            )}
          </div>
        </div>
      )}

      {/* Action Link */}
      {action && gap > 0 && (
        <Link
          href={action.href}
          className="text-xs font-medium flex items-center gap-1"
          style={{ color: 'var(--accent-primary)' }}
        >
          {action.label}
        </Link>
      )}
    </div>
  )
}

export function GapAnalysis({ categories, totalTarget, totalClosed, totalPipeline }: GapAnalysisProps) {
  const totalGap = Math.max(0, totalTarget - totalClosed)
  // Pipeline coverage = total pipeline / gap
  const overallCoverage = totalGap > 0 ? (totalPipeline / totalGap) * 100 : (totalClosed >= totalTarget ? 100 : 0)

  const getCoverageStatus = () => {
    if (totalClosed >= totalTarget) return { color: 'var(--status-success)', label: 'Target Achieved' }
    if (overallCoverage >= 100) return { color: 'var(--status-success)', label: 'Fully Covered' }
    if (overallCoverage >= 70) return { color: 'var(--status-warning)', label: 'Partial Coverage' }
    return { color: 'var(--status-danger)', label: 'At Risk' }
  }

  const status = getCoverageStatus()

  return (
    <div className="space-y-4">
      {/* Summary Header */}
      <div
        className="rounded-lg border p-4"
        style={{
          backgroundColor: 'var(--bg-primary)',
          borderColor: 'var(--border-primary)',
          boxShadow: 'var(--shadow-sm)'
        }}
      >
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                Revenue Gap Analysis
              </h2>
              <span
                className="text-xs px-2 py-0.5 rounded-full font-medium"
                style={{
                  backgroundColor: status.color === 'var(--status-success)' ? 'var(--status-success-bg)' :
                                   status.color === 'var(--status-warning)' ? 'var(--status-warning-bg)' :
                                   'var(--status-danger-bg)',
                  color: status.color
                }}
              >
                {status.label}
              </span>
            </div>
            <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>
              {formatCurrency(totalClosed)} closed of {formatCurrency(totalTarget)} target
            </p>
          </div>

          <div className="flex items-center gap-6">
            <div className="text-right">
              <p className="text-[10px] uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Gap to Target</p>
              <p
                className="text-xl font-semibold"
                style={{ color: totalGap > 0 ? 'var(--status-danger)' : 'var(--status-success)' }}
              >
                {totalGap > 0 ? formatCurrency(totalGap) : 'None'}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[10px] uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Pipeline</p>
              <p className="text-xl font-semibold" style={{ color: 'var(--accent-primary)' }}>
                {formatCurrency(totalPipeline)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[10px] uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Coverage</p>
              <p
                className="text-xl font-semibold"
                style={{ color: status.color }}
              >
                {Math.round(overallCoverage)}%
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Category Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {categories.map((category) => (
          <GapCard key={category.name} category={category} />
        ))}
      </div>

      {/* Link to Gap Analysis */}
      <div className="flex justify-end">
        <Link
          href="/tam/gaps"
          className="text-xs font-medium"
          style={{ color: 'var(--accent-primary)' }}
        >
          View detailed gap analysis →
        </Link>
      </div>
    </div>
  )
}
