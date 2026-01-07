'use client'

import Link from 'next/link'

interface StageBreakdown {
  stage: string
  value: number
  count: number
  weightedValue: number
}

interface CategoryData {
  name: string
  label: string
  target: number
  closed: number
  weightedPipeline: number
  totalPipeline: number
  dealCount: number
  byStage: StageBreakdown[]
}

interface ARRGoalHeroProps {
  arrTarget: number
  renewalsConfirmed: number
  categories: CategoryData[]
  totalClosed: number
  totalPipeline: number
  totalWeightedPipeline: number
  pipelineByStage: StageBreakdown[]
}

function formatCurrency(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`
  return `$${value.toLocaleString()}`
}

const STAGE_ORDER = ['Discovery', 'Qualification', 'Proposal', 'Negotiation']
// Muted stage colors - CRM data should be background context, not the main event
const STAGE_COLORS: Record<string, string> = {
  Discovery: '#fca5a5',      // red-300 (muted)
  Qualification: '#fcd34d',  // amber-300 (muted)
  Proposal: '#93c5fd',       // blue-300 (muted)
  Negotiation: '#86efac',    // green-300 (muted)
}

function CategoryCard({ category }: { category: CategoryData }) {
  const gap = Math.max(0, category.target - category.closed)
  const closedPct = category.target > 0 ? (category.closed / category.target) * 100 : 0
  const weightedCoverage = gap > 0 ? (category.weightedPipeline / gap) * 100 : (closedPct >= 100 ? 100 : 0)

  const totalForBar = category.byStage.reduce((sum, s) => sum + s.weightedValue, 0)
  const stagePercentages = category.byStage
    .filter(s => STAGE_ORDER.includes(s.stage))
    .sort((a, b) => STAGE_ORDER.indexOf(a.stage) - STAGE_ORDER.indexOf(b.stage))
    .map(s => ({
      stage: s.stage,
      pct: totalForBar > 0 ? (s.weightedValue / totalForBar) * 100 : 0,
      value: s.weightedValue
    }))

  const earlyStageValue = category.byStage
    .filter(s => s.stage === 'Discovery' || s.stage === 'Qualification')
    .reduce((sum, s) => sum + s.weightedValue, 0)
  const hasRisk = totalForBar > 0 && (earlyStageValue / totalForBar) > 0.6

  // Muted coverage colors - CRM section should be background context
  const getCoverageColor = () => {
    if (closedPct >= 100) return '#86efac'    // green-300 (muted)
    if (weightedCoverage >= 100) return '#86efac'
    if (weightedCoverage >= 70) return '#fcd34d'  // amber-300 (muted)
    return '#fca5a5' // red-300 (muted)
  }

  const getActionLink = () => {
    if (category.name === 'new_business') return { href: '/tam/list', label: 'Explore TAM' }
    if (category.name === 'upsell') return { href: '/accounts', label: 'View Accounts' }
    if (category.name === 'renewal') return { href: '/accounts', label: 'Review Renewals' }
    return null
  }

  const action = getActionLink()

  return (
    <div
      className="rounded-lg border p-4 relative"
      style={{
        backgroundColor: 'var(--bg-primary)',
        borderColor: hasRisk ? 'var(--status-warning)' : 'var(--border-primary)',
        boxShadow: 'var(--shadow-sm)'
      }}
    >
      {/* Coverage Badge - Prominent in top right */}
      <div
        className="absolute top-3 right-3 px-3 py-1.5 rounded-lg text-center"
        style={{ backgroundColor: getCoverageColor(), opacity: 0.9 }}
      >
        <p className="text-lg font-bold text-white">
          {Math.round(weightedCoverage)}%
        </p>
        <p className="text-[9px] uppercase tracking-wide text-white opacity-80">
          Coverage
        </p>
      </div>

      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
          {category.label}
        </h3>
        {hasRisk && (
          <span
            className="text-[9px] px-1.5 py-0.5 rounded-full"
            style={{ backgroundColor: 'var(--status-warning-bg)', color: 'var(--status-warning)' }}
          >
            Early Stage Risk
          </span>
        )}
      </div>

      {/* Target & Weighted */}
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div>
          <p className="text-[10px] uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Target</p>
          <p className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
            {formatCurrency(category.target)}
          </p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Weighted</p>
          <p className="text-lg font-semibold" style={{ color: getCoverageColor() }}>
            {formatCurrency(category.weightedPipeline)}
          </p>
        </div>
      </div>

      {/* Deal count */}
      <p className="text-xs mb-3" style={{ color: 'var(--text-tertiary)' }}>
        {category.dealCount} deals in pipeline
      </p>

      {/* Stage Distribution Bar */}
      <div className="mb-3">
        <div
          className="h-2 rounded-full overflow-hidden flex"
          style={{ backgroundColor: 'var(--bg-tertiary)' }}
        >
          {stagePercentages.map((s) => (
            <div
              key={s.stage}
              className="h-full"
              style={{
                width: `${s.pct}%`,
                backgroundColor: STAGE_COLORS[s.stage],
              }}
            />
          ))}
        </div>
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          {stagePercentages.filter(s => s.pct > 0).map(s => (
            <span key={s.stage} className="flex items-center gap-1 text-[10px]" style={{ color: 'var(--text-muted)' }}>
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: STAGE_COLORS[s.stage] }}
              />
              {s.stage.substring(0, 4)}
            </span>
          ))}
        </div>
      </div>

      {/* Action Link */}
      {action && gap > 0 && (
        <Link
          href={action.href}
          className="text-xs font-medium"
          style={{ color: 'var(--accent-primary)' }}
        >
          {action.label} →
        </Link>
      )}
    </div>
  )
}

export function ARRGoalHero({
  arrTarget,
  categories,
  totalClosed,
  totalPipeline,
  totalWeightedPipeline,
  pipelineByStage,
}: ARRGoalHeroProps) {
  // Gap = Annual Goal - Weighted Pipeline
  const pipelineGap = Math.max(0, arrTarget - totalWeightedPipeline)
  const weightedCoverage = arrTarget > 0 ? (totalWeightedPipeline / arrTarget) * 100 : 0

  // Get weighted values by category from spreadsheet data
  const recurringWeighted = categories.find(c => c.name === 'recurring')?.weightedPipeline || 0
  const upsellWeighted = categories.find(c => c.name === 'upsell')?.weightedPipeline || 0
  const newBusinessWeighted = categories.find(c => c.name === 'new_business')?.weightedPipeline || 0

  // Apply 10% churn to Recurring (baseline ARR) only
  const recurringWithChurn = recurringWeighted * 0.9
  const churnAmount = recurringWeighted * 0.1

  const sortedStages = [...pipelineByStage]
    .filter(s => STAGE_ORDER.includes(s.stage))
    .sort((a, b) => STAGE_ORDER.indexOf(a.stage) - STAGE_ORDER.indexOf(b.stage))

  const totalStageValue = sortedStages.reduce((sum, s) => sum + s.weightedValue, 0)

  // Muted coverage colors for main hero
  const getCoverageColor = () => {
    if (weightedCoverage >= 100) return '#86efac' // green-300 (muted)
    if (weightedCoverage >= 70) return '#fcd34d'  // amber-300 (muted)
    return '#fca5a5' // red-300 (muted)
  }

  return (
    <div className="space-y-4">
      {/* Main Hero Card - styled like the category cards */}
      <div
        className="rounded-lg border p-5 relative"
        style={{
          backgroundColor: 'var(--bg-primary)',
          borderColor: 'var(--border-primary)',
          boxShadow: 'var(--shadow-sm)'
        }}
      >
        {/* Coverage Badge - Top Right (like category cards) */}
        <div
          className="absolute top-4 right-4 px-4 py-2 rounded-lg text-center"
          style={{ backgroundColor: getCoverageColor() }}
        >
          <p className="text-2xl font-bold text-white">
            {Math.round(weightedCoverage)}%
          </p>
          <p className="text-[10px] uppercase tracking-wide text-white opacity-80">
            Coverage
          </p>
        </div>

        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
            2026 ARR Goal
          </h2>
          {pipelineGap > 0 && (
            <span
              className="text-xs px-2 py-0.5 rounded-full font-medium"
              style={{ backgroundColor: 'var(--status-danger-bg)', color: 'var(--status-danger)' }}
            >
              Gap: {formatCurrency(pipelineGap)}
            </span>
          )}
        </div>

        {/* Top Metrics Row */}
        <div className="grid grid-cols-3 gap-6 mb-5">
          <div>
            <p className="text-[10px] uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Target</p>
            <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
              {formatCurrency(arrTarget)}
            </p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Weighted Projection</p>
            <p className="text-2xl font-bold" style={{ color: getCoverageColor() }}>
              {formatCurrency(totalWeightedPipeline)}
            </p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Total Pipeline</p>
            <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
              {formatCurrency(totalPipeline)}
            </p>
          </div>
        </div>

        {/* Stage Distribution Bar with Labels */}
        <div className="mb-4">
          <div
            className="h-8 rounded-lg overflow-hidden flex relative"
            style={{ backgroundColor: 'var(--bg-tertiary)' }}
          >
            {sortedStages.map((stage) => {
              const pct = totalStageValue > 0 ? (stage.weightedValue / totalStageValue) * 100 : 0
              if (pct < 3) return null
              return (
                <div
                  key={stage.stage}
                  className="h-full flex items-center justify-center relative"
                  style={{
                    width: `${pct}%`,
                    backgroundColor: STAGE_COLORS[stage.stage],
                  }}
                >
                  {pct >= 12 && (
                    <span className="text-[10px] font-medium text-white drop-shadow-sm">
                      {formatCurrency(stage.weightedValue)}
                    </span>
                  )}
                </div>
              )
            })}
          </div>
          {/* Stage Legend */}
          <div className="flex items-center gap-4 mt-2">
            {sortedStages.map(s => (
              <span key={s.stage} className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-secondary)' }}>
                <span
                  className="w-2.5 h-2.5 rounded-sm"
                  style={{ backgroundColor: STAGE_COLORS[s.stage] }}
                />
                {s.stage} ({s.count})
              </span>
            ))}
          </div>
        </div>

        {/* Breakdown Row: Recurring (90%) | Upsell | New Business */}
        <div className="grid grid-cols-3 gap-4 pt-4" style={{ borderTop: '1px solid var(--border-primary)' }}>
          <div>
            <p className="text-[10px] uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Recurring (90%)</p>
            <p className="text-xl font-semibold" style={{ color: 'var(--status-success)' }}>
              {formatCurrency(recurringWithChurn)}
            </p>
            <p className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
              10% churn assumed (-{formatCurrency(churnAmount)})
            </p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Upsell</p>
            <p className="text-xl font-semibold" style={{ color: 'var(--accent-primary)' }}>
              {formatCurrency(upsellWeighted)}
            </p>
            <p className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
              Weighted pipeline
            </p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>New Business</p>
            <p className="text-xl font-semibold" style={{ color: 'var(--accent-primary)' }}>
              {formatCurrency(newBusinessWeighted)}
            </p>
            <p className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
              Weighted pipeline
            </p>
          </div>
        </div>
      </div>

      {/* Category Cards - Upsell and New Business only */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {categories.filter(c => c.name === 'upsell' || c.name === 'new_business').map((category) => (
          <CategoryCard key={category.name} category={category} />
        ))}
      </div>

      {/* Link to detailed analysis */}
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
