'use client'

import { useState } from 'react'

interface Competitor {
  name: string
  status?: string  // e.g., 'incumbent', 'challenger', 'displaced'
  strengths?: string
  weaknesses?: string
  strategy?: string
}

interface CompetitiveLandscapeProps {
  competitors?: Competitor[]
}

const STATUS_CONFIG: Record<string, { bg: string; icon: string }> = {
  'incumbent': { bg: 'bg-red-500', icon: '⚔️' },
  'challenger': { bg: 'bg-amber-500', icon: '🎯' },
  'displaced': { bg: 'bg-green-500', icon: '✓' },
  'evaluating': { bg: 'bg-blue-500', icon: '?' },
}

export function CompetitiveLandscape({ competitors = [] }: CompetitiveLandscapeProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  if (competitors.length === 0) return null

  const getStatusConfig = (status?: string) => {
    if (!status) return { bg: 'bg-zinc-400', icon: '•' }
    return STATUS_CONFIG[status.toLowerCase()] || STATUS_CONFIG['evaluating']
  }

  // Count by status for header preview
  const incumbentCount = competitors.filter(c => c.status?.toLowerCase() === 'incumbent').length

  return (
    <div className="mb-4 bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 flex items-center justify-between text-left"
      >
        <div className="flex items-center gap-2 min-w-0">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            Competitive
          </h2>
          <span className="text-xs px-1.5 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400">
            {competitors.length}
          </span>
          {incumbentCount > 0 && (
            <span className="text-xs px-1.5 py-0.5 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400">
              {incumbentCount} incumbent{incumbentCount > 1 ? 's' : ''}
            </span>
          )}
          {!isExpanded && (
            <span className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
              {competitors.slice(0, 3).map(c => c.name).join(', ')}{competitors.length > 3 ? '...' : ''}
            </span>
          )}
        </div>
        <svg
          className={`w-4 h-4 text-zinc-400 transition-transform flex-shrink-0 ${isExpanded ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isExpanded && (
        <div className="px-4 pb-4 border-t border-zinc-100 dark:border-zinc-800 pt-3">
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {competitors.map((competitor, index) => {
              const statusConfig = getStatusConfig(competitor.status)
              return (
                <div
                  key={index}
                  className="flex items-start gap-3 p-2 bg-zinc-50 dark:bg-zinc-800/50 rounded text-sm"
                >
                  {/* Status indicator */}
                  <div
                    className={`w-6 h-6 rounded flex items-center justify-center text-white text-xs flex-shrink-0 ${statusConfig.bg}`}
                    title={competitor.status || 'Unknown'}
                  >
                    {statusConfig.icon}
                  </div>

                  {/* Competitor info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-zinc-900 dark:text-zinc-100">
                        {competitor.name}
                      </span>
                      {competitor.status && (
                        <span className="text-[10px] text-zinc-500 dark:text-zinc-400 uppercase">
                          {competitor.status}
                        </span>
                      )}
                    </div>

                    {/* Compact strengths/weaknesses */}
                    <div className="flex gap-4 text-xs">
                      {competitor.strengths && (
                        <div className="flex-1">
                          <span className="text-red-500">↑</span>
                          <span className="text-zinc-600 dark:text-zinc-400 ml-1 line-clamp-1">
                            {competitor.strengths}
                          </span>
                        </div>
                      )}
                      {competitor.weaknesses && (
                        <div className="flex-1">
                          <span className="text-green-500">↓</span>
                          <span className="text-zinc-600 dark:text-zinc-400 ml-1 line-clamp-1">
                            {competitor.weaknesses}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Strategy - subtle */}
                    {competitor.strategy && (
                      <div className="mt-1 text-xs text-blue-600 dark:text-blue-400 line-clamp-1">
                        → {competitor.strategy}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
