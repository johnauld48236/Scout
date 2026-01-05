'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ScoutAIIcon } from '@/components/ui/scout-logo'

// Types
interface Campaign {
  campaign_id: string
  name: string
  type: string
  status?: string
  value_proposition?: string
  target_verticals?: string[]
}

interface CompanyValidation {
  url: string
  isValidated: boolean
  companyName: string
  description?: string
  headquarters?: string
  employeeCount?: string
  industry?: string
  logoUrl?: string
}

interface ResearchFinding {
  id: string
  categoryId: string
  categoryName: string
  title: string
  content: string
  confidence: 'high' | 'medium' | 'low'
  sources: string[]
  accepted: boolean
}

interface Division {
  id: string
  name: string
  description?: string
  division_type: string
  products: string[]
  headcount?: number
  key_focus_areas: string[]
}

interface CorporateStructure {
  headquarters: string
  parent_company?: string
  ownership_type: 'public' | 'private' | 'subsidiary'
  stock_symbol?: string
  employee_count?: number
  annual_revenue?: string
  founded_year?: number
  ceo?: string
}

interface EnrichWithScoutAIProps {
  // For TAM accounts being promoted or new accounts
  source: 'tam' | 'new' | 'existing'
  sourceId?: string // TAM account ID if promoting
  initialCompanyName?: string
  initialWebsite?: string
  campaigns: Campaign[]
  onComplete: (accountId: string) => void
  onCancel: () => void
}

type Step = 1 | 2 | 3 | 4 | 5

const STEP_LABELS = [
  'Validate Company',
  'Assign Campaign',
  'Research Signals',
  'Enrich Structure',
  'Review & Create',
]

export function EnrichWithScoutAI({
  source,
  sourceId,
  initialCompanyName = '',
  initialWebsite = '',
  campaigns,
  onComplete,
  onCancel,
}: EnrichWithScoutAIProps) {
  const router = useRouter()

  // Current step
  const [currentStep, setCurrentStep] = useState<Step>(1)

  // Step 1: Company Validation
  const [companyUrl, setCompanyUrl] = useState(initialWebsite)
  const [isValidating, setIsValidating] = useState(false)
  const [validation, setValidation] = useState<CompanyValidation | null>(null)
  const [validationError, setValidationError] = useState<string | null>(null)

  // Step 2: Campaign
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null)

  // Step 3: Research
  const [isResearching, setIsResearching] = useState(false)
  const [findings, setFindings] = useState<ResearchFinding[]>([])
  const [thesis, setThesis] = useState('')
  const [researchError, setResearchError] = useState<string | null>(null)

  // Step 4: Structure
  const [isEnrichingStructure, setIsEnrichingStructure] = useState(false)
  const [corporateStructure, setCorporateStructure] = useState<CorporateStructure | null>(null)
  const [divisions, setDivisions] = useState<Division[]>([])
  const [structureError, setStructureError] = useState<string | null>(null)

  // Step 5: Creating
  const [isCreating, setIsCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  // Step 1: Validate company URL
  const validateCompany = async () => {
    if (!companyUrl.trim()) {
      setValidationError('Please enter a company website')
      return
    }

    setIsValidating(true)
    setValidationError(null)

    try {
      const res = await fetch('/api/ai/validate-company', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: companyUrl,
          companyName: initialCompanyName
        }),
      })

      if (!res.ok) throw new Error('Validation failed')

      const data = await res.json()
      setValidation({
        url: companyUrl,
        isValidated: true,
        companyName: data.companyName || initialCompanyName,
        description: data.description,
        headquarters: data.headquarters,
        employeeCount: data.employeeCount,
        industry: data.industry,
        logoUrl: data.logoUrl,
      })
    } catch (error) {
      console.error('Validation error:', error)
      setValidationError('Could not validate company. Please check the URL and try again.')
    } finally {
      setIsValidating(false)
    }
  }

  // Step 3: Run research
  const runResearch = async () => {
    if (!validation || !selectedCampaignId) return

    setIsResearching(true)
    setResearchError(null)

    try {
      const res = await fetch('/api/ai/contextual-research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName: validation.companyName,
          domain: validation.url,
          vertical: validation.industry,
          campaign_ids: [selectedCampaignId],
        }),
      })

      if (!res.ok) throw new Error('Research failed')

      const data = await res.json()
      const research = data.research || data

      setFindings(
        (research.findings || []).map((f: ResearchFinding) => ({
          ...f,
          accepted: true, // Default to accepted
        }))
      )
      if (research.thesis) {
        setThesis(research.thesis)
      }
    } catch (error) {
      console.error('Research error:', error)
      setResearchError('Research failed. Please try again.')
    } finally {
      setIsResearching(false)
    }
  }

  // Step 4: Enrich structure
  const enrichStructure = async () => {
    if (!validation) return

    setIsEnrichingStructure(true)
    setStructureError(null)

    try {
      const res = await fetch('/api/ai/enrich-structure', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName: validation.companyName,
          domain: validation.url,
          industry: validation.industry,
        }),
      })

      if (!res.ok) throw new Error('Structure enrichment failed')

      const data = await res.json()

      if (data.corporateStructure) {
        setCorporateStructure(data.corporateStructure)
      }
      if (data.divisions) {
        setDivisions(data.divisions.map((d: Division, i: number) => ({
          ...d,
          id: d.id || `div-${i}`,
        })))
      }
    } catch (error) {
      console.error('Structure enrichment error:', error)
      setStructureError('Could not enrich structure. You can add this information manually later.')
    } finally {
      setIsEnrichingStructure(false)
    }
  }

  // Step 5: Create account
  const createAccount = async () => {
    if (!validation) return

    setIsCreating(true)
    setCreateError(null)

    try {
      // Prepare accepted findings
      const acceptedFindings = findings.filter(f => f.accepted)
      const compellingEvents = acceptedFindings
        .filter(f => f.categoryId.includes('regulatory') || f.categoryId.includes('compliance') || f.categoryId.includes('event'))
        .map(f => ({
          id: f.id,
          title: f.title,
          description: f.content,
          source: f.sources[0] || 'AI Research',
          detected_date: new Date().toISOString(),
        }))

      const buyingSignals = acceptedFindings
        .filter(f => f.categoryId.includes('signal') || f.categoryId.includes('indicator') || f.categoryId.includes('market'))
        .map(f => ({
          id: f.id,
          signal_type: f.categoryName,
          description: f.content,
          strength: f.confidence,
          detected_date: new Date().toISOString(),
          source: f.sources[0] || 'AI Research',
        }))

      // Create account plan
      const accountRes = await fetch('/api/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          account_name: validation.companyName,
          website: validation.url,
          industry: validation.industry,
          headquarters: corporateStructure?.headquarters || validation.headquarters,
          employee_count: corporateStructure?.employee_count || validation.employeeCount,
          corporate_structure: corporateStructure,
          account_thesis: thesis,
          campaign_ids: selectedCampaignId ? [selectedCampaignId] : [],
          compelling_events: compellingEvents,
          buying_signals: buyingSignals,
          enrichment_status: 'completed',
          enrichment_source: 'scout_ai',
          last_enriched_at: new Date().toISOString(),
          // Link to source TAM if applicable
          tam_account_id: source === 'tam' ? sourceId : undefined,
        }),
      })

      if (!accountRes.ok) throw new Error('Failed to create account')

      const accountData = await accountRes.json()
      const accountId = accountData.account?.account_plan_id || accountData.data?.account_plan_id

      // Create divisions if we have them
      if (divisions.length > 0 && accountId) {
        await fetch(`/api/accounts/${accountId}/divisions`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ divisions }),
        })
      }

      // Update TAM account status if promoting
      if (source === 'tam' && sourceId) {
        await fetch(`/api/tam/${sourceId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            status: 'Converted',
            account_plan_id: accountId,
          }),
        })
      }

      onComplete(accountId)
    } catch (error) {
      console.error('Create account error:', error)
      setCreateError('Failed to create account. Please try again.')
    } finally {
      setIsCreating(false)
    }
  }

  // Navigation
  const canProceed = () => {
    switch (currentStep) {
      case 1: return validation?.isValidated
      case 2: return !!selectedCampaignId
      case 3: return findings.length > 0
      case 4: return true // Structure is optional
      case 5: return true
      default: return false
    }
  }

  const nextStep = () => {
    if (currentStep < 5) {
      setCurrentStep((currentStep + 1) as Step)
      // Auto-trigger actions for next step
      if (currentStep === 2) {
        runResearch()
      } else if (currentStep === 3) {
        enrichStructure()
      }
    }
  }

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep((currentStep - 1) as Step)
    }
  }

  // Toggle finding acceptance
  const toggleFinding = (id: string) => {
    setFindings(prev => prev.map(f =>
      f.id === id ? { ...f, accepted: !f.accepted } : f
    ))
  }

  // Remove division
  const removeDivision = (id: string) => {
    setDivisions(prev => prev.filter(d => d.id !== id))
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <ScoutAIIcon size={32} className="text-amber-700" />
          <div>
            <h1 className="text-xl font-bold" style={{ color: 'var(--scout-saddle)' }}>
              Enrich with Scout AI
            </h1>
            <p className="text-sm" style={{ color: 'var(--scout-earth-light)' }}>
              {validation?.companyName || initialCompanyName || 'New Account'}
            </p>
          </div>
        </div>
        <button
          onClick={onCancel}
          className="text-sm px-3 py-1.5 rounded hover:bg-zinc-100"
          style={{ color: 'var(--scout-earth-light)' }}
        >
          Cancel
        </button>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center gap-2 mb-8">
        {STEP_LABELS.map((label, index) => {
          const stepNum = (index + 1) as Step
          const isActive = currentStep === stepNum
          const isComplete = currentStep > stepNum

          return (
            <div key={label} className="flex items-center">
              <div className="flex items-center gap-2">
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
                  {isComplete ? '✓' : stepNum}
                </div>
                <span
                  className="text-sm font-medium hidden sm:block"
                  style={{ color: isActive ? 'var(--scout-saddle)' : 'var(--scout-earth-light)' }}
                >
                  {label}
                </span>
              </div>
              {index < STEP_LABELS.length - 1 && (
                <div
                  className="w-8 h-px mx-2"
                  style={{ backgroundColor: isComplete ? 'var(--scout-trail)' : 'var(--scout-border)' }}
                />
              )}
            </div>
          )
        })}
      </div>

      {/* Step Content */}
      <div className="rounded-lg border p-6 mb-6" style={{ backgroundColor: 'var(--scout-white)', borderColor: 'var(--scout-border)' }}>

        {/* Step 1: Validate Company */}
        {currentStep === 1 && (
          <div>
            <h2 className="text-lg font-semibold mb-2" style={{ color: 'var(--scout-saddle)' }}>
              Validate Company
            </h2>
            <p className="text-sm mb-6" style={{ color: 'var(--scout-earth-light)' }}>
              Enter the company website to verify we have the correct company.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--scout-earth)' }}>
                  Company Website
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={companyUrl}
                    onChange={(e) => setCompanyUrl(e.target.value)}
                    placeholder="example.com"
                    className="flex-1 px-3 py-2 rounded-lg border text-sm"
                    style={{ borderColor: 'var(--scout-border)', backgroundColor: 'var(--scout-parchment)' }}
                  />
                  <button
                    onClick={validateCompany}
                    disabled={isValidating}
                    className="px-4 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-50"
                    style={{ backgroundColor: 'var(--scout-saddle)' }}
                  >
                    {isValidating ? 'Validating...' : 'Validate'}
                  </button>
                </div>
                {validationError && (
                  <p className="text-sm text-red-600 mt-2">{validationError}</p>
                )}
              </div>

              {validation?.isValidated && (
                <div className="p-4 rounded-lg border" style={{ backgroundColor: 'var(--scout-parchment)', borderColor: 'var(--scout-trail)' }}>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-green-600">✓</span>
                    <span className="font-medium" style={{ color: 'var(--scout-saddle)' }}>
                      Company Verified
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span style={{ color: 'var(--scout-earth-light)' }}>Company:</span>
                      <p className="font-medium" style={{ color: 'var(--scout-earth)' }}>{validation.companyName}</p>
                    </div>
                    {validation.headquarters && (
                      <div>
                        <span style={{ color: 'var(--scout-earth-light)' }}>Headquarters:</span>
                        <p className="font-medium" style={{ color: 'var(--scout-earth)' }}>{validation.headquarters}</p>
                      </div>
                    )}
                    {validation.industry && (
                      <div>
                        <span style={{ color: 'var(--scout-earth-light)' }}>Industry:</span>
                        <p className="font-medium" style={{ color: 'var(--scout-earth)' }}>{validation.industry}</p>
                      </div>
                    )}
                    {validation.employeeCount && (
                      <div>
                        <span style={{ color: 'var(--scout-earth-light)' }}>Employees:</span>
                        <p className="font-medium" style={{ color: 'var(--scout-earth)' }}>{validation.employeeCount}</p>
                      </div>
                    )}
                  </div>
                  {validation.description && (
                    <p className="text-sm mt-3" style={{ color: 'var(--scout-earth-light)' }}>
                      {validation.description}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Step 2: Assign Campaign */}
        {currentStep === 2 && (
          <div>
            <h2 className="text-lg font-semibold mb-2" style={{ color: 'var(--scout-saddle)' }}>
              Assign Campaign
            </h2>
            <p className="text-sm mb-6" style={{ color: 'var(--scout-earth-light)' }}>
              Select a campaign to focus the research on relevant pain points and opportunities.
            </p>

            <div className="space-y-3">
              {campaigns.map(campaign => {
                const isSelected = selectedCampaignId === campaign.campaign_id
                return (
                  <button
                    key={campaign.campaign_id}
                    onClick={() => setSelectedCampaignId(campaign.campaign_id)}
                    className="w-full text-left p-4 rounded-lg transition-all border"
                    style={{
                      backgroundColor: isSelected ? 'var(--scout-saddle)' : 'transparent',
                      borderColor: isSelected ? 'var(--scout-saddle)' : 'var(--scout-border)',
                    }}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      {isSelected && <span className="text-white">✓</span>}
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
                    </div>
                    {campaign.value_proposition && (
                      <p
                        className="text-sm mt-1"
                        style={{ color: isSelected ? 'rgba(255,255,255,0.8)' : 'var(--scout-earth-light)' }}
                      >
                        {campaign.value_proposition}
                      </p>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Step 3: Research Signals */}
        {currentStep === 3 && (
          <div>
            <h2 className="text-lg font-semibold mb-2" style={{ color: 'var(--scout-saddle)' }}>
              Research Signals
            </h2>
            <p className="text-sm mb-6" style={{ color: 'var(--scout-earth-light)' }}>
              AI is researching {validation?.companyName} for relevant signals and opportunities.
            </p>

            {isResearching ? (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 mb-4" style={{ borderColor: 'var(--scout-saddle)' }} />
                <p style={{ color: 'var(--scout-earth)' }}>Researching {validation?.companyName}...</p>
                <p className="text-sm mt-1" style={{ color: 'var(--scout-earth-light)' }}>
                  This may take a moment
                </p>
              </div>
            ) : researchError ? (
              <div className="p-4 rounded-lg bg-red-50 border border-red-200">
                <p className="text-red-700">{researchError}</p>
                <button
                  onClick={runResearch}
                  className="mt-2 text-sm text-red-600 hover:underline"
                >
                  Try again
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Thesis */}
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: 'var(--scout-earth)' }}>
                    Account Thesis
                  </label>
                  <textarea
                    value={thesis}
                    onChange={(e) => setThesis(e.target.value)}
                    rows={3}
                    placeholder="Why should we pursue this account?"
                    className="w-full px-3 py-2 rounded-lg border text-sm resize-none"
                    style={{ borderColor: 'var(--scout-border)', backgroundColor: 'var(--scout-parchment)' }}
                  />
                </div>

                {/* Findings */}
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: 'var(--scout-earth)' }}>
                    Key Findings ({findings.filter(f => f.accepted).length} selected)
                  </label>
                  <div className="space-y-2 max-h-80 overflow-y-auto">
                    {findings.map(finding => (
                      <div
                        key={finding.id}
                        onClick={() => toggleFinding(finding.id)}
                        className="p-3 rounded-lg border cursor-pointer transition-all"
                        style={{
                          backgroundColor: finding.accepted ? 'rgba(93, 122, 93, 0.1)' : 'var(--scout-parchment)',
                          borderColor: finding.accepted ? 'var(--scout-trail)' : 'var(--scout-border)',
                        }}
                      >
                        <div className="flex items-start gap-2">
                          <div
                            className="w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 mt-0.5"
                            style={{
                              borderColor: finding.accepted ? 'var(--scout-trail)' : 'var(--scout-border)',
                              backgroundColor: finding.accepted ? 'var(--scout-trail)' : 'transparent',
                            }}
                          >
                            {finding.accepted && <span className="text-white text-xs">✓</span>}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs font-medium" style={{ color: 'var(--scout-sky)' }}>
                                {finding.categoryName}
                              </span>
                              <span
                                className="text-xs px-1.5 py-0.5 rounded"
                                style={{
                                  backgroundColor: finding.confidence === 'high' ? 'rgba(93, 122, 93, 0.2)' : 'var(--scout-border)',
                                  color: finding.confidence === 'high' ? 'var(--scout-trail)' : 'var(--scout-earth-light)',
                                }}
                              >
                                {finding.confidence}
                              </span>
                            </div>
                            <p className="text-sm" style={{ color: 'var(--scout-earth)' }}>
                              {finding.content}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 4: Enrich Structure */}
        {currentStep === 4 && (
          <div>
            <h2 className="text-lg font-semibold mb-2" style={{ color: 'var(--scout-saddle)' }}>
              Enrich Structure
            </h2>
            <p className="text-sm mb-6" style={{ color: 'var(--scout-earth-light)' }}>
              AI is discovering the corporate structure, divisions, and products.
            </p>

            {isEnrichingStructure ? (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 mb-4" style={{ borderColor: 'var(--scout-saddle)' }} />
                <p style={{ color: 'var(--scout-earth)' }}>Enriching structure...</p>
              </div>
            ) : structureError ? (
              <div className="p-4 rounded-lg bg-amber-50 border border-amber-200 mb-4">
                <p className="text-amber-700">{structureError}</p>
              </div>
            ) : null}

            {/* Corporate Structure */}
            {corporateStructure && (
              <div className="p-4 rounded-lg border mb-4" style={{ backgroundColor: 'var(--scout-parchment)', borderColor: 'var(--scout-border)' }}>
                <h3 className="font-medium mb-3" style={{ color: 'var(--scout-earth)' }}>Corporate Profile</h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  {corporateStructure.headquarters && (
                    <div>
                      <span style={{ color: 'var(--scout-earth-light)' }}>HQ:</span>
                      <span className="ml-2" style={{ color: 'var(--scout-earth)' }}>{corporateStructure.headquarters}</span>
                    </div>
                  )}
                  {corporateStructure.employee_count && (
                    <div>
                      <span style={{ color: 'var(--scout-earth-light)' }}>Employees:</span>
                      <span className="ml-2" style={{ color: 'var(--scout-earth)' }}>{corporateStructure.employee_count.toLocaleString()}</span>
                    </div>
                  )}
                  {corporateStructure.annual_revenue && (
                    <div>
                      <span style={{ color: 'var(--scout-earth-light)' }}>Revenue:</span>
                      <span className="ml-2" style={{ color: 'var(--scout-earth)' }}>{corporateStructure.annual_revenue}</span>
                    </div>
                  )}
                  {corporateStructure.ceo && (
                    <div>
                      <span style={{ color: 'var(--scout-earth-light)' }}>CEO:</span>
                      <span className="ml-2" style={{ color: 'var(--scout-earth)' }}>{corporateStructure.ceo}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Divisions */}
            {divisions.length > 0 && (
              <div>
                <h3 className="font-medium mb-3" style={{ color: 'var(--scout-earth)' }}>
                  Divisions & Business Units ({divisions.length})
                </h3>
                <div className="space-y-2">
                  {divisions.map(division => (
                    <div
                      key={division.id}
                      className="p-3 rounded-lg border flex items-start justify-between"
                      style={{ backgroundColor: 'var(--scout-parchment)', borderColor: 'var(--scout-border)' }}
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium" style={{ color: 'var(--scout-earth)' }}>
                            {division.name}
                          </span>
                          <span className="text-xs px-2 py-0.5 rounded" style={{ backgroundColor: 'var(--scout-border)', color: 'var(--scout-earth-light)' }}>
                            {division.division_type}
                          </span>
                        </div>
                        {division.products.length > 0 && (
                          <p className="text-xs" style={{ color: 'var(--scout-earth-light)' }}>
                            Products: {division.products.join(', ')}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => removeDivision(division.id)}
                        className="text-red-500 hover:text-red-700 ml-2"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {!isEnrichingStructure && !corporateStructure && !structureError && (
              <button
                onClick={enrichStructure}
                className="w-full py-3 rounded-lg font-medium text-white"
                style={{ backgroundColor: 'var(--scout-saddle)' }}
              >
                Enrich Structure
              </button>
            )}
          </div>
        )}

        {/* Step 5: Review & Create */}
        {currentStep === 5 && (
          <div>
            <h2 className="text-lg font-semibold mb-2" style={{ color: 'var(--scout-saddle)' }}>
              Review & Create Account
            </h2>
            <p className="text-sm mb-6" style={{ color: 'var(--scout-earth-light)' }}>
              Review the enriched data and create the account plan.
            </p>

            {createError && (
              <div className="p-4 rounded-lg bg-red-50 border border-red-200 mb-4">
                <p className="text-red-700">{createError}</p>
              </div>
            )}

            <div className="space-y-4">
              {/* Summary */}
              <div className="p-4 rounded-lg border" style={{ backgroundColor: 'var(--scout-parchment)', borderColor: 'var(--scout-border)' }}>
                <h3 className="font-medium mb-3" style={{ color: 'var(--scout-saddle)' }}>
                  {validation?.companyName}
                </h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span style={{ color: 'var(--scout-earth-light)' }}>Website:</span>
                    <span className="ml-2" style={{ color: 'var(--scout-earth)' }}>{validation?.url}</span>
                  </div>
                  <div>
                    <span style={{ color: 'var(--scout-earth-light)' }}>Industry:</span>
                    <span className="ml-2" style={{ color: 'var(--scout-earth)' }}>{validation?.industry || 'Not specified'}</span>
                  </div>
                  <div>
                    <span style={{ color: 'var(--scout-earth-light)' }}>Campaign:</span>
                    <span className="ml-2" style={{ color: 'var(--scout-earth)' }}>
                      {campaigns.find(c => c.campaign_id === selectedCampaignId)?.name}
                    </span>
                  </div>
                  <div>
                    <span style={{ color: 'var(--scout-earth-light)' }}>Signals:</span>
                    <span className="ml-2" style={{ color: 'var(--scout-earth)' }}>
                      {findings.filter(f => f.accepted).length} findings
                    </span>
                  </div>
                  <div>
                    <span style={{ color: 'var(--scout-earth-light)' }}>Divisions:</span>
                    <span className="ml-2" style={{ color: 'var(--scout-earth)' }}>
                      {divisions.length} identified
                    </span>
                  </div>
                </div>
                {thesis && (
                  <div className="mt-3 pt-3 border-t" style={{ borderColor: 'var(--scout-border)' }}>
                    <span className="text-sm" style={{ color: 'var(--scout-earth-light)' }}>Thesis:</span>
                    <p className="text-sm mt-1" style={{ color: 'var(--scout-earth)' }}>{thesis}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex justify-between">
        <button
          onClick={currentStep === 1 ? onCancel : prevStep}
          className="px-4 py-2 rounded-lg text-sm font-medium"
          style={{ color: 'var(--scout-earth-light)' }}
        >
          {currentStep === 1 ? 'Cancel' : '← Back'}
        </button>

        {currentStep < 5 ? (
          <button
            onClick={nextStep}
            disabled={!canProceed()}
            className="px-5 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-50"
            style={{ backgroundColor: 'var(--scout-saddle)' }}
          >
            Continue →
          </button>
        ) : (
          <button
            onClick={createAccount}
            disabled={isCreating}
            className="px-5 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-50 flex items-center gap-2"
            style={{ backgroundColor: 'var(--scout-trail)' }}
          >
            {isCreating ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                Creating...
              </>
            ) : (
              'Create Account Plan'
            )}
          </button>
        )}
      </div>
    </div>
  )
}
