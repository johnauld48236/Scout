'use client'

import { useState, useEffect, useCallback } from 'react'
import { AccountDrawer, DrawerSection } from './AccountDrawer'

interface Division {
  division_id: string
  name: string
  description?: string
  division_type?: string
}

interface Stakeholder {
  stakeholder_id: string
  full_name: string
  title?: string
  email?: string
  phone?: string
  linkedin_url?: string
  role_type?: string
  sentiment?: string
  business_unit?: string
  department?: string
  division_id?: string
  notes?: string
  profile_notes?: string
  relationship_strength?: string
  purchasing_authority?: string
  key_concerns?: string[]
  communication_style?: string
  last_contact_date?: string
  power_level?: string    // 'high' | 'medium' | 'low'
  interest_level?: string // 'high' | 'medium' | 'low'
}

interface StakeholderDrawerProps {
  isOpen: boolean
  onClose: () => void
  stakeholder: Stakeholder | null
  accountPlanId: string
  divisions: Division[]
  onSave?: (updatedStakeholder: Stakeholder) => void
  onDelete?: (stakeholderId: string) => void
}

const roleTypes = [
  { value: 'decision_maker', label: 'Decision Maker' },
  { value: 'champion', label: 'Champion' },
  { value: 'influencer', label: 'Influencer' },
  { value: 'user', label: 'End User' },
  { value: 'blocker', label: 'Blocker' },
  { value: 'evaluator', label: 'Technical Evaluator' },
  { value: 'economic_buyer', label: 'Economic Buyer' },
]

const sentimentOptions = [
  { value: 'strong_advocate', label: 'Strong Advocate', color: '#22c55e' },
  { value: 'supportive', label: 'Supportive', color: '#84cc16' },
  { value: 'neutral', label: 'Neutral', color: '#94a3b8' },
  { value: 'skeptical', label: 'Skeptical', color: '#f97316' },
  { value: 'opposed', label: 'Opposed', color: '#ef4444' },
]

const relationshipStrengths = [
  { value: 'strong', label: 'Strong', description: 'Regular communication, trusted relationship' },
  { value: 'developing', label: 'Developing', description: 'Building rapport, occasional contact' },
  { value: 'new', label: 'New', description: 'Recently introduced' },
  { value: 'cold', label: 'Cold', description: 'No recent engagement' },
]

const powerLevels = [
  { value: 'high', label: 'High', badge: 'H', color: '#dc2626' },
  { value: 'medium', label: 'Medium', badge: 'M', color: '#f59e0b' },
  { value: 'low', label: 'Low', badge: 'L', color: '#6b7280' },
]

const interestLevels = [
  { value: 'high', label: 'High', badge: 'H', color: '#22c55e' },
  { value: 'medium', label: 'Medium', badge: 'M', color: '#f59e0b' },
  { value: 'low', label: 'Low', badge: 'L', color: '#6b7280' },
]

export function StakeholderDrawer({
  isOpen,
  onClose,
  stakeholder,
  accountPlanId,
  divisions,
  onSave,
  onDelete,
}: StakeholderDrawerProps) {
  const [formData, setFormData] = useState<Partial<Stakeholder>>({})
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  useEffect(() => {
    if (stakeholder) {
      setFormData({ ...stakeholder })
    } else {
      setFormData({})
    }
    setError(null)
    setShowDeleteConfirm(false)
  }, [stakeholder, isOpen])

  const handleChange = useCallback((field: keyof Stakeholder, value: string | null) => {
    setFormData(prev => ({
      ...prev,
      [field]: value === '' ? null : value,
    }))
  }, [])

  const handleSave = useCallback(async () => {
    if (!stakeholder?.stakeholder_id) return

    setSaving(true)
    setError(null)

    try {
      const response = await fetch('/api/stakeholders', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stakeholder_id: stakeholder.stakeholder_id,
          ...formData,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to save')
      }

      onSave?.(result.stakeholder)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save stakeholder')
    } finally {
      setSaving(false)
    }
  }, [stakeholder, formData, onSave, onClose])

  const handleDelete = useCallback(async () => {
    if (!stakeholder?.stakeholder_id) return

    setSaving(true)
    try {
      const response = await fetch(`/api/accounts/${accountPlanId}/stakeholders/${stakeholder.stakeholder_id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete stakeholder')
      }

      onDelete?.(stakeholder.stakeholder_id)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete')
    } finally {
      setSaving(false)
    }
  }, [stakeholder, accountPlanId, onDelete, onClose])

  const selectedDivision = divisions.find(d => d.division_id === formData.division_id)
  const selectedSentiment = sentimentOptions.find(s => s.value === formData.sentiment)

  return (
    <AccountDrawer
      isOpen={isOpen}
      onClose={onClose}
      title={stakeholder?.full_name || 'Stakeholder'}
      subtitle={stakeholder?.title}
      width="lg"
      footer={
        <div className="flex items-center justify-between">
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="px-3 py-2 text-sm rounded-lg transition-colors"
            style={{ color: '#dc2626' }}
            disabled={saving}
          >
            Delete Stakeholder
          </button>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm rounded-lg border transition-colors hover:bg-gray-50"
              style={{ borderColor: 'var(--scout-border)', color: 'var(--scout-earth)' }}
              disabled={saving}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 text-sm rounded-lg text-white transition-colors"
              style={{ backgroundColor: 'var(--scout-saddle)' }}
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      }
    >
      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-700 text-sm">
          {error}
        </div>
      )}

      {showDeleteConfirm && (
        <div className="mb-4 p-4 rounded-lg border-2 border-red-200 bg-red-50">
          <p className="text-sm text-red-800 mb-3">
            Are you sure you want to remove {stakeholder?.full_name} from this account?
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setShowDeleteConfirm(false)}
              className="px-3 py-1.5 text-sm rounded border bg-white"
              disabled={saving}
            >
              Cancel
            </button>
            <button
              onClick={handleDelete}
              className="px-3 py-1.5 text-sm rounded bg-red-600 text-white"
              disabled={saving}
            >
              {saving ? 'Deleting...' : 'Yes, Remove'}
            </button>
          </div>
        </div>
      )}

      {/* Contact Information */}
      <DrawerSection title="Contact Information">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--scout-earth-light)' }}>
                Full Name
              </label>
              <input
                type="text"
                value={formData.full_name || ''}
                onChange={(e) => handleChange('full_name', e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border"
                style={{ borderColor: 'var(--scout-border)' }}
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--scout-earth-light)' }}>
                Title
              </label>
              <input
                type="text"
                value={formData.title || ''}
                onChange={(e) => handleChange('title', e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border"
                style={{ borderColor: 'var(--scout-border)' }}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--scout-earth-light)' }}>
                Email
              </label>
              <input
                type="email"
                value={formData.email || ''}
                onChange={(e) => handleChange('email', e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border"
                style={{ borderColor: 'var(--scout-border)' }}
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--scout-earth-light)' }}>
                Phone
              </label>
              <input
                type="tel"
                value={formData.phone || ''}
                onChange={(e) => handleChange('phone', e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border"
                style={{ borderColor: 'var(--scout-border)' }}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--scout-earth-light)' }}>
              LinkedIn URL
            </label>
            <input
              type="url"
              value={formData.linkedin_url || ''}
              onChange={(e) => handleChange('linkedin_url', e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border"
              style={{ borderColor: 'var(--scout-border)' }}
              placeholder="https://linkedin.com/in/..."
            />
          </div>
        </div>
      </DrawerSection>

      {/* Organization Mapping */}
      <DrawerSection title="Organization Mapping">
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--scout-earth-light)' }}>
              Division / Business Unit
            </label>
            <select
              value={formData.division_id || ''}
              onChange={(e) => handleChange('division_id', e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border"
              style={{ borderColor: 'var(--scout-border)' }}
            >
              <option value="">Not assigned to a division</option>
              {divisions.map(div => (
                <option key={div.division_id} value={div.division_id}>
                  {div.name}
                  {div.division_type && div.division_type !== 'division' ? ` (${div.division_type})` : ''}
                </option>
              ))}
            </select>
            {selectedDivision?.description && (
              <p className="mt-1 text-xs" style={{ color: 'var(--scout-earth-light)' }}>
                {selectedDivision.description}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--scout-earth-light)' }}>
                Department
              </label>
              <input
                type="text"
                value={formData.department || ''}
                onChange={(e) => handleChange('department', e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border"
                style={{ borderColor: 'var(--scout-border)' }}
                placeholder="e.g., Engineering, Product Security"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--scout-earth-light)' }}>
                Business Unit
              </label>
              <input
                type="text"
                value={formData.business_unit || ''}
                onChange={(e) => handleChange('business_unit', e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border"
                style={{ borderColor: 'var(--scout-border)' }}
                placeholder="Legacy field if no division selected"
              />
            </div>
          </div>
        </div>
      </DrawerSection>

      {/* Role & Influence */}
      <DrawerSection title="Role & Influence">
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium mb-2" style={{ color: 'var(--scout-earth-light)' }}>
              Role Type
            </label>
            <div className="flex flex-wrap gap-2">
              {roleTypes.map(role => (
                <button
                  key={role.value}
                  onClick={() => handleChange('role_type', formData.role_type === role.value ? '' : role.value)}
                  className={`px-3 py-1.5 text-xs rounded-full border transition-colors ${
                    formData.role_type === role.value
                      ? 'border-amber-500 bg-amber-50 text-amber-800'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {role.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium mb-2" style={{ color: 'var(--scout-earth-light)' }}>
              Sentiment
            </label>
            <div className="flex flex-wrap gap-2">
              {sentimentOptions.map(sentiment => (
                <button
                  key={sentiment.value}
                  onClick={() => handleChange('sentiment', formData.sentiment === sentiment.value ? '' : sentiment.value)}
                  className="px-3 py-1.5 text-xs rounded-full border transition-colors"
                  style={{
                    borderColor: formData.sentiment === sentiment.value ? sentiment.color : '#e5e7eb',
                    backgroundColor: formData.sentiment === sentiment.value ? `${sentiment.color}15` : 'transparent',
                    color: formData.sentiment === sentiment.value ? sentiment.color : 'inherit',
                  }}
                >
                  {sentiment.label}
                </button>
              ))}
            </div>
            {selectedSentiment && (
              <div
                className="mt-2 inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs"
                style={{ backgroundColor: `${selectedSentiment.color}15`, color: selectedSentiment.color }}
              >
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: selectedSentiment.color }}
                />
                {selectedSentiment.label}
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium mb-2" style={{ color: 'var(--scout-earth-light)' }}>
              Relationship Strength
            </label>
            <div className="grid grid-cols-2 gap-2">
              {relationshipStrengths.map(rs => (
                <button
                  key={rs.value}
                  onClick={() => handleChange('relationship_strength', formData.relationship_strength === rs.value ? '' : rs.value)}
                  className={`p-2 text-left rounded-lg border transition-colors ${
                    formData.relationship_strength === rs.value
                      ? 'border-amber-500 bg-amber-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <span className="text-sm font-medium block">{rs.label}</span>
                  <span className="text-xs text-gray-500">{rs.description}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--scout-earth-light)' }}>
              Purchasing Authority
            </label>
            <select
              value={formData.purchasing_authority || ''}
              onChange={(e) => handleChange('purchasing_authority', e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border"
              style={{ borderColor: 'var(--scout-border)' }}
            >
              <option value="">Unknown</option>
              <option value="final_approver">Final Approver</option>
              <option value="budget_owner">Budget Owner</option>
              <option value="recommender">Recommender</option>
              <option value="influencer">Influencer Only</option>
              <option value="none">No Purchasing Authority</option>
            </select>
          </div>

          {/* Power / Interest Grid */}
          <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-gray-100">
            <div>
              <label className="block text-xs font-medium mb-2" style={{ color: 'var(--scout-earth-light)' }}>
                Power Level
              </label>
              <div className="flex gap-2">
                {powerLevels.map(level => (
                  <button
                    key={level.value}
                    onClick={() => handleChange('power_level', formData.power_level === level.value ? '' : level.value)}
                    className={`flex-1 px-3 py-2 text-xs rounded-lg border transition-colors ${
                      formData.power_level === level.value
                        ? 'border-2'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    style={{
                      borderColor: formData.power_level === level.value ? level.color : undefined,
                      backgroundColor: formData.power_level === level.value ? `${level.color}10` : 'transparent',
                      color: formData.power_level === level.value ? level.color : 'inherit',
                    }}
                  >
                    <span className="font-bold">{level.badge}</span>
                    <span className="ml-1">{level.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium mb-2" style={{ color: 'var(--scout-earth-light)' }}>
                Interest Level
              </label>
              <div className="flex gap-2">
                {interestLevels.map(level => (
                  <button
                    key={level.value}
                    onClick={() => handleChange('interest_level', formData.interest_level === level.value ? '' : level.value)}
                    className={`flex-1 px-3 py-2 text-xs rounded-lg border transition-colors ${
                      formData.interest_level === level.value
                        ? 'border-2'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    style={{
                      borderColor: formData.interest_level === level.value ? level.color : undefined,
                      backgroundColor: formData.interest_level === level.value ? `${level.color}10` : 'transparent',
                      color: formData.interest_level === level.value ? level.color : 'inherit',
                    }}
                  >
                    <span className="font-bold">{level.badge}</span>
                    <span className="ml-1">{level.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Power/Interest Summary Badge */}
          {(formData.power_level || formData.interest_level) && (
            <div className="mt-3 flex items-center gap-2">
              <span className="text-xs" style={{ color: 'var(--scout-earth-light)' }}>Summary:</span>
              <span className="px-2 py-1 text-xs font-medium rounded bg-gray-100 dark:bg-gray-800">
                P:{formData.power_level?.charAt(0).toUpperCase() || '-'} I:{formData.interest_level?.charAt(0).toUpperCase() || '-'}
              </span>
            </div>
          )}
        </div>
      </DrawerSection>

      {/* Notes & Context */}
      <DrawerSection title="Notes & Context">
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--scout-earth-light)' }}>
              Profile Notes
            </label>
            <textarea
              value={formData.profile_notes || ''}
              onChange={(e) => handleChange('profile_notes', e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border min-h-[80px]"
              style={{ borderColor: 'var(--scout-border)' }}
              placeholder="Background, career history, interests..."
            />
          </div>

          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--scout-earth-light)' }}>
              Communication Style
            </label>
            <textarea
              value={formData.communication_style || ''}
              onChange={(e) => handleChange('communication_style', e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border"
              style={{ borderColor: 'var(--scout-border)' }}
              placeholder="How they prefer to communicate, meeting style, etc."
            />
          </div>

          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--scout-earth-light)' }}>
              General Notes
            </label>
            <textarea
              value={formData.notes || ''}
              onChange={(e) => handleChange('notes', e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border min-h-[60px]"
              style={{ borderColor: 'var(--scout-border)' }}
              placeholder="Any additional notes..."
            />
          </div>

          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--scout-earth-light)' }}>
              Last Contact Date
            </label>
            <input
              type="date"
              value={formData.last_contact_date?.split('T')[0] || ''}
              onChange={(e) => handleChange('last_contact_date', e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border"
              style={{ borderColor: 'var(--scout-border)' }}
            />
          </div>
        </div>
      </DrawerSection>
    </AccountDrawer>
  )
}
