'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ScoutAIIcon } from '@/components/ui/scout-logo'
import { DEFAULT_RESEARCH_CATEGORIES, type ResearchCategory } from '@/lib/ai/context/types'

interface DetectedPerson {
  name: string
  title?: string
  selected?: boolean
}

interface DetectedStructure {
  parent_company?: string
  subsidiaries?: string[]
  ownership_type?: 'public' | 'private' | 'subsidiary'
  stock_symbol?: string
  headquarters?: string
  ceo?: string
  founded_year?: number
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
  // AI-extracted people from content
  people?: Array<{ name: string; title?: string }>
  status: 'pending' | 'accepted' | 'rejected' | 'edited'
  editedContent?: string
  // Entity linking
  stakeholder_id?: string
  pursuit_id?: string
  is_financial?: boolean
  sentiment_score?: number
  is_competitive?: boolean
  // For creating new stakeholder
  createStakeholder?: {
    full_name: string
    title?: string
    notes?: string
  }
  // Auto-detected people (populated from AI or extraction)
  detectedPeople?: DetectedPerson[]
  // Intelligence tagging
  is_compelling_event?: boolean
  is_buying_signal?: boolean
  event_impact?: 'high' | 'medium' | 'low'
  signal_strength?: 'strong' | 'moderate' | 'weak'
}

type SearchMode = 'intelligence' | 'people' | 'news'

interface Stakeholder {
  stakeholder_id: string
  full_name: string
  title?: string
}

interface Pursuit {
  pursuit_id: string
  name: string
}

interface Division {
  division_id: string
  name: string
  parent_division_id?: string
}

interface DetectedDivision {
  name: string
  selected: boolean
  parentDivisionId?: string
  divisionType?: 'division' | 'subsidiary' | 'business_unit'
}

interface UpdateSignalsButtonProps {
  accountId: string
  accountName: string
  website?: string | null
  industry?: string | null
  campaignContext?: string | null
  companyContext?: string | null
  stakeholders?: Stakeholder[]
  pursuits?: Pursuit[]
  divisions?: Division[]
  // New props for card-specific usage
  initialMode?: SearchMode
  variant?: 'button' | 'icon'
  iconSize?: number
}

const PEOPLE_SEARCH_PROMPTS = [
  'Product Security leaders and team members',
  'Engineering leadership (VP/Director level)',
  'IT Security and CISO office',
  'Regulatory/Compliance team',
  'Industry group participation and speakers',
]

const NEWS_CATEGORIES = [
  { id: 'regulatory', name: 'Regulatory & Compliance', enabled: true },
  { id: 'security-incidents', name: 'Security Incidents', enabled: true },
  { id: 'product-launches', name: 'Product Launches', enabled: true },
  { id: 'leadership-changes', name: 'Leadership Changes', enabled: true },
  { id: 'competitor-news', name: 'Competitor News', enabled: true },
  { id: 'industry-trends', name: 'Industry Trends', enabled: false },
]

// Title patterns to detect in content
const TITLE_PATTERNS = [
  /(?:^|\s)(CEO|CTO|CFO|CIO|CISO|COO|CMO|CPO|CSO|CRO)(?:\s|$|,)/gi,
  /(?:^|\s)(Chief\s+(?:Executive|Technology|Financial|Information|Security|Operating|Marketing|Product|Revenue)\s+Officer)(?:\s|$|,)/gi,
  /(?:^|\s)((?:Senior\s+|Executive\s+)?Vice\s+President\s+(?:of\s+)?[\w\s]+)(?:\s|$|,)/gi,
  /(?:^|\s)(VP\s+(?:of\s+)?[\w\s]+)(?:\s|$|,)/gi,
  /(?:^|\s)(Director\s+(?:of\s+)?[\w\s]+)(?:\s|$|,)/gi,
  /(?:^|\s)(Head\s+of\s+[\w\s]+)(?:\s|$|,)/gi,
  /(?:^|\s)(President(?:\s+and\s+\w+)?)(?:\s|$|,)/gi,
  /(?:^|\s)(General\s+Manager)(?:\s|$|,)/gi,
]

// Extract people mentioned in content
function extractPeopleFromContent(content: string): { name: string; title?: string }[] {
  const people: { name: string; title?: string }[] = []

  // Pattern for "Name, Title" or "Name - Title" or "Title Name"
  // e.g., "John Smith, VP of Engineering" or "CEO Jane Doe"
  const patterns = [
    // Name followed by title: "John Smith, VP of Engineering" or "John Smith (CEO)"
    /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)(?:,\s*|\s*-\s*|\s*\()((?:CEO|CTO|CFO|CIO|CISO|COO|CMO|CPO|VP|Director|Head|Chief|President|Senior|Executive|General Manager)[\w\s,]*?)(?:\)|,|\.|\s*$)/g,
    // Title followed by name: "CEO John Smith" or "VP of Engineering Jane Doe"
    /((?:CEO|CTO|CFO|CIO|CISO|COO|CMO|CPO)\s+)?([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/g,
    // Name with "appointed as" or "named as" pattern
    /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)\s+(?:was\s+)?(?:appointed|named|promoted|hired)\s+(?:as\s+)?(?:the\s+)?(?:new\s+)?([\w\s]+?)(?:\.|,|$)/gi,
    // "new CEO/CTO Name" pattern
    /new\s+(CEO|CTO|CFO|CIO|CISO|COO|CMO|CPO|VP[\w\s]*|Director[\w\s]*|Head[\w\s]*)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/gi,
  ]

  // Try first pattern: "Name, Title"
  const pattern1 = /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)(?:,\s*|\s*-\s*|\s*\()((?:CEO|CTO|CFO|CIO|CISO|COO|CMO|CPO|CSO|CRO|VP|Vice President|Director|Head|Chief|President|Senior|Executive|General Manager)[\w\s]*?)(?:\)|,|\.|\s|$)/g
  let match
  while ((match = pattern1.exec(content)) !== null) {
    const name = match[1].trim()
    const title = match[2].trim()
    if (name.split(' ').length >= 2 && name.length < 50) {
      people.push({ name, title: title || undefined })
    }
  }

  // Try second pattern: "Title Name"
  const pattern2 = /\b(CEO|CTO|CFO|CIO|CISO|COO|CMO|CPO|CSO|CRO)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/g
  while ((match = pattern2.exec(content)) !== null) {
    const title = match[1]
    const name = match[2].trim()
    // Don't add if we already found this person
    if (name.split(' ').length >= 2 && name.length < 50 && !people.some(p => p.name === name)) {
      people.push({ name, title })
    }
  }

  // Try "appointed/named" pattern
  const pattern3 = /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)\s+(?:was\s+)?(?:appointed|named|promoted|hired)\s+(?:as\s+)?(?:the\s+)?(?:new\s+)?([\w\s]+?)(?:\.|,|$)/gi
  while ((match = pattern3.exec(content)) !== null) {
    const name = match[1].trim()
    let title = match[2].trim()
    // Clean up title
    if (title.length > 50) title = title.substring(0, 50)
    if (name.split(' ').length >= 2 && name.length < 50 && !people.some(p => p.name === name)) {
      people.push({ name, title: title || undefined })
    }
  }

  // Try "new Title Name" pattern
  const pattern4 = /new\s+(CEO|CTO|CFO|CIO|CISO|COO|CMO|CPO|CSO|CRO|VP[\w\s]*?|Vice President[\w\s]*?|Director[\w\s]*?|Head[\w\s]*?)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/gi
  while ((match = pattern4.exec(content)) !== null) {
    const title = match[1].trim()
    const name = match[2].trim()
    if (name.split(' ').length >= 2 && name.length < 50 && !people.some(p => p.name === name)) {
      people.push({ name, title })
    }
  }

  return people
}

// Extract corporate structure information from content
function extractStructureFromContent(content: string): DetectedStructure | null {
  const structure: DetectedStructure = {}

  // Parent company patterns
  const parentPatterns = [
    /(?:subsidiary|division|unit)\s+of\s+([A-Z][A-Za-z\s&]+?)(?:\.|,|$)/i,
    /(?:owned|acquired)\s+by\s+([A-Z][A-Za-z\s&]+?)(?:\.|,|\s+in|\s+for)/i,
    /parent\s+company\s+(?:is\s+)?([A-Z][A-Za-z\s&]+?)(?:\.|,|$)/i,
    /(?:part\s+of|belongs?\s+to)\s+([A-Z][A-Za-z\s&]+?)(?:\.|,|$)/i,
  ]

  for (const pattern of parentPatterns) {
    const match = content.match(pattern)
    if (match && match[1]) {
      const company = match[1].trim()
      if (company.length > 2 && company.length < 100) {
        structure.parent_company = company
        structure.ownership_type = 'subsidiary'
        break
      }
    }
  }

  // Subsidiaries pattern
  const subsidiaryPatterns = [
    /(?:subsidiaries?\s+(?:include|are|:))\s*([A-Z][A-Za-z\s,&]+?)(?:\.|$)/i,
    /(?:owns?\s+)([A-Z][A-Za-z\s,&]+?)(?:\.|,|\s+and)/i,
    /(?:acquired)\s+([A-Z][A-Za-z\s&]+?)(?:\s+in\s+\d{4}|\.|,)/i,
  ]

  for (const pattern of subsidiaryPatterns) {
    const match = content.match(pattern)
    if (match && match[1]) {
      const subs = match[1].split(/,\s*|\s+and\s+/).filter(s => s.trim().length > 2)
      if (subs.length > 0) {
        structure.subsidiaries = subs.map(s => s.trim())
        break
      }
    }
  }

  // Public/Private patterns
  if (/\b(publicly traded|public company|NYSE|NASDAQ|stock exchange)\b/i.test(content)) {
    structure.ownership_type = 'public'
  } else if (/\b(private(?:ly held)?|privately owned)\b/i.test(content)) {
    structure.ownership_type = 'private'
  }

  // Stock symbol pattern
  const stockMatch = content.match(/(?:trades?\s+(?:as|under)|ticker(?:\s+symbol)?[:\s]+|(?:NYSE|NASDAQ)[:\s]+)([A-Z]{1,5})\b/i)
  if (stockMatch) {
    structure.stock_symbol = stockMatch[1].toUpperCase()
    structure.ownership_type = 'public'
  }

  // Headquarters pattern
  const hqPatterns = [
    /headquartered\s+in\s+([A-Z][A-Za-z\s,]+?)(?:\.|,|$)/i,
    /(?:based|located)\s+in\s+([A-Z][A-Za-z\s,]+?)(?:\.|,|$)/i,
    /headquarters?\s+(?:in|:)\s*([A-Z][A-Za-z\s,]+?)(?:\.|,|$)/i,
  ]

  for (const pattern of hqPatterns) {
    const match = content.match(pattern)
    if (match && match[1]) {
      const hq = match[1].trim()
      if (hq.length > 2 && hq.length < 100) {
        structure.headquarters = hq
        break
      }
    }
  }

  // CEO pattern (also captured by people detection but useful here)
  const ceoMatch = content.match(/(?:CEO|Chief Executive Officer)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/i)
  if (ceoMatch) {
    structure.ceo = ceoMatch[1].trim()
  }

  // Founded year pattern
  const foundedMatch = content.match(/(?:founded|established|started)\s+(?:in\s+)?(\d{4})/i)
  if (foundedMatch) {
    const year = parseInt(foundedMatch[1])
    if (year >= 1800 && year <= new Date().getFullYear()) {
      structure.founded_year = year
    }
  }

  // Only return if we found something meaningful
  if (Object.keys(structure).length > 0) {
    return structure
  }

  return null
}

export function UpdateSignalsButton({
  accountId,
  accountName,
  website,
  industry,
  campaignContext,
  companyContext,
  stakeholders = [],
  pursuits = [],
  divisions = [],
  initialMode = 'intelligence',
  variant = 'button',
  iconSize = 16,
}: UpdateSignalsButtonProps) {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [searchMode, setSearchMode] = useState<SearchMode>(initialMode)
  const [isResearching, setIsResearching] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [findings, setFindings] = useState<ResearchFinding[]>([])
  const [summary, setSummary] = useState<string | null>(null)
  const [categories, setCategories] = useState<ResearchCategory[]>(
    DEFAULT_RESEARCH_CATEGORIES.map(c => ({ ...c, enabled: true }))
  )
  const [newsCategories, setNewsCategories] = useState(NEWS_CATEGORIES)
  const [peopleSearchFocus, setPeopleSearchFocus] = useState<string[]>(['Product Security leaders and team members'])
  const [customPeopleSearch, setCustomPeopleSearch] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [detectedStructure, setDetectedStructure] = useState<DetectedStructure | null>(null)
  const [saveStructure, setSaveStructure] = useState(false)
  const [detectedDivisions, setDetectedDivisions] = useState<DetectedDivision[]>([])

  const toggleCategory = (categoryId: string) => {
    setCategories(prev =>
      prev.map(c => c.id === categoryId ? { ...c, enabled: !c.enabled } : c)
    )
  }

  const toggleNewsCategory = (categoryId: string) => {
    setNewsCategories(prev =>
      prev.map(c => c.id === categoryId ? { ...c, enabled: !c.enabled } : c)
    )
  }

  const togglePeopleSearch = (prompt: string) => {
    setPeopleSearchFocus(prev =>
      prev.includes(prompt) ? prev.filter(p => p !== prompt) : [...prev, prompt]
    )
  }

  const runResearch = async () => {
    setIsResearching(true)
    setError(null)

    try {
      let domain: string | undefined
      if (website) {
        domain = website
        if (domain.includes('://')) {
          domain = domain.split('://')[1]
        }
        domain = domain.split('/')[0]
      }

      // Build context-aware prompt based on search mode
      let customPrompts: string[] = []
      let searchCategories = categories.filter(c => c.enabled)

      if (searchMode === 'people') {
        // People search mode - focus on finding contacts
        customPrompts = [
          ...peopleSearchFocus,
          customPeopleSearch ? customPeopleSearch : '',
        ].filter(Boolean)

        // Add context about what kind of people we're looking for
        if (companyContext) {
          customPrompts.push(`Focus on people relevant to: ${companyContext}`)
        }
        if (industry) {
          customPrompts.push(`Industry context: ${industry}`)
        }
      } else if (searchMode === 'news') {
        // News mode - context-aware signals
        const enabledNews = newsCategories.filter(c => c.enabled).map(c => c.name)
        customPrompts = [
          `Focus on these news categories: ${enabledNews.join(', ')}`,
        ]
        if (campaignContext) {
          customPrompts.push(`Campaign focus: ${campaignContext}`)
        }
        if (companyContext) {
          customPrompts.push(`Our company sells: ${companyContext}`)
        }
        if (industry) {
          customPrompts.push(`Target industry: ${industry}`)
        }
      }

      const response = await fetch('/api/ai/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName: accountName,
          domain,
          categories: searchMode === 'intelligence' ? searchCategories : [],
          customPrompts,
          searchMode,
          context: {
            industry,
            campaignContext,
            companyContext,
          },
        }),
      })

      if (!response.ok) {
        throw new Error('Research failed')
      }

      const result = await response.json()
      const research = result.research || result

      const newFindings: ResearchFinding[] = (research.findings || []).map((f: ResearchFinding) => ({
        ...f,
        status: 'pending' as const,
      }))

      setFindings(newFindings)
      setSummary(research.summary)
    } catch {
      setError('Failed to research company. Please try again.')
    } finally {
      setIsResearching(false)
    }
  }

  const updateFindingStatus = (findingId: string, status: ResearchFinding['status']) => {
    setFindings(prev => {
      const updated = prev.map(f => {
        if (f.id !== findingId) return f

        // When accepting, set up detected people (from AI or extraction)
        if (status === 'accepted' && !f.detectedPeople) {
          // First try AI-provided people, then fall back to extraction
          let peopleList = f.people || []
          if (peopleList.length === 0) {
            peopleList = extractPeopleFromContent(f.content)
          }

          const detectedPeople = peopleList
            .filter(p => !stakeholders.some(s =>
              s.full_name.toLowerCase() === p.name.toLowerCase()
            ))
            .map(p => ({ ...p, selected: false }))

          return { ...f, status, detectedPeople }
        }

        return { ...f, status }
      })

      // Aggregate structure from all accepted findings
      if (status === 'accepted') {
        const acceptedFindings = updated.filter(f => f.status === 'accepted' || f.status === 'edited')
        const aggregatedStructure: DetectedStructure = {}

        for (const f of acceptedFindings) {
          const structure = extractStructureFromContent(f.content)
          if (structure) {
            if (structure.parent_company && !aggregatedStructure.parent_company) {
              aggregatedStructure.parent_company = structure.parent_company
            }
            if (structure.subsidiaries) {
              aggregatedStructure.subsidiaries = [
                ...(aggregatedStructure.subsidiaries || []),
                ...structure.subsidiaries.filter(s => !aggregatedStructure.subsidiaries?.includes(s))
              ]
            }
            if (structure.ownership_type && !aggregatedStructure.ownership_type) {
              aggregatedStructure.ownership_type = structure.ownership_type
            }
            if (structure.stock_symbol && !aggregatedStructure.stock_symbol) {
              aggregatedStructure.stock_symbol = structure.stock_symbol
            }
            if (structure.headquarters && !aggregatedStructure.headquarters) {
              aggregatedStructure.headquarters = structure.headquarters
            }
            if (structure.ceo && !aggregatedStructure.ceo) {
              aggregatedStructure.ceo = structure.ceo
            }
            if (structure.founded_year && !aggregatedStructure.founded_year) {
              aggregatedStructure.founded_year = structure.founded_year
            }
          }
        }

        if (Object.keys(aggregatedStructure).length > 0) {
          setDetectedStructure(aggregatedStructure)
          setSaveStructure(true)

          // Convert subsidiaries to detected divisions (filter out existing)
          if (aggregatedStructure.subsidiaries && aggregatedStructure.subsidiaries.length > 0) {
            const existingDivisionNames = divisions.map(d => d.name.toLowerCase())
            const newDivisions = aggregatedStructure.subsidiaries
              .filter(sub => !existingDivisionNames.includes(sub.toLowerCase()))
              .map(sub => ({
                name: sub,
                selected: true,
                divisionType: 'subsidiary' as const,
              }))
            if (newDivisions.length > 0) {
              setDetectedDivisions(prev => {
                const existingNames = prev.map(d => d.name.toLowerCase())
                return [...prev, ...newDivisions.filter(d => !existingNames.includes(d.name.toLowerCase()))]
              })
            }
          }
        }
      }

      return updated
    })
  }

  const updateFindingLinking = (findingId: string, updates: Partial<ResearchFinding>) => {
    setFindings(prev =>
      prev.map(f => f.id === findingId ? { ...f, ...updates } : f)
    )
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

  const acceptAllPending = () => {
    setFindings(prev => {
      const updated = prev.map(f => {
        if (f.status !== 'pending') return f

        // Use AI-provided people first, then fall back to extraction
        let peopleList = f.people || []
        if (peopleList.length === 0) {
          peopleList = extractPeopleFromContent(f.content)
        }

        const detectedPeople = peopleList
          .filter(p => !stakeholders.some(s =>
            s.full_name.toLowerCase() === p.name.toLowerCase()
          ))
          .map(p => ({ ...p, selected: false }))

        return { ...f, status: 'accepted' as const, detectedPeople }
      })

      // Aggregate structure from all accepted findings
      const acceptedFindings = updated.filter(f => f.status === 'accepted' || f.status === 'edited')
      const aggregatedStructure: DetectedStructure = {}

      for (const f of acceptedFindings) {
        const structure = extractStructureFromContent(f.content)
        if (structure) {
          if (structure.parent_company && !aggregatedStructure.parent_company) {
            aggregatedStructure.parent_company = structure.parent_company
          }
          if (structure.subsidiaries) {
            aggregatedStructure.subsidiaries = [
              ...(aggregatedStructure.subsidiaries || []),
              ...structure.subsidiaries.filter(s => !aggregatedStructure.subsidiaries?.includes(s))
            ]
          }
          if (structure.ownership_type && !aggregatedStructure.ownership_type) {
            aggregatedStructure.ownership_type = structure.ownership_type
          }
          if (structure.stock_symbol && !aggregatedStructure.stock_symbol) {
            aggregatedStructure.stock_symbol = structure.stock_symbol
          }
          if (structure.headquarters && !aggregatedStructure.headquarters) {
            aggregatedStructure.headquarters = structure.headquarters
          }
          if (structure.ceo && !aggregatedStructure.ceo) {
            aggregatedStructure.ceo = structure.ceo
          }
          if (structure.founded_year && !aggregatedStructure.founded_year) {
            aggregatedStructure.founded_year = structure.founded_year
          }
        }
      }

      if (Object.keys(aggregatedStructure).length > 0) {
        setDetectedStructure(aggregatedStructure)
        setSaveStructure(true)

        // Convert subsidiaries to detected divisions (filter out existing)
        if (aggregatedStructure.subsidiaries && aggregatedStructure.subsidiaries.length > 0) {
          const existingDivisionNames = divisions.map(d => d.name.toLowerCase())
          const newDivisions = aggregatedStructure.subsidiaries
            .filter(sub => !existingDivisionNames.includes(sub.toLowerCase()))
            .map(sub => ({
              name: sub,
              selected: true,
              divisionType: 'subsidiary' as const,
            }))
          if (newDivisions.length > 0) {
            setDetectedDivisions(prev => {
              const existingNames = prev.map(d => d.name.toLowerCase())
              return [...prev, ...newDivisions.filter(d => !existingNames.includes(d.name.toLowerCase()))]
            })
          }
        }
      }

      return updated
    })
  }

  const toggleDetectedDivision = (name: string) => {
    setDetectedDivisions(prev =>
      prev.map(d => d.name === name ? { ...d, selected: !d.selected } : d)
    )
  }

  const updateDivisionParent = (name: string, parentId: string | undefined) => {
    setDetectedDivisions(prev =>
      prev.map(d => d.name === name ? { ...d, parentDivisionId: parentId } : d)
    )
  }

  const saveFindings = async () => {
    const acceptedFindings = findings.filter(f => f.status === 'accepted' || f.status === 'edited')

    if (acceptedFindings.length === 0) {
      setError('Please accept at least one finding to save.')
      return
    }

    setIsSaving(true)
    setError(null)

    try {
      // First, create any new stakeholders (from manual entry or detected people)
      const stakeholderIdMap = new Map<string, string>()

      for (const f of acceptedFindings) {
        // Create from manual entry
        if (f.createStakeholder && f.createStakeholder.full_name) {
          const response = await fetch(`/api/accounts/${accountId}/stakeholders`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              full_name: f.createStakeholder.full_name,
              title: f.createStakeholder.title,
              notes: f.createStakeholder.notes,
              profile_notes: f.editedContent || f.content,
            }),
          })
          if (response.ok) {
            const data = await response.json()
            stakeholderIdMap.set(f.id, data.stakeholder_id || data.data?.stakeholder_id)
          }
        }

        // Create from selected detected people
        if (f.detectedPeople) {
          const selectedPeople = f.detectedPeople.filter(p => p.selected)
          for (const person of selectedPeople) {
            const response = await fetch(`/api/accounts/${accountId}/stakeholders`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                full_name: person.name,
                title: person.title,
                profile_notes: `Detected from research: ${f.editedContent || f.content}`,
              }),
            })
            if (response.ok) {
              const data = await response.json()
              // Use the first created stakeholder for linking
              if (!stakeholderIdMap.has(f.id)) {
                stakeholderIdMap.set(f.id, data.stakeholder_id || data.data?.stakeholder_id)
              }
            }
          }
        }
      }

      // Save as signals to the account
      const response = await fetch(`/api/accounts/${accountId}/signals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          findings: acceptedFindings.map(f => ({
            signal_type: mapCategoryToSignalType(f.categoryId),
            title: f.title,
            summary: f.editedContent || f.content,
            source: f.sources[0] || 'AI Research',
            confidence: f.confidence,
            category: mapCategoryToCategory(f.categoryId),
            stakeholder_id: stakeholderIdMap.get(f.id) || f.stakeholder_id || null,
            pursuit_id: f.pursuit_id || null,
            is_financial: f.is_financial || isFinancialCategory(f.categoryId),
            sentiment_score: f.sentiment_score ?? null,
          })),
          research_summary: summary,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error('Save signals error:', response.status, errorData)
        throw new Error(errorData.error || 'Failed to save signals')
      }

      // Save compelling events and buying signals to account intelligence
      const newCompellingEvents = acceptedFindings
        .filter(f => f.is_compelling_event)
        .map(f => ({
          id: `ce-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          event: f.editedContent || f.content,
          date: new Date().toISOString().split('T')[0],
          source: f.sources[0] || 'AI Research',
          impact: f.event_impact || 'medium',
        }))

      const newBuyingSignals = acceptedFindings
        .filter(f => f.is_buying_signal)
        .map(f => ({
          id: `bs-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          signal: f.editedContent || f.content,
          type: f.categoryId || 'general',
          date: new Date().toISOString().split('T')[0],
          source: f.sources[0] || 'AI Research',
          strength: f.signal_strength || 'moderate',
        }))

      if (newCompellingEvents.length > 0 || newBuyingSignals.length > 0) {
        // Fetch existing intelligence to merge with new
        const existingResponse = await fetch(`/api/accounts/${accountId}/intelligence`)
        const existingData = existingResponse.ok ? await existingResponse.json() : {}

        const mergedCompellingEvents = [
          ...(existingData.compelling_events || []),
          ...newCompellingEvents
        ]

        const mergedBuyingSignals = [
          ...(existingData.buying_signals || []),
          ...newBuyingSignals
        ]

        await fetch(`/api/accounts/${accountId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...(newCompellingEvents.length > 0 && { compelling_events: mergedCompellingEvents }),
            ...(newBuyingSignals.length > 0 && { buying_signals: mergedBuyingSignals }),
          }),
        })
      }

      // Save detected corporate structure if enabled
      if (saveStructure && detectedStructure) {
        // Fetch existing structure to merge
        const structureResponse = await fetch(`/api/accounts/${accountId}`)
        const accountData = structureResponse.ok ? await structureResponse.json() : {}
        const existingStructure = accountData.data?.corporate_structure || {}

        // Merge with existing, preferring new values (but don't include subsidiaries - those become divisions)
        const mergedStructure = {
          ...existingStructure,
          ...detectedStructure,
          // Don't save subsidiaries to corporate_structure - they go to divisions now
          subsidiaries: existingStructure.subsidiaries || [],
        }

        await fetch(`/api/accounts/${accountId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ corporate_structure: mergedStructure }),
        })
      }

      // Create selected divisions
      const selectedDivisions = detectedDivisions.filter(d => d.selected)
      if (selectedDivisions.length > 0) {
        for (const div of selectedDivisions) {
          await fetch(`/api/accounts/${accountId}/divisions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: div.name,
              division_type: div.divisionType || 'subsidiary',
              parent_division_id: div.parentDivisionId || null,
            }),
          })
        }
      }

      // Close modal and refresh
      setIsOpen(false)
      setFindings([])
      setSummary(null)
      router.refresh()
    } catch (err) {
      console.error('Save error:', err)
      setError(err instanceof Error ? err.message : 'Failed to save signals. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  // Helper to determine if a category is financial
  const isFinancialCategory = (categoryId?: string): boolean => {
    if (!categoryId) return false
    return ['funding', 'financial', 'revenue', 'earnings', 'investment'].some(
      term => categoryId.toLowerCase().includes(term)
    )
  }

  // Map category to broader category
  const mapCategoryToCategory = (categoryId?: string): string => {
    if (!categoryId) return 'news'
    const mapping: Record<string, string> = {
      'company-overview': 'strategic',
      'leadership': 'people',
      'news': 'news',
      'partnerships': 'strategic',
      'product': 'product',
      'security': 'regulatory',
      'compliance': 'regulatory',
      'funding': 'financial',
      'ma': 'strategic',
      'hiring': 'people',
      'regulatory': 'regulatory',
      'security-incidents': 'regulatory',
      'product-launches': 'product',
      'leadership-changes': 'people',
      'competitor-news': 'competitive',
      'industry-trends': 'news',
      'people': 'people',
      'financial': 'financial',
    }
    return mapping[categoryId] || 'news'
  }

  const acceptedCount = findings.filter(f => f.status === 'accepted' || f.status === 'edited').length
  const pendingCount = findings.filter(f => f.status === 'pending').length

  const getModeIcon = (mode: SearchMode) => {
    switch (mode) {
      case 'intelligence': return '🔍'
      case 'people': return '👥'
      case 'news': return '📰'
    }
  }

  const getModeLabel = (mode: SearchMode) => {
    switch (mode) {
      case 'intelligence': return 'General Intelligence'
      case 'people': return 'Find People'
      case 'news': return 'News & Signals'
    }
  }

  const getModeDescription = (mode: SearchMode) => {
    switch (mode) {
      case 'intelligence': return 'Company overview, leadership, products, and general research'
      case 'people': return 'Find contacts in product security, engineering, and relevant teams'
      case 'news': return 'Recent news, regulatory changes, and competitor activity'
    }
  }

  return (
    <>
      {variant === 'button' ? (
        <button
          onClick={() => setIsOpen(true)}
          className="px-3 py-2 text-sm font-medium rounded-lg border transition-colors flex items-center gap-2"
          style={{
            borderColor: 'var(--scout-sunset)',
            color: 'var(--scout-sunset)',
            backgroundColor: 'transparent',
          }}
          title="Run AI research to update signals and insights"
        >
          <ScoutAIIcon size={16} />
          Update Signals
        </button>
      ) : (
        <button
          onClick={() => setIsOpen(true)}
          className="px-2 py-1 rounded-lg transition-all flex items-center gap-1.5 group hover:scale-105"
          style={{
            background: 'linear-gradient(135deg, rgba(210, 105, 30, 0.12) 0%, rgba(139, 69, 19, 0.08) 100%)',
            border: '1px solid rgba(210, 105, 30, 0.3)',
            color: 'var(--scout-sunset)',
            boxShadow: '0 1px 3px rgba(210, 105, 30, 0.15)',
          }}
          title={initialMode === 'people' ? 'Find people with AI' : initialMode === 'news' ? 'Search news & signals' : 'AI research'}
        >
          <ScoutAIIcon size={iconSize} className="group-hover:animate-pulse" />
          <span className="text-[10px] font-medium uppercase tracking-wide">
            {initialMode === 'people' ? 'AI' : initialMode === 'news' ? 'AI' : 'AI'}
          </span>
        </button>
      )}

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => !isResearching && !isSaving && setIsOpen(false)}
          />

          {/* Modal */}
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
                    Update Signals
                  </h2>
                  <p className="text-sm" style={{ color: 'var(--scout-earth-light)' }}>
                    {accountName}
                    {industry && <span className="ml-2 text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: 'var(--scout-parchment)' }}>{industry}</span>}
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
              {findings.length === 0 ? (
                <>
                  {/* Search Mode Selector */}
                  <div className="mb-5">
                    <p className="text-xs font-medium uppercase tracking-wide mb-2" style={{ color: 'var(--scout-earth-light)' }}>
                      Search Mode
                    </p>
                    <div className="grid grid-cols-3 gap-2">
                      {(['intelligence', 'people', 'news'] as SearchMode[]).map(mode => (
                        <button
                          key={mode}
                          onClick={() => setSearchMode(mode)}
                          className={`p-3 rounded-lg border text-left transition-all ${searchMode === mode ? 'ring-2 ring-offset-1 ring-amber-600' : ''}`}
                          style={{
                            borderColor: searchMode === mode ? 'var(--scout-sunset)' : 'var(--scout-border)',
                            backgroundColor: searchMode === mode ? 'rgba(210, 105, 30, 0.08)' : 'transparent',
                          }}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-lg">{getModeIcon(mode)}</span>
                            <span className="text-sm font-medium" style={{ color: 'var(--scout-earth)' }}>
                              {getModeLabel(mode)}
                            </span>
                          </div>
                          <p className="text-[10px] leading-snug" style={{ color: 'var(--scout-earth-light)' }}>
                            {getModeDescription(mode)}
                          </p>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Context Info - collapsible with scroll */}
                  {(campaignContext || companyContext) && (
                    <details className="mb-4">
                      <summary
                        className="text-[10px] font-medium uppercase tracking-wide cursor-pointer flex items-center gap-1 p-2 rounded-lg hover:bg-gray-50"
                        style={{ color: 'var(--scout-earth-light)' }}
                      >
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Context Being Used
                      </summary>
                      <div
                        className="mt-2 p-3 rounded-lg max-h-32 overflow-y-auto"
                        style={{ backgroundColor: 'var(--scout-parchment)' }}
                      >
                        {companyContext && (
                          <p className="text-xs mb-1" style={{ color: 'var(--scout-earth)' }}>
                            <span className="font-medium">Our Focus:</span> {companyContext}
                          </p>
                        )}
                        {campaignContext && (
                          <p className="text-xs" style={{ color: 'var(--scout-earth)' }}>
                            <span className="font-medium">Campaign:</span> {campaignContext}
                          </p>
                        )}
                      </div>
                    </details>
                  )}

                  {/* Mode-specific options */}
                  {searchMode === 'intelligence' && (
                    <>
                      <p className="text-sm mb-3" style={{ color: 'var(--scout-earth-light)' }}>
                        Select categories to research:
                      </p>
                      <div className="flex flex-wrap gap-2 mb-5">
                        {categories.map((category) => (
                          <button
                            key={category.id}
                            onClick={() => toggleCategory(category.id)}
                            className="px-3 py-1 rounded-full text-sm font-medium transition-all border"
                            style={{
                              backgroundColor: category.enabled ? 'var(--scout-sky)' : 'transparent',
                              borderColor: category.enabled ? 'var(--scout-sky)' : 'var(--scout-border)',
                              color: category.enabled ? '#ffffff' : 'var(--scout-earth-light)',
                            }}
                          >
                            {category.enabled && <span className="mr-1">✓</span>}
                            {category.name}
                          </button>
                        ))}
                      </div>
                    </>
                  )}

                  {searchMode === 'people' && (
                    <>
                      <p className="text-sm mb-3" style={{ color: 'var(--scout-earth-light)' }}>
                        Find people in these areas:
                      </p>
                      <div className="space-y-2 mb-4">
                        {PEOPLE_SEARCH_PROMPTS.map((prompt) => (
                          <button
                            key={prompt}
                            onClick={() => togglePeopleSearch(prompt)}
                            className="w-full flex items-center gap-2 p-2 rounded-lg border text-left transition-all"
                            style={{
                              backgroundColor: peopleSearchFocus.includes(prompt) ? 'rgba(56, 152, 199, 0.1)' : 'transparent',
                              borderColor: peopleSearchFocus.includes(prompt) ? 'var(--scout-sky)' : 'var(--scout-border)',
                            }}
                          >
                            <span
                              className="w-4 h-4 rounded border flex items-center justify-center text-xs"
                              style={{
                                borderColor: peopleSearchFocus.includes(prompt) ? 'var(--scout-sky)' : 'var(--scout-border)',
                                backgroundColor: peopleSearchFocus.includes(prompt) ? 'var(--scout-sky)' : 'transparent',
                                color: peopleSearchFocus.includes(prompt) ? 'white' : 'transparent',
                              }}
                            >
                              ✓
                            </span>
                            <span className="text-sm" style={{ color: 'var(--scout-earth)' }}>{prompt}</span>
                          </button>
                        ))}
                      </div>
                      <div>
                        <label className="text-xs font-medium" style={{ color: 'var(--scout-earth-light)' }}>
                          Custom search (optional):
                        </label>
                        <input
                          type="text"
                          value={customPeopleSearch}
                          onChange={(e) => setCustomPeopleSearch(e.target.value)}
                          placeholder="e.g., DevSecOps engineers, SBOM experts..."
                          className="w-full mt-1 px-3 py-2 text-sm rounded-lg border"
                          style={{ borderColor: 'var(--scout-border)' }}
                        />
                      </div>
                    </>
                  )}

                  {searchMode === 'news' && (
                    <>
                      <p className="text-sm mb-3" style={{ color: 'var(--scout-earth-light)' }}>
                        Search for news and signals in these areas:
                      </p>
                      <div className="flex flex-wrap gap-2 mb-4">
                        {newsCategories.map((category) => (
                          <button
                            key={category.id}
                            onClick={() => toggleNewsCategory(category.id)}
                            className="px-3 py-1 rounded-full text-sm font-medium transition-all border"
                            style={{
                              backgroundColor: category.enabled ? 'var(--scout-trail)' : 'transparent',
                              borderColor: category.enabled ? 'var(--scout-trail)' : 'var(--scout-border)',
                              color: category.enabled ? '#ffffff' : 'var(--scout-earth-light)',
                            }}
                          >
                            {category.enabled && <span className="mr-1">✓</span>}
                            {category.name}
                          </button>
                        ))}
                      </div>
                      <p className="text-xs" style={{ color: 'var(--scout-earth-light)' }}>
                        AI will search for relevant news about {accountName} and their competitors, focusing on topics relevant to your campaign and company context.
                      </p>
                    </>
                  )}

                  {error && (
                    <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200">
                      <p className="text-sm text-red-700">{error}</p>
                    </div>
                  )}

                  <button
                    onClick={runResearch}
                    disabled={isResearching || (searchMode === 'people' && peopleSearchFocus.length === 0 && !customPeopleSearch)}
                    className="w-full py-3 rounded-lg font-medium transition-all flex items-center justify-center gap-3 text-white disabled:opacity-60 mt-4"
                    style={{
                      background: isResearching
                        ? 'var(--scout-earth-light)'
                        : 'linear-gradient(135deg, var(--scout-saddle) 0%, var(--scout-sunset) 100%)',
                      boxShadow: isResearching ? 'none' : '0 4px 14px rgba(139, 69, 19, 0.3)',
                    }}
                  >
                    {isResearching ? (
                      <>
                        <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        <span>
                          {searchMode === 'people' ? 'Finding People...' : searchMode === 'news' ? 'Searching News...' : 'Researching...'}
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="text-lg">{getModeIcon(searchMode)}</span>
                        <span style={{ fontFamily: "'Bitter', Georgia, serif" }}>
                          {searchMode === 'people' ? 'Find People' : searchMode === 'news' ? 'Search News' : 'Start Research'}
                        </span>
                      </>
                    )}
                  </button>
                </>
              ) : (
                <>
                  {/* Results View */}
                  {summary && (
                    <div className="mb-5 p-3 rounded-lg border" style={{ backgroundColor: 'var(--scout-parchment)', borderColor: 'var(--scout-border)' }}>
                      <h3 className="text-sm font-medium mb-2" style={{ color: 'var(--scout-earth)' }}>Summary</h3>
                      <p className="text-sm" style={{ color: 'var(--scout-earth-light)' }}>{summary}</p>
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
                        Accept All Pending
                      </button>
                    </div>
                  )}

                  {error && (
                    <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200">
                      <p className="text-sm text-red-700">{error}</p>
                    </div>
                  )}

                  {/* Findings */}
                  <div className="space-y-3 mb-6">
                    {findings.map((finding) => (
                      <div
                        key={finding.id}
                        className={`p-3 rounded-lg border ${
                          finding.status === 'accepted' || finding.status === 'edited'
                            ? 'bg-green-50 border-green-200'
                            : finding.status === 'rejected'
                            ? 'bg-red-50 border-red-200 opacity-50'
                            : ''
                        }`}
                        style={
                          finding.status === 'pending'
                            ? { backgroundColor: 'var(--scout-parchment)', borderColor: 'var(--scout-border)' }
                            : undefined
                        }
                      >
                        <div className="flex justify-between items-start mb-2">
                          <span className="text-xs font-medium" style={{ color: 'var(--scout-sky)' }}>
                            {finding.categoryName}
                          </span>
                          <span
                            className="text-xs px-2 py-0.5 rounded-full"
                            style={{
                              backgroundColor: finding.confidence === 'high'
                                ? 'rgba(93, 122, 93, 0.15)'
                                : finding.confidence === 'medium'
                                ? 'rgba(210, 105, 30, 0.15)'
                                : 'var(--scout-border)',
                              color: finding.confidence === 'high'
                                ? 'var(--scout-trail)'
                                : finding.confidence === 'medium'
                                ? 'var(--scout-sunset)'
                                : 'var(--scout-earth-light)',
                            }}
                          >
                            {finding.confidence}
                          </span>
                        </div>

                        <h4 className="font-medium text-sm mb-1" style={{ color: 'var(--scout-earth)' }}>
                          {finding.title}
                        </h4>
                        <p className="text-sm mb-2" style={{ color: 'var(--scout-earth-light)' }}>
                          {finding.editedContent || finding.content}
                        </p>

                        {/* Source links */}
                        {((finding.sourceUrls?.length ?? 0) > 0 || (finding.sources?.length ?? 0) > 0) && (
                          <div className="flex flex-wrap gap-2 mb-3 text-[10px]">
                            {finding.sourceUrls?.map((url, i) => (
                              <a
                                key={i}
                                href={url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 px-1.5 py-0.5 rounded hover:underline"
                                style={{ backgroundColor: 'var(--scout-parchment)', color: 'var(--scout-sky)' }}
                              >
                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                </svg>
                                {finding.sources?.[i] || `Source ${i + 1}`}
                              </a>
                            ))}
                            {!(finding.sourceUrls?.length) && finding.sources?.map((source, i) => (
                              <span
                                key={i}
                                className="px-1.5 py-0.5 rounded"
                                style={{ backgroundColor: 'var(--scout-parchment)', color: 'var(--scout-earth-light)' }}
                              >
                                {source}
                              </span>
                            ))}
                          </div>
                        )}

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
                              Reject
                            </button>
                          </div>
                        )}

                        {(finding.status === 'accepted' || finding.status === 'edited') && (
                          <div className="space-y-2">
                            {/* Detected People Pills - show for ALL modes */}
                            {finding.detectedPeople && finding.detectedPeople.length > 0 && (
                              <div className="pt-1">
                                <p className="text-[10px] font-medium mb-1.5" style={{ color: 'var(--scout-earth-light)' }}>
                                  {searchMode === 'people' ? 'Select people to add as stakeholders:' : 'People detected - select to add:'}
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
                                      {person.selected && (
                                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                      )}
                                      <span>{person.name}</span>
                                      {person.title && (
                                        <span className="opacity-60">({person.title})</span>
                                      )}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Non-people mode: show full entity linking options */}
                            {searchMode !== 'people' && (
                              <>
                                <div className="flex flex-wrap gap-2 items-center">
                                  {/* Link to Stakeholder */}
                                  {stakeholders.length > 0 && (
                                    <select
                                      value={finding.stakeholder_id || ''}
                                      onChange={(e) => updateFindingLinking(finding.id, {
                                        stakeholder_id: e.target.value || undefined,
                                        createStakeholder: undefined
                                      })}
                                      className="text-xs px-2 py-1 rounded border"
                                      style={{ borderColor: 'var(--scout-border)', maxWidth: '140px' }}
                                    >
                                      <option value="">Link to person...</option>
                                      {stakeholders.map(s => (
                                        <option key={s.stakeholder_id} value={s.stakeholder_id}>
                                          {s.full_name}
                                        </option>
                                      ))}
                                    </select>
                                  )}

                                  {/* Link to Pursuit */}
                                  {pursuits.length > 0 && (
                                    <select
                                      value={finding.pursuit_id || ''}
                                      onChange={(e) => updateFindingLinking(finding.id, { pursuit_id: e.target.value || undefined })}
                                      className="text-xs px-2 py-1 rounded border"
                                      style={{ borderColor: 'var(--scout-border)', maxWidth: '140px' }}
                                    >
                                      <option value="">Link to deal...</option>
                                      {pursuits.map(p => (
                                        <option key={p.pursuit_id} value={p.pursuit_id}>
                                          {p.name}
                                        </option>
                                      ))}
                                    </select>
                                  )}

                                  {/* Mark as Financial */}
                                  <label className="flex items-center gap-1 text-xs cursor-pointer">
                                    <input
                                      type="checkbox"
                                      checked={finding.is_financial || false}
                                      onChange={(e) => updateFindingLinking(finding.id, { is_financial: e.target.checked })}
                                      className="w-3 h-3"
                                    />
                                    <span style={{ color: 'var(--scout-earth-light)' }}>Financial</span>
                                  </label>
                                </div>

                            {/* Compelling Event / Buying Signal Tags */}
                            <div className="flex flex-wrap gap-3 items-center pt-1">
                              {/* Compelling Event */}
                              <div className="flex items-center gap-1">
                                <label className="flex items-center gap-1 text-xs cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={finding.is_compelling_event || false}
                                    onChange={(e) => updateFindingLinking(finding.id, {
                                      is_compelling_event: e.target.checked,
                                      event_impact: e.target.checked ? 'medium' : undefined
                                    })}
                                    className="w-3 h-3"
                                  />
                                  <span style={{ color: 'var(--scout-sunset)' }}>Compelling Event</span>
                                </label>
                                {finding.is_compelling_event && (
                                  <select
                                    value={finding.event_impact || 'medium'}
                                    onChange={(e) => updateFindingLinking(finding.id, {
                                      event_impact: e.target.value as 'high' | 'medium' | 'low'
                                    })}
                                    className="text-[10px] px-1 py-0.5 rounded border ml-1"
                                    style={{ borderColor: 'var(--scout-border)' }}
                                  >
                                    <option value="high">High Impact</option>
                                    <option value="medium">Medium</option>
                                    <option value="low">Low</option>
                                  </select>
                                )}
                              </div>

                              {/* Buying Signal */}
                              <div className="flex items-center gap-1">
                                <label className="flex items-center gap-1 text-xs cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={finding.is_buying_signal || false}
                                    onChange={(e) => updateFindingLinking(finding.id, {
                                      is_buying_signal: e.target.checked,
                                      signal_strength: e.target.checked ? 'moderate' : undefined
                                    })}
                                    className="w-3 h-3"
                                  />
                                  <span style={{ color: 'var(--scout-trail)' }}>Buying Signal</span>
                                </label>
                                {finding.is_buying_signal && (
                                  <select
                                    value={finding.signal_strength || 'moderate'}
                                    onChange={(e) => updateFindingLinking(finding.id, {
                                      signal_strength: e.target.value as 'strong' | 'moderate' | 'weak'
                                    })}
                                    className="text-[10px] px-1 py-0.5 rounded border ml-1"
                                    style={{ borderColor: 'var(--scout-border)' }}
                                  >
                                    <option value="strong">Strong</option>
                                    <option value="moderate">Moderate</option>
                                    <option value="weak">Weak</option>
                                  </select>
                                )}
                              </div>

                              {/* Competitive Intelligence */}
                              <label className="flex items-center gap-1 text-xs cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={finding.is_competitive || false}
                                  onChange={(e) => updateFindingLinking(finding.id, { is_competitive: e.target.checked })}
                                  className="w-3 h-3"
                                />
                                <span style={{ color: 'var(--scout-clay)' }}>Competitive Intel</span>
                              </label>
                            </div>

                            {/* Create New Stakeholder Option - for manual entry or when no detection */}
                            {(finding.categoryId === 'leadership' || finding.categoryId === 'people' || finding.categoryId === 'leadership-changes') && !finding.stakeholder_id && !(finding.detectedPeople && finding.detectedPeople.length > 0) && (
                              <div className="pt-1">
                                {!finding.createStakeholder ? (
                                  <button
                                    onClick={() => updateFindingLinking(finding.id, {
                                      createStakeholder: { full_name: '', title: '', notes: finding.content }
                                    })}
                                    className="text-xs flex items-center gap-1"
                                    style={{ color: 'var(--scout-sky)' }}
                                  >
                                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                    </svg>
                                    Add as new stakeholder
                                  </button>
                                ) : (
                                  <div className="flex gap-2 items-center">
                                    <input
                                      type="text"
                                      value={finding.createStakeholder.full_name}
                                      onChange={(e) => updateFindingLinking(finding.id, {
                                        createStakeholder: { ...finding.createStakeholder!, full_name: e.target.value }
                                      })}
                                      placeholder="Name"
                                      className="text-xs px-2 py-1 rounded border flex-1"
                                      style={{ borderColor: 'var(--scout-border)' }}
                                    />
                                    <input
                                      type="text"
                                      value={finding.createStakeholder.title || ''}
                                      onChange={(e) => updateFindingLinking(finding.id, {
                                        createStakeholder: { ...finding.createStakeholder!, title: e.target.value }
                                      })}
                                      placeholder="Title"
                                      className="text-xs px-2 py-1 rounded border flex-1"
                                      style={{ borderColor: 'var(--scout-border)' }}
                                    />
                                    <button
                                      onClick={() => updateFindingLinking(finding.id, { createStakeholder: undefined })}
                                      className="text-xs"
                                      style={{ color: 'var(--scout-clay)' }}
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                )}
                              </div>
                            )}
                              </>
                            )}

                            <button
                              onClick={() => updateFindingStatus(finding.id, 'pending')}
                              className="text-xs"
                              style={{ color: 'var(--scout-earth-light)' }}
                            >
                              Undo
                            </button>
                          </div>
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

                  {/* Detected Corporate Structure */}
                  {detectedStructure && Object.keys(detectedStructure).length > 0 && (
                    <div className="p-3 rounded-lg border mb-4" style={{ backgroundColor: 'rgba(93, 122, 93, 0.08)', borderColor: 'var(--scout-trail)' }}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <svg className="w-4 h-4" style={{ color: 'var(--scout-trail)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                          </svg>
                          <span className="text-xs font-medium" style={{ color: 'var(--scout-trail)' }}>
                            Corporate Structure Detected
                          </span>
                        </div>
                        <label className="flex items-center gap-1 text-xs cursor-pointer">
                          <input
                            type="checkbox"
                            checked={saveStructure}
                            onChange={(e) => setSaveStructure(e.target.checked)}
                            className="w-3 h-3"
                          />
                          <span style={{ color: 'var(--scout-earth-light)' }}>Update profile</span>
                        </label>
                      </div>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                        {detectedStructure.parent_company && (
                          <div>
                            <span style={{ color: 'var(--scout-earth-light)' }}>Parent: </span>
                            <span style={{ color: 'var(--scout-earth)' }}>{detectedStructure.parent_company}</span>
                          </div>
                        )}
                        {detectedStructure.ownership_type && (
                          <div>
                            <span style={{ color: 'var(--scout-earth-light)' }}>Type: </span>
                            <span className="capitalize" style={{ color: 'var(--scout-earth)' }}>{detectedStructure.ownership_type}</span>
                          </div>
                        )}
                        {detectedStructure.stock_symbol && (
                          <div>
                            <span style={{ color: 'var(--scout-earth-light)' }}>Ticker: </span>
                            <span style={{ color: 'var(--scout-earth)' }}>{detectedStructure.stock_symbol}</span>
                          </div>
                        )}
                        {detectedStructure.headquarters && (
                          <div>
                            <span style={{ color: 'var(--scout-earth-light)' }}>HQ: </span>
                            <span style={{ color: 'var(--scout-earth)' }}>{detectedStructure.headquarters}</span>
                          </div>
                        )}
                        {detectedStructure.ceo && (
                          <div>
                            <span style={{ color: 'var(--scout-earth-light)' }}>CEO: </span>
                            <span style={{ color: 'var(--scout-earth)' }}>{detectedStructure.ceo}</span>
                          </div>
                        )}
                        {detectedStructure.founded_year && (
                          <div>
                            <span style={{ color: 'var(--scout-earth-light)' }}>Founded: </span>
                            <span style={{ color: 'var(--scout-earth)' }}>{detectedStructure.founded_year}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Detected Divisions/Subsidiaries */}
                  {detectedDivisions.length > 0 && (
                    <div className="p-3 rounded-lg border mb-4" style={{ backgroundColor: 'rgba(56, 152, 199, 0.08)', borderColor: 'var(--scout-sky)' }}>
                      <div className="flex items-center gap-2 mb-3">
                        <svg className="w-4 h-4" style={{ color: 'var(--scout-sky)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                        </svg>
                        <span className="text-xs font-medium" style={{ color: 'var(--scout-sky)' }}>
                          Add as Divisions ({detectedDivisions.filter(d => d.selected).length} selected)
                        </span>
                      </div>
                      <div className="space-y-2">
                        {detectedDivisions.map(div => (
                          <div
                            key={div.name}
                            className="flex items-center justify-between gap-2 p-2 rounded-lg"
                            style={{
                              backgroundColor: div.selected ? 'rgba(56, 152, 199, 0.1)' : 'transparent',
                              border: div.selected ? '1px solid var(--scout-sky)' : '1px solid var(--scout-border)',
                            }}
                          >
                            <label className="flex items-center gap-2 cursor-pointer flex-1">
                              <input
                                type="checkbox"
                                checked={div.selected}
                                onChange={() => toggleDetectedDivision(div.name)}
                                className="w-3 h-3"
                              />
                              <span className="text-xs font-medium" style={{ color: 'var(--scout-earth)' }}>
                                {div.name}
                              </span>
                              <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ backgroundColor: 'var(--scout-parchment)', color: 'var(--scout-earth-light)' }}>
                                {div.divisionType || 'division'}
                              </span>
                            </label>
                            {div.selected && divisions.length > 0 && (
                              <select
                                value={div.parentDivisionId || ''}
                                onChange={(e) => updateDivisionParent(div.name, e.target.value || undefined)}
                                className="text-[10px] px-1.5 py-1 rounded border"
                                style={{ borderColor: 'var(--scout-border)' }}
                              >
                                <option value="">New top-level division</option>
                                <optgroup label="Child of existing division">
                                  {divisions.map(d => (
                                    <option key={d.division_id} value={d.division_id}>
                                      {d.name}
                                    </option>
                                  ))}
                                </optgroup>
                              </select>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex justify-between items-center pt-4 border-t" style={{ borderColor: 'var(--scout-border)' }}>
                    <button
                      onClick={() => {
                        setFindings([])
                        setSummary(null)
                        setDetectedStructure(null)
                        setSaveStructure(false)
                        setDetectedDivisions([])
                      }}
                      className="text-sm"
                      style={{ color: 'var(--scout-earth-light)' }}
                    >
                      Clear & Re-run
                    </button>
                    <button
                      onClick={saveFindings}
                      disabled={acceptedCount === 0 || isSaving}
                      className="px-5 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-50"
                      style={{ backgroundColor: 'var(--scout-saddle)' }}
                    >
                      {isSaving ? 'Saving...' : `Save ${acceptedCount} Signal${acceptedCount !== 1 ? 's' : ''}`}
                    </button>
                  </div>
                </>
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
  // Map to valid database signal_type values:
  // 'regulatory', 'leadership', 'product', 'incident', 'strategic', 'funding', 'expansion', 'news'
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
    'security-incidents': 'incident',
    'product-launches': 'product',
    'leadership-changes': 'leadership',
    'competitor-news': 'strategic',
    'industry-trends': 'news',
    'people': 'strategic',
  }
  return mapping[categoryId] || 'news'
}
