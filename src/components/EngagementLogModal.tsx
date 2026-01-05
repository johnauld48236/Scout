'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface Stakeholder {
  stakeholder_id: string
  full_name: string
  title?: string
}

interface Pursuit {
  pursuit_id: string
  name: string
}

interface EngagementLog {
  engagement_id?: string
  account_plan_id: string
  pursuit_id?: string
  engagement_type: string
  engagement_date: string
  duration_minutes?: number
  location?: string
  title?: string
  summary?: string
  key_moments?: string
  outcome?: string
  next_steps?: string
  our_attendees?: string[]
  created_by?: string
}

interface EngagementLogModalProps {
  isOpen: boolean
  onClose: () => void
  accountPlanId: string
  pursuits?: Pursuit[]
  stakeholders?: Stakeholder[]
  engagementLog?: EngagementLog | null
}

const ENGAGEMENT_TYPES = [
  { value: 'call', label: 'Call' },
  { value: 'meeting', label: 'Meeting' },
  { value: 'email', label: 'Email Thread' },
  { value: 'demo', label: 'Demo' },
  { value: 'presentation', label: 'Presentation' },
  { value: 'conference', label: 'Conference' },
  { value: 'lunch', label: 'Lunch/Dinner' },
  { value: 'workshop', label: 'Workshop' },
]

export function EngagementLogModal({
  isOpen,
  onClose,
  accountPlanId,
  pursuits = [],
  stakeholders = [],
  engagementLog,
}: EngagementLogModalProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const isEditing = !!engagementLog?.engagement_id

  const [formData, setFormData] = useState({
    engagement_type: 'call',
    engagement_date: new Date().toISOString().split('T')[0],
    duration_minutes: '',
    location: '',
    title: '',
    summary: '',
    key_moments: '',
    outcome: '',
    next_steps: '',
    pursuit_id: '',
    our_attendees: '',
  })

  const [selectedStakeholders, setSelectedStakeholders] = useState<string[]>([])

  useEffect(() => {
    if (engagementLog) {
      setFormData({
        engagement_type: engagementLog.engagement_type || 'call',
        engagement_date: engagementLog.engagement_date?.split('T')[0] || new Date().toISOString().split('T')[0],
        duration_minutes: engagementLog.duration_minutes?.toString() || '',
        location: engagementLog.location || '',
        title: engagementLog.title || '',
        summary: engagementLog.summary || '',
        key_moments: engagementLog.key_moments || '',
        outcome: engagementLog.outcome || '',
        next_steps: engagementLog.next_steps || '',
        pursuit_id: engagementLog.pursuit_id || '',
        our_attendees: engagementLog.our_attendees?.join(', ') || '',
      })
    } else {
      setFormData({
        engagement_type: 'call',
        engagement_date: new Date().toISOString().split('T')[0],
        duration_minutes: '',
        location: '',
        title: '',
        summary: '',
        key_moments: '',
        outcome: '',
        next_steps: '',
        pursuit_id: '',
        our_attendees: '',
      })
      setSelectedStakeholders([])
    }
  }, [engagementLog])

  // Load attendees when editing
  useEffect(() => {
    if (engagementLog?.engagement_id) {
      const supabase = createClient()
      supabase
        .from('engagement_attendees')
        .select('stakeholder_id')
        .eq('engagement_id', engagementLog.engagement_id)
        .then(({ data }) => {
          if (data) {
            setSelectedStakeholders(data.map(a => a.stakeholder_id))
          }
        })
    }
  }, [engagementLog?.engagement_id])

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    const supabase = createClient()

    const data: Record<string, unknown> = {
      account_plan_id: accountPlanId,
      engagement_type: formData.engagement_type,
      engagement_date: formData.engagement_date,
    }

    if (formData.duration_minutes) data.duration_minutes = parseInt(formData.duration_minutes)
    if (formData.location) data.location = formData.location
    if (formData.title) data.title = formData.title
    if (formData.summary) data.summary = formData.summary
    if (formData.key_moments) data.key_moments = formData.key_moments
    if (formData.outcome) data.outcome = formData.outcome
    if (formData.next_steps) data.next_steps = formData.next_steps
    if (formData.pursuit_id) data.pursuit_id = formData.pursuit_id
    if (formData.our_attendees) {
      data.our_attendees = formData.our_attendees.split(',').map(s => s.trim()).filter(Boolean)
    }

    let engagementId: string | undefined

    if (isEditing) {
      const { error: updateError } = await supabase
        .from('engagement_logs')
        .update(data)
        .eq('engagement_id', engagementLog!.engagement_id)

      if (updateError) {
        setError(updateError.message)
        setIsSubmitting(false)
        return
      }
      engagementId = engagementLog!.engagement_id
    } else {
      const { data: inserted, error: insertError } = await supabase
        .from('engagement_logs')
        .insert(data)
        .select('engagement_id')
        .single()

      if (insertError) {
        setError(insertError.message)
        setIsSubmitting(false)
        return
      }
      engagementId = inserted.engagement_id
    }

    // Update attendees
    if (engagementId) {
      // Delete existing attendees
      await supabase
        .from('engagement_attendees')
        .delete()
        .eq('engagement_id', engagementId)

      // Insert new attendees
      if (selectedStakeholders.length > 0) {
        const attendeesData = selectedStakeholders.map(stakeholderId => ({
          engagement_id: engagementId,
          stakeholder_id: stakeholderId,
        }))

        const { error: attendeesError } = await supabase
          .from('engagement_attendees')
          .insert(attendeesData)

        if (attendeesError) {
          console.error('Error saving attendees:', attendeesError)
        }
      }
    }

    setIsSubmitting(false)
    onClose()
    router.refresh()
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value,
    }))
  }

  const toggleStakeholder = (stakeholderId: string) => {
    setSelectedStakeholders(prev =>
      prev.includes(stakeholderId)
        ? prev.filter(id => id !== stakeholderId)
        : [...prev, stakeholderId]
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      <div className="relative bg-white dark:bg-zinc-900 rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-zinc-200 dark:border-zinc-700">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            {isEditing ? 'Edit Engagement' : 'Log Engagement'}
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

          {/* Type and Date Row */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Type <span className="text-red-500">*</span>
              </label>
              <select
                name="engagement_type"
                value={formData.engagement_type}
                onChange={handleChange}
                className="w-full px-3 py-2 rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {ENGAGEMENT_TYPES.map(type => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                name="engagement_date"
                value={formData.engagement_date}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Duration (mins)
              </label>
              <input
                type="number"
                name="duration_minutes"
                value={formData.duration_minutes}
                onChange={handleChange}
                min="1"
                className="w-full px-3 py-2 rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="30"
              />
            </div>
          </div>

          {/* Title and Location */}
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
                placeholder="Discovery Call with VP Engineering"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Location
              </label>
              <input
                type="text"
                name="location"
                value={formData.location}
                onChange={handleChange}
                className="w-full px-3 py-2 rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Zoom, On-site, Conference booth..."
              />
            </div>
          </div>

          {/* Related Pursuit */}
          {pursuits.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Related Opportunity
              </label>
              <select
                name="pursuit_id"
                value={formData.pursuit_id}
                onChange={handleChange}
                className="w-full px-3 py-2 rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">General (not opportunity-specific)</option>
                {pursuits.map(p => (
                  <option key={p.pursuit_id} value={p.pursuit_id}>{p.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Stakeholder Attendees */}
          {stakeholders.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Customer Attendees
              </label>
              <div className="flex flex-wrap gap-2 p-2 rounded-md border border-zinc-300 dark:border-zinc-600 bg-zinc-50 dark:bg-zinc-800 min-h-[42px]">
                {stakeholders.map(s => (
                  <button
                    key={s.stakeholder_id}
                    type="button"
                    onClick={() => toggleStakeholder(s.stakeholder_id)}
                    className={`px-2 py-1 rounded text-sm transition-colors ${
                      selectedStakeholders.includes(s.stakeholder_id)
                        ? 'bg-blue-600 text-white'
                        : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-300 dark:hover:bg-zinc-600'
                    }`}
                  >
                    {s.full_name}
                    {s.title && <span className="opacity-70 ml-1">({s.title})</span>}
                  </button>
                ))}
                {stakeholders.length === 0 && (
                  <span className="text-zinc-500 text-sm">No stakeholders available</span>
                )}
              </div>
            </div>
          )}

          {/* Our Team Attendees */}
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Our Team Attendees
            </label>
            <input
              type="text"
              name="our_attendees"
              value={formData.our_attendees}
              onChange={handleChange}
              className="w-full px-3 py-2 rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="John Smith, Jane Doe (comma-separated)"
            />
          </div>

          {/* Summary */}
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Summary
            </label>
            <textarea
              name="summary"
              value={formData.summary}
              onChange={handleChange}
              rows={2}
              className="w-full px-3 py-2 rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Brief overview of the engagement..."
            />
          </div>

          {/* Key Moments */}
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Key Moments
            </label>
            <textarea
              name="key_moments"
              value={formData.key_moments}
              onChange={handleChange}
              rows={2}
              className="w-full px-3 py-2 rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="- VP mentioned budget approval in Q2&#10;- Competitor POC ending this month"
            />
          </div>

          {/* Outcome */}
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Outcome
            </label>
            <textarea
              name="outcome"
              value={formData.outcome}
              onChange={handleChange}
              rows={2}
              className="w-full px-3 py-2 rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="What was the result of this engagement?"
            />
          </div>

          {/* Next Steps */}
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Next Steps
            </label>
            <textarea
              name="next_steps"
              value={formData.next_steps}
              onChange={handleChange}
              rows={2}
              className="w-full px-3 py-2 rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Agreed follow-up actions..."
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
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed rounded-md transition-colors"
            >
              {isSubmitting ? 'Saving...' : isEditing ? 'Save Changes' : 'Log Engagement'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
