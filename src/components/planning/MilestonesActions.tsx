'use client'

import { useState, useEffect } from 'react'
import { ScoutAIIcon } from '@/components/ui/scout-logo'
import type { Account, Pursuit, ActionItem, Stakeholder } from './PlanningContainer'

interface Risk {
  risk_id: string
  account_plan_id: string
  pursuit_id?: string
  description: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  status: 'open' | 'mitigated' | 'closed' | 'realized'
  mitigation?: string
  impact_on_bant?: 'B' | 'A' | 'N' | 'T' | null
  target_date?: string
}

interface BANTScore {
  budget_score: number
  authority_score: number
  need_score: number
  timeline_score: number
}

interface MilestonesActionsProps {
  account: Account
  pursuits: Pursuit[]
  stakeholders: Stakeholder[]
  actionItems: ActionItem[]
  updateAccount: (updates: Partial<Account>) => void
  updateActionItems: (actionItems: ActionItem[]) => void
  onNext: () => void
  onPrev: () => void
}

type MilestonePeriod = 'day_30' | 'day_60' | 'day_90'

export function MilestonesActions({
  account,
  pursuits,
  stakeholders,
  actionItems,
  updateAccount,
  updateActionItems,
  onNext,
  onPrev,
}: MilestonesActionsProps) {
  const [isGenerating, setIsGenerating] = useState(false)
  const [isGeneratingActions, setIsGeneratingActions] = useState(false)
  const [newMilestone, setNewMilestone] = useState<{ period: MilestonePeriod; text: string }>({
    period: 'day_30',
    text: '',
  })
  const [showAddAction, setShowAddAction] = useState(false)
  const [newAction, setNewAction] = useState({
    title: '',
    description: '',
    priority: 'Medium',
    due_date: '',
    pursuit_id: '',
    bant_dimension: '' as '' | 'B' | 'A' | 'N' | 'T',
    milestone_period: '' as '' | 'day_30' | 'day_60' | 'day_90',
  })
  const [view, setView] = useState<'plan' | 'risks'>('plan')
  const [selectedPursuit, setSelectedPursuit] = useState<string>('all')
  const [risks, setRisks] = useState<Risk[]>([])
  const [showAddRisk, setShowAddRisk] = useState(false)
  const [newRisk, setNewRisk] = useState({
    description: '',
    severity: 'medium' as 'low' | 'medium' | 'high' | 'critical',
    pursuit_id: '',
    impact_on_bant: '' as '' | 'B' | 'A' | 'N' | 'T',
    target_date: '',
  })
  const [bantScores, setBantScores] = useState<Record<string, BANTScore>>({})

  // Load BANT scores and risks on mount
  useEffect(() => {
    const loadData = async () => {
      // Load BANT scores for each pursuit
      const scores: Record<string, BANTScore> = {}
      for (const pursuit of pursuits) {
        if (pursuit.pursuit_id.startsWith('pursuit-')) continue
        try {
          const response = await fetch(`/api/bant-analyses?pursuit_id=${pursuit.pursuit_id}`)
          if (response.ok) {
            const data = await response.json()
            const latest = data.bant_analyses?.[0]
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
          console.error('Failed to load BANT score:', error)
        }
      }
      if (Object.keys(scores).length > 0) {
        setBantScores(scores)
      }

      // Load risks
      try {
        const response = await fetch(`/api/accounts/${account.account_plan_id}/risks`)
        if (response.ok) {
          const data = await response.json()
          setRisks(data.risks || [])
        }
      } catch (error) {
        console.error('Failed to load risks:', error)
      }
    }
    loadData()
  }, [pursuits, account.account_plan_id])

  // Identify BANT gaps across pursuits
  const getBANTGaps = (pursuitId?: string): Array<{ key: 'B' | 'A' | 'N' | 'T'; label: string; pursuit?: string }> => {
    const gaps: Array<{ key: 'B' | 'A' | 'N' | 'T'; label: string; pursuit?: string }> = []
    const pursuitsToCheck = pursuitId && pursuitId !== 'all'
      ? pursuits.filter(p => p.pursuit_id === pursuitId)
      : pursuits

    pursuitsToCheck.forEach(p => {
      const scores = bantScores[p.pursuit_id]
      if (!scores) return
      if (scores.budget_score < 25) gaps.push({ key: 'B', label: 'Budget', pursuit: p.name })
      if (scores.authority_score < 25) gaps.push({ key: 'A', label: 'Authority', pursuit: p.name })
      if (scores.need_score < 25) gaps.push({ key: 'N', label: 'Need', pursuit: p.name })
      if (scores.timeline_score < 25) gaps.push({ key: 'T', label: 'Timeline', pursuit: p.name })
    })
    return gaps
  }

  const addRisk = async () => {
    if (!newRisk.description.trim()) return

    const risk: Risk = {
      risk_id: `risk-${Date.now()}`,
      account_plan_id: account.account_plan_id,
      pursuit_id: newRisk.pursuit_id || undefined,
      description: newRisk.description.trim(),
      severity: newRisk.severity,
      status: 'open',
      impact_on_bant: newRisk.impact_on_bant || null,
      target_date: newRisk.target_date || undefined,
    }

    setRisks([...risks, risk])
    setNewRisk({ description: '', severity: 'medium', pursuit_id: '', impact_on_bant: '', target_date: '' })
    setShowAddRisk(false)

    // Persist to database
    try {
      await fetch(`/api/accounts/${account.account_plan_id}/risks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(risk),
      })
    } catch (error) {
      console.error('Failed to save risk:', error)
    }
  }

  const deleteRisk = async (riskId: string) => {
    setRisks(risks.filter(r => r.risk_id !== riskId))
    if (!riskId.startsWith('risk-')) {
      try {
        await fetch(`/api/accounts/${account.account_plan_id}/risks/${riskId}`, {
          method: 'DELETE',
        })
      } catch (error) {
        console.error('Failed to delete risk:', error)
      }
    }
  }

  const milestones = account.milestones || { day_30: [], day_60: [], day_90: [] }

  const addMilestone = (period: MilestonePeriod) => {
    if (!newMilestone.text.trim()) return
    const updatedMilestones = {
      ...milestones,
      [period]: [
        ...milestones[period],
        { id: `milestone-${Date.now()}`, text: newMilestone.text.trim(), completed: false }
      ]
    }
    updateAccount({ milestones: updatedMilestones })
    setNewMilestone({ period: 'day_30', text: '' })
  }

  const removeMilestone = (period: MilestonePeriod, id: string) => {
    updateAccount({
      milestones: {
        ...milestones,
        [period]: milestones[period].filter(m => m.id !== id)
      }
    })
  }

  const toggleMilestone = (period: MilestonePeriod, id: string) => {
    updateAccount({
      milestones: {
        ...milestones,
        [period]: milestones[period].map(m =>
          m.id === id ? { ...m, completed: !m.completed } : m
        )
      }
    })
  }

  const generateMilestones = async () => {
    setIsGenerating(true)
    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `Create 30/60/90 day milestones for the ${account.account_name} account plan.

Account: ${account.account_name}
Strategy: ${account.account_strategy || 'Not defined'}

Opportunities:
${pursuits.map(p => `- ${p.name}: ${p.thesis || p.description || 'No details'}`).join('\n')}

Current Actions:
${actionItems.slice(0, 5).map(a => `- ${a.title}`).join('\n') || 'None yet'}

Generate 2-3 specific, measurable milestones for each period:

DAY 30:
[List milestones for first 30 days - focus on initial outreach, discovery]

DAY 60:
[List milestones for 30-60 days - focus on qualification, deeper engagement]

DAY 90:
[List milestones for 60-90 days - focus on proposals, advancing deals]`,
          context: { navigation: { page: 'accounts' } },
        }),
      })

      if (response.ok) {
        const result = await response.json()
        const content = result.content

        const parseMilestones = (section: string): Array<{ id: string; text: string; completed: boolean }> => {
          const items: Array<{ id: string; text: string; completed: boolean }> = []
          const lines = section.split('\n').filter(l => l.trim().match(/^[-*\d]/))
          lines.forEach((line, i) => {
            const text = line.replace(/^[-*\d.)\s]+/, '').trim()
            if (text.length > 5) {
              items.push({ id: `milestone-${Date.now()}-${i}`, text, completed: false })
            }
          })
          return items
        }

        const day30Match = content.match(/DAY 30:?([\s\S]*?)(?=DAY 60|$)/i)
        const day60Match = content.match(/DAY 60:?([\s\S]*?)(?=DAY 90|$)/i)
        const day90Match = content.match(/DAY 90:?([\s\S]*?)$/i)

        updateAccount({
          milestones: {
            day_30: day30Match ? parseMilestones(day30Match[1]) : [],
            day_60: day60Match ? parseMilestones(day60Match[1]) : [],
            day_90: day90Match ? parseMilestones(day90Match[1]) : [],
          }
        })
      }
    } catch (error) {
      console.error('Failed to generate milestones:', error)
    } finally {
      setIsGenerating(false)
    }
  }

  const addAction = async () => {
    if (!newAction.title.trim()) return

    const action: ActionItem = {
      action_id: `action-${Date.now()}`,
      account_plan_id: account.account_plan_id,
      pursuit_id: newAction.pursuit_id || undefined,
      title: newAction.title.trim(),
      description: newAction.description.trim() || undefined,
      priority: newAction.priority,
      status: 'Not Started',
      due_date: newAction.due_date || undefined,
      week_number: newAction.due_date ? getWeekNumber(newAction.due_date) : 1,
    }

    updateActionItems([...actionItems, action])
    setNewAction({ title: '', description: '', priority: 'Medium', due_date: '', pursuit_id: '', bant_dimension: '', milestone_period: '' })
    setShowAddAction(false)

    // Persist to database
    try {
      // Only include pursuit_id if it's a real UUID (not a temp ID)
      const pursuitId = action.pursuit_id && !action.pursuit_id.startsWith('pursuit-')
        ? action.pursuit_id
        : undefined

      await fetch('/api/action-items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          account_plan_id: action.account_plan_id,
          pursuit_id: pursuitId,
          title: action.title,
          description: action.description,
          priority: action.priority,
          // Don't send status - let DB use its default
          due_date: action.due_date,
          week_number: action.week_number,
        }),
      })
    } catch (error) {
      console.error('Failed to persist action:', error)
    }
  }

  const deleteAction = async (actionId: string) => {
    updateActionItems(actionItems.filter(a => a.action_id !== actionId))

    if (!actionId.startsWith('action-')) {
      try {
        await fetch('/api/action-items', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action_id: actionId }),
        })
      } catch (error) {
        console.error('Failed to delete action:', error)
      }
    }
  }

  const generateActions = async () => {
    setIsGeneratingActions(true)
    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `Create a list of specific action items for the ${account.account_name} account plan.

Account Context:
- Company: ${account.account_name}
- Industry/Vertical: ${account.industry || 'Unknown'}
- Strategy: ${account.account_strategy || 'Not defined'}

Opportunities:
${pursuits.map(p => `- ${p.name}: ${p.thesis || p.description || 'No details'}`).join('\n') || 'None defined'}

Milestones:
Day 30: ${milestones.day_30.map(m => m.text).join(', ') || 'None'}
Day 60: ${milestones.day_60.map(m => m.text).join(', ') || 'None'}
Day 90: ${milestones.day_90.map(m => m.text).join(', ') || 'None'}

IMPORTANT: If this account's industry/vertical matches any active campaigns, prioritize actions that align with campaign goals. Reference campaign-specific activities (e.g., campaign-related outreach, regulatory compliance activities, campaign messaging). Retrieve campaign details if needed to understand timing and priorities.

Generate 5-8 specific action items that support these milestones. For each:
Action: [Title - include campaign context if relevant]
Priority: [High/Medium/Low - boost priority for campaign-aligned actions]
Week: [1-12]
Opportunity: [Name of related opportunity, or "Account-level"]`,
          context: { navigation: { page: 'accounts' } },
        }),
      })

      if (response.ok) {
        const result = await response.json()
        const content = result.content
        console.log('Actions AI Response:', content) // Debug
        const newActions: ActionItem[] = []

        // Split by markdown headers, numbered lists, or "Action:" patterns
        const blocks = content
          .split(/(?=#{1,3}\s*(?:Action|Task)\s*\d*[:\s]|^\d+\.\s|\*{0,2}Action\s*\d*\*{0,2}[:\s])/mi)
          .filter((b: string) => b.trim() && b.length > 10)

        console.log('Parsed action blocks:', blocks.length) // Debug

        blocks.forEach((block: string, i: number) => {
          // Handle markdown format: ### Action 1: **Title** or **Action**: Title or 1. Title
          const titleMatch = block.match(/(?:#{1,3}\s*(?:Action|Task)\s*\d*[:\s]*|\*{0,2}Action\*{0,2}[:\s]*|^\d+\.\s*)[\*]*([^*\n]+)/i)
          const priorityMatch = block.match(/\*{0,2}Priority\*{0,2}[:\s]*(High|Medium|Low)/i)
          const weekMatch = block.match(/\*{0,2}Week\*{0,2}[:\s]*(\d+)/i)
          const oppMatch = block.match(/\*{0,2}Opportunity\*{0,2}[:\s]*([^\n]+)/i)

          if (titleMatch) {
            // Clean up markdown formatting from title
            const title = titleMatch[1]
              .replace(/\*+/g, '')
              .replace(/^[-\d.)\s:]+/, '')
              .trim()
            const weekNum = weekMatch ? parseInt(weekMatch[1]) : 1
            const oppName = oppMatch?.[1]?.trim()
            const pursuit = pursuits.find(p =>
              p.name.toLowerCase().includes(oppName?.toLowerCase() || '') ||
              oppName?.toLowerCase().includes(p.name.toLowerCase())
            )

            // Filter out header/intro lines that aren't real actions
            const isHeaderLine = /^(items?( for)?|action items?|here are|the following|below are|list of|these are|suggested)/i.test(title) ||
              /account plan[:.]?$/i.test(title) ||
              /^(action items?|items?) for/i.test(title) ||
              title.toLowerCase() === 'items' ||
              title.toLowerCase() === 'action' ||
              title.toLowerCase() === 'actions' ||
              title.length < 10 // Too short to be a real action

            if (title.length > 10 && !isHeaderLine) {
              const today = new Date()
              const dueDate = new Date(today)
              dueDate.setDate(today.getDate() + (weekNum * 7))

              newActions.push({
                action_id: `action-${Date.now()}-${i}`,
                account_plan_id: account.account_plan_id,
                pursuit_id: pursuit?.pursuit_id,
                title,
                priority: priorityMatch?.[1] || 'Medium',
                status: 'Not Started',
                week_number: weekNum,
                due_date: dueDate.toISOString().split('T')[0],
              })
            }
          }
        })

        if (newActions.length > 0) {
          // Persist to database and update with real IDs
          const savedActions: ActionItem[] = []
          for (const action of newActions) {
            try {
              // Only include pursuit_id if it's a real UUID (not a temp ID)
              const pursuitId = action.pursuit_id && !action.pursuit_id.startsWith('pursuit-')
                ? action.pursuit_id
                : undefined

              const response = await fetch('/api/action-items', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  account_plan_id: action.account_plan_id,
                  pursuit_id: pursuitId,
                  title: action.title,
                  priority: action.priority,
                  // Don't send status - let DB use its default
                  due_date: action.due_date,
                  week_number: action.week_number,
                }),
              })
              if (response.ok) {
                const result = await response.json()
                savedActions.push({
                  ...action,
                  action_id: result.action?.action_id || action.action_id,
                })
                console.log('Saved action:', result.action) // Debug
              } else {
                console.error('Failed to save action:', await response.text())
                savedActions.push(action)
              }
            } catch (error) {
              console.error('Failed to persist action:', error)
              savedActions.push(action)
            }
          }
          updateActionItems([...actionItems, ...savedActions])
        }
      }
    } catch (error) {
      console.error('Failed to generate actions:', error)
    } finally {
      setIsGeneratingActions(false)
    }
  }

  const getWeekNumber = (dateStr: string): number => {
    const today = new Date()
    const date = new Date(dateStr)
    const diffTime = date.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return Math.max(1, Math.ceil(diffDays / 7))
  }

  // Group actions by week
  const actionsByWeek: Record<number, ActionItem[]> = {}
  actionItems.forEach(action => {
    const week = action.week_number || 1
    if (!actionsByWeek[week]) actionsByWeek[week] = []
    actionsByWeek[week].push(action)
  })

  const bantGaps = getBANTGaps(selectedPursuit)
  const openRisks = risks.filter(r => r.status === 'open')

  return (
    <div>
      <div className="mb-6">
        <h2
          className="text-lg font-semibold mb-1"
          style={{ color: 'var(--scout-saddle)', fontFamily: "'Bitter', Georgia, serif" }}
        >
          30/60/90 Day Plan
        </h2>
        <p className="text-sm" style={{ color: 'var(--scout-earth-light)' }}>
          Build your execution plan to close BANT gaps and advance deals.
        </p>
      </div>

      {/* BANT Gaps Summary */}
      {bantGaps.length > 0 && (
        <div
          className="mb-6 p-4 rounded-lg border"
          style={{ backgroundColor: 'rgba(210, 105, 30, 0.05)', borderColor: 'var(--scout-sunset)' }}
        >
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-semibold" style={{ color: 'var(--scout-sunset)' }}>
              BANT Gaps to Address
            </h4>
            <span className="text-xs" style={{ color: 'var(--scout-earth-light)' }}>
              {bantGaps.length} gaps across {new Set(bantGaps.map(g => g.pursuit)).size} opportunities
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {bantGaps.slice(0, 8).map((gap, i) => (
              <span
                key={`${gap.key}-${gap.pursuit}-${i}`}
                className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs"
                style={{ backgroundColor: 'rgba(210, 105, 30, 0.15)', color: 'var(--scout-sunset)' }}
              >
                <span className="font-bold">{gap.key}</span>
                <span style={{ color: 'var(--scout-earth-light)' }}>{gap.pursuit}</span>
              </span>
            ))}
            {bantGaps.length > 8 && (
              <span className="text-xs" style={{ color: 'var(--scout-earth-light)' }}>
                +{bantGaps.length - 8} more
              </span>
            )}
          </div>
        </div>
      )}

      {/* View Toggle & Pursuit Filter */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex gap-2">
          <button
            onClick={() => setView('plan')}
            className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            style={{
              backgroundColor: view === 'plan' ? 'var(--scout-saddle)' : 'white',
              color: view === 'plan' ? 'white' : 'var(--scout-earth)',
              border: `1px solid ${view === 'plan' ? 'var(--scout-saddle)' : 'var(--scout-border)'}`,
            }}
          >
            Plan ({actionItems.length})
          </button>
          <button
            onClick={() => setView('risks')}
            className="px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
            style={{
              backgroundColor: view === 'risks' ? 'var(--scout-saddle)' : 'white',
              color: view === 'risks' ? 'white' : 'var(--scout-earth)',
              border: `1px solid ${view === 'risks' ? 'var(--scout-saddle)' : 'var(--scout-border)'}`,
            }}
          >
            Risks
            {openRisks.length > 0 && (
              <span
                className="px-1.5 py-0.5 rounded-full text-xs font-semibold"
                style={{
                  backgroundColor: view === 'risks' ? 'white' : 'var(--scout-clay)',
                  color: view === 'risks' ? 'var(--scout-clay)' : 'white',
                }}
              >
                {openRisks.length}
              </span>
            )}
          </button>
        </div>

        {view === 'plan' && pursuits.length > 1 && (
          <select
            value={selectedPursuit}
            onChange={(e) => setSelectedPursuit(e.target.value)}
            className="text-sm border rounded-lg px-3 py-2"
            style={{ borderColor: 'var(--scout-border)', color: 'var(--scout-earth)' }}
          >
            <option value="all">All Opportunities</option>
            {pursuits.map(p => (
              <option key={p.pursuit_id} value={p.pursuit_id}>{p.name}</option>
            ))}
          </select>
        )}
      </div>

      {view === 'plan' ? (
        <>
          {/* Milestone Columns */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {(['day_30', 'day_60', 'day_90'] as MilestonePeriod[]).map(period => (
              <div
                key={period}
                className="p-4 rounded-lg border"
                style={{ backgroundColor: 'var(--scout-parchment)', borderColor: 'var(--scout-border)' }}
              >
                <h4 className="font-semibold mb-3" style={{ color: 'var(--scout-earth)' }}>
                  {period === 'day_30' ? 'Day 30' : period === 'day_60' ? 'Day 60' : 'Day 90'}
                </h4>

                <div className="space-y-2 mb-4">
                  {milestones[period].map(m => (
                    <div
                      key={m.id}
                      className="flex items-start gap-2 p-2 rounded bg-white dark:bg-zinc-900 border"
                      style={{ borderColor: 'var(--scout-border)' }}
                    >
                      <input
                        type="checkbox"
                        checked={m.completed}
                        onChange={() => toggleMilestone(period, m.id)}
                        className="mt-1"
                      />
                      <span
                        className={`flex-1 text-sm ${m.completed ? 'line-through' : ''}`}
                        style={{ color: m.completed ? 'var(--scout-earth-light)' : 'var(--scout-earth)' }}
                      >
                        {m.text}
                      </span>
                      <button
                        onClick={() => removeMilestone(period, m.id)}
                        className="text-xs hover:underline"
                        style={{ color: 'var(--scout-clay)' }}
                      >
                        ✕
                      </button>
                    </div>
                  ))}

                  {milestones[period].length === 0 && (
                    <p className="text-sm text-center py-4" style={{ color: 'var(--scout-earth-light)' }}>
                      No milestones yet
                    </p>
                  )}
                </div>

                {/* Add milestone to this period */}
                {newMilestone.period === period ? (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newMilestone.text}
                      onChange={(e) => setNewMilestone({ ...newMilestone, text: e.target.value })}
                      onKeyDown={(e) => e.key === 'Enter' && addMilestone(period)}
                      placeholder="Add milestone..."
                      className="flex-1 border rounded px-2 py-1 text-sm"
                      style={{ borderColor: 'var(--scout-border)' }}
                      autoFocus
                    />
                    <button
                      onClick={() => addMilestone(period)}
                      disabled={!newMilestone.text.trim()}
                      className="px-3 py-1 text-white text-sm rounded disabled:opacity-50"
                      style={{ backgroundColor: 'var(--scout-trail)' }}
                    >
                      Add
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setNewMilestone({ period, text: '' })}
                    className="w-full py-2 border border-dashed rounded text-sm"
                    style={{ borderColor: 'var(--scout-border)', color: 'var(--scout-earth-light)' }}
                  >
                    + Add Milestone
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Actions Section */}
          <div className="mt-8 pt-6 border-t" style={{ borderColor: 'var(--scout-border)' }}>
            <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--scout-earth)' }}>
              Actions
            </h3>
          </div>

          <div>
          {/* AI Generate Actions Button */}
          <button
            onClick={generateActions}
            disabled={isGeneratingActions}
            className="w-full mb-6 py-3 rounded-lg font-medium transition-all flex items-center justify-center gap-3 text-white disabled:opacity-60"
            style={{
              background: isGeneratingActions
                ? 'var(--scout-earth-light)'
                : 'linear-gradient(135deg, var(--scout-saddle) 0%, var(--scout-sunset) 100%)',
              boxShadow: isGeneratingActions ? 'none' : '0 4px 14px rgba(139, 69, 19, 0.3)',
            }}
          >
            {isGeneratingActions ? (
              <>
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span>Scout AI generating actions...</span>
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

          {actionItems.length === 0 && !showAddAction ? (
            <div
              className="p-8 rounded-lg border border-dashed text-center"
              style={{ borderColor: 'var(--scout-border)' }}
            >
              <p className="text-sm mb-4" style={{ color: 'var(--scout-earth-light)' }}>
                No actions defined yet. Use Scout AI above or add manually.
              </p>
              <button
                onClick={() => setShowAddAction(true)}
                className="px-4 py-2 rounded-lg text-sm font-medium border transition-colors"
                style={{ borderColor: 'var(--scout-saddle)', color: 'var(--scout-saddle)' }}
              >
                + Add Action Manually
              </button>
            </div>
          ) : (
            <>
              {/* Actions List */}
              <div className="space-y-4 mb-4">
                {Object.entries(actionsByWeek).sort(([a], [b]) => parseInt(a) - parseInt(b)).map(([week, actions]) => (
                  <div key={week}>
                    <h4 className="text-sm font-medium mb-2" style={{ color: 'var(--scout-earth)' }}>
                      Week {week}
                    </h4>
                    <div className="space-y-2">
                      {actions.map(action => {
                        const pursuit = pursuits.find(p => p.pursuit_id === action.pursuit_id)
                        return (
                          <div
                            key={action.action_id}
                            className="p-3 rounded-lg border bg-white dark:bg-zinc-900"
                            style={{ borderColor: 'var(--scout-border)' }}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <span style={{ color: 'var(--scout-earth)' }}>{action.title}</span>
                                {pursuit && (
                                  <span className="ml-2 text-xs" style={{ color: 'var(--scout-earth-light)' }}>
                                    ({pursuit.name})
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                <span
                                  className="text-xs px-2 py-0.5 rounded-full"
                                  style={{
                                    backgroundColor: action.priority === 'High'
                                      ? 'rgba(169, 68, 66, 0.15)'
                                      : action.priority === 'Medium'
                                      ? 'rgba(210, 105, 30, 0.15)'
                                      : 'rgba(93, 122, 93, 0.15)',
                                    color: action.priority === 'High'
                                      ? 'var(--scout-clay)'
                                      : action.priority === 'Medium'
                                      ? 'var(--scout-sunset)'
                                      : 'var(--scout-trail)',
                                  }}
                                >
                                  {action.priority || 'Medium'}
                                </span>
                                {action.due_date && (
                                  <span className="text-xs" style={{ color: 'var(--scout-earth-light)' }}>
                                    {new Date(action.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                  </span>
                                )}
                                <button
                                  onClick={() => deleteAction(action.action_id)}
                                  className="p-1 hover:bg-red-50 rounded"
                                  title="Delete action"
                                >
                                  <svg className="w-3.5 h-3.5" style={{ color: 'var(--scout-clay)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                  </svg>
                                </button>
                              </div>
                            </div>
                            {action.description && (
                              <p className="text-sm mt-1" style={{ color: 'var(--scout-earth-light)' }}>
                                {action.description}
                              </p>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>

              {/* Add Action Form */}
              {showAddAction ? (
                <div
                  className="p-4 rounded-lg border mb-4"
                  style={{ backgroundColor: 'var(--scout-parchment)', borderColor: 'var(--scout-border)' }}
                >
                  <h4 className="text-sm font-medium mb-3" style={{ color: 'var(--scout-earth)' }}>
                    Add New Action
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                    <input
                      type="text"
                      value={newAction.title}
                      onChange={(e) => setNewAction({ ...newAction, title: e.target.value })}
                      placeholder="Action title"
                      className="border rounded-lg px-3 py-2 text-sm col-span-2"
                      style={{ borderColor: 'var(--scout-border)' }}
                    />
                    <select
                      value={newAction.priority}
                      onChange={(e) => setNewAction({ ...newAction, priority: e.target.value })}
                      className="border rounded-lg px-3 py-2 text-sm"
                      style={{ borderColor: 'var(--scout-border)' }}
                    >
                      <option value="High">High Priority</option>
                      <option value="Medium">Medium Priority</option>
                      <option value="Low">Low Priority</option>
                    </select>
                    <input
                      type="date"
                      value={newAction.due_date}
                      onChange={(e) => setNewAction({ ...newAction, due_date: e.target.value })}
                      className="border rounded-lg px-3 py-2 text-sm"
                      style={{ borderColor: 'var(--scout-border)' }}
                    />
                    <select
                      value={newAction.pursuit_id}
                      onChange={(e) => setNewAction({ ...newAction, pursuit_id: e.target.value })}
                      className="border rounded-lg px-3 py-2 text-sm col-span-2"
                      style={{ borderColor: 'var(--scout-border)' }}
                    >
                      <option value="">Account-level (no specific opportunity)</option>
                      {pursuits.map(p => (
                        <option key={p.pursuit_id} value={p.pursuit_id}>{p.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={addAction}
                      disabled={!newAction.title.trim()}
                      className="px-4 py-2 text-white text-sm rounded-lg font-medium disabled:opacity-50"
                      style={{ backgroundColor: 'var(--scout-trail)' }}
                    >
                      Add Action
                    </button>
                    <button
                      onClick={() => setShowAddAction(false)}
                      className="px-4 py-2 text-sm"
                      style={{ color: 'var(--scout-earth-light)' }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setShowAddAction(true)}
                  className="w-full py-3 border border-dashed rounded-lg text-sm transition-colors"
                  style={{ borderColor: 'var(--scout-border)', color: 'var(--scout-earth-light)' }}
                >
                  + Add Another Action
                </button>
              )}
            </>
          )}
          </div>
        </>
      ) : (
        /* Risks View */
        <div>
          <div className="mb-4">
            <p className="text-sm" style={{ color: 'var(--scout-earth-light)' }}>
              Track risks that could impact deal health or delay close.
            </p>
          </div>

          {/* Open Risks */}
          {risks.filter(r => r.status === 'open').length > 0 && (
            <div className="space-y-3 mb-6">
              {risks.filter(r => r.status === 'open').map(risk => {
                const pursuit = pursuits.find(p => p.pursuit_id === risk.pursuit_id)
                return (
                  <div
                    key={risk.risk_id}
                    className="p-4 rounded-lg border"
                    style={{
                      backgroundColor: risk.severity === 'critical' || risk.severity === 'high'
                        ? 'rgba(169, 68, 66, 0.05)'
                        : 'white',
                      borderColor: risk.severity === 'critical' ? 'var(--scout-clay)'
                        : risk.severity === 'high' ? 'rgba(169, 68, 66, 0.5)'
                        : 'var(--scout-border)',
                    }}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span
                            className="text-xs px-2 py-0.5 rounded-full font-medium"
                            style={{
                              backgroundColor: risk.severity === 'critical' ? 'var(--scout-clay)'
                                : risk.severity === 'high' ? 'rgba(169, 68, 66, 0.15)'
                                : risk.severity === 'medium' ? 'rgba(210, 105, 30, 0.15)'
                                : 'rgba(93, 122, 93, 0.15)',
                              color: risk.severity === 'critical' ? 'white'
                                : risk.severity === 'high' ? 'var(--scout-clay)'
                                : risk.severity === 'medium' ? 'var(--scout-sunset)'
                                : 'var(--scout-trail)',
                            }}
                          >
                            {risk.severity.charAt(0).toUpperCase() + risk.severity.slice(1)}
                          </span>
                          {risk.impact_on_bant && (
                            <span
                              className="text-xs px-1.5 py-0.5 rounded font-bold"
                              style={{ backgroundColor: 'rgba(210, 105, 30, 0.15)', color: 'var(--scout-sunset)' }}
                            >
                              {risk.impact_on_bant}
                            </span>
                          )}
                          {pursuit && (
                            <span className="text-xs" style={{ color: 'var(--scout-earth-light)' }}>
                              {pursuit.name}
                            </span>
                          )}
                        </div>
                        <p className="text-sm" style={{ color: 'var(--scout-earth)' }}>
                          {risk.description}
                        </p>
                      </div>
                      <button
                        onClick={() => deleteRisk(risk.risk_id)}
                        className="p-1 hover:bg-red-50 rounded ml-2"
                        title="Delete risk"
                      >
                        <svg className="w-4 h-4" style={{ color: 'var(--scout-clay)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {risks.filter(r => r.status === 'open').length === 0 && !showAddRisk && (
            <div
              className="p-8 rounded-lg border border-dashed text-center mb-6"
              style={{ borderColor: 'var(--scout-border)' }}
            >
              <p className="text-sm mb-2" style={{ color: 'var(--scout-earth-light)' }}>
                No risks identified yet
              </p>
              <p className="text-xs" style={{ color: 'var(--scout-earth-light)' }}>
                Add risks that could impact your deals (budget freezes, competitor activity, org changes, etc.)
              </p>
            </div>
          )}

          {/* Add Risk Form */}
          {showAddRisk ? (
            <div
              className="p-4 rounded-lg border mb-4"
              style={{ backgroundColor: 'var(--scout-parchment)', borderColor: 'var(--scout-border)' }}
            >
              <h4 className="text-sm font-medium mb-3" style={{ color: 'var(--scout-earth)' }}>
                Add Risk
              </h4>
              <div className="space-y-3">
                <textarea
                  value={newRisk.description}
                  onChange={(e) => setNewRisk({ ...newRisk, description: e.target.value })}
                  placeholder="Describe the risk..."
                  rows={2}
                  className="w-full border rounded-lg px-3 py-2 text-sm resize-none"
                  style={{ borderColor: 'var(--scout-border)' }}
                />
                <div className="grid grid-cols-3 gap-3">
                  <select
                    value={newRisk.severity}
                    onChange={(e) => setNewRisk({ ...newRisk, severity: e.target.value as 'low' | 'medium' | 'high' | 'critical' })}
                    className="border rounded-lg px-3 py-2 text-sm"
                    style={{ borderColor: 'var(--scout-border)' }}
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                  <select
                    value={newRisk.pursuit_id}
                    onChange={(e) => setNewRisk({ ...newRisk, pursuit_id: e.target.value })}
                    className="border rounded-lg px-3 py-2 text-sm"
                    style={{ borderColor: 'var(--scout-border)' }}
                  >
                    <option value="">Account-level</option>
                    {pursuits.map(p => (
                      <option key={p.pursuit_id} value={p.pursuit_id}>{p.name}</option>
                    ))}
                  </select>
                  <select
                    value={newRisk.impact_on_bant}
                    onChange={(e) => setNewRisk({ ...newRisk, impact_on_bant: e.target.value as '' | 'B' | 'A' | 'N' | 'T' })}
                    className="border rounded-lg px-3 py-2 text-sm"
                    style={{ borderColor: 'var(--scout-border)' }}
                  >
                    <option value="">BANT Impact (optional)</option>
                    <option value="B">Budget</option>
                    <option value="A">Authority</option>
                    <option value="N">Need</option>
                    <option value="T">Timeline</option>
                  </select>
                  <div className="flex items-center gap-2">
                    <label className="text-xs" style={{ color: 'var(--scout-earth-light)' }}>
                      Target Date:
                    </label>
                    <input
                      type="date"
                      value={newRisk.target_date}
                      onChange={(e) => setNewRisk({ ...newRisk, target_date: e.target.value })}
                      className="border rounded-lg px-3 py-2 text-sm"
                      style={{ borderColor: 'var(--scout-border)' }}
                    />
                  </div>
                </div>
              </div>
              <div className="mt-3 flex gap-2">
                <button
                  onClick={addRisk}
                  disabled={!newRisk.description.trim()}
                  className="px-4 py-2 text-white text-sm rounded-lg font-medium disabled:opacity-50"
                  style={{ backgroundColor: 'var(--scout-trail)' }}
                >
                  Add Risk
                </button>
                <button
                  onClick={() => setShowAddRisk(false)}
                  className="px-4 py-2 text-sm"
                  style={{ color: 'var(--scout-earth-light)' }}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowAddRisk(true)}
              className="w-full py-3 border border-dashed rounded-lg text-sm transition-colors"
              style={{ borderColor: 'var(--scout-border)', color: 'var(--scout-earth-light)' }}
            >
              + Add Risk
            </button>
          )}
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
          Continue to Review →
        </button>
      </div>
    </div>
  )
}
