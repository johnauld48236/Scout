'use client'

interface GoalProgress {
  progress_id: string
  recorded_at: string
  total_closed: number
  platform_originated: number
  active_pipeline: number
}

interface GoalProgressBreakdownProps {
  progress: GoalProgress
  targetValue: number
  tamOpportunity: number
  tamAccountCount: number
}

function formatCurrency(value: number): string {
  if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`
  if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`
  return `$${value}`
}

export function GoalProgressBreakdown({
  progress,
  targetValue,
  tamOpportunity,
  tamAccountCount,
}: GoalProgressBreakdownProps) {
  const gap = targetValue - progress.total_closed
  const pipelineCoverage = gap > 0 && progress.active_pipeline > 0
    ? Math.min(Math.round((progress.active_pipeline / gap) * 100), 100)
    : gap <= 0 ? 100 : 0

  const platformContribution = progress.total_closed > 0
    ? Math.round((progress.platform_originated / progress.total_closed) * 100)
    : 0

  return (
    <div className="rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 overflow-hidden">
      <div className="px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border-b border-zinc-200 dark:border-zinc-700">
        <h2 className="font-semibold text-zinc-900 dark:text-zinc-100">Progress Breakdown</h2>
        <p className="text-xs text-zinc-500 mt-0.5">
          Last updated: {new Date(progress.recorded_at).toLocaleDateString()}
        </p>
      </div>

      <div className="p-4">
        {/* Visual Waterfall */}
        <div className="relative mb-6">
          <div className="flex h-12 rounded-lg overflow-hidden">
            {/* Closed (SF) */}
            <div
              className="bg-green-500 flex items-center justify-center text-white text-xs font-medium"
              style={{ width: `${Math.min((progress.total_closed / targetValue) * 100, 100)}%` }}
            >
              {progress.total_closed > 0 && 'Closed'}
            </div>
            {/* Active Pipeline */}
            <div
              className="bg-blue-500 flex items-center justify-center text-white text-xs font-medium"
              style={{ width: `${Math.min((progress.active_pipeline / targetValue) * 100, 50)}%` }}
            >
              {progress.active_pipeline > 0 && 'Pipeline'}
            </div>
            {/* TAM Opportunity */}
            {tamOpportunity > 0 && (
              <div
                className="bg-purple-500 flex items-center justify-center text-white text-xs font-medium"
                style={{ width: `${Math.min((tamOpportunity / targetValue) * 100, 30)}%` }}
              >
                TAM
              </div>
            )}
            {/* Remaining gap */}
            <div className="flex-1 bg-zinc-200 dark:bg-zinc-700" />
          </div>
          {/* Target line */}
          <div className="absolute right-0 top-0 bottom-0 w-0.5 bg-zinc-900 dark:bg-zinc-100" />
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 gap-4">
          {/* Total Closed */}
          <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-3 h-3 rounded-full bg-green-500" />
              <span className="text-sm font-medium text-green-700 dark:text-green-400">Total Closed</span>
            </div>
            <p className="text-xl font-bold text-green-900 dark:text-green-100">
              {formatCurrency(progress.total_closed)}
            </p>
            <p className="text-xs text-green-600 dark:text-green-400 mt-1">
              From Salesforce
            </p>
          </div>

          {/* Platform Originated */}
          <div className="p-3 bg-teal-50 dark:bg-teal-900/20 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-3 h-3 rounded-full bg-teal-500" />
              <span className="text-sm font-medium text-teal-700 dark:text-teal-400">Platform Originated</span>
            </div>
            <p className="text-xl font-bold text-teal-900 dark:text-teal-100">
              {formatCurrency(progress.platform_originated)}
            </p>
            <p className="text-xs text-teal-600 dark:text-teal-400 mt-1">
              {platformContribution}% from TAM intelligence
            </p>
          </div>

          {/* Active Pipeline */}
          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-3 h-3 rounded-full bg-blue-500" />
              <span className="text-sm font-medium text-blue-700 dark:text-blue-400">Active Pipeline</span>
            </div>
            <p className="text-xl font-bold text-blue-900 dark:text-blue-100">
              {formatCurrency(progress.active_pipeline)}
            </p>
            <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
              {pipelineCoverage}% gap coverage
            </p>
          </div>

          {/* TAM Opportunity */}
          <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-3 h-3 rounded-full bg-purple-500" />
              <span className="text-sm font-medium text-purple-700 dark:text-purple-400">TAM Opportunity</span>
            </div>
            <p className="text-xl font-bold text-purple-900 dark:text-purple-100">
              {formatCurrency(tamOpportunity)}
            </p>
            <p className="text-xs text-purple-600 dark:text-purple-400 mt-1">
              {tamAccountCount} accounts available
            </p>
          </div>
        </div>

        {/* Summary */}
        <div className="mt-4 p-3 bg-zinc-50 dark:bg-zinc-800 rounded-lg">
          <div className="flex items-center justify-between text-sm">
            <span className="text-zinc-600 dark:text-zinc-400">Gap to target:</span>
            <span className="font-medium text-zinc-900 dark:text-zinc-100">
              {gap > 0 ? formatCurrency(gap) : 'Target achieved!'}
            </span>
          </div>
          {gap > 0 && progress.active_pipeline > 0 && (
            <div className="flex items-center justify-between text-sm mt-1">
              <span className="text-zinc-600 dark:text-zinc-400">Pipeline coverage:</span>
              <span className={`font-medium ${pipelineCoverage >= 100 ? 'text-green-600' : pipelineCoverage >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
                {pipelineCoverage}%
              </span>
            </div>
          )}
          {gap > 0 && tamOpportunity > 0 && (
            <div className="flex items-center justify-between text-sm mt-1">
              <span className="text-zinc-600 dark:text-zinc-400">TAM can cover:</span>
              <span className="font-medium text-purple-600">
                {Math.round((tamOpportunity / gap) * 100)}% of gap
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
