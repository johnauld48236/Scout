'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { ScoutAIIcon } from '@/components/ui/scout-logo'
import type { Account, Stakeholder, Pursuit } from './PlanningContainer'

interface BANTScore {
  budget_score: number
  authority_score: number
  need_score: number
  timeline_score: number
}

interface OpportunityBuilderProps {
  account: Account
  stakeholders: Stakeholder[]
  pursuits: Pursuit[]
  updatePursuits: (pursuits: Pursuit[]) => void
  onNext: () => void
  onPrev: () => void
}

export function OpportunityBuilder({
  account,
  stakeholders,
  pursuits,
  updatePursuits,
  onNext,
  onPrev,
}: OpportunityBuilderProps) {
  const [showAddForm, setShowAddForm] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [aiFeedback, setAiFeedback] = useState<{ type: 'success' | 'empty' | 'error'; message: string; details?: string } | null>(null)
  const [newPursuit, setNewPursuit] = useState({ name: '', description: '', estimated_value: '' })
  const [savingIds, setSavingIds] = useState<Set<string>>(new Set())
  const [bantScores, setBantScores] = useState<Record<string, BANTScore>>({})
  const [expandedBant, setExpandedBant] = useState<string | null>(null)
  const businessUnits = account.business_units || []
  const saveTimeouts = useRef<Record<string, NodeJS.Timeout>>({})
  const bantSaveTimeouts = useRef<Record<string, NodeJS.Timeout>>({})

  // BANT score helpers
  const getBANTTotal = (pursuitId: string): number => {
    const scores = bantScores[pursuitId]
    if (!scores) return 0
    return (scores.budget_score || 0) + (scores.authority_score || 0) + (scores.need_score || 0) + (scores.timeline_score || 0)
  }

  const getBANTColor = (total: number): { bg: string; text: string } => {
    if (total >= 75) return { bg: 'rgba(93, 122, 93, 0.15)', text: 'var(--scout-trail)' }
    if (total >= 50) return { bg: 'rgba(74, 144, 164, 0.15)', text: 'var(--scout-sky)' }
    if (total >= 25) return { bg: 'rgba(210, 105, 30, 0.15)', text: 'var(--scout-sunset)' }
    return { bg: 'rgba(169, 68, 66, 0.15)', text: 'var(--scout-clay)' }
  }

  const getScoreColor = (score: number) => {
    if (score >= 25) return { bg: 'rgba(93, 122, 93, 0.15)', color: 'var(--scout-trail)', border: 'var(--scout-trail)' }
    if (score >= 15) return { bg: 'rgba(210, 105, 30, 0.15)', color: 'var(--scout-sunset)', border: 'var(--scout-sunset)' }
    return { bg: 'var(--scout-parchment)', color: 'var(--scout-earth-light)', border: 'var(--scout-border)' }
  }

  const updateBANTScore = (pursuitId: string, dimension: keyof BANTScore, value: number) => {
    const current = bantScores[pursuitId] || { budget_score: 0, authority_score: 0, need_score: 0, timeline_score: 0 }
    const updated = { ...current, [dimension]: value }
    setBantScores(prev => ({ ...prev, [pursuitId]: updated }))

    // Debounce save to database
    if (bantSaveTimeouts.current[pursuitId]) {
      clearTimeout(bantSaveTimeouts.current[pursuitId])
    }

    bantSaveTimeouts.current[pursuitId] = setTimeout(async () => {
      try {
        await fetch('/api/bant-analyses', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            pursuit_id: pursuitId,
            ...updated,
            analysis_source: 'Wizard',
          }),
        })
      } catch (error) {
        console.error('Failed to save BANT score:', error)
      }
    }, 500)
  }

  // Load existing BANT scores when pursuits change
  useEffect(() => {
    const loadBANTScores = async () => {
      const scores: Record<string, BANTScore> = {}

      for (const pursuit of pursuits) {
        // Skip temp IDs
        if (pursuit.pursuit_id.startsWith('pursuit-')) continue

        try {
          const response = await fetch(`/api/bant-analyses?pursuit_id=${pursuit.pursuit_id}`)
          if (response.ok) {
            const data = await response.json()
            const latest = data.bant_analyses?.[0] // Most recent analysis
            if (latest) {
              scores[pursuit.pursuit_id] = {
                budget_score: latest.budget_score || 0,
                authority_score: latest.authority_score || 0,
                need_score: latest.need_score || 0,
                timeline_score: latest.timeline_score || 0,
              }
            }
          }
        } catch (error) {
          console.error('Failed to load BANT score for pursuit:', pursuit.pursuit_id, error)
        }
      }

      if (Object.keys(scores).length > 0) {
        setBantScores(prev => ({ ...prev, ...scores }))
      }
    }

    loadBANTScores()
  }, [pursuits.map(p => p.pursuit_id).join(',')])

  // Debounced save to database
  const savePursuitToDb = useCallback(async (pursuit: Pursuit) => {
    // Don't save if it's a temp ID (not yet in database)
    if (pursuit.pursuit_id.startsWith('pursuit-')) {
      console.log('Skipping save for temp pursuit:', pursuit.pursuit_id)
      return
    }

    setSavingIds(prev => new Set(prev).add(pursuit.pursuit_id))

    try {
      const response = await fetch('/api/pursuits', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pursuit_id: pursuit.pursuit_id,
          name: pursuit.name,
          estimated_value: pursuit.estimated_value,
          business_unit_id: pursuit.business_unit_id,
          thesis: pursuit.thesis,
          engagement_plan: pursuit.engagement_plan,
        }),
      })

      if (!response.ok) {
        console.error('Failed to save pursuit:', await response.text())
      }
    } catch (error) {
      console.error('Error saving pursuit:', error)
    } finally {
      setSavingIds(prev => {
        const next = new Set(prev)
        next.delete(pursuit.pursuit_id)
        return next
      })
    }
  }, [])

  const updatePursuit = (pursuitId: string, updates: Partial<Pursuit>) => {
    // Update local state immediately
    const updatedPursuits = pursuits.map(p =>
      p.pursuit_id === pursuitId ? { ...p, ...updates } : p
    )
    updatePursuits(updatedPursuits)

    // Debounce the save to database (500ms delay)
    if (saveTimeouts.current[pursuitId]) {
      clearTimeout(saveTimeouts.current[pursuitId])
    }

    const updatedPursuit = updatedPursuits.find(p => p.pursuit_id === pursuitId)
    if (updatedPursuit) {
      saveTimeouts.current[pursuitId] = setTimeout(() => {
        savePursuitToDb(updatedPursuit)
      }, 500)
    }
  }

  const formatValue = (value?: number): string => {
    if (!value) return ''
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`
    if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`
    return `$${value}`
  }

  const addPursuit = async () => {
    if (!newPursuit.name.trim()) return

    const pursuit: Pursuit = {
      pursuit_id: `pursuit-${Date.now()}`,
      account_plan_id: account.account_plan_id,
      name: newPursuit.name.trim(),
      description: newPursuit.description.trim() || undefined,
      estimated_value: newPursuit.estimated_value ? parseInt(newPursuit.estimated_value) : undefined,
      stage: 'Prospecting',
    }

    updatePursuits([...pursuits, pursuit])
    setNewPursuit({ name: '', description: '', estimated_value: '' })
    setShowAddForm(false)

    // Persist to server
    try {
      await fetch('/api/pursuits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          account_plan_id: account.account_plan_id,
          name: pursuit.name,
          description: pursuit.description,
          estimated_value: pursuit.estimated_value,
          stage: pursuit.stage,
        }),
      })
    } catch (error) {
      console.error('Failed to add pursuit:', error)
    }
  }

  const deletePursuit = async (pursuitId: string) => {
    updatePursuits(pursuits.filter(p => p.pursuit_id !== pursuitId))

    // Persist to server (only if it's a real ID, not a temp one)
    if (!pursuitId.startsWith('pursuit-')) {
      try {
        await fetch('/api/pursuits', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pursuit_id: pursuitId }),
        })
      } catch (error) {
        console.error('Failed to delete pursuit:', error)
      }
    }
  }

  const generateOpportunities = async () => {
    setIsGenerating(true)
    setAiFeedback(null)
    try {
      const researchFindings = account.research_findings || []
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `Analyze ${account.account_name} and suggest 2-4 sales opportunities based on their situation.

Company Info:
- Industry/Vertical: ${account.industry || 'Unknown'}
- Size: ${account.employee_count || 'Unknown'}
- Description: ${account.description || 'Not available'}

Research Findings:
${researchFindings.map(f => `- ${f.category}: ${f.content}`).join('\n')}

Business Units:
${businessUnits.map(u => `- ${u.name}: ${u.description || 'No description'}`).join('\n')}

IMPORTANT: Check if this company's industry/vertical matches any active campaigns. If so, prioritize opportunities that align with campaign themes and use campaign-specific value propositions. Retrieve campaign details if needed to understand the campaign's focus areas, target pain points, and signal triggers.

For each opportunity, provide:
Opportunity: [Name - brief, actionable title, aligned with campaign if applicable]
Description: [1-2 sentences on the opportunity - reference campaign themes if relevant]
Value: [Estimated deal size in USD, e.g., 250000]
Unit: [Which business unit this applies to]`,
          context: { navigation: { page: 'accounts' } },
        }),
      })

      if (response.ok) {
        const result = await response.json()
        const content = result.content
        console.log('AI Response:', content) // Debug
        const newPursuits: Pursuit[] = []

        // Split by markdown headers or "Opportunity" patterns
        // Handles: ### Opportunity 1:, ## **Opportunity 1:, Opportunity 1:, etc.
        const blocks = content
          .split(/(?=#{1,3}\s*\**Opportunity\s*\d*)/i)
          .filter((b: string) => b.trim() && /opportunity/i.test(b))

        console.log('Parsed blocks:', blocks.length) // Debug

        blocks.forEach((block: string, i: number) => {
          // Extract name from markdown header: ## **Opportunity 1: Name Here**
          // Or: ### Opportunity 1: Name Here
          const nameMatch = block.match(/#{1,3}\s*\**Opportunity\s*\d*[:\s]*\**\s*([^*\n]+)/i)

          // Extract description (handles **Description**: format)
          const descMatch = block.match(/\*{0,2}Description\*{0,2}[:\s]*([^\n]+)/i)

          // Extract value (handles **Value**: $X format)
          const valueMatch = block.match(/\*{0,2}Value\*{0,2}[:\s]*\$?([\d,]+)/i)

          // Extract unit (handles **Unit**: Name format)
          const unitMatch = block.match(/\*{0,2}Unit\*{0,2}[:\s]*([^\n]+)/i)

          if (nameMatch) {
            // Clean up the name - remove markdown formatting
            const name = nameMatch[1]
              .replace(/\*+/g, '')
              .replace(/^[-\s]+/, '')
              .trim()

            const unitName = unitMatch?.[1]?.replace(/\*+/g, '').trim()
            const unit = businessUnits.find(u =>
              u.name.toLowerCase().includes(unitName?.toLowerCase() || '') ||
              unitName?.toLowerCase().includes(u.name.toLowerCase())
            )
            const value = valueMatch?.[1]?.replace(/,/g, '')
            const description = descMatch?.[1]?.replace(/\*+/g, '').trim()

            if (name.length > 2 && name.length < 200) {
              newPursuits.push({
                pursuit_id: `pursuit-${Date.now()}-${i}`,
                account_plan_id: account.account_plan_id,
                name,
                description,
                estimated_value: value ? parseInt(value) : undefined,
                business_unit_id: unit?.id,
                stage: 'Prospecting',
              })
            }
          }
        })

        console.log('Parsed pursuits:', newPursuits) // Debug

        if (newPursuits.length > 0) {
          setAiFeedback({
            type: 'success',
            message: `Found ${newPursuits.length} potential ${newPursuits.length === 1 ? 'opportunity' : 'opportunities'}! Saving...`
          })

          // Persist AI-generated pursuits to database and update with real IDs
          const savedPursuits: Pursuit[] = []
          for (const pursuit of newPursuits) {
            try {
              const response = await fetch('/api/pursuits', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  account_plan_id: pursuit.account_plan_id,
                  name: pursuit.name,
                  description: pursuit.description,
                  estimated_value: pursuit.estimated_value,
                  stage: pursuit.stage,
                  business_unit_id: pursuit.business_unit_id,
                }),
              })
              if (response.ok) {
                const result = await response.json()
                // Use the real ID from database
                savedPursuits.push({
                  ...pursuit,
                  pursuit_id: result.pursuit?.pursuit_id || pursuit.pursuit_id,
                })
                console.log('Saved pursuit:', result.pursuit) // Debug
              } else {
                // Get response text first, then try to parse as JSON
                const responseText = await response.text()
                console.error('Failed to save pursuit - Status:', response.status, 'Response:', responseText)

                let errorData: { error?: string; details?: string; hint?: string; code?: string } = { error: 'Unknown error' }
                try {
                  errorData = JSON.parse(responseText)
                } catch {
                  errorData = { error: responseText || `HTTP ${response.status}` }
                }

                setAiFeedback({
                  type: 'error',
                  message: 'Failed to save opportunity to database',
                  details: `${errorData.details || errorData.error || `HTTP ${response.status}`}${errorData.hint ? ` (${errorData.hint})` : ''}${errorData.code ? ` [${errorData.code}]` : ''}`
                })
                savedPursuits.push(pursuit) // Keep temp ID if save failed
              }
            } catch (error) {
              console.error('Failed to persist pursuit:', error)
              savedPursuits.push(pursuit)
            }
          }
          // Update state with saved pursuits (with real IDs)
          updatePursuits([...pursuits, ...savedPursuits])

          // Provide detailed feedback
          const savedCount = savedPursuits.filter(p => !p.pursuit_id.startsWith('pursuit-')).length
          const failedCount = savedPursuits.length - savedCount

          if (savedCount === savedPursuits.length) {
            setAiFeedback({
              type: 'success',
              message: `Saved ${savedCount} ${savedCount === 1 ? 'opportunity' : 'opportunities'} to database!`
            })
          } else if (savedCount > 0) {
            setAiFeedback({
              type: 'empty',
              message: `Saved ${savedCount} of ${savedPursuits.length} opportunities.`,
              details: `${failedCount} ${failedCount === 1 ? 'opportunity' : 'opportunities'} could not be saved to database. Check console for details.`
            })
          } else {
            setAiFeedback({
              type: 'error',
              message: 'Could not save opportunities to database.',
              details: 'Opportunities are shown locally but may not persist. Check console for details.'
            })
          }
        } else {
          // Show what AI returned for debugging
          const preview = content.slice(0, 200)
          setAiFeedback({
            type: 'empty',
            message: 'Could not parse opportunities from AI response.',
            details: `AI responded but parsing failed. Preview: "${preview}..."`
          })
        }
      } else {
        setAiFeedback({
          type: 'error',
          message: 'Failed to generate opportunities. Please try again.',
          details: `API returned status: ${response.status}`
        })
      }
    } catch (error) {
      console.error('Failed to generate opportunities:', error)
      setAiFeedback({
        type: 'error',
        message: 'Failed to generate opportunities. Please try again.'
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
          Opportunity Builder
        </h2>
        <p className="text-sm" style={{ color: 'var(--scout-earth-light)' }}>
          Connect your opportunities to business units, signals, and stakeholders.
        </p>
      </div>

      {/* AI Generate Button */}
      {pursuits.length === 0 && (
        <button
          onClick={generateOpportunities}
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
              <span>Scout AI identifying opportunities...</span>
            </>
          ) : (
            <>
              <ScoutAIIcon size={22} className="text-white" />
              <span style={{ fontFamily: "'Bitter', Georgia, serif" }}>
                Scout AI: Suggest Opportunities
              </span>
            </>
          )}
        </button>
      )}

      {/* AI Feedback Message */}
      {aiFeedback && (
        <div
          className="mb-4 p-3 rounded-lg"
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
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">{aiFeedback.message}</span>
            <button
              onClick={() => setAiFeedback(null)}
              className="text-sm hover:underline ml-4"
            >
              ✕
            </button>
          </div>
          {aiFeedback.details && (
            <p className="text-xs mt-2 opacity-80">{aiFeedback.details}</p>
          )}
        </div>
      )}

      {pursuits.length === 0 && !showAddForm ? (
        <div
          className="p-8 rounded-lg border border-dashed text-center"
          style={{ borderColor: 'var(--scout-border)' }}
        >
          <p className="text-sm mb-4" style={{ color: 'var(--scout-earth-light)' }}>
            No opportunities defined yet. Use Scout AI above or add one manually.
          </p>
          <button
            onClick={() => setShowAddForm(true)}
            className="px-4 py-2 rounded-lg text-sm font-medium border transition-colors"
            style={{ borderColor: 'var(--scout-saddle)', color: 'var(--scout-saddle)' }}
          >
            + Add Opportunity Manually
          </button>
        </div>
      ) : pursuits.length === 0 && showAddForm ? (
        <div
          className="p-4 rounded-lg border mb-6"
          style={{ backgroundColor: 'var(--scout-parchment)', borderColor: 'var(--scout-border)' }}
        >
          <h4 className="text-sm font-medium mb-3" style={{ color: 'var(--scout-earth)' }}>
            Add New Opportunity
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <input
              type="text"
              value={newPursuit.name}
              onChange={(e) => setNewPursuit({ ...newPursuit, name: e.target.value })}
              placeholder="Opportunity name"
              className="border rounded-lg px-3 py-2 text-sm"
              style={{ borderColor: 'var(--scout-border)' }}
            />
            <input
              type="text"
              value={newPursuit.description}
              onChange={(e) => setNewPursuit({ ...newPursuit, description: e.target.value })}
              placeholder="Description (optional)"
              className="border rounded-lg px-3 py-2 text-sm"
              style={{ borderColor: 'var(--scout-border)' }}
            />
            <input
              type="number"
              value={newPursuit.estimated_value}
              onChange={(e) => setNewPursuit({ ...newPursuit, estimated_value: e.target.value })}
              placeholder="Estimated value ($)"
              className="border rounded-lg px-3 py-2 text-sm"
              style={{ borderColor: 'var(--scout-border)' }}
            />
          </div>
          <div className="mt-3 flex gap-2">
            <button
              onClick={addPursuit}
              disabled={!newPursuit.name.trim()}
              className="px-4 py-2 text-white text-sm rounded-lg font-medium disabled:opacity-50"
              style={{ backgroundColor: 'var(--scout-trail)' }}
            >
              Add Opportunity
            </button>
            <button
              onClick={() => setShowAddForm(false)}
              className="px-4 py-2 text-sm"
              style={{ color: 'var(--scout-earth-light)' }}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <>
        <div className="space-y-4 mb-4">
          {pursuits.map(pursuit => {
            const isSaving = savingIds.has(pursuit.pursuit_id)
            return (
            <div
              key={pursuit.pursuit_id}
              className="p-4 rounded-lg border relative"
              style={{ backgroundColor: 'var(--scout-white)', borderColor: 'var(--scout-border)' }}
            >
              {/* Saving indicator */}
              {isSaving && (
                <div className="absolute top-2 right-2 flex items-center gap-1 text-xs" style={{ color: 'var(--scout-trail)' }}>
                  <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>Saving...</span>
                </div>
              )}
              <div className="flex items-start justify-between gap-4 mb-4">
                <div className="flex-1 space-y-2">
                  <input
                    type="text"
                    value={pursuit.name}
                    onChange={(e) => updatePursuit(pursuit.pursuit_id, { name: e.target.value })}
                    className="w-full font-semibold bg-transparent border-b border-transparent hover:border-gray-300 focus:border-blue-500 focus:outline-none py-1"
                    style={{ color: 'var(--scout-earth)' }}
                  />
                  <textarea
                    value={pursuit.description || ''}
                    onChange={(e) => updatePursuit(pursuit.pursuit_id, { description: e.target.value })}
                    placeholder="Add description..."
                    rows={2}
                    className="w-full text-sm bg-transparent border rounded-lg px-2 py-1 resize-none"
                    style={{ color: 'var(--scout-earth-light)', borderColor: 'var(--scout-border)' }}
                  />
                </div>
                <div className="flex items-start gap-3">
                  <div className="text-right">
                    <div className="flex items-center gap-1">
                      <span className="text-sm" style={{ color: 'var(--scout-trail)' }}>$</span>
                      <input
                        type="number"
                        value={pursuit.estimated_value || ''}
                        onChange={(e) => updatePursuit(pursuit.pursuit_id, { estimated_value: e.target.value ? parseInt(e.target.value) : undefined })}
                        placeholder="Value"
                        className="w-24 font-semibold text-right bg-transparent border-b border-transparent hover:border-gray-300 focus:border-blue-500 focus:outline-none"
                        style={{ color: 'var(--scout-trail)' }}
                      />
                    </div>
                    <select
                      value={pursuit.stage || 'Prospecting'}
                      onChange={(e) => updatePursuit(pursuit.pursuit_id, { stage: e.target.value })}
                      className="text-xs bg-transparent border-none cursor-pointer mt-1"
                      style={{ color: 'var(--scout-earth-light)' }}
                    >
                      <option value="Prospecting">Prospecting</option>
                      <option value="Discovery">Discovery</option>
                      <option value="Proposal">Proposal</option>
                      <option value="Negotiation">Negotiation</option>
                      <option value="Closed Won">Closed Won</option>
                      <option value="Closed Lost">Closed Lost</option>
                    </select>
                  </div>
                  <button
                    onClick={() => deletePursuit(pursuit.pursuit_id)}
                    className="p-1 rounded hover:bg-red-50 transition-colors"
                    title="Delete opportunity"
                  >
                    <svg className="w-4 h-4" style={{ color: 'var(--scout-clay)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Business Unit */}
                <div>
                  <label className="block text-xs mb-1" style={{ color: 'var(--scout-earth-light)' }}>
                    Business Unit
                  </label>
                  <select
                    value={pursuit.business_unit_id || ''}
                    onChange={(e) => updatePursuit(pursuit.pursuit_id, { business_unit_id: e.target.value || undefined })}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                    style={{ borderColor: 'var(--scout-border)', color: 'var(--scout-earth)' }}
                  >
                    <option value="">— Select business unit —</option>
                    {businessUnits.map(unit => (
                      <option key={unit.id} value={unit.id}>{unit.name}</option>
                    ))}
                  </select>
                </div>

                {/* Thesis */}
                <div>
                  <label className="block text-xs mb-1" style={{ color: 'var(--scout-earth-light)' }}>
                    Thesis (Why should they buy?)
                  </label>
                  <input
                    type="text"
                    value={pursuit.thesis || ''}
                    onChange={(e) => updatePursuit(pursuit.pursuit_id, { thesis: e.target.value })}
                    placeholder="Our value proposition for this opportunity..."
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                    style={{ borderColor: 'var(--scout-border)', color: 'var(--scout-earth)' }}
                  />
                </div>
              </div>

              {/* BANT Assessment */}
              <div className="mt-4 pt-4 border-t" style={{ borderColor: 'var(--scout-border)' }}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <label className="text-xs font-medium" style={{ color: 'var(--scout-earth-light)' }}>
                      Initial BANT Assessment
                    </label>
                    {(() => {
                      const total = getBANTTotal(pursuit.pursuit_id)
                      const colors = getBANTColor(total)
                      return (
                        <span
                          className="text-xs font-semibold px-2 py-0.5 rounded-full"
                          style={{ backgroundColor: colors.bg, color: colors.text }}
                        >
                          {total}/100
                        </span>
                      )
                    })()}
                  </div>
                  <button
                    onClick={() => setExpandedBant(expandedBant === pursuit.pursuit_id ? null : pursuit.pursuit_id)}
                    className="text-xs"
                    style={{ color: 'var(--scout-sky)' }}
                  >
                    {expandedBant === pursuit.pursuit_id ? 'Collapse' : 'Expand'}
                  </button>
                </div>

                {/* Compact BANT Grid */}
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { key: 'budget_score' as const, label: 'B', title: 'Budget' },
                    { key: 'authority_score' as const, label: 'A', title: 'Authority' },
                    { key: 'need_score' as const, label: 'N', title: 'Need' },
                    { key: 'timeline_score' as const, label: 'T', title: 'Timeline' },
                  ].map(item => {
                    const score = bantScores[pursuit.pursuit_id]?.[item.key] || 0
                    const colors = getScoreColor(score)
                    return (
                      <div key={item.key} className="text-center">
                        <div
                          className="p-2 rounded-lg border cursor-pointer transition-all hover:shadow-sm"
                          style={{ backgroundColor: colors.bg, borderColor: colors.border }}
                          onClick={() => {
                            // Cycle through 0 -> 15 -> 25 -> 0
                            const nextValue = score === 0 ? 15 : score === 15 ? 25 : 0
                            updateBANTScore(pursuit.pursuit_id, item.key, nextValue)
                          }}
                          title={`${item.title}: Click to cycle (0/15/25)`}
                        >
                          <div className="text-lg font-bold" style={{ color: colors.color }}>
                            {item.label}
                          </div>
                          <div className="text-xs" style={{ color: colors.color }}>
                            {score === 0 ? '—' : score === 15 ? 'Partial' : 'Yes'}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Expanded BANT Details */}
                {expandedBant === pursuit.pursuit_id && (
                  <div className="mt-3 pt-3 border-t space-y-3" style={{ borderColor: 'var(--scout-border)' }}>
                    {[
                      { key: 'budget_score' as const, label: 'Budget', desc: 'Is there approved budget?' },
                      { key: 'authority_score' as const, label: 'Authority', desc: 'Talking to decision makers?' },
                      { key: 'need_score' as const, label: 'Need', desc: 'Compelling business need?' },
                      { key: 'timeline_score' as const, label: 'Timeline', desc: 'Urgency to act?' },
                    ].map(item => {
                      const score = bantScores[pursuit.pursuit_id]?.[item.key] || 0
                      return (
                        <div key={item.key} className="flex items-center gap-3">
                          <div className="flex-1">
                            <p className="text-sm font-medium" style={{ color: 'var(--scout-earth)' }}>{item.label}</p>
                            <p className="text-xs" style={{ color: 'var(--scout-earth-light)' }}>{item.desc}</p>
                          </div>
                          <div className="flex gap-1">
                            {[0, 15, 25].map(value => {
                              const isSelected = score === value
                              const colors = getScoreColor(value)
                              return (
                                <button
                                  key={value}
                                  onClick={() => updateBANTScore(pursuit.pursuit_id, item.key, value)}
                                  className="px-3 py-1 rounded text-xs font-medium transition-all"
                                  style={{
                                    backgroundColor: isSelected ? colors.bg : 'transparent',
                                    color: isSelected ? colors.color : 'var(--scout-earth-light)',
                                    border: `1px solid ${isSelected ? colors.border : 'var(--scout-border)'}`,
                                  }}
                                >
                                  {value === 0 ? 'No' : value === 15 ? 'Partial' : 'Yes'}
                                </button>
                              )
                            })}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Key Stakeholders */}
              <div className="mt-4">
                <label className="block text-xs mb-2" style={{ color: 'var(--scout-earth-light)' }}>
                  Key Stakeholders
                </label>
                <div className="flex flex-wrap gap-2">
                  {stakeholders
                    .filter(s => !s.is_placeholder)
                    .slice(0, 8)
                    .map(s => {
                      const isSelected = pursuit.engagement_plan?.sequence?.some(
                        seq => seq.stakeholder_id === s.stakeholder_id
                      )
                      return (
                        <button
                          key={s.stakeholder_id}
                          onClick={() => {
                            const currentSequence = pursuit.engagement_plan?.sequence || []
                            const newSequence = isSelected
                              ? currentSequence.filter(seq => seq.stakeholder_id !== s.stakeholder_id)
                              : [...currentSequence, { stakeholder_id: s.stakeholder_id, order: currentSequence.length + 1 }]
                            updatePursuit(pursuit.pursuit_id, {
                              engagement_plan: { sequence: newSequence }
                            })
                          }}
                          className="px-3 py-1.5 rounded-full text-xs font-medium border transition-colors"
                          style={{
                            backgroundColor: isSelected ? 'var(--scout-saddle)' : 'white',
                            color: isSelected ? 'white' : 'var(--scout-earth)',
                            borderColor: isSelected ? 'var(--scout-saddle)' : 'var(--scout-border)',
                          }}
                        >
                          {s.full_name}
                        </button>
                      )
                    })}
                </div>
              </div>
            </div>
          )})}
        </div>

        {/* Add More Opportunities */}
        {showAddForm ? (
          <div
            className="p-4 rounded-lg border mb-6"
            style={{ backgroundColor: 'var(--scout-parchment)', borderColor: 'var(--scout-border)' }}
          >
            <h4 className="text-sm font-medium mb-3" style={{ color: 'var(--scout-earth)' }}>
              Add New Opportunity
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <input
                type="text"
                value={newPursuit.name}
                onChange={(e) => setNewPursuit({ ...newPursuit, name: e.target.value })}
                placeholder="Opportunity name"
                className="border rounded-lg px-3 py-2 text-sm"
                style={{ borderColor: 'var(--scout-border)' }}
              />
              <input
                type="text"
                value={newPursuit.description}
                onChange={(e) => setNewPursuit({ ...newPursuit, description: e.target.value })}
                placeholder="Description (optional)"
                className="border rounded-lg px-3 py-2 text-sm"
                style={{ borderColor: 'var(--scout-border)' }}
              />
              <input
                type="number"
                value={newPursuit.estimated_value}
                onChange={(e) => setNewPursuit({ ...newPursuit, estimated_value: e.target.value })}
                placeholder="Estimated value ($)"
                className="border rounded-lg px-3 py-2 text-sm"
                style={{ borderColor: 'var(--scout-border)' }}
              />
            </div>
            <div className="mt-3 flex gap-2">
              <button
                onClick={addPursuit}
                disabled={!newPursuit.name.trim()}
                className="px-4 py-2 text-white text-sm rounded-lg font-medium disabled:opacity-50"
                style={{ backgroundColor: 'var(--scout-trail)' }}
              >
                Add Opportunity
              </button>
              <button
                onClick={() => setShowAddForm(false)}
                className="px-4 py-2 text-sm"
                style={{ color: 'var(--scout-earth-light)' }}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="flex gap-3">
            <button
              onClick={() => setShowAddForm(true)}
              className="py-3 px-4 border border-dashed rounded-lg text-sm transition-colors flex-1"
              style={{ borderColor: 'var(--scout-border)', color: 'var(--scout-earth-light)' }}
            >
              + Add Another Opportunity
            </button>
            <button
              onClick={generateOpportunities}
              disabled={isGenerating}
              className="py-3 px-4 rounded-lg text-sm transition-colors flex items-center gap-2"
              style={{ backgroundColor: 'rgba(139, 69, 19, 0.1)', color: 'var(--scout-saddle)' }}
            >
              <ScoutAIIcon size={16} />
              {isGenerating ? 'Generating...' : 'Suggest More'}
            </button>
          </div>
        )}
        </>
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
          Continue to 30/60/90 Plan →
        </button>
      </div>
    </div>
  )
}
