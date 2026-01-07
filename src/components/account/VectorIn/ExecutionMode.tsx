'use client'

import { useState } from 'react'
import { DataAnnotation } from '@/components/prototype/DataAnnotation'

interface Pattern {
  pattern_id: string
  title: string
  pattern_type: string
  severity: string
  related_issues: string[]
  description: string
}

interface Issue {
  issue_id: string
  external_id: string
  source: string
  title: string
  priority: string
  status: string
  created_days_ago: number
  reporter: string
  pattern_id: string | null
}

interface IssueSignal {
  signal_id: string
  title: string
  type: string
  severity: string
}

interface Contact {
  stakeholder_id: string
  name: string
  title: string
  type: string
}

interface ResolutionItem {
  action_id: string
  title: string
  due_date: string
  status: string
  priority: string
  timeframe: string
}

interface VectorInExecutionModeProps {
  patterns: Pattern[]
  issues: Issue[]
  issueSignals: IssueSignal[]
  contacts: Contact[]
  resolutionItems: ResolutionItem[]
}

export function VectorInExecutionMode({
  patterns,
  issues,
  issueSignals,
  contacts,
  resolutionItems,
}: VectorInExecutionModeProps) {
  const [expandedTimeframes, setExpandedTimeframes] = useState<Record<string, boolean>>({
    this_week: true,
    next_week: false,
    this_month: false,
    backlog: false,
  })

  const toggleTimeframe = (timeframe: string) => {
    setExpandedTimeframes((prev) => ({ ...prev, [timeframe]: !prev[timeframe] }))
  }

  const thisWeek = resolutionItems.filter((r) => r.timeframe === 'this_week')
  const nextWeek = resolutionItems.filter((r) => r.timeframe === 'next_week')
  const thisMonth = resolutionItems.filter((r) => r.timeframe === 'this_month')

  const p1Issues = issues.filter((i) => i.priority === 'P1')
  const p2Issues = issues.filter((i) => i.priority === 'P2')
  const p3Issues = issues.filter((i) => i.priority === 'P3')

  const admins = contacts.filter((c) => c.type === 'admin')
  const users = contacts.filter((c) => c.type === 'user')

  const getPatternSeverityStyle = (severity: string) => {
    switch (severity) {
      case 'high':
        return { icon: '🔴', color: 'var(--scout-clay)' }
      case 'medium':
        return { icon: '🟡', color: 'var(--scout-sunset)' }
      case 'low':
        return { icon: '🟢', color: 'var(--scout-trail)' }
      default:
        return { icon: '⚪', color: 'var(--scout-earth-light)' }
    }
  }

  const getPriorityStyle = (priority: string) => {
    switch (priority) {
      case 'P1':
        return { icon: '🔴', color: 'var(--scout-clay)' }
      case 'P2':
        return { icon: '🟡', color: 'var(--scout-sunset)' }
      case 'P3':
        return { icon: '🟢', color: 'var(--scout-trail)' }
      default:
        return { icon: '⚪', color: 'var(--scout-earth-light)' }
    }
  }

  return (
    <div className="p-6">
      <div className="grid grid-cols-3 gap-6">
        {/* Left Column - Resolution Tracker */}
        <div className="col-span-2 space-y-6">
          {/* Rescue Ops (Resolution Tracker) */}
          <div
            className="rounded-xl border p-4"
            style={{ backgroundColor: 'var(--scout-white)', borderColor: 'var(--scout-border)' }}
          >
            <div className="flex items-center justify-between mb-4">
              <h3
                className="font-semibold"
                style={{ color: 'var(--scout-saddle)', fontFamily: "'Bitter', Georgia, serif" }}
              >
                Rescue Ops
              </h3>
              <div className="flex items-center gap-2">
                <DataAnnotation
                  source="action_items (vector='in')"
                  note="Similar to 30/60/90 but for issue resolution timelines"
                />
                <button className="text-sm px-3 py-1 rounded border" style={{ borderColor: 'var(--scout-border)' }}>
                  🤖
                </button>
              </div>
            </div>

            {/* This Week */}
            <TimeframeSection
              label="This Week"
              count={thisWeek.length}
              expanded={expandedTimeframes.this_week}
              onToggle={() => toggleTimeframe('this_week')}
              items={thisWeek}
              note="Issues targeted for this week"
            />

            {/* Next Week */}
            <TimeframeSection
              label="Next Week"
              count={nextWeek.length}
              expanded={expandedTimeframes.next_week}
              onToggle={() => toggleTimeframe('next_week')}
              items={nextWeek}
            />

            {/* This Month */}
            <TimeframeSection
              label="This Month"
              count={thisMonth.length}
              expanded={expandedTimeframes.this_month}
              onToggle={() => toggleTimeframe('this_month')}
              items={thisMonth}
            />

            {/* Backlog */}
            <TimeframeSection
              label="Backlog"
              count={8}
              expanded={expandedTimeframes.backlog}
              onToggle={() => toggleTimeframe('backlog')}
              items={[]}
            />

            <div className="mt-4 pt-4 border-t" style={{ borderColor: 'var(--scout-border)' }}>
              <p className="text-xs flex items-center gap-2" style={{ color: 'var(--scout-earth-light)' }}>
                📁 Initiatives: 1 active
                <DataAnnotation note="Grouped resolution efforts" />
              </p>
            </div>
          </div>

          {/* Urgent Focus */}
          <div
            className="rounded-xl border p-4"
            style={{ backgroundColor: 'var(--scout-white)', borderColor: 'var(--scout-border)' }}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-sm" style={{ color: 'var(--scout-saddle)' }}>
                Urgent Focus
              </h3>
              <DataAnnotation note="P1 tickets + escalations" />
            </div>

            <div className="space-y-2">
              {p1Issues.slice(0, 2).map((issue) => (
                <div
                  key={issue.issue_id}
                  className="p-3 rounded-lg"
                  style={{ backgroundColor: 'rgba(169, 68, 66, 0.05)' }}
                >
                  <div className="flex items-center gap-2">
                    <span>🔴</span>
                    <span className="text-sm font-medium" style={{ color: 'var(--scout-saddle)' }}>
                      {issue.title}
                    </span>
                  </div>
                  <p className="text-xs mt-1 ml-6" style={{ color: 'var(--scout-earth-light)' }}>
                    {issue.created_days_ago} days open
                  </p>
                  <DataAnnotation note="Escalation risk: High" inline />
                </div>
              ))}
            </div>
          </div>

          {/* Customer Needs and Platform Issues Row */}
          <div className="grid grid-cols-2 gap-4">
            {/* Field Requests (Customer Needs) */}
            <div
              className="rounded-xl border p-4"
              style={{ backgroundColor: 'var(--scout-white)', borderColor: 'var(--scout-border)' }}
            >
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-sm" style={{ color: 'var(--scout-saddle)' }}>
                  Field Requests
                </h3>
                <DataAnnotation note="Requests, feature asks - expansion opportunities" />
              </div>

              <div className="space-y-1 text-xs">
                <p style={{ color: 'var(--scout-sky)' }}>Requests: 4</p>
                <p style={{ color: 'var(--scout-trail)' }}>Voted: 2</p>
              </div>

              <button className="mt-3 text-xs" style={{ color: 'var(--scout-sky)' }}>
                View all →
              </button>
            </div>

            {/* Hazards (Platform Issues) */}
            <div
              className="rounded-xl border p-4"
              style={{ backgroundColor: 'var(--scout-white)', borderColor: 'var(--scout-border)' }}
            >
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-sm" style={{ color: 'var(--scout-saddle)' }}>
                  Hazards
                </h3>
                <DataAnnotation note="Bugs, broken functionality - technical dangers" />
              </div>

              <div className="space-y-1 text-xs">
                <p style={{ color: 'var(--scout-earth)' }}>Open: 3</p>
                <p style={{ color: 'var(--scout-clay)' }}>Critical: 1</p>
              </div>

              <button className="mt-3 text-xs" style={{ color: 'var(--scout-sky)' }}>
                View all →
              </button>
            </div>
          </div>
        </div>

        {/* Right Column - Threat Watch */}
        <div className="space-y-6">
          {/* Threat Watch (Issue Overview) */}
          <div
            className="rounded-xl border p-4"
            style={{ backgroundColor: 'var(--scout-white)', borderColor: 'var(--scout-border)' }}
          >
            <h3
              className="font-semibold mb-4"
              style={{ color: 'var(--scout-saddle)', fontFamily: "'Bitter', Georgia, serif" }}
            >
              Threat Watch
            </h3>

            {/* Patterns Section */}
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--scout-earth-light)' }}>
                  Threats
                </span>
                <DataAnnotation source="patterns table" purpose="Recurring dangers to address" />
              </div>

              {patterns.map((pattern) => {
                const style = getPatternSeverityStyle(pattern.severity)
                return (
                  <div
                    key={pattern.pattern_id}
                    className="p-3 rounded-lg mb-2 cursor-pointer transition-colors hover:bg-gray-50"
                    style={{ backgroundColor: 'var(--scout-parchment)' }}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <span>{style.icon}</span>
                        <span className="text-sm font-medium" style={{ color: 'var(--scout-saddle)' }}>
                          {pattern.title}
                        </span>
                      </div>
                      <span className="text-xs capitalize" style={{ color: style.color }}>
                        {pattern.severity}
                      </span>
                    </div>
                    <p className="text-xs mt-1 ml-6" style={{ color: 'var(--scout-earth-light)' }}>
                      {pattern.related_issues.length} tickets · {pattern.pattern_type}
                    </p>
                    <DataAnnotation note={`pattern_type: '${pattern.pattern_type}'`} inline />
                  </div>
                )
              })}

              <button
                className="w-full py-2 text-sm rounded-lg border mt-2"
                style={{ borderColor: 'var(--scout-border)', color: 'var(--scout-saddle)' }}
              >
                🤖 Analyze Patterns
              </button>
            </div>

            {/* Tickets Section */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--scout-earth-light)' }}>
                  Tickets
                </span>
                <DataAnnotation source="account_issues table" />
              </div>

              <div className="p-3 rounded-lg" style={{ backgroundColor: 'var(--scout-parchment)' }}>
                <div className="flex items-center gap-3 text-xs mb-2">
                  <span style={{ color: 'var(--scout-clay)' }}>P1: {p1Issues.length}</span>
                  <span>│</span>
                  <span style={{ color: 'var(--scout-sunset)' }}>P2: {p2Issues.length}</span>
                  <span>│</span>
                  <span style={{ color: 'var(--scout-earth-light)' }}>P3: {p3Issues.length}</span>
                </div>
                <p className="text-xs" style={{ color: 'var(--scout-earth-light)' }}>
                  Oldest: {Math.max(...issues.map((i) => i.created_days_ago))} days
                </p>
              </div>

              <button className="mt-3 text-xs" style={{ color: 'var(--scout-sky)' }}>
                View all →
              </button>
            </div>
          </div>

          {/* Distress Signals */}
          <div
            className="rounded-xl border p-4"
            style={{ backgroundColor: 'var(--scout-white)', borderColor: 'var(--scout-border)' }}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-sm" style={{ color: 'var(--scout-saddle)' }}>
                Distress Signals
              </h3>
              <div className="flex items-center gap-2">
                <DataAnnotation source="Derived from issue analysis" />
                <button className="text-sm">🔄</button>
              </div>
            </div>

            <div className="space-y-2">
              {issueSignals.map((signal) => (
                <div
                  key={signal.signal_id}
                  className="p-2 rounded text-xs"
                  style={{ backgroundColor: 'var(--scout-parchment)' }}
                >
                  <div className="flex items-center gap-2">
                    <span>
                      {signal.type === 'risk' && '⚠️'}
                      {signal.type === 'sentiment' && '📉'}
                      {signal.type === 'pattern' && '🔄'}
                    </span>
                    <span style={{ color: 'var(--scout-saddle)' }}>{signal.title}</span>
                  </div>
                  <DataAnnotation note={signal.type === 'risk' ? 'P1 > 3 days' : 'Language analysis'} inline />
                </div>
              ))}
            </div>

            <button className="mt-3 text-xs" style={{ color: 'var(--scout-sky)' }}>
              View all →
            </button>
          </div>

          {/* Compass (Contacts) */}
          <div
            className="rounded-xl border p-4"
            style={{ backgroundColor: 'var(--scout-white)', borderColor: 'var(--scout-border)' }}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-sm" style={{ color: 'var(--scout-saddle)' }}>
                Compass ({contacts.length})
              </h3>
              <div className="flex items-center gap-2">
                <DataAnnotation source="stakeholders table" note="Filter: technical contacts, admins" />
                <button className="text-sm">🤖</button>
              </div>
            </div>

            <p className="text-xs" style={{ color: 'var(--scout-earth-light)' }}>
              Admins: {admins.length} │ Users: {users.length}
            </p>

            <button className="mt-3 text-xs" style={{ color: 'var(--scout-sky)' }}>
              View all →
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function TimeframeSection({
  label,
  count,
  expanded,
  onToggle,
  items,
  note,
}: {
  label: string
  count: number
  expanded: boolean
  onToggle: () => void
  items: ResolutionItem[]
  note?: string
}) {
  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'P1':
        return '🔴'
      case 'P2':
        return '🟡'
      default:
        return '🟢'
    }
  }

  return (
    <div className="mb-2">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-2 rounded hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-xs">{expanded ? '▼' : '▶'}</span>
          <span className="font-medium text-sm" style={{ color: 'var(--scout-saddle)' }}>
            {label}
          </span>
        </div>
        <span
          className="text-xs px-2 py-0.5 rounded-full"
          style={{ backgroundColor: 'var(--scout-parchment)', color: 'var(--scout-earth)' }}
        >
          {count}
        </span>
      </button>

      {expanded && items.length > 0 && (
        <div className="ml-6 mt-2 space-y-2">
          {note && <DataAnnotation note={note} inline />}
          {items.map((item) => (
            <div
              key={item.action_id}
              className="flex items-center justify-between p-2 rounded"
              style={{ backgroundColor: 'var(--scout-parchment)' }}
            >
              <div className="flex items-center gap-2">
                <span>{getPriorityIcon(item.priority)}</span>
                <span className="text-sm" style={{ color: 'var(--scout-saddle)' }}>
                  {item.title}
                </span>
              </div>
              <span className="text-xs" style={{ color: 'var(--scout-earth-light)' }}>
                {item.priority}
              </span>
            </div>
          ))}
          {items.length > 0 && (
            <DataAnnotation source="action_items (vector='in')" inline />
          )}
        </div>
      )}
    </div>
  )
}
