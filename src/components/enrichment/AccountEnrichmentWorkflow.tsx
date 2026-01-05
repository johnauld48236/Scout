'use client'

import { useState } from 'react'
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

interface AccountEnrichmentWorkflowProps {
  accountId: string
  accountType: 'tam' | 'account_plan'
  initialData: CompanyInfo
  campaigns: Campaign[]
  initialCampaignIds?: string[]
}

export function AccountEnrichmentWorkflow({
  accountId,
  accountType,
  initialData,
  campaigns,
  initialCampaignIds = [],
}: AccountEnrichmentWorkflowProps) {
  const router = useRouter()

  // Step tracking (1-4)
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1)

  // Step 1: Basic Info
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo>(initialData)
  const [isSavingInfo, setIsSavingInfo] = useState(false)

  // Step 2: Campaign & Research
  const [selectedCampaigns, setSelectedCampaigns] = useState<string[]>(initialCampaignIds)
  const [isResearching, setIsResearching] = useState(false)
  const [researchError, setResearchError] = useState<string | null>(null)
  const [findings, setFindings] = useState<ResearchFinding[]>([])
  const [researchSummary, setResearchSummary] = useState<string | null>(null)
  const [thesis, setThesis] = useState<string>('')
  const [isSaving, setIsSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)

  // Step 3: Structure Enrichment
  const [isEnrichingStructure, setIsEnrichingStructure] = useState(false)
  const [corporateStructure, setCorporateStructure] = useState<CorporateStructure | null>(null)
  const [divisions, setDivisions] = useState<Division[]>([])
  const [structureError, setStructureError] = useState<string | null>(null)

  // Step 4: Create Account
  const [isCreatingAccount, setIsCreatingAccount] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  // Update company info field
  const updateField = (field: keyof CompanyInfo, value: string) => {
    setCompanyInfo(prev => ({ ...prev, [field]: value }))
  }

  // Save basic info
  const saveBasicInfo = async () => {
    setIsSavingInfo(true)
    try {
      const apiUrl = accountType === 'tam'
        ? `/api/tam/${accountId}`
        : `/api/accounts/${accountId}`

      const res = await fetch(apiUrl, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(companyInfo),
      })

      if (res.ok) {
        setCurrentStep(2)
      }
    } catch (error) {
      console.error('Failed to save basic info:', error)
    } finally {
      setIsSavingInfo(false)
    }
  }

  // Toggle campaign selection
  const toggleCampaign = (campaignId: string) => {
    setSelectedCampaigns(prev =>
      prev.includes(campaignId)
        ? prev.filter(id => id !== campaignId)
        : [...prev, campaignId]
    )
  }

  // Run contextual AI research
  const runResearch = async () => {
    setIsResearching(true)
    setResearchError(null)
    setFindings([])
    setResearchSummary(null)

    try {
      // Pass campaign IDs so the API can fetch full context (including markdown)
      const res = await fetch('/api/ai/contextual-research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName: companyInfo.company_name,
          domain: companyInfo.website,
          vertical: companyInfo.vertical || companyInfo.industry,
          campaign_ids: selectedCampaigns, // API will fetch full context from DB
        }),
      })

      if (!res.ok) {
        throw new Error('Research failed')
      }

      const data = await res.json()
      const research = data.research || data

      // Map findings with pending status
      const mappedFindings: ResearchFinding[] = (research.findings || []).map((f: ResearchFinding) => ({
        ...f,
        status: 'pending' as const,
        targetField: suggestTargetField(f.categoryId),
      }))

      setFindings(mappedFindings)
      setResearchSummary(research.summary)
      if (research.thesis) {
        setThesis(research.thesis)
      }
    } catch (error) {
      console.error('Research error:', error)
      setResearchError('Failed to research company. Please try again.')
    } finally {
      setIsResearching(false)
    }
  }

  // Suggest which field a finding should go to based on category
  const suggestTargetField = (categoryId: string): ResearchFinding['targetField'] => {
    const mapping: Record<string, ResearchFinding['targetField']> = {
      'regulatory': 'compelling_event',
      'compliance': 'compelling_event',
      'news': 'buying_signal',
      'signal': 'buying_signal',
      'risk': 'risk',
      'challenge': 'risk',
      'opportunity': 'thesis',
      'alignment': 'thesis',
    }

    for (const [key, value] of Object.entries(mapping)) {
      if (categoryId.toLowerCase().includes(key)) {
        return value
      }
    }
    return 'summary'
  }

  // Update finding status
  const updateFinding = (findingId: string, updates: Partial<ResearchFinding>) => {
    setFindings(prev =>
      prev.map(f => f.id === findingId ? { ...f, ...updates } : f)
    )
  }

  // Accept finding with target field
  const acceptFinding = (findingId: string, targetField: ResearchFinding['targetField']) => {
    updateFinding(findingId, { status: 'accepted', targetField })
  }

  // Reject finding
  const rejectFinding = (findingId: string) => {
    updateFinding(findingId, { status: 'rejected' })
  }

  // Save all accepted findings
  const saveFindings = async () => {
    setIsSaving(true)
    setSaveSuccess(false)

    try {
      const acceptedFindings = findings.filter(f => f.status === 'accepted')

      // Group findings by target field
      const risks = acceptedFindings.filter(f => f.targetField === 'risk')
      const compellingEvents = acceptedFindings.filter(f => f.targetField === 'compelling_event')
      const buyingSignals = acceptedFindings.filter(f => f.targetField === 'buying_signal')
      const thesisFindings = acceptedFindings.filter(f => f.targetField === 'thesis')

      const apiUrl = accountType === 'tam'
        ? `/api/tam/${accountId}`
        : `/api/accounts/${accountId}`

      // Build update payload
      const updateData: Record<string, unknown> = {
        campaign_ids: selectedCampaigns,
      }

      if (thesis) {
        updateData.account_thesis = thesis
      }

      if (compellingEvents.length > 0) {
        updateData.compelling_events = compellingEvents.map(f => ({
          id: f.id,
          title: f.title,
          description: f.content,
          source: f.sources[0] || 'AI Research',
          detected_date: new Date().toISOString(),
        }))
      }

      if (buyingSignals.length > 0) {
        updateData.buying_signals = buyingSignals.map(f => ({
          id: f.id,
          signal_type: f.categoryName,
          description: f.content,
          strength: f.confidence,
          detected_date: new Date().toISOString(),
          source: f.sources[0] || 'AI Research',
        }))
      }

      // Save main account data
      const res = await fetch(apiUrl, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      })

      if (!res.ok) {
        throw new Error('Failed to save')
      }

      // If there are risks and this is an account_plan, save to risks table
      if (risks.length > 0 && accountType === 'account_plan') {
        for (const risk of risks) {
          await fetch('/api/risks', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              account_plan_id: accountId,
              description: risk.content,
              severity: risk.confidence === 'high' ? 'high' : 'medium',
              category: risk.categoryName,
              source: 'ai_research',
            }),
          })
        }
      }

      setSaveSuccess(true)
      // Move to structure enrichment step
      setCurrentStep(3)
    } catch (error) {
      console.error('Failed to save findings:', error)
      setResearchError('Failed to save findings. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  // Step 3: Enrich corporate structure
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

      if (!res.ok) {
        throw new Error('Failed to enrich structure')
      }

      const data = await res.json()

      if (data.corporateStructure) {
        setCorporateStructure(data.corporateStructure)
      }

      if (data.divisions && data.divisions.length > 0) {
        setDivisions(data.divisions)
      }
    } catch (error) {
      console.error('Structure enrichment error:', error)
      setStructureError('Failed to enrich structure. You can skip this step or try again.')
    } finally {
      setIsEnrichingStructure(false)
    }
  }

  // Remove a division from the list
  const removeDivision = (divisionId: string) => {
    setDivisions(prev => prev.filter(d => d.id !== divisionId))
  }

  // Proceed to review/create step
  const proceedToCreate = () => {
    setCurrentStep(4)
  }

  // Step 4: Create the account plan
  const createAccountPlan = async () => {
    setIsCreatingAccount(true)
    setCreateError(null)

    try {
      const acceptedFindings = findings.filter(f => f.status === 'accepted')
      const compellingEvents = acceptedFindings.filter(f => f.targetField === 'compelling_event')
      const buyingSignals = acceptedFindings.filter(f => f.targetField === 'buying_signal')

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
          account_thesis: thesis,
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

      // Create divisions if we have them
      if (divisions.length > 0 && account.account_plan_id) {
        for (const div of divisions) {
          await fetch(`/api/accounts/${account.account_plan_id}/divisions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: div.name,
              description: div.description,
              division_type: div.division_type || 'division',
              products: div.products,
              headcount: div.headcount,
              revenue_estimate: div.revenue_estimate,
              key_focus_areas: div.key_focus_areas,
            }),
          })
        }
      }

      // If this is a TAM account, update it to link to the new account plan
      if (accountType === 'tam') {
        await fetch(`/api/tam/${accountId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            promoted_to_account_plan_id: account.account_plan_id,
            promoted_at: new Date().toISOString(),
            status: 'Converted',
          }),
        })
      }

      // Navigate to the new account
      router.push(`/accounts/${account.account_plan_id}`)
    } catch (error) {
      console.error('Failed to create account:', error)
      setCreateError(error instanceof Error ? error.message : 'Failed to create account plan')
    } finally {
      setIsCreatingAccount(false)
    }
  }

  const pendingFindings = findings.filter(f => f.status === 'pending')
  const acceptedFindings = findings.filter(f => f.status === 'accepted')

  return (
    <div className="space-y-6">
      {/* Progress Steps */}
      <div className="flex items-center gap-2 mb-6">
        <StepIndicator
          step={1}
          label="Info"
          isActive={currentStep === 1}
          isComplete={currentStep > 1}
          onClick={() => setCurrentStep(1)}
        />
        <div className="flex-1 h-px bg-zinc-300" />
        <StepIndicator
          step={2}
          label="Research"
          isActive={currentStep === 2}
          isComplete={currentStep > 2}
          onClick={() => currentStep > 1 ? setCurrentStep(2) : undefined}
        />
        <div className="flex-1 h-px bg-zinc-300" />
        <StepIndicator
          step={3}
          label="Structure"
          isActive={currentStep === 3}
          isComplete={currentStep > 3}
          onClick={() => currentStep > 2 ? setCurrentStep(3) : undefined}
        />
        <div className="flex-1 h-px bg-zinc-300" />
        <StepIndicator
          step={4}
          label="Create"
          isActive={currentStep === 4}
          isComplete={false}
          onClick={() => currentStep > 3 ? setCurrentStep(4) : undefined}
        />
      </div>

      {/* Step 1: Basic Info */}
      {currentStep === 1 && (
        <div className="rounded-lg border p-6" style={{ backgroundColor: 'var(--scout-white)', borderColor: 'var(--scout-border)' }}>
          <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--scout-saddle)' }}>
            Basic Company Information
          </h2>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--scout-earth)' }}>
                Company Name
              </label>
              <input
                type="text"
                value={companyInfo.company_name || ''}
                onChange={(e) => updateField('company_name', e.target.value)}
                className="w-full px-3 py-2 rounded-lg border text-sm"
                style={{ borderColor: 'var(--scout-border)', backgroundColor: 'var(--scout-parchment)' }}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--scout-earth)' }}>
                Website
              </label>
              <input
                type="text"
                value={companyInfo.website || ''}
                onChange={(e) => updateField('website', e.target.value)}
                className="w-full px-3 py-2 rounded-lg border text-sm"
                style={{ borderColor: 'var(--scout-border)', backgroundColor: 'var(--scout-parchment)' }}
                placeholder="example.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--scout-earth)' }}>
                Industry / Vertical
              </label>
              <input
                type="text"
                value={companyInfo.vertical || companyInfo.industry || ''}
                onChange={(e) => updateField('vertical', e.target.value)}
                className="w-full px-3 py-2 rounded-lg border text-sm"
                style={{ borderColor: 'var(--scout-border)', backgroundColor: 'var(--scout-parchment)' }}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--scout-earth)' }}>
                Employee Count
              </label>
              <input
                type="text"
                value={companyInfo.employee_count || ''}
                onChange={(e) => updateField('employee_count', e.target.value)}
                className="w-full px-3 py-2 rounded-lg border text-sm"
                style={{ borderColor: 'var(--scout-border)', backgroundColor: 'var(--scout-parchment)' }}
              />
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--scout-earth)' }}>
                Headquarters
              </label>
              <input
                type="text"
                value={companyInfo.headquarters || ''}
                onChange={(e) => updateField('headquarters', e.target.value)}
                className="w-full px-3 py-2 rounded-lg border text-sm"
                style={{ borderColor: 'var(--scout-border)', backgroundColor: 'var(--scout-parchment)' }}
              />
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--scout-earth)' }}>
                Company Summary
              </label>
              <textarea
                value={companyInfo.company_summary || ''}
                onChange={(e) => updateField('company_summary', e.target.value)}
                rows={3}
                className="w-full px-3 py-2 rounded-lg border text-sm resize-none"
                style={{ borderColor: 'var(--scout-border)', backgroundColor: 'var(--scout-parchment)' }}
              />
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <button
              onClick={saveBasicInfo}
              disabled={isSavingInfo || !companyInfo.company_name}
              className="px-5 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-50"
              style={{ backgroundColor: 'var(--scout-saddle)' }}
            >
              {isSavingInfo ? 'Saving...' : 'Continue to Research →'}
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Campaign & Research */}
      {currentStep === 2 && (
        <div className="space-y-6">
          {/* Campaign Selection */}
          <div className="rounded-lg border p-6" style={{ backgroundColor: 'var(--scout-white)', borderColor: 'var(--scout-border)' }}>
            <h2 className="text-lg font-semibold mb-2" style={{ color: 'var(--scout-saddle)' }}>
              Assign Campaign
            </h2>
            <p className="text-sm mb-4" style={{ color: 'var(--scout-earth-light)' }}>
              Select campaign(s) to focus the research on relevant pain points and regulations.
            </p>

            {campaigns.length === 0 ? (
              <div className="text-center py-6 rounded-lg" style={{ backgroundColor: 'var(--scout-parchment)' }}>
                <p className="text-sm" style={{ color: 'var(--scout-earth-light)' }}>
                  No campaigns available.
                </p>
                <a
                  href="/campaigns"
                  className="text-sm font-medium mt-2 inline-block"
                  style={{ color: 'var(--scout-sky)' }}
                >
                  Create campaigns in Settings →
                </a>
              </div>
            ) : (
              <div className="space-y-3">
                {campaigns.map(campaign => {
                  const isSelected = selectedCampaigns.includes(campaign.campaign_id)
                  return (
                    <button
                      key={campaign.campaign_id}
                      onClick={() => toggleCampaign(campaign.campaign_id)}
                      className="w-full text-left p-4 rounded-lg transition-all border"
                      style={{
                        backgroundColor: isSelected ? 'var(--scout-saddle)' : 'transparent',
                        borderColor: isSelected ? 'var(--scout-saddle)' : 'var(--scout-border)',
                      }}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          {isSelected && (
                            <span className="text-white">✓</span>
                          )}
                          <span
                            className="font-medium"
                            style={{ color: isSelected ? 'white' : 'var(--scout-earth)' }}
                          >
                            {campaign.name}
                          </span>
                          <span
                            className="text-xs px-2 py-0.5 rounded"
                            style={{
                              backgroundColor: isSelected ? 'rgba(255,255,255,0.2)' : 'var(--scout-parchment)',
                              color: isSelected ? 'rgba(255,255,255,0.8)' : 'var(--scout-earth-light)',
                            }}
                          >
                            {campaign.type}
                          </span>
                          {campaign.status === 'planned' && (
                            <span
                              className="text-xs px-2 py-0.5 rounded"
                              style={{
                                backgroundColor: isSelected ? 'rgba(255,255,255,0.2)' : '#fef3c7',
                                color: isSelected ? 'rgba(255,255,255,0.8)' : '#92400e',
                              }}
                            >
                              planned
                            </span>
                          )}
                        </div>
                      </div>
                      {(campaign.key_pain_points || campaign.value_proposition) && (
                        <p
                          className="text-sm mt-1 line-clamp-2"
                          style={{ color: isSelected ? 'rgba(255,255,255,0.8)' : 'var(--scout-earth-light)' }}
                        >
                          {campaign.key_pain_points || campaign.value_proposition}
                        </p>
                      )}
                      {campaign.target_verticals && campaign.target_verticals.length > 0 && (
                        <div className="flex gap-1 mt-2">
                          {campaign.target_verticals.slice(0, 3).map(v => (
                            <span
                              key={v}
                              className="text-xs px-2 py-0.5 rounded"
                              style={{
                                backgroundColor: isSelected ? 'rgba(255,255,255,0.15)' : 'var(--scout-border)',
                                color: isSelected ? 'rgba(255,255,255,0.7)' : 'var(--scout-earth-light)',
                              }}
                            >
                              {v}
                            </span>
                          ))}
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>
            )}

            {selectedCampaigns.length > 0 && (
              <div className="mt-4 p-4 rounded-lg border" style={{ backgroundColor: 'var(--scout-parchment)', borderColor: 'var(--scout-border)' }}>
                <p className="text-sm font-medium mb-2" style={{ color: 'var(--scout-earth)' }}>
                  Research will focus on:
                </p>
                {campaigns
                  .filter(c => selectedCampaigns.includes(c.campaign_id))
                  .map(c => (
                    <div key={c.campaign_id} className="mb-2 last:mb-0">
                      <p className="text-sm font-medium" style={{ color: 'var(--scout-saddle)' }}>{c.name}</p>
                      {c.key_pain_points && (
                        <p className="text-xs mt-0.5" style={{ color: 'var(--scout-earth-light)' }}>
                          Pain points: {c.key_pain_points}
                        </p>
                      )}
                      {c.regulatory_context && (
                        <p className="text-xs mt-0.5" style={{ color: 'var(--scout-earth-light)' }}>
                          Regulatory: {c.regulatory_context}
                        </p>
                      )}
                    </div>
                  ))}
              </div>
            )}
          </div>

          {/* AI Research */}
          <div className="rounded-lg border p-6" style={{ backgroundColor: 'var(--scout-white)', borderColor: 'var(--scout-border)' }}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <ScoutAIIcon size={24} className="text-amber-700" />
                <div>
                  <h2 className="text-lg font-semibold" style={{ color: 'var(--scout-saddle)' }}>
                    AI Research
                  </h2>
                  <p className="text-sm" style={{ color: 'var(--scout-earth-light)' }}>
                    Research {companyInfo.company_name} with campaign context
                  </p>
                </div>
              </div>

              {findings.length > 0 && (
                <button
                  onClick={() => {
                    setFindings([])
                    setResearchSummary(null)
                    setThesis('')
                  }}
                  className="text-sm"
                  style={{ color: 'var(--scout-earth-light)' }}
                >
                  Clear & Re-run
                </button>
              )}
            </div>

            {findings.length === 0 ? (
              <>
                {researchError && (
                  <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200">
                    <p className="text-sm text-red-700">{researchError}</p>
                  </div>
                )}

                <button
                  onClick={runResearch}
                  disabled={isResearching}
                  className="w-full py-3 rounded-lg font-medium transition-all flex items-center justify-center gap-3 text-white disabled:opacity-60"
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
                      <span>Researching {companyInfo.company_name}...</span>
                    </>
                  ) : (
                    <>
                      <ScoutAIIcon size={22} className="text-white" />
                      <span style={{ fontFamily: "'Bitter', Georgia, serif" }}>
                        Start Contextual Research
                      </span>
                    </>
                  )}
                </button>
              </>
            ) : (
              <div className="space-y-6">
                {/* Summary & Thesis */}
                {researchSummary && (
                  <div className="p-4 rounded-lg" style={{ backgroundColor: 'var(--scout-parchment)' }}>
                    <h3 className="text-sm font-medium mb-2" style={{ color: 'var(--scout-earth)' }}>
                      Research Summary
                    </h3>
                    <p className="text-sm" style={{ color: 'var(--scout-earth-light)' }}>
                      {researchSummary}
                    </p>
                  </div>
                )}

                {/* Thesis Editor */}
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: 'var(--scout-earth)' }}>
                    Account Thesis
                  </label>
                  <textarea
                    value={thesis}
                    onChange={(e) => setThesis(e.target.value)}
                    rows={3}
                    placeholder="Why should we pursue this account? What's the opportunity?"
                    className="w-full px-3 py-2 rounded-lg border text-sm resize-none"
                    style={{ borderColor: 'var(--scout-border)', backgroundColor: 'var(--scout-parchment)' }}
                  />
                </div>

                {/* Pending Findings */}
                {pendingFindings.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium mb-3" style={{ color: 'var(--scout-earth)' }}>
                      Review Findings ({pendingFindings.length} pending)
                    </h3>
                    <div className="space-y-3">
                      {pendingFindings.map(finding => (
                        <FindingCard
                          key={finding.id}
                          finding={finding}
                          onAccept={(targetField) => acceptFinding(finding.id, targetField)}
                          onReject={() => rejectFinding(finding.id)}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Accepted Findings */}
                {acceptedFindings.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium mb-3" style={{ color: 'var(--scout-trail)' }}>
                      Accepted ({acceptedFindings.length})
                    </h3>
                    <div className="space-y-2">
                      {acceptedFindings.map(finding => (
                        <div
                          key={finding.id}
                          className="p-3 rounded-lg border bg-green-50 border-green-200"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-xs font-medium text-green-700">
                                  {finding.categoryName}
                                </span>
                                <span className="text-xs px-2 py-0.5 rounded bg-green-100 text-green-700">
                                  → {formatTargetField(finding.targetField)}
                                </span>
                              </div>
                              <p className="text-sm text-zinc-700">{finding.content}</p>
                            </div>
                            <button
                              onClick={() => updateFinding(finding.id, { status: 'pending' })}
                              className="text-xs text-zinc-500 hover:underline ml-2"
                            >
                              Undo
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Save Button */}
                {(acceptedFindings.length > 0 || thesis) && (
                  <div className="pt-4 border-t flex items-center justify-between" style={{ borderColor: 'var(--scout-border)' }}>
                    {saveSuccess ? (
                      <span className="text-sm text-green-600 flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Saved! Moving to structure...
                      </span>
                    ) : (
                      <span className="text-sm" style={{ color: 'var(--scout-earth-light)' }}>
                        {acceptedFindings.length} finding(s) will be saved
                      </span>
                    )}
                    <button
                      onClick={saveFindings}
                      disabled={isSaving}
                      className="px-5 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-50"
                      style={{ backgroundColor: 'var(--scout-saddle)' }}
                    >
                      {isSaving ? 'Saving...' : 'Continue to Structure →'}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Step 3: Structure Enrichment */}
      {currentStep === 3 && (
        <div className="rounded-lg border p-6" style={{ backgroundColor: 'var(--scout-white)', borderColor: 'var(--scout-border)' }}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <ScoutAIIcon size={24} className="text-amber-700" />
              <div>
                <h2 className="text-lg font-semibold" style={{ color: 'var(--scout-saddle)' }}>
                  Corporate Structure
                </h2>
                <p className="text-sm" style={{ color: 'var(--scout-earth-light)' }}>
                  Discover {companyInfo.company_name}&apos;s divisions and products
                </p>
              </div>
            </div>
          </div>

          {structureError && (
            <div className="mb-4 p-3 rounded-lg bg-yellow-50 border border-yellow-200">
              <p className="text-sm text-yellow-700">{structureError}</p>
            </div>
          )}

          {!corporateStructure && divisions.length === 0 ? (
            <div className="space-y-4">
              <button
                onClick={enrichStructure}
                disabled={isEnrichingStructure}
                className="w-full py-3 rounded-lg font-medium transition-all flex items-center justify-center gap-3 text-white disabled:opacity-60"
                style={{
                  background: isEnrichingStructure
                    ? 'var(--scout-earth-light)'
                    : 'linear-gradient(135deg, var(--scout-saddle) 0%, var(--scout-sunset) 100%)',
                  boxShadow: isEnrichingStructure ? 'none' : '0 4px 14px rgba(139, 69, 19, 0.3)',
                }}
              >
                {isEnrichingStructure ? (
                  <>
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span>Discovering structure...</span>
                  </>
                ) : (
                  <>
                    <ScoutAIIcon size={22} className="text-white" />
                    <span style={{ fontFamily: "'Bitter', Georgia, serif" }}>
                      Enrich Corporate Structure
                    </span>
                  </>
                )}
              </button>

              <button
                onClick={proceedToCreate}
                className="w-full py-2 text-sm"
                style={{ color: 'var(--scout-earth-light)' }}
              >
                Skip this step →
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Corporate Profile - Editable */}
              <div className="p-4 rounded-lg" style={{ backgroundColor: 'var(--scout-parchment)' }}>
                <h3 className="text-sm font-medium mb-3" style={{ color: 'var(--scout-earth)' }}>
                  Corporate Profile
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs mb-1" style={{ color: 'var(--scout-earth-light)' }}>Headquarters</label>
                    <input
                      type="text"
                      value={corporateStructure?.headquarters || ''}
                      onChange={(e) => setCorporateStructure(prev => ({ ...prev, headquarters: e.target.value }))}
                      className="w-full px-2 py-1.5 text-sm rounded border"
                      style={{ borderColor: 'var(--scout-border)', backgroundColor: 'white' }}
                      placeholder="City, Country"
                    />
                  </div>
                  <div>
                    <label className="block text-xs mb-1" style={{ color: 'var(--scout-earth-light)' }}>Employees</label>
                    <input
                      type="number"
                      value={corporateStructure?.employee_count || ''}
                      onChange={(e) => setCorporateStructure(prev => ({ ...prev, employee_count: parseInt(e.target.value) || undefined }))}
                      className="w-full px-2 py-1.5 text-sm rounded border"
                      style={{ borderColor: 'var(--scout-border)', backgroundColor: 'white' }}
                      placeholder="50000"
                    />
                  </div>
                  <div>
                    <label className="block text-xs mb-1" style={{ color: 'var(--scout-earth-light)' }}>Annual Revenue</label>
                    <input
                      type="text"
                      value={corporateStructure?.annual_revenue || ''}
                      onChange={(e) => setCorporateStructure(prev => ({ ...prev, annual_revenue: e.target.value }))}
                      className="w-full px-2 py-1.5 text-sm rounded border"
                      style={{ borderColor: 'var(--scout-border)', backgroundColor: 'white' }}
                      placeholder="$10B"
                    />
                  </div>
                  <div>
                    <label className="block text-xs mb-1" style={{ color: 'var(--scout-earth-light)' }}>Ownership</label>
                    <select
                      value={corporateStructure?.ownership_type || ''}
                      onChange={(e) => setCorporateStructure(prev => ({ ...prev, ownership_type: e.target.value }))}
                      className="w-full px-2 py-1.5 text-sm rounded border"
                      style={{ borderColor: 'var(--scout-border)', backgroundColor: 'white' }}
                    >
                      <option value="">Select...</option>
                      <option value="public">Public</option>
                      <option value="private">Private</option>
                      <option value="subsidiary">Subsidiary</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs mb-1" style={{ color: 'var(--scout-earth-light)' }}>Stock Symbol</label>
                    <input
                      type="text"
                      value={corporateStructure?.stock_symbol || ''}
                      onChange={(e) => setCorporateStructure(prev => ({ ...prev, stock_symbol: e.target.value }))}
                      className="w-full px-2 py-1.5 text-sm rounded border"
                      style={{ borderColor: 'var(--scout-border)', backgroundColor: 'white' }}
                      placeholder="TICKER"
                    />
                  </div>
                  <div>
                    <label className="block text-xs mb-1" style={{ color: 'var(--scout-earth-light)' }}>CEO</label>
                    <input
                      type="text"
                      value={corporateStructure?.ceo || ''}
                      onChange={(e) => setCorporateStructure(prev => ({ ...prev, ceo: e.target.value }))}
                      className="w-full px-2 py-1.5 text-sm rounded border"
                      style={{ borderColor: 'var(--scout-border)', backgroundColor: 'white' }}
                      placeholder="CEO Name"
                    />
                  </div>
                </div>
              </div>

              {/* Divisions - Editable */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium" style={{ color: 'var(--scout-earth)' }}>
                    Divisions ({divisions.length})
                  </h3>
                  <button
                    onClick={() => setDivisions(prev => [...prev, {
                      id: `div-new-${Date.now()}`,
                      name: '',
                      description: '',
                      division_type: 'division',
                      products: [],
                    }])}
                    className="text-xs px-2 py-1 rounded border hover:bg-gray-50"
                    style={{ borderColor: 'var(--scout-border)', color: 'var(--scout-sky)' }}
                  >
                    + Add Division
                  </button>
                </div>
                <div className="space-y-3">
                  {divisions.map((div, idx) => (
                    <div
                      key={div.id}
                      className="p-3 rounded-lg border"
                      style={{ borderColor: 'var(--scout-border)', backgroundColor: 'var(--scout-parchment)' }}
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-1 space-y-2">
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={div.name}
                              onChange={(e) => {
                                const updated = [...divisions]
                                updated[idx] = { ...div, name: e.target.value }
                                setDivisions(updated)
                              }}
                              className="flex-1 px-2 py-1.5 text-sm font-medium rounded border"
                              style={{ borderColor: 'var(--scout-border)', backgroundColor: 'white' }}
                              placeholder="Division name"
                            />
                            <select
                              value={div.division_type || 'division'}
                              onChange={(e) => {
                                const updated = [...divisions]
                                updated[idx] = { ...div, division_type: e.target.value }
                                setDivisions(updated)
                              }}
                              className="px-2 py-1.5 text-xs rounded border"
                              style={{ borderColor: 'var(--scout-border)', backgroundColor: 'white' }}
                            >
                              <option value="division">Division</option>
                              <option value="business_unit">Business Unit</option>
                              <option value="subsidiary">Subsidiary</option>
                              <option value="region">Region</option>
                            </select>
                          </div>
                          <textarea
                            value={div.description || ''}
                            onChange={(e) => {
                              const updated = [...divisions]
                              updated[idx] = { ...div, description: e.target.value }
                              setDivisions(updated)
                            }}
                            rows={2}
                            className="w-full px-2 py-1.5 text-xs rounded border resize-none"
                            style={{ borderColor: 'var(--scout-border)', backgroundColor: 'white' }}
                            placeholder="Description of this division..."
                          />
                          <div>
                            <label className="block text-[10px] mb-1" style={{ color: 'var(--scout-earth-light)' }}>
                              Products (comma-separated)
                            </label>
                            <input
                              type="text"
                              value={(div.products || []).join(', ')}
                              onChange={(e) => {
                                const updated = [...divisions]
                                updated[idx] = {
                                  ...div,
                                  products: e.target.value.split(',').map(p => p.trim()).filter(Boolean)
                                }
                                setDivisions(updated)
                              }}
                              className="w-full px-2 py-1.5 text-xs rounded border"
                              style={{ borderColor: 'var(--scout-border)', backgroundColor: 'white' }}
                              placeholder="Product A, Product B, Product C"
                            />
                          </div>
                        </div>
                        <button
                          onClick={() => removeDivision(div.id)}
                          className="text-xs p-1.5 hover:bg-red-50 rounded"
                          style={{ color: 'var(--scout-clay)' }}
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))}
                  {divisions.length === 0 && (
                    <div
                      className="p-4 rounded-lg border border-dashed text-center"
                      style={{ borderColor: 'var(--scout-border)' }}
                    >
                      <p className="text-xs" style={{ color: 'var(--scout-earth-light)' }}>
                        No divisions added. Click &quot;+ Add Division&quot; to create one.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Continue Button */}
              <div className="pt-4 border-t flex justify-end" style={{ borderColor: 'var(--scout-border)' }}>
                <button
                  onClick={proceedToCreate}
                  className="px-5 py-2 rounded-lg text-sm font-medium text-white"
                  style={{ backgroundColor: 'var(--scout-saddle)' }}
                >
                  Continue to Review →
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Step 4: Review & Create */}
      {currentStep === 4 && (
        <div className="rounded-lg border p-6" style={{ backgroundColor: 'var(--scout-white)', borderColor: 'var(--scout-border)' }}>
          <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--scout-saddle)' }}>
            Review & Create Account Plan
          </h2>

          {createError && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200">
              <p className="text-sm text-red-700">{createError}</p>
            </div>
          )}

          {/* Summary */}
          <div className="space-y-4 mb-6">
            {/* Company Info */}
            <div className="p-4 rounded-lg" style={{ backgroundColor: 'var(--scout-parchment)' }}>
              <h3 className="text-sm font-medium mb-2" style={{ color: 'var(--scout-earth)' }}>
                Company
              </h3>
              <p className="font-semibold" style={{ color: 'var(--scout-saddle)' }}>
                {companyInfo.company_name}
              </p>
              <div className="flex gap-4 mt-1 text-sm" style={{ color: 'var(--scout-earth-light)' }}>
                {companyInfo.website && <span>{companyInfo.website}</span>}
                {companyInfo.vertical && <span>{companyInfo.vertical}</span>}
              </div>
            </div>

            {/* Campaigns */}
            {selectedCampaigns.length > 0 && (
              <div className="p-4 rounded-lg" style={{ backgroundColor: 'var(--scout-parchment)' }}>
                <h3 className="text-sm font-medium mb-2" style={{ color: 'var(--scout-earth)' }}>
                  Campaigns ({selectedCampaigns.length})
                </h3>
                <div className="flex flex-wrap gap-2">
                  {campaigns
                    .filter(c => selectedCampaigns.includes(c.campaign_id))
                    .map(c => (
                      <span
                        key={c.campaign_id}
                        className="text-xs px-2 py-1 rounded"
                        style={{ backgroundColor: 'var(--scout-border)', color: 'var(--scout-earth)' }}
                      >
                        {c.name}
                      </span>
                    ))}
                </div>
              </div>
            )}

            {/* Thesis */}
            {thesis && (
              <div className="p-4 rounded-lg" style={{ backgroundColor: 'var(--scout-parchment)' }}>
                <h3 className="text-sm font-medium mb-2" style={{ color: 'var(--scout-earth)' }}>
                  Account Thesis
                </h3>
                <p className="text-sm" style={{ color: 'var(--scout-earth-light)' }}>
                  {thesis}
                </p>
              </div>
            )}

            {/* Intelligence */}
            {acceptedFindings.length > 0 && (
              <div className="p-4 rounded-lg" style={{ backgroundColor: 'var(--scout-parchment)' }}>
                <h3 className="text-sm font-medium mb-2" style={{ color: 'var(--scout-earth)' }}>
                  Intelligence ({acceptedFindings.length} findings)
                </h3>
                <div className="flex gap-4 text-sm">
                  {acceptedFindings.filter(f => f.targetField === 'compelling_event').length > 0 && (
                    <span style={{ color: 'var(--scout-clay)' }}>
                      {acceptedFindings.filter(f => f.targetField === 'compelling_event').length} compelling events
                    </span>
                  )}
                  {acceptedFindings.filter(f => f.targetField === 'buying_signal').length > 0 && (
                    <span style={{ color: 'var(--scout-trail)' }}>
                      {acceptedFindings.filter(f => f.targetField === 'buying_signal').length} buying signals
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Structure */}
            {divisions.length > 0 && (
              <div className="p-4 rounded-lg" style={{ backgroundColor: 'var(--scout-parchment)' }}>
                <h3 className="text-sm font-medium mb-2" style={{ color: 'var(--scout-earth)' }}>
                  Corporate Structure ({divisions.length} divisions)
                </h3>
                <div className="flex flex-wrap gap-2">
                  {divisions.map(d => (
                    <span
                      key={d.id}
                      className="text-xs px-2 py-1 rounded"
                      style={{ backgroundColor: 'var(--scout-border)', color: 'var(--scout-earth)' }}
                    >
                      {d.name}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Create Button */}
          <div className="pt-4 border-t flex items-center justify-between" style={{ borderColor: 'var(--scout-border)' }}>
            <button
              onClick={() => setCurrentStep(3)}
              className="text-sm"
              style={{ color: 'var(--scout-earth-light)' }}
            >
              ← Back
            </button>
            <button
              onClick={createAccountPlan}
              disabled={isCreatingAccount}
              className="px-6 py-3 rounded-lg font-medium text-white disabled:opacity-50 flex items-center gap-2"
              style={{
                background: 'linear-gradient(135deg, var(--scout-saddle) 0%, var(--scout-sunset) 100%)',
                boxShadow: '0 4px 14px rgba(139, 69, 19, 0.3)',
              }}
            >
              {isCreatingAccount ? (
                <>
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>Creating Account Plan...</span>
                </>
              ) : (
                <>
                  <ScoutAIIcon size={20} className="text-white" />
                  <span style={{ fontFamily: "'Bitter', Georgia, serif" }}>
                    Create Account Plan
                  </span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// Step Indicator Component
function StepIndicator({
  step,
  label,
  isActive,
  isComplete,
  onClick
}: {
  step: number
  label: string
  isActive: boolean
  isComplete: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2"
      disabled={!isComplete && !isActive}
    >
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium"
        style={{
          backgroundColor: isComplete
            ? 'var(--scout-trail)'
            : isActive
              ? 'var(--scout-saddle)'
              : 'var(--scout-border)',
          color: isComplete || isActive ? 'white' : 'var(--scout-earth-light)',
        }}
      >
        {isComplete ? '✓' : step}
      </div>
      <span
        className="text-sm font-medium"
        style={{
          color: isActive ? 'var(--scout-saddle)' : 'var(--scout-earth-light)'
        }}
      >
        {label}
      </span>
    </button>
  )
}

// Finding Card Component with target field selector
function FindingCard({
  finding,
  onAccept,
  onReject,
}: {
  finding: ResearchFinding
  onAccept: (targetField: ResearchFinding['targetField']) => void
  onReject: () => void
}) {
  const [selectedTarget, setSelectedTarget] = useState<NonNullable<ResearchFinding['targetField']>>(finding.targetField || 'summary')

  const targetOptions: { value: ResearchFinding['targetField']; label: string }[] = [
    { value: 'compelling_event', label: 'Compelling Event' },
    { value: 'buying_signal', label: 'Buying Signal' },
    { value: 'risk', label: 'Risk' },
    { value: 'thesis', label: 'Account Thesis' },
    { value: 'summary', label: 'Summary/Notes' },
  ]

  return (
    <div
      className="p-4 rounded-lg border"
      style={{ backgroundColor: 'var(--scout-parchment)', borderColor: 'var(--scout-border)' }}
    >
      <div className="flex items-start justify-between mb-2">
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

      <h4 className="font-medium text-sm mb-2" style={{ color: 'var(--scout-earth)' }}>
        {finding.title}
      </h4>
      <p className="text-sm mb-4" style={{ color: 'var(--scout-earth-light)' }}>
        {finding.content}
      </p>

      {/* Target Field Selector */}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xs" style={{ color: 'var(--scout-earth-light)' }}>
          Add as:
        </span>
        <select
          value={selectedTarget}
          onChange={(e) => setSelectedTarget(e.target.value as NonNullable<ResearchFinding['targetField']>)}
          className="text-xs px-2 py-1 rounded border"
          style={{ borderColor: 'var(--scout-border)', backgroundColor: 'white' }}
        >
          {targetOptions.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => onAccept(selectedTarget)}
          className="px-3 py-1.5 text-white text-xs rounded-lg font-medium"
          style={{ backgroundColor: 'var(--scout-trail)' }}
        >
          Accept
        </button>
        <button
          onClick={onReject}
          className="px-3 py-1.5 text-xs"
          style={{ color: 'var(--scout-clay)' }}
        >
          Reject
        </button>
      </div>
    </div>
  )
}

function formatTargetField(field?: ResearchFinding['targetField']): string {
  const labels: Record<string, string> = {
    compelling_event: 'Compelling Event',
    buying_signal: 'Buying Signal',
    risk: 'Risk',
    thesis: 'Thesis',
    summary: 'Summary',
  }
  return labels[field || 'summary'] || 'Summary'
}
