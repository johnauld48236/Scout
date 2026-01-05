'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface AccountPlan {
  account_plan_id: string
  account_name: string
  account_type: string
  vertical?: string
  lifecycle_stage?: string
  health_score?: number
  account_owner?: string
  strategic_summary?: string
  current_arr?: number
}

interface EditAccountModalProps {
  isOpen: boolean
  onClose: () => void
  account: AccountPlan
}

const ACCOUNT_TYPES = ['Prospect', 'Customer', 'Partner', 'Former_Customer']
const VERTICALS = ['Automotive', 'Medical', 'Industrial', 'Aerospace', 'Consumer_Electronics', 'Other']
const LIFECYCLE_STAGES = [
  'Identified', 'Researching', 'Qualified', 'Prospecting', 'Discovery',
  'Evaluation', 'Negotiation', 'Closed_Won', 'Closed_Lost', 'Onboarding',
  'Live', 'Expansion', 'Renewal', 'At_Risk', 'Churned'
]

export function EditAccountModal({ isOpen, onClose, account }: EditAccountModalProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    account_name: '',
    account_type: 'Prospect',
    vertical: '',
    lifecycle_stage: '',
    health_score: '',
    account_owner: '',
    strategic_summary: '',
    current_arr: '',
  })

  useEffect(() => {
    if (account) {
      setFormData({
        account_name: account.account_name || '',
        account_type: account.account_type || 'Prospect',
        vertical: account.vertical || '',
        lifecycle_stage: account.lifecycle_stage || '',
        health_score: account.health_score?.toString() || '',
        account_owner: account.account_owner || '',
        strategic_summary: account.strategic_summary || '',
        current_arr: account.current_arr?.toString() || '',
      })
    }
  }, [account])

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    const supabase = createClient()

    const updateData: Record<string, unknown> = {
      account_name: formData.account_name,
      account_type: formData.account_type,
    }

    if (formData.vertical) updateData.vertical = formData.vertical
    if (formData.lifecycle_stage) updateData.lifecycle_stage = formData.lifecycle_stage
    if (formData.health_score) updateData.health_score = parseInt(formData.health_score)
    if (formData.account_owner) updateData.account_owner = formData.account_owner
    if (formData.strategic_summary) updateData.strategic_summary = formData.strategic_summary
    if (formData.current_arr) updateData.current_arr = parseFloat(formData.current_arr)

    const { error: updateError } = await supabase
      .from('account_plans')
      .update(updateData)
      .eq('account_plan_id', account.account_plan_id)

    setIsSubmitting(false)

    if (updateError) {
      setError(updateError.message)
      return
    }

    onClose()
    router.refresh()
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      <div className="relative bg-white dark:bg-zinc-900 rounded-lg shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-zinc-200 dark:border-zinc-700">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            Edit Account Plan
          </h2>
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
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
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
                <option value="">Select...</option>
                {VERTICALS.map(v => (
                  <option key={v} value={v}>{v.replace('_', ' ')}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
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
                <option value="">Select...</option>
                {LIFECYCLE_STAGES.map(stage => (
                  <option key={stage} value={stage}>{stage.replace('_', ' ')}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Health Score
              </label>
              <input
                type="number"
                name="health_score"
                value={formData.health_score}
                onChange={handleChange}
                min="0"
                max="100"
                className="w-full px-3 py-2 rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
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
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Current ARR
              </label>
              <input
                type="number"
                name="current_arr"
                value={formData.current_arr}
                onChange={handleChange}
                min="0"
                step="1000"
                className="w-full px-3 py-2 rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="0"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Strategic Summary
            </label>
            <textarea
              name="strategic_summary"
              value={formData.strategic_summary}
              onChange={handleChange}
              rows={3}
              className="w-full px-3 py-2 rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
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
              disabled={isSubmitting || !formData.account_name}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed rounded-md transition-colors"
            >
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
