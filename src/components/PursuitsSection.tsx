'use client'

import { useState } from 'react'
import { PursuitModal } from './PursuitModal'
import { QualificationModal } from './QualificationModal'
import { QualificationHistory } from './QualificationHistory'

interface BANTAnalysis {
  bant_id: string
  total_score: number
  qualification_level: string
  analysis_date: string
}

interface Pursuit {
  pursuit_id: string
  account_plan_id: string
  name: string
  estimated_value?: number
  confirmed_value?: number
  stage: string
  probability?: number
  target_close_date?: string
  pursuit_strategy?: string
  pursuit_owner?: string
  competitive_notes?: string
  latest_bant?: BANTAnalysis | null
}

interface PursuitsSectionProps {
  accountPlanId: string
  pursuits: Pursuit[]
}

export function PursuitsSection({ accountPlanId, pursuits }: PursuitsSectionProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingPursuit, setEditingPursuit] = useState<Pursuit | null>(null)
  const [bantPursuit, setBantPursuit] = useState<Pursuit | null>(null)
  const [historyPursuit, setHistoryPursuit] = useState<Pursuit | null>(null)
  const [historyRefreshKey, setHistoryRefreshKey] = useState(0)

  const handleEdit = (pursuit: Pursuit) => {
    setEditingPursuit(pursuit)
    setIsModalOpen(true)
  }

  const handleClose = () => {
    setIsModalOpen(false)
    setEditingPursuit(null)
  }

  const handleBANT = (pursuit: Pursuit) => {
    // If there's an existing BANT, show history; otherwise show create form
    if (pursuit.latest_bant) {
      setHistoryPursuit(pursuit)
    } else {
      setBantPursuit(pursuit)
    }
  }

  const handleNewFromHistory = () => {
    // Switch from history to new BANT form
    setBantPursuit(historyPursuit)
    setHistoryPursuit(null)
  }

  const handleCloseBant = () => {
    // Increment refresh key so history will re-fetch when opened again
    setHistoryRefreshKey(prev => prev + 1)
    setBantPursuit(null)
  }

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
          Pursuits ({pursuits.length})
        </h2>
        <button
          onClick={() => setIsModalOpen(true)}
          className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors"
        >
          + New Pursuit
        </button>
      </div>

      <div className="space-y-3">
        {pursuits.map((pursuit) => (
          <div
            key={pursuit.pursuit_id}
            className="rounded-lg bg-white dark:bg-zinc-900 p-4 border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors"
          >
            <div className="flex items-start justify-between mb-2">
              <h3 className="font-medium text-zinc-900 dark:text-zinc-100">{pursuit.name}</h3>
              <div className="flex items-center gap-2">
                <span className={`px-2 py-1 rounded text-xs font-medium ${
                  pursuit.stage === 'Closed_Won' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                  pursuit.stage === 'Closed_Lost' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                  'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                }`}>
                  {pursuit.stage.replace('_', ' ')}
                </span>
                <button
                  onClick={() => handleEdit(pursuit)}
                  className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="grid grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-zinc-500 dark:text-zinc-400">Value</p>
                <p className="font-medium text-zinc-900 dark:text-zinc-100">
                  ${(pursuit.estimated_value || pursuit.confirmed_value || 0).toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-zinc-500 dark:text-zinc-400">Probability</p>
                <p className="font-medium text-zinc-900 dark:text-zinc-100">
                  {pursuit.probability || 0}%
                </p>
              </div>
              <div>
                <p className="text-zinc-500 dark:text-zinc-400">Close Date</p>
                <p className="font-medium text-zinc-900 dark:text-zinc-100">
                  {pursuit.target_close_date ? new Date(pursuit.target_close_date).toLocaleDateString() : '-'}
                </p>
              </div>
              <div>
                <p className="text-zinc-500 dark:text-zinc-400">Qualification</p>
                <button
                  onClick={() => handleBANT(pursuit)}
                  className={`font-medium ${
                    pursuit.latest_bant
                      ? pursuit.latest_bant.total_score >= 75 ? 'text-green-600' :
                        pursuit.latest_bant.total_score >= 50 ? 'text-blue-600' :
                        pursuit.latest_bant.total_score >= 25 ? 'text-yellow-600' : 'text-red-600'
                      : 'text-zinc-400 hover:text-blue-600'
                  }`}
                >
                  {pursuit.latest_bant ? `${pursuit.latest_bant.total_score}` : '+ Add'}
                </button>
              </div>
            </div>
            {pursuit.pursuit_strategy && (
              <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400 border-t border-zinc-100 dark:border-zinc-800 pt-3">
                <span className="font-medium">Strategy:</span> {pursuit.pursuit_strategy.slice(0, 150)}
                {pursuit.pursuit_strategy.length > 150 && '...'}
              </p>
            )}
          </div>
        ))}
        {pursuits.length === 0 && (
          <p className="text-zinc-500 dark:text-zinc-400 text-sm py-4">No active pursuits</p>
        )}
      </div>

      <PursuitModal
        isOpen={isModalOpen}
        onClose={handleClose}
        accountPlanId={accountPlanId}
        pursuit={editingPursuit}
      />

      {bantPursuit && (
        <QualificationModal
          isOpen={!!bantPursuit}
          onClose={handleCloseBant}
          pursuitId={bantPursuit.pursuit_id}
          pursuitName={bantPursuit.name}
        />
      )}

      {historyPursuit && (
        <QualificationHistory
          key={`${historyPursuit.pursuit_id}-${historyRefreshKey}`}
          pursuitId={historyPursuit.pursuit_id}
          pursuitName={historyPursuit.name}
          onClose={() => setHistoryPursuit(null)}
          onNewAnalysis={handleNewFromHistory}
        />
      )}
    </section>
  )
}
