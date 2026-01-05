'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface Stakeholder {
  stakeholder_id?: string
  account_plan_id: string
  full_name: string
  title?: string
  department?: string
  email?: string
  phone?: string
  linkedin_url?: string
  role_type?: string
  sentiment?: string
  engagement_level?: string
  influence_score?: number
  last_contact_date?: string
  profile_notes?: string
  reports_to_id?: string
  org_level?: number
}

interface StakeholderModalProps {
  isOpen: boolean
  onClose: () => void
  accountPlanId: string
  stakeholder?: Stakeholder | null
  allStakeholders?: Stakeholder[]
}

const ROLE_TYPES = [
  'Economic_Buyer',
  'Technical_Buyer',
  'Champion',
  'Influencer',
  'Blocker',
  'Coach',
  'End_User',
  'Unknown',
]

const SENTIMENTS = [
  'Strong_Advocate',
  'Supportive',
  'Neutral',
  'Skeptical',
  'Opponent',
  'Unknown',
]

const ENGAGEMENT_LEVELS = [
  'High',
  'Medium',
  'Low',
  'None',
]

export function StakeholderModal({ isOpen, onClose, accountPlanId, stakeholder, allStakeholders = [] }: StakeholderModalProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const isEditing = !!stakeholder?.stakeholder_id

  const [formData, setFormData] = useState({
    full_name: '',
    title: '',
    department: '',
    email: '',
    phone: '',
    linkedin_url: '',
    role_type: '',
    sentiment: 'Unknown',
    engagement_level: 'None',
    influence_score: '',
    last_contact_date: '',
    profile_notes: '',
    reports_to_id: '',
    org_level: '',
  })

  useEffect(() => {
    if (stakeholder) {
      setFormData({
        full_name: stakeholder.full_name || '',
        title: stakeholder.title || '',
        department: stakeholder.department || '',
        email: stakeholder.email || '',
        phone: stakeholder.phone || '',
        linkedin_url: stakeholder.linkedin_url || '',
        role_type: stakeholder.role_type || '',
        sentiment: stakeholder.sentiment || 'Unknown',
        engagement_level: stakeholder.engagement_level || 'None',
        influence_score: stakeholder.influence_score?.toString() || '',
        last_contact_date: stakeholder.last_contact_date?.split('T')[0] || '',
        profile_notes: stakeholder.profile_notes || '',
        reports_to_id: stakeholder.reports_to_id || '',
        org_level: stakeholder.org_level?.toString() || '',
      })
    } else {
      setFormData({
        full_name: '',
        title: '',
        department: '',
        email: '',
        phone: '',
        linkedin_url: '',
        role_type: '',
        sentiment: 'Unknown',
        engagement_level: 'None',
        influence_score: '',
        last_contact_date: '',
        profile_notes: '',
        reports_to_id: '',
        org_level: '',
      })
    }
  }, [stakeholder])

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    const supabase = createClient()

    const data: Record<string, unknown> = {
      account_plan_id: accountPlanId,
      full_name: formData.full_name,
    }

    if (formData.title) data.title = formData.title
    if (formData.department) data.department = formData.department
    if (formData.email) data.email = formData.email
    if (formData.phone) data.phone = formData.phone
    if (formData.linkedin_url) data.linkedin_url = formData.linkedin_url
    if (formData.role_type) data.role_type = formData.role_type
    if (formData.sentiment) data.sentiment = formData.sentiment
    if (formData.engagement_level) data.engagement_level = formData.engagement_level
    if (formData.influence_score) data.influence_score = parseInt(formData.influence_score)
    if (formData.last_contact_date) data.last_contact_date = formData.last_contact_date
    if (formData.profile_notes) data.profile_notes = formData.profile_notes
    if (formData.reports_to_id) data.reports_to_id = formData.reports_to_id
    else data.reports_to_id = null
    if (formData.org_level) data.org_level = parseInt(formData.org_level)

    let result
    if (isEditing) {
      result = await supabase
        .from('stakeholders')
        .update(data)
        .eq('stakeholder_id', stakeholder!.stakeholder_id)
    } else {
      result = await supabase
        .from('stakeholders')
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
            {isEditing ? 'Edit Stakeholder' : 'New Stakeholder'}
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
              Full Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="full_name"
              value={formData.full_name}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="John Smith"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Title
              </label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleChange}
                className="w-full px-3 py-2 rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="VP of Engineering"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Department
              </label>
              <input
                type="text"
                name="department"
                value={formData.department}
                onChange={handleChange}
                className="w-full px-3 py-2 rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Engineering"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Role Type
              </label>
              <select
                name="role_type"
                value={formData.role_type}
                onChange={handleChange}
                className="w-full px-3 py-2 rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select...</option>
                {ROLE_TYPES.map(role => (
                  <option key={role} value={role}>{role.replace(/_/g, ' ')}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Sentiment
              </label>
              <select
                name="sentiment"
                value={formData.sentiment}
                onChange={handleChange}
                className="w-full px-3 py-2 rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {SENTIMENTS.map(s => (
                  <option key={s} value={s}>{s.replace('_', ' ')}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Engagement Level
              </label>
              <select
                name="engagement_level"
                value={formData.engagement_level}
                onChange={handleChange}
                className="w-full px-3 py-2 rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {ENGAGEMENT_LEVELS.map(level => (
                  <option key={level} value={level}>{level}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Influence Score (1-10)
              </label>
              <input
                type="number"
                name="influence_score"
                value={formData.influence_score}
                onChange={handleChange}
                min="1"
                max="10"
                className="w-full px-3 py-2 rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="7"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Email
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className="w-full px-3 py-2 rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="john.smith@company.com"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Phone
              </label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className="w-full px-3 py-2 rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="+1 555-123-4567"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Last Contact
              </label>
              <input
                type="date"
                name="last_contact_date"
                value={formData.last_contact_date}
                onChange={handleChange}
                className="w-full px-3 py-2 rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              LinkedIn URL
            </label>
            <input
              type="url"
              name="linkedin_url"
              value={formData.linkedin_url}
              onChange={handleChange}
              className="w-full px-3 py-2 rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="https://linkedin.com/in/johnsmith"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Reports To
              </label>
              <select
                name="reports_to_id"
                value={formData.reports_to_id}
                onChange={handleChange}
                className="w-full px-3 py-2 rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">No manager (Top level)</option>
                {allStakeholders
                  .filter(s => s.stakeholder_id !== stakeholder?.stakeholder_id)
                  .map(s => (
                    <option key={s.stakeholder_id} value={s.stakeholder_id}>
                      {s.full_name}{s.title ? ` - ${s.title}` : ''}
                    </option>
                  ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Org Level
              </label>
              <input
                type="number"
                name="org_level"
                value={formData.org_level}
                onChange={handleChange}
                min="1"
                max="10"
                className="w-full px-3 py-2 rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="1 = C-level, 2 = VP, etc."
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Profile Notes
            </label>
            <textarea
              name="profile_notes"
              value={formData.profile_notes}
              onChange={handleChange}
              rows={3}
              className="w-full px-3 py-2 rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Key insights, preferences, communication style..."
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
              disabled={isSubmitting || !formData.full_name}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed rounded-md transition-colors"
            >
              {isSubmitting ? 'Saving...' : isEditing ? 'Save Changes' : 'Add Stakeholder'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
