'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface Stakeholder {
  stakeholder_id: string
  full_name: string
  title?: string
  email?: string
  phone?: string
  role_type?: string
  sentiment?: string
  notes?: string
  linkedin_url?: string
  business_unit?: string
  department?: string
}

const ROLE_TYPES = ['Champion', 'Economic Buyer', 'Technical Buyer', 'Influencer', 'Blocker', 'User', 'Other']
const SENTIMENTS = ['Positive', 'Neutral', 'Negative', 'Unknown']

interface StakeholderCardProps {
  stakeholder: Stakeholder
  onEdit?: () => void
}

export function StakeholderCard({ stakeholder, onEdit }: StakeholderCardProps) {
  const router = useRouter()
  const [isExpanded, setIsExpanded] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [localRoleType, setLocalRoleType] = useState(stakeholder.role_type || '')
  const [localSentiment, setLocalSentiment] = useState(stakeholder.sentiment || 'Unknown')
  const [localNotes, setLocalNotes] = useState(stakeholder.notes || '')
  const [hasChanges, setHasChanges] = useState(false)

  const getRoleTypeBadgeStyle = (roleType: string) => {
    switch (roleType) {
      case 'Champion':
        return { backgroundColor: 'rgba(93, 122, 93, 0.2)', color: '#4a7a4a' }
      case 'Economic Buyer':
        return { backgroundColor: 'rgba(74, 144, 164, 0.2)', color: '#3a8094' }
      case 'Technical Buyer':
        return { backgroundColor: 'rgba(139, 69, 19, 0.2)', color: '#7a3c11' }
      case 'Influencer':
        return { backgroundColor: 'rgba(210, 105, 30, 0.2)', color: '#b85a1a' }
      case 'Blocker':
        return { backgroundColor: 'rgba(169, 68, 66, 0.2)', color: '#a94442' }
      default:
        return { backgroundColor: 'var(--scout-border)', color: 'var(--scout-earth)' }
    }
  }

  const getSentimentIndicator = (sentiment: string) => {
    switch (sentiment) {
      case 'Positive': return { icon: '😊', color: 'var(--scout-trail)', bg: 'rgba(93, 122, 93, 0.15)' }
      case 'Neutral': return { icon: '😐', color: 'var(--scout-sky)', bg: 'rgba(74, 144, 164, 0.15)' }
      case 'Negative': return { icon: '😟', color: 'var(--scout-clay)', bg: 'rgba(169, 68, 66, 0.15)' }
      default: return { icon: '❓', color: 'var(--scout-earth-light)', bg: 'var(--scout-parchment)' }
    }
  }

  const sentimentInfo = getSentimentIndicator(localSentiment)

  const handleSave = useCallback(async () => {
    if (!hasChanges) return
    setIsSaving(true)

    const supabase = createClient()
    const { error } = await supabase
      .from('stakeholders')
      .update({
        role_type: localRoleType || null,
        sentiment: localSentiment,
        notes: localNotes || null,
      })
      .eq('stakeholder_id', stakeholder.stakeholder_id)

    setIsSaving(false)

    if (!error) {
      setHasChanges(false)
      router.refresh()
    }
  }, [stakeholder.stakeholder_id, localRoleType, localSentiment, localNotes, hasChanges, router])

  const handleRoleChange = (role: string) => {
    setLocalRoleType(role)
    setHasChanges(true)
  }

  const handleSentimentChange = (sentiment: string) => {
    setLocalSentiment(sentiment)
    setHasChanges(true)
  }

  const handleNotesChange = (notes: string) => {
    setLocalNotes(notes)
    setHasChanges(true)
  }

  // Summary for collapsed state
  const needsAttention = !localRoleType || localSentiment === 'Unknown'

  return (
    <div
      className="border rounded-lg overflow-hidden transition-all"
      style={{
        borderColor: needsAttention ? 'var(--scout-sunset)' : 'var(--scout-border)',
        backgroundColor: isExpanded ? 'var(--scout-parchment)' : 'var(--scout-white)',
      }}
    >
      {/* Collapsed Header - Always Visible */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-2.5 text-left group hover:bg-gray-50/50 transition-colors"
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <span className="text-sm flex-shrink-0" title={`Sentiment: ${localSentiment}`}>
            {sentimentInfo.icon}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium truncate" style={{ color: 'var(--scout-earth)' }}>
              {stakeholder.full_name}
            </p>
            <p className="text-xs truncate" style={{ color: 'var(--scout-earth-light)' }}>
              {stakeholder.title}
              {stakeholder.department && ` · ${stakeholder.department}`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {localRoleType && localRoleType !== 'Other' && (
            <span
              className="text-[10px] px-1.5 py-0.5 rounded-full"
              style={getRoleTypeBadgeStyle(localRoleType)}
            >
              {localRoleType}
            </span>
          )}
          {needsAttention && (
            <span
              className="text-[10px] px-1.5 py-0.5 rounded"
              style={{ backgroundColor: 'rgba(210, 105, 30, 0.15)', color: 'var(--scout-sunset)' }}
            >
              Needs info
            </span>
          )}
          <svg
            className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
            style={{ color: 'var(--scout-earth-light)' }}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="px-3 pb-3 space-y-3 border-t" style={{ borderColor: 'var(--scout-border)' }}>
          {/* Buyer Persona / Role Type */}
          <div className="pt-3">
            <label className="block text-[10px] font-medium uppercase tracking-wide mb-1.5" style={{ color: 'var(--scout-earth-light)' }}>
              Buyer Persona
            </label>
            <div className="flex flex-wrap gap-1">
              {ROLE_TYPES.map(role => {
                const isSelected = localRoleType === role
                const style = getRoleTypeBadgeStyle(role)
                return (
                  <button
                    key={role}
                    onClick={() => handleRoleChange(role)}
                    className="text-xs px-2 py-1 rounded-full transition-all"
                    style={{
                      backgroundColor: isSelected ? style.backgroundColor : 'transparent',
                      color: isSelected ? style.color : 'var(--scout-earth-light)',
                      border: `1px solid ${isSelected ? style.color : 'var(--scout-border)'}`,
                    }}
                  >
                    {role}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Sentiment */}
          <div>
            <label className="block text-[10px] font-medium uppercase tracking-wide mb-1.5" style={{ color: 'var(--scout-earth-light)' }}>
              Sentiment
            </label>
            <div className="flex gap-1">
              {SENTIMENTS.map(sentiment => {
                const info = getSentimentIndicator(sentiment)
                const isSelected = localSentiment === sentiment
                return (
                  <button
                    key={sentiment}
                    onClick={() => handleSentimentChange(sentiment)}
                    className="flex items-center gap-1 text-xs px-2 py-1 rounded-full transition-all"
                    style={{
                      backgroundColor: isSelected ? info.bg : 'transparent',
                      color: isSelected ? info.color : 'var(--scout-earth-light)',
                      border: `1px solid ${isSelected ? info.color : 'var(--scout-border)'}`,
                    }}
                  >
                    <span className="text-sm">{info.icon}</span>
                    {sentiment}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-[10px] font-medium uppercase tracking-wide mb-1.5" style={{ color: 'var(--scout-earth-light)' }}>
              Notes
            </label>
            <textarea
              value={localNotes}
              onChange={(e) => handleNotesChange(e.target.value)}
              rows={2}
              placeholder="Key insights, relationship status, conversation notes..."
              className="w-full px-2 py-1.5 text-xs rounded border resize-none"
              style={{ borderColor: 'var(--scout-border)', color: 'var(--scout-earth)' }}
            />
          </div>

          {/* Contact Info Summary */}
          {(stakeholder.email || stakeholder.phone || stakeholder.linkedin_url) && (
            <div className="flex flex-wrap gap-2 text-[10px]" style={{ color: 'var(--scout-earth-light)' }}>
              {stakeholder.email && (
                <a href={`mailto:${stakeholder.email}`} className="hover:underline">
                  ✉️ {stakeholder.email}
                </a>
              )}
              {stakeholder.phone && (
                <a href={`tel:${stakeholder.phone}`} className="hover:underline">
                  📞 {stakeholder.phone}
                </a>
              )}
              {stakeholder.linkedin_url && (
                <a href={stakeholder.linkedin_url} target="_blank" rel="noopener noreferrer" className="hover:underline">
                  🔗 LinkedIn
                </a>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between pt-2 border-t" style={{ borderColor: 'var(--scout-border)' }}>
            {onEdit && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onEdit()
                }}
                className="text-xs flex items-center gap-1 hover:underline"
                style={{ color: 'var(--scout-sky)' }}
              >
                Edit Details →
              </button>
            )}
            <div className="flex-1" />
            {hasChanges && (
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="text-xs px-3 py-1 rounded text-white disabled:opacity-50"
                style={{ backgroundColor: 'var(--scout-trail)' }}
              >
                {isSaving ? 'Saving...' : 'Save'}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
