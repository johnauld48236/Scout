'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface Campaign {
  campaign_id?: string
  name: string
  type: string
  status: string
  target_verticals?: string[]
  target_geos?: string[]
  target_company_profile?: string
  regulatory_context?: string
  industry_dynamics?: string
  value_proposition?: string
  key_pain_points?: string
  signal_triggers?: string
  start_date?: string
  end_date?: string
  pipeline_goal?: number
  conversion_goal?: number
}

interface CampaignModalProps {
  isOpen: boolean
  onClose: () => void
  campaign?: Campaign | null
}

const VERTICALS = ['Medical', 'Automotive', 'Industrial', 'Energy', 'Aerospace', 'Consumer']
const GEOS = ['US', 'EU', 'APAC', 'Global', 'LATAM', 'MEA']

export function CampaignModal({ isOpen, onClose, campaign }: CampaignModalProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const isEditing = !!campaign?.campaign_id

  const [formData, setFormData] = useState({
    name: '',
    type: 'vertical',
    status: 'planned',
    target_verticals: [] as string[],
    target_geos: [] as string[],
    target_company_profile: '',
    regulatory_context: '',
    industry_dynamics: '',
    value_proposition: '',
    key_pain_points: '',
    signal_triggers: '',
    start_date: '',
    end_date: '',
    pipeline_goal: '',
    conversion_goal: '',
  })

  useEffect(() => {
    if (campaign) {
      setFormData({
        name: campaign.name || '',
        type: campaign.type || 'vertical',
        status: campaign.status || 'planned',
        target_verticals: campaign.target_verticals || [],
        target_geos: campaign.target_geos || [],
        target_company_profile: campaign.target_company_profile || '',
        regulatory_context: campaign.regulatory_context || '',
        industry_dynamics: campaign.industry_dynamics || '',
        value_proposition: campaign.value_proposition || '',
        key_pain_points: campaign.key_pain_points || '',
        signal_triggers: campaign.signal_triggers || '',
        start_date: campaign.start_date?.split('T')[0] || '',
        end_date: campaign.end_date?.split('T')[0] || '',
        pipeline_goal: campaign.pipeline_goal?.toString() || '',
        conversion_goal: campaign.conversion_goal?.toString() || '',
      })
    } else {
      setFormData({
        name: '',
        type: 'vertical',
        status: 'planned',
        target_verticals: [],
        target_geos: [],
        target_company_profile: '',
        regulatory_context: '',
        industry_dynamics: '',
        value_proposition: '',
        key_pain_points: '',
        signal_triggers: '',
        start_date: '',
        end_date: '',
        pipeline_goal: '',
        conversion_goal: '',
      })
    }
    setError(null)
  }, [campaign, isOpen])

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    const supabase = createClient()

    const data: Record<string, unknown> = {
      name: formData.name,
      type: formData.type,
      status: formData.status,
      target_verticals: formData.target_verticals.length > 0 ? formData.target_verticals : null,
      target_geos: formData.target_geos.length > 0 ? formData.target_geos : null,
    }

    if (formData.target_company_profile) data.target_company_profile = formData.target_company_profile
    if (formData.regulatory_context) data.regulatory_context = formData.regulatory_context
    if (formData.industry_dynamics) data.industry_dynamics = formData.industry_dynamics
    if (formData.value_proposition) data.value_proposition = formData.value_proposition
    if (formData.key_pain_points) data.key_pain_points = formData.key_pain_points
    if (formData.signal_triggers) data.signal_triggers = formData.signal_triggers

    if (formData.type === 'thematic') {
      if (formData.start_date) data.start_date = formData.start_date
      if (formData.end_date) data.end_date = formData.end_date
      if (formData.pipeline_goal) data.pipeline_goal = parseFloat(formData.pipeline_goal)
      if (formData.conversion_goal) data.conversion_goal = parseFloat(formData.conversion_goal) / 100
    }

    let result
    if (isEditing) {
      result = await supabase
        .from('campaigns')
        .update(data)
        .eq('campaign_id', campaign!.campaign_id)
    } else {
      result = await supabase
        .from('campaigns')
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

  const toggleArrayValue = (field: 'target_verticals' | 'target_geos', value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].includes(value)
        ? prev[field].filter(v => v !== value)
        : [...prev[field], value]
    }))
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      <div className="relative bg-white dark:bg-zinc-900 rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-zinc-200 dark:border-zinc-700">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            {isEditing ? 'Edit Campaign' : 'New Campaign'}
          </h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-6">
          {error && (
            <div className="p-3 rounded-md bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Basics Section */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wide">Basics</h3>

            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Campaign Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Medical Device"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Type</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="type"
                      value="vertical"
                      checked={formData.type === 'vertical'}
                      onChange={handleChange}
                      className="text-blue-600"
                    />
                    <span className="text-sm text-zinc-700 dark:text-zinc-300">Vertical (Evergreen)</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="type"
                      value="thematic"
                      checked={formData.type === 'thematic'}
                      onChange={handleChange}
                      className="text-blue-600"
                    />
                    <span className="text-sm text-zinc-700 dark:text-zinc-300">Thematic (Time-bound)</span>
                  </label>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Status</label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  className="w-full px-3 py-2 rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="planned">Planned</option>
                  <option value="active">Active</option>
                  <option value="paused">Paused</option>
                  <option value="completed">Completed</option>
                </select>
              </div>
            </div>
          </div>

          {/* Targeting Section */}
          <div className="space-y-4">
            <div className="flex items-start gap-2">
              <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wide">Targeting</h3>
              <span className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">(Campaign-specific filters)</span>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 -mt-2">
              Base target market is defined in Settings → Sales Intelligence. Select specific targets for this campaign.
            </p>

            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">Target Verticals</label>
              <div className="flex flex-wrap gap-2">
                {VERTICALS.map(vertical => (
                  <button
                    key={vertical}
                    type="button"
                    onClick={() => toggleArrayValue('target_verticals', vertical)}
                    className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                      formData.target_verticals.includes(vertical)
                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                        : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                    }`}
                  >
                    {vertical}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">Target Geographies</label>
              <div className="flex flex-wrap gap-2">
                {GEOS.map(geo => (
                  <button
                    key={geo}
                    type="button"
                    onClick={() => toggleArrayValue('target_geos', geo)}
                    className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                      formData.target_geos.includes(geo)
                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                        : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                    }`}
                  >
                    {geo}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Target Company Profile</label>
              <textarea
                name="target_company_profile"
                value={formData.target_company_profile}
                onChange={handleChange}
                rows={2}
                className="w-full px-3 py-2 rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Large enterprises with connected products..."
              />
            </div>
          </div>

          {/* Context Section */}
          <div className="space-y-4">
            <div className="flex items-start gap-2">
              <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wide">Campaign Context</h3>
              <span className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">(Campaign-specific messaging)</span>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 -mt-2">
              Base value proposition and pain points are in Settings → Sales Intelligence. Add campaign-specific overrides below.
            </p>

            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Campaign Value Proposition
                <span className="text-xs text-zinc-500 ml-1">(optional override)</span>
              </label>
              <textarea
                name="value_proposition"
                value={formData.value_proposition}
                onChange={handleChange}
                rows={2}
                className="w-full px-3 py-2 rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Leave blank to use base value proposition, or add campaign-specific messaging..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Campaign Pain Points
                <span className="text-xs text-zinc-500 ml-1">(optional override)</span>
              </label>
              <textarea
                name="key_pain_points"
                value={formData.key_pain_points}
                onChange={handleChange}
                rows={2}
                className="w-full px-3 py-2 rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Leave blank to use base pain points, or add campaign-specific problems..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Campaign Signal Triggers
                <span className="text-xs text-zinc-500 ml-1">(optional override)</span>
              </label>
              <textarea
                name="signal_triggers"
                value={formData.signal_triggers}
                onChange={handleChange}
                rows={2}
                className="w-full px-3 py-2 rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Leave blank to use base signals, or add campaign-specific triggers..."
              />
            </div>

            {formData.type === 'thematic' && (
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Regulatory Context
                  <span className="text-xs text-zinc-500 ml-1">(for this campaign)</span>
                </label>
                <textarea
                  name="regulatory_context"
                  value={formData.regulatory_context}
                  onChange={handleChange}
                  rows={2}
                  className="w-full px-3 py-2 rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="What regulations/mandates drive urgency for this campaign..."
                />
              </div>
            )}
          </div>

          {/* Timing & Goals (Thematic only) */}
          {formData.type === 'thematic' && (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wide">Timing & Goals</h3>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Start Date</label>
                  <input
                    type="date"
                    name="start_date"
                    value={formData.start_date}
                    onChange={handleChange}
                    className="w-full px-3 py-2 rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">End Date</label>
                  <input
                    type="date"
                    name="end_date"
                    value={formData.end_date}
                    onChange={handleChange}
                    className="w-full px-3 py-2 rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Pipeline Goal ($)</label>
                  <input
                    type="number"
                    name="pipeline_goal"
                    value={formData.pipeline_goal}
                    onChange={handleChange}
                    className="w-full px-3 py-2 rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="2000000"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Conversion Goal (%)</label>
                  <input
                    type="number"
                    name="conversion_goal"
                    value={formData.conversion_goal}
                    onChange={handleChange}
                    min="0"
                    max="100"
                    className="w-full px-3 py-2 rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="25"
                  />
                </div>
              </div>
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
              disabled={isSubmitting || !formData.name}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed rounded-md transition-colors"
            >
              {isSubmitting ? 'Saving...' : isEditing ? 'Save Changes' : 'Create Campaign'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
