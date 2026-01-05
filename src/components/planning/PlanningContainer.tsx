'use client'

import { useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ScoutTerrainMark } from '@/components/ui/scout-logo'
import { PlanningProgress } from './PlanningProgress'
import { OrgSignalMapping } from './OrgSignalMapping'
import { StakeholderMapping } from './StakeholderMapping'
import { OpportunityBuilder } from './OpportunityBuilder'
import { MilestonesActions } from './MilestonesActions'
import { PlanReview } from './PlanReview'

// Types
export interface BusinessUnit {
  id: string
  name: string
  description?: string
  parentId?: string
  products?: string[]
}

export interface ResearchFinding {
  id: string
  category: string
  content: string
  source?: string
  confidence?: string
  status: 'pending' | 'accepted' | 'rejected' | 'edited'
  editedContent?: string
}

export interface Stakeholder {
  stakeholder_id: string
  account_plan_id: string
  full_name: string
  title?: string
  email?: string
  phone?: string
  linkedin_url?: string
  role_type?: string
  sentiment?: string
  notes?: string
  profile_notes?: string
  business_unit?: string
  is_placeholder?: boolean
  placeholder_role?: string
  relationship_strength?: string
  relationship_history?: string
  purchasing_authority?: string
  last_contact_date?: string
  preferred_contact_method?: string
  key_concerns?: string
  communication_style?: string
}

export interface Pursuit {
  pursuit_id: string
  account_plan_id: string
  name: string
  description?: string
  estimated_value?: number
  stage?: string
  probability?: number
  target_close_date?: string
  business_unit_id?: string
  thesis?: string
  signal_ids?: string[]
  engagement_plan?: {
    sequence: Array<{
      stakeholder_id: string
      order: number
      role_in_deal?: string
      message?: string
      proof_needed?: string
      objections?: string
    }>
  }
  notes?: string
}

export interface ActionItem {
  action_id: string
  account_plan_id: string
  pursuit_id?: string
  title: string
  description?: string
  priority?: string
  status?: string
  owner?: string
  due_date?: string
  category?: string
  week_number?: number
  milestone_id?: string
}

export interface Account {
  account_plan_id: string
  account_name: string
  website?: string
  industry?: string
  employee_count?: string
  headquarters?: string
  description?: string
  research_summary?: string
  research_findings?: ResearchFinding[]
  competitors?: Array<{
    id?: string
    name: string
    status?: string
    strengths?: string
    weaknesses?: string
    strategy?: string
  }>
  account_strategy?: string
  strategic_objectives?: string
  risk_factors?: string
  business_units?: BusinessUnit[]
  signal_mappings?: Record<string, string>
  milestones?: {
    day_30: Array<{ id: string; text: string; completed: boolean }>
    day_60: Array<{ id: string; text: string; completed: boolean }>
    day_90: Array<{ id: string; text: string; completed: boolean }>
  }
  plan_status?: 'draft' | 'active' | 'completed' | 'archived'
  plan_completeness?: number
  planning_period_start?: string
  planning_period_end?: string
  activated_at?: string
}

interface CompanyProfile {
  sales_methodology?: string
  products_services?: string
  value_proposition?: string
  target_verticals?: string[]
  key_stakeholder_roles?: string[]
}

interface PlanningContainerProps {
  account: Account
  stakeholders: Stakeholder[]
  pursuits: Pursuit[]
  actionItems: ActionItem[]
  companyProfile: CompanyProfile | null
  initialStep: number
}

const STEPS = [
  { id: 1, label: 'Org & Signals', description: 'Map business units and signals' },
  { id: 2, label: 'Stakeholders', description: 'Place contacts and identify gaps' },
  { id: 3, label: 'Opportunities', description: 'Define opportunities + BANT' },
  { id: 4, label: '30/60/90 Plan', description: 'Actions to close BANT gaps' },
  { id: 5, label: 'Review', description: 'Activate your plan' },
]

export function PlanningContainer({
  account: initialAccount,
  stakeholders: initialStakeholders,
  pursuits: initialPursuits,
  actionItems: initialActionItems,
  companyProfile,
  initialStep,
}: PlanningContainerProps) {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(initialStep)
  const [isSaving, setIsSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)

  // Mutable state for planning data
  const [account, setAccount] = useState(initialAccount)
  const [stakeholders, setStakeholders] = useState(initialStakeholders)
  const [pursuits, setPursuits] = useState(initialPursuits)
  const [actionItems, setActionItems] = useState(initialActionItems)

  // Calculate completeness score
  const calculateCompleteness = useCallback(() => {
    let score = 0
    const checks = 8

    // 1. Business units defined
    if (account.business_units && account.business_units.length > 0) score++

    // 2. Signals mapped (>50%)
    const totalSignals = account.research_findings?.filter(f => f.status === 'accepted').length || 0
    const mappedSignals = Object.keys(account.signal_mappings || {}).length
    if (totalSignals === 0 || mappedSignals >= totalSignals * 0.5) score++

    // 3. Stakeholders placed (>50%)
    const placedStakeholders = stakeholders.filter(s => s.business_unit).length
    if (stakeholders.length === 0 || placedStakeholders >= stakeholders.length * 0.5) score++

    // 4. Pursuits have thesis
    const pursuitsWithThesis = pursuits.filter(p => p.thesis).length
    if (pursuits.length === 0 || pursuitsWithThesis === pursuits.length) score++

    // 5. Engagement plans defined
    const pursuitsWithEngagement = pursuits.filter(p => p.engagement_plan?.sequence?.length).length
    if (pursuits.length === 0 || pursuitsWithEngagement >= pursuits.length * 0.5) score++

    // 6. Milestones set
    const milestones = account.milestones || { day_30: [], day_60: [], day_90: [] }
    if (milestones.day_30.length > 0 || milestones.day_60.length > 0 || milestones.day_90.length > 0) score++

    // 7. Actions exist
    if (actionItems.length > 0) score++

    // 8. Plan has strategy
    if (account.account_strategy) score++

    return Math.round((score / checks) * 100)
  }, [account, stakeholders, pursuits, actionItems])

  const completeness = calculateCompleteness()

  // Auto-save with debounce
  const saveChanges = useCallback(async () => {
    setIsSaving(true)
    try {
      const response = await fetch(`/api/accounts/${account.account_plan_id}/plan`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          business_units: account.business_units,
          signal_mappings: account.signal_mappings,
          milestones: account.milestones,
          plan_completeness: completeness,
        }),
      })

      if (response.ok) {
        setLastSaved(new Date())
      }
    } catch (error) {
      console.error('Failed to save:', error)
    } finally {
      setIsSaving(false)
    }
  }, [account, completeness])

  // Debounced auto-save
  useEffect(() => {
    const timer = setTimeout(() => {
      saveChanges()
    }, 2000)

    return () => clearTimeout(timer)
  }, [account.business_units, account.signal_mappings, account.milestones])

  // Update URL when step changes
  useEffect(() => {
    const url = new URL(window.location.href)
    url.searchParams.set('step', currentStep.toString())
    window.history.replaceState({}, '', url.toString())
  }, [currentStep])

  const handleBack = () => {
    router.push(`/accounts/${account.account_plan_id}`)
  }

  const updateAccount = (updates: Partial<Account>) => {
    setAccount(prev => ({ ...prev, ...updates }))
  }

  const updateStakeholders = (newStakeholders: Stakeholder[]) => {
    setStakeholders(newStakeholders)
  }

  const updatePursuits = (newPursuits: Pursuit[]) => {
    setPursuits(newPursuits)
  }

  const updateActionItems = (newActionItems: ActionItem[]) => {
    setActionItems(newActionItems)
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <button
              onClick={handleBack}
              className="p-2 rounded-lg hover:bg-white/50 transition-colors"
              style={{ color: 'var(--scout-earth-light)' }}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>
            <div>
              <div className="flex items-center gap-3">
                <ScoutTerrainMark className="w-8 h-4" color="brown" />
                <h1
                  className="text-xl font-bold"
                  style={{ color: 'var(--scout-saddle)', fontFamily: "'Bitter', Georgia, serif" }}
                >
                  Plan: {account.account_name}
                </h1>
              </div>
              <p className="text-sm mt-1" style={{ color: 'var(--scout-earth-light)' }}>
                {account.industry && `${account.industry} • `}
                {account.employee_count && `${account.employee_count} employees`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Completeness badge */}
            <PlanningProgress completeness={completeness} />

            {/* Save status */}
            <div className="text-sm" style={{ color: 'var(--scout-earth-light)' }}>
              {isSaving ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Saving...
                </span>
              ) : lastSaved ? (
                <span>Saved {lastSaved.toLocaleTimeString()}</span>
              ) : null}
            </div>
          </div>
        </div>

        {/* Step navigation */}
        <div className="flex items-center gap-1 overflow-x-auto pb-2">
          {STEPS.map((step, index) => (
            <div key={step.id} className="flex items-center">
              <button
                onClick={() => setCurrentStep(step.id)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all whitespace-nowrap ${
                  step.id === currentStep
                    ? 'shadow-sm'
                    : 'hover:bg-white/50'
                }`}
                style={{
                  backgroundColor: step.id === currentStep ? 'white' : 'transparent',
                  borderColor: step.id === currentStep ? 'var(--scout-border)' : 'transparent',
                  borderWidth: step.id === currentStep ? '1px' : '0',
                }}
              >
                <span
                  className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium"
                  style={{
                    backgroundColor: step.id === currentStep
                      ? 'var(--scout-saddle)'
                      : step.id < currentStep
                      ? 'var(--scout-trail)'
                      : 'var(--scout-border)',
                    color: step.id <= currentStep ? 'white' : 'var(--scout-earth-light)',
                  }}
                >
                  {step.id < currentStep ? '✓' : step.id}
                </span>
                <div className="text-left">
                  <p
                    className="text-sm font-medium"
                    style={{
                      color: step.id === currentStep ? 'var(--scout-saddle)' : 'var(--scout-earth)',
                    }}
                  >
                    {step.label}
                  </p>
                </div>
              </button>
              {index < STEPS.length - 1 && (
                <div
                  className="w-6 h-0.5 mx-1"
                  style={{
                    backgroundColor: step.id < currentStep ? 'var(--scout-trail)' : 'var(--scout-border)',
                  }}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Step content */}
      <div
        className="bg-white dark:bg-zinc-900 rounded-xl border p-6 shadow-sm"
        style={{ borderColor: 'var(--scout-border)' }}
      >
        {currentStep === 1 && (
          <OrgSignalMapping
            account={account}
            updateAccount={updateAccount}
            onNext={() => setCurrentStep(2)}
          />
        )}
        {currentStep === 2 && (
          <StakeholderMapping
            account={account}
            stakeholders={stakeholders}
            updateStakeholders={updateStakeholders}
            onNext={() => setCurrentStep(3)}
            onPrev={() => setCurrentStep(1)}
          />
        )}
        {currentStep === 3 && (
          <OpportunityBuilder
            account={account}
            stakeholders={stakeholders}
            pursuits={pursuits}
            updatePursuits={updatePursuits}
            onNext={() => setCurrentStep(4)}
            onPrev={() => setCurrentStep(2)}
          />
        )}
        {currentStep === 4 && (
          <MilestonesActions
            account={account}
            pursuits={pursuits}
            stakeholders={stakeholders}
            actionItems={actionItems}
            updateAccount={updateAccount}
            updateActionItems={updateActionItems}
            onNext={() => setCurrentStep(5)}
            onPrev={() => setCurrentStep(3)}
          />
        )}
        {currentStep === 5 && (
          <PlanReview
            account={account}
            stakeholders={stakeholders}
            pursuits={pursuits}
            actionItems={actionItems}
            completeness={completeness}
            onPrev={() => setCurrentStep(4)}
          />
        )}
      </div>
    </div>
  )
}
