'use client'

import { useState } from 'react'
import { type WizardData, type WizardActionItem } from '../types'
import { ScoutAIIcon } from '@/components/ui/scout-logo'

interface Step7Props {
  data: WizardData
  updateData: (updates: Partial<WizardData>) => void
  onPrev: () => void
  onComplete: () => void
  isSaving: boolean
}

const PRIORITIES: WizardActionItem['priority'][] = ['High', 'Medium', 'Low']
const CATEGORIES: WizardActionItem['category'][] = [
  'Research',
  'Outreach',
  'Meeting',
  'Follow-up',
  'Internal',
  'Other',
]

const getPriorityStyle = (priority: WizardActionItem['priority']) => {
  switch (priority) {
    case 'High':
      return { backgroundColor: 'rgba(169, 68, 66, 0.15)', color: 'var(--scout-clay)', borderColor: 'rgba(169, 68, 66, 0.3)' }
    case 'Medium':
      return { backgroundColor: 'rgba(210, 105, 30, 0.15)', color: 'var(--scout-sunset)', borderColor: 'rgba(210, 105, 30, 0.3)' }
    case 'Low':
      return { backgroundColor: 'rgba(93, 122, 93, 0.15)', color: 'var(--scout-trail)', borderColor: 'rgba(93, 122, 93, 0.3)' }
    default:
      return { backgroundColor: 'var(--scout-border)', color: 'var(--scout-earth)', borderColor: 'var(--scout-border)' }
  }
}

export default function Step7Actions({ data, updateData, onPrev, onComplete, isSaving }: Step7Props) {
  const [isGenerating, setIsGenerating] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'success' | 'warning' | 'error'; text: string } | null>(null)
  const [formData, setFormData] = useState<Partial<WizardActionItem>>({
    priority: 'Medium',
    category: 'Outreach',
  })

  const generateActions = async () => {
    setIsGenerating(true)
    setFeedbackMessage(null)
    try {
      const stakeholderSummary = data.stakeholders
        .map(s => `${s.full_name || 'TBD'} (${s.title || s.role_type})`)
        .join(', ')

      const opportunitySummary = data.pursuits
        .map(p => p.name)
        .join(', ')

      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `Based on the account plan for ${data.accountName}, generate 5-7 immediate next actions to get started.

CONTEXT:
- Strategy: ${data.accountStrategy || 'Not defined'}
- Key Objectives: ${data.keyObjectives?.join('; ') || 'Not defined'}
- Stakeholders: ${stakeholderSummary || 'None mapped'}
- Opportunities: ${opportunitySummary || 'None identified'}
- Competitors: ${data.competitors.map(c => c.name).join(', ') || 'None identified'}

Generate practical, specific actions. Format each as:
Action: [specific action title]
Category: Research/Outreach/Meeting/Follow-up/Internal/Other
Priority: High/Medium/Low
Description: [1 sentence description]`,
          context: {
            navigation: { page: 'accounts' },
          },
        }),
      })

      if (response.ok) {
        const result = await response.json()
        const content = result.content
        const actions: WizardActionItem[] = []

        const blocks = content.split(/(?=Action:|^\d+\.)/m).filter((b: string) => b.trim())

        blocks.forEach((block: string, i: number) => {
          const titleMatch = block.match(/(?:Action:|^\d+\.?\s*)([^\n]+)/i)
          const categoryMatch = block.match(/Category:\s*(Research|Outreach|Meeting|Follow-up|Internal|Other)/i)
          const priorityMatch = block.match(/Priority:\s*(High|Medium|Low)/i)
          const descMatch = block.match(/Description:\s*([^\n]+)/i)

          if (titleMatch) {
            actions.push({
              id: `action-${Date.now()}-${i}`,
              title: titleMatch[1].trim(),
              description: descMatch?.[1]?.trim(),
              priority: (priorityMatch?.[1] as WizardActionItem['priority']) || 'Medium',
              category: (categoryMatch?.[1] as WizardActionItem['category']) || 'Other',
            })
          }
        })

        if (actions.length > 0) {
          updateData({
            actionItems: [...data.actionItems, ...actions],
          })
          setFeedbackMessage({
            type: 'success',
            text: `Generated ${actions.length} action ${actions.length === 1 ? 'item' : 'items'}`,
          })
        } else {
          setFeedbackMessage({
            type: 'warning',
            text: 'No actions generated. Try adding more context (stakeholders, opportunities) or click again to retry.',
          })
        }
      } else {
        setFeedbackMessage({
          type: 'error',
          text: 'Failed to generate actions. Please try again.',
        })
      }
    } catch (err) {
      console.error('Action generation error:', err)
      setFeedbackMessage({
        type: 'error',
        text: 'Network error. Please check your connection and try again.',
      })
    } finally {
      setIsGenerating(false)
    }
  }

  const addAction = () => {
    if (!formData.title?.trim()) return

    const newAction: WizardActionItem = {
      id: editingId || `action-${Date.now()}`,
      title: formData.title || '',
      description: formData.description,
      owner: formData.owner,
      due_date: formData.due_date,
      priority: formData.priority || 'Medium',
      category: formData.category || 'Other',
    }

    if (editingId) {
      updateData({
        actionItems: data.actionItems.map(a =>
          a.id === editingId ? newAction : a
        ),
      })
    } else {
      updateData({
        actionItems: [...data.actionItems, newAction],
      })
    }

    setFormData({ priority: 'Medium', category: 'Outreach' })
    setShowForm(false)
    setEditingId(null)
  }

  const editAction = (action: WizardActionItem) => {
    setFormData(action)
    setEditingId(action.id)
    setShowForm(true)
  }

  const removeAction = (id: string) => {
    updateData({
      actionItems: data.actionItems.filter(a => a.id !== id),
    })
  }

  const totalOpportunityValue = data.pursuits.reduce((sum, p) => sum + (p.estimated_value || 0), 0)

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-lg border p-4" style={{ borderColor: 'var(--scout-border)' }}>
      <h2 className="text-base font-semibold mb-1" style={{ color: 'var(--scout-earth)' }}>
        Action Plan
      </h2>
      <p className="text-sm mb-4" style={{ color: 'var(--scout-earth-light)' }}>
        Define next steps to get started with {data.accountName}.
      </p>

      {/* Scout AI Button */}
      {data.actionItems.length === 0 && (
        <button
          onClick={generateActions}
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
              <span>Scout AI generating action plan...</span>
            </>
          ) : (
            <>
              <ScoutAIIcon size={22} className="text-white" />
              <span style={{ fontFamily: "'Bitter', Georgia, serif" }}>
                Scout AI: Generate Action Plan
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

      {/* Action List */}
      {data.actionItems.length > 0 && (
        <div className="space-y-3 mb-5">
          {data.actionItems.map((action, index) => (
            <div
              key={action.id}
              className="p-3 rounded-lg border"
              style={{ backgroundColor: 'var(--scout-parchment)', borderColor: 'var(--scout-border)' }}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="text-sm" style={{ color: 'var(--scout-earth-light)' }}>{index + 1}.</span>
                    <span className="font-medium" style={{ color: 'var(--scout-earth)' }}>{action.title}</span>
                    <span
                      className="text-xs px-2 py-0.5 rounded-full border font-medium"
                      style={getPriorityStyle(action.priority)}
                    >
                      {action.priority}
                    </span>
                    <span
                      className="text-xs px-2 py-0.5 rounded-full border"
                      style={{ backgroundColor: 'var(--scout-border)', color: 'var(--scout-earth)', borderColor: 'var(--scout-border)' }}
                    >
                      {action.category}
                    </span>
                  </div>
                  {action.description && (
                    <p className="text-sm ml-5" style={{ color: 'var(--scout-earth-light)' }}>{action.description}</p>
                  )}
                  <div className="flex gap-4 mt-2 ml-5 text-xs" style={{ color: 'var(--scout-earth-light)' }}>
                    {action.owner && <span>Owner: {action.owner}</span>}
                    {action.due_date && <span>Due: {action.due_date}</span>}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => editAction(action)}
                    className="text-sm hover:underline"
                    style={{ color: 'var(--scout-sky)' }}
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => removeAction(action.id)}
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

      {/* Add Action Form */}
      {showForm ? (
        <div className="p-4 rounded-lg border mb-5" style={{ backgroundColor: 'var(--scout-parchment)', borderColor: 'var(--scout-border)' }}>
          <h3 className="text-sm font-medium mb-4" style={{ color: 'var(--scout-earth)' }}>
            {editingId ? 'Edit Action' : 'Add Action'}
          </h3>
          <div className="space-y-3">
            <div>
              <label className="block text-xs mb-1" style={{ color: 'var(--scout-earth-light)' }}>Action Title *</label>
              <input
                type="text"
                value={formData.title || ''}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g., Schedule intro call with VP Engineering"
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1"
                style={{ borderColor: 'var(--scout-border)', color: 'var(--scout-earth)' }}
              />
            </div>
            <div>
              <label className="block text-xs mb-1" style={{ color: 'var(--scout-earth-light)' }}>Description</label>
              <textarea
                value={formData.description || ''}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Additional details..."
                rows={2}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 resize-none"
                style={{ borderColor: 'var(--scout-border)', color: 'var(--scout-earth)' }}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs mb-1" style={{ color: 'var(--scout-earth-light)' }}>Priority</label>
                <select
                  value={formData.priority || 'Medium'}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value as WizardActionItem['priority'] })}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1"
                  style={{ borderColor: 'var(--scout-border)', color: 'var(--scout-earth)' }}
                >
                  {PRIORITIES.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs mb-1" style={{ color: 'var(--scout-earth-light)' }}>Category</label>
                <select
                  value={formData.category || 'Other'}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value as WizardActionItem['category'] })}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1"
                  style={{ borderColor: 'var(--scout-border)', color: 'var(--scout-earth)' }}
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs mb-1" style={{ color: 'var(--scout-earth-light)' }}>Owner</label>
                <input
                  type="text"
                  value={formData.owner || ''}
                  onChange={(e) => setFormData({ ...formData, owner: e.target.value })}
                  placeholder="Who's responsible?"
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1"
                  style={{ borderColor: 'var(--scout-border)', color: 'var(--scout-earth)' }}
                />
              </div>
              <div>
                <label className="block text-xs mb-1" style={{ color: 'var(--scout-earth-light)' }}>Due Date</label>
                <input
                  type="date"
                  value={formData.due_date || ''}
                  onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1"
                  style={{ borderColor: 'var(--scout-border)', color: 'var(--scout-earth)' }}
                />
              </div>
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <button
              onClick={addAction}
              disabled={!formData.title?.trim()}
              className="px-4 py-2 text-white text-sm rounded-lg font-medium disabled:opacity-50"
              style={{ backgroundColor: 'var(--scout-trail)' }}
            >
              {editingId ? 'Save Changes' : 'Add Action'}
            </button>
            <button
              onClick={() => {
                setShowForm(false)
                setEditingId(null)
                setFormData({ priority: 'Medium', category: 'Outreach' })
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
          + Add Action
        </button>
      )}

      {/* Summary Card */}
      <div className="mt-5 p-4 rounded-lg border" style={{ backgroundColor: 'var(--scout-parchment)', borderColor: 'var(--scout-saddle)' }}>
        <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--scout-saddle)', fontFamily: "'Bitter', Georgia, serif" }}>
          Account Plan Summary
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div>
            <p className="text-2xl font-semibold" style={{ color: 'var(--scout-earth)' }}>{data.stakeholders.length}</p>
            <p className="text-xs" style={{ color: 'var(--scout-earth-light)' }}>Stakeholders</p>
          </div>
          <div>
            <p className="text-2xl font-semibold" style={{ color: 'var(--scout-earth)' }}>{data.pursuits.length}</p>
            <p className="text-xs" style={{ color: 'var(--scout-earth-light)' }}>Opportunities</p>
          </div>
          <div>
            <p className="text-2xl font-semibold" style={{ color: 'var(--scout-trail)' }}>
              {totalOpportunityValue > 0
                ? `$${(totalOpportunityValue / 1000000).toFixed(1)}M`
                : '-'
              }
            </p>
            <p className="text-xs" style={{ color: 'var(--scout-earth-light)' }}>Pipeline Value</p>
          </div>
          <div>
            <p className="text-2xl font-semibold" style={{ color: 'var(--scout-earth)' }}>{data.actionItems.length}</p>
            <p className="text-xs" style={{ color: 'var(--scout-earth-light)' }}>Actions</p>
          </div>
        </div>
      </div>

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
          onClick={onComplete}
          disabled={isSaving}
          className="px-6 py-2 rounded-lg text-sm font-medium text-white transition-colors flex items-center gap-2 disabled:opacity-60"
          style={{ backgroundColor: 'var(--scout-trail)' }}
        >
          {isSaving ? (
            <>
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Creating Account Plan...
            </>
          ) : (
            <>
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Create Account Plan
            </>
          )}
        </button>
      </div>
    </div>
  )
}
