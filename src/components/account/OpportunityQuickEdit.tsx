'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface Pursuit {
  pursuit_id: string
  name: string
  description?: string
  thesis?: string
  estimated_value?: number
  stage?: string
  probability?: number
  target_close_date?: string
  notes?: string
  deal_owner?: string
  deal_type?: string
  pursuit_type?: string
  target_quarter?: string
}

interface BANTScore {
  budget_score: number
  authority_score: number
  need_score: number
  timeline_score: number
}

interface OpportunityQuickEditProps {
  pursuit: Pursuit
  bantScore?: BANTScore
  onClose: () => void
}

const STAGES = ['Discovery', 'Qualification', 'Proposal', 'Negotiation', 'Closed Won', 'Closed Lost']
const PURSUIT_TYPES = [
  { value: 'new_business', label: 'New Business' },
  { value: 'expansion', label: 'Expansion' },
  { value: 'renewal', label: 'Renewal' },
  { value: 'recurring', label: 'Recurring' },
]
const QUARTERS = ['Q1 2025', 'Q2 2025', 'Q3 2025', 'Q4 2025', 'Q1 2026', 'Q2 2026', 'Q3 2026', 'Q4 2026']

function formatCurrency(value: number): string {
  if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`
  if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`
  return `$${value.toLocaleString()}`
}

export function OpportunityQuickEdit({ pursuit, bantScore, onClose }: OpportunityQuickEditProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [activeTab, setActiveTab] = useState<'details' | 'bant'>('details')

  const [formData, setFormData] = useState({
    stage: pursuit.stage || 'Discovery',
    estimated_value: pursuit.estimated_value || 0,
    probability: pursuit.probability || 0,
    target_close_date: pursuit.target_close_date || '',
    thesis: pursuit.thesis || '',
    notes: pursuit.notes || '',
    deal_owner: pursuit.deal_owner || '',
    deal_type: pursuit.deal_type || '',
    pursuit_type: pursuit.pursuit_type || 'new_business',
    target_quarter: pursuit.target_quarter || '',
  })

  const [bantData, setBantData] = useState({
    budget_score: bantScore?.budget_score || 0,
    authority_score: bantScore?.authority_score || 0,
    need_score: bantScore?.need_score || 0,
    timeline_score: bantScore?.timeline_score || 0,
  })

  const bantTotal = bantData.budget_score + bantData.authority_score + bantData.need_score + bantData.timeline_score

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    const supabase = createClient()

    // Update pursuit
    const { error: pursuitError } = await supabase
      .from('pursuits')
      .update({
        stage: formData.stage,
        estimated_value: formData.estimated_value || null,
        probability: formData.probability || null,
        target_close_date: formData.target_close_date || null,
        thesis: formData.thesis || null,
        notes: formData.notes || null,
        deal_owner: formData.deal_owner || null,
        deal_type: formData.deal_type || null,
        pursuit_type: formData.pursuit_type || null,
        target_quarter: formData.target_quarter || null,
      })
      .eq('pursuit_id', pursuit.pursuit_id)

    // If BANT scores changed, insert new analysis
    if (
      bantData.budget_score !== (bantScore?.budget_score || 0) ||
      bantData.authority_score !== (bantScore?.authority_score || 0) ||
      bantData.need_score !== (bantScore?.need_score || 0) ||
      bantData.timeline_score !== (bantScore?.timeline_score || 0)
    ) {
      await supabase.from('bant_analyses').insert({
        pursuit_id: pursuit.pursuit_id,
        analysis_date: new Date().toISOString(),
        budget_score: bantData.budget_score,
        authority_score: bantData.authority_score,
        need_score: bantData.need_score,
        timeline_score: bantData.timeline_score,
        analysis_source: 'Quick Edit',
      })
    }

    setIsSubmitting(false)

    if (!pursuitError) {
      router.refresh()
      onClose()
    }
  }

  const getScoreColor = (score: number) => {
    if (score >= 25) return { bg: 'rgba(93, 122, 93, 0.15)', color: 'var(--scout-trail)', border: 'var(--scout-trail)' }
    if (score >= 15) return { bg: 'rgba(210, 105, 30, 0.15)', color: 'var(--scout-sunset)', border: 'var(--scout-sunset)' }
    return { bg: 'var(--scout-parchment)', color: 'var(--scout-earth-light)', border: 'var(--scout-border)' }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      <div
        className="relative rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto"
        style={{ backgroundColor: 'var(--scout-white)' }}
      >
        {/* Header */}
        <div className="p-4 border-b" style={{ borderColor: 'var(--scout-border)' }}>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold" style={{ color: 'var(--scout-saddle)', fontFamily: "'Bitter', Georgia, serif" }}>
                {pursuit.name}
              </h2>
              <p className="text-sm" style={{ color: 'var(--scout-earth-light)' }}>
                {formData.estimated_value ? formatCurrency(formData.estimated_value) : 'No value set'} · {formData.stage}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
              style={{ color: 'var(--scout-earth-light)' }}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mt-4">
            <button
              onClick={() => setActiveTab('details')}
              className="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
              style={{
                backgroundColor: activeTab === 'details' ? 'var(--scout-saddle)' : 'transparent',
                color: activeTab === 'details' ? 'white' : 'var(--scout-earth)',
              }}
            >
              Details
            </button>
            <button
              onClick={() => setActiveTab('bant')}
              className="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
              style={{
                backgroundColor: activeTab === 'bant' ? 'var(--scout-saddle)' : 'transparent',
                color: activeTab === 'bant' ? 'white' : 'var(--scout-earth)',
              }}
            >
              BANT ({bantTotal}/100)
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {activeTab === 'details' ? (
            <>
              {/* Stage & Type Row */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--scout-earth)' }}>
                    Stage
                  </label>
                  <select
                    value={formData.stage}
                    onChange={(e) => setFormData({ ...formData, stage: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border text-sm"
                    style={{ borderColor: 'var(--scout-border)', color: 'var(--scout-earth)' }}
                  >
                    {STAGES.map(stage => (
                      <option key={stage} value={stage}>{stage}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--scout-earth)' }}>
                    Deal Type
                  </label>
                  <select
                    value={formData.pursuit_type}
                    onChange={(e) => setFormData({ ...formData, pursuit_type: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border text-sm"
                    style={{ borderColor: 'var(--scout-border)', color: 'var(--scout-earth)' }}
                  >
                    {PURSUIT_TYPES.map(type => (
                      <option key={type.value} value={type.value}>{type.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Value & Owner Row */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--scout-earth)' }}>
                    Value
                  </label>
                  <input
                    type="number"
                    value={formData.estimated_value}
                    onChange={(e) => setFormData({ ...formData, estimated_value: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 rounded-lg border text-sm"
                    style={{ borderColor: 'var(--scout-border)', color: 'var(--scout-earth)' }}
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--scout-earth)' }}>
                    Deal Owner
                  </label>
                  <input
                    type="text"
                    value={formData.deal_owner}
                    onChange={(e) => setFormData({ ...formData, deal_owner: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border text-sm"
                    style={{ borderColor: 'var(--scout-border)', color: 'var(--scout-earth)' }}
                    placeholder="Rep name"
                  />
                </div>
              </div>

              {/* Quarter & Close Date */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--scout-earth)' }}>
                    Target Quarter
                  </label>
                  <select
                    value={formData.target_quarter}
                    onChange={(e) => {
                      const quarter = e.target.value
                      // Auto-calculate close date from quarter
                      let closeDate = formData.target_close_date
                      if (quarter) {
                        const match = quarter.match(/Q([1-4])\s*(\d{4})/)
                        if (match) {
                          const q = parseInt(match[1])
                          const year = match[2]
                          const quarterEnds: Record<number, string> = {
                            1: `${year}-03-31`,
                            2: `${year}-06-30`,
                            3: `${year}-09-30`,
                            4: `${year}-12-31`,
                          }
                          closeDate = quarterEnds[q] || closeDate
                        }
                      }
                      setFormData({ ...formData, target_quarter: quarter, target_close_date: closeDate })
                    }}
                    className="w-full px-3 py-2 rounded-lg border text-sm"
                    style={{ borderColor: 'var(--scout-border)', color: 'var(--scout-earth)' }}
                  >
                    <option value="">Select quarter</option>
                    {QUARTERS.map(q => (
                      <option key={q} value={q}>{q}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--scout-earth)' }}>
                    Close Date
                  </label>
                  <input
                    type="date"
                    value={formData.target_close_date}
                    onChange={(e) => setFormData({ ...formData, target_close_date: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border text-sm"
                    style={{ borderColor: 'var(--scout-border)', color: 'var(--scout-earth)' }}
                  />
                </div>
              </div>

              {/* Probability & Deal Type */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--scout-earth)' }}>
                    Probability (%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={formData.probability}
                    onChange={(e) => setFormData({ ...formData, probability: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 rounded-lg border text-sm"
                    style={{ borderColor: 'var(--scout-border)', color: 'var(--scout-earth)' }}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--scout-earth)' }}>
                    Deal Category
                  </label>
                  <input
                    type="text"
                    value={formData.deal_type}
                    onChange={(e) => setFormData({ ...formData, deal_type: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border text-sm"
                    style={{ borderColor: 'var(--scout-border)', color: 'var(--scout-earth)' }}
                    placeholder="e.g., Product Sale, Services"
                  />
                </div>
              </div>

              {/* Thesis */}
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--scout-earth)' }}>
                  Thesis (Why they should buy)
                </label>
                <textarea
                  value={formData.thesis}
                  onChange={(e) => setFormData({ ...formData, thesis: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 rounded-lg border text-sm resize-none"
                  style={{ borderColor: 'var(--scout-border)', color: 'var(--scout-earth)' }}
                  placeholder="The compelling reason this customer should choose us..."
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--scout-earth)' }}>
                  Notes
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 rounded-lg border text-sm resize-none"
                  style={{ borderColor: 'var(--scout-border)', color: 'var(--scout-earth)' }}
                  placeholder="Key details, blockers, next steps..."
                />
              </div>
            </>
          ) : (
            <>
              {/* BANT Scores */}
              <p className="text-sm" style={{ color: 'var(--scout-earth-light)' }}>
                Score each dimension: 25 (Yes/Confirmed), 15 (Partial), 0 (No/Unknown)
              </p>

              {[
                { key: 'budget_score', label: 'Budget', description: 'Is there approved budget for this project?' },
                { key: 'authority_score', label: 'Authority', description: 'Are we talking to decision makers?' },
                { key: 'need_score', label: 'Need', description: 'Is there a compelling business need?' },
                { key: 'timeline_score', label: 'Timeline', description: 'Is there urgency to act?' },
              ].map(item => {
                const score = bantData[item.key as keyof typeof bantData]
                return (
                  <div key={item.key} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium" style={{ color: 'var(--scout-earth)' }}>{item.label}</p>
                        <p className="text-xs" style={{ color: 'var(--scout-earth-light)' }}>{item.description}</p>
                      </div>
                      <span className="text-lg font-bold" style={{ color: getScoreColor(score).color }}>
                        {score}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      {[0, 15, 25].map(value => {
                        const isSelected = score === value
                        const colors = getScoreColor(value)
                        return (
                          <button
                            key={value}
                            type="button"
                            onClick={() => setBantData({ ...bantData, [item.key]: value })}
                            className="flex-1 py-2 rounded-lg text-sm font-medium transition-all"
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

              {/* BANT Summary */}
              <div
                className="p-3 rounded-lg text-center"
                style={{ backgroundColor: 'var(--scout-parchment)' }}
              >
                <span className="text-sm" style={{ color: 'var(--scout-earth-light)' }}>Total Score: </span>
                <span className="text-xl font-bold" style={{ color: getScoreColor(bantTotal >= 75 ? 25 : bantTotal >= 50 ? 15 : 0).color }}>
                  {bantTotal}/100
                </span>
                <span className="text-sm ml-2" style={{ color: 'var(--scout-earth-light)' }}>
                  ({bantTotal >= 75 ? 'Highly Qualified' : bantTotal >= 50 ? 'Qualified' : bantTotal >= 25 ? 'Developing' : 'Unqualified'})
                </span>
              </div>
            </>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2 border-t" style={{ borderColor: 'var(--scout-border)' }}>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm font-medium transition-colors hover:bg-gray-100"
              style={{ color: 'var(--scout-earth)' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors"
              style={{ backgroundColor: 'var(--scout-saddle)' }}
            >
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
