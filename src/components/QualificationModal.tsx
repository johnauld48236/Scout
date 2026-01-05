'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { SALES_METHODOLOGIES, SalesMethodologyType } from '@/lib/ai/context/company-profile'

interface QualificationModalProps {
  isOpen: boolean
  onClose: () => void
  pursuitId: string
  pursuitName: string
}

type ScoreValue = 25 | 15 | 0

interface CriterionScore {
  score: ScoreValue
  evidence: string
  notes: string
}

const ANALYSIS_SOURCES = ['Call', 'Email', 'Meeting', 'Research', 'Demo', 'Other']

// Help text for each criterion
const CRITERION_HELP: Record<string, string> = {
  // BANT
  'Budget': 'Is there approved budget?',
  'Authority': 'Are we talking to decision makers?',
  'Need': 'Is there a compelling business need?',
  'Timeline': 'Is there urgency to act?',
  // MEDDICC/MEDDPICC
  'Metrics': 'What quantifiable value will they achieve?',
  'Economic Buyer': 'Who controls the budget?',
  'Decision Criteria': 'What factors will drive their decision?',
  'Decision Process': 'How will they evaluate and decide?',
  'Paper Process': 'What procurement/legal steps are needed?',
  'Identify Pain': 'What problem are they trying to solve?',
  'Champion': 'Who is advocating for us internally?',
  'Competition': 'Who else are they evaluating?',
  // SPIN
  'Situation': 'Current state and context understood?',
  'Problem': 'Key problems clearly identified?',
  'Implication': 'Impact of problems understood?',
  'Need-Payoff': 'Value of solution recognized?',
  // Challenger
  'Teaching Insight': 'Have we shared unique insights?',
  'Tailored Message': 'Is messaging specific to them?',
  'Taking Control': 'Are we leading the conversation?',
}

function getQualificationLevel(score: number, maxScore: number): { level: string; color: string } {
  const percent = (score / maxScore) * 100
  if (percent >= 75) return { level: 'Highly Qualified', color: 'text-green-600' }
  if (percent >= 50) return { level: 'Qualified', color: 'text-blue-600' }
  if (percent >= 25) return { level: 'Developing', color: 'text-yellow-600' }
  return { level: 'Unqualified', color: 'text-red-600' }
}

function CriterionSection({
  criterion,
  score,
  helpText,
  onChange,
}: {
  criterion: string
  score: CriterionScore
  helpText: string
  onChange: (score: CriterionScore) => void
}) {
  return (
    <div className="border-b border-zinc-200 dark:border-zinc-700 pb-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-medium text-zinc-900 dark:text-zinc-100">{criterion.toUpperCase()}</h3>
        <span className="text-xs text-zinc-500">{helpText}</span>
      </div>
      <div className="flex gap-4 mb-3">
        {([25, 15, 0] as ScoreValue[]).map((value) => (
          <label key={value} className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name={`score-${criterion}`}
              checked={score.score === value}
              onChange={() => onChange({ ...score, score: value })}
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
            value={score.evidence}
            onChange={(e) => onChange({ ...score, evidence: e.target.value })}
            placeholder="What did they say?"
            className="w-full px-2 py-1.5 text-sm rounded border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
          />
        </div>
        <div>
          <label className="block text-xs text-zinc-500 dark:text-zinc-400 mb-1">Notes</label>
          <input
            type="text"
            value={score.notes}
            onChange={(e) => onChange({ ...score, notes: e.target.value })}
            placeholder="Your interpretation"
            className="w-full px-2 py-1.5 text-sm rounded border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
          />
        </div>
      </div>
    </div>
  )
}

export function QualificationModal({ isOpen, onClose, pursuitId, pursuitName }: QualificationModalProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const [methodology, setMethodology] = useState<SalesMethodologyType>('BANT')
  const [criteria, setCriteria] = useState<string[]>([])
  const [scores, setScores] = useState<Record<string, CriterionScore>>({})
  const [analysisSource, setAnalysisSource] = useState('Call')
  const [keyGaps, setKeyGaps] = useState('')
  const [recommendedActions, setRecommendedActions] = useState('')

  useEffect(() => {
    loadMethodology()
  }, [])

  const loadMethodology = async () => {
    try {
      const res = await fetch('/api/settings/company-profile')
      const data = await res.json()

      const method = (data.profile?.sales_methodology || 'BANT') as SalesMethodologyType
      setMethodology(method)

      let criteriaList: string[]
      if (method === 'Custom' && data.profile?.custom_methodology_criteria?.length > 0) {
        criteriaList = [...data.profile.custom_methodology_criteria]
      } else {
        criteriaList = [...SALES_METHODOLOGIES[method].criteria]
      }

      setCriteria(criteriaList)

      // Initialize scores for each criterion
      const initialScores: Record<string, CriterionScore> = {}
      criteriaList.forEach(c => {
        initialScores[c] = { score: 0, evidence: '', notes: '' }
      })
      setScores(initialScores)
    } catch (err) {
      console.error('Failed to load methodology:', err)
      // Default to BANT
      const bantCriteria = [...SALES_METHODOLOGIES.BANT.criteria]
      setCriteria(bantCriteria)
      const initialScores: Record<string, CriterionScore> = {}
      bantCriteria.forEach(c => {
        initialScores[c] = { score: 0, evidence: '', notes: '' }
      })
      setScores(initialScores)
    }
    setLoading(false)
  }

  if (!isOpen) return null

  const totalScore = Object.values(scores).reduce((sum, s) => sum + s.score, 0)
  const maxScore = criteria.length * 25
  const qualification = getQualificationLevel(totalScore, maxScore)

  const handleCriterionChange = (criterion: string, score: CriterionScore) => {
    setScores(prev => ({ ...prev, [criterion]: score }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    const supabase = createClient()

    // For BANT methodology, use the legacy columns for backward compatibility
    const isBANT = methodology === 'BANT'

    const insertData: Record<string, unknown> = {
      pursuit_id: pursuitId,
      analysis_date: new Date().toISOString(),
      methodology,
      analysis_source: analysisSource,
      key_gaps: keyGaps || null,
      recommended_actions: recommendedActions || null,
    }

    if (isBANT) {
      // Use legacy BANT columns
      insertData.budget_score = scores['Budget']?.score || 0
      insertData.budget_evidence = scores['Budget']?.evidence || null
      insertData.budget_notes = scores['Budget']?.notes || null
      insertData.authority_score = scores['Authority']?.score || 0
      insertData.authority_evidence = scores['Authority']?.evidence || null
      insertData.authority_notes = scores['Authority']?.notes || null
      insertData.need_score = scores['Need']?.score || 0
      insertData.need_evidence = scores['Need']?.evidence || null
      insertData.need_notes = scores['Need']?.notes || null
      insertData.timeline_score = scores['Timeline']?.score || 0
      insertData.timeline_evidence = scores['Timeline']?.evidence || null
      insertData.timeline_notes = scores['Timeline']?.notes || null
    } else {
      // Store in generic criteria_scores JSONB
      insertData.criteria_scores = scores
      // Also set BANT columns to 0 for total_score calculation (handled by DB trigger)
      insertData.budget_score = 0
      insertData.authority_score = 0
      insertData.need_score = 0
      insertData.timeline_score = 0
    }

    const { error: insertError } = await supabase
      .from('bant_analyses')
      .insert(insertData)

    setIsSubmitting(false)

    if (insertError) {
      setError(insertError.message)
      return
    }

    onClose()
    router.refresh()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      <div className="relative bg-white dark:bg-zinc-900 rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-zinc-200 dark:border-zinc-700">
          <div>
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              {SALES_METHODOLOGIES[methodology].name} Analysis
            </h2>
            <p className="text-sm text-zinc-500">{pursuitName}</p>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {loading ? (
          <div className="p-8 text-center text-zinc-500">Loading methodology...</div>
        ) : (
          <form onSubmit={handleSubmit} className="p-4 space-y-4">
            {error && (
              <div className="p-3 rounded-md bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 text-sm">
                {error}
              </div>
            )}

            {/* Methodology indicator */}
            <div className="flex items-center gap-2 text-sm text-zinc-500 bg-zinc-50 dark:bg-zinc-800 rounded-lg px-3 py-2">
              <span>Using</span>
              <span className="font-medium text-zinc-700 dark:text-zinc-300">
                {SALES_METHODOLOGIES[methodology].fullName}
              </span>
            </div>

            {/* Dynamic Criteria Sections */}
            {criteria.map(criterion => (
              <CriterionSection
                key={criterion}
                criterion={criterion}
                score={scores[criterion] || { score: 0, evidence: '', notes: '' }}
                helpText={CRITERION_HELP[criterion] || 'Rate this criterion'}
                onChange={(score) => handleCriterionChange(criterion, score)}
              />
            ))}

            {/* Total Score */}
            <div className="bg-zinc-50 dark:bg-zinc-800 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Total Score</span>
                <div className="text-right">
                  <span className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{totalScore}</span>
                  <span className="text-zinc-500">/{maxScore}</span>
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
                  value={analysisSource}
                  onChange={(e) => setAnalysisSource(e.target.value)}
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
                  value={keyGaps}
                  onChange={(e) => setKeyGaps(e.target.value)}
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
                  value={recommendedActions}
                  onChange={(e) => setRecommendedActions(e.target.value)}
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
                {isSubmitting ? 'Saving...' : `Save ${SALES_METHODOLOGIES[methodology].name} Analysis`}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
