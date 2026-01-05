'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import type {
  SalesIntelligence,
  TargetMarket,
  ValueProposition,
  Regulation,
  Competitor,
  ProofPoint,
  CustomerStory,
  UrgencyLevel,
} from '@/lib/sales-intelligence/types'
import {
  DEFAULT_SALES_INTELLIGENCE,
  calculateUrgency,
  getUrgencyColor,
  getUrgencyLabel,
} from '@/lib/sales-intelligence/types'

interface SalesIntelligenceEditorProps {
  initialData: SalesIntelligence | null
}

// ============================================
// MAIN COMPONENT
// ============================================

export function SalesIntelligenceEditor({ initialData }: SalesIntelligenceEditorProps) {
  const router = useRouter()
  const [data, setData] = useState<SalesIntelligence>(initialData || DEFAULT_SALES_INTELLIGENCE)
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set())
  const [isSaving, setIsSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)

  const toggleSection = (section: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev)
      if (next.has(section)) {
        next.delete(section)
      } else {
        next.add(section)
      }
      return next
    })
  }

  const updateData = useCallback((updates: Partial<SalesIntelligence>) => {
    setData(prev => ({ ...prev, ...updates }))
    setSaveSuccess(false)
  }, [])

  const handleSave = useCallback(async () => {
    setIsSaving(true)
    try {
      const response = await fetch('/api/settings/sales-intelligence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        throw new Error('Failed to save')
      }

      setSaveSuccess(true)
      router.refresh()
      setTimeout(() => setSaveSuccess(false), 3000)
    } catch (error) {
      console.error('Failed to save sales intelligence:', error)
    } finally {
      setIsSaving(false)
    }
  }, [data, router])

  // Count items in each section for badges
  const counts = {
    target: (data.target_market?.target_verticals?.length || 0) +
            (data.target_market?.target_geographies?.length || 0) +
            (data.target_market?.buying_triggers?.length || 0),
    value: (data.value_proposition?.key_differentiators?.length || 0) +
           (data.value_proposition?.pain_points_addressed?.length || 0),
    market: (data.market_context?.regulations?.length || 0) + (data.market_context?.timing_factors?.length || 0),
    competitive: (data.competitive?.competitors?.length || 0) + (data.competitive?.differentiation?.length || 0),
    evidence: (data.evidence?.proof_points?.length || 0) + (data.evidence?.customer_stories?.length || 0),
    signals: (data.signals?.positive_indicators?.length || 0) + (data.signals?.disqualifiers?.length || 0),
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="rounded-xl p-6 text-white" style={{ background: 'linear-gradient(135deg, var(--scout-saddle) 0%, var(--scout-sunset) 100%)' }}>
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-lg bg-white/20 flex items-center justify-center">
            <BrainIcon className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-semibold" style={{ fontFamily: "'Bitter', Georgia, serif" }}>
              Sales Intelligence
            </h2>
            <p className="text-white/80 mt-1 text-sm">
              Enrich AI context with market knowledge, competitive intel, and sales signals.
              Click any section to expand and add details.
            </p>
          </div>
        </div>
      </div>

      {/* Collapsible Sections */}
      <div className="space-y-3">
        {/* Target Market */}
        <CollapsibleCard
          title="Target Market"
          subtitle="Who you sell to: verticals, company sizes, geographies"
          icon={<TargetIcon />}
          count={counts.target}
          isExpanded={expandedSections.has('target')}
          onToggle={() => toggleSection('target')}
        >
          <TargetMarketEditor
            data={data.target_market || DEFAULT_SALES_INTELLIGENCE.target_market}
            onChange={(target_market) => updateData({ target_market })}
          />
        </CollapsibleCard>

        {/* Value Proposition */}
        <CollapsibleCard
          title="Value Proposition"
          subtitle="What you offer: core value, differentiators, pain points solved"
          icon={<SparklesIcon />}
          count={counts.value}
          isExpanded={expandedSections.has('value')}
          onToggle={() => toggleSection('value')}
        >
          <ValuePropositionEditor
            data={data.value_proposition || DEFAULT_SALES_INTELLIGENCE.value_proposition}
            onChange={(value_proposition) => updateData({ value_proposition })}
          />
        </CollapsibleCard>

        {/* Competitive Landscape */}
        <CollapsibleCard
          title="Competitive Landscape"
          subtitle="Competitors and how you position against them"
          icon={<SwordsIcon />}
          count={counts.competitive}
          isExpanded={expandedSections.has('competitive')}
          onToggle={() => toggleSection('competitive')}
        >
          <CompetitiveEditor
            data={data.competitive || DEFAULT_SALES_INTELLIGENCE.competitive}
            onChange={(competitive) => updateData({ competitive })}
          />
        </CollapsibleCard>

        {/* Market Context */}
        <CollapsibleCard
          title="Market Context"
          subtitle="Regulations, deadlines, and industry dynamics"
          icon={<GlobeIcon />}
          count={counts.market}
          isExpanded={expandedSections.has('market')}
          onToggle={() => toggleSection('market')}
        >
          <MarketContextEditor
            data={data.market_context || DEFAULT_SALES_INTELLIGENCE.market_context}
            onChange={(market_context) => updateData({ market_context })}
          />
        </CollapsibleCard>

        {/* Customer Evidence */}
        <CollapsibleCard
          title="Customer Evidence"
          subtitle="Proof points, case studies, and quantified results"
          icon={<TrophyIcon />}
          count={counts.evidence}
          isExpanded={expandedSections.has('evidence')}
          onToggle={() => toggleSection('evidence')}
        >
          <EvidenceEditor
            data={data.evidence || DEFAULT_SALES_INTELLIGENCE.evidence}
            onChange={(evidence) => updateData({ evidence })}
          />
        </CollapsibleCard>

        {/* Sales Signals */}
        <CollapsibleCard
          title="Sales Signals"
          subtitle="Buying indicators and disqualifiers"
          icon={<RadarIcon />}
          count={counts.signals}
          isExpanded={expandedSections.has('signals')}
          onToggle={() => toggleSection('signals')}
        >
          <SignalsEditor
            data={data.signals || DEFAULT_SALES_INTELLIGENCE.signals}
            onChange={(signals) => updateData({ signals })}
          />
        </CollapsibleCard>
      </div>

      {/* Save Button */}
      <div className="flex items-center justify-end gap-4 pt-4 border-t" style={{ borderColor: 'var(--scout-border)' }}>
        {saveSuccess && (
          <div className="flex items-center gap-2" style={{ color: 'var(--scout-trail)' }}>
            <CheckIcon className="w-5 h-5" />
            <span className="text-sm font-medium">Saved successfully</span>
          </div>
        )}
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="px-6 py-2.5 text-sm font-medium rounded-lg text-white transition-colors disabled:opacity-50"
          style={{ backgroundColor: 'var(--scout-saddle)' }}
        >
          {isSaving ? 'Saving...' : 'Save Intelligence'}
        </button>
      </div>
    </div>
  )
}

// ============================================
// COLLAPSIBLE CARD
// ============================================

function CollapsibleCard({
  title,
  subtitle,
  icon,
  count,
  isExpanded,
  onToggle,
  children,
}: {
  title: string
  subtitle: string
  icon: React.ReactNode
  count: number
  isExpanded: boolean
  onToggle: () => void
  children: React.ReactNode
}) {
  return (
    <div
      className="rounded-lg border overflow-hidden transition-all"
      style={{
        borderColor: isExpanded ? 'var(--scout-saddle)' : 'var(--scout-border)',
        backgroundColor: 'var(--scout-white)',
      }}
    >
      {/* Header - Always Visible */}
      <button
        onClick={onToggle}
        className="w-full px-5 py-4 flex items-center gap-4 text-left hover:bg-gray-50 transition-colors"
      >
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center"
          style={{
            backgroundColor: isExpanded ? 'var(--scout-saddle)' : 'var(--scout-parchment)',
            color: isExpanded ? 'white' : 'var(--scout-earth)',
          }}
        >
          {icon}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold" style={{ color: 'var(--scout-earth)' }}>{title}</h3>
            {count > 0 && (
              <span
                className="px-2 py-0.5 text-xs rounded-full"
                style={{ backgroundColor: 'var(--scout-sky)', color: 'white' }}
              >
                {count}
              </span>
            )}
          </div>
          <p className="text-sm" style={{ color: 'var(--scout-earth-light)' }}>{subtitle}</p>
        </div>
        <ChevronIcon className={`w-5 h-5 transition-transform ${isExpanded ? 'rotate-180' : ''}`} style={{ color: 'var(--scout-earth-light)' }} />
      </button>

      {/* Expandable Content */}
      {isExpanded && (
        <div className="px-5 pb-5 pt-2 border-t" style={{ borderColor: 'var(--scout-border)' }}>
          {children}
        </div>
      )}
    </div>
  )
}

// ============================================
// MARKET CONTEXT EDITOR
// ============================================

function MarketContextEditor({
  data,
  onChange,
}: {
  data: SalesIntelligence['market_context']
  onChange: (data: SalesIntelligence['market_context']) => void
}) {
  const [showAddRegulation, setShowAddRegulation] = useState(false)
  const [newRegulation, setNewRegulation] = useState<Partial<Regulation>>({
    status: 'upcoming',
  })

  const addRegulation = () => {
    if (!newRegulation.name) return
    const regulation: Regulation = {
      id: `reg-${Date.now()}`,
      name: newRegulation.name,
      description: newRegulation.description,
      deadline: newRegulation.deadline,
      status: newRegulation.status || 'upcoming',
      impact: newRegulation.impact,
    }
    onChange({
      ...data,
      regulations: [...data.regulations, regulation],
    })
    setNewRegulation({ status: 'upcoming' })
    setShowAddRegulation(false)
  }

  const removeRegulation = (id: string) => {
    onChange({
      ...data,
      regulations: data.regulations.filter(r => r.id !== id),
    })
  }

  return (
    <div className="space-y-4">
      {/* Regulations */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium" style={{ color: 'var(--scout-earth)' }}>
            Regulatory Deadlines
          </label>
          <button
            onClick={() => setShowAddRegulation(true)}
            className="text-sm font-medium"
            style={{ color: 'var(--scout-sky)' }}
          >
            + Add Regulation
          </button>
        </div>

        {data.regulations.length === 0 && !showAddRegulation && (
          <EmptyState
            message="No regulations added"
            hint="Add regulatory deadlines that affect your customers"
          />
        )}

        {/* Regulation List */}
        <div className="space-y-2">
          {data.regulations.map(reg => {
            const urgency = calculateUrgency(reg.deadline)
            return (
              <div
                key={reg.id}
                className="p-3 rounded-lg border flex items-start gap-3"
                style={{ borderColor: 'var(--scout-border)', backgroundColor: 'var(--scout-parchment)' }}
              >
                {/* Urgency Indicator */}
                <div
                  className="w-2 h-2 rounded-full mt-2 flex-shrink-0"
                  style={{ backgroundColor: getUrgencyColor(urgency) }}
                  title={getUrgencyLabel(urgency)}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm" style={{ color: 'var(--scout-earth)' }}>
                      {reg.name}
                    </span>
                    <span
                      className="text-xs px-2 py-0.5 rounded"
                      style={{
                        backgroundColor: reg.status === 'enforced' ? 'var(--scout-clay)' : reg.status === 'active' ? 'var(--scout-trail)' : 'var(--scout-earth-light)',
                        color: 'white',
                      }}
                    >
                      {reg.status}
                    </span>
                  </div>
                  {reg.deadline && (
                    <p className="text-xs mt-0.5" style={{ color: 'var(--scout-earth-light)' }}>
                      Deadline: {new Date(reg.deadline).toLocaleDateString()}
                    </p>
                  )}
                  {reg.description && (
                    <p className="text-xs mt-1" style={{ color: 'var(--scout-earth-light)' }}>
                      {reg.description}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => removeRegulation(reg.id)}
                  className="p-1 rounded hover:bg-red-50"
                  style={{ color: 'var(--scout-clay)' }}
                >
                  <XIcon className="w-4 h-4" />
                </button>
              </div>
            )
          })}
        </div>

        {/* Add Regulation Form */}
        {showAddRegulation && (
          <div className="mt-3 p-4 rounded-lg border" style={{ borderColor: 'var(--scout-border)', backgroundColor: 'var(--scout-parchment)' }}>
            <div className="grid grid-cols-2 gap-3">
              <input
                type="text"
                value={newRegulation.name || ''}
                onChange={(e) => setNewRegulation({ ...newRegulation, name: e.target.value })}
                placeholder="Regulation name (e.g., FDA 524B)"
                className="col-span-2 px-3 py-2 text-sm border rounded-lg"
                style={{ borderColor: 'var(--scout-border)' }}
              />
              <input
                type="date"
                value={newRegulation.deadline || ''}
                onChange={(e) => setNewRegulation({ ...newRegulation, deadline: e.target.value })}
                className="px-3 py-2 text-sm border rounded-lg"
                style={{ borderColor: 'var(--scout-border)' }}
              />
              <select
                value={newRegulation.status || 'upcoming'}
                onChange={(e) => setNewRegulation({ ...newRegulation, status: e.target.value as Regulation['status'] })}
                className="px-3 py-2 text-sm border rounded-lg"
                style={{ borderColor: 'var(--scout-border)' }}
              >
                <option value="upcoming">Upcoming</option>
                <option value="active">Active</option>
                <option value="enforced">Enforced</option>
              </select>
              <textarea
                value={newRegulation.description || ''}
                onChange={(e) => setNewRegulation({ ...newRegulation, description: e.target.value })}
                placeholder="Brief description and impact..."
                rows={2}
                className="col-span-2 px-3 py-2 text-sm border rounded-lg resize-none"
                style={{ borderColor: 'var(--scout-border)' }}
              />
            </div>
            <div className="mt-3 flex gap-2">
              <button
                onClick={addRegulation}
                disabled={!newRegulation.name}
                className="px-4 py-2 text-sm font-medium text-white rounded-lg disabled:opacity-50"
                style={{ backgroundColor: 'var(--scout-trail)' }}
              >
                Add
              </button>
              <button
                onClick={() => setShowAddRegulation(false)}
                className="px-4 py-2 text-sm"
                style={{ color: 'var(--scout-earth-light)' }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Industry Dynamics */}
      <div>
        <label className="block text-sm font-medium mb-1" style={{ color: 'var(--scout-earth)' }}>
          Industry Dynamics
        </label>
        <textarea
          value={data.industry_dynamics || ''}
          onChange={(e) => onChange({ ...data, industry_dynamics: e.target.value })}
          placeholder="Trends, pressures, and market forces affecting your buyers..."
          rows={3}
          className="w-full px-3 py-2 text-sm border rounded-lg resize-none"
          style={{ borderColor: 'var(--scout-border)' }}
        />
      </div>

      {/* Timing Factors */}
      <div>
        <label className="block text-sm font-medium mb-1" style={{ color: 'var(--scout-earth)' }}>
          Timing Factors
        </label>
        <TagInput
          tags={data.timing_factors || []}
          onChange={(timing_factors) => onChange({ ...data, timing_factors })}
          placeholder="e.g., Budget cycles in Q4"
        />
      </div>
    </div>
  )
}

// ============================================
// COMPETITIVE EDITOR
// ============================================

function CompetitiveEditor({
  data,
  onChange,
}: {
  data: SalesIntelligence['competitive']
  onChange: (data: SalesIntelligence['competitive']) => void
}) {
  const [showAddCompetitor, setShowAddCompetitor] = useState(false)
  const [newCompetitor, setNewCompetitor] = useState<Partial<Competitor>>({})

  const addCompetitor = () => {
    if (!newCompetitor.name) return
    const competitor: Competitor = {
      id: `comp-${Date.now()}`,
      name: newCompetitor.name,
      positioning: newCompetitor.positioning,
    }
    onChange({
      ...data,
      competitors: [...data.competitors, competitor],
    })
    setNewCompetitor({})
    setShowAddCompetitor(false)
  }

  const removeCompetitor = (id: string) => {
    onChange({
      ...data,
      competitors: data.competitors.filter(c => c.id !== id),
    })
  }

  return (
    <div className="space-y-4">
      {/* Competitors */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium" style={{ color: 'var(--scout-earth)' }}>
            Key Competitors
          </label>
          <button
            onClick={() => setShowAddCompetitor(true)}
            className="text-sm font-medium"
            style={{ color: 'var(--scout-sky)' }}
          >
            + Add Competitor
          </button>
        </div>

        {data.competitors.length === 0 && !showAddCompetitor && (
          <EmptyState
            message="No competitors added"
            hint="Add competitors and how you position against them"
          />
        )}

        <div className="space-y-2">
          {data.competitors.map(comp => (
            <div
              key={comp.id}
              className="p-3 rounded-lg border flex items-start gap-3"
              style={{ borderColor: 'var(--scout-border)', backgroundColor: 'var(--scout-parchment)' }}
            >
              <div className="flex-1">
                <span className="font-medium text-sm" style={{ color: 'var(--scout-earth)' }}>
                  {comp.name}
                </span>
                {comp.positioning && (
                  <p className="text-xs mt-1" style={{ color: 'var(--scout-earth-light)' }}>
                    {comp.positioning}
                  </p>
                )}
              </div>
              <button
                onClick={() => removeCompetitor(comp.id)}
                className="p-1 rounded hover:bg-red-50"
                style={{ color: 'var(--scout-clay)' }}
              >
                <XIcon className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>

        {showAddCompetitor && (
          <div className="mt-3 p-4 rounded-lg border" style={{ borderColor: 'var(--scout-border)', backgroundColor: 'var(--scout-parchment)' }}>
            <input
              type="text"
              value={newCompetitor.name || ''}
              onChange={(e) => setNewCompetitor({ ...newCompetitor, name: e.target.value })}
              placeholder="Competitor name"
              className="w-full px-3 py-2 text-sm border rounded-lg mb-2"
              style={{ borderColor: 'var(--scout-border)' }}
            />
            <textarea
              value={newCompetitor.positioning || ''}
              onChange={(e) => setNewCompetitor({ ...newCompetitor, positioning: e.target.value })}
              placeholder="How do you position against them?"
              rows={2}
              className="w-full px-3 py-2 text-sm border rounded-lg resize-none"
              style={{ borderColor: 'var(--scout-border)' }}
            />
            <div className="mt-3 flex gap-2">
              <button
                onClick={addCompetitor}
                disabled={!newCompetitor.name}
                className="px-4 py-2 text-sm font-medium text-white rounded-lg disabled:opacity-50"
                style={{ backgroundColor: 'var(--scout-trail)' }}
              >
                Add
              </button>
              <button
                onClick={() => setShowAddCompetitor(false)}
                className="px-4 py-2 text-sm"
                style={{ color: 'var(--scout-earth-light)' }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Differentiation */}
      <div>
        <label className="block text-sm font-medium mb-1" style={{ color: 'var(--scout-earth)' }}>
          Key Differentiators
        </label>
        <TagInput
          tags={data.differentiation}
          onChange={(differentiation) => onChange({ ...data, differentiation })}
          placeholder="e.g., Only platform with dynamic compliance updates"
        />
      </div>
    </div>
  )
}

// ============================================
// EVIDENCE EDITOR
// ============================================

function EvidenceEditor({
  data,
  onChange,
}: {
  data: SalesIntelligence['evidence']
  onChange: (data: SalesIntelligence['evidence']) => void
}) {
  const [showAddProof, setShowAddProof] = useState(false)
  const [newProof, setNewProof] = useState<Partial<ProofPoint>>({ category: 'other' })

  const addProofPoint = () => {
    if (!newProof.claim) return
    const proof: ProofPoint = {
      id: `proof-${Date.now()}`,
      claim: newProof.claim,
      evidence: newProof.evidence || '',
      source: newProof.source,
      category: newProof.category || 'other',
    }
    onChange({
      ...data,
      proof_points: [...data.proof_points, proof],
    })
    setNewProof({ category: 'other' })
    setShowAddProof(false)
  }

  const removeProofPoint = (id: string) => {
    onChange({
      ...data,
      proof_points: data.proof_points.filter(p => p.id !== id),
    })
  }

  return (
    <div className="space-y-4">
      {/* Proof Points */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium" style={{ color: 'var(--scout-earth)' }}>
            Proof Points
          </label>
          <button
            onClick={() => setShowAddProof(true)}
            className="text-sm font-medium"
            style={{ color: 'var(--scout-sky)' }}
          >
            + Add Proof Point
          </button>
        </div>

        {data.proof_points.length === 0 && !showAddProof && (
          <EmptyState
            message="No proof points added"
            hint="Add quantified results and evidence to support your claims"
          />
        )}

        <div className="space-y-2">
          {data.proof_points.map(proof => (
            <div
              key={proof.id}
              className="p-3 rounded-lg border"
              style={{ borderColor: 'var(--scout-border)', backgroundColor: 'var(--scout-parchment)' }}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm" style={{ color: 'var(--scout-earth)' }}>
                      {proof.claim}
                    </span>
                    <span
                      className="text-xs px-2 py-0.5 rounded"
                      style={{ backgroundColor: 'var(--scout-sky)', color: 'white' }}
                    >
                      {proof.category}
                    </span>
                  </div>
                  <p className="text-xs mt-1" style={{ color: 'var(--scout-earth-light)' }}>
                    {proof.evidence}
                  </p>
                  {proof.source && (
                    <p className="text-xs mt-1 italic" style={{ color: 'var(--scout-earth-light)' }}>
                      Source: {proof.source}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => removeProofPoint(proof.id)}
                  className="p-1 rounded hover:bg-red-50"
                  style={{ color: 'var(--scout-clay)' }}
                >
                  <XIcon className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {showAddProof && (
          <div className="mt-3 p-4 rounded-lg border" style={{ borderColor: 'var(--scout-border)', backgroundColor: 'var(--scout-parchment)' }}>
            <div className="space-y-2">
              <input
                type="text"
                value={newProof.claim || ''}
                onChange={(e) => setNewProof({ ...newProof, claim: e.target.value })}
                placeholder="Claim (e.g., '75% faster TARA')"
                className="w-full px-3 py-2 text-sm border rounded-lg"
                style={{ borderColor: 'var(--scout-border)' }}
              />
              <textarea
                value={newProof.evidence || ''}
                onChange={(e) => setNewProof({ ...newProof, evidence: e.target.value })}
                placeholder="Supporting evidence..."
                rows={2}
                className="w-full px-3 py-2 text-sm border rounded-lg resize-none"
                style={{ borderColor: 'var(--scout-border)' }}
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  value={newProof.source || ''}
                  onChange={(e) => setNewProof({ ...newProof, source: e.target.value })}
                  placeholder="Source (optional)"
                  className="px-3 py-2 text-sm border rounded-lg"
                  style={{ borderColor: 'var(--scout-border)' }}
                />
                <select
                  value={newProof.category || 'other'}
                  onChange={(e) => setNewProof({ ...newProof, category: e.target.value as ProofPoint['category'] })}
                  className="px-3 py-2 text-sm border rounded-lg"
                  style={{ borderColor: 'var(--scout-border)' }}
                >
                  <option value="speed">Speed</option>
                  <option value="cost">Cost</option>
                  <option value="quality">Quality</option>
                  <option value="risk">Risk</option>
                  <option value="integration">Integration</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>
            <div className="mt-3 flex gap-2">
              <button
                onClick={addProofPoint}
                disabled={!newProof.claim}
                className="px-4 py-2 text-sm font-medium text-white rounded-lg disabled:opacity-50"
                style={{ backgroundColor: 'var(--scout-trail)' }}
              >
                Add
              </button>
              <button
                onClick={() => setShowAddProof(false)}
                className="px-4 py-2 text-sm"
                style={{ color: 'var(--scout-earth-light)' }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Evidence Gaps */}
      <div>
        <label className="block text-sm font-medium mb-1" style={{ color: 'var(--scout-earth)' }}>
          Evidence Gaps (To Collect)
        </label>
        <TagInput
          tags={data.evidence_gaps || []}
          onChange={(evidence_gaps) => onChange({ ...data, evidence_gaps })}
          placeholder="e.g., Named medical device testimonial"
        />
      </div>
    </div>
  )
}

// ============================================
// SIGNALS EDITOR
// ============================================

function SignalsEditor({
  data,
  onChange,
}: {
  data: SalesIntelligence['signals']
  onChange: (data: SalesIntelligence['signals']) => void
}) {
  const [showAddDisqualifier, setShowAddDisqualifier] = useState(false)
  const [newDisqualifier, setNewDisqualifier] = useState<{
    signal: string
    category: 'competitive' | 'organizational' | 'scale' | 'timing' | 'behavioral'
    severity: 'hard' | 'soft'
  }>({ signal: '', category: 'competitive', severity: 'soft' })

  const addDisqualifier = () => {
    if (!newDisqualifier.signal) return
    onChange({
      ...data,
      disqualifiers: [
        ...data.disqualifiers,
        {
          id: `disq-${Date.now()}`,
          ...newDisqualifier,
        },
      ],
    })
    setNewDisqualifier({ signal: '', category: 'competitive', severity: 'soft' })
    setShowAddDisqualifier(false)
  }

  const removeDisqualifier = (id: string) => {
    onChange({
      ...data,
      disqualifiers: data.disqualifiers.filter(d => d.id !== id),
    })
  }

  return (
    <div className="space-y-4">
      {/* Positive Indicators */}
      <div>
        <label className="block text-sm font-medium mb-1" style={{ color: 'var(--scout-earth)' }}>
          Positive Buying Signals
        </label>
        <TagInput
          tags={data.positive_indicators}
          onChange={(positive_indicators) => onChange({ ...data, positive_indicators })}
          placeholder="e.g., Hired new CISO, Had security incident"
        />
      </div>

      {/* Urgency Triggers */}
      <div>
        <label className="block text-sm font-medium mb-1" style={{ color: 'var(--scout-earth)' }}>
          Urgency Triggers
        </label>
        <TagInput
          tags={data.urgency_triggers || []}
          onChange={(urgency_triggers) => onChange({ ...data, urgency_triggers })}
          placeholder="e.g., Upcoming FDA submission, Audit deadline"
        />
      </div>

      {/* Disqualifiers */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium" style={{ color: 'var(--scout-earth)' }}>
            Disqualifiers
          </label>
          <button
            onClick={() => setShowAddDisqualifier(true)}
            className="text-sm font-medium"
            style={{ color: 'var(--scout-sky)' }}
          >
            + Add Disqualifier
          </button>
        </div>

        {data.disqualifiers.length === 0 && !showAddDisqualifier && (
          <EmptyState
            message="No disqualifiers added"
            hint="Add signals that indicate a prospect should be deprioritized"
          />
        )}

        <div className="space-y-2">
          {data.disqualifiers.map(disq => (
            <div
              key={disq.id}
              className="p-3 rounded-lg border flex items-start gap-3"
              style={{ borderColor: 'var(--scout-border)', backgroundColor: 'var(--scout-parchment)' }}
            >
              <div
                className="w-2 h-2 rounded-full mt-2 flex-shrink-0"
                style={{ backgroundColor: disq.severity === 'hard' ? 'var(--scout-clay)' : 'var(--scout-sunset)' }}
              />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm" style={{ color: 'var(--scout-earth)' }}>
                    {disq.signal}
                  </span>
                  <span
                    className="text-xs px-2 py-0.5 rounded"
                    style={{ backgroundColor: 'var(--scout-earth-light)', color: 'white' }}
                  >
                    {disq.category}
                  </span>
                  <span
                    className="text-xs px-2 py-0.5 rounded"
                    style={{
                      backgroundColor: disq.severity === 'hard' ? 'var(--scout-clay)' : 'var(--scout-sunset)',
                      color: 'white',
                    }}
                  >
                    {disq.severity}
                  </span>
                </div>
              </div>
              <button
                onClick={() => removeDisqualifier(disq.id)}
                className="p-1 rounded hover:bg-red-50"
                style={{ color: 'var(--scout-clay)' }}
              >
                <XIcon className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>

        {showAddDisqualifier && (
          <div className="mt-3 p-4 rounded-lg border" style={{ borderColor: 'var(--scout-border)', backgroundColor: 'var(--scout-parchment)' }}>
            <textarea
              value={newDisqualifier.signal}
              onChange={(e) => setNewDisqualifier({ ...newDisqualifier, signal: e.target.value })}
              placeholder="Describe the disqualifying signal..."
              rows={2}
              className="w-full px-3 py-2 text-sm border rounded-lg resize-none mb-2"
              style={{ borderColor: 'var(--scout-border)' }}
            />
            <div className="grid grid-cols-2 gap-2">
              <select
                value={newDisqualifier.category}
                onChange={(e) => setNewDisqualifier({ ...newDisqualifier, category: e.target.value as typeof newDisqualifier.category })}
                className="px-3 py-2 text-sm border rounded-lg"
                style={{ borderColor: 'var(--scout-border)' }}
              >
                <option value="competitive">Competitive Lock-in</option>
                <option value="organizational">Organizational Fit</option>
                <option value="scale">Scale Mismatch</option>
                <option value="timing">Timing/Priority</option>
                <option value="behavioral">Behavioral Red Flag</option>
              </select>
              <select
                value={newDisqualifier.severity}
                onChange={(e) => setNewDisqualifier({ ...newDisqualifier, severity: e.target.value as 'hard' | 'soft' })}
                className="px-3 py-2 text-sm border rounded-lg"
                style={{ borderColor: 'var(--scout-border)' }}
              >
                <option value="soft">Soft (Deprioritize)</option>
                <option value="hard">Hard (Exclude)</option>
              </select>
            </div>
            <div className="mt-3 flex gap-2">
              <button
                onClick={addDisqualifier}
                disabled={!newDisqualifier.signal}
                className="px-4 py-2 text-sm font-medium text-white rounded-lg disabled:opacity-50"
                style={{ backgroundColor: 'var(--scout-trail)' }}
              >
                Add
              </button>
              <button
                onClick={() => setShowAddDisqualifier(false)}
                className="px-4 py-2 text-sm"
                style={{ color: 'var(--scout-earth-light)' }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ============================================
// TARGET MARKET EDITOR
// ============================================

function TargetMarketEditor({
  data,
  onChange,
}: {
  data: SalesIntelligence['target_market']
  onChange: (data: SalesIntelligence['target_market']) => void
}) {
  return (
    <div className="space-y-4">
      {/* Ideal Customer Profile */}
      <div>
        <label className="block text-sm font-medium mb-1" style={{ color: 'var(--scout-earth)' }}>
          Ideal Customer Profile
        </label>
        <textarea
          value={data.ideal_customer_profile || ''}
          onChange={(e) => onChange({ ...data, ideal_customer_profile: e.target.value })}
          placeholder="Describe your ideal customer: their characteristics, challenges, and why they need your solution..."
          rows={3}
          className="w-full px-3 py-2 text-sm border rounded-lg resize-none"
          style={{ borderColor: 'var(--scout-border)' }}
        />
      </div>

      {/* Target Verticals */}
      <div>
        <label className="block text-sm font-medium mb-1" style={{ color: 'var(--scout-earth)' }}>
          Target Verticals
        </label>
        <TagInput
          tags={data.target_verticals || []}
          onChange={(target_verticals) => onChange({ ...data, target_verticals })}
          placeholder="e.g., Medical Devices, Automotive, Industrial"
        />
      </div>

      {/* Company Sizes */}
      <div>
        <label className="block text-sm font-medium mb-1" style={{ color: 'var(--scout-earth)' }}>
          Target Company Sizes
        </label>
        <TagInput
          tags={data.target_company_sizes || []}
          onChange={(target_company_sizes) => onChange({ ...data, target_company_sizes })}
          placeholder="e.g., Enterprise, Mid-Market, SMB"
        />
      </div>

      {/* Target Geographies */}
      <div>
        <label className="block text-sm font-medium mb-1" style={{ color: 'var(--scout-earth)' }}>
          Target Geographies
        </label>
        <TagInput
          tags={data.target_geographies || []}
          onChange={(target_geographies) => onChange({ ...data, target_geographies })}
          placeholder="e.g., North America, Europe, APAC"
        />
      </div>

      {/* Buying Triggers */}
      <div>
        <label className="block text-sm font-medium mb-1" style={{ color: 'var(--scout-earth)' }}>
          Buying Triggers
        </label>
        <TagInput
          tags={data.buying_triggers || []}
          onChange={(buying_triggers) => onChange({ ...data, buying_triggers })}
          placeholder="e.g., Regulatory deadline, Security incident, M&A activity"
        />
        <p className="text-xs mt-1" style={{ color: 'var(--scout-earth-light)' }}>
          Events or signals that indicate a prospect is ready to buy
        </p>
      </div>
    </div>
  )
}

// ============================================
// VALUE PROPOSITION EDITOR
// ============================================

function ValuePropositionEditor({
  data,
  onChange,
}: {
  data: SalesIntelligence['value_proposition']
  onChange: (data: SalesIntelligence['value_proposition']) => void
}) {
  return (
    <div className="space-y-4">
      {/* Core Value Proposition */}
      <div>
        <label className="block text-sm font-medium mb-1" style={{ color: 'var(--scout-earth)' }}>
          Core Value Proposition
        </label>
        <textarea
          value={data.core_value_prop || ''}
          onChange={(e) => onChange({ ...data, core_value_prop: e.target.value })}
          placeholder="Your main value proposition statement: what you do, for whom, and why it matters..."
          rows={3}
          className="w-full px-3 py-2 text-sm border rounded-lg resize-none"
          style={{ borderColor: 'var(--scout-border)' }}
        />
      </div>

      {/* Key Differentiators */}
      <div>
        <label className="block text-sm font-medium mb-1" style={{ color: 'var(--scout-earth)' }}>
          Key Differentiators
        </label>
        <TagInput
          tags={data.key_differentiators || []}
          onChange={(key_differentiators) => onChange({ ...data, key_differentiators })}
          placeholder="e.g., Only platform with real-time compliance updates"
        />
        <p className="text-xs mt-1" style={{ color: 'var(--scout-earth-light)' }}>
          What makes you different from competitors
        </p>
      </div>

      {/* Pain Points Addressed */}
      <div>
        <label className="block text-sm font-medium mb-1" style={{ color: 'var(--scout-earth)' }}>
          Pain Points Addressed
        </label>
        <TagInput
          tags={data.pain_points_addressed || []}
          onChange={(pain_points_addressed) => onChange({ ...data, pain_points_addressed })}
          placeholder="e.g., Manual compliance tracking, Audit failures, Delayed time-to-market"
        />
        <p className="text-xs mt-1" style={{ color: 'var(--scout-earth-light)' }}>
          Problems your solution solves for customers
        </p>
      </div>
    </div>
  )
}

// ============================================
// SHARED COMPONENTS
// ============================================

function TagInput({
  tags,
  onChange,
  placeholder,
}: {
  tags: string[]
  onChange: (tags: string[]) => void
  placeholder?: string
}) {
  const [input, setInput] = useState('')

  const addTag = () => {
    if (!input.trim()) return
    onChange([...tags, input.trim()])
    setInput('')
  }

  const removeTag = (index: number) => {
    onChange(tags.filter((_, i) => i !== index))
  }

  return (
    <div>
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {tags.map((tag, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm"
              style={{ backgroundColor: 'var(--scout-sky)', color: 'white' }}
            >
              {tag}
              <button onClick={() => removeTag(i)} className="hover:opacity-70">
                <XIcon className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}
      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
          placeholder={placeholder}
          className="flex-1 px-3 py-2 text-sm border rounded-lg"
          style={{ borderColor: 'var(--scout-border)' }}
        />
        <button
          onClick={addTag}
          className="px-4 py-2 text-sm font-medium rounded-lg"
          style={{ backgroundColor: 'var(--scout-parchment)', color: 'var(--scout-earth)' }}
        >
          Add
        </button>
      </div>
    </div>
  )
}

function EmptyState({ message, hint }: { message: string; hint: string }) {
  return (
    <div
      className="p-4 rounded-lg border border-dashed text-center"
      style={{ borderColor: 'var(--scout-border)' }}
    >
      <p className="text-sm" style={{ color: 'var(--scout-earth-light)' }}>{message}</p>
      <p className="text-xs mt-1" style={{ color: 'var(--scout-earth-light)', opacity: 0.7 }}>{hint}</p>
    </div>
  )
}

// ============================================
// ICONS
// ============================================

function BrainIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
    </svg>
  )
}

function GlobeIcon({ className }: { className?: string }) {
  return (
    <svg className={className || "w-5 h-5"} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
    </svg>
  )
}

function SwordsIcon({ className }: { className?: string }) {
  return (
    <svg className={className || "w-5 h-5"} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
    </svg>
  )
}

function TrophyIcon({ className }: { className?: string }) {
  return (
    <svg className={className || "w-5 h-5"} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 01-.982-3.172M9.497 14.25a7.454 7.454 0 00.981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 007.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M7.73 9.728a6.726 6.726 0 002.748 1.35m8.272-6.842V4.5c0 2.108-.966 3.99-2.48 5.228m2.48-5.492a46.32 46.32 0 012.916.52 6.003 6.003 0 01-5.395 4.972m0 0a6.726 6.726 0 01-2.749 1.35m0 0a6.772 6.772 0 01-3.044 0" />
    </svg>
  )
}

function RadarIcon({ className }: { className?: string }) {
  return (
    <svg className={className || "w-5 h-5"} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 14.25v2.25m3-4.5v4.5m3-6.75v6.75m3-9v9M6 20.25h12A2.25 2.25 0 0020.25 18V6A2.25 2.25 0 0018 3.75H6A2.25 2.25 0 003.75 6v12A2.25 2.25 0 006 20.25z" />
    </svg>
  )
}

function ChevronIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
    </svg>
  )
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  )
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
    </svg>
  )
}

function TargetIcon({ className }: { className?: string }) {
  return (
    <svg className={className || "w-5 h-5"} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9 9 0 100-18 9 9 0 000 18z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 15a3 3 0 100-6 3 3 0 000 6z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v3m0 12v3M3 12h3m12 0h3" />
    </svg>
  )
}

function SparklesIcon({ className }: { className?: string }) {
  return (
    <svg className={className || "w-5 h-5"} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
    </svg>
  )
}
