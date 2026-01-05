'use client'

interface PipelineSnapshotProps {
  totalPipeline: number
  dealCount: number
  avgDealSize: number
  weightedPipeline: number
  byStage: { stage: string; value: number; count: number }[]
  source?: string
}

function formatCurrency(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`
  return `$${value.toLocaleString()}`
}

const STAGE_ORDER = ['Discovery', 'Qualification', 'Proposal', 'Negotiation', 'Closed_Won', 'Closed_Lost']

export function PipelineSnapshot({
  totalPipeline,
  dealCount,
  avgDealSize,
  weightedPipeline,
  byStage,
  source = 'Manual Entry'
}: PipelineSnapshotProps) {
  // Sort stages by order
  const sortedStages = [...byStage].sort((a, b) => {
    const aIndex = STAGE_ORDER.indexOf(a.stage)
    const bIndex = STAGE_ORDER.indexOf(b.stage)
    return aIndex - bIndex
  })

  // Calculate stage percentages for bar widths
  const maxStageValue = Math.max(...sortedStages.map(s => s.value), 1)

  // Calculate health indicators
  const hasEarlyStageRisk = sortedStages.filter(s =>
    s.stage === 'Discovery' || s.stage === 'Qualification'
  ).reduce((sum, s) => sum + s.value, 0) > totalPipeline * 0.6

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
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
            Pipeline Snapshot
          </h2>
          {hasEarlyStageRisk && (
            <span
              className="text-xs px-2 py-0.5 rounded-full"
              style={{ backgroundColor: 'var(--status-warning-bg)', color: 'var(--status-warning)' }}
            >
              Early Stage Heavy
            </span>
          )}
        </div>
        <span
          className="text-xs px-2 py-0.5 rounded-full"
          style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-tertiary)' }}
        >
          Source: {source}
        </span>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-4 gap-4 mb-4">
        <div>
          <p className="text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>
            {formatCurrency(totalPipeline)}
          </p>
          <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Total Pipeline</p>
        </div>
        <div>
          <p className="text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>
            {dealCount}
          </p>
          <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Active Deals</p>
        </div>
        <div>
          <p className="text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>
            {formatCurrency(avgDealSize)}
          </p>
          <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Avg Deal Size</p>
        </div>
        <div>
          <p className="text-2xl font-semibold" style={{ color: 'var(--accent-primary)' }}>
            {formatCurrency(weightedPipeline)}
          </p>
          <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Weighted</p>
        </div>
      </div>

      {/* Stage Breakdown */}
      <div className="space-y-2">
        {sortedStages
          .filter(s => s.stage !== 'Closed_Won' && s.stage !== 'Closed_Lost')
          .map((stage) => (
          <div key={stage.stage} className="flex items-center gap-3">
            <span
              className="text-xs w-24 shrink-0"
              style={{ color: 'var(--text-secondary)' }}
            >
              {stage.stage.replace('_', ' ')}
            </span>
            <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${(stage.value / maxStageValue) * 100}%`,
                  backgroundColor: 'var(--accent-primary)'
                }}
              />
            </div>
            <span
              className="text-xs w-16 text-right shrink-0 font-medium"
              style={{ color: 'var(--text-primary)' }}
            >
              {formatCurrency(stage.value)}
            </span>
            <span
              className="text-xs w-8 text-right shrink-0"
              style={{ color: 'var(--text-muted)' }}
            >
              {stage.count}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
