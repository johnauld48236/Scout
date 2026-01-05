'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { SALES_METHODOLOGIES, SalesMethodologyType } from '@/lib/ai/context/company-profile'
import { BusinessStructureStep } from './BusinessStructureStep'
import { PlaceContactsStep } from './PlaceContactsStep'
import { GapAnalysisStep } from './GapAnalysisStep'

interface Account {
  account_plan_id: string
  account_name: string
  industry?: string
  employee_count?: string
  website?: string
  description?: string
  research_findings?: Array<{
    category: string
    finding: string
    source?: string
    confidence?: string
  }>
  competitors?: Array<{
    name: string
    strengths?: string
    weaknesses?: string
  }>
}

interface Stakeholder {
  stakeholder_id: string
  account_plan_id: string
  full_name: string
  title?: string
  department?: string
  role_type?: string
  sentiment?: string
  email?: string
  linkedin_url?: string
  reports_to_id?: string
  org_level?: number
  business_unit?: string
}

interface CompanyProfile {
  sales_methodology?: SalesMethodologyType
  custom_methodology_criteria?: string[]
  products_services?: string
  target_verticals?: string[]
  key_stakeholder_roles?: string[]
}

interface Pursuit {
  pursuit_id: string
  name: string
  description?: string
}

interface OrgBuilderWizardProps {
  account: Account
  existingStakeholders: Stakeholder[]
  companyProfile: CompanyProfile | null
  pursuits: Pursuit[]
}

// Business unit structure
export interface BusinessUnit {
  id: string
  name: string
  parentId?: string
  level: number
}

// Contact to place
export interface ContactToPlace {
  id: string
  name: string
  title?: string
  source: 'research' | 'existing' | 'manual'
  placed: boolean
  businessUnitId?: string
  department?: string
  roleType?: string
  sentiment?: string
  confidence?: string
}

const STEPS = [
  { id: 'structure', label: 'Business Structure', description: 'Map the company organization' },
  { id: 'contacts', label: 'Place Contacts', description: 'Assign people to the org' },
  { id: 'gaps', label: 'Identify Gaps', description: 'Find missing coverage' },
]

export function OrgBuilderWizard({
  account,
  existingStakeholders,
  companyProfile,
  pursuits,
}: OrgBuilderWizardProps) {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(0)
  const [isSaving, setIsSaving] = useState(false)

  // Shared state across steps
  const [businessUnits, setBusinessUnits] = useState<BusinessUnit[]>([])
  const [contacts, setContacts] = useState<ContactToPlace[]>([])
  const [gaps, setGaps] = useState<Array<{
    title: string
    department?: string
    businessUnitId?: string
    roleType: string
    priority: 'High' | 'Medium' | 'Low'
    reason: string
    added: boolean
  }>>([])

  const methodology = companyProfile?.sales_methodology || 'BANT'
  const methodologyInfo = SALES_METHODOLOGIES[methodology]

  // Initialize contacts from research findings and existing stakeholders
  useEffect(() => {
    const initialContacts: ContactToPlace[] = []

    // Add existing stakeholders
    existingStakeholders.forEach(s => {
      initialContacts.push({
        id: s.stakeholder_id,
        name: s.full_name,
        title: s.title,
        source: 'existing',
        placed: true,
        businessUnitId: s.business_unit,
        department: s.department,
        roleType: s.role_type,
        sentiment: s.sentiment,
      })
    })

    // Extract people from research findings
    if (account.research_findings) {
      account.research_findings
        .filter(f => f.category === 'people' || f.category === 'leadership')
        .forEach((f, i) => {
          // Parse finding for name/title
          const match = f.finding.match(/^([^-–:]+)[-–:]?\s*(.*)$/)
          if (match) {
            const name = match[1].trim()
            const title = match[2].trim()
            // Avoid duplicates
            if (!initialContacts.find(c => c.name.toLowerCase() === name.toLowerCase())) {
              initialContacts.push({
                id: `research-${i}`,
                name,
                title: title || undefined,
                source: 'research',
                placed: false,
                confidence: f.confidence,
              })
            }
          }
        })
    }

    setContacts(initialContacts)
  }, [existingStakeholders, account.research_findings])

  // Initialize business units from research
  useEffect(() => {
    const units: BusinessUnit[] = []

    // Try to extract business units from research
    if (account.research_findings) {
      const orgFindings = account.research_findings.filter(
        f => f.category === 'organization' || f.category === 'structure'
      )
      orgFindings.forEach((f, i) => {
        units.push({
          id: `unit-${i}`,
          name: f.finding,
          level: 0,
        })
      })
    }

    // If no units found, create a default structure
    if (units.length === 0) {
      units.push({
        id: 'default-1',
        name: account.account_name,
        level: 0,
      })
    }

    setBusinessUnits(units)
  }, [account])

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(prev => prev + 1)
    }
  }

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1)
    }
  }

  const handleSaveAndExit = async () => {
    setIsSaving(true)
    try {
      // Save all changes
      await saveAllChanges()
      router.push(`/accounts/${account.account_plan_id}`)
    } catch (error) {
      console.error('Failed to save:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const saveAllChanges = async () => {
    // Save new stakeholders from contacts
    const newContacts = contacts.filter(c => c.source !== 'existing' && c.placed)

    for (const contact of newContacts) {
      await fetch('/api/stakeholders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          account_plan_id: account.account_plan_id,
          full_name: contact.name,
          title: contact.title,
          department: contact.department,
          role_type: contact.roleType,
          sentiment: contact.sentiment || 'Unknown',
        }),
      })
    }

    // Save gap placeholders
    const addedGaps = gaps.filter(g => g.added)
    for (const gap of addedGaps) {
      await fetch('/api/stakeholders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          account_plan_id: account.account_plan_id,
          full_name: `TBD - ${gap.title}`,
          title: gap.title,
          department: gap.department,
          role_type: gap.roleType,
          sentiment: 'Unknown',
        }),
      })
    }
  }

  // Methodology prompt for current step
  const getMethodologyPrompt = () => {
    switch (currentStep) {
      case 0:
        return `Map ${account.account_name}'s structure. For ${methodology}, you'll need to find decision-makers across business units.`
      case 1:
        if (methodology === 'MEDDICC' || methodology === 'MEDDPICC') {
          return `For ${methodology}: Identify the Economic Buyer, Champion, and key Influencers. Tag each contact's role.`
        } else if (methodology === 'BANT') {
          return `For BANT: Who has Budget authority? Who makes the final decision? Tag contacts accordingly.`
        } else if (methodology === 'Challenger') {
          return `For Challenger: Who are the key stakeholders you need to teach and influence?`
        }
        return `Place your contacts and tag their roles in the buying process.`
      case 2:
        return `Based on ${methodology}, identify gaps: ${methodologyInfo.criteria.slice(0, 3).join(', ')}... Who's missing?`
      default:
        return ''
    }
  }

  return (
    <div className="max-w-5xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
              Build Org Chart
            </h1>
            <p className="text-zinc-500 dark:text-zinc-400">
              {account.account_name}
              {account.industry && ` • ${account.industry}`}
              {account.employee_count && ` • ${account.employee_count} employees`}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-2 py-1 rounded">
              {methodologyInfo.name}
            </span>
            <button
              onClick={handleSaveAndExit}
              disabled={isSaving}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 rounded-lg transition-colors"
            >
              {isSaving ? 'Saving...' : 'Save & Exit'}
            </button>
          </div>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-2">
          {STEPS.map((step, index) => (
            <div key={step.id} className="flex items-center">
              <button
                onClick={() => setCurrentStep(index)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                  index === currentStep
                    ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                    : index < currentStep
                    ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                    : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400'
                }`}
              >
                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                  index === currentStep
                    ? 'bg-blue-600 text-white'
                    : index < currentStep
                    ? 'bg-green-600 text-white'
                    : 'bg-zinc-300 dark:bg-zinc-600 text-zinc-600 dark:text-zinc-300'
                }`}>
                  {index < currentStep ? '✓' : index + 1}
                </span>
                <div className="text-left">
                  <p className="text-sm font-medium">{step.label}</p>
                </div>
              </button>
              {index < STEPS.length - 1 && (
                <div className={`w-8 h-0.5 mx-2 ${
                  index < currentStep ? 'bg-green-400' : 'bg-zinc-200 dark:bg-zinc-700'
                }`} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Methodology prompt */}
      <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
        <div className="flex items-start gap-3">
          <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-sm text-blue-800 dark:text-blue-300">
            {getMethodologyPrompt()}
          </p>
        </div>
      </div>

      {/* Step content */}
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6">
        {currentStep === 0 && (
          <BusinessStructureStep
            account={account}
            businessUnits={businessUnits}
            onUpdateUnits={setBusinessUnits}
          />
        )}
        {currentStep === 1 && (
          <PlaceContactsStep
            account={account}
            contacts={contacts}
            businessUnits={businessUnits}
            methodology={methodology}
            onUpdateContacts={setContacts}
          />
        )}
        {currentStep === 2 && (
          <GapAnalysisStep
            account={account}
            contacts={contacts}
            businessUnits={businessUnits}
            companyProfile={companyProfile}
            methodology={methodology}
            gaps={gaps}
            onUpdateGaps={setGaps}
          />
        )}
      </div>

      {/* Navigation */}
      <div className="mt-6 flex items-center justify-between">
        <button
          onClick={handleBack}
          disabled={currentStep === 0}
          className="px-4 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
        >
          ← Back
        </button>
        <div className="flex items-center gap-3">
          <span className="text-sm text-zinc-500">
            {contacts.filter(c => c.placed).length} contacts placed
            {gaps.filter(g => g.added).length > 0 && ` • ${gaps.filter(g => g.added).length} gaps added`}
          </span>
          {currentStep < STEPS.length - 1 ? (
            <button
              onClick={handleNext}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
            >
              Next →
            </button>
          ) : (
            <button
              onClick={handleSaveAndExit}
              disabled={isSaving}
              className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:bg-green-400 rounded-lg transition-colors"
            >
              {isSaving ? 'Saving...' : 'Complete & Save'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
