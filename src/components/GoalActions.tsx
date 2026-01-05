'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface Goal {
  goal_id: string
  name: string
  goal_type: string
  category: string | null
  vertical: string | null
  target_value: number
  target_year: number
  current_value: number
}

interface GoalActionsProps {
  goal: Goal
}

const VERTICALS = ['Medical', 'Automotive', 'Industrial', 'Technology', 'Financial Services', 'Other']

function formatCurrency(value: number): string {
  if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`
  if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`
  return `$${value}`
}

export function GoalActions({ goal }: GoalActionsProps) {
  const router = useRouter()
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    name: goal.name,
    category: goal.category || '',
    vertical: goal.vertical || '',
    target_value: goal.target_value.toString(),
    current_value: goal.current_value.toString(),
    target_year: goal.target_year,
  })

  const handleEdit = async () => {
    setIsSubmitting(true)
    setError(null)

    const supabase = createClient()

    const updates: Record<string, unknown> = {
      name: formData.name,
      target_value: parseFloat(formData.target_value),
      current_value: parseFloat(formData.current_value),
      target_year: formData.target_year,
      updated_at: new Date().toISOString(),
    }

    if (formData.category) updates.category = formData.category
    if (formData.vertical) updates.vertical = formData.vertical

    const { error: updateError } = await supabase
      .from('goals')
      .update(updates)
      .eq('goal_id', goal.goal_id)

    if (updateError) {
      setError(updateError.message)
      setIsSubmitting(false)
      return
    }

    setIsSubmitting(false)
    setShowEditModal(false)
    router.refresh()
  }

  const handleDelete = async () => {
    setIsSubmitting(true)
    setError(null)

    const supabase = createClient()

    // First delete related records
    await supabase.from('goal_progress').delete().eq('goal_id', goal.goal_id)
    await supabase.from('campaign_goals').delete().eq('goal_id', goal.goal_id)

    // Update any child goals to remove parent reference
    await supabase
      .from('goals')
      .update({ parent_goal_id: null })
      .eq('parent_goal_id', goal.goal_id)

    // Delete the goal
    const { error: deleteError } = await supabase
      .from('goals')
      .delete()
      .eq('goal_id', goal.goal_id)

    if (deleteError) {
      setError(deleteError.message)
      setIsSubmitting(false)
      return
    }

    setIsSubmitting(false)
    router.push('/goals')
    router.refresh()
  }

  return (
    <>
      {/* Action Buttons */}
      <div className="flex gap-2">
        <button
          onClick={() => setShowEditModal(true)}
          className="px-3 py-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-md transition-colors"
        >
          Edit
        </button>
        <button
          onClick={() => setShowDeleteModal(true)}
          className="px-3 py-1.5 text-sm font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/40 rounded-md transition-colors"
        >
          Delete
        </button>
      </div>

      {/* Edit Modal */}
      {showEditModal && (
        <>
          <div className="fixed inset-0 z-40 bg-black/50" onClick={() => setShowEditModal(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-xl w-full max-w-md">
              <div className="flex items-center justify-between p-4 border-b border-zinc-200 dark:border-zinc-700">
                <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Edit Goal</h2>
                <button onClick={() => setShowEditModal(false)} className="text-zinc-400 hover:text-zinc-600">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="p-4 space-y-4">
                {error && (
                  <div className="p-3 rounded-md bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 text-sm">
                    {error}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    Goal Name
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
                  />
                </div>

                {goal.goal_type === 'revenue' && (
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                      Category
                    </label>
                    <select
                      value={formData.category}
                      onChange={e => setFormData(prev => ({ ...prev, category: e.target.value }))}
                      className="w-full px-3 py-2 rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
                    >
                      <option value="">None</option>
                      <option value="new_arr">New ARR</option>
                      <option value="renewal">Renewal</option>
                      <option value="upsell">Upsell</option>
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    Vertical
                  </label>
                  <select
                    value={formData.vertical}
                    onChange={e => setFormData(prev => ({ ...prev, vertical: e.target.value }))}
                    className="w-full px-3 py-2 rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
                  >
                    <option value="">All verticals</option>
                    {VERTICALS.map(v => (
                      <option key={v} value={v}>{v}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                      Target {goal.goal_type === 'revenue' ? '($)' : ''}
                    </label>
                    <input
                      type="number"
                      value={formData.target_value}
                      onChange={e => setFormData(prev => ({ ...prev, target_value: e.target.value }))}
                      className="w-full px-3 py-2 rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                      Current {goal.goal_type === 'revenue' ? '($)' : ''}
                    </label>
                    <input
                      type="number"
                      value={formData.current_value}
                      onChange={e => setFormData(prev => ({ ...prev, current_value: e.target.value }))}
                      className="w-full px-3 py-2 rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    Target Year
                  </label>
                  <select
                    value={formData.target_year}
                    onChange={e => setFormData(prev => ({ ...prev, target_year: parseInt(e.target.value) }))}
                    className="w-full px-3 py-2 rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
                  >
                    <option value={2025}>2025</option>
                    <option value={2026}>2026</option>
                    <option value={2027}>2027</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 p-4 border-t border-zinc-200 dark:border-zinc-700">
                <button
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md"
                >
                  Cancel
                </button>
                <button
                  onClick={handleEdit}
                  disabled={isSubmitting}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 rounded-md"
                >
                  {isSubmitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <>
          <div className="fixed inset-0 z-40 bg-black/50" onClick={() => setShowDeleteModal(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-xl w-full max-w-sm">
              <div className="p-6">
                <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-2">Delete Goal</h2>
                <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">
                  Are you sure you want to delete <strong>{goal.name}</strong>? This action cannot be undone.
                </p>

                {error && (
                  <div className="mb-4 p-3 rounded-md bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 text-sm">
                    {error}
                  </div>
                )}

                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => setShowDeleteModal(false)}
                    className="px-4 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDelete}
                    disabled={isSubmitting}
                    className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 disabled:bg-red-400 rounded-md"
                  >
                    {isSubmitting ? 'Deleting...' : 'Delete'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  )
}
