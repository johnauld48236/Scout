'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { VectorTabs } from '@/components/prototype/VectorTabs'
import { PrototypeHealthBanner } from '@/components/prototype/PrototypeHealthBanner'
import { ModeIndicator } from '@/components/prototype/DataAnnotation'
import { VectorOutDiscoveryMode } from '@/components/account/VectorOut/DiscoveryMode'
import { VectorOutExecutionMode } from '@/components/account/VectorOut/ExecutionMode'
import { VectorInDiscoveryMode } from '@/components/account/VectorIn/DiscoveryMode'
import { VectorInExecutionMode } from '@/components/account/VectorIn/ExecutionMode'
import { ExternalSourcesPanel } from '@/components/account/ExternalSourcesPanel'
import { MOCK_VECTOR_IN } from '@/components/prototype/mockData'
// Slide-out panel wrapper
import { SlideOutPanel } from '@/components/panels/SlideOutPanel'
// Mature components for consistent UX (replacing custom panels)
import { DivisionsCard } from '@/components/account/DivisionsCard'
import { StakeholderSection } from '@/components/account/StakeholderSection'
import { SignalsSection } from '@/components/account/SignalsSection'
import { IntelligenceCard } from '@/components/account/IntelligenceCard'
// Keep TrailsPanel and PlanPanel for now (no mature equivalents)
import { TrailsPanel } from '@/components/panels/TrailsPanel'
import { PlanPanel } from '@/components/panels/PlanPanel'

// Interfaces for props from server component
interface AccountData {
  account_plan_id: string
  account_name: string
  industry?: string
  headquarters?: string
  employee_count?: number
  website?: string
  is_favorite?: boolean
  in_weekly_review?: boolean
  slack_channel_url?: string
  jira_project_url?: string
  asana_project_url?: string
  // Additional fields for mature components
  account_thesis?: string
  compelling_events?: Array<{ event: string; date?: string; source?: string; impact?: 'high' | 'medium' | 'low' }>
  buying_signals?: Array<{ signal: string; type?: string; date?: string; source?: string; strength?: 'strong' | 'moderate' | 'weak' }>
  corporate_structure?: {
    headquarters?: string
    parent_company?: string
    ownership_type?: 'public' | 'private' | 'subsidiary'
    stock_symbol?: string
    employee_count?: number
    annual_revenue?: string
    founded_year?: number
    ceo?: string
    subsidiaries?: string[]
  }
}

// Raw data interfaces for mature components (full database format)
interface RawDivision {
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

interface RawStakeholder {
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
  is_placeholder?: boolean
  placeholder_role?: string
  notes?: string
  profile_notes?: string
  relationship_strength?: string
  purchasing_authority?: string
}

interface RawSignal {
  signal_id: string
  signal_type?: string
  title?: string
  summary: string
  source?: string
  confidence?: string
  category?: string
  signal_date: string
  stakeholder_id?: string
  pursuit_id?: string
  is_financial?: boolean
}

interface RawPursuit {
  pursuit_id: string
  name: string
  stage?: string
  estimated_value?: number | string
  target_close_date?: string
  deal_type?: string
  business_unit_id?: string
}

interface Spark {
  spark_id: string
  title: string
  description: string
  size: 'high' | 'medium' | 'low'
  signals_connected: string[]
  questions_to_explore: string[]
  status: string
  linked_pursuit_id: string | null
  converted_to_pursuit_id: string | null
}

interface Pursuit {
  pursuit_id: string
  name: string
  stage: string
  estimated_value: number
  target_close_date: string | null
  deal_type: string | null
}

interface ActionItem {
  action_id: string
  title: string
  due_date: string
  status: string
  priority: string
  bucket: '30' | '60' | '90'
  slip_acknowledged?: boolean
}

interface PainPoint {
  pain_point_id: string
  title: string
  severity: string
}

interface Risk {
  risk_id: string
  title: string
  severity: string
  status: string
}

interface Signal {
  signal_id: string
  title: string
  type: string
  date: string
}

interface Stakeholder {
  stakeholder_id: string
  name: string
  title: string
  influence_level: string
  email?: string
  phone?: string
  is_placeholder?: boolean
  placeholder_role?: string
}

interface Division {
  division_id: string
  name: string
}

interface DiscoveryStatus {
  structure: { complete: boolean; count: number }
  people: { complete: boolean; count: number }
  signals: { complete: boolean; count: number }
  sparks: { complete: boolean; count: number }
  plan: { complete: boolean; count: number }
}

interface PrototypePageClientProps {
  accountId: string
  account: AccountData
  sparks: Spark[]
  pursuits: Pursuit[]
  actionItems: ActionItem[]
  painPoints: PainPoint[]
  risks: Risk[]
  signals: Signal[]
  stakeholders: Stakeholder[]
  divisions: Division[]
  discoveryStatus: DiscoveryStatus
  useScoutTerminology?: boolean  // Use Scout terminology (Territory, Trail, Compass)
  // Raw data for mature components (full database format)
  rawDivisions?: RawDivision[]
  rawStakeholders?: RawStakeholder[]
  rawSignals?: RawSignal[]
  rawPursuits?: RawPursuit[]
}

export function PrototypePageClient({
  accountId,
  account,
  sparks: initialSparks,
  pursuits: initialPursuits,
  actionItems: initialActionItems,
  painPoints,
  risks,
  signals: initialSignals,
  stakeholders: initialStakeholders,
  divisions: initialDivisions,
  discoveryStatus: initialDiscoveryStatus,
  useScoutTerminology = true,  // Scout terminology is the production default
  // Raw data for mature components
  rawDivisions = [],
  rawStakeholders = [],
  rawSignals = [],
  rawPursuits = [],
}: PrototypePageClientProps) {
  const router = useRouter()

  // Local state for mutable data (allows immediate UI updates)
  const [divisions, setDivisions] = useState(initialDivisions)
  const [stakeholders, setStakeholders] = useState(initialStakeholders)
  const [signals, setSignals] = useState(initialSignals)
  const [sparks, setSparks] = useState(initialSparks)
  const [pursuits, setPursuits] = useState(initialPursuits)
  const [actionItems, setActionItems] = useState(initialActionItems)

  // Recalculate discovery status based on local state
  const discoveryStatus = {
    structure: { complete: divisions.length > 0, count: divisions.length },
    people: { complete: stakeholders.length >= 3, count: stakeholders.length },
    signals: { complete: signals.length >= 2, count: signals.length },
    sparks: { complete: sparks.length > 0, count: sparks.length },
    plan: { complete: actionItems.length > 0, count: actionItems.length },
  }

  // Scout terminology labels
  const labels = useScoutTerminology ? {
    pageType: 'Territory',
    sparks: 'Trails',
    spark: 'Trail',
    stakeholders: 'Compass',
    backLink: '/territories',
    backText: 'All Territories',
    exploreButton: 'Blaze New Trail',
    addDealButton: 'Connect to CRM',
    sourcesPanel: 'Scout Workbench',
  } : {
    pageType: 'Account',
    sparks: 'Sparks',
    spark: 'Spark',
    stakeholders: 'Stakeholders',
    backLink: '/accounts',
    backText: 'All Accounts',
    exploreButton: 'Explore Sparks',
    addDealButton: 'Add Deal',
    sourcesPanel: 'External Sources',
  }

  // State for header button statuses
  const [isFavorite, setIsFavorite] = useState(account.is_favorite || false)
  const [inWeeklyReview, setInWeeklyReview] = useState(account.in_weekly_review || false)
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Handler for favorite toggle
  const handleFavoriteToggle = useCallback(async () => {
    try {
      const response = await fetch(`/api/accounts/${accountId}/favorite`, {
        method: 'POST',
      })
      if (response.ok) {
        const data = await response.json()
        setIsFavorite(data.is_favorite)
      }
    } catch (error) {
      console.error('Failed to toggle favorite:', error)
    }
  }, [accountId])

  // Handler for weekly review toggle
  const handleWeeklyReviewToggle = useCallback(async () => {
    try {
      const response = await fetch(`/api/accounts/${accountId}/weekly-review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'toggle' }),
      })
      if (response.ok) {
        const data = await response.json()
        setInWeeklyReview(data.in_weekly_review)
      }
    } catch (error) {
      console.error('Failed to toggle weekly review:', error)
    }
  }, [accountId])

  // Handler for refresh intelligence
  const handleRefreshIntelligence = useCallback(async () => {
    setIsRefreshing(true)
    try {
      // Call AI research endpoint to refresh intelligence
      const response = await fetch('/api/ai/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          account_plan_id: accountId,
          company_name: account.account_name,
          website: account.website,
        }),
      })
      if (response.ok) {
        // Refresh the page to show updated data
        window.location.reload()
      }
    } catch (error) {
      console.error('Failed to refresh intelligence:', error)
    } finally {
      setIsRefreshing(false)
    }
  }, [accountId, account.account_name, account.website])

  // Handler for "Explore Sparks" / "Blaze New Trail" button
  const handleExploreSparks = useCallback(() => {
    // TODO: Open spark/trail creation modal or slide-out
    // For now, navigate to explore page
    alert('This will open the Trail creation interface.\n\nFeature coming soon - will let you create new hypothesis themes.')
  }, [])

  // Handler for "Add Deal" / "Connect to CRM" button
  const handleAddDeal = useCallback(() => {
    // TODO: Open pursuit creation drawer or CRM connection modal
    alert('This will open the CRM deal creation/connection interface.\n\nFeature coming soon - will let you link Trails to CRM Opportunities.')
  }, [])

  // State for vector tab
  const [activeVector, setActiveVector] = useState<'out' | 'in'>('out')

  // State for mode within each vector (can be overridden manually)
  const [vectorOutMode, setVectorOutMode] = useState<'discovery' | 'execution'>('execution')
  const [vectorInMode, setVectorInMode] = useState<'discovery' | 'execution'>('discovery')

  // State for discovery panels
  const [openPanel, setOpenPanel] = useState<'structure' | 'people' | 'signals' | 'sparks' | 'plan' | null>(null)

  // Calculate health from both vectors
  const pipelineValue = pursuits.reduce((sum, p) => sum + (p.estimated_value || 0), 0)
  const p1Count = MOCK_VECTOR_IN.issues.filter((i) => i.priority === 'P1').length // Still using mock for VectorIn

  // Calculate health status
  const health = calculateHealthStatus(pipelineValue, p1Count)

  // Calculate data areas for mode indicator
  const vectorOutDataAreas = [
    divisions.length > 0,
    stakeholders.length > 0,
    signals.length > 0,
    sparks.length > 0,
    actionItems.length > 0,
  ].filter(Boolean).length

  const vectorInDataAreas = [
    MOCK_VECTOR_IN.divisions.length > 0,
    MOCK_VECTOR_IN.contacts.length > 0,
    MOCK_VECTOR_IN.issues.length > 0,
    MOCK_VECTOR_IN.patterns.length > 0,
    MOCK_VECTOR_IN.resolution_items.length > 0,
  ].filter(Boolean).length

  // Handle step clicks (opens slide-out panels)
  const handleStepClick = (step: string) => {
    console.log('Step clicked:', step)
    setOpenPanel(step as 'structure' | 'people' | 'signals' | 'sparks' | 'plan')
  }

  // Handler for panel data refresh - fetches fresh data and updates local state
  const handlePanelUpdate = useCallback(async () => {
    try {
      // Fetch fresh data from the API
      const response = await fetch(`/api/accounts/${accountId}`)
      if (response.ok) {
        const data = await response.json()
        // Update local state with fresh data
        if (data.divisions) setDivisions(data.divisions.map((d: { division_id: string; name: string }) => ({
          division_id: d.division_id,
          name: d.name,
        })))
        if (data.stakeholders) setStakeholders(data.stakeholders.map((s: { stakeholder_id: string; full_name?: string; title?: string; influence_level?: string; engagement_level?: string; is_placeholder?: boolean; placeholder_role?: string }) => ({
          stakeholder_id: s.stakeholder_id,
          name: s.full_name || 'Unknown',
          title: s.title || '',
          influence_level: s.influence_level || s.engagement_level || 'medium',
          is_placeholder: s.is_placeholder || false,
          placeholder_role: s.placeholder_role || '',
        })))
        if (data.signals) setSignals(data.signals.map((s: { signal_id: string; title?: string; summary?: string; signal_type?: string; signal_date?: string }) => ({
          signal_id: s.signal_id,
          title: s.title || s.summary || 'Signal',
          type: s.signal_type || 'general',
          date: s.signal_date || new Date().toISOString(),
        })))
        if (data.scout_themes) setSparks(data.scout_themes.map((t: { theme_id: string; title: string; description?: string; size?: string; questions_to_explore?: string[]; status?: string; linked_pursuit_id?: string; converted_to_pursuit_id?: string }) => ({
          spark_id: t.theme_id,
          title: t.title || 'Untitled Trail',
          description: t.description || '',
          size: (t.size === 'high' || t.size === 'medium' || t.size === 'low' ? t.size : 'medium') as 'high' | 'medium' | 'low',
          signals_connected: [],
          questions_to_explore: t.questions_to_explore || [],
          status: t.status || 'exploring',
          linked_pursuit_id: t.linked_pursuit_id || null,
          converted_to_pursuit_id: t.converted_to_pursuit_id || null,
        })))
        if (data.pursuits) setPursuits(data.pursuits.map((p: { pursuit_id: string; name: string; stage?: string; estimated_value?: number | string; target_close_date?: string; deal_type?: string }) => ({
          pursuit_id: p.pursuit_id,
          name: p.name || 'Untitled Pursuit',
          stage: p.stage || 'Discovery',
          estimated_value: typeof p.estimated_value === 'string' ? parseFloat(p.estimated_value) || 0 : (p.estimated_value || 0),
          target_close_date: p.target_close_date || null,
          deal_type: p.deal_type || null,
        })))
        if (data.action_items) {
          const now = new Date()
          setActionItems(data.action_items.map((action: { action_id: string; title?: string; description?: string; due_date?: string; status?: string; priority?: string; bucket?: string; slip_acknowledged?: boolean }) => {
            let bucket: '30' | '60' | '90' = (action.bucket as '30' | '60' | '90') || '30'
            if (!action.bucket && action.due_date) {
              const dueDate = new Date(action.due_date)
              const daysFromNow = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
              if (daysFromNow > 60) bucket = '90'
              else if (daysFromNow > 30) bucket = '60'
              else bucket = '30'
            }
            return {
              action_id: action.action_id,
              title: action.title || action.description || 'Untitled Action',
              due_date: action.due_date || '',
              status: action.status || 'pending',
              priority: action.priority || 'Medium',
              bucket,
              slip_acknowledged: action.slip_acknowledged || false,
            }
          }))
        }
      }
    } catch (error) {
      console.error('Failed to refresh data:', error)
    }
    // Also trigger router refresh for any server-side state
    router.refresh()
  }, [accountId, router])

  // Prepare account data for health banner
  const bannerAccount = {
    company_name: account.account_name,
    vertical: account.industry || 'Unknown',
    headquarters: account.headquarters || 'Unknown',
    is_favorite: isFavorite,
    in_weekly_review: inWeeklyReview,
  }

  // Prepare signals for health banner (needs title and type)
  const bannerSignals = signals.slice(0, 3).map(s => ({
    title: s.title,
    type: s.type,
  }))

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--scout-parchment)' }}>
      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* Health Banner */}
        <PrototypeHealthBanner
          accountId={accountId}
          account={bannerAccount}
          health={health}
          signals={bannerSignals}
          pursuits={pursuits}
          sparks={sparks}
          vectorOutPipeline={pipelineValue}
          vectorInP1Count={p1Count}
          onFavoriteToggle={handleFavoriteToggle}
          onWeeklyReviewToggle={handleWeeklyReviewToggle}
          onRefreshIntelligence={handleRefreshIntelligence}
        />

        {/* External Sources Panel */}
        <div className="mt-4">
          <ExternalSourcesPanel
            accountPlanId={accountId}
            accountSlug={account.account_name?.toLowerCase().replace(/[^a-z0-9]/g, '-').slice(0, 20) || accountId.slice(0, 8)}
            slackChannelUrl={account.slack_channel_url}
            jiraProjectUrl={account.jira_project_url}
            asanaProjectUrl={account.asana_project_url}
          />
        </div>

        {/* Vector Tabs */}
        <VectorTabs activeVector={activeVector} onVectorChange={setActiveVector} />

        {/* Vector Content */}
        <div
          className="rounded-xl border"
          style={{ backgroundColor: 'var(--scout-white)', borderColor: 'var(--scout-border)' }}
        >
          {activeVector === 'out' ? (
            <>
              {/* Mode Indicator for Vector Out */}
              <div className="px-6 pt-4">
                <ModeIndicator
                  mode={vectorOutMode}
                  dataAreas={vectorOutDataAreas}
                  onToggle={() => setVectorOutMode(vectorOutMode === 'execution' ? 'discovery' : 'execution')}
                />
              </div>

              {/* Vector Out Content */}
              {vectorOutMode === 'discovery' ? (
                <VectorOutDiscoveryMode
                  discoveryStatus={discoveryStatus}
                  onStepClick={handleStepClick}
                />
              ) : (
                <VectorOutExecutionMode
                  accountPlanId={accountId}
                  sparks={sparks}
                  pursuits={pursuits}
                  actionItems={actionItems}
                  painPoints={painPoints}
                  risks={risks}
                  signals={signals}
                  stakeholders={stakeholders}
                  divisions={divisions}
                  onExploreSparks={handleExploreSparks}
                  onAddDeal={handleAddDeal}
                  onActionUpdate={handlePanelUpdate}
                />
              )}
            </>
          ) : (
            <>
              {/* Mode Indicator for Vector In */}
              <div className="px-6 pt-4">
                <ModeIndicator
                  mode={vectorInMode}
                  dataAreas={vectorInDataAreas}
                  onToggle={() => setVectorInMode(vectorInMode === 'execution' ? 'discovery' : 'execution')}
                />
              </div>

              {/* Vector In Content - Still using mock data */}
              {vectorInMode === 'discovery' ? (
                <VectorInDiscoveryMode
                  discoveryStatus={MOCK_VECTOR_IN.discovery_status}
                  onStepClick={handleStepClick}
                />
              ) : (
                <VectorInExecutionMode
                  patterns={MOCK_VECTOR_IN.patterns}
                  issues={MOCK_VECTOR_IN.issues}
                  issueSignals={MOCK_VECTOR_IN.issue_signals}
                  contacts={MOCK_VECTOR_IN.contacts}
                  resolutionItems={MOCK_VECTOR_IN.resolution_items}
                />
              )}
            </>
          )}
        </div>

      </div>

      {/* Discovery Slide-Out Panels - Using mature components for consistent UX */}
      <SlideOutPanel
        isOpen={openPanel === 'structure'}
        onClose={() => setOpenPanel(null)}
        title="Terrain"
        subtitle="Map the organizational landscape"
      >
        <div className="space-y-4">
          <DivisionsCard
            accountPlanId={accountId}
            divisions={rawDivisions}
            stakeholders={rawStakeholders}
            pursuits={rawPursuits}
            corporateStructure={account.corporate_structure}
            accountName={account.account_name}
            website={account.website}
            industry={account.industry}
          />
        </div>
      </SlideOutPanel>

      <SlideOutPanel
        isOpen={openPanel === 'people'}
        onClose={() => setOpenPanel(null)}
        title="Compass"
        subtitle="People who guide your direction"
      >
        <div className="space-y-4">
          <StakeholderSection
            accountPlanId={accountId}
            stakeholders={rawStakeholders}
            divisions={rawDivisions}
            accountName={account.account_name}
            website={account.website}
            industry={account.industry}
          />
        </div>
      </SlideOutPanel>

      <SlideOutPanel
        isOpen={openPanel === 'signals'}
        onClose={() => setOpenPanel(null)}
        title="Recon"
        subtitle="Reconnaissance and market signals"
      >
        <div className="space-y-4">
          {/* Intelligence Card for thesis, events, buying signals */}
          <IntelligenceCard
            accountPlanId={accountId}
            accountThesis={account.account_thesis}
            compellingEvents={account.compelling_events}
            buyingSignals={account.buying_signals}
            onRefresh={handlePanelUpdate}
          />
          {/* Signals Section for research signals */}
          <SignalsSection
            accountId={accountId}
            signals={rawSignals}
            stakeholders={rawStakeholders}
            pursuits={rawPursuits}
            accountName={account.account_name}
            website={account.website}
            industry={account.industry}
            divisions={rawDivisions}
          />
        </div>
      </SlideOutPanel>

      <SlideOutPanel
        isOpen={openPanel === 'sparks'}
        onClose={() => setOpenPanel(null)}
        title="Trails"
        subtitle="Paths to winning"
      >
        <TrailsPanel
          accountPlanId={accountId}
          sparks={sparks}
          pursuits={pursuits}
          onUpdate={handlePanelUpdate}
          useScoutTerminology={useScoutTerminology}
        />
      </SlideOutPanel>

      <SlideOutPanel
        isOpen={openPanel === 'plan'}
        onClose={() => setOpenPanel(null)}
        title="Journey"
        subtitle="Your path forward"
      >
        <PlanPanel
          accountPlanId={accountId}
          actionItems={actionItems}
          onUpdate={handlePanelUpdate}
        />
      </SlideOutPanel>
    </div>
  )
}

// Health calculation helper
function calculateHealthStatus(pipelineValue: number, p1Count: number): {
  status: 'healthy' | 'at_risk' | 'critical'
  reason: string
} {
  const hasPipeline = pipelineValue > 0
  const hasP1Issues = p1Count > 0

  if (hasP1Issues && !hasPipeline) {
    return { status: 'critical', reason: `${p1Count} P1 tickets and no active pipeline` }
  }
  if (hasP1Issues && hasPipeline) {
    return { status: 'at_risk', reason: `Strong pipeline ($${(pipelineValue / 1000).toFixed(0)}K) but ${p1Count} P1 tickets open` }
  }
  if (!hasP1Issues && hasPipeline) {
    return { status: 'healthy', reason: `$${(pipelineValue / 1000).toFixed(0)}K pipeline, no critical issues` }
  }
  return { status: 'at_risk', reason: 'Limited engagement - needs attention' }
}
