'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ScoutAIIcon } from '@/components/ui/scout-logo'

interface Campaign {
  campaign_id: string
  name: string
  type: string
  status?: string
  value_proposition?: string
  key_pain_points?: string
  regulatory_context?: string
  signal_triggers?: string
  target_verticals?: string[]
}

interface CompanyInfo {
  company_name: string
  website?: string
  industry?: string
  vertical?: string
  employee_count?: string | number
  headquarters?: string
  company_summary?: string
}

interface ResearchFinding {
  id: string
  categoryId: string
  categoryName: string
  title: string
  content: string
  confidence: 'high' | 'medium' | 'low'
  sources: string[]
  status: 'pending' | 'accepted' | 'rejected'
  targetField?: 'risk' | 'compelling_event' | 'buying_signal' | 'thesis' | 'summary'
}

interface Division {
  id: string
  name: string
  description?: string
  division_type?: string
  products?: string[]
  headcount?: number
  revenue_estimate?: string
  key_focus_areas?: string[]
}

interface CorporateStructure {
  headquarters?: string
  parent_company?: string
  ownership_type?: string
  stock_symbol?: string
  employee_count?: number
  annual_revenue?: string
  founded_year?: number
  ceo?: string
}

interface Stakeholder {
  id: string
  name: string
  title: string
  department?: string
  influence_level: 'high' | 'medium' | 'low'
  relevance?: string
  known: boolean
  selected: boolean
}

interface ScoutTheme {
  title: string
  description: string
  why_it_matters: string
  size: 'high' | 'medium' | 'low'
  key_stakeholders: string[]
  questions_to_explore: string[]
}

interface ActionItem {
  description: string
  bucket: '30' | '60' | '90'
  priority: 'high' | 'medium' | 'low'
  type: 'research' | 'outreach' | 'meeting' | 'internal' | 'follow_up'
  stakeholder?: string
  linked_question?: string
}

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
}

interface AccountEnrichmentWorkflowProps {
  accountId: string
  accountType: 'tam' | 'account_plan'
  initialData: CompanyInfo
  campaigns: Campaign[]
  initialCampaignIds?: string[]
}

type StepNumber = 1 | 2 | 3 | 4 | 5 | 6 | 7

export function AccountEnrichmentWorkflow({
  accountId,
  accountType,
  initialData,
  campaigns,
  initialCampaignIds = [],
}: AccountEnrichmentWorkflowProps) {
  const router = useRouter()
  const chatEndRef = useRef<HTMLDivElement>(null)

  // Step tracking (1-7)
  const [currentStep, setCurrentStep] = useState<StepNumber>(1)

  // Step 1: Basic Info
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo>(initialData)
  const [isSavingInfo, setIsSavingInfo] = useState(false)
  const [step1Error, setStep1Error] = useState<string | null>(null)

  // Step 2: Campaign & Research
  const [selectedCampaigns, setSelectedCampaigns] = useState<string[]>(initialCampaignIds)
  const [isResearching, setIsResearching] = useState(false)
  const [researchError, setResearchError] = useState<string | null>(null)
  const [findings, setFindings] = useState<ResearchFinding[]>([])
  const [researchSummary, setResearchSummary] = useState<string | null>(null)
  const [thesis, setThesis] = useState<string>('')

  // Step 3: Structure Enrichment
  const [isEnrichingStructure, setIsEnrichingStructure] = useState(false)
  const [corporateStructure, setCorporateStructure] = useState<CorporateStructure | null>(null)
  const [divisions, setDivisions] = useState<Division[]>([])
  const [structureError, setStructureError] = useState<string | null>(null)

  // Step 4: People Discovery
  const [isDiscoveringPeople, setIsDiscoveringPeople] = useState(false)
  const [stakeholders, setStakeholders] = useState<Stakeholder[]>([])
  const [orgInsights, setOrgInsights] = useState<string>('')
  const [peopleError, setPeopleError] = useState<string | null>(null)

  // Step 5: Revenue Theory Chat
  const [revenueMessages, setRevenueMessages] = useState<ChatMessage[]>([])
  const [revenueInput, setRevenueInput] = useState('')
  const [isRevenueLoading, setIsRevenueLoading] = useState(false)
  const [scoutTheme, setScoutTheme] = useState<ScoutTheme | null>(null)

  // Step 6: 30/60/90 Plan Chat
  const [planMessages, setPlanMessages] = useState<ChatMessage[]>([])
  const [planInput, setPlanInput] = useState('')
  const [isPlanLoading, setIsPlanLoading] = useState(false)
  const [actionPlan, setActionPlan] = useState<ActionItem[]>([])

  // Step 7: Create
  const [isCreatingAccount, setIsCreatingAccount] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  // Auto-lookup website if missing
  const [isLookingUpWebsite, setIsLookingUpWebsite] = useState(false)

  useEffect(() => {
    // If website is missing and we have a company name, auto-lookup
    if (!companyInfo.website && companyInfo.company_name && currentStep === 1) {
      const lookupWebsite = async () => {
        setIsLookingUpWebsite(true)
        try {
          const res = await fetch('/api/ai/company-lookup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: companyInfo.company_name }),
          })
          if (res.ok) {
            const data = await res.json()
            if (data.company?.website) {
              setCompanyInfo(prev => ({
                ...prev,
                website: data.company.website,
                // Also fill in any other missing fields
                industry: prev.industry || data.company.industry,
                headquarters: prev.headquarters || data.company.headquarters,
                employee_count: prev.employee_count || data.company.employeeCount,
              }))
            }
          }
        } catch (error) {
          console.error('Website lookup failed:', error)
        } finally {
          setIsLookingUpWebsite(false)
        }
      }
      lookupWebsite()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Run once on mount

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [revenueMessages, planMessages])

  // Step 1: Update and save basic info
  const updateField = (field: keyof CompanyInfo, value: string) => {
    setCompanyInfo(prev => ({ ...prev, [field]: value }))
  }

  const saveBasicInfo = async () => {
    setIsSavingInfo(true)
    setStep1Error(null)
    try {
      const apiUrl = accountType === 'tam' ? `/api/tam/${accountId}` : `/api/accounts/${accountId}`
      console.log('Saving basic info to:', apiUrl, companyInfo)
      const res = await fetch(apiUrl, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(companyInfo),
      })
      if (res.ok) {
        setCurrentStep(2)
      } else {
        const errorData = await res.json().catch(() => ({ error: 'Unknown error' }))
        console.error('Save basic info failed:', res.status, errorData)
        setStep1Error(errorData.error || `Failed to save (${res.status})`)
      }
    } catch (error) {
      console.error('Failed to save basic info:', error)
      setStep1Error(error instanceof Error ? error.message : 'Failed to save info')
    } finally {
      setIsSavingInfo(false)
    }
  }

  // Step 2: Campaign selection and research
  const toggleCampaign = (campaignId: string) => {
    setSelectedCampaigns(prev =>
      prev.includes(campaignId) ? prev.filter(id => id !== campaignId) : [...prev, campaignId]
    )
  }

  const runResearch = async () => {
    setIsResearching(true)
    setResearchError(null)
    try {
      const res = await fetch('/api/ai/contextual-research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName: companyInfo.company_name,
          domain: companyInfo.website,
          vertical: companyInfo.vertical || companyInfo.industry,
          campaign_ids: selectedCampaigns,
        }),
      })
      if (!res.ok) throw new Error('Research failed')
      const data = await res.json()
      const research = data.research || data
      const mappedFindings: ResearchFinding[] = (research.findings || []).map((f: ResearchFinding) => ({
        ...f,
        status: 'pending' as const,
        targetField: suggestTargetField(f.categoryId),
      }))
      setFindings(mappedFindings)
      setResearchSummary(research.summary)
      if (research.thesis) setThesis(research.thesis)
    } catch {
      setResearchError('Research failed. Please try again.')
    } finally {
      setIsResearching(false)
    }
  }

  const suggestTargetField = (categoryId: string): ResearchFinding['targetField'] => {
    const mapping: Record<string, ResearchFinding['targetField']> = {
      regulatory: 'compelling_event', compliance: 'compelling_event',
      news: 'buying_signal', signal: 'buying_signal',
      risk: 'risk', challenge: 'risk',
      opportunity: 'thesis', alignment: 'thesis',
    }
    for (const [key, value] of Object.entries(mapping)) {
      if (categoryId.toLowerCase().includes(key)) return value
    }
    return 'summary'
  }

  const updateFinding = (findingId: string, updates: Partial<ResearchFinding>) => {
    setFindings(prev => prev.map(f => f.id === findingId ? { ...f, ...updates } : f))
  }

  const saveResearchAndContinue = async () => {
    // Just move to next step - we'll save everything at the end
    setCurrentStep(3)
  }

  // Step 3: Structure enrichment
  const enrichStructure = async () => {
    setIsEnrichingStructure(true)
    setStructureError(null)
    try {
      const res = await fetch('/api/ai/enrich-structure', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName: companyInfo.company_name,
          domain: companyInfo.website,
          industry: companyInfo.vertical || companyInfo.industry,
        }),
      })
      if (!res.ok) throw new Error('Failed')
      const data = await res.json()
      if (data.corporateStructure) setCorporateStructure(data.corporateStructure)
      if (data.divisions?.length > 0) setDivisions(data.divisions)
    } catch {
      setStructureError('Structure enrichment failed. You can skip or try again.')
    } finally {
      setIsEnrichingStructure(false)
    }
  }

  const removeDivision = (id: string) => {
    setDivisions(prev => prev.filter(d => d.id !== id))
  }

  // Step 4: People discovery
  const discoverPeople = async () => {
    setIsDiscoveringPeople(true)
    setPeopleError(null)
    try {
      const selectedCampaignData = campaigns.filter(c => selectedCampaigns.includes(c.campaign_id))
      const campaignContext = selectedCampaignData.map(c => c.key_pain_points || c.value_proposition).filter(Boolean).join('; ')

      const res = await fetch('/api/ai/research-people', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName: companyInfo.company_name,
          domain: companyInfo.website,
          industry: companyInfo.vertical || companyInfo.industry,
          divisions: divisions.map(d => d.name),
          campaignContext,
        }),
      })
      if (!res.ok) throw new Error('Failed')
      const data = await res.json()
      const mappedStakeholders: Stakeholder[] = (data.people || []).map((p: { name: string; title: string; department?: string; influence_level?: string; relevance?: string; known?: boolean }, i: number) => ({
        id: `person-${i}`,
        name: p.name,
        title: p.title,
        department: p.department,
        influence_level: p.influence_level || 'medium',
        relevance: p.relevance,
        known: p.known !== false,
        selected: true,
      }))
      setStakeholders(mappedStakeholders)
      setOrgInsights(data.orgInsights || '')
    } catch {
      setPeopleError('People discovery failed. You can add stakeholders manually later.')
    } finally {
      setIsDiscoveringPeople(false)
    }
  }

  const toggleStakeholder = (id: string) => {
    setStakeholders(prev => prev.map(s => s.id === id ? { ...s, selected: !s.selected } : s))
  }

  // Step 5: Revenue Theory Chat
  const startRevenueTheory = async () => {
    if (revenueMessages.length > 0) return
    setIsRevenueLoading(true)
    try {
      const acceptedFindings = findings.filter(f => f.status === 'accepted')
      const selectedStakeholders = stakeholders.filter(s => s.selected)

      const res = await fetch('/api/ai/revenue-theory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountContext: {
            companyName: companyInfo.company_name,
            industry: companyInfo.industry,
            vertical: companyInfo.vertical,
            website: companyInfo.website,
            employeeCount: companyInfo.employee_count,
            headquarters: companyInfo.headquarters,
            companyDescription: companyInfo.company_summary,
            divisions: divisions.map(d => ({ name: d.name, description: d.description, products: d.products })),
            stakeholders: selectedStakeholders.map(s => ({
              name: s.name, title: s.title, department: s.department, influence_level: s.influence_level
            })),
            signals: acceptedFindings.map(f => ({ title: f.title, content: f.content, category: f.categoryName })),
            campaigns: campaigns.filter(c => selectedCampaigns.includes(c.campaign_id)).map(c => ({
              name: c.name, painPoints: c.key_pain_points, valueProposition: c.value_proposition
            })),
          },
          stage: 'initial',
        }),
      })
      if (!res.ok) throw new Error('Failed')
      const data = await res.json()
      setRevenueMessages([{ id: 'initial', role: 'assistant', content: data.message }])
    } catch (error) {
      console.error('Revenue theory failed:', error)
    } finally {
      setIsRevenueLoading(false)
    }
  }

  const sendRevenueMessage = async (finalize = false) => {
    if (!revenueInput.trim() && !finalize) return
    const userMsg = revenueInput.trim() || (finalize ? 'Finalize my Scout Theme' : '')
    setRevenueInput('')
    setRevenueMessages(prev => [...prev, { id: `user-${Date.now()}`, role: 'user', content: userMsg }])
    setIsRevenueLoading(true)

    try {
      const acceptedFindings = findings.filter(f => f.status === 'accepted')
      const selectedStakeholders = stakeholders.filter(s => s.selected)

      const res = await fetch('/api/ai/revenue-theory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountContext: {
            companyName: companyInfo.company_name,
            industry: companyInfo.industry,
            vertical: companyInfo.vertical,
            divisions: divisions.map(d => ({ name: d.name, description: d.description })),
            stakeholders: selectedStakeholders.map(s => ({ name: s.name, title: s.title, department: s.department })),
            signals: acceptedFindings.map(f => ({ title: f.title, content: f.content })),
            campaigns: campaigns.filter(c => selectedCampaigns.includes(c.campaign_id)).map(c => ({
              name: c.name, painPoints: c.key_pain_points
            })),
          },
          userMessage: userMsg,
          conversationHistory: revenueMessages.map(m => ({ role: m.role, content: m.content })),
          stage: finalize ? 'finalize' : 'refine',
        }),
      })
      if (!res.ok) throw new Error('Failed')
      const data = await res.json()
      setRevenueMessages(prev => [...prev, { id: `assistant-${Date.now()}`, role: 'assistant', content: data.message }])
      if (data.theme) setScoutTheme(data.theme)
    } catch (error) {
      console.error('Revenue message failed:', error)
    } finally {
      setIsRevenueLoading(false)
    }
  }

  // Step 6: Plan Builder Chat
  const startPlanBuilder = async () => {
    if (planMessages.length > 0 || !scoutTheme) return
    setIsPlanLoading(true)
    try {
      const selectedStakeholders = stakeholders.filter(s => s.selected)

      const res = await fetch('/api/ai/plan-builder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName: companyInfo.company_name,
          scoutTheme,
          stakeholders: selectedStakeholders.map(s => ({
            name: s.name, title: s.title, department: s.department, influence_level: s.influence_level
          })),
          stage: 'initial',
        }),
      })
      if (!res.ok) throw new Error('Failed')
      const data = await res.json()
      setPlanMessages([{ id: 'initial', role: 'assistant', content: data.message }])
    } catch (error) {
      console.error('Plan builder failed:', error)
    } finally {
      setIsPlanLoading(false)
    }
  }

  const sendPlanMessage = async (finalize = false) => {
    if (!planInput.trim() && !finalize) return
    const userMsg = planInput.trim() || (finalize ? 'Finalize my 30/60/90 plan' : '')
    setPlanInput('')
    setPlanMessages(prev => [...prev, { id: `user-${Date.now()}`, role: 'user', content: userMsg }])
    setIsPlanLoading(true)

    try {
      const selectedStakeholders = stakeholders.filter(s => s.selected)

      const res = await fetch('/api/ai/plan-builder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName: companyInfo.company_name,
          scoutTheme,
          stakeholders: selectedStakeholders.map(s => ({ name: s.name, title: s.title, influence_level: s.influence_level })),
          userMessage: userMsg,
          conversationHistory: planMessages.map(m => ({ role: m.role, content: m.content })),
          stage: finalize ? 'finalize' : 'refine',
        }),
      })
      if (!res.ok) throw new Error('Failed')
      const data = await res.json()
      setPlanMessages(prev => [...prev, { id: `assistant-${Date.now()}`, role: 'assistant', content: data.message }])
      if (data.plan?.actions) setActionPlan(data.plan.actions)
    } catch (error) {
      console.error('Plan message failed:', error)
    } finally {
      setIsPlanLoading(false)
    }
  }

  // Step 7: Create Account
  const createAccountPlan = async () => {
    setIsCreatingAccount(true)
    setCreateError(null)
    try {
      const acceptedFindings = findings.filter(f => f.status === 'accepted')
      const compellingEvents = acceptedFindings.filter(f => f.targetField === 'compelling_event')
      const buyingSignals = acceptedFindings.filter(f => f.targetField === 'buying_signal')
      const selectedStakeholders = stakeholders.filter(s => s.selected)

      // Create the account plan
      const accountRes = await fetch('/api/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          account_name: companyInfo.company_name,
          website: companyInfo.website,
          industry: companyInfo.industry,
          vertical: companyInfo.vertical,
          employee_count: companyInfo.employee_count,
          headquarters: companyInfo.headquarters || corporateStructure?.headquarters,
          description: companyInfo.company_summary,
          corporate_structure: corporateStructure,
          enrichment_status: 'enriched',
          enrichment_source: 'scout_ai',
          last_enriched_at: new Date().toISOString(),
          account_thesis: scoutTheme?.description || thesis,
          campaign_ids: selectedCampaigns,
          compelling_events: compellingEvents.map(f => ({
            event: f.content,
            source: f.sources[0] || 'AI Research',
            impact: f.confidence === 'high' ? 'high' : f.confidence === 'medium' ? 'medium' : 'low',
          })),
          buying_signals: buyingSignals.map(f => ({
            signal: f.content,
            type: f.categoryName,
            source: f.sources[0] || 'AI Research',
            strength: f.confidence === 'high' ? 'strong' : f.confidence === 'medium' ? 'moderate' : 'weak',
          })),
          tam_account_id: accountType === 'tam' ? accountId : undefined,
        }),
      })

      if (!accountRes.ok) {
        const err = await accountRes.json()
        throw new Error(err.error || 'Failed to create account')
      }

      const { account } = await accountRes.json()
      const accountPlanId = account.account_plan_id

      // Create divisions
      for (const div of divisions) {
        await fetch(`/api/accounts/${accountPlanId}/divisions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: div.name,
            description: div.description,
            division_type: div.division_type || 'division',
            products: div.products,
          }),
        })
      }

      // Create stakeholders
      for (const s of selectedStakeholders) {
        await fetch(`/api/accounts/${accountPlanId}/stakeholders`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            full_name: s.name,
            title: s.title,
            department: s.department,
            influence_level: s.influence_level,
          }),
        })
      }

      // Create Scout Theme
      if (scoutTheme) {
        await fetch('/api/scout-themes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            account_plan_id: accountPlanId,
            title: scoutTheme.title,
            description: scoutTheme.description,
            why_it_matters: scoutTheme.why_it_matters,
            size: scoutTheme.size,
            questions_to_explore: scoutTheme.questions_to_explore,
          }),
        })
      }

      // Create action items in tracker
      for (const action of actionPlan) {
        const targetDate = new Date()
        if (action.bucket === '30') targetDate.setDate(targetDate.getDate() + 30)
        else if (action.bucket === '60') targetDate.setDate(targetDate.getDate() + 60)
        else targetDate.setDate(targetDate.getDate() + 90)

        await fetch(`/api/accounts/${accountPlanId}/actions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: action.description,
            due_date: targetDate.toISOString().split('T')[0],
            priority: action.priority === 'high' ? 'High' : action.priority === 'medium' ? 'Medium' : 'Low',
            description: action.linked_question ? `Related to: ${action.linked_question}` : undefined,
          }),
        })
      }

      // Update TAM account if needed
      if (accountType === 'tam') {
        await fetch(`/api/tam/${accountId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            promoted_to_account_plan_id: accountPlanId,
            promoted_at: new Date().toISOString(),
            status: 'Converted',
          }),
        })
      }

      // Navigate to the new territory (production route)
      router.push(`/territory/${accountPlanId}`)
    } catch (error) {
      console.error('Failed to create account:', error)
      setCreateError(error instanceof Error ? error.message : 'Failed to create account')
    } finally {
      setIsCreatingAccount(false)
    }
  }

  const pendingFindings = findings.filter(f => f.status === 'pending')
  const acceptedFindings = findings.filter(f => f.status === 'accepted')
  const selectedStakeholders = stakeholders.filter(s => s.selected)

  const steps = [
    { num: 1, label: 'URL' },
    { num: 2, label: 'Research' },
    { num: 3, label: 'Structure' },
    { num: 4, label: 'People' },
    { num: 5, label: 'Theme' },
    { num: 6, label: 'Plan' },
    { num: 7, label: 'Create' },
  ]

  return (
    <div className="space-y-6">
      {/* Progress Steps */}
      <div className="flex items-center gap-1 mb-6 overflow-x-auto pb-2">
        {steps.map((step, idx) => (
          <div key={step.num} className="flex items-center">
            <button
              onClick={() => currentStep > step.num ? setCurrentStep(step.num as StepNumber) : undefined}
              disabled={currentStep < step.num}
              className="flex items-center gap-1.5"
            >
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium"
                style={{
                  backgroundColor: currentStep > step.num ? 'var(--scout-trail)' : currentStep === step.num ? 'var(--scout-saddle)' : 'var(--scout-border)',
                  color: currentStep >= step.num ? 'white' : 'var(--scout-earth-light)',
                }}
              >
                {currentStep > step.num ? '✓' : step.num}
              </div>
              <span
                className="text-xs font-medium hidden sm:inline"
                style={{ color: currentStep === step.num ? 'var(--scout-saddle)' : 'var(--scout-earth-light)' }}
              >
                {step.label}
              </span>
            </button>
            {idx < steps.length - 1 && <div className="w-4 h-px mx-1" style={{ backgroundColor: 'var(--scout-border)' }} />}
          </div>
        ))}
      </div>

      {/* Step 1: URL Confirmation */}
      {currentStep === 1 && (
        <StepCard title="Confirm Corporate Website" subtitle="Verify the correct URL before research">
          {step1Error && (
            <div className="mb-4 p-3 rounded-lg text-sm" style={{ backgroundColor: 'rgba(169, 68, 66, 0.1)', color: 'var(--scout-clay)' }}>
              Error: {step1Error}
            </div>
          )}
          <div className="p-4 rounded-lg mb-4" style={{ backgroundColor: 'var(--scout-parchment)' }}>
            <h3 className="font-semibold" style={{ color: 'var(--scout-saddle)' }}>{companyInfo.company_name}</h3>
            <div className="flex items-center gap-3 mt-1 text-sm" style={{ color: 'var(--scout-earth-light)' }}>
              {companyInfo.vertical && <span>{companyInfo.vertical}</span>}
              {companyInfo.employee_count && <><span>•</span><span>{companyInfo.employee_count} employees</span></>}
            </div>
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--scout-earth)' }}>Corporate Website</label>
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: 'var(--scout-earth-light)' }}>https://</span>
                <input
                  type="text"
                  value={companyInfo.website || ''}
                  onChange={(e) => updateField('website', e.target.value)}
                  className="w-full pl-16 pr-3 py-2.5 rounded-lg border text-sm"
                  style={{ borderColor: 'var(--scout-border)', backgroundColor: 'var(--scout-parchment)' }}
                  placeholder={isLookingUpWebsite ? 'Looking up website...' : 'company.com'}
                  disabled={isLookingUpWebsite}
                />
                {isLookingUpWebsite && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <svg className="animate-spin h-4 w-4" style={{ color: 'var(--scout-sky)' }} viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                  </div>
                )}
              </div>
              {companyInfo.website && !isLookingUpWebsite && (
                <a
                  href={`https://${companyInfo.website}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-2.5 rounded-lg border text-sm hover:bg-gray-50"
                  style={{ borderColor: 'var(--scout-border)', color: 'var(--scout-sky)' }}
                >
                  Verify
                </a>
              )}
            </div>
            {isLookingUpWebsite && (
              <p className="text-xs mt-1" style={{ color: 'var(--scout-sky)' }}>
                Looking up corporate website for {companyInfo.company_name}...
              </p>
            )}
          </div>
          <div className="flex justify-end pt-4 border-t" style={{ borderColor: 'var(--scout-border)' }}>
            <button
              onClick={saveBasicInfo}
              disabled={isSavingInfo || isLookingUpWebsite || !companyInfo.website}
              className="px-5 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-50"
              style={{ backgroundColor: 'var(--scout-saddle)' }}
            >
              {isSavingInfo ? 'Saving...' : 'Continue →'}
            </button>
          </div>
        </StepCard>
      )}

      {/* Step 2: Campaign & Research */}
      {currentStep === 2 && (
        <div className="space-y-4">
          <StepCard title="Select Campaigns" subtitle="Choose campaigns to focus the research">
            <div className="space-y-2">
              {campaigns.map(campaign => (
                <button
                  key={campaign.campaign_id}
                  onClick={() => toggleCampaign(campaign.campaign_id)}
                  className="w-full text-left p-3 rounded-lg border transition-all"
                  style={{
                    backgroundColor: selectedCampaigns.includes(campaign.campaign_id) ? 'var(--scout-saddle)' : 'transparent',
                    borderColor: selectedCampaigns.includes(campaign.campaign_id) ? 'var(--scout-saddle)' : 'var(--scout-border)',
                  }}
                >
                  <div className="flex items-center gap-2">
                    {selectedCampaigns.includes(campaign.campaign_id) && <span className="text-white">✓</span>}
                    <span className="font-medium" style={{ color: selectedCampaigns.includes(campaign.campaign_id) ? 'white' : 'var(--scout-earth)' }}>
                      {campaign.name}
                    </span>
                  </div>
                  {campaign.key_pain_points && (
                    <p className="text-xs mt-1 line-clamp-2" style={{ color: selectedCampaigns.includes(campaign.campaign_id) ? 'rgba(255,255,255,0.7)' : 'var(--scout-earth-light)' }}>
                      {campaign.key_pain_points}
                    </p>
                  )}
                </button>
              ))}
            </div>
          </StepCard>

          <StepCard title="AI Research" subtitle={`Research ${companyInfo.company_name} with campaign context`}>
            {findings.length === 0 ? (
              <>
                {researchError && <p className="text-sm text-red-600 mb-3">{researchError}</p>}
                <AIButton onClick={runResearch} loading={isResearching} label="Start Research" loadingLabel="Researching..." />
              </>
            ) : (
              <div className="space-y-4">
                {researchSummary && (
                  <div className="p-3 rounded-lg" style={{ backgroundColor: 'var(--scout-parchment)' }}>
                    <p className="text-sm" style={{ color: 'var(--scout-earth-light)' }}>{researchSummary}</p>
                  </div>
                )}
                {pendingFindings.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium" style={{ color: 'var(--scout-earth)' }}>Review Findings ({pendingFindings.length})</h4>
                    {pendingFindings.map(f => (
                      <FindingCard key={f.id} finding={f} onAccept={(tf) => updateFinding(f.id, { status: 'accepted', targetField: tf })} onReject={() => updateFinding(f.id, { status: 'rejected' })} />
                    ))}
                  </div>
                )}
                {acceptedFindings.length > 0 && (
                  <p className="text-sm" style={{ color: 'var(--scout-trail)' }}>✓ {acceptedFindings.length} findings accepted</p>
                )}
                <div className="flex justify-end pt-4 border-t" style={{ borderColor: 'var(--scout-border)' }}>
                  <button onClick={saveResearchAndContinue} className="px-5 py-2 rounded-lg text-sm font-medium text-white" style={{ backgroundColor: 'var(--scout-saddle)' }}>
                    Continue to Structure →
                  </button>
                </div>
              </div>
            )}
          </StepCard>
        </div>
      )}

      {/* Step 3: Structure */}
      {currentStep === 3 && (
        <StepCard title="Corporate Structure" subtitle={`Discover ${companyInfo.company_name}'s divisions`}>
          {structureError && <p className="text-sm text-amber-600 mb-3">{structureError}</p>}
          {divisions.length === 0 && !corporateStructure ? (
            <div className="space-y-3">
              <AIButton onClick={enrichStructure} loading={isEnrichingStructure} label="Enrich Structure" loadingLabel="Discovering..." />
              <button onClick={() => setCurrentStep(4)} className="w-full py-2 text-sm" style={{ color: 'var(--scout-earth-light)' }}>Skip →</button>
            </div>
          ) : (
            <div className="space-y-4">
              {divisions.length > 0 && (
                <div className="space-y-2">
                  {divisions.map(div => (
                    <div key={div.id} className="p-3 rounded-lg border flex justify-between" style={{ borderColor: 'var(--scout-border)' }}>
                      <div>
                        <p className="font-medium text-sm" style={{ color: 'var(--scout-saddle)' }}>{div.name}</p>
                        {div.description && <p className="text-xs" style={{ color: 'var(--scout-earth-light)' }}>{div.description}</p>}
                      </div>
                      <button onClick={() => removeDivision(div.id)} className="text-xs" style={{ color: 'var(--scout-clay)' }}>✕</button>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex justify-end pt-4 border-t" style={{ borderColor: 'var(--scout-border)' }}>
                <button onClick={() => setCurrentStep(4)} className="px-5 py-2 rounded-lg text-sm font-medium text-white" style={{ backgroundColor: 'var(--scout-saddle)' }}>
                  Continue to People →
                </button>
              </div>
            </div>
          )}
        </StepCard>
      )}

      {/* Step 4: People Discovery */}
      {currentStep === 4 && (
        <StepCard title="Key Stakeholders" subtitle="Discover people to engage">
          {peopleError && <p className="text-sm text-amber-600 mb-3">{peopleError}</p>}
          {stakeholders.length === 0 ? (
            <div className="space-y-3">
              <AIButton onClick={discoverPeople} loading={isDiscoveringPeople} label="Discover Key People" loadingLabel="Discovering..." />
              <button onClick={() => setCurrentStep(5)} className="w-full py-2 text-sm" style={{ color: 'var(--scout-earth-light)' }}>Skip →</button>
            </div>
          ) : (
            <div className="space-y-4">
              {orgInsights && (
                <div className="p-3 rounded-lg" style={{ backgroundColor: 'var(--scout-parchment)' }}>
                  <p className="text-xs font-medium mb-1" style={{ color: 'var(--scout-earth-light)' }}>Org Insights</p>
                  <p className="text-sm" style={{ color: 'var(--scout-earth)' }}>{orgInsights}</p>
                </div>
              )}
              <div className="space-y-2">
                {stakeholders.map(s => (
                  <button
                    key={s.id}
                    onClick={() => toggleStakeholder(s.id)}
                    className="w-full text-left p-3 rounded-lg border transition-all"
                    style={{
                      backgroundColor: s.selected ? 'rgba(93, 122, 93, 0.1)' : 'transparent',
                      borderColor: s.selected ? 'var(--scout-trail)' : 'var(--scout-border)',
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-sm" style={{ color: 'var(--scout-saddle)' }}>
                          {s.selected && '✓ '}{s.name}
                        </p>
                        <p className="text-xs" style={{ color: 'var(--scout-earth-light)' }}>{s.title}</p>
                      </div>
                      <span className="text-xs px-2 py-0.5 rounded" style={{
                        backgroundColor: s.influence_level === 'high' ? 'rgba(93,122,93,0.15)' : 'var(--scout-parchment)',
                        color: s.influence_level === 'high' ? 'var(--scout-trail)' : 'var(--scout-earth-light)'
                      }}>
                        {s.influence_level}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
              <p className="text-xs" style={{ color: 'var(--scout-earth-light)' }}>{selectedStakeholders.length} selected</p>
              <div className="flex justify-end pt-4 border-t" style={{ borderColor: 'var(--scout-border)' }}>
                <button onClick={() => { setCurrentStep(5); startRevenueTheory() }} className="px-5 py-2 rounded-lg text-sm font-medium text-white" style={{ backgroundColor: 'var(--scout-saddle)' }}>
                  Define Scout Theme →
                </button>
              </div>
            </div>
          )}
        </StepCard>
      )}

      {/* Step 5: Revenue Theory Chat */}
      {currentStep === 5 && (
        <StepCard title="Define Your Scout Theme" subtitle="Let's build your opportunity hypothesis">
          <ChatInterface
            messages={revenueMessages}
            input={revenueInput}
            setInput={setRevenueInput}
            onSend={() => sendRevenueMessage()}
            onFinalize={() => sendRevenueMessage(true)}
            isLoading={isRevenueLoading}
            finalizeLabel="Finalize Theme"
            canFinalize={revenueMessages.length >= 2}
            chatEndRef={chatEndRef}
          />
          {scoutTheme && (
            <div className="mt-4 p-4 rounded-lg border-2" style={{ borderColor: 'var(--scout-trail)', backgroundColor: 'rgba(93,122,93,0.05)' }}>
              <h4 className="font-semibold text-sm mb-2" style={{ color: 'var(--scout-trail)' }}>✓ Scout Theme Defined</h4>
              <p className="font-medium" style={{ color: 'var(--scout-saddle)' }}>{scoutTheme.title}</p>
              <p className="text-sm mt-1" style={{ color: 'var(--scout-earth)' }}>{scoutTheme.description}</p>

              {/* Value Sizing Selection - REQUIRED before proceeding */}
              <div className="mt-4 pt-4 border-t" style={{ borderColor: 'var(--scout-border)' }}>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--scout-earth)' }}>
                  Value Sizing <span style={{ color: 'var(--scout-clay)' }}>*</span>
                </label>
                <p className="text-xs mb-3" style={{ color: 'var(--scout-earth-light)' }}>
                  Set the estimated value potential for this opportunity
                </p>
                <div className="flex gap-2">
                  {[
                    { value: 'high', label: '$$$ High', desc: '> $500K potential' },
                    { value: 'medium', label: '$$ Medium', desc: '$100K - $500K' },
                    { value: 'low', label: '$ Low', desc: '< $100K' },
                  ].map(option => (
                    <button
                      key={option.value}
                      onClick={() => setScoutTheme({ ...scoutTheme, size: option.value as 'high' | 'medium' | 'low' })}
                      className="flex-1 p-3 rounded-lg border text-center transition-all"
                      style={{
                        borderColor: scoutTheme.size === option.value ? 'var(--scout-trail)' : 'var(--scout-border)',
                        backgroundColor: scoutTheme.size === option.value ? 'rgba(93,122,93,0.15)' : 'transparent',
                      }}
                    >
                      <p className="font-medium text-sm" style={{
                        color: scoutTheme.size === option.value ? 'var(--scout-trail)' : 'var(--scout-saddle)'
                      }}>
                        {option.label}
                      </p>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--scout-earth-light)' }}>
                        {option.desc}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex justify-end mt-4">
                <button
                  onClick={() => { setCurrentStep(6); startPlanBuilder() }}
                  disabled={!scoutTheme.size}
                  className="px-5 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-50"
                  style={{ backgroundColor: 'var(--scout-saddle)' }}
                >
                  Build 30/60/90 Plan →
                </button>
              </div>
            </div>
          )}
        </StepCard>
      )}

      {/* Step 6: Plan Builder Chat */}
      {currentStep === 6 && (
        <StepCard title="Build Your 30/60/90 Plan" subtitle="Create realistic actions to pursue this theme">
          <ChatInterface
            messages={planMessages}
            input={planInput}
            setInput={setPlanInput}
            onSend={() => sendPlanMessage()}
            onFinalize={() => sendPlanMessage(true)}
            isLoading={isPlanLoading}
            finalizeLabel="Finalize Plan"
            canFinalize={planMessages.length >= 2}
            chatEndRef={chatEndRef}
          />
          {actionPlan.length > 0 && (
            <div className="mt-4 p-4 rounded-lg border-2" style={{ borderColor: 'var(--scout-trail)', backgroundColor: 'rgba(93,122,93,0.05)' }}>
              <h4 className="font-semibold text-sm mb-3" style={{ color: 'var(--scout-trail)' }}>✓ Plan Created ({actionPlan.length} actions)</h4>
              <div className="grid grid-cols-3 gap-3">
                {['30', '60', '90'].map(bucket => (
                  <div key={bucket}>
                    <p className="text-xs font-medium mb-2" style={{ color: 'var(--scout-earth-light)' }}>{bucket} Days</p>
                    {actionPlan.filter(a => a.bucket === bucket).map((a, i) => (
                      <p key={i} className="text-xs mb-1" style={{ color: 'var(--scout-earth)' }}>• {a.description}</p>
                    ))}
                  </div>
                ))}
              </div>
              <div className="flex justify-end mt-4">
                <button onClick={() => setCurrentStep(7)} className="px-5 py-2 rounded-lg text-sm font-medium text-white" style={{ backgroundColor: 'var(--scout-saddle)' }}>
                  Review & Create →
                </button>
              </div>
            </div>
          )}
        </StepCard>
      )}

      {/* Step 7: Create */}
      {currentStep === 7 && (
        <StepCard title="Create Account Plan" subtitle="Review and create your execution-ready account">
          {createError && <p className="text-sm text-red-600 mb-3">{createError}</p>}
          <div className="space-y-3">
            <SummaryRow label="Company" value={companyInfo.company_name} />
            <SummaryRow label="Website" value={companyInfo.website} />
            <SummaryRow label="Campaigns" value={`${selectedCampaigns.length} selected`} />
            <SummaryRow label="Divisions" value={`${divisions.length} mapped`} />
            <SummaryRow label="Stakeholders" value={`${selectedStakeholders.length} identified`} />
            <SummaryRow label="Scout Theme" value={scoutTheme?.title || 'None'} />
            <SummaryRow label="Actions" value={`${actionPlan.length} in 30/60/90 plan`} />
          </div>
          <div className="flex justify-end pt-6 border-t mt-6" style={{ borderColor: 'var(--scout-border)' }}>
            <button
              onClick={createAccountPlan}
              disabled={isCreatingAccount}
              className="px-6 py-3 rounded-lg font-medium text-white disabled:opacity-50 flex items-center gap-2"
              style={{ background: 'linear-gradient(135deg, var(--scout-saddle) 0%, var(--scout-sunset) 100%)' }}
            >
              {isCreatingAccount ? (
                <><Spinner /> Creating Account...</>
              ) : (
                <><ScoutAIIcon size={20} className="text-white" /> Create Account Plan</>
              )}
            </button>
          </div>
        </StepCard>
      )}
    </div>
  )
}

// Helper Components
function StepCard({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border p-5" style={{ backgroundColor: 'var(--scout-white)', borderColor: 'var(--scout-border)' }}>
      <h2 className="text-lg font-semibold mb-1" style={{ color: 'var(--scout-saddle)' }}>{title}</h2>
      <p className="text-sm mb-4" style={{ color: 'var(--scout-earth-light)' }}>{subtitle}</p>
      {children}
    </div>
  )
}

function AIButton({ onClick, loading, label, loadingLabel }: { onClick: () => void; loading: boolean; label: string; loadingLabel: string }) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className="w-full py-3 rounded-lg font-medium text-white disabled:opacity-60 flex items-center justify-center gap-2"
      style={{ background: loading ? 'var(--scout-earth-light)' : 'linear-gradient(135deg, var(--scout-saddle) 0%, var(--scout-sunset) 100%)' }}
    >
      {loading ? <><Spinner /> {loadingLabel}</> : <><ScoutAIIcon size={20} className="text-white" /> {label}</>}
    </button>
  )
}

function Spinner() {
  return (
    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  )
}

function FindingCard({ finding, onAccept, onReject }: { finding: ResearchFinding; onAccept: (tf: ResearchFinding['targetField']) => void; onReject: () => void }) {
  const [target, setTarget] = useState<ResearchFinding['targetField']>(finding.targetField || 'summary')
  return (
    <div className="p-3 rounded-lg border" style={{ backgroundColor: 'var(--scout-parchment)', borderColor: 'var(--scout-border)' }}>
      <div className="flex justify-between mb-2">
        <span className="text-xs font-medium" style={{ color: 'var(--scout-sky)' }}>{finding.categoryName}</span>
        <span className="text-xs" style={{ color: finding.confidence === 'high' ? 'var(--scout-trail)' : 'var(--scout-earth-light)' }}>{finding.confidence}</span>
      </div>
      <p className="text-sm mb-3" style={{ color: 'var(--scout-earth)' }}>{finding.content}</p>
      <div className="flex items-center gap-2">
        <select value={target} onChange={e => setTarget(e.target.value as ResearchFinding['targetField'])} className="text-xs px-2 py-1 rounded border" style={{ borderColor: 'var(--scout-border)' }}>
          <option value="compelling_event">Compelling Event</option>
          <option value="buying_signal">Buying Signal</option>
          <option value="risk">Risk</option>
          <option value="thesis">Thesis</option>
          <option value="summary">Summary</option>
        </select>
        <button onClick={() => onAccept(target)} className="px-3 py-1 text-xs text-white rounded" style={{ backgroundColor: 'var(--scout-trail)' }}>Accept</button>
        <button onClick={onReject} className="text-xs" style={{ color: 'var(--scout-clay)' }}>Reject</button>
      </div>
    </div>
  )
}

function ChatInterface({ messages, input, setInput, onSend, onFinalize, isLoading, finalizeLabel, canFinalize, chatEndRef }: {
  messages: ChatMessage[]; input: string; setInput: (v: string) => void; onSend: () => void; onFinalize: () => void; isLoading: boolean; finalizeLabel: string; canFinalize: boolean; chatEndRef: React.RefObject<HTMLDivElement | null>
}) {
  return (
    <div className="space-y-3">
      <div className="max-h-80 overflow-y-auto space-y-3 p-3 rounded-lg" style={{ backgroundColor: 'var(--scout-parchment)' }}>
        {messages.map(m => (
          <div key={m.id} className={m.role === 'user' ? 'flex justify-end' : ''}>
            <div
              className="rounded-lg px-3 py-2 max-w-[85%] text-sm whitespace-pre-wrap"
              style={{
                backgroundColor: m.role === 'user' ? 'var(--scout-saddle)' : 'var(--scout-white)',
                color: m.role === 'user' ? 'white' : 'var(--scout-earth)',
              }}
            >
              {m.content}
            </div>
          </div>
        ))}
        {isLoading && <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--scout-earth-light)' }}><Spinner /> Thinking...</div>}
        <div ref={chatEndRef} />
      </div>
      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && onSend()}
          placeholder="Type your response..."
          className="flex-1 px-3 py-2 rounded-lg border text-sm"
          style={{ borderColor: 'var(--scout-border)', backgroundColor: 'var(--scout-parchment)' }}
          disabled={isLoading}
        />
        <button onClick={onSend} disabled={isLoading || !input.trim()} className="px-4 py-2 rounded-lg text-sm text-white disabled:opacity-50" style={{ backgroundColor: 'var(--scout-saddle)' }}>
          Send
        </button>
      </div>
      {canFinalize && (
        <button onClick={onFinalize} disabled={isLoading} className="w-full py-2 rounded-lg text-sm font-medium border disabled:opacity-50" style={{ borderColor: 'var(--scout-trail)', color: 'var(--scout-trail)' }}>
          {finalizeLabel}
        </button>
      )}
    </div>
  )
}

function SummaryRow({ label, value }: { label: string; value?: string }) {
  return (
    <div className="flex justify-between py-2 border-b" style={{ borderColor: 'var(--scout-border)' }}>
      <span className="text-sm" style={{ color: 'var(--scout-earth-light)' }}>{label}</span>
      <span className="text-sm font-medium" style={{ color: 'var(--scout-saddle)' }}>{value || '-'}</span>
    </div>
  )
}
