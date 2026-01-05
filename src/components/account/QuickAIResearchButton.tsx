'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ScoutAIIcon } from '@/components/ui/scout-logo'

type ResearchMode = 'structure' | 'people' | 'signals'

interface DetectedPerson {
  name: string
  title?: string
  selected?: boolean
}

interface DetectedDivision {
  name: string
  type: 'division' | 'subsidiary' | 'business_unit' | 'product_line'
  selected: boolean
  parentDivisionId?: string
}

interface ResearchFinding {
  id: string
  categoryId: string
  categoryName: string
  title: string
  content: string
  confidence: 'high' | 'medium' | 'low'
  sources: string[]
  sourceUrls?: string[]
  people?: Array<{ name: string; title?: string }>
  status: 'pending' | 'accepted' | 'rejected'
  editedContent?: string
  detectedPeople?: DetectedPerson[]
  // Intelligence tagging
  is_compelling_event?: boolean
  is_buying_signal?: boolean
  is_financial?: boolean
  is_competitive?: boolean
  event_impact?: 'high' | 'medium' | 'low'
  signal_strength?: 'strong' | 'moderate' | 'weak'
}

interface Division {
  division_id: string
  name: string
  parent_division_id?: string
}

interface Stakeholder {
  stakeholder_id: string
  full_name: string
  title?: string
}

interface QuickAIResearchButtonProps {
  accountId: string
  accountName: string
  website?: string | null
  industry?: string | null
  campaignContext?: string | null
  companyContext?: string | null
  mode: ResearchMode
  divisions?: Division[]
  stakeholders?: Stakeholder[]
  // Callback when research completes
  onComplete?: () => void
}

// Mode-specific configurations
const MODE_CONFIG: Record<ResearchMode, {
  label: string
  buttonLabel: string
  searchPrompts: string[]
  categories: string[]
  description: string
}> = {
  structure: {
    label: 'Find Divisions',
    buttonLabel: 'AI',
    searchPrompts: [
      'Business units, divisions, and subsidiaries',
      'Organizational structure and business segments',
      'Company divisions and product lines',
    ],
    categories: ['company-overview'],
    description: 'Finding business units and divisions...',
  },
  people: {
    label: 'Find People',
    buttonLabel: 'AI',
    searchPrompts: [
      'Product Security leaders and team members',
      'Engineering leadership (VP/Director level)',
      'IT Security and CISO office',
      'Regulatory/Compliance team',
      'Executive leadership team',
      'Recent executive hires and promotions',
    ],
    categories: ['leadership', 'hiring', 'news'],
    description: 'Searching for key contacts and decision makers...',
  },
  signals: {
    label: 'Research Signals',
    buttonLabel: 'AI',
    searchPrompts: [
      'Regulatory changes and compliance requirements',
      'Security incidents and vulnerabilities',
      'Product launches and roadmap',
      'Strategic initiatives and announcements',
      'Competitor activity and market position',
      'Industry trends affecting this company',
    ],
    categories: ['news', 'regulatory', 'security', 'product', 'partnerships'],
    description: 'Finding compelling events, risks, and buying signals...',
  },
}

// Extract people from content
function extractPeopleFromContent(content: string): { name: string; title?: string }[] {
  const people: { name: string; title?: string }[] = []

  // Pattern for "Name, Title" or "Name - Title"
  const pattern1 = /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)(?:,\s*|\s*-\s*|\s*\()((?:CEO|CTO|CFO|CIO|CISO|COO|CMO|CPO|CSO|CRO|VP|Vice President|Director|Head|Chief|President|Senior|Executive|General Manager)[\w\s]*?)(?:\)|,|\.|\s|$)/g
  let match
  while ((match = pattern1.exec(content)) !== null) {
    const name = match[1].trim()
    const title = match[2].trim()
    if (name.split(' ').length >= 2 && name.length < 50) {
      people.push({ name, title: title || undefined })
    }
  }

  // Pattern for "Title Name"
  const pattern2 = /\b(CEO|CTO|CFO|CIO|CISO|COO|CMO|CPO|CSO|CRO)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/g
  while ((match = pattern2.exec(content)) !== null) {
    const title = match[1]
    const name = match[2].trim()
    if (name.split(' ').length >= 2 && name.length < 50 && !people.some(p => p.name === name)) {
      people.push({ name, title })
    }
  }

  return people
}

// Extract divisions/business units from content
function extractDivisionsFromContent(content: string): DetectedDivision[] {
  const divisions: DetectedDivision[] = []
  const stopWords = ['the', 'a', 'an', 'and', 'or', 'for', 'to', 'in', 'on', 'at', 'by', 'its', 'company', 'companies']

  // Patterns for business units - more comprehensive
  const patterns = [
    // "X Division" or "X Business Unit"
    /\b([A-Z][A-Za-z0-9\s&]+?)\s+(?:Division|Business\s+Unit|Segment|Group)\b/gi,
    // "division(s) include(s): X, Y, Z"
    /(?:division|segment|unit|group)s?\s+(?:include|are|include)s?[:\s]+([^.]+)/gi,
    // "operates X, Y segments"
    /operates?\s+(?:in\s+)?(?:the\s+)?([A-Z][^.]+?)(?:\s+segment|\s+business|\s+division)/gi,
    // "subsidiaries include X"
    /subsidiar(?:y|ies)(?:\s+include)?[:\s]+([^.]+)/gi,
    // "brands: X, Y, Z" or "brands include"
    /brands?(?:\s+include)?[:\s]+([^.]+)/gi,
    // "product lines: X, Y"
    /product\s+lines?[:\s]+([^.]+)/gi,
  ]

  for (const pattern of patterns) {
    let match
    const contentCopy = content // Reset pattern index
    pattern.lastIndex = 0
    while ((match = pattern.exec(contentCopy)) !== null) {
      const rawNames = match[1].split(/,\s*|\s+and\s+|\s*;\s*/).filter(n => n.trim().length > 2)
      for (const rawName of rawNames) {
        // Clean the name
        let cleanName = rawName.trim()
          .replace(/^(?:the|its)\s+/i, '')
          .replace(/\s+(?:division|segment|unit|group|business)$/i, '')
          .trim()

        // Skip if too short, too long, or is a stop word
        if (cleanName.length < 3 || cleanName.length > 50) continue
        if (stopWords.includes(cleanName.toLowerCase())) continue
        // Skip if it's just numbers or common words
        if (/^[\d\s]+$/.test(cleanName)) continue
        if (/^(?:which|that|these|those|their|other)$/i.test(cleanName)) continue

        // Check for duplicates
        if (!divisions.some(d => d.name.toLowerCase() === cleanName.toLowerCase())) {
          // Determine type based on context
          let type: 'division' | 'subsidiary' | 'business_unit' | 'product_line' = 'division'
          if (/subsidiar/i.test(match[0])) type = 'subsidiary'
          if (/product\s+line/i.test(match[0])) type = 'product_line'
          if (/business\s+unit/i.test(match[0])) type = 'business_unit'

          divisions.push({
            name: cleanName,
            type,
            selected: true,
          })
        }
      }
    }
  }

  return divisions
}

export function QuickAIResearchButton({
  accountId,
  accountName,
  website,
  industry,
  campaignContext,
  companyContext,
  mode,
  divisions = [],
  stakeholders = [],
  onComplete,
}: QuickAIResearchButtonProps) {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [isResearching, setIsResearching] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [findings, setFindings] = useState<ResearchFinding[]>([])
  const [summary, setSummary] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [detectedDivisions, setDetectedDivisions] = useState<DetectedDivision[]>([])
  const [manualDivisionInput, setManualDivisionInput] = useState('')

  const config = MODE_CONFIG[mode]

  // Start research immediately when modal opens
  useEffect(() => {
    if (isOpen && findings.length === 0 && !isResearching) {
      runResearch()
    }
  }, [isOpen])

  const runResearch = async () => {
    setIsResearching(true)
    setError(null)

    try {
      let domain: string | undefined
      if (website) {
        domain = website.replace(/^https?:\/\//, '').split('/')[0]
      }

      const response = await fetch('/api/ai/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName: accountName,
          domain,
          categories: config.categories.map(id => ({ id, name: id, enabled: true })),
          customPrompts: [
            ...config.searchPrompts,
            companyContext ? `Our company sells: ${companyContext}` : '',
            campaignContext ? `Campaign focus: ${campaignContext}` : '',
            industry ? `Target industry: ${industry}` : '',
          ].filter(Boolean),
          searchMode: mode === 'people' ? 'people' : mode === 'signals' ? 'news' : 'intelligence',
          context: { industry, campaignContext, companyContext },
        }),
      })

      if (!response.ok) {
        throw new Error('Research failed')
      }

      const result = await response.json()
      const research = result.research || result

      const newFindings: ResearchFinding[] = (research.findings || []).map((f: ResearchFinding) => {
        // For people mode, extract detected people
        let detectedPeople: DetectedPerson[] | undefined
        if (mode === 'people') {
          const peopleList = f.people || extractPeopleFromContent(f.content)
          detectedPeople = peopleList
            .filter(p => !stakeholders.some(s => s.full_name.toLowerCase() === p.name.toLowerCase()))
            .map(p => ({ ...p, selected: true })) // Auto-select in people mode
        }

        // For structure mode, extract divisions
        if (mode === 'structure') {
          const extracted = extractDivisionsFromContent(f.content)
          const existingNames = divisions.map(d => d.name.toLowerCase())
          const newDivs = extracted.filter(d => !existingNames.includes(d.name.toLowerCase()))
          if (newDivs.length > 0) {
            setDetectedDivisions(prev => {
              const prevNames = prev.map(d => d.name.toLowerCase())
              return [...prev, ...newDivs.filter(d => !prevNames.includes(d.name.toLowerCase()))]
            })
          }
        }

        // For signals mode, auto-tag compelling events and buying signals
        let is_compelling_event = false
        let is_buying_signal = false
        let event_impact: 'high' | 'medium' | 'low' = 'medium'
        let signal_strength: 'strong' | 'moderate' | 'weak' = 'moderate'

        if (mode === 'signals') {
          const content = f.content.toLowerCase()
          // Compelling events: regulatory, leadership changes, incidents
          if (content.includes('regulat') || content.includes('compliance') || content.includes('mandate')) {
            is_compelling_event = true
            event_impact = 'high'
          }
          if (content.includes('ceo') || content.includes('cto') || content.includes('appoint') || content.includes('hire')) {
            is_compelling_event = true
          }
          // Buying signals: security concerns, product needs, initiatives
          if (content.includes('security') || content.includes('vulnerab') || content.includes('breach')) {
            is_buying_signal = true
            signal_strength = 'strong'
          }
          if (content.includes('initiative') || content.includes('project') || content.includes('invest')) {
            is_buying_signal = true
          }
        }

        return {
          ...f,
          status: 'pending' as const,
          detectedPeople,
          is_compelling_event,
          is_buying_signal,
          event_impact: is_compelling_event ? event_impact : undefined,
          signal_strength: is_buying_signal ? signal_strength : undefined,
          is_financial: f.categoryId === 'funding' || f.content.toLowerCase().includes('revenue'),
        }
      })

      setFindings(newFindings)
      setSummary(research.summary)
    } catch {
      setError('Failed to research company. Please try again.')
    } finally {
      setIsResearching(false)
    }
  }

  const updateFindingStatus = (findingId: string, status: ResearchFinding['status']) => {
    setFindings(prev => prev.map(f => {
      if (f.id !== findingId) return f

      // When accepting in people mode, ensure detected people are set
      if (status === 'accepted' && mode === 'people' && !f.detectedPeople) {
        const peopleList = f.people || extractPeopleFromContent(f.content)
        const detectedPeople = peopleList
          .filter(p => !stakeholders.some(s => s.full_name.toLowerCase() === p.name.toLowerCase()))
          .map(p => ({ ...p, selected: true }))
        return { ...f, status, detectedPeople }
      }

      return { ...f, status }
    }))
  }

  const toggleDetectedPerson = (findingId: string, personName: string) => {
    setFindings(prev =>
      prev.map(f => {
        if (f.id !== findingId || !f.detectedPeople) return f
        return {
          ...f,
          detectedPeople: f.detectedPeople.map(p =>
            p.name === personName ? { ...p, selected: !p.selected } : p
          )
        }
      })
    )
  }

  const toggleDetectedDivision = (name: string) => {
    setDetectedDivisions(prev =>
      prev.map(d => d.name === name ? { ...d, selected: !d.selected } : d)
    )
  }

  const addManualDivision = () => {
    const name = manualDivisionInput.trim()
    if (!name || name.length < 2) return
    if (detectedDivisions.some(d => d.name.toLowerCase() === name.toLowerCase())) return

    setDetectedDivisions(prev => [...prev, {
      name,
      type: 'division',
      selected: true,
    }])
    setManualDivisionInput('')
  }

  const toggleFindingTag = (findingId: string, tag: 'is_compelling_event' | 'is_buying_signal' | 'is_financial' | 'is_competitive') => {
    setFindings(prev =>
      prev.map(f => {
        if (f.id !== findingId) return f
        return { ...f, [tag]: !f[tag as keyof ResearchFinding] }
      })
    )
  }

  const setFindingImpact = (findingId: string, impact: 'high' | 'medium' | 'low') => {
    setFindings(prev =>
      prev.map(f => f.id === findingId ? { ...f, event_impact: impact } : f)
    )
  }

  const setFindingStrength = (findingId: string, strength: 'strong' | 'moderate' | 'weak') => {
    setFindings(prev =>
      prev.map(f => f.id === findingId ? { ...f, signal_strength: strength } : f)
    )
  }

  const acceptAllPending = () => {
    setFindings(prev => prev.map(f => {
      if (f.status !== 'pending') return f

      let detectedPeople = f.detectedPeople
      if (mode === 'people' && !detectedPeople) {
        const peopleList = f.people || extractPeopleFromContent(f.content)
        detectedPeople = peopleList
          .filter(p => !stakeholders.some(s => s.full_name.toLowerCase() === p.name.toLowerCase()))
          .map(p => ({ ...p, selected: true }))
      }

      return { ...f, status: 'accepted' as const, detectedPeople }
    }))
  }

  const saveFindings = async () => {
    const acceptedFindings = findings.filter(f => f.status === 'accepted')

    if (acceptedFindings.length === 0 && detectedDivisions.filter(d => d.selected).length === 0) {
      setError('Please accept at least one finding to save.')
      return
    }

    setIsSaving(true)
    setError(null)

    try {
      // Create stakeholders from detected people
      if (mode === 'people') {
        for (const f of acceptedFindings) {
          if (f.detectedPeople) {
            for (const person of f.detectedPeople.filter(p => p.selected)) {
              await fetch(`/api/accounts/${accountId}/stakeholders`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  full_name: person.name,
                  title: person.title,
                  profile_notes: `Discovered via AI research: ${f.content}`,
                }),
              })
            }
          }
        }
      }

      // Create divisions
      if (mode === 'structure') {
        const selectedDivisions = detectedDivisions.filter(d => d.selected)
        for (const div of selectedDivisions) {
          await fetch(`/api/accounts/${accountId}/divisions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: div.name,
              division_type: div.type || 'division',
            }),
          })
        }
      }

      // Save signals for all modes
      if (acceptedFindings.length > 0) {
        await fetch(`/api/accounts/${accountId}/signals`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            findings: acceptedFindings.map(f => ({
              signal_type: mapCategoryToSignalType(f.categoryId),
              title: f.title,
              summary: f.content,
              source: f.sources[0] || 'AI Research',
              confidence: f.confidence,
              category: f.categoryId,
              is_financial: f.is_financial,
            })),
            research_summary: summary,
          }),
        })
      }

      // Save intelligence (compelling events, buying signals) for signals mode
      if (mode === 'signals') {
        const newCompellingEvents = acceptedFindings
          .filter(f => f.is_compelling_event)
          .map(f => ({
            id: `ce-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            event: f.content,
            date: new Date().toISOString().split('T')[0],
            source: f.sources[0] || 'AI Research',
            impact: f.event_impact || 'medium',
          }))

        const newBuyingSignals = acceptedFindings
          .filter(f => f.is_buying_signal)
          .map(f => ({
            id: `bs-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            signal: f.content,
            type: f.categoryId || 'general',
            date: new Date().toISOString().split('T')[0],
            source: f.sources[0] || 'AI Research',
            strength: f.signal_strength || 'moderate',
          }))

        if (newCompellingEvents.length > 0 || newBuyingSignals.length > 0) {
          const existingResponse = await fetch(`/api/accounts/${accountId}/intelligence`)
          const existingData = existingResponse.ok ? await existingResponse.json() : {}

          await fetch(`/api/accounts/${accountId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              compelling_events: [...(existingData.compelling_events || []), ...newCompellingEvents],
              buying_signals: [...(existingData.buying_signals || []), ...newBuyingSignals],
            }),
          })
        }
      }

      // Close and refresh
      setIsOpen(false)
      setFindings([])
      setSummary(null)
      setDetectedDivisions([])
      setManualDivisionInput('')
      router.refresh()
      onComplete?.()
    } catch (err) {
      console.error('Save error:', err)
      setError('Failed to save. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  const acceptedCount = findings.filter(f => f.status === 'accepted').length
  const pendingCount = findings.filter(f => f.status === 'pending').length
  const selectedDivisionsCount = detectedDivisions.filter(d => d.selected).length

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="px-2 py-1 rounded-lg transition-all flex items-center gap-1.5 group hover:scale-105"
        style={{
          background: 'linear-gradient(135deg, rgba(210, 105, 30, 0.12) 0%, rgba(139, 69, 19, 0.08) 100%)',
          border: '1px solid rgba(210, 105, 30, 0.3)',
          color: 'var(--scout-sunset)',
          boxShadow: '0 1px 3px rgba(210, 105, 30, 0.15)',
        }}
        title={config.label}
      >
        <ScoutAIIcon size={14} className="group-hover:animate-pulse" />
        <span className="text-[10px] font-medium uppercase tracking-wide">
          {config.buttonLabel}
        </span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => !isResearching && !isSaving && setIsOpen(false)}
          />

          <div
            className="relative w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-xl shadow-2xl"
            style={{ backgroundColor: 'var(--scout-white)' }}
          >
            {/* Header */}
            <div
              className="sticky top-0 z-10 px-6 py-4 border-b flex items-center justify-between"
              style={{ backgroundColor: 'var(--scout-white)', borderColor: 'var(--scout-border)' }}
            >
              <div className="flex items-center gap-3">
                <ScoutAIIcon size={24} className="text-amber-700" />
                <div>
                  <h2
                    className="text-lg font-semibold"
                    style={{ color: 'var(--scout-saddle)', fontFamily: "'Bitter', Georgia, serif" }}
                  >
                    {config.label}
                  </h2>
                  <p className="text-sm" style={{ color: 'var(--scout-earth-light)' }}>
                    {accountName}
                  </p>
                </div>
              </div>
              <button
                onClick={() => !isResearching && !isSaving && setIsOpen(false)}
                className="p-2 rounded-lg hover:bg-gray-100"
                style={{ color: 'var(--scout-earth-light)' }}
                disabled={isResearching || isSaving}
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Content */}
            <div className="p-6">
              {/* Loading State */}
              {isResearching && (
                <div className="py-12 text-center">
                  <div className="inline-flex items-center gap-3 px-6 py-3 rounded-lg" style={{ backgroundColor: 'var(--scout-parchment)' }}>
                    <svg className="animate-spin h-5 w-5" style={{ color: 'var(--scout-sunset)' }} viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span style={{ color: 'var(--scout-earth)' }}>{config.description}</span>
                  </div>
                </div>
              )}

              {/* Error */}
              {error && (
                <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              {/* Results */}
              {!isResearching && findings.length > 0 && (
                <>
                  {/* Summary */}
                  {summary && (
                    <div className="mb-5 p-3 rounded-lg border" style={{ backgroundColor: 'var(--scout-parchment)', borderColor: 'var(--scout-border)' }}>
                      <p className="text-sm" style={{ color: 'var(--scout-earth)' }}>{summary}</p>
                    </div>
                  )}

                  {/* Bulk Actions */}
                  {pendingCount > 0 && (
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-sm" style={{ color: 'var(--scout-earth-light)' }}>
                        {pendingCount} pending, {acceptedCount} accepted
                      </span>
                      <button
                        onClick={acceptAllPending}
                        className="text-sm font-medium"
                        style={{ color: 'var(--scout-trail)' }}
                      >
                        Accept All
                      </button>
                    </div>
                  )}

                  {/* Divisions section (structure mode) */}
                  {mode === 'structure' && (
                    <div className="mb-4 p-3 rounded-lg border" style={{ backgroundColor: 'rgba(56, 152, 199, 0.08)', borderColor: 'var(--scout-sky)' }}>
                      <p className="text-xs font-medium mb-2" style={{ color: 'var(--scout-sky)' }}>
                        Divisions/Units {detectedDivisions.length > 0 ? `(${selectedDivisionsCount} selected)` : ''}
                      </p>

                      {/* Detected divisions */}
                      {detectedDivisions.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-3">
                          {detectedDivisions.map(div => (
                            <button
                              key={div.name}
                              onClick={() => toggleDetectedDivision(div.name)}
                              className="px-2 py-1 rounded text-xs border transition-all"
                              style={{
                                backgroundColor: div.selected ? 'rgba(56, 152, 199, 0.15)' : 'transparent',
                                borderColor: div.selected ? 'var(--scout-sky)' : 'var(--scout-border)',
                                color: div.selected ? 'var(--scout-sky)' : 'var(--scout-earth)',
                              }}
                            >
                              {div.selected && '✓ '}{div.name}
                              <span className="ml-1 opacity-60 capitalize text-[9px]">({div.type.replace('_', ' ')})</span>
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Manual input */}
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={manualDivisionInput}
                          onChange={(e) => setManualDivisionInput(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && addManualDivision()}
                          placeholder="Add division manually..."
                          className="flex-1 px-2 py-1 text-xs rounded border"
                          style={{ borderColor: 'var(--scout-border)', backgroundColor: 'var(--scout-white)' }}
                        />
                        <button
                          onClick={addManualDivision}
                          className="px-2 py-1 text-xs rounded"
                          style={{ backgroundColor: 'var(--scout-sky)', color: 'white' }}
                        >
                          Add
                        </button>
                      </div>

                      {detectedDivisions.length === 0 && (
                        <p className="text-[10px] mt-2" style={{ color: 'var(--scout-earth-light)' }}>
                          No divisions automatically detected. Add them manually above.
                        </p>
                      )}
                    </div>
                  )}

                  {/* Findings */}
                  <div className="space-y-3 mb-6">
                    {findings.map((finding) => (
                      <div
                        key={finding.id}
                        className={`p-3 rounded-lg border ${
                          finding.status === 'accepted' ? 'bg-green-50 border-green-200' :
                          finding.status === 'rejected' ? 'bg-red-50 border-red-200 opacity-50' : ''
                        }`}
                        style={finding.status === 'pending' ? { backgroundColor: 'var(--scout-parchment)', borderColor: 'var(--scout-border)' } : undefined}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <span className="text-xs font-medium" style={{ color: 'var(--scout-sky)' }}>
                            {finding.categoryName}
                          </span>
                          <span
                            className="text-xs px-2 py-0.5 rounded-full"
                            style={{
                              backgroundColor: finding.confidence === 'high' ? 'rgba(93, 122, 93, 0.15)' :
                                finding.confidence === 'medium' ? 'rgba(210, 105, 30, 0.15)' : 'var(--scout-border)',
                              color: finding.confidence === 'high' ? 'var(--scout-trail)' :
                                finding.confidence === 'medium' ? 'var(--scout-sunset)' : 'var(--scout-earth-light)',
                            }}
                          >
                            {finding.confidence}
                          </span>
                        </div>

                        <h4 className="font-medium text-sm mb-1" style={{ color: 'var(--scout-earth)' }}>
                          {finding.title}
                        </h4>
                        <p className="text-sm mb-2" style={{ color: 'var(--scout-earth-light)' }}>
                          {finding.content}
                        </p>

                        {/* Interactive tags for signals mode */}
                        {mode === 'signals' && (finding.status === 'pending' || finding.status === 'accepted') && (
                          <div className="space-y-2 mb-3">
                            <p className="text-[10px] font-medium" style={{ color: 'var(--scout-earth-light)' }}>
                              Tag as:
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                              <button
                                onClick={() => toggleFindingTag(finding.id, 'is_compelling_event')}
                                className="text-[10px] px-2 py-1 rounded-full border transition-all"
                                style={{
                                  backgroundColor: finding.is_compelling_event ? 'rgba(210, 105, 30, 0.15)' : 'transparent',
                                  borderColor: finding.is_compelling_event ? 'var(--scout-sunset)' : 'var(--scout-border)',
                                  color: finding.is_compelling_event ? 'var(--scout-sunset)' : 'var(--scout-earth-light)',
                                }}
                              >
                                {finding.is_compelling_event ? '✓ ' : ''}Compelling Event
                              </button>
                              <button
                                onClick={() => toggleFindingTag(finding.id, 'is_buying_signal')}
                                className="text-[10px] px-2 py-1 rounded-full border transition-all"
                                style={{
                                  backgroundColor: finding.is_buying_signal ? 'rgba(93, 122, 93, 0.15)' : 'transparent',
                                  borderColor: finding.is_buying_signal ? 'var(--scout-trail)' : 'var(--scout-border)',
                                  color: finding.is_buying_signal ? 'var(--scout-trail)' : 'var(--scout-earth-light)',
                                }}
                              >
                                {finding.is_buying_signal ? '✓ ' : ''}Buying Signal
                              </button>
                              <button
                                onClick={() => toggleFindingTag(finding.id, 'is_financial')}
                                className="text-[10px] px-2 py-1 rounded-full border transition-all"
                                style={{
                                  backgroundColor: finding.is_financial ? 'rgba(56, 152, 199, 0.15)' : 'transparent',
                                  borderColor: finding.is_financial ? 'var(--scout-sky)' : 'var(--scout-border)',
                                  color: finding.is_financial ? 'var(--scout-sky)' : 'var(--scout-earth-light)',
                                }}
                              >
                                {finding.is_financial ? '✓ ' : ''}Financial
                              </button>
                              <button
                                onClick={() => toggleFindingTag(finding.id, 'is_competitive')}
                                className="text-[10px] px-2 py-1 rounded-full border transition-all"
                                style={{
                                  backgroundColor: finding.is_competitive ? 'rgba(180, 83, 9, 0.15)' : 'transparent',
                                  borderColor: finding.is_competitive ? '#b45309' : 'var(--scout-border)',
                                  color: finding.is_competitive ? '#b45309' : 'var(--scout-earth-light)',
                                }}
                              >
                                {finding.is_competitive ? '✓ ' : ''}Competitive
                              </button>
                            </div>
                            {/* Impact/Strength selectors */}
                            {finding.is_compelling_event && (
                              <div className="flex items-center gap-2">
                                <span className="text-[10px]" style={{ color: 'var(--scout-earth-light)' }}>Impact:</span>
                                {(['high', 'medium', 'low'] as const).map(level => (
                                  <button
                                    key={level}
                                    onClick={() => setFindingImpact(finding.id, level)}
                                    className="text-[10px] px-1.5 py-0.5 rounded capitalize"
                                    style={{
                                      backgroundColor: finding.event_impact === level ? 'rgba(210, 105, 30, 0.15)' : 'transparent',
                                      color: finding.event_impact === level ? 'var(--scout-sunset)' : 'var(--scout-earth-light)',
                                    }}
                                  >
                                    {level}
                                  </button>
                                ))}
                              </div>
                            )}
                            {finding.is_buying_signal && (
                              <div className="flex items-center gap-2">
                                <span className="text-[10px]" style={{ color: 'var(--scout-earth-light)' }}>Strength:</span>
                                {(['strong', 'moderate', 'weak'] as const).map(level => (
                                  <button
                                    key={level}
                                    onClick={() => setFindingStrength(finding.id, level)}
                                    className="text-[10px] px-1.5 py-0.5 rounded capitalize"
                                    style={{
                                      backgroundColor: finding.signal_strength === level ? 'rgba(93, 122, 93, 0.15)' : 'transparent',
                                      color: finding.signal_strength === level ? 'var(--scout-trail)' : 'var(--scout-earth-light)',
                                    }}
                                  >
                                    {level}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Action buttons */}
                        {finding.status === 'pending' && (
                          <div className="flex gap-2">
                            <button
                              onClick={() => updateFindingStatus(finding.id, 'accepted')}
                              className="px-3 py-1.5 text-white text-xs rounded-lg font-medium"
                              style={{ backgroundColor: 'var(--scout-trail)' }}
                            >
                              Accept
                            </button>
                            <button
                              onClick={() => updateFindingStatus(finding.id, 'rejected')}
                              className="px-3 py-1.5 text-xs"
                              style={{ color: 'var(--scout-clay)' }}
                            >
                              Skip
                            </button>
                          </div>
                        )}

                        {/* Detected people (people mode) */}
                        {finding.status === 'accepted' && mode === 'people' && finding.detectedPeople && finding.detectedPeople.length > 0 && (
                          <div className="pt-2 mt-2 border-t" style={{ borderColor: 'var(--scout-border)' }}>
                            <p className="text-[10px] font-medium mb-1.5" style={{ color: 'var(--scout-earth-light)' }}>
                              People to add as stakeholders:
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                              {finding.detectedPeople.map(person => (
                                <button
                                  key={person.name}
                                  onClick={() => toggleDetectedPerson(finding.id, person.name)}
                                  className="px-2 py-1 rounded-full text-xs border transition-all flex items-center gap-1"
                                  style={{
                                    backgroundColor: person.selected ? 'rgba(56, 152, 199, 0.15)' : 'transparent',
                                    borderColor: person.selected ? 'var(--scout-sky)' : 'var(--scout-border)',
                                    color: person.selected ? 'var(--scout-sky)' : 'var(--scout-earth)',
                                  }}
                                >
                                  {person.selected && '✓ '}
                                  {person.name}
                                  {person.title && <span className="opacity-60">({person.title})</span>}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        {finding.status === 'accepted' && (
                          <button
                            onClick={() => updateFindingStatus(finding.id, 'pending')}
                            className="text-xs mt-2"
                            style={{ color: 'var(--scout-earth-light)' }}
                          >
                            Undo
                          </button>
                        )}

                        {finding.status === 'rejected' && (
                          <button
                            onClick={() => updateFindingStatus(finding.id, 'pending')}
                            className="text-xs"
                            style={{ color: 'var(--scout-earth-light)' }}
                          >
                            Restore
                          </button>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Save Actions */}
                  <div className="flex justify-between items-center pt-4 border-t" style={{ borderColor: 'var(--scout-border)' }}>
                    <button
                      onClick={() => {
                        setFindings([])
                        setSummary(null)
                        setDetectedDivisions([])
                        setManualDivisionInput('')
                        runResearch()
                      }}
                      className="text-sm"
                      style={{ color: 'var(--scout-earth-light)' }}
                    >
                      Re-run Research
                    </button>
                    <button
                      onClick={saveFindings}
                      disabled={(acceptedCount === 0 && selectedDivisionsCount === 0) || isSaving}
                      className="px-5 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-50"
                      style={{ backgroundColor: 'var(--scout-saddle)' }}
                    >
                      {isSaving ? 'Saving...' : `Save ${acceptedCount + selectedDivisionsCount} Items`}
                    </button>
                  </div>
                </>
              )}

              {/* No results */}
              {!isResearching && findings.length === 0 && !error && (
                <div className="py-12 text-center">
                  <p className="text-sm" style={{ color: 'var(--scout-earth-light)' }}>
                    No results found. Try again?
                  </p>
                  <button
                    onClick={runResearch}
                    className="mt-3 px-4 py-2 rounded-lg text-sm font-medium"
                    style={{ backgroundColor: 'var(--scout-parchment)', color: 'var(--scout-earth)' }}
                  >
                    Retry Research
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function mapCategoryToSignalType(categoryId?: string): string {
  if (!categoryId) return 'news'
  const mapping: Record<string, string> = {
    'company-overview': 'strategic',
    'leadership': 'leadership',
    'news': 'news',
    'partnerships': 'strategic',
    'product': 'product',
    'security': 'incident',
    'compliance': 'regulatory',
    'funding': 'funding',
    'ma': 'expansion',
    'hiring': 'expansion',
    'regulatory': 'regulatory',
  }
  return mapping[categoryId] || 'news'
}
