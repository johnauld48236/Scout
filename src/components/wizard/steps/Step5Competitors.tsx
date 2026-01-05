'use client'

import { useState } from 'react'
import { type WizardData, type WizardCompetitor } from '../types'
import { ScoutAIIcon } from '@/components/ui/scout-logo'

interface Step5Props {
  data: WizardData
  updateData: (updates: Partial<WizardData>) => void
  onNext: () => void
  onPrev: () => void
}

const STATUSES: WizardCompetitor['status'][] = [
  'Incumbent',
  'Active',
  'Potential',
  'Displaced',
]

const getStatusStyle = (status: WizardCompetitor['status']) => {
  switch (status) {
    case 'Incumbent':
      return { backgroundColor: 'rgba(169, 68, 66, 0.15)', color: 'var(--scout-clay)', borderColor: 'rgba(169, 68, 66, 0.3)' }
    case 'Active':
      return { backgroundColor: 'rgba(210, 105, 30, 0.15)', color: 'var(--scout-sunset)', borderColor: 'rgba(210, 105, 30, 0.3)' }
    case 'Potential':
      return { backgroundColor: 'rgba(139, 69, 19, 0.15)', color: 'var(--scout-saddle)', borderColor: 'rgba(139, 69, 19, 0.3)' }
    case 'Displaced':
      return { backgroundColor: 'rgba(93, 122, 93, 0.15)', color: 'var(--scout-trail)', borderColor: 'rgba(93, 122, 93, 0.3)' }
    default:
      return { backgroundColor: 'var(--scout-border)', color: 'var(--scout-earth)', borderColor: 'var(--scout-border)' }
  }
}

export default function Step5Competitors({ data, updateData, onNext, onPrev }: Step5Props) {
  const [isGenerating, setIsGenerating] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'success' | 'warning' | 'error'; text: string } | null>(null)
  const [formData, setFormData] = useState<Partial<WizardCompetitor>>({
    status: 'Potential',
  })

  const suggestCompetitors = async () => {
    setIsGenerating(true)
    setFeedbackMessage(null)
    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `For the account ${data.accountName} in the ${data.industry || 'technology'} industry, what competitors might we encounter in a sales process?

Consider:
1. Incumbent vendors they may already be using
2. Active competitors who may also be pursuing this account
3. Alternative solutions they might consider

Company context:
${data.researchFindings.filter(f => f.status === 'accepted' || f.status === 'edited').map(f => `- ${f.content}`).join('\n')}

List 2-4 likely competitors with brief notes on their positioning. Format:
Competitor: [name]
Status: Incumbent/Active/Potential
Notes: [brief positioning notes]`,
          context: {
            navigation: { page: 'accounts' },
          },
        }),
      })

      if (response.ok) {
        const result = await response.json()
        const content = result.content
        const competitors: WizardCompetitor[] = []

        const blocks = content.split(/(?=Competitor:|^\d+\.|^-)/m).filter((b: string) => b.trim())

        blocks.forEach((block: string, i: number) => {
          const nameMatch = block.match(/(?:Competitor:|^[-*\d.]+\s*)([^\n:]+)/i)
          const statusMatch = block.match(/Status:\s*(Incumbent|Active|Potential|Displaced)/i)
          const notesMatch = block.match(/Notes?:\s*([^\n]+)/i)

          if (nameMatch) {
            competitors.push({
              id: `comp-${Date.now()}-${i}`,
              name: nameMatch[1].trim(),
              status: (statusMatch?.[1] as WizardCompetitor['status']) || 'Potential',
              strengths: '',
              weaknesses: '',
              strategy: notesMatch?.[1]?.trim() || '',
            })
          }
        })

        if (competitors.length > 0) {
          updateData({
            competitors: [...data.competitors, ...competitors],
          })
          setFeedbackMessage({
            type: 'success',
            text: `Identified ${competitors.length} potential ${competitors.length === 1 ? 'competitor' : 'competitors'}`,
          })
        } else {
          setFeedbackMessage({
            type: 'warning',
            text: 'No competitors identified. Try adding more research or click again to retry.',
          })
        }
      } else {
        setFeedbackMessage({
          type: 'error',
          text: 'Failed to analyze competitive landscape. Please try again.',
        })
      }
    } catch (err) {
      console.error('Competitor suggestion error:', err)
      setFeedbackMessage({
        type: 'error',
        text: 'Network error. Please check your connection and try again.',
      })
    } finally {
      setIsGenerating(false)
    }
  }

  const addCompetitor = () => {
    if (!formData.name?.trim()) return

    const newCompetitor: WizardCompetitor = {
      id: editingId || `competitor-${Date.now()}`,
      name: formData.name || '',
      status: formData.status || 'Potential',
      strengths: formData.strengths,
      weaknesses: formData.weaknesses,
      strategy: formData.strategy,
    }

    if (editingId) {
      updateData({
        competitors: data.competitors.map(c =>
          c.id === editingId ? newCompetitor : c
        ),
      })
    } else {
      updateData({
        competitors: [...data.competitors, newCompetitor],
      })
    }

    setFormData({ status: 'Potential' })
    setShowForm(false)
    setEditingId(null)
  }

  const editCompetitor = (competitor: WizardCompetitor) => {
    setFormData(competitor)
    setEditingId(competitor.id)
    setShowForm(true)
  }

  const removeCompetitor = (id: string) => {
    updateData({
      competitors: data.competitors.filter(c => c.id !== id),
    })
  }

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-lg border p-4" style={{ borderColor: 'var(--scout-border)' }}>
      <h2 className="text-base font-semibold mb-1" style={{ color: 'var(--scout-earth)' }}>
        Competitive Intelligence
      </h2>
      <p className="text-sm mb-4" style={{ color: 'var(--scout-earth-light)' }}>
        Map the competitive landscape for this account.
      </p>

      {/* Scout AI Button */}
      {data.competitors.length === 0 && (
        <button
          onClick={suggestCompetitors}
          disabled={isGenerating}
          className="w-full mb-4 py-3 rounded-lg font-medium transition-all flex items-center justify-center gap-3 text-white disabled:opacity-60"
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
              <span>Scout AI analyzing landscape...</span>
            </>
          ) : (
            <>
              <ScoutAIIcon size={22} className="text-white" />
              <span style={{ fontFamily: "'Bitter', Georgia, serif" }}>
                Scout AI: Identify Competitors
              </span>
            </>
          )}
        </button>
      )}

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

      {/* Competitor List */}
      {data.competitors.length > 0 && (
        <div className="space-y-3 mb-5">
          {data.competitors.map((competitor) => (
            <div
              key={competitor.id}
              className="p-3 rounded-lg border"
              style={{ backgroundColor: 'var(--scout-parchment)', borderColor: 'var(--scout-border)' }}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium" style={{ color: 'var(--scout-earth)' }}>{competitor.name}</span>
                    <span
                      className="text-xs px-2 py-0.5 rounded-full border font-medium"
                      style={getStatusStyle(competitor.status)}
                    >
                      {competitor.status}
                    </span>
                  </div>
                  {competitor.strategy && (
                    <p className="text-sm mb-2" style={{ color: 'var(--scout-earth-light)' }}>{competitor.strategy}</p>
                  )}
                  <div className="flex gap-4 text-xs flex-wrap">
                    {competitor.strengths && (
                      <span style={{ color: 'var(--scout-trail)' }}>
                        <strong>Strengths:</strong> {competitor.strengths}
                      </span>
                    )}
                    {competitor.weaknesses && (
                      <span style={{ color: 'var(--scout-clay)' }}>
                        <strong>Weaknesses:</strong> {competitor.weaknesses}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => editCompetitor(competitor)}
                    className="text-sm hover:underline"
                    style={{ color: 'var(--scout-sky)' }}
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => removeCompetitor(competitor.id)}
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

      {/* Add Competitor Form */}
      {showForm ? (
        <div className="p-4 rounded-lg border mb-5" style={{ backgroundColor: 'var(--scout-parchment)', borderColor: 'var(--scout-border)' }}>
          <h3 className="text-sm font-medium mb-4" style={{ color: 'var(--scout-earth)' }}>
            {editingId ? 'Edit Competitor' : 'Add Competitor'}
          </h3>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs mb-1" style={{ color: 'var(--scout-earth-light)' }}>Competitor Name *</label>
                <input
                  type="text"
                  value={formData.name || ''}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Acme Corp"
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1"
                  style={{ borderColor: 'var(--scout-border)', color: 'var(--scout-earth)' }}
                />
              </div>
              <div>
                <label className="block text-xs mb-1" style={{ color: 'var(--scout-earth-light)' }}>Status</label>
                <select
                  value={formData.status || 'Potential'}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as WizardCompetitor['status'] })}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1"
                  style={{ borderColor: 'var(--scout-border)', color: 'var(--scout-earth)' }}
                >
                  {STATUSES.map((status) => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs mb-1" style={{ color: 'var(--scout-earth-light)' }}>Their Strengths</label>
              <input
                type="text"
                value={formData.strengths || ''}
                onChange={(e) => setFormData({ ...formData, strengths: e.target.value })}
                placeholder="What are they good at?"
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1"
                style={{ borderColor: 'var(--scout-border)', color: 'var(--scout-earth)' }}
              />
            </div>
            <div>
              <label className="block text-xs mb-1" style={{ color: 'var(--scout-earth-light)' }}>Their Weaknesses</label>
              <input
                type="text"
                value={formData.weaknesses || ''}
                onChange={(e) => setFormData({ ...formData, weaknesses: e.target.value })}
                placeholder="Where do they fall short?"
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1"
                style={{ borderColor: 'var(--scout-border)', color: 'var(--scout-earth)' }}
              />
            </div>
            <div>
              <label className="block text-xs mb-1" style={{ color: 'var(--scout-earth-light)' }}>Our Strategy</label>
              <textarea
                value={formData.strategy || ''}
                onChange={(e) => setFormData({ ...formData, strategy: e.target.value })}
                placeholder="How do we position against them?"
                rows={2}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 resize-none"
                style={{ borderColor: 'var(--scout-border)', color: 'var(--scout-earth)' }}
              />
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <button
              onClick={addCompetitor}
              disabled={!formData.name?.trim()}
              className="px-4 py-2 text-white text-sm rounded-lg font-medium disabled:opacity-50"
              style={{ backgroundColor: 'var(--scout-trail)' }}
            >
              {editingId ? 'Save Changes' : 'Add Competitor'}
            </button>
            <button
              onClick={() => {
                setShowForm(false)
                setEditingId(null)
                setFormData({ status: 'Potential' })
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
          + Add Competitor
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
          Continue to Strategy →
        </button>
      </div>
    </div>
  )
}
