'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface Pursuit {
  pursuit_id?: string
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
}

interface PursuitModalProps {
  isOpen: boolean
  onClose: () => void
  accountPlanId: string
  pursuit?: Pursuit | null
}

const STAGES = [
  'Discovery', 'Qualification', 'Demo', 'Proposal', 'Negotiation', 'Closed_Won', 'Closed_Lost'
]

export function PursuitModal({ isOpen, onClose, accountPlanId, pursuit }: PursuitModalProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const isEditing = !!pursuit?.pursuit_id

  const [formData, setFormData] = useState({
    name: '',
    estimated_value: '',
    confirmed_value: '',
    stage: 'Discovery',
    probability: '',
    target_close_date: '',
    pursuit_strategy: '',
    pursuit_owner: '',
    competitive_notes: '',
  })

  useEffect(() => {
    if (pursuit) {
      setFormData({
        name: pursuit.name || '',
        estimated_value: pursuit.estimated_value?.toString() || '',
        confirmed_value: pursuit.confirmed_value?.toString() || '',
        stage: pursuit.stage || 'Discovery',
        probability: pursuit.probability?.toString() || '',
        target_close_date: pursuit.target_close_date?.split('T')[0] || '',
        pursuit_strategy: pursuit.pursuit_strategy || '',
        pursuit_owner: pursuit.pursuit_owner || '',
        competitive_notes: pursuit.competitive_notes || '',
      })
    } else {
      setFormData({
        name: '',
        estimated_value: '',
        confirmed_value: '',
        stage: 'Discovery',
        probability: '',
        target_close_date: '',
        pursuit_strategy: '',
        pursuit_owner: '',
        competitive_notes: '',
      })
    }
  }, [pursuit])

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    const supabase = createClient()

    const data: Record<string, unknown> = {
      account_plan_id: accountPlanId,
      name: formData.name,
      stage: formData.stage,
    }

    if (formData.estimated_value) data.estimated_value = parseFloat(formData.estimated_value)
    if (formData.confirmed_value) data.confirmed_value = parseFloat(formData.confirmed_value)
    if (formData.probability) data.probability = parseInt(formData.probability)
    if (formData.target_close_date) data.target_close_date = formData.target_close_date
    if (formData.pursuit_strategy) data.pursuit_strategy = formData.pursuit_strategy
    if (formData.pursuit_owner) data.pursuit_owner = formData.pursuit_owner
    if (formData.competitive_notes) data.competitive_notes = formData.competitive_notes

    let result
    if (isEditing) {
      result = await supabase
        .from('pursuits')
        .update(data)
        .eq('pursuit_id', pursuit!.pursuit_id)
    } else {
      result = await supabase
        .from('pursuits')
        .insert(data)
    }

    setIsSubmitting(false)

    if (result.error) {
      setError(result.error.message)
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
            {isEditing ? 'Edit Pursuit' : 'New Pursuit'}
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
              Pursuit Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="e.g., 2026 Platform Expansion"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Estimated Value
              </label>
              <input
                type="number"
                name="estimated_value"
                value={formData.estimated_value}
                onChange={handleChange}
                min="0"
                step="1000"
                className="w-full px-3 py-2 rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="500000"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Confirmed Value
              </label>
              <input
                type="number"
                name="confirmed_value"
                value={formData.confirmed_value}
                onChange={handleChange}
                min="0"
                step="1000"
                className="w-full px-3 py-2 rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Customer confirmed"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Stage <span className="text-red-500">*</span>
              </label>
              <select
                name="stage"
                value={formData.stage}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {STAGES.map(stage => (
                  <option key={stage} value={stage}>{stage.replace('_', ' ')}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Probability (%)
              </label>
              <input
                type="number"
                name="probability"
                value={formData.probability}
                onChange={handleChange}
                min="0"
                max="100"
                className="w-full px-3 py-2 rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="60"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Target Close Date
              </label>
              <input
                type="date"
                name="target_close_date"
                value={formData.target_close_date}
                onChange={handleChange}
                className="w-full px-3 py-2 rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Owner
              </label>
              <input
                type="text"
                name="pursuit_owner"
                value={formData.pursuit_owner}
                onChange={handleChange}
                className="w-full px-3 py-2 rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="John Smith"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Pursuit Strategy
            </label>
            <textarea
              name="pursuit_strategy"
              value={formData.pursuit_strategy}
              onChange={handleChange}
              rows={2}
              className="w-full px-3 py-2 rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Key strategy for winning this deal..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Competitive Notes
            </label>
            <textarea
              name="competitive_notes"
              value={formData.competitive_notes}
              onChange={handleChange}
              rows={2}
              className="w-full px-3 py-2 rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Competitor intelligence..."
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
              disabled={isSubmitting || !formData.name}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed rounded-md transition-colors"
            >
              {isSubmitting ? 'Saving...' : isEditing ? 'Save Changes' : 'Create Pursuit'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
