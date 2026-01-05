'use client'

import { useState, useCallback, useEffect } from 'react'
import { StakeholderDrawer } from '@/components/drawers/StakeholderDrawer'
import { DivisionDrawer } from '@/components/drawers/DivisionDrawer'
import { SignalDrawer } from '@/components/drawers/SignalDrawer'
import { OpportunityDrawer } from '@/components/drawers/OpportunityDrawer'

// Types
interface Division {
  division_id: string
  account_plan_id: string
  name: string
  description?: string
  division_type?: string
  products?: string[]
  parent_division_id?: string
  headcount?: number
  revenue_estimate?: string
  key_focus_areas?: string[]
  sort_order?: number
}

interface Stakeholder {
  stakeholder_id: string
  account_plan_id?: string
  full_name: string
  title?: string
  email?: string
  phone?: string
  linkedin_url?: string
  role_type?: string
  sentiment?: string
  business_unit?: string
  department?: string
  division_id?: string
  notes?: string
  profile_notes?: string
  relationship_strength?: string
  purchasing_authority?: string
  is_placeholder?: boolean
}

interface Pursuit {
  pursuit_id: string
  account_plan_id?: string
  name: string
  thesis?: string
  estimated_value?: number
  business_unit_id?: string
  pursuit_type?: string
  stage?: string
  created_at?: string
}

interface CompellingEvent {
  event: string
  date?: string
  source?: string
  impact?: 'high' | 'medium' | 'low'
}

interface BuyingSignal {
  signal: string
  type?: string
  date?: string
  source?: string
  strength?: 'strong' | 'moderate' | 'weak'
}

interface AccountData {
  account_plan_id: string
  account_thesis?: string
  compelling_events?: CompellingEvent[]
  buying_signals?: BuyingSignal[]
}

interface AccountPageClientProps {
  accountPlanId: string
  initialStakeholders: Stakeholder[]
  initialDivisions: Division[]
  initialPursuits: Pursuit[]
  accountData: AccountData
  children: React.ReactNode
}

// Context to pass drawer handlers to child components
export interface DrawerHandlers {
  openStakeholder: (stakeholder: Stakeholder) => void
  openDivision: (division: Division | null, mode?: 'edit' | 'create') => void
  openSignals: () => void
  openOpportunity: (pursuit: Pursuit | null, mode?: 'edit' | 'create') => void
}

// Create context - will be used by child components
import { createContext, useContext } from 'react'

const DrawerContext = createContext<DrawerHandlers | null>(null)

export function useDrawerHandlers() {
  const context = useContext(DrawerContext)
  if (!context) {
    throw new Error('useDrawerHandlers must be used within AccountPageClient')
  }
  return context
}

// Main client component
export function AccountPageClient({
  accountPlanId,
  initialStakeholders,
  initialDivisions,
  initialPursuits,
  accountData,
  children,
}: AccountPageClientProps) {
  // State
  const [stakeholders, setStakeholders] = useState(initialStakeholders)
  const [divisions, setDivisions] = useState(initialDivisions)
  const [pursuits, setPursuits] = useState(initialPursuits)
  const [account, setAccount] = useState(accountData)

  // Drawer state
  const [stakeholderDrawer, setStakeholderDrawer] = useState<{ isOpen: boolean; stakeholder: Stakeholder | null }>({
    isOpen: false,
    stakeholder: null,
  })

  const [divisionDrawer, setDivisionDrawer] = useState<{ isOpen: boolean; division: Division | null; mode: 'edit' | 'create' }>({
    isOpen: false,
    division: null,
    mode: 'edit',
  })

  const [signalDrawer, setSignalDrawer] = useState(false)

  const [opportunityDrawer, setOpportunityDrawer] = useState<{ isOpen: boolean; pursuit: Pursuit | null; mode: 'edit' | 'create' }>({
    isOpen: false,
    pursuit: null,
    mode: 'edit',
  })

  // Fetch divisions on mount if not provided
  useEffect(() => {
    if (initialDivisions.length === 0) {
      fetch(`/api/accounts/${accountPlanId}/divisions`)
        .then(res => res.json())
        .then(data => {
          if (data.divisions) {
            setDivisions(data.divisions)
          }
        })
        .catch(console.error)
    }
  }, [accountPlanId, initialDivisions.length])

  // Handlers
  const openStakeholder = useCallback((stakeholder: Stakeholder) => {
    setStakeholderDrawer({ isOpen: true, stakeholder })
  }, [])

  const openDivision = useCallback((division: Division | null, mode: 'edit' | 'create' = 'edit') => {
    setDivisionDrawer({ isOpen: true, division, mode })
  }, [])

  const openSignals = useCallback(() => {
    setSignalDrawer(true)
  }, [])

  const openOpportunity = useCallback((pursuit: Pursuit | null, mode: 'edit' | 'create' = 'edit') => {
    setOpportunityDrawer({ isOpen: true, pursuit, mode })
  }, [])

  // Save handlers
  const handleStakeholderSave = useCallback((updated: Stakeholder) => {
    setStakeholders(prev => prev.map(s =>
      s.stakeholder_id === updated.stakeholder_id ? updated : s
    ))
  }, [])

  const handleStakeholderDelete = useCallback((id: string) => {
    setStakeholders(prev => prev.filter(s => s.stakeholder_id !== id))
  }, [])

  const handleDivisionSave = useCallback((updated: Division) => {
    setDivisions(prev => {
      const exists = prev.some(d => d.division_id === updated.division_id)
      if (exists) {
        return prev.map(d => d.division_id === updated.division_id ? updated : d)
      }
      return [...prev, updated]
    })
  }, [])

  const handleDivisionDelete = useCallback((id: string) => {
    setDivisions(prev => prev.filter(d => d.division_id !== id))
  }, [])

  const handleSignalsSave = useCallback((data: {
    account_thesis?: string
    compelling_events?: CompellingEvent[]
    buying_signals?: BuyingSignal[]
  }) => {
    setAccount(prev => ({ ...prev, ...data }))
  }, [])

  const handleOpportunitySave = useCallback((updated: Pursuit) => {
    setPursuits(prev => {
      const exists = prev.some(p => p.pursuit_id === updated.pursuit_id)
      if (exists) {
        return prev.map(p => p.pursuit_id === updated.pursuit_id ? updated : p)
      }
      return [...prev, updated]
    })
  }, [])

  const handleOpportunityDelete = useCallback((id: string) => {
    setPursuits(prev => prev.filter(p => p.pursuit_id !== id))
  }, [])

  // Handler object for context
  const handlers: DrawerHandlers = {
    openStakeholder,
    openDivision,
    openSignals,
    openOpportunity,
  }

  return (
    <DrawerContext.Provider value={handlers}>
      {children}

      {/* Stakeholder Drawer */}
      <StakeholderDrawer
        isOpen={stakeholderDrawer.isOpen}
        onClose={() => setStakeholderDrawer({ isOpen: false, stakeholder: null })}
        stakeholder={stakeholderDrawer.stakeholder}
        accountPlanId={accountPlanId}
        divisions={divisions}
        onSave={handleStakeholderSave}
        onDelete={handleStakeholderDelete}
      />

      {/* Division Drawer */}
      <DivisionDrawer
        isOpen={divisionDrawer.isOpen}
        onClose={() => setDivisionDrawer({ isOpen: false, division: null, mode: 'edit' })}
        division={divisionDrawer.division}
        accountPlanId={accountPlanId}
        allDivisions={divisions}
        stakeholders={stakeholders}
        onSave={handleDivisionSave}
        onDelete={handleDivisionDelete}
        mode={divisionDrawer.mode}
      />

      {/* Signal Drawer */}
      <SignalDrawer
        isOpen={signalDrawer}
        onClose={() => setSignalDrawer(false)}
        accountPlanId={accountPlanId}
        accountThesis={account.account_thesis}
        compellingEvents={account.compelling_events}
        buyingSignals={account.buying_signals}
        onSave={handleSignalsSave}
      />

      {/* Opportunity Drawer */}
      <OpportunityDrawer
        isOpen={opportunityDrawer.isOpen}
        onClose={() => setOpportunityDrawer({ isOpen: false, pursuit: null, mode: 'edit' })}
        pursuit={opportunityDrawer.pursuit}
        accountPlanId={accountPlanId}
        divisions={divisions}
        onSave={handleOpportunitySave}
        onDelete={handleOpportunityDelete}
        mode={opportunityDrawer.mode}
      />
    </DrawerContext.Provider>
  )
}

// Clickable wrapper components
export function ClickableStakeholderCard({
  stakeholder,
  children,
}: {
  stakeholder: Stakeholder
  children: React.ReactNode
}) {
  const { openStakeholder } = useDrawerHandlers()

  return (
    <div
      onClick={() => openStakeholder(stakeholder)}
      className="cursor-pointer transition-all hover:shadow-md hover:-translate-y-0.5"
    >
      {children}
    </div>
  )
}

export function ClickableDivisionCard({
  division,
  children,
}: {
  division: Division
  children: React.ReactNode
}) {
  const { openDivision } = useDrawerHandlers()

  return (
    <div
      onClick={() => openDivision(division)}
      className="cursor-pointer transition-all hover:shadow-md hover:-translate-y-0.5"
    >
      {children}
    </div>
  )
}

export function ClickableOpportunityCard({
  pursuit,
  children,
}: {
  pursuit: Pursuit
  children: React.ReactNode
}) {
  const { openOpportunity } = useDrawerHandlers()

  return (
    <div
      onClick={() => openOpportunity(pursuit)}
      className="cursor-pointer transition-all hover:shadow-md hover:-translate-y-0.5"
    >
      {children}
    </div>
  )
}

export function AddDivisionButton() {
  const { openDivision } = useDrawerHandlers()

  return (
    <button
      onClick={() => openDivision(null, 'create')}
      className="text-xs px-2 py-1 rounded border hover:bg-gray-50"
      style={{ borderColor: 'var(--scout-border)', color: 'var(--scout-saddle)' }}
    >
      + Add Division
    </button>
  )
}

export function AddOpportunityButton() {
  const { openOpportunity } = useDrawerHandlers()

  return (
    <button
      onClick={() => openOpportunity(null, 'create')}
      className="text-xs px-2 py-1 rounded border hover:bg-gray-50"
      style={{ borderColor: 'var(--scout-border)', color: 'var(--scout-saddle)' }}
    >
      + Add Opportunity
    </button>
  )
}

export function EditSignalsButton() {
  const { openSignals } = useDrawerHandlers()

  return (
    <button
      onClick={openSignals}
      className="text-xs px-2 py-1 rounded border hover:bg-gray-50 flex items-center gap-1"
      style={{ borderColor: 'var(--scout-border)', color: 'var(--scout-saddle)' }}
    >
      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      Edit Intelligence
    </button>
  )
}
