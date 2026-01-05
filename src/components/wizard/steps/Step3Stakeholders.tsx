'use client'

import { useState } from 'react'
import { type WizardData, type WizardStakeholder } from '../types'
import { ScoutAIIcon } from '@/components/ui/scout-logo'

interface Step3Props {
  data: WizardData
  updateData: (updates: Partial<WizardData>) => void
  onNext: () => void
  onPrev: () => void
}

const ROLE_TYPES: WizardStakeholder['role_type'][] = [
  'Champion',
  'Economic Buyer',
  'Technical Buyer',
  'Influencer',
  'Blocker',
  'End User',
  'Other',
]

const SENTIMENTS: WizardStakeholder['sentiment'][] = [
  'Strong Advocate',
  'Supportive',
  'Neutral',
  'Skeptical',
  'Opposed',
]

// Role type colors with better contrast
const getRoleTypeStyle = (roleType: WizardStakeholder['role_type']) => {
  switch (roleType) {
    case 'Champion':
      return { backgroundColor: 'rgba(93, 122, 93, 0.2)', color: '#4a7a4a', borderColor: 'rgba(93, 122, 93, 0.4)' }
    case 'Economic Buyer':
      return { backgroundColor: 'rgba(74, 144, 164, 0.2)', color: '#3a8094', borderColor: 'rgba(74, 144, 164, 0.4)' }
    case 'Technical Buyer':
      return { backgroundColor: 'rgba(139, 69, 19, 0.2)', color: '#8b4513', borderColor: 'rgba(139, 69, 19, 0.4)' }
    case 'Blocker':
      return { backgroundColor: 'rgba(169, 68, 66, 0.2)', color: '#a94442', borderColor: 'rgba(169, 68, 66, 0.4)' }
    case 'Influencer':
      return { backgroundColor: 'rgba(210, 105, 30, 0.2)', color: '#c4621a', borderColor: 'rgba(210, 105, 30, 0.4)' }
    default:
      return { backgroundColor: 'var(--scout-border)', color: 'var(--scout-earth)', borderColor: 'var(--scout-border)' }
  }
}

export default function Step3Stakeholders({ data, updateData, onNext, onPrev }: Step3Props) {
  const [isResearching, setIsResearching] = useState(false)
  const [researchNotes, setResearchNotes] = useState<string>('')
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'success' | 'warning' | 'error'; text: string } | null>(null)
  const [formData, setFormData] = useState<Partial<WizardStakeholder>>({
    role_type: 'Influencer',
    sentiment: 'Neutral',
  })

  const researchKeyPeople = async () => {
    setIsResearching(true)
    setResearchNotes('')
    setFeedbackMessage(null)
    try {
      const response = await fetch('/api/ai/research-people', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName: data.accountName,
          domain: data.website,
          industry: data.industry,
        }),
      })

      if (response.ok) {
        const result = await response.json()

        if (result.people && result.people.length > 0) {
          const newStakeholders: WizardStakeholder[] = result.people.map((person: {
            name: string
            title: string
            department?: string
            notes?: string
            linkedinUrl?: string
          }, i: number) => ({
            id: `discovered-${Date.now()}-${i}`,
            full_name: person.name,
            title: person.title,
            linkedin_url: person.linkedinUrl,
            role_type: inferRoleType(person.title),
            sentiment: 'Neutral' as const,
            notes: person.notes || (person.department ? `Department: ${person.department}` : ''),
          }))

          updateData({
            stakeholders: [...data.stakeholders, ...newStakeholders],
          })
          setFeedbackMessage({
            type: 'success',
            text: `Found ${newStakeholders.length} key ${newStakeholders.length === 1 ? 'person' : 'people'}`,
          })
        } else {
          setFeedbackMessage({
            type: 'warning',
            text: 'No key people identified. Try clicking again or add stakeholders manually.',
          })
        }

        if (result.orgStructure || result.newsHighlights) {
          setResearchNotes(
            [result.orgStructure, result.newsHighlights].filter(Boolean).join('\n\n')
          )
        }
      } else {
        setFeedbackMessage({
          type: 'error',
          text: 'Failed to research people. Please try again.',
        })
      }
    } catch (err) {
      console.error('People research error:', err)
      setFeedbackMessage({
        type: 'error',
        text: 'Network error. Please check your connection and try again.',
      })
    } finally {
      setIsResearching(false)
    }
  }

  const inferRoleType = (title: string): WizardStakeholder['role_type'] => {
    const t = title.toLowerCase()
    if (t.includes('ceo') || t.includes('chief executive') || t.includes('president')) {
      return 'Economic Buyer'
    }
    if (t.includes('cfo') || t.includes('chief financial') || t.includes('vp finance')) {
      return 'Economic Buyer'
    }
    if (t.includes('cto') || t.includes('cio') || t.includes('chief technology') || t.includes('chief information')) {
      return 'Technical Buyer'
    }
    if (t.includes('vp') || t.includes('vice president') || t.includes('director') || t.includes('head of')) {
      return 'Influencer'
    }
    if (t.includes('manager') || t.includes('lead')) {
      return 'Influencer'
    }
    return 'Other'
  }

  const addStakeholder = () => {
    if (!formData.full_name?.trim() && !formData.title?.trim()) return

    const newStakeholder: WizardStakeholder = {
      id: editingId || `stakeholder-${Date.now()}`,
      full_name: formData.full_name || '',
      title: formData.title,
      email: formData.email,
      linkedin_url: formData.linkedin_url,
      role_type: formData.role_type || 'Influencer',
      sentiment: formData.sentiment,
      notes: formData.notes,
    }

    if (editingId) {
      updateData({
        stakeholders: data.stakeholders.map(s =>
          s.id === editingId ? newStakeholder : s
        ),
      })
    } else {
      updateData({
        stakeholders: [...data.stakeholders, newStakeholder],
      })
    }

    setFormData({ role_type: 'Influencer', sentiment: 'Neutral' })
    setShowForm(false)
    setEditingId(null)
  }

  const editStakeholder = (stakeholder: WizardStakeholder) => {
    setFormData(stakeholder)
    setEditingId(stakeholder.id)
    setShowForm(true)
  }

  const removeStakeholder = (id: string) => {
    updateData({
      stakeholders: data.stakeholders.filter(s => s.id !== id),
    })
  }

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-lg border p-4" style={{ borderColor: 'var(--scout-border)' }}>
      <h2 className="text-base font-semibold mb-1" style={{ color: 'var(--scout-earth)' }}>
        Stakeholder Mapping
      </h2>
      <p className="text-sm mb-4" style={{ color: 'var(--scout-earth-light)' }}>
        Identify key contacts and their roles in the buying process.
      </p>

      {/* Scout AI Research Button */}
      <button
        onClick={researchKeyPeople}
        disabled={isResearching}
        className="w-full mb-4 py-3 rounded-lg font-medium transition-all flex items-center justify-center gap-3 text-white disabled:opacity-60"
        style={{
          background: isResearching
            ? 'var(--scout-earth-light)'
            : 'linear-gradient(135deg, var(--scout-saddle) 0%, var(--scout-sunset) 100%)',
          boxShadow: isResearching ? 'none' : '0 4px 14px rgba(139, 69, 19, 0.3)',
        }}
      >
        {isResearching ? (
          <>
            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <span>Scout AI researching {data.accountName}...</span>
          </>
        ) : (
          <>
            <ScoutAIIcon size={22} className="text-white" />
            <span style={{ fontFamily: "'Bitter', Georgia, serif" }}>
              Scout AI: Find Key People & Leadership
            </span>
          </>
        )}
      </button>

      {/* Feedback Message */}
      {feedbackMessage && (
        <div
          className="mb-4 p-3 rounded-lg text-sm border"
          style={{
            backgroundColor: feedbackMessage.type === 'success'
              ? 'rgba(93, 122, 93, 0.1)'
              : feedbackMessage.type === 'warning'
              ? 'rgba(210, 105, 30, 0.1)'
              : 'rgba(169, 68, 66, 0.1)',
            borderColor: feedbackMessage.type === 'success'
              ? 'rgba(93, 122, 93, 0.3)'
              : feedbackMessage.type === 'warning'
              ? 'rgba(210, 105, 30, 0.3)'
              : 'rgba(169, 68, 66, 0.3)',
            color: feedbackMessage.type === 'success'
              ? 'var(--scout-trail)'
              : feedbackMessage.type === 'warning'
              ? 'var(--scout-sunset)'
              : 'var(--scout-clay)',
          }}
        >
          {feedbackMessage.text}
        </div>
      )}

      {/* Research Notes */}
      {researchNotes && (
        <div className="mb-5 p-3 rounded-lg border" style={{ backgroundColor: 'var(--scout-parchment)', borderColor: 'var(--scout-border)' }}>
          <h3 className="text-sm font-medium mb-2 flex items-center gap-2" style={{ color: 'var(--scout-earth)' }}>
            <svg className="h-4 w-4" style={{ color: 'var(--scout-sky)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Organization Insights
          </h3>
          <p className="text-sm whitespace-pre-wrap" style={{ color: 'var(--scout-earth-light)' }}>{researchNotes}</p>
        </div>
      )}

      {/* Stakeholder List */}
      {data.stakeholders.length > 0 && (
        <div className="space-y-3 mb-5">
          {data.stakeholders.map((stakeholder) => (
            <div
              key={stakeholder.id}
              className="p-3 rounded-lg border"
              style={{ backgroundColor: 'var(--scout-parchment)', borderColor: 'var(--scout-border)' }}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    {stakeholder.full_name ? (
                      <span className="font-medium" style={{ color: 'var(--scout-earth)' }}>{stakeholder.full_name}</span>
                    ) : (
                      <span className="italic" style={{ color: 'var(--scout-earth-light)' }}>Name TBD</span>
                    )}
                    <span
                      className="text-xs px-2 py-0.5 rounded-full border font-medium"
                      style={getRoleTypeStyle(stakeholder.role_type)}
                    >
                      {stakeholder.role_type}
                    </span>
                  </div>
                  {stakeholder.title && (
                    <p className="text-sm" style={{ color: 'var(--scout-earth-light)' }}>{stakeholder.title}</p>
                  )}
                  {stakeholder.sentiment && (
                    <p className="text-xs mt-1" style={{ color: 'var(--scout-earth-light)' }}>
                      Sentiment: {stakeholder.sentiment}
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => editStakeholder(stakeholder)}
                    className="text-sm hover:underline"
                    style={{ color: 'var(--scout-sky)' }}
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => removeStakeholder(stakeholder.id)}
                    className="text-sm hover:underline"
                    style={{ color: 'var(--scout-clay)' }}
                  >
                    Remove
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Stakeholder Form */}
      {showForm ? (
        <div className="p-4 rounded-lg border mb-5" style={{ backgroundColor: 'var(--scout-parchment)', borderColor: 'var(--scout-border)' }}>
          <h3 className="text-sm font-medium mb-4" style={{ color: 'var(--scout-earth)' }}>
            {editingId ? 'Edit Stakeholder' : 'Add Stakeholder'}
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs mb-1" style={{ color: 'var(--scout-earth-light)' }}>Full Name</label>
              <input
                type="text"
                value={formData.full_name || ''}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                placeholder="John Smith"
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1"
                style={{ borderColor: 'var(--scout-border)', color: 'var(--scout-earth)' }}
              />
            </div>
            <div>
              <label className="block text-xs mb-1" style={{ color: 'var(--scout-earth-light)' }}>Title</label>
              <input
                type="text"
                value={formData.title || ''}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="VP of Engineering"
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1"
                style={{ borderColor: 'var(--scout-border)', color: 'var(--scout-earth)' }}
              />
            </div>
            <div>
              <label className="block text-xs mb-1" style={{ color: 'var(--scout-earth-light)' }}>Role Type</label>
              <select
                value={formData.role_type || 'Influencer'}
                onChange={(e) => setFormData({ ...formData, role_type: e.target.value as WizardStakeholder['role_type'] })}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1"
                style={{ borderColor: 'var(--scout-border)', color: 'var(--scout-earth)' }}
              >
                {ROLE_TYPES.map((role) => (
                  <option key={role} value={role}>{role}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs mb-1" style={{ color: 'var(--scout-earth-light)' }}>Sentiment</label>
              <select
                value={formData.sentiment || 'Neutral'}
                onChange={(e) => setFormData({ ...formData, sentiment: e.target.value as WizardStakeholder['sentiment'] })}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1"
                style={{ borderColor: 'var(--scout-border)', color: 'var(--scout-earth)' }}
              >
                {SENTIMENTS.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs mb-1" style={{ color: 'var(--scout-earth-light)' }}>Email</label>
              <input
                type="email"
                value={formData.email || ''}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="john@company.com"
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1"
                style={{ borderColor: 'var(--scout-border)', color: 'var(--scout-earth)' }}
              />
            </div>
            <div>
              <label className="block text-xs mb-1" style={{ color: 'var(--scout-earth-light)' }}>LinkedIn</label>
              <input
                type="url"
                value={formData.linkedin_url || ''}
                onChange={(e) => setFormData({ ...formData, linkedin_url: e.target.value })}
                placeholder="linkedin.com/in/..."
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1"
                style={{ borderColor: 'var(--scout-border)', color: 'var(--scout-earth)' }}
              />
            </div>
            <div className="col-span-2">
              <label className="block text-xs mb-1" style={{ color: 'var(--scout-earth-light)' }}>Notes</label>
              <textarea
                value={formData.notes || ''}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Additional context..."
                rows={2}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 resize-none"
                style={{ borderColor: 'var(--scout-border)', color: 'var(--scout-earth)' }}
              />
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <button
              onClick={addStakeholder}
              className="px-4 py-2 text-white text-sm rounded-lg font-medium"
              style={{ backgroundColor: 'var(--scout-trail)' }}
            >
              {editingId ? 'Save Changes' : 'Add Stakeholder'}
            </button>
            <button
              onClick={() => {
                setShowForm(false)
                setEditingId(null)
                setFormData({ role_type: 'Influencer', sentiment: 'Neutral' })
              }}
              className="px-4 py-2 text-sm"
              style={{ color: 'var(--scout-earth-light)' }}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowForm(true)}
          className="w-full py-3 border border-dashed rounded-lg text-sm transition-colors mb-5"
          style={{ borderColor: 'var(--scout-border)', color: 'var(--scout-earth-light)' }}
        >
          + Add Stakeholder
        </button>
      )}

      {/* Navigation */}
      <div className="mt-6 pt-4 flex justify-between border-t" style={{ borderColor: 'var(--scout-border)' }}>
        <button
          onClick={onPrev}
          className="px-4 py-2 text-sm font-medium transition-colors hover:underline"
          style={{ color: 'var(--scout-earth-light)' }}
        >
          ← Back
        </button>
        <button
          onClick={onNext}
          className="px-5 py-2 rounded-lg text-sm font-medium text-white transition-colors"
          style={{ backgroundColor: 'var(--scout-saddle)' }}
        >
          Continue to Opportunities →
        </button>
      </div>
    </div>
  )
}
