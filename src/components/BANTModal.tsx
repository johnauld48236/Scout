'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface BANTModalProps {
  isOpen: boolean
  onClose: () => void
  pursuitId: string
  pursuitName: string
}

type ScoreValue = 25 | 15 | 0

interface BANTScores {
  budget_score: ScoreValue
  budget_evidence: string
  budget_notes: string
  authority_score: ScoreValue
  authority_evidence: string
  authority_notes: string
  need_score: ScoreValue
  need_evidence: string
  need_notes: string
  timeline_score: ScoreValue
  timeline_evidence: string
  timeline_notes: string
  analysis_source: string
  key_gaps: string
  recommended_actions: string
}

const ANALYSIS_SOURCES = ['Call', 'Email', 'Meeting', 'Research', 'Demo', 'Other']

function getQualificationLevel(score: number): { level: string; color: string } {
  if (score >= 75) return { level: 'Highly Qualified', color: 'text-green-600' }
  if (score >= 50) return { level: 'Qualified', color: 'text-blue-600' }
  if (score >= 25) return { level: 'Developing', color: 'text-yellow-600' }
  return { level: 'Unqualified', color: 'text-red-600' }
}

// Moved outside to prevent recreation on each render
function ScoreSection({
  title,
  scoreField,
  evidenceField,
  notesField,
  helpText,
  scores,
  onScoreChange,
  onTextChange,
}: {
  title: string
  scoreField: 'budget_score' | 'authority_score' | 'need_score' | 'timeline_score'
  evidenceField: 'budget_evidence' | 'authority_evidence' | 'need_evidence' | 'timeline_evidence'
  notesField: 'budget_notes' | 'authority_notes' | 'need_notes' | 'timeline_notes'
  helpText: string
  scores: BANTScores
  onScoreChange: (field: keyof BANTScores, value: ScoreValue) => void
  onTextChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void
}) {
  return (
    <div className="border-b border-zinc-200 dark:border-zinc-700 pb-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-medium text-zinc-900 dark:text-zinc-100">{title}</h3>
        <span className="text-xs text-zinc-500">{helpText}</span>
      </div>
      <div className="flex gap-4 mb-3">
        {([25, 15, 0] as ScoreValue[]).map((value) => (
          <label key={value} className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name={scoreField}
              checked={scores[scoreField] === value}
              onChange={() => onScoreChange(scoreField, value)}
              className="w-4 h-4 text-blue-600"
            />
            <span className={`text-sm ${
              value === 25 ? 'text-green-600 font-medium' :
              value === 15 ? 'text-yellow-600 font-medium' :
              'text-zinc-500'
            }`}>
              {value === 25 ? '25 (Yes)' : value === 15 ? '15 (Partial)' : '0 (No/Unknown)'}
            </span>
          </label>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-zinc-500 dark:text-zinc-400 mb-1">Evidence</label>
          <input
            type="text"
            name={evidenceField}
            value={scores[evidenceField]}
            onChange={onTextChange}
            placeholder="What did they say?"
            className="w-full px-2 py-1.5 text-sm rounded border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
          />
        </div>
        <div>
          <label className="block text-xs text-zinc-500 dark:text-zinc-400 mb-1">Notes</label>
          <input
            type="text"
            name={notesField}
            value={scores[notesField]}
            onChange={onTextChange}
            placeholder="Your interpretation"
            className="w-full px-2 py-1.5 text-sm rounded border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
          />
        </div>
      </div>
    </div>
  )
}

export function BANTModal({ isOpen, onClose, pursuitId, pursuitName }: BANTModalProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [scores, setScores] = useState<BANTScores>({
    budget_score: 0,
    budget_evidence: '',
    budget_notes: '',
    authority_score: 0,
    authority_evidence: '',
    authority_notes: '',
    need_score: 0,
    need_evidence: '',
    need_notes: '',
    timeline_score: 0,
    timeline_evidence: '',
    timeline_notes: '',
    analysis_source: 'Call',
    key_gaps: '',
    recommended_actions: '',
  })

  if (!isOpen) return null

  const totalScore = scores.budget_score + scores.authority_score + scores.need_score + scores.timeline_score
  const qualification = getQualificationLevel(totalScore)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    const supabase = createClient()

    const { error: insertError } = await supabase
      .from('bant_analyses')
      .insert({
        pursuit_id: pursuitId,
        analysis_date: new Date().toISOString(),
        budget_score: scores.budget_score,
        budget_evidence: scores.budget_evidence || null,
        budget_notes: scores.budget_notes || null,
        authority_score: scores.authority_score,
        authority_evidence: scores.authority_evidence || null,
        authority_notes: scores.authority_notes || null,
        need_score: scores.need_score,
        need_evidence: scores.need_evidence || null,
        need_notes: scores.need_notes || null,
        timeline_score: scores.timeline_score,
        timeline_evidence: scores.timeline_evidence || null,
        timeline_notes: scores.timeline_notes || null,
        analysis_source: scores.analysis_source,
        key_gaps: scores.key_gaps || null,
        recommended_actions: scores.recommended_actions || null,
      })

    setIsSubmitting(false)

    if (insertError) {
      setError(insertError.message)
      return
    }

    onClose()
    router.refresh()
  }

  const handleScoreChange = (field: keyof BANTScores, value: ScoreValue) => {
    setScores(prev => ({ ...prev, [field]: value }))
  }

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setScores(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      <div className="relative bg-white dark:bg-zinc-900 rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-zinc-200 dark:border-zinc-700">
          <div>
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              BANT Analysis
            </h2>
            <p className="text-sm text-zinc-500">{pursuitName}</p>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {error && (
            <div className="p-3 rounded-md bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 text-sm">
              {error}
            </div>
          )}

          <ScoreSection
            title="BUDGET"
            scoreField="budget_score"
            evidenceField="budget_evidence"
            notesField="budget_notes"
            helpText="Is there approved budget?"
            scores={scores}
            onScoreChange={handleScoreChange}
            onTextChange={handleTextChange}
          />

          <ScoreSection
            title="AUTHORITY"
            scoreField="authority_score"
            evidenceField="authority_evidence"
            notesField="authority_notes"
            helpText="Are we talking to decision makers?"
            scores={scores}
            onScoreChange={handleScoreChange}
            onTextChange={handleTextChange}
          />

          <ScoreSection
            title="NEED"
            scoreField="need_score"
            evidenceField="need_evidence"
            notesField="need_notes"
            helpText="Is there a compelling business need?"
            scores={scores}
            onScoreChange={handleScoreChange}
            onTextChange={handleTextChange}
          />

          <ScoreSection
            title="TIMELINE"
            scoreField="timeline_score"
            evidenceField="timeline_evidence"
            notesField="timeline_notes"
            helpText="Is there urgency to act?"
            scores={scores}
            onScoreChange={handleScoreChange}
            onTextChange={handleTextChange}
          />

          {/* Total Score */}
          <div className="bg-zinc-50 dark:bg-zinc-800 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Total Score</span>
              <div className="text-right">
                <span className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{totalScore}</span>
                <span className="text-zinc-500">/100</span>
                <p className={`text-sm font-medium ${qualification.color}`}>
                  {qualification.level}
                </p>
              </div>
            </div>
          </div>

          {/* Additional Fields */}
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Analysis Source
              </label>
              <select
                name="analysis_source"
                value={scores.analysis_source}
                onChange={handleTextChange}
                className="w-full px-3 py-2 rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
              >
                {ANALYSIS_SOURCES.map(source => (
                  <option key={source} value={source}>{source}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Key Gaps
              </label>
              <textarea
                name="key_gaps"
                value={scores.key_gaps}
                onChange={handleTextChange}
                rows={2}
                placeholder="What needs to be addressed?"
                className="w-full px-3 py-2 rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Recommended Actions
              </label>
              <textarea
                name="recommended_actions"
                value={scores.recommended_actions}
                onChange={handleTextChange}
                rows={2}
                placeholder="Next steps to improve qualification..."
                className="w-full px-3 py-2 rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-zinc-200 dark:border-zinc-700">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed rounded-md transition-colors"
            >
              {isSubmitting ? 'Saving...' : 'Save BANT Analysis'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
