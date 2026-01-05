'use client'

import { useState } from 'react'

interface StrategySectionProps {
  accountStrategy?: string
  strategicObjectives?: string  // Newline-separated
  riskFactors?: string  // Newline-separated
}

export function StrategySection({ accountStrategy, strategicObjectives, riskFactors }: StrategySectionProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  // Parse newline-separated strings into arrays
  const objectives = strategicObjectives?.split('\n').filter(o => o.trim()) || []
  const risks = riskFactors?.split('\n').filter(r => r.trim()) || []

  const hasData = accountStrategy || objectives.length > 0 || risks.length > 0

  if (!hasData) return null

  return (
    <div className="mb-4 bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 flex items-center justify-between text-left"
      >
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            Strategy
          </h2>
          {objectives.length > 0 && (
            <span className="text-xs px-1.5 py-0.5 rounded-full bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400">
              {objectives.length} obj
            </span>
          )}
          {risks.length > 0 && (
            <span className="text-xs px-1.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400">
              {risks.length} risks
            </span>
          )}
        </div>
        <svg
          className={`w-4 h-4 text-zinc-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isExpanded && (
        <div className="px-4 pb-4 border-t border-zinc-100 dark:border-zinc-800 pt-3">
          {/* Strategy Narrative */}
          {accountStrategy && (
            <p className="text-sm text-zinc-700 dark:text-zinc-300 mb-3 line-clamp-3">
              {accountStrategy}
            </p>
          )}

          <div className="grid grid-cols-2 gap-3">
            {/* Key Objectives */}
            {objectives.length > 0 && (
              <div>
                <h3 className="text-xs font-medium text-green-600 dark:text-green-400 mb-2">Objectives</h3>
                <ul className="space-y-1">
                  {objectives.slice(0, 4).map((objective, index) => (
                    <li key={index} className="flex items-start gap-1.5 text-xs text-zinc-700 dark:text-zinc-300">
                      <span className="text-green-500 mt-0.5">✓</span>
                      <span className="line-clamp-1">{objective}</span>
                    </li>
                  ))}
                  {objectives.length > 4 && (
                    <li className="text-xs text-zinc-400">+{objectives.length - 4} more</li>
                  )}
                </ul>
              </div>
            )}

            {/* Risk Factors */}
            {risks.length > 0 && (
              <div>
                <h3 className="text-xs font-medium text-amber-600 dark:text-amber-400 mb-2">Risks</h3>
                <ul className="space-y-1">
                  {risks.slice(0, 4).map((risk, index) => (
                    <li key={index} className="flex items-start gap-1.5 text-xs text-zinc-700 dark:text-zinc-300">
                      <span className="text-amber-500 mt-0.5">⚠</span>
                      <span className="line-clamp-1">{risk}</span>
                    </li>
                  ))}
                  {risks.length > 4 && (
                    <li className="text-xs text-zinc-400">+{risks.length - 4} more</li>
                  )}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
