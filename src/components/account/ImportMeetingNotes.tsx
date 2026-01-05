'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface ParsedEngagement {
  date: string
  title: string
  attendees_internal: string[]
  attendees_external: string[]
  summary: string
  duration?: string
  selected?: boolean
}

interface ParsedStakeholder {
  name: string
  title?: string
  company: string
  context?: string
  selected?: boolean
}

interface ParsedAction {
  title: string
  owner?: string
  due_date?: string
  context?: string
  selected?: boolean
}

interface ParsedRisk {
  description: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  context?: string
  selected?: boolean
}

interface ParsedPainPoint {
  description: string
  stakeholder?: string
  context?: string
  selected?: boolean
}

interface ParsedKeyTakeaway {
  text: string
  meeting_date?: string
  selected?: boolean
}

interface ParseResult {
  engagements: ParsedEngagement[]
  stakeholders: ParsedStakeholder[]
  actions: ParsedAction[]
  risks: ParsedRisk[]
  pain_points: ParsedPainPoint[]
  key_takeaways: ParsedKeyTakeaway[]
}

interface Props {
  accountId: string
  accountName: string
  existingStakeholders: string[]
  onClose: () => void
  onImportComplete: () => void
}

export function ImportMeetingNotes({ accountId, accountName, existingStakeholders, onClose, onImportComplete }: Props) {
  const router = useRouter()
  const [step, setStep] = useState<'input' | 'parsing' | 'review' | 'importing' | 'complete'>('input')
  const [content, setContent] = useState('')
  const [error, setError] = useState('')
  const [parsed, setParsed] = useState<ParseResult | null>(null)
  const [importStats, setImportStats] = useState({ engagements: 0, stakeholders: 0, actions: 0, risks: 0, painPoints: 0 })

  const handleParse = async () => {
    if (!content.trim()) {
      setError('Please paste meeting notes content')
      return
    }

    setStep('parsing')
    setError('')

    try {
      const response = await fetch('/api/ai/parse-notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content,
          account_name: accountName,
          existing_stakeholders: existingStakeholders,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to parse notes')
      }

      const data = await response.json()

      // Mark all items as selected by default, with safe defaults for arrays
      const withSelections: ParseResult = {
        engagements: data.engagements?.map((e: ParsedEngagement) => ({
          ...e,
          attendees_internal: e.attendees_internal || [],
          attendees_external: e.attendees_external || [],
          selected: true
        })) || [],
        stakeholders: data.stakeholders?.map((s: ParsedStakeholder) => ({ ...s, selected: true })) || [],
        actions: data.actions?.map((a: ParsedAction) => ({ ...a, selected: true })) || [],
        risks: data.risks?.map((r: ParsedRisk) => ({ ...r, selected: true })) || [],
        pain_points: data.pain_points?.map((p: ParsedPainPoint) => ({ ...p, selected: true })) || [],
        key_takeaways: data.key_takeaways?.map((k: ParsedKeyTakeaway) => ({ ...k, selected: false })) || [], // Key takeaways not auto-imported
      }

      setParsed(withSelections)
      setStep('review')
    } catch (err) {
      setError('Failed to parse meeting notes. Please try again.')
      setStep('input')
    }
  }

  const toggleItem = (category: keyof ParseResult, index: number) => {
    if (!parsed) return
    const updated = { ...parsed }
    const item = updated[category][index] as { selected?: boolean }
    item.selected = !item.selected
    setParsed(updated)
  }

  const handleImport = async () => {
    if (!parsed) return

    setStep('importing')
    let stats = { engagements: 0, stakeholders: 0, actions: 0, risks: 0, painPoints: 0 }

    try {
      // Import engagements
      for (const eng of parsed.engagements.filter(e => e.selected)) {
        try {
          await fetch(`/api/accounts/${accountId}/engagements`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              title: eng.title,
              engagement_date: eng.date,
              engagement_type: 'meeting',
              summary: eng.summary,
              attendees_internal: eng.attendees_internal,
              attendees_external: eng.attendees_external,
            }),
          })
          stats.engagements++
        } catch (e) {
          console.error('Failed to import engagement:', e)
        }
      }

      // Import stakeholders (only those with valid names)
      for (const sh of parsed.stakeholders.filter(s => s.selected && s.name?.trim())) {
        try {
          await fetch(`/api/accounts/${accountId}/stakeholders`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              full_name: sh.name,
              title: sh.title || '',
              company: sh.company,
            }),
          })
          stats.stakeholders++
        } catch (e) {
          console.error('Failed to import stakeholder:', e)
        }
      }

      // Import actions - already reviewed in wizard, go directly to plan
      for (const action of parsed.actions.filter(a => a.selected)) {
        try {
          const res = await fetch(`/api/accounts/${accountId}/actions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              title: action.title,
              due_date: action.due_date || null,
              priority: 'medium',
              status: 'Not Started',
              import_source: 'meeting_notes',
            }),
          })
          if (res.ok) {
            stats.actions++
          } else {
            console.error('Failed to import action:', await res.text())
          }
        } catch (e) {
          console.error('Failed to import action:', e)
        }
      }

      // Import risks - already reviewed in wizard, go directly to plan
      // Note: risks table uses 'low', 'medium', 'high', 'critical'
      for (const risk of parsed.risks.filter(r => r.selected)) {
        try {
          const res = await fetch(`/api/accounts/${accountId}/risks`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              description: risk.description,
              severity: risk.severity,
              status: 'open',
              import_source: 'meeting_notes',
            }),
          })
          if (res.ok) {
            stats.risks++
          } else {
            console.error('Failed to import risk:', await res.text())
          }
        } catch (e) {
          console.error('Failed to import risk:', e)
        }
      }

      // Import pain points - already reviewed in wizard, go directly to plan
      // Note: pain_points table uses 'critical', 'significant', 'moderate', 'minor' (not 'medium')
      for (const pp of parsed.pain_points.filter(p => p.selected)) {
        try {
          const res = await fetch(`/api/accounts/${accountId}/pain-points`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              description: pp.description,
              source: pp.stakeholder || 'Meeting notes',
              severity: 'moderate',
              import_source: 'meeting_notes',
            }),
          })
          if (res.ok) {
            stats.painPoints++
          } else {
            console.error('Failed to import pain point:', await res.text())
          }
        } catch (e) {
          console.error('Failed to import pain point:', e)
        }
      }

      setImportStats(stats)
      setStep('complete')
    } catch (err) {
      setError('Failed to import some items')
      setStep('review')
    }
  }

  const selectedCounts = parsed ? {
    engagements: parsed.engagements.filter(e => e.selected).length,
    stakeholders: parsed.stakeholders.filter(s => s.selected).length,
    actions: parsed.actions.filter(a => a.selected).length,
    risks: parsed.risks.filter(r => r.selected).length,
    painPoints: parsed.pain_points.filter(p => p.selected).length,
  } : { engagements: 0, stakeholders: 0, actions: 0, risks: 0, painPoints: 0 }

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-zinc-900 rounded-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b flex items-center justify-between" style={{ borderColor: 'var(--scout-border)' }}>
          <div>
            <h2
              className="text-lg font-semibold"
              style={{ color: 'var(--scout-saddle)', fontFamily: "'Bitter', Georgia, serif" }}
            >
              Import Meeting Notes
            </h2>
            <p className="text-sm" style={{ color: 'var(--scout-earth-light)' }}>
              {accountName}
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <svg className="w-5 h-5" style={{ color: 'var(--scout-earth-light)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* Step: Input */}
          {step === 'input' && (
            <div className="space-y-4">
              <p className="text-sm" style={{ color: 'var(--scout-earth)' }}>
                Paste your meeting notes, call transcripts, or Word document content below.
                Scout AI will extract engagements, stakeholders, action items, risks, and pain points.
              </p>

              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Paste meeting notes here..."
                rows={20}
                className="w-full border rounded-lg px-4 py-3 text-sm resize-none font-mono"
                style={{ borderColor: 'var(--scout-border)' }}
              />

              {error && (
                <p className="text-sm" style={{ color: 'var(--scout-clay)' }}>{error}</p>
              )}
            </div>
          )}

          {/* Step: Parsing */}
          {step === 'parsing' && (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="w-12 h-12 border-4 border-t-transparent rounded-full animate-spin mb-4" style={{ borderColor: 'var(--scout-trail)', borderTopColor: 'transparent' }} />
              <p className="text-sm font-medium" style={{ color: 'var(--scout-earth)' }}>
                Analyzing meeting notes with Scout AI...
              </p>
              <p className="text-xs mt-1" style={{ color: 'var(--scout-earth-light)' }}>
                This may take a moment for longer documents
              </p>
            </div>
          )}

          {/* Step: Review */}
          {step === 'review' && parsed && (
            <div className="space-y-6">
              <p className="text-sm" style={{ color: 'var(--scout-earth)' }}>
                Review the extracted data below. Uncheck any items you don't want to import.
              </p>

              {/* Engagements */}
              {parsed.engagements.length > 0 && (
                <Section
                  title="Engagements"
                  count={parsed.engagements.length}
                  selectedCount={selectedCounts.engagements}
                >
                  {parsed.engagements.map((eng, i) => (
                    <ItemCard
                      key={i}
                      selected={eng.selected}
                      onToggle={() => toggleItem('engagements', i)}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium text-sm" style={{ color: 'var(--scout-earth)' }}>{eng.title}</p>
                          <p className="text-xs mt-1" style={{ color: 'var(--scout-earth-light)' }}>
                            {eng.date} {eng.duration && `· ${eng.duration}`}
                          </p>
                        </div>
                      </div>
                      <p className="text-xs mt-2" style={{ color: 'var(--scout-earth-light)' }}>{eng.summary}</p>
                      {eng.attendees_external && eng.attendees_external.length > 0 && (
                        <p className="text-xs mt-1" style={{ color: 'var(--scout-sky)' }}>
                          Attendees: {eng.attendees_external.join(', ')}
                        </p>
                      )}
                    </ItemCard>
                  ))}
                </Section>
              )}

              {/* Stakeholders */}
              {parsed.stakeholders.length > 0 && (
                <Section
                  title="New Stakeholders"
                  count={parsed.stakeholders.length}
                  selectedCount={selectedCounts.stakeholders}
                >
                  {parsed.stakeholders.map((sh, i) => (
                    <ItemCard
                      key={i}
                      selected={sh.selected}
                      onToggle={() => toggleItem('stakeholders', i)}
                    >
                      <div className="flex items-baseline gap-2">
                        <p className="font-medium text-sm" style={{ color: 'var(--scout-earth)' }}>
                          {sh.name || '(No name)'}
                        </p>
                        {sh.company && (
                          <p className="text-xs" style={{ color: 'var(--scout-sky)' }}>
                            @ {sh.company}
                          </p>
                        )}
                      </div>
                      {sh.title && (
                        <p className="text-xs mt-0.5" style={{ color: 'var(--scout-earth-light)' }}>{sh.title}</p>
                      )}
                      {sh.context && (
                        <p className="text-xs mt-1 italic" style={{ color: 'var(--scout-earth-light)' }}>{sh.context}</p>
                      )}
                    </ItemCard>
                  ))}
                </Section>
              )}

              {/* Actions */}
              {parsed.actions.length > 0 && (
                <Section
                  title="Action Items"
                  count={parsed.actions.length}
                  selectedCount={selectedCounts.actions}
                >
                  {parsed.actions.map((action, i) => (
                    <ItemCard
                      key={i}
                      selected={action.selected}
                      onToggle={() => toggleItem('actions', i)}
                    >
                      <p className="font-medium text-sm" style={{ color: 'var(--scout-earth)' }}>{action.title}</p>
                      <div className="flex gap-3 mt-1">
                        {action.owner && (
                          <p className="text-xs" style={{ color: 'var(--scout-earth-light)' }}>Owner: {action.owner}</p>
                        )}
                        {action.due_date && (
                          <p className="text-xs" style={{ color: 'var(--scout-sunset)' }}>Due: {action.due_date}</p>
                        )}
                      </div>
                    </ItemCard>
                  ))}
                </Section>
              )}

              {/* Risks */}
              {parsed.risks.length > 0 && (
                <Section
                  title="Risks & Issues"
                  count={parsed.risks.length}
                  selectedCount={selectedCounts.risks}
                >
                  {parsed.risks.map((risk, i) => (
                    <ItemCard
                      key={i}
                      selected={risk.selected}
                      onToggle={() => toggleItem('risks', i)}
                    >
                      <div className="flex items-start gap-2">
                        <span
                          className="text-xs px-2 py-0.5 rounded-full font-medium shrink-0"
                          style={{
                            backgroundColor: risk.severity === 'critical' ? 'var(--scout-clay)'
                              : risk.severity === 'high' ? 'rgba(169, 68, 66, 0.2)'
                              : risk.severity === 'medium' ? 'rgba(210, 105, 30, 0.2)'
                              : 'rgba(93, 122, 93, 0.2)',
                            color: risk.severity === 'critical' ? 'white'
                              : risk.severity === 'high' ? 'var(--scout-clay)'
                              : risk.severity === 'medium' ? 'var(--scout-sunset)'
                              : 'var(--scout-trail)',
                          }}
                        >
                          {risk.severity}
                        </span>
                        <p className="text-sm" style={{ color: 'var(--scout-earth)' }}>{risk.description}</p>
                      </div>
                    </ItemCard>
                  ))}
                </Section>
              )}

              {/* Pain Points */}
              {parsed.pain_points.length > 0 && (
                <Section
                  title="Pain Points"
                  count={parsed.pain_points.length}
                  selectedCount={selectedCounts.painPoints}
                >
                  {parsed.pain_points.map((pp, i) => (
                    <ItemCard
                      key={i}
                      selected={pp.selected}
                      onToggle={() => toggleItem('pain_points', i)}
                    >
                      <p className="text-sm" style={{ color: 'var(--scout-earth)' }}>{pp.description}</p>
                      {pp.stakeholder && (
                        <p className="text-xs mt-1" style={{ color: 'var(--scout-earth-light)' }}>
                          From: {pp.stakeholder}
                        </p>
                      )}
                    </ItemCard>
                  ))}
                </Section>
              )}

              {/* Key Takeaways (info only) */}
              {parsed.key_takeaways.length > 0 && (
                <Section
                  title="Key Takeaways"
                  count={parsed.key_takeaways.length}
                  selectedCount={0}
                  subtitle="(for reference only, not imported)"
                >
                  {parsed.key_takeaways.map((kt, i) => (
                    <div key={i} className="p-3 rounded-lg" style={{ backgroundColor: 'var(--scout-parchment)' }}>
                      <p className="text-sm" style={{ color: 'var(--scout-earth)' }}>{kt.text}</p>
                    </div>
                  ))}
                </Section>
              )}
            </div>
          )}

          {/* Step: Importing */}
          {step === 'importing' && (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="w-12 h-12 border-4 border-t-transparent rounded-full animate-spin mb-4" style={{ borderColor: 'var(--scout-trail)', borderTopColor: 'transparent' }} />
              <p className="text-sm font-medium" style={{ color: 'var(--scout-earth)' }}>
                Importing selected items...
              </p>
            </div>
          )}

          {/* Step: Complete */}
          {step === 'complete' && (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4" style={{ backgroundColor: 'rgba(93, 122, 93, 0.15)' }}>
                <svg className="w-8 h-8" style={{ color: 'var(--scout-trail)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-lg font-semibold mb-2" style={{ color: 'var(--scout-saddle)', fontFamily: "'Bitter', Georgia, serif" }}>
                Import Complete
              </p>
              <div className="text-sm space-y-1" style={{ color: 'var(--scout-earth)' }}>
                {importStats.engagements > 0 && <p>{importStats.engagements} engagements added</p>}
                {importStats.stakeholders > 0 && <p>{importStats.stakeholders} stakeholders added</p>}
                {importStats.actions > 0 && <p>{importStats.actions} action items added</p>}
                {importStats.risks > 0 && <p>{importStats.risks} risks added</p>}
                {importStats.painPoints > 0 && <p>{importStats.painPoints} pain points added</p>}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t flex justify-between" style={{ borderColor: 'var(--scout-border)' }}>
          {step === 'input' && (
            <>
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium rounded-lg"
                style={{ color: 'var(--scout-earth)' }}
              >
                Cancel
              </button>
              <button
                onClick={handleParse}
                disabled={!content.trim()}
                className="px-4 py-2 text-sm font-medium text-white rounded-lg disabled:opacity-50 flex items-center gap-2"
                style={{ backgroundColor: 'var(--scout-trail)' }}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Analyze with Scout AI
              </button>
            </>
          )}

          {step === 'review' && (
            <>
              <button
                onClick={() => setStep('input')}
                className="px-4 py-2 text-sm font-medium rounded-lg"
                style={{ color: 'var(--scout-earth)' }}
              >
                Back
              </button>
              <div className="flex items-center gap-3">
                <span className="text-sm" style={{ color: 'var(--scout-earth-light)' }}>
                  {selectedCounts.engagements + selectedCounts.stakeholders + selectedCounts.actions + selectedCounts.risks + selectedCounts.painPoints} items selected
                </span>
                <button
                  onClick={handleImport}
                  className="px-4 py-2 text-sm font-medium text-white rounded-lg flex items-center gap-2"
                  style={{ backgroundColor: 'var(--scout-trail)' }}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                  Import Selected
                </button>
              </div>
            </>
          )}

          {step === 'complete' && (
            <div className="w-full flex justify-center">
              <button
                onClick={() => {
                  onImportComplete()
                  onClose()
                  router.refresh()
                }}
                className="px-6 py-2 text-sm font-medium text-white rounded-lg"
                style={{ backgroundColor: 'var(--scout-trail)' }}
              >
                Done
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// Helper Components

function Section({
  title,
  count,
  selectedCount,
  subtitle,
  children
}: {
  title: string
  count: number
  selectedCount: number
  subtitle?: string
  children: React.ReactNode
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <h3 className="text-sm font-semibold" style={{ color: 'var(--scout-saddle)' }}>
          {title}
        </h3>
        <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: 'var(--scout-border)', color: 'var(--scout-earth)' }}>
          {selectedCount}/{count}
        </span>
        {subtitle && (
          <span className="text-xs" style={{ color: 'var(--scout-earth-light)' }}>{subtitle}</span>
        )}
      </div>
      <div className="space-y-2">
        {children}
      </div>
    </div>
  )
}

function ItemCard({
  selected,
  onToggle,
  children
}: {
  selected?: boolean
  onToggle: () => void
  children: React.ReactNode
}) {
  return (
    <div
      className="p-3 rounded-lg border flex items-start gap-3 cursor-pointer transition-all"
      style={{
        borderColor: selected ? 'var(--scout-trail)' : 'var(--scout-border)',
        backgroundColor: selected ? 'rgba(93, 122, 93, 0.05)' : 'white',
      }}
      onClick={onToggle}
    >
      <div
        className="w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 mt-0.5"
        style={{ borderColor: selected ? 'var(--scout-trail)' : 'var(--scout-border)' }}
      >
        {selected && (
          <svg className="w-3 h-3" style={{ color: 'var(--scout-trail)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        )}
      </div>
      <div className="flex-1 min-w-0">
        {children}
      </div>
    </div>
  )
}
