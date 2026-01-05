'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { AIResearchModal } from './ai/AIResearchModal'
import type { ResearchFinding } from '@/lib/ai/context/types'

interface AccountPlanModalProps {
  isOpen: boolean
  onClose: () => void
}

function SparklesIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
    </svg>
  )
}

const ACCOUNT_TYPES = ['Prospect', 'Customer', 'Partner', 'Former_Customer']
const VERTICALS = ['Automotive', 'Medical', 'Industrial', 'Aerospace', 'Consumer_Electronics', 'Other']
const LIFECYCLE_STAGES = [
  'Identified', 'Researching', 'Qualified', 'Prospecting', 'Discovery',
  'Evaluation', 'Negotiation', 'Closed_Won', 'Closed_Lost', 'Onboarding',
  'Live', 'Expansion', 'Renewal', 'At_Risk', 'Churned'
]

export function AccountPlanModal({ isOpen, onClose }: AccountPlanModalProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isResearchModalOpen, setIsResearchModalOpen] = useState(false)
  const [researchFindings, setResearchFindings] = useState<ResearchFinding[]>([])

  const [formData, setFormData] = useState({
    account_name: '',
    domain: '',
    account_type: 'Prospect',
    vertical: '',
    lifecycle_stage: '',
    health_score: '',
    account_owner: '',
    strategic_summary: '',
  })

  const handleApplyResearch = (findings: ResearchFinding[]) => {
    setResearchFindings(findings)

    // Build strategic summary from findings
    const summaryParts: string[] = []

    for (const finding of findings) {
      const content = finding.editedContent || finding.content
      summaryParts.push(`**${finding.categoryName}**: ${content}`)
    }

    if (summaryParts.length > 0) {
      setFormData(prev => ({
        ...prev,
        strategic_summary: prev.strategic_summary
          ? `${prev.strategic_summary}\n\n---\n\n## AI Research Findings\n\n${summaryParts.join('\n\n')}`
          : `## AI Research Findings\n\n${summaryParts.join('\n\n')}`
      }))
    }
  }

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    const supabase = createClient()

    const insertData: Record<string, unknown> = {
      account_name: formData.account_name,
      account_type: formData.account_type,
    }

    // Only add optional fields if they have values
    if (formData.lifecycle_stage) insertData.lifecycle_stage = formData.lifecycle_stage
    if (formData.vertical) insertData.vertical = formData.vertical
    if (formData.health_score) insertData.health_score = parseInt(formData.health_score)
    if (formData.account_owner) insertData.account_owner = formData.account_owner
    if (formData.strategic_summary) insertData.strategic_summary = formData.strategic_summary

    const { data, error: insertError } = await supabase
      .from('account_plans')
      .insert(insertData)
      .select('account_plan_id')
      .single()

    setIsSubmitting(false)

    if (insertError) {
      setError(insertError.message)
      return
    }

    if (data) {
      onClose()
      router.push(`/accounts/${data.account_plan_id}`)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white dark:bg-zinc-900 rounded-lg shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-zinc-200 dark:border-zinc-700">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            New Account Plan
          </h2>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
          >
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

          {/* Account Name */}
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Account Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="account_name"
              value={formData.account_name}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="e.g., Acme Corporation"
            />
          </div>

          {/* Domain */}
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Company Website
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                name="domain"
                value={formData.domain}
                onChange={handleChange}
                className="flex-1 px-3 py-2 rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., acme.com"
              />
              <button
                type="button"
                onClick={() => setIsResearchModalOpen(true)}
                disabled={!formData.account_name.trim()}
                className="px-4 py-2 text-sm font-medium rounded-md bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-all"
              >
                <SparklesIcon className="w-4 h-4" />
                AI Research
              </button>
            </div>
            <p className="mt-1 text-xs text-zinc-500">Optional: helps AI research find more accurate info</p>
          </div>

          {/* Research Applied Indicator */}
          {researchFindings.length > 0 && (
            <div className="p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-900/50">
              <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
                <SparklesIcon className="w-4 h-4" />
                <span className="text-sm font-medium">
                  {researchFindings.length} research finding{researchFindings.length !== 1 ? 's' : ''} applied
                </span>
              </div>
            </div>
          )}

          {/* Account Type */}
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Account Type
            </label>
            <select
              name="account_type"
              value={formData.account_type}
              onChange={handleChange}
              className="w-full px-3 py-2 rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {ACCOUNT_TYPES.map(type => (
                <option key={type} value={type}>{type.replace('_', ' ')}</option>
              ))}
            </select>
          </div>

          {/* Vertical */}
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Vertical
            </label>
            <select
              name="vertical"
              value={formData.vertical}
              onChange={handleChange}
              className="w-full px-3 py-2 rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Select vertical...</option>
              {VERTICALS.map(v => (
                <option key={v} value={v}>{v.replace('_', ' ')}</option>
              ))}
            </select>
          </div>

          {/* Lifecycle Stage */}
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Lifecycle Stage
            </label>
            <select
              name="lifecycle_stage"
              value={formData.lifecycle_stage}
              onChange={handleChange}
              className="w-full px-3 py-2 rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Select stage...</option>
              {LIFECYCLE_STAGES.map(stage => (
                <option key={stage} value={stage}>{stage.replace('_', ' ')}</option>
              ))}
            </select>
          </div>

          {/* Health Score */}
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Health Score (0-100)
            </label>
            <input
              type="number"
              name="health_score"
              value={formData.health_score}
              onChange={handleChange}
              min="0"
              max="100"
              className="w-full px-3 py-2 rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="e.g., 75"
            />
          </div>

          {/* Account Owner */}
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Account Owner
            </label>
            <input
              type="text"
              name="account_owner"
              value={formData.account_owner}
              onChange={handleChange}
              className="w-full px-3 py-2 rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="e.g., John Smith"
            />
          </div>

          {/* Strategic Summary */}
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Strategic Summary
              {researchFindings.length > 0 && (
                <span className="ml-2 text-xs text-blue-600 dark:text-blue-400 font-normal">
                  (includes AI research)
                </span>
              )}
            </label>
            <textarea
              name="strategic_summary"
              value={formData.strategic_summary}
              onChange={handleChange}
              rows={researchFindings.length > 0 ? 8 : 3}
              className="w-full px-3 py-2 rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Key strategic notes about this account..."
            />
          </div>

          {/* Actions */}
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
              disabled={isSubmitting || !formData.account_name}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed rounded-md transition-colors"
            >
              {isSubmitting ? 'Creating...' : 'Create Account Plan'}
            </button>
          </div>
        </form>
      </div>

      {/* AI Research Modal */}
      <AIResearchModal
        isOpen={isResearchModalOpen}
        onClose={() => setIsResearchModalOpen(false)}
        companyName={formData.account_name}
        domain={formData.domain || undefined}
        onApplyResearch={handleApplyResearch}
      />
    </div>
  )
}
