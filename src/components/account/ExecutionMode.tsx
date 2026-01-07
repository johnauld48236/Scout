'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ScoutAIIcon } from '@/components/ui/scout-logo'

interface TrackerAction {
  action_id: string
  description: string
  due_date?: string
  status: string
  bucket: '30' | '60' | '90'
  priority?: string
}

interface Division {
  division_id: string
  name: string
}

interface Stakeholder {
  stakeholder_id: string
  full_name: string
  title?: string
  influence_level?: string
}

interface Signal {
  signal_id: string
  summary: string
  signal_type?: string
  signal_date?: string
}

interface Pursuit {
  pursuit_id: string
  name: string
  stage: string
  estimated_value?: number
  thesis?: string
}

interface PainPoint {
  pain_point_id: string
  description: string
  severity?: string
}

interface Risk {
  risk_id: string
  description: string
  likelihood?: string
}

interface ScoutTheme {
  theme_id: string
  title: string
  description: string
  why_it_matters: string
  size: string
  questions_to_explore: string[]
  status: string
}

interface ExecutionModeProps {
  accountId: string
  accountName: string
  trackerActions: TrackerAction[]
  divisions: Division[]
  stakeholders: Stakeholder[]
  signals: Signal[]
  pursuits: Pursuit[]
  painPoints: PainPoint[]
  risks: Risk[]
  scoutThemes: ScoutTheme[]
  onSwitchToDiscovery: () => void
  onSwitchToClassic: () => void
}

export function ExecutionMode({
  accountId,
  accountName,
  trackerActions,
  divisions,
  stakeholders,
  signals,
  pursuits,
  painPoints,
  risks,
  scoutThemes,
  onSwitchToDiscovery,
  onSwitchToClassic,
}: ExecutionModeProps) {
  const router = useRouter()
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    tracker: true,
    twoWeek: true,
    opportunities: true,
    deals: false,
    intelligence: false,
    stakeholders: false,
    structure: false,
    painPoints: false,
    risks: false,
  })

  // Track action status changes locally
  const [actionStatuses, setActionStatuses] = useState<Record<string, string>>({})

  const handleStatusChange = (actionId: string, newStatus: string) => {
    setActionStatuses(prev => ({ ...prev, [actionId]: newStatus }))
  }

  // Get effective status (local override or original)
  const getEffectiveStatus = (action: TrackerAction) => {
    return actionStatuses[action.action_id] || action.status
  }

  // Group actions by bucket
  const actions30 = trackerActions.filter(a => a.bucket === '30')
  const actions60 = trackerActions.filter(a => a.bucket === '60')
  const actions90 = trackerActions.filter(a => a.bucket === '90')

  // Get overdue and upcoming actions for 2-week focus
  const now = new Date()
  const twoWeeksOut = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000)

  const urgentActions = trackerActions.filter(a => {
    if (!a.due_date) return false
    const dueDate = new Date(a.due_date)
    return dueDate <= twoWeeksOut && a.status !== 'completed'
  }).sort((a, b) => {
    if (!a.due_date) return 1
    if (!b.due_date) return -1
    return new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
  })

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }))
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'var(--scout-trail)'
      case 'in_progress': return 'var(--scout-sky)'
      case 'blocked': return '#ef4444'
      default: return 'var(--scout-earth-light)'
    }
  }

  const getDaysUntil = (dateStr: string) => {
    const date = new Date(dateStr)
    const diff = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    if (diff < 0) return { text: `${Math.abs(diff)}d overdue`, overdue: true }
    if (diff === 0) return { text: 'Today', overdue: false }
    if (diff === 1) return { text: 'Tomorrow', overdue: false }
    return { text: `${diff}d`, overdue: false }
  }

  const formatPipelineValue = (value: number): string => {
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`
    if (value >= 1000) return `${(value / 1000).toFixed(0)}K`
    return value.toLocaleString()
  }

  const getStageColor = (stage: string): { bg: string; text: string } => {
    switch (stage?.toLowerCase()) {
      case 'closed won':
        return { bg: 'rgba(93, 122, 93, 0.15)', text: 'var(--scout-trail)' }
      case 'negotiation':
      case 'proposal':
        return { bg: 'rgba(56, 152, 199, 0.15)', text: 'var(--scout-sky)' }
      case 'discovery':
      case 'qualification':
        return { bg: 'rgba(210, 105, 30, 0.15)', text: 'var(--scout-sunset)' }
      case 'closed lost':
        return { bg: 'rgba(169, 68, 66, 0.15)', text: 'var(--scout-clay)' }
      default:
        return { bg: 'var(--scout-parchment)', text: 'var(--scout-earth-light)' }
    }
  }

  const getSizeBadge = (size?: string): string => {
    switch (size?.toLowerCase()) {
      case 'high': return '$$$ High'
      case 'medium': return '$$ Med'
      case 'low': return '$ Low'
      default: return 'Sizing TBD'
    }
  }

  const getSizeStyle = (size?: string): { backgroundColor: string; color: string } => {
    switch (size?.toLowerCase()) {
      case 'high':
        return { backgroundColor: 'rgba(93, 122, 93, 0.15)', color: 'var(--scout-trail)' }
      case 'medium':
        return { backgroundColor: 'rgba(56, 152, 199, 0.15)', color: 'var(--scout-sky)' }
      case 'low':
        return { backgroundColor: 'rgba(210, 105, 30, 0.15)', color: 'var(--scout-sunset)' }
      default:
        return { backgroundColor: 'var(--scout-parchment)', color: 'var(--scout-earth-light)' }
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-6">
      <div className="grid grid-cols-3 gap-6">
        {/* Left Column - Tracker & 2-Week Focus */}
        <div className="col-span-2 space-y-6">
          {/* 30/60/90 Tracker - Primary */}
          <CollapsibleSection
            title="30/60/90 Day Tracker"
            subtitle="Your execution cockpit"
            isExpanded={expandedSections.tracker}
            onToggle={() => toggleSection('tracker')}
            badge={`${trackerActions.filter(a => a.status !== 'completed').length} active`}
            isPrimary
          >
            <div className="grid grid-cols-3 gap-4">
              {/* 30 Day Column */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white" style={{ backgroundColor: 'var(--scout-sunset)' }}>
                    30
                  </div>
                  <span className="text-sm font-medium" style={{ color: 'var(--scout-saddle)' }}>
                    Immediate ({actions30.length})
                  </span>
                </div>
                {actions30.map((action, idx) => (
                  <ActionCard key={action.action_id || `action-30-${idx}`} action={{ ...action, status: getEffectiveStatus(action) }} accountId={accountId} getDaysUntil={getDaysUntil} getStatusColor={getStatusColor} onStatusChange={handleStatusChange} />
                ))}
                {actions30.length === 0 && (
                  <p className="text-xs text-center py-4" style={{ color: 'var(--scout-earth-light)' }}>
                    No 30-day actions
                  </p>
                )}
              </div>

              {/* 60 Day Column */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white" style={{ backgroundColor: 'var(--scout-sky)' }}>
                    60
                  </div>
                  <span className="text-sm font-medium" style={{ color: 'var(--scout-saddle)' }}>
                    Short-term ({actions60.length})
                  </span>
                </div>
                {actions60.map((action, idx) => (
                  <ActionCard key={action.action_id || `action-60-${idx}`} action={{ ...action, status: getEffectiveStatus(action) }} accountId={accountId} getDaysUntil={getDaysUntil} getStatusColor={getStatusColor} onStatusChange={handleStatusChange} />
                ))}
                {actions60.length === 0 && (
                  <p className="text-xs text-center py-4" style={{ color: 'var(--scout-earth-light)' }}>
                    No 60-day actions
                  </p>
                )}
              </div>

              {/* 90 Day Column */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white" style={{ backgroundColor: 'var(--scout-trail)' }}>
                    90
                  </div>
                  <span className="text-sm font-medium" style={{ color: 'var(--scout-saddle)' }}>
                    Strategic ({actions90.length})
                  </span>
                </div>
                {actions90.map((action, idx) => (
                  <ActionCard key={action.action_id || `action-90-${idx}`} action={{ ...action, status: getEffectiveStatus(action) }} accountId={accountId} getDaysUntil={getDaysUntil} getStatusColor={getStatusColor} onStatusChange={handleStatusChange} />
                ))}
                {actions90.length === 0 && (
                  <p className="text-xs text-center py-4" style={{ color: 'var(--scout-earth-light)' }}>
                    No 90-day actions
                  </p>
                )}
              </div>
            </div>

            {/* Tracker Actions */}
            <div className="flex gap-3 mt-4 pt-4 border-t" style={{ borderColor: 'var(--scout-border)' }}>
              <button
                onClick={() => router.push(`/accounts/${accountId}/plan-builder`)}
                className="px-4 py-2 text-sm font-medium rounded-lg text-white flex items-center gap-2"
                style={{ backgroundColor: 'var(--scout-saddle)' }}
              >
                <ScoutAIIcon size={16} className="text-white" />
                Refine Plan
              </button>
              <button
                onClick={onSwitchToClassic}
                className="px-4 py-2 text-sm rounded-lg border transition-colors hover:bg-gray-50"
                style={{ borderColor: 'var(--scout-border)', color: 'var(--scout-earth)' }}
              >
                + Add Action
              </button>
            </div>
          </CollapsibleSection>

          {/* 2-Week Focus */}
          <CollapsibleSection
            title="2-Week Focus"
            subtitle="What needs attention NOW"
            isExpanded={expandedSections.twoWeek}
            onToggle={() => toggleSection('twoWeek')}
            badge={urgentActions.length > 0 ? `${urgentActions.length} due` : undefined}
            badgeColor={urgentActions.some(a => a.due_date && new Date(a.due_date) < now) ? '#ef4444' : undefined}
          >
            {urgentActions.length > 0 ? (
              <div className="space-y-2">
                {urgentActions.slice(0, 5).map(action => {
                  const daysInfo = action.due_date ? getDaysUntil(action.due_date) : null
                  return (
                    <div
                      key={action.action_id}
                      className="flex items-center justify-between p-3 rounded-lg border"
                      style={{
                        borderColor: daysInfo?.overdue ? 'rgba(239, 68, 68, 0.3)' : 'var(--scout-border)',
                        backgroundColor: daysInfo?.overdue ? 'rgba(239, 68, 68, 0.05)' : 'var(--scout-white)',
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: getStatusColor(action.status) }}
                        />
                        <span className="text-sm" style={{ color: 'var(--scout-saddle)' }}>
                          {action.description}
                        </span>
                      </div>
                      {daysInfo && (
                        <span
                          className="text-xs font-medium px-2 py-1 rounded"
                          style={{
                            color: daysInfo.overdue ? '#ef4444' : 'var(--scout-earth)',
                            backgroundColor: daysInfo.overdue ? 'rgba(239, 68, 68, 0.1)' : 'var(--scout-parchment)',
                          }}
                        >
                          {daysInfo.text}
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="text-sm text-center py-6" style={{ color: 'var(--scout-earth-light)' }}>
                No urgent actions in the next 2 weeks. Great job staying ahead!
              </p>
            )}
          </CollapsibleSection>

          {/* Pain Points & Risks Row */}
          <div className="grid grid-cols-2 gap-4">
            <CollapsibleSection
              title="Pain Points"
              isExpanded={expandedSections.painPoints}
              onToggle={() => toggleSection('painPoints')}
              badge={`${painPoints.length}`}
              compact
            >
              {painPoints.length > 0 ? (
                <div className="space-y-2">
                  {painPoints.map(pp => (
                    <div key={pp.pain_point_id} className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ backgroundColor: 'var(--scout-sunset)' }} />
                      <span className="text-sm" style={{ color: 'var(--scout-earth)' }}>{pp.description}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs" style={{ color: 'var(--scout-earth-light)' }}>No pain points identified</p>
              )}
            </CollapsibleSection>

            <CollapsibleSection
              title="Risks"
              isExpanded={expandedSections.risks}
              onToggle={() => toggleSection('risks')}
              badge={`${risks.length}`}
              badgeColor={risks.length > 0 ? '#ef4444' : undefined}
              compact
            >
              {risks.length > 0 ? (
                <div className="space-y-2">
                  {risks.map(risk => (
                    <div key={risk.risk_id} className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 bg-red-500" />
                      <span className="text-sm" style={{ color: 'var(--scout-earth)' }}>{risk.description}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs" style={{ color: 'var(--scout-earth-light)' }}>No risks identified</p>
              )}
            </CollapsibleSection>
          </div>
        </div>

        {/* Right Column - Reference Info */}
        <div className="space-y-4">
          {/* Scout Vector - Primary focus */}
          <CollapsibleSection
            title="Scout Vector"
            isExpanded={expandedSections.opportunities}
            onToggle={() => toggleSection('opportunities')}
            badge={scoutThemes.length > 0 ? getSizeBadge(scoutThemes[0]?.size) : undefined}
            isPrimary
          >
            {scoutThemes.length > 0 ? (
              <div className="space-y-3">
                {scoutThemes.map((theme, idx) => (
                  <div
                    key={theme.theme_id || `theme-${idx}`}
                    className="p-3 rounded-lg border"
                    style={{ borderColor: 'var(--scout-border)', backgroundColor: 'var(--scout-white)' }}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <p className="text-sm font-medium" style={{ color: 'var(--scout-saddle)' }}>
                        {theme.title}
                      </p>
                      <span
                        className="text-xs px-2 py-0.5 rounded-full font-medium"
                        style={getSizeStyle(theme.size)}
                      >
                        {theme.size === 'high' ? '$$$ High' : theme.size === 'medium' ? '$$ Medium' : '$ Low'}
                      </span>
                    </div>
                    <p className="text-xs mb-2" style={{ color: 'var(--scout-earth)' }}>
                      {theme.description.slice(0, 100)}{theme.description.length > 100 ? '...' : ''}
                    </p>
                    {theme.why_it_matters && (
                      <p className="text-xs italic" style={{ color: 'var(--scout-earth-light)' }}>
                        Why now: {theme.why_it_matters.slice(0, 80)}{theme.why_it_matters.length > 80 ? '...' : ''}
                      </p>
                    )}
                    {theme.questions_to_explore && theme.questions_to_explore.length > 0 && (
                      <div className="mt-2 pt-2 border-t" style={{ borderColor: 'var(--scout-border)' }}>
                        <p className="text-[10px] uppercase tracking-wide mb-1" style={{ color: 'var(--scout-earth-light)' }}>
                          Questions to explore
                        </p>
                        <ul className="space-y-0.5">
                          {theme.questions_to_explore.slice(0, 2).map((q, i) => (
                            <li key={i} className="text-xs flex items-start gap-1.5" style={{ color: 'var(--scout-earth)' }}>
                              <span style={{ color: 'var(--scout-sky)' }}>•</span>
                              {q.slice(0, 60)}{q.length > 60 ? '...' : ''}
                            </li>
                          ))}
                          {theme.questions_to_explore.length > 2 && (
                            <li className="text-xs" style={{ color: 'var(--scout-earth-light)' }}>
                              +{theme.questions_to_explore.length - 2} more questions
                            </li>
                          )}
                        </ul>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-xs mb-3" style={{ color: 'var(--scout-earth-light)' }}>
                  No Scout Vector defined yet
                </p>
                <button
                  onClick={() => router.push(`/accounts/${accountId}/explore`)}
                  className="text-xs px-3 py-1.5 rounded-lg border transition-colors hover:bg-gray-50 flex items-center gap-2 mx-auto"
                  style={{ borderColor: 'var(--scout-saddle)', color: 'var(--scout-saddle)' }}
                >
                  <ScoutAIIcon size={14} />
                  Define Vector with AI
                </button>
              </div>
            )}
          </CollapsibleSection>

          {/* Active Deals - Only show if there are pursuits */}
          {pursuits.length > 0 && (
            <CollapsibleSection
              title="Active Deals"
              isExpanded={false}
              onToggle={() => toggleSection('deals')}
              badge={`$${formatPipelineValue(pursuits.reduce((sum, p) => sum + (p.estimated_value || 0), 0))}`}
              compact
            >
              <div className="space-y-2">
                {pursuits.map((pursuit, idx) => (
                  <div
                    key={pursuit.pursuit_id || `pursuit-${idx}`}
                    className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 cursor-pointer"
                    onClick={onSwitchToClassic}
                  >
                    <div>
                      <p className="text-sm font-medium" style={{ color: 'var(--scout-saddle)' }}>
                        {pursuit.name}
                      </p>
                      <p className="text-xs" style={{ color: 'var(--scout-earth-light)' }}>
                        {pursuit.stage}
                      </p>
                    </div>
                    {pursuit.estimated_value && (
                      <span className="text-xs font-medium" style={{ color: 'var(--scout-trail)' }}>
                        ${pursuit.estimated_value.toLocaleString()}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </CollapsibleSection>
          )}

          {/* Intelligence */}
          <CollapsibleSection
            title="Intelligence"
            isExpanded={expandedSections.intelligence}
            onToggle={() => toggleSection('intelligence')}
            badge={`${signals.length} signals`}
            compact
          >
            {signals.length > 0 ? (
              <div className="space-y-2">
                {signals.slice(0, 5).map(signal => (
                  <div key={signal.signal_id} className="flex items-start gap-2">
                    <div
                      className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${
                        signal.signal_type?.includes('risk') ? 'bg-red-500' :
                        signal.signal_type?.includes('event') ? 'bg-amber-500' :
                        'bg-blue-500'
                      }`}
                    />
                    <span className="text-xs" style={{ color: 'var(--scout-earth)' }}>
                      {signal.summary.slice(0, 80)}{signal.summary.length > 80 ? '...' : ''}
                    </span>
                  </div>
                ))}
                {signals.length > 5 && (
                  <button
                    onClick={onSwitchToClassic}
                    className="text-xs font-medium"
                    style={{ color: 'var(--scout-sky)' }}
                  >
                    View all {signals.length} signals →
                  </button>
                )}
              </div>
            ) : (
              <div className="text-center py-3">
                <p className="text-xs mb-2" style={{ color: 'var(--scout-earth-light)' }}>No signals yet</p>
                <button
                  onClick={() => router.push(`/accounts/${accountId}/explore`)}
                  className="text-xs font-medium"
                  style={{ color: 'var(--scout-sky)' }}
                >
                  Gather Intelligence
                </button>
              </div>
            )}
          </CollapsibleSection>

          {/* Stakeholders */}
          <CollapsibleSection
            title="Key Stakeholders"
            isExpanded={expandedSections.stakeholders}
            onToggle={() => toggleSection('stakeholders')}
            badge={`${stakeholders.length}`}
            compact
          >
            {stakeholders.length > 0 ? (
              <div className="space-y-2">
                {stakeholders.slice(0, 5).map(s => (
                  <div key={s.stakeholder_id} className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium" style={{ color: 'var(--scout-saddle)' }}>{s.full_name}</p>
                      {s.title && <p className="text-xs" style={{ color: 'var(--scout-earth-light)' }}>{s.title}</p>}
                    </div>
                    {s.influence_level && (
                      <span
                        className="text-xs px-2 py-0.5 rounded"
                        style={{
                          backgroundColor: s.influence_level === 'decision_maker' ? 'rgba(93, 122, 93, 0.15)' : 'var(--scout-parchment)',
                          color: s.influence_level === 'decision_maker' ? 'var(--scout-trail)' : 'var(--scout-earth-light)',
                        }}
                      >
                        {s.influence_level.replace('_', ' ')}
                      </span>
                    )}
                  </div>
                ))}
                {stakeholders.length > 5 && (
                  <button
                    onClick={onSwitchToClassic}
                    className="text-xs font-medium"
                    style={{ color: 'var(--scout-sky)' }}
                  >
                    View all {stakeholders.length} stakeholders →
                  </button>
                )}
              </div>
            ) : (
              <div className="text-center py-3">
                <p className="text-xs mb-2" style={{ color: 'var(--scout-earth-light)' }}>No stakeholders mapped</p>
                <button
                  onClick={onSwitchToClassic}
                  className="text-xs font-medium"
                  style={{ color: 'var(--scout-sky)' }}
                >
                  Add Stakeholders
                </button>
              </div>
            )}
          </CollapsibleSection>

          {/* Structure */}
          <CollapsibleSection
            title="Corporate Structure"
            isExpanded={expandedSections.structure}
            onToggle={() => toggleSection('structure')}
            badge={`${divisions.length} divisions`}
            compact
          >
            {divisions.length > 0 ? (
              <div className="space-y-1">
                {divisions.slice(0, 5).map(d => (
                  <div key={d.division_id} className="flex items-center gap-2">
                    <div className="w-1 h-1 rounded-full" style={{ backgroundColor: 'var(--scout-earth-light)' }} />
                    <span className="text-sm" style={{ color: 'var(--scout-earth)' }}>{d.name}</span>
                  </div>
                ))}
                {divisions.length > 5 && (
                  <button
                    onClick={onSwitchToClassic}
                    className="text-xs font-medium"
                    style={{ color: 'var(--scout-sky)' }}
                  >
                    View all {divisions.length} →
                  </button>
                )}
              </div>
            ) : (
              <div className="text-center py-3">
                <p className="text-xs mb-2" style={{ color: 'var(--scout-earth-light)' }}>No structure mapped</p>
                <button
                  onClick={onSwitchToClassic}
                  className="text-xs font-medium"
                  style={{ color: 'var(--scout-sky)' }}
                >
                  Map Structure
                </button>
              </div>
            )}
          </CollapsibleSection>

          {/* Switch to Discovery */}
          <div className="pt-4 border-t" style={{ borderColor: 'var(--scout-border)' }}>
            <button
              onClick={onSwitchToDiscovery}
              className="w-full text-center text-xs py-2"
              style={{ color: 'var(--scout-earth-light)' }}
            >
              Switch to Discovery View
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// Collapsible Section Component
function CollapsibleSection({
  title,
  subtitle,
  isExpanded,
  onToggle,
  badge,
  badgeColor,
  isPrimary,
  compact,
  children,
}: {
  title: string
  subtitle?: string
  isExpanded: boolean
  onToggle: () => void
  badge?: string
  badgeColor?: string
  isPrimary?: boolean
  compact?: boolean
  children: React.ReactNode
}) {
  return (
    <div
      className={`rounded-xl border transition-all ${isPrimary ? 'shadow-sm' : ''}`}
      style={{
        borderColor: isPrimary ? 'var(--scout-saddle)' : 'var(--scout-border)',
        backgroundColor: 'var(--scout-white)',
      }}
    >
      <button
        onClick={onToggle}
        className={`w-full flex items-center justify-between ${compact ? 'p-3' : 'p-4'} text-left`}
      >
        <div className="flex items-center gap-2">
          <h3
            className={`font-semibold ${compact ? 'text-sm' : 'text-base'}`}
            style={{ color: 'var(--scout-saddle)', fontFamily: isPrimary ? "'Bitter', Georgia, serif" : undefined }}
          >
            {title}
          </h3>
          {badge && (
            <span
              className="text-xs px-2 py-0.5 rounded-full"
              style={{
                backgroundColor: badgeColor ? `${badgeColor}15` : 'var(--scout-parchment)',
                color: badgeColor || 'var(--scout-earth-light)',
              }}
            >
              {badge}
            </span>
          )}
        </div>
        <svg
          className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          style={{ color: 'var(--scout-earth-light)' }}
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {subtitle && isExpanded && (
        <p className="px-4 -mt-2 mb-2 text-xs" style={{ color: 'var(--scout-earth-light)' }}>
          {subtitle}
        </p>
      )}
      {isExpanded && (
        <div className={compact ? 'px-3 pb-3' : 'px-4 pb-4'}>
          {children}
        </div>
      )}
    </div>
  )
}

// Action Card Component with edit and complete
function ActionCard({
  action,
  accountId,
  getDaysUntil,
  getStatusColor,
  onStatusChange,
}: {
  action: {
    action_id: string
    description: string
    due_date?: string
    status: string
    priority?: string
  }
  accountId: string
  getDaysUntil: (date: string) => { text: string; overdue: boolean }
  getStatusColor: (status: string) => string
  onStatusChange: (actionId: string, newStatus: string) => void
}) {
  const [isUpdating, setIsUpdating] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editTitle, setEditTitle] = useState(action.description)
  const [editDueDate, setEditDueDate] = useState(action.due_date || '')
  const [editPriority, setEditPriority] = useState(action.priority || 'Medium')
  const daysInfo = action.due_date ? getDaysUntil(action.due_date) : null
  const isCompleted = action.status === 'completed'

  const handleToggleComplete = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (isUpdating) return

    setIsUpdating(true)
    const newStatus = isCompleted ? 'pending' : 'completed'

    try {
      await fetch(`/api/action-items/${action.action_id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus === 'completed' ? 'Completed' : 'Not Started' }),
      })
      onStatusChange(action.action_id, newStatus)
    } catch (error) {
      console.error('Failed to update action:', error)
    } finally {
      setIsUpdating(false)
    }
  }

  const handleSaveEdit = async () => {
    setIsUpdating(true)
    try {
      await fetch(`/api/action-items/${action.action_id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editTitle,
          due_date: editDueDate || null,
          priority: editPriority,
        }),
      })
      setIsEditing(false)
      // Refresh the page to show updated data
      window.location.reload()
    } catch (error) {
      console.error('Failed to update action:', error)
    } finally {
      setIsUpdating(false)
    }
  }

  if (isEditing) {
    return (
      <div
        className="p-3 rounded-lg border"
        style={{ borderColor: 'var(--scout-sky)', backgroundColor: 'var(--scout-white)' }}
      >
        <div className="space-y-3">
          <input
            type="text"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            className="w-full px-2 py-1.5 text-sm rounded border"
            style={{ borderColor: 'var(--scout-border)' }}
            placeholder="Action description"
          />
          <div className="flex gap-2">
            <input
              type="date"
              value={editDueDate}
              onChange={(e) => setEditDueDate(e.target.value)}
              className="flex-1 px-2 py-1.5 text-sm rounded border"
              style={{ borderColor: 'var(--scout-border)' }}
            />
            <select
              value={editPriority}
              onChange={(e) => setEditPriority(e.target.value)}
              className="px-2 py-1.5 text-sm rounded border"
              style={{ borderColor: 'var(--scout-border)' }}
            >
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
            </select>
          </div>
          <div className="flex gap-2 justify-end">
            <button
              onClick={() => setIsEditing(false)}
              className="px-3 py-1 text-xs rounded border"
              style={{ borderColor: 'var(--scout-border)', color: 'var(--scout-earth)' }}
            >
              Cancel
            </button>
            <button
              onClick={handleSaveEdit}
              disabled={isUpdating}
              className="px-3 py-1 text-xs rounded text-white"
              style={{ backgroundColor: 'var(--scout-saddle)' }}
            >
              {isUpdating ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      className="p-3 rounded-lg border transition-all hover:shadow-sm group"
      style={{
        borderColor: daysInfo?.overdue ? 'rgba(239, 68, 68, 0.3)' : 'var(--scout-border)',
        backgroundColor: isCompleted ? 'rgba(93, 122, 93, 0.05)' : 'var(--scout-white)',
      }}
    >
      <div className="flex items-start gap-2">
        {/* Checkbox for quick complete */}
        <button
          onClick={handleToggleComplete}
          disabled={isUpdating}
          className={`w-4 h-4 rounded border flex-shrink-0 mt-0.5 flex items-center justify-center transition-all ${
            isUpdating ? 'opacity-50' : 'hover:border-2'
          }`}
          style={{
            borderColor: isCompleted ? 'var(--scout-trail)' : 'var(--scout-earth-light)',
            backgroundColor: isCompleted ? 'var(--scout-trail)' : 'transparent',
          }}
        >
          {isCompleted && (
            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          )}
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between">
            <p
              className={`text-sm ${isCompleted ? 'line-through opacity-60' : ''}`}
              style={{ color: 'var(--scout-saddle)' }}
            >
              {action.description}
            </p>
            {/* Edit button - appears on hover */}
            <button
              onClick={() => setIsEditing(true)}
              className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-gray-100"
              title="Edit action"
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: 'var(--scout-earth-light)' }}>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            </button>
          </div>
          <div className="flex items-center gap-2 mt-1">
            {daysInfo && (
              <span
                className="text-xs"
                style={{ color: daysInfo.overdue ? '#ef4444' : 'var(--scout-earth-light)' }}
              >
                {daysInfo.text}
              </span>
            )}
            {action.priority && (
              <span
                className="text-[10px] px-1.5 py-0.5 rounded"
                style={{
                  backgroundColor: action.priority === 'High' ? 'rgba(169, 68, 66, 0.1)' : 'var(--scout-parchment)',
                  color: action.priority === 'High' ? 'var(--scout-clay)' : 'var(--scout-earth-light)',
                }}
              >
                {action.priority}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
