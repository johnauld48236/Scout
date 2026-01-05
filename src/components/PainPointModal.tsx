'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { MultiDealSelector } from './account/MultiDealSelector'

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
  engagement_id: string
  title?: string
  engagement_date: string
  engagement_type: string
}

interface PainPoint {
  pain_point_id?: string
  account_plan_id: string
  pursuit_id?: string
  pursuit_ids?: string[]
  stakeholder_id?: string
  engagement_log_id?: string
  description: string
  verbatim?: string
  impact?: string
  severity?: string
  category?: string
  bant_dimension?: string
  source_type?: string
  source_date?: string
  status?: string
}

interface PainPointModalProps {
  isOpen: boolean
  onClose: () => void
  accountPlanId: string
  pursuits?: Pursuit[]
  stakeholders?: Stakeholder[]
  engagements?: EngagementLog[]
  painPoint?: PainPoint | null
}

const SEVERITIES = [
  { value: 'critical', label: 'Critical', color: 'text-red-600' },
  { value: 'significant', label: 'Significant', color: 'text-orange-600' },
  { value: 'moderate', label: 'Moderate', color: 'text-yellow-600' },
  { value: 'minor', label: 'Minor', color: 'text-zinc-600' },
]

const CATEGORIES = [
  { value: 'process', label: 'Process' },
  { value: 'tool', label: 'Tool/Technology' },
  { value: 'resource', label: 'Resource/Staffing' },
  { value: 'compliance', label: 'Compliance/Risk' },
  { value: 'cost', label: 'Cost' },
  { value: 'time', label: 'Time/Speed' },
  { value: 'quality', label: 'Quality' },
  { value: 'integration', label: 'Integration' },
]

const BANT_DIMENSIONS = [
  { value: '', label: 'Not BANT-specific' },
  { value: 'B', label: 'Budget related' },
  { value: 'A', label: 'Authority related' },
  { value: 'N', label: 'Need related' },
  { value: 'T', label: 'Timeline related' },
]

const SOURCE_TYPES = [
  { value: 'call', label: 'Call' },
  { value: 'meeting', label: 'Meeting' },
  { value: 'email', label: 'Email' },
  { value: 'conference', label: 'Conference' },
  { value: 'demo', label: 'Demo' },
  { value: 'document', label: 'Document' },
]

export function PainPointModal({
  isOpen,
  onClose,
  accountPlanId,
  pursuits = [],
  stakeholders = [],
  engagements = [],
  painPoint,
}: PainPointModalProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const isEditing = !!painPoint?.pain_point_id

  const [formData, setFormData] = useState({
    description: '',
    verbatim: '',
    impact: '',
    severity: 'significant',
    category: '',
    bant_dimension: '',
    stakeholder_id: '',
    engagement_log_id: '',
    source_type: '',
    source_date: new Date().toISOString().split('T')[0],
  })
  const [selectedPursuitIds, setSelectedPursuitIds] = useState<string[]>([])

  useEffect(() => {
    if (painPoint) {
      setFormData({
        description: painPoint.description || '',
        verbatim: painPoint.verbatim || '',
        impact: painPoint.impact || '',
        severity: painPoint.severity || 'significant',
        category: painPoint.category || '',
        bant_dimension: painPoint.bant_dimension || '',
        stakeholder_id: painPoint.stakeholder_id || '',
        engagement_log_id: painPoint.engagement_log_id || '',
        source_type: painPoint.source_type || '',
        source_date: painPoint.source_date || new Date().toISOString().split('T')[0],
      })
      // Initialize with existing pursuit_ids or fall back to single pursuit_id
      setSelectedPursuitIds(
        painPoint.pursuit_ids || (painPoint.pursuit_id ? [painPoint.pursuit_id] : [])
      )
    } else {
      setFormData({
        description: '',
        verbatim: '',
        impact: '',
        severity: 'significant',
        category: '',
        bant_dimension: '',
        stakeholder_id: '',
        engagement_log_id: '',
        source_type: '',
        source_date: new Date().toISOString().split('T')[0],
      })
      setSelectedPursuitIds([])
    }
  }, [painPoint])

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    const supabase = createClient()

    const data: Record<string, unknown> = {
      account_plan_id: accountPlanId,
      description: formData.description,
      severity: formData.severity,
    }

    if (formData.verbatim) data.verbatim = formData.verbatim
    if (formData.impact) data.impact = formData.impact
    if (formData.category) data.category = formData.category
    if (formData.bant_dimension) data.bant_dimension = formData.bant_dimension
    if (formData.stakeholder_id) data.stakeholder_id = formData.stakeholder_id
    if (formData.engagement_log_id) data.engagement_log_id = formData.engagement_log_id
    if (formData.source_type) data.source_type = formData.source_type
    if (formData.source_date) data.source_date = formData.source_date

    let painPointId: string | undefined

    if (isEditing) {
      painPointId = painPoint!.pain_point_id
      const result = await supabase
        .from('pain_points')
        .update(data)
        .eq('pain_point_id', painPointId)

      if (result.error) {
        setError(result.error.message)
        setIsSubmitting(false)
        return
      }
    } else {
      const result = await supabase
        .from('pain_points')
        .insert(data)
        .select('pain_point_id')
        .single()

      if (result.error) {
        setError(result.error.message)
        setIsSubmitting(false)
        return
      }
      painPointId = result.data.pain_point_id
    }

    // Update linked deals via junction table
    if (painPointId) {
      // Get existing links
      const existingIds = painPoint?.pursuit_ids || (painPoint?.pursuit_id ? [painPoint.pursuit_id] : [])

      // Remove old links
      for (const oldId of existingIds) {
        if (!selectedPursuitIds.includes(oldId)) {
          await fetch(`/api/accounts/${accountPlanId}/pain-points/${painPointId}/pursuits?pursuit_id=${oldId}`, {
            method: 'DELETE',
          })
        }
      }
      // Add new links
      for (const newId of selectedPursuitIds) {
        if (!existingIds.includes(newId)) {
          await fetch(`/api/accounts/${accountPlanId}/pain-points/${painPointId}/pursuits`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ pursuit_id: newId }),
          })
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      <div className="relative bg-white dark:bg-zinc-900 rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-zinc-200 dark:border-zinc-700">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            {isEditing ? 'Edit Pain Point' : 'Capture Pain Point'}
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

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Pain Point Description <span className="text-red-500">*</span>
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              required
              rows={2}
              className="w-full px-3 py-2 rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="What is the customer's pain point?"
            />
          </div>

          {/* Verbatim Quote */}
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Verbatim Quote
              <span className="text-zinc-500 font-normal ml-1">(exact words)</span>
            </label>
            <textarea
              name="verbatim"
              value={formData.verbatim}
              onChange={handleChange}
              rows={2}
              className="w-full px-3 py-2 rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent italic"
              placeholder='"We spend 40 hours a week just on data reconciliation..."'
            />
          </div>

          {/* Impact */}
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Business Impact
            </label>
            <textarea
              name="impact"
              value={formData.impact}
              onChange={handleChange}
              rows={2}
              className="w-full px-3 py-2 rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="How does this pain affect the business? Cost, time, risk..."
            />
          </div>

          {/* Severity and Category */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Severity
              </label>
              <select
                name="severity"
                value={formData.severity}
                onChange={handleChange}
                className="w-full px-3 py-2 rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {SEVERITIES.map(s => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Category
              </label>
              <select
                name="category"
                value={formData.category}
                onChange={handleChange}
                className="w-full px-3 py-2 rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select category...</option>
                {CATEGORIES.map(c => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* BANT Dimension */}
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              BANT Dimension Affected
            </label>
            <select
              name="bant_dimension"
              value={formData.bant_dimension}
              onChange={handleChange}
              className="w-full px-3 py-2 rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {BANT_DIMENSIONS.map(d => (
                <option key={d.value} value={d.value}>{d.label}</option>
              ))}
            </select>
          </div>

          {/* Source Info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Source Type
              </label>
              <select
                name="source_type"
                value={formData.source_type}
                onChange={handleChange}
                className="w-full px-3 py-2 rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select...</option>
                {SOURCE_TYPES.map(s => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Source Date
              </label>
              <input
                type="date"
                name="source_date"
                value={formData.source_date}
                onChange={handleChange}
                className="w-full px-3 py-2 rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Related Entities */}
          <div className="grid grid-cols-2 gap-4">
            {pursuits.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Linked Deals
                </label>
                <MultiDealSelector
                  pursuits={pursuits}
                  selectedIds={selectedPursuitIds}
                  onChange={setSelectedPursuitIds}
                  label=""
                />
              </div>
            )}

            {stakeholders.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Source Stakeholder
                </label>
                <select
                  name="stakeholder_id"
                  value={formData.stakeholder_id}
                  onChange={handleChange}
                  className="w-full px-3 py-2 rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Not specified</option>
                  {stakeholders.map(s => (
                    <option key={s.stakeholder_id} value={s.stakeholder_id}>
                      {s.full_name}{s.title ? ` (${s.title})` : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Related Engagement */}
          {engagements.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                From Engagement
              </label>
              <select
                name="engagement_log_id"
                value={formData.engagement_log_id}
                onChange={handleChange}
                className="w-full px-3 py-2 rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Not from a logged engagement</option>
                {engagements.map(e => (
                  <option key={e.engagement_id} value={e.engagement_id}>
                    {e.engagement_date} - {e.engagement_type}: {e.title || 'Untitled'}
                  </option>
                ))}
              </select>
            </div>
          )}

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
              disabled={isSubmitting || !formData.description}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed rounded-md transition-colors"
            >
              {isSubmitting ? 'Saving...' : isEditing ? 'Save Changes' : 'Capture Pain Point'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
