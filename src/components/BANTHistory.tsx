'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface BANTAnalysis {
  bant_id: string
  pursuit_id: string
  analysis_date: string
  budget_score: number
  authority_score: number
  need_score: number
  timeline_score: number
  total_score: number
  qualification_level: string
  analysis_source: string
  key_gaps?: string
  recommended_actions?: string
}

interface BANTHistoryProps {
  pursuitId: string
  pursuitName: string
  onClose: () => void
  onNewAnalysis: () => void
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function getDelta(current: number, previous: number): { value: number; display: string; color: string } {
  const delta = current - previous
  if (delta > 0) return { value: delta, display: `↑ +${delta}`, color: 'text-green-600' }
  if (delta < 0) return { value: delta, display: `↓ ${delta}`, color: 'text-red-600' }
  return { value: 0, display: '—', color: 'text-zinc-400' }
}

function getQualificationColor(level: string): string {
  switch (level) {
    case 'Highly_Qualified': return 'text-green-600 bg-green-100 dark:bg-green-900/30'
    case 'Qualified': return 'text-blue-600 bg-blue-100 dark:bg-blue-900/30'
    case 'Developing': return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30'
    default: return 'text-red-600 bg-red-100 dark:bg-red-900/30'
  }
}

export function BANTHistory({ pursuitId, pursuitName, onClose, onNewAnalysis }: BANTHistoryProps) {
  const [analyses, setAnalyses] = useState<BANTAnalysis[]>([])
  const [loading, setLoading] = useState(true)
  const [showTrend, setShowTrend] = useState(false)

  const fetchHistory = async () => {
    setLoading(true)
    const supabase = createClient()
    const { data, error } = await supabase
      .from('bant_analyses')
      .select('*')
      .eq('pursuit_id', pursuitId)
      .order('analysis_date', { ascending: false })
      .order('bant_id', { ascending: false })

    if (!error && data) {
      setAnalyses(data)
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchHistory()
  }, [pursuitId])

  const latest = analyses[0]
  const previous = analyses[1]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      <div className="relative bg-white dark:bg-zinc-900 rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-zinc-200 dark:border-zinc-700">
          <div>
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              BANT History
            </h2>
            <p className="text-sm text-zinc-500">{pursuitName}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onNewAnalysis}
              className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors"
            >
              + New Analysis
            </button>
            <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="p-4">
          {loading ? (
            <div className="text-center py-8 text-zinc-500">Loading...</div>
          ) : analyses.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-zinc-500 mb-4">No BANT analyses recorded yet.</p>
              <button
                onClick={onNewAnalysis}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors"
              >
                Create First Analysis
              </button>
            </div>
          ) : (
            <>
              {/* Current Score Summary */}
              <div className="bg-zinc-50 dark:bg-zinc-800 rounded-lg p-4 mb-6">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Current Score</span>
                  <div className="flex items-center gap-3">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${getQualificationColor(latest.qualification_level)}`}>
                      {latest.qualification_level.replace('_', ' ')}
                    </span>
                    {previous && (
                      <span className={`text-sm font-medium ${getDelta(latest.total_score, previous.total_score).color}`}>
                        {getDelta(latest.total_score, previous.total_score).display} since {formatDate(previous.analysis_date)}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">{latest.total_score}</span>
                  <span className="text-zinc-500">/100</span>
                </div>

                {/* Score Breakdown with Deltas */}
                <div className="grid grid-cols-4 gap-4 mt-4">
                  {(['budget', 'authority', 'need', 'timeline'] as const).map((dimension) => {
                    const currentScore = latest[`${dimension}_score` as keyof BANTAnalysis] as number
                    const previousScore = previous ? (previous[`${dimension}_score` as keyof BANTAnalysis] as number) : null
                    const delta = previousScore !== null ? getDelta(currentScore, previousScore) : null

                    return (
                      <div key={dimension} className="text-center">
                        <p className="text-xs text-zinc-500 uppercase tracking-wide">{dimension}</p>
                        <p className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">{currentScore}</p>
                        {delta && (
                          <p className={`text-xs ${delta.color}`}>{delta.display}</p>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Toggle for Trend View */}
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-medium text-zinc-900 dark:text-zinc-100">
                  Analysis History ({analyses.length})
                </h3>
                <label className="flex items-center gap-2 cursor-pointer">
                  <span className="text-sm text-zinc-500">Trend View</span>
                  <input
                    type="checkbox"
                    checked={showTrend}
                    onChange={(e) => setShowTrend(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                </label>
              </div>

              {showTrend ? (
                /* Trend Chart */
                <div className="border border-zinc-200 dark:border-zinc-700 rounded-lg p-4">
                  <div className="h-32 flex items-end gap-2">
                    {[...analyses].reverse().map((analysis, index, arr) => {
                      const heightPercent = (analysis.total_score / 100) * 100
                      const prev = arr[index - 1]
                      const isUp = prev ? analysis.total_score > prev.total_score : false
                      const isDown = prev ? analysis.total_score < prev.total_score : false

                      return (
                        <div key={analysis.bant_id} className="flex-1 flex flex-col items-center">
                          <div
                            className={`w-full rounded-t transition-all ${
                              isUp ? 'bg-green-500' : isDown ? 'bg-red-500' : 'bg-blue-500'
                            }`}
                            style={{ height: `${heightPercent}%` }}
                            title={`${analysis.total_score} on ${formatDate(analysis.analysis_date)}`}
                          />
                          <span className="text-xs text-zinc-500 mt-1">{analysis.total_score}</span>
                        </div>
                      )
                    })}
                  </div>
                  <div className="flex justify-between mt-2 text-xs text-zinc-400">
                    <span>{analyses.length > 0 ? formatDate(analyses[analyses.length - 1].analysis_date) : ''}</span>
                    <span>{analyses.length > 0 ? formatDate(analyses[0].analysis_date) : ''}</span>
                  </div>
                </div>
              ) : (
                /* List View */
                <div className="space-y-3">
                  {analyses.map((analysis, index) => {
                    const prev = analyses[index + 1]
                    const delta = prev ? getDelta(analysis.total_score, prev.total_score) : null

                    return (
                      <div
                        key={analysis.bant_id}
                        className="border border-zinc-200 dark:border-zinc-700 rounded-lg p-4"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-zinc-900 dark:text-zinc-100">
                                Score: {analysis.total_score}/100
                              </span>
                              {delta && (
                                <span className={`text-sm ${delta.color}`}>
                                  {delta.display}
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-zinc-500">
                              {formatDate(analysis.analysis_date)} via {analysis.analysis_source}
                            </p>
                          </div>
                          <span className={`px-2 py-1 rounded text-xs font-medium ${getQualificationColor(analysis.qualification_level)}`}>
                            {analysis.qualification_level.replace('_', ' ')}
                          </span>
                        </div>

                        <div className="grid grid-cols-4 gap-2 text-sm">
                          <div className="text-center p-2 bg-zinc-50 dark:bg-zinc-800 rounded">
                            <span className="text-zinc-500 text-xs">B</span>
                            <p className="font-medium">{analysis.budget_score}</p>
                          </div>
                          <div className="text-center p-2 bg-zinc-50 dark:bg-zinc-800 rounded">
                            <span className="text-zinc-500 text-xs">A</span>
                            <p className="font-medium">{analysis.authority_score}</p>
                          </div>
                          <div className="text-center p-2 bg-zinc-50 dark:bg-zinc-800 rounded">
                            <span className="text-zinc-500 text-xs">N</span>
                            <p className="font-medium">{analysis.need_score}</p>
                          </div>
                          <div className="text-center p-2 bg-zinc-50 dark:bg-zinc-800 rounded">
                            <span className="text-zinc-500 text-xs">T</span>
                            <p className="font-medium">{analysis.timeline_score}</p>
                          </div>
                        </div>

                        {(analysis.key_gaps || analysis.recommended_actions) && (
                          <div className="mt-3 pt-3 border-t border-zinc-100 dark:border-zinc-800 text-sm">
                            {analysis.key_gaps && (
                              <p className="text-zinc-600 dark:text-zinc-400">
                                <span className="font-medium">Gaps:</span> {analysis.key_gaps}
                              </p>
                            )}
                            {analysis.recommended_actions && (
                              <p className="text-zinc-600 dark:text-zinc-400 mt-1">
                                <span className="font-medium">Actions:</span> {analysis.recommended_actions}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
