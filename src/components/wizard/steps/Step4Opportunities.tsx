'use client'

import { useState } from 'react'
import { type WizardData, type WizardPursuit } from '../types'
import { ScoutAIIcon } from '@/components/ui/scout-logo'

interface Step4Props {
  data: WizardData
  updateData: (updates: Partial<WizardData>) => void
  onNext: () => void
  onPrev: () => void
}

const STAGES = [
  'Prospecting',
  'Discovery',
  'Solution Design',
  'Proposal',
  'Negotiation',
  'Verbal Commit',
]

export default function Step4Opportunities({ data, updateData, onNext, onPrev }: Step4Props) {
  const [isGenerating, setIsGenerating] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'success' | 'warning' | 'error'; text: string } | null>(null)
  const [formData, setFormData] = useState<Partial<WizardPursuit>>({
    stage: 'Prospecting',
  })

  const generateOpportunities = async () => {
    setIsGenerating(true)
    setFeedbackMessage(null)
    try {
      let companyProfile = null
      try {
        const profileRes = await fetch('/api/settings/company-profile')
        if (profileRes.ok) {
          const profileData = await profileRes.json()
          companyProfile = profileData.profile
        }
      } catch {
        // Continue without profile
      }

      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `Identify prospecting opportunities for ${data.accountName}. Think of these as high-level "buckets" to explore - themes and signals that could become deals.

TARGET COMPANY:
- Name: ${data.accountName}
- Industry: ${data.industry || 'Unknown'}
- Size: ${data.employeeCount || 'Unknown'}
- Description: ${data.description || 'N/A'}

RESEARCH FINDINGS & SIGNALS:
${data.researchFindings.filter(f => f.status === 'accepted' || f.status === 'edited').map(f => `- ${f.content}`).join('\n') || 'No research yet'}

${companyProfile ? `
OUR COMPANY (what we sell):
- Company: ${companyProfile.company_name || 'Unknown'}
- Products/Services: ${companyProfile.products_services || 'Not specified'}
- Value Proposition: ${companyProfile.value_proposition || 'Not specified'}
- Target Industries: ${companyProfile.target_verticals?.join(', ') || 'Not specified'}
- Buying Triggers: ${companyProfile.buying_triggers || 'Not specified'}
- Typical Deal Size: ${companyProfile.average_deal_size || '$50K-$200K'}
` : ''}

Based on the research signals and what we sell, suggest 3-5 prospecting buckets. Look for:
1. Regulatory/compliance drivers that create urgency
2. Technology modernization signals
3. Growth initiatives or market expansion
4. Pain points mentioned in news/research
5. Competitive displacement opportunities

Format each as:
Opportunity: [Descriptive bucket name - e.g., "FDA Compliance Modernization"]
Signal: [What signal/research drove this - e.g., "Recent FDA warning letter"]
Why Now: [Why this is timely - urgency driver]
Potential Value: [Estimated deal size based on company size and typical deals]
Products: [Which of our products/services align]`,
          context: {
            navigation: { page: 'accounts' },
          },
        }),
      })

      if (response.ok) {
        const result = await response.json()
        const content = result.content
        const opportunities: WizardPursuit[] = []

        const blocks = content.split(/(?=Opportunity:|^\d+\.)/m).filter((b: string) => b.trim() && b.length > 20)

        blocks.forEach((block: string, i: number) => {
          const nameMatch = block.match(/(?:Opportunity:|^[-*\d.]+\s*)([^\n]+)/i)
          const signalMatch = block.match(/Signal:\s*([^\n]+)/i)
          const whyNowMatch = block.match(/Why Now:\s*([^\n]+)/i)
          const valueMatch = block.match(/(?:Potential Value:|Value:)\s*([^\n]+)/i)
          const productsMatch = block.match(/Products?:\s*([^\n]+)/i)

          if (nameMatch) {
            const name = nameMatch[1].replace(/^[-*\d.)\s]+/, '').trim()
            if (name.length > 3) {
              const descParts = []
              if (signalMatch) descParts.push(`Signal: ${signalMatch[1].trim()}`)
              if (whyNowMatch) descParts.push(`Why Now: ${whyNowMatch[1].trim()}`)

              opportunities.push({
                id: `opp-${Date.now()}-${i}`,
                name: name,
                description: descParts.join(' | ') || '',
                estimated_value: parseValue(valueMatch?.[1]),
                stage: 'Prospecting',
                products: productsMatch ? [productsMatch[1].trim()] : undefined,
                notes: signalMatch?.[1]?.trim(),
              })
            }
          }
        })

        if (opportunities.length > 0) {
          updateData({
            pursuits: [...data.pursuits, ...opportunities],
          })
          setFeedbackMessage({
            type: 'success',
            text: `Found ${opportunities.length} prospecting ${opportunities.length === 1 ? 'opportunity' : 'opportunities'}`,
          })
        } else {
          setFeedbackMessage({
            type: 'warning',
            text: 'No opportunities identified. Try adding more research findings or click again to retry.',
          })
        }
      } else {
        setFeedbackMessage({
          type: 'error',
          text: 'Failed to analyze opportunities. Please try again.',
        })
      }
    } catch (err) {
      console.error('Opportunity generation error:', err)
      setFeedbackMessage({
        type: 'error',
        text: 'Network error. Please check your connection and try again.',
      })
    } finally {
      setIsGenerating(false)
    }
  }

  const parseValue = (valueStr?: string): number | undefined => {
    if (!valueStr) return undefined
    const cleaned = valueStr.replace(/[$,]/g, '').toLowerCase()
    const num = parseFloat(cleaned)
    if (isNaN(num)) return undefined
    if (cleaned.includes('m')) return num * 1000000
    if (cleaned.includes('k')) return num * 1000
    return num
  }

  const formatValue = (value?: number): string => {
    if (!value) return ''
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`
    if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`
    return `$${value}`
  }

  const addPursuit = () => {
    if (!formData.name?.trim()) return

    const newPursuit: WizardPursuit = {
      id: editingId || `pursuit-${Date.now()}`,
      name: formData.name || '',
      description: formData.description,
      estimated_value: formData.estimated_value,
      stage: formData.stage || 'Prospecting',
      products: formData.products,
      notes: formData.notes,
    }

    if (editingId) {
      updateData({
        pursuits: data.pursuits.map(p =>
          p.id === editingId ? newPursuit : p
        ),
      })
    } else {
      updateData({
        pursuits: [...data.pursuits, newPursuit],
      })
    }

    setFormData({ stage: 'Prospecting' })
    setShowForm(false)
    setEditingId(null)
  }

  const editPursuit = (pursuit: WizardPursuit) => {
    setFormData(pursuit)
    setEditingId(pursuit.id)
    setShowForm(true)
  }

  const removePursuit = (id: string) => {
    updateData({
      pursuits: data.pursuits.filter(p => p.id !== id),
    })
  }

  const totalValue = data.pursuits.reduce((sum, p) => sum + (p.estimated_value || 0), 0)

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-lg border p-4" style={{ borderColor: 'var(--scout-border)' }}>
      <h2 className="text-base font-semibold mb-1" style={{ color: 'var(--scout-earth)' }}>
        Prospecting Opportunities
      </h2>
      <p className="text-sm mb-4" style={{ color: 'var(--scout-earth-light)' }}>
        Identify prospecting buckets based on signals and your products.
      </p>

      {/* Scout AI Button */}
      <button
        onClick={generateOpportunities}
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
            <span>Scout AI analyzing signals...</span>
          </>
        ) : (
          <>
            <ScoutAIIcon size={22} className="text-white" />
            <span style={{ fontFamily: "'Bitter', Georgia, serif" }}>
              Scout AI: Identify Opportunities
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

      {/* Total Value Summary */}
      {data.pursuits.length > 0 && totalValue > 0 && (
        <div className="mb-4 p-3 rounded-lg border" style={{ backgroundColor: 'rgba(74, 144, 164, 0.1)', borderColor: 'rgba(74, 144, 164, 0.3)' }}>
          <p className="text-sm" style={{ color: 'var(--scout-sky)' }}>
            Total Pipeline Value: <span className="font-semibold">{formatValue(totalValue)}</span>
            <span className="ml-2" style={{ opacity: 0.7 }}>({data.pursuits.length} opportunities)</span>
          </p>
        </div>
      )}

      {/* Pursuit List */}
      {data.pursuits.length > 0 && (
        <div className="space-y-3 mb-5">
          {data.pursuits.map((pursuit) => (
            <div
              key={pursuit.id}
              className="p-3 rounded-lg border"
              style={{ backgroundColor: 'var(--scout-parchment)', borderColor: 'var(--scout-border)' }}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <span className="font-medium" style={{ color: 'var(--scout-earth)' }}>{pursuit.name}</span>
                    <span
                      className="text-xs px-2 py-0.5 rounded-full border font-medium"
                      style={{ backgroundColor: 'rgba(74, 144, 164, 0.15)', color: 'var(--scout-sky)', borderColor: 'rgba(74, 144, 164, 0.3)' }}
                    >
                      {pursuit.stage}
                    </span>
                    {pursuit.estimated_value && (
                      <span
                        className="text-xs px-2 py-0.5 rounded-full border font-medium"
                        style={{ backgroundColor: 'rgba(93, 122, 93, 0.15)', color: 'var(--scout-trail)', borderColor: 'rgba(93, 122, 93, 0.3)' }}
                      >
                        {formatValue(pursuit.estimated_value)}
                      </span>
                    )}
                  </div>
                  {pursuit.description && (
                    <p className="text-sm mb-2" style={{ color: 'var(--scout-earth-light)' }}>{pursuit.description}</p>
                  )}
                  {pursuit.products && pursuit.products.length > 0 && (
                    <div className="flex items-center gap-2 text-xs">
                      <span style={{ color: 'var(--scout-earth-light)' }}>Products:</span>
                      <span style={{ color: 'var(--scout-earth)' }}>{pursuit.products.join(', ')}</span>
                    </div>
                  )}
                </div>
                <div className="flex gap-2 ml-4">
                  <button
                    onClick={() => editPursuit(pursuit)}
                    className="text-sm hover:underline"
                    style={{ color: 'var(--scout-sky)' }}
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => removePursuit(pursuit.id)}
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

      {/* Add Pursuit Form */}
      {showForm ? (
        <div className="p-4 rounded-lg border mb-5" style={{ backgroundColor: 'var(--scout-parchment)', borderColor: 'var(--scout-border)' }}>
          <h3 className="text-sm font-medium mb-4" style={{ color: 'var(--scout-earth)' }}>
            {editingId ? 'Edit Opportunity' : 'Add Opportunity'}
          </h3>
          <div className="space-y-3">
            <div>
              <label className="block text-xs mb-1" style={{ color: 'var(--scout-earth-light)' }}>Opportunity Name *</label>
              <input
                type="text"
                value={formData.name || ''}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Platform Modernization"
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1"
                style={{ borderColor: 'var(--scout-border)', color: 'var(--scout-earth)' }}
              />
            </div>
            <div>
              <label className="block text-xs mb-1" style={{ color: 'var(--scout-earth-light)' }}>Description</label>
              <textarea
                value={formData.description || ''}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief description..."
                rows={2}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 resize-none"
                style={{ borderColor: 'var(--scout-border)', color: 'var(--scout-earth)' }}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs mb-1" style={{ color: 'var(--scout-earth-light)' }}>Estimated Value</label>
                <input
                  type="number"
                  value={formData.estimated_value || ''}
                  onChange={(e) => setFormData({ ...formData, estimated_value: parseFloat(e.target.value) || undefined })}
                  placeholder="100000"
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1"
                  style={{ borderColor: 'var(--scout-border)', color: 'var(--scout-earth)' }}
                />
              </div>
              <div>
                <label className="block text-xs mb-1" style={{ color: 'var(--scout-earth-light)' }}>Stage</label>
                <select
                  value={formData.stage || 'Prospecting'}
                  onChange={(e) => setFormData({ ...formData, stage: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1"
                  style={{ borderColor: 'var(--scout-border)', color: 'var(--scout-earth)' }}
                >
                  {STAGES.map((stage) => (
                    <option key={stage} value={stage}>{stage}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <button
              onClick={addPursuit}
              disabled={!formData.name?.trim()}
              className="px-4 py-2 text-white text-sm rounded-lg font-medium disabled:opacity-50"
              style={{ backgroundColor: 'var(--scout-trail)' }}
            >
              {editingId ? 'Save Changes' : 'Add Opportunity'}
            </button>
            <button
              onClick={() => {
                setShowForm(false)
                setEditingId(null)
                setFormData({ stage: 'Prospecting' })
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
          + Add Opportunity
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
          Continue to Competitors →
        </button>
      </div>
    </div>
  )
}
