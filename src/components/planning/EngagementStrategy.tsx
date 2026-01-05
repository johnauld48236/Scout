'use client'

import { useState } from 'react'
import { ScoutAIIcon } from '@/components/ui/scout-logo'
import type { Account, Stakeholder, Pursuit } from './PlanningContainer'

interface EngagementStrategyProps {
  account: Account
  stakeholders: Stakeholder[]
  pursuits: Pursuit[]
  updatePursuits: (pursuits: Pursuit[]) => void
  onNext: () => void
  onPrev: () => void
}

export function EngagementStrategy({
  account,
  stakeholders,
  pursuits,
  updatePursuits,
  onNext,
  onPrev,
}: EngagementStrategyProps) {
  const [selectedPursuit, setSelectedPursuit] = useState<string | null>(
    pursuits[0]?.pursuit_id || null
  )
  const [isGenerating, setIsGenerating] = useState(false)
  const [aiFeedback, setAiFeedback] = useState<{ type: 'success' | 'empty' | 'error'; message: string } | null>(null)

  const currentPursuit = pursuits.find(p => p.pursuit_id === selectedPursuit)
  const sequence = currentPursuit?.engagement_plan?.sequence || []

  const getStakeholder = (id: string) => stakeholders.find(s => s.stakeholder_id === id)

  const updateSequence = (newSequence: typeof sequence) => {
    if (!currentPursuit) return
    updatePursuits(
      pursuits.map(p =>
        p.pursuit_id === currentPursuit.pursuit_id
          ? { ...p, engagement_plan: { sequence: newSequence } }
          : p
      )
    )
  }

  const updateSequenceItem = (stakeholderId: string, updates: Partial<typeof sequence[0]>) => {
    updateSequence(
      sequence.map(item =>
        item.stakeholder_id === stakeholderId ? { ...item, ...updates } : item
      )
    )
  }

  const generateEngagementPlan = async () => {
    if (!currentPursuit) return
    setIsGenerating(true)
    setAiFeedback(null)
    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `Create an engagement strategy for the "${currentPursuit.name}" opportunity at ${account.account_name}.

Account Context:
- Company: ${account.account_name}
- Industry/Vertical: ${account.industry || 'Unknown'}
- Description: ${account.description || 'Not available'}

Opportunity: ${currentPursuit.name}
Thesis: ${currentPursuit.thesis || 'Not defined'}
Value: ${currentPursuit.estimated_value ? `$${currentPursuit.estimated_value.toLocaleString()}` : 'TBD'}

Stakeholders to engage:
${sequence.map(s => {
  const stakeholder = getStakeholder(s.stakeholder_id)
  return `- ${stakeholder?.full_name} (${stakeholder?.title || 'Unknown'}) - ${stakeholder?.role_type || 'Unknown role'}`
}).join('\n')}

IMPORTANT: If this account's industry/vertical matches any active campaigns, use the campaign's value proposition and pain points to craft the messaging. Retrieve the campaign details to get specific messaging guidance.

For each stakeholder, provide:
Stakeholder: [Name]
Message: [Key value proposition/message for them - align with campaign if applicable]
Proof: [What proof point or case study would resonate]
Objection: [Likely objection and how to handle]`,
          context: { navigation: { page: 'accounts' } },
        }),
      })

      if (response.ok) {
        const result = await response.json()
        const content = result.content

        console.log('Engagement AI Response:', content) // Debug

        // Split content into sections by stakeholder name or numbered headers
        const newSequence = sequence.map(item => {
          const stakeholder = getStakeholder(item.stakeholder_id)
          if (!stakeholder) return item

          const escapedName = stakeholder.full_name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

          // Try multiple approaches to find the stakeholder's section
          // Approach 1: Look for section by name (handles "## Name" or "1. Name" or "**Name**")
          const sectionRegex = new RegExp(
            `(?:#{1,3}\\s*\\d*\\.?\\s*|\\d+\\.\\s*|\\*{1,2})?${escapedName}[\\s\\S]*?(?=(?:#{1,3}\\s*\\d*\\.?\\s*|\\d+\\.\\s*|\\*{1,2})\\S|$)`,
            'i'
          )
          const sectionMatch = content.match(sectionRegex)
          const section = sectionMatch ? sectionMatch[0] : content

          // Extract Message/Key Message
          const messageMatch = section.match(/\*{0,2}(?:Key\s+)?Message\*{0,2}[:\s]+([^\n]+(?:\n(?![*#\d])[^\n]+)*)/i)

          // Extract Proof/Proof Needed/Proof Point
          const proofMatch = section.match(/\*{0,2}(?:Proof(?:\s+(?:Needed|Point|Points?))?)\*{0,2}[:\s]+([^\n]+(?:\n(?![*#\d])[^\n]+)*)/i)

          // Extract Objection/Objections/Likely Objection
          const objectionMatch = section.match(/\*{0,2}(?:(?:Likely\s+)?Objections?|How to Handle)\*{0,2}[:\s]+([^\n]+(?:\n(?![*#\d])[^\n]+)*)/i)

          // Only update if we found at least one field
          if (messageMatch || proofMatch || objectionMatch) {
            return {
              ...item,
              message: messageMatch ? messageMatch[1].replace(/\*+/g, '').trim() : item.message,
              proof_needed: proofMatch ? proofMatch[1].replace(/\*+/g, '').trim() : item.proof_needed,
              objections: objectionMatch ? objectionMatch[1].replace(/\*+/g, '').trim() : item.objections,
            }
          }
          return item
        })

        // Check if any updates were made
        const hasUpdates = newSequence.some((item, i) =>
          item.message !== sequence[i].message ||
          item.proof_needed !== sequence[i].proof_needed ||
          item.objections !== sequence[i].objections
        )

        if (hasUpdates) {
          updateSequence(newSequence)
          const updatedCount = newSequence.filter((item, i) =>
            item.message !== sequence[i].message ||
            item.proof_needed !== sequence[i].proof_needed ||
            item.objections !== sequence[i].objections
          ).length
          setAiFeedback({
            type: 'success',
            message: `Generated messaging for ${updatedCount} ${updatedCount === 1 ? 'stakeholder' : 'stakeholders'}!`
          })
        } else {
          console.log('Could not parse engagement plan from AI response')
          setAiFeedback({
            type: 'empty',
            message: 'Could not extract messaging from AI response. Try editing manually or regenerating.'
          })
        }
      } else {
        setAiFeedback({
          type: 'error',
          message: 'AI request failed. Please try again.'
        })
      }
    } catch (error) {
      console.error('Failed to generate engagement plan:', error)
      setAiFeedback({
        type: 'error',
        message: 'Failed to generate engagement plan. Please try again.'
      })
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div>
      <div className="mb-6">
        <h2
          className="text-lg font-semibold mb-1"
          style={{ color: 'var(--scout-saddle)', fontFamily: "'Bitter', Georgia, serif" }}
        >
          Engagement Strategy
        </h2>
        <p className="text-sm" style={{ color: 'var(--scout-earth-light)' }}>
          Plan your stakeholder engagement sequence and messaging for each opportunity.
        </p>
      </div>

      {/* Opportunity Selector */}
      {pursuits.length > 1 && (
        <div className="mb-6">
          <label className="block text-xs mb-2" style={{ color: 'var(--scout-earth-light)' }}>
            Select Opportunity
          </label>
          <div className="flex flex-wrap gap-2">
            {pursuits.map(p => (
              <button
                key={p.pursuit_id}
                onClick={() => setSelectedPursuit(p.pursuit_id)}
                className="px-4 py-2 rounded-lg text-sm font-medium border transition-colors"
                style={{
                  backgroundColor: selectedPursuit === p.pursuit_id ? 'var(--scout-saddle)' : 'white',
                  color: selectedPursuit === p.pursuit_id ? 'white' : 'var(--scout-earth)',
                  borderColor: selectedPursuit === p.pursuit_id ? 'var(--scout-saddle)' : 'var(--scout-border)',
                }}
              >
                {p.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {currentPursuit && sequence.length > 0 && (
        <>
          {/* AI Generate Button */}
          <button
            onClick={generateEngagementPlan}
            disabled={isGenerating}
            className="w-full mb-6 py-3 rounded-lg font-medium transition-all flex items-center justify-center gap-3 text-white disabled:opacity-60"
            style={{
              background: isGenerating
                ? 'var(--scout-earth-light)'
                : 'linear-gradient(135deg, var(--scout-saddle) 0%, var(--scout-sunset) 100%)',
              boxShadow: isGenerating ? 'none' : '0 4px 14px rgba(139, 69, 19, 0.3)',
            }}
          >
            {isGenerating ? (
              <>
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span>Scout AI crafting messaging...</span>
              </>
            ) : (
              <>
                <ScoutAIIcon size={22} className="text-white" />
                <span style={{ fontFamily: "'Bitter', Georgia, serif" }}>
                  Scout AI: Generate Messaging
                </span>
              </>
            )}
          </button>

          {/* AI Feedback Message */}
          {aiFeedback && (
            <div
              className="mb-4 p-3 rounded-lg flex items-center justify-between"
              style={{
                backgroundColor: aiFeedback.type === 'success'
                  ? 'rgba(93, 122, 93, 0.1)'
                  : aiFeedback.type === 'empty'
                  ? 'rgba(210, 105, 30, 0.1)'
                  : 'rgba(169, 68, 66, 0.1)',
                color: aiFeedback.type === 'success'
                  ? 'var(--scout-trail)'
                  : aiFeedback.type === 'empty'
                  ? 'var(--scout-sunset)'
                  : 'var(--scout-clay)',
              }}
            >
              <span className="text-sm font-medium">{aiFeedback.message}</span>
              <button
                onClick={() => setAiFeedback(null)}
                className="text-sm hover:underline ml-4"
              >
                ✕
              </button>
            </div>
          )}

          {/* Engagement Sequence */}
          <div className="space-y-4">
            {sequence.map((item, index) => {
              const stakeholder = getStakeholder(item.stakeholder_id)
              if (!stakeholder) return null

              return (
                <div
                  key={item.stakeholder_id}
                  className="p-4 rounded-lg border"
                  style={{ backgroundColor: 'var(--scout-parchment)', borderColor: 'var(--scout-border)' }}
                >
                  <div className="flex items-center gap-3 mb-4">
                    <span
                      className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold"
                      style={{ backgroundColor: 'var(--scout-saddle)', color: 'white' }}
                    >
                      {index + 1}
                    </span>
                    <div>
                      <p className="font-medium" style={{ color: 'var(--scout-earth)' }}>
                        {stakeholder.full_name}
                      </p>
                      <p className="text-xs" style={{ color: 'var(--scout-earth-light)' }}>
                        {stakeholder.title} • {stakeholder.role_type || 'Unknown role'}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs mb-1" style={{ color: 'var(--scout-earth-light)' }}>
                        Key Message
                      </label>
                      <textarea
                        value={item.message || ''}
                        onChange={(e) => updateSequenceItem(item.stakeholder_id, { message: e.target.value })}
                        placeholder="What's the core value proposition for this stakeholder?"
                        rows={2}
                        className="w-full border rounded-lg px-3 py-2 text-sm resize-none"
                        style={{ borderColor: 'var(--scout-border)', color: 'var(--scout-earth)' }}
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs mb-1" style={{ color: 'var(--scout-earth-light)' }}>
                          Proof Needed
                        </label>
                        <input
                          type="text"
                          value={item.proof_needed || ''}
                          onChange={(e) => updateSequenceItem(item.stakeholder_id, { proof_needed: e.target.value })}
                          placeholder="Case study, demo, reference..."
                          className="w-full border rounded-lg px-3 py-2 text-sm"
                          style={{ borderColor: 'var(--scout-border)', color: 'var(--scout-earth)' }}
                        />
                      </div>
                      <div>
                        <label className="block text-xs mb-1" style={{ color: 'var(--scout-earth-light)' }}>
                          Potential Objections
                        </label>
                        <input
                          type="text"
                          value={item.objections || ''}
                          onChange={(e) => updateSequenceItem(item.stakeholder_id, { objections: e.target.value })}
                          placeholder="Likely pushback and response..."
                          className="w-full border rounded-lg px-3 py-2 text-sm"
                          style={{ borderColor: 'var(--scout-border)', color: 'var(--scout-earth)' }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}

      {currentPursuit && sequence.length === 0 && (
        <div
          className="p-8 rounded-lg border border-dashed text-center"
          style={{ borderColor: 'var(--scout-border)' }}
        >
          <p className="text-sm mb-2" style={{ color: 'var(--scout-earth-light)' }}>
            No stakeholders selected for this opportunity.
          </p>
          <button
            onClick={onPrev}
            className="text-sm font-medium hover:underline"
            style={{ color: 'var(--scout-sky)' }}
          >
            ← Go back to select stakeholders
          </button>
        </div>
      )}

      {/* Navigation */}
      <div className="mt-8 pt-4 flex justify-between border-t" style={{ borderColor: 'var(--scout-border)' }}>
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
          Continue to Milestones →
        </button>
      </div>
    </div>
  )
}
