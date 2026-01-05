import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export interface PipelineChange {
  id: string
  deal_name: string
  company_name: string
  change_type: 'new' | 'modified' | 'unchanged' | 'removed'
  current?: {
    pursuit_id: string
    stage: string
    estimated_value: number | null
    deal_owner: string | null
    target_quarter: string | null
    pursuit_type: string | null
    probability: number | null
  }
  proposed?: {
    stage: string
    estimated_value: number | null
    weighted_value: number | null
    probability: number | null
    deal_owner: string | null
    target_quarter: string | null
    pursuit_type: string | null
    close_date?: string | null
    vertical?: string | null
    recurring_value?: number | null
  }
  changes?: string[] // List of what changed
}

export interface PreviewResponse {
  summary: {
    new: number
    modified: number
    unchanged: number
    removed: number
    total: number
  }
  changes: PipelineChange[]
  timestamp: string
}

// Define pursuit type for database results
interface DBPursuit {
  pursuit_id: string
  name: string
  stage: string | null
  estimated_value: number | null
  weighted_value: number | null
  probability: number | null
  deal_owner: string | null
  target_quarter: string | null
  pursuit_type: string | null
  account_plan_id: string
  account_plans: { account_name: string }[] | { account_name: string } | null
}

// Simulated data from spreadsheet - in real implementation this would parse the Excel file
// For now, we'll re-read from the database and show what would be imported
export async function GET() {
  const supabase = await createClient()

  try {
    // Get current pursuits from database
    const { data: existingPursuits, error: pursuitsError } = await supabase
      .from('pursuits')
      .select(`
        pursuit_id,
        name,
        stage,
        estimated_value,
        weighted_value,
        probability,
        deal_owner,
        target_quarter,
        pursuit_type,
        account_plan_id,
        account_plans(account_name)
      `)
      .order('name')

    if (pursuitsError) {
      console.error('Error fetching pursuits:', pursuitsError)
      return NextResponse.json({ error: 'Failed to fetch pursuits' }, { status: 500 })
    }

    // For the preview, we'll show all current pursuits as "unchanged"
    // with the ability to mark them for various operations
    // In a real implementation, this would compare against the Excel file data

    // Helper to extract account name
    const getAccountName = (ap: DBPursuit['account_plans']): string => {
      if (!ap) return 'Unknown'
      if (Array.isArray(ap)) return ap[0]?.account_name || 'Unknown'
      return ap.account_name || 'Unknown'
    }

    const changes: PipelineChange[] = ((existingPursuits || []) as DBPursuit[]).map((pursuit) => ({
      id: pursuit.pursuit_id,
      deal_name: pursuit.name,
      company_name: getAccountName(pursuit.account_plans),
      change_type: 'unchanged' as const,
      current: {
        pursuit_id: pursuit.pursuit_id,
        stage: pursuit.stage || 'Discovery',
        estimated_value: pursuit.estimated_value,
        probability: pursuit.probability,
        deal_owner: pursuit.deal_owner,
        target_quarter: pursuit.target_quarter,
        pursuit_type: pursuit.pursuit_type,
      },
    }))

    const response: PreviewResponse = {
      summary: {
        new: 0,
        modified: 0,
        unchanged: changes.length,
        removed: 0,
        total: changes.length,
      },
      changes,
      timestamp: new Date().toISOString(),
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Pipeline preview error:', error)
    return NextResponse.json({ error: 'Failed to generate preview' }, { status: 500 })
  }
}

// POST - Compare uploaded spreadsheet data against current database
export async function POST(request: NextRequest) {
  const supabase = await createClient()

  try {
    const body = await request.json()
    const { deals } = body as { deals: Array<{
      deal_name: string
      company_name: string
      stage: string
      estimated_value: number | null
      weighted_value: number | null
      probability: number | null
      recurring_value?: number | null
      deal_owner: string | null
      target_quarter: string | null
      deal_type: string | null
      vertical?: string | null
      close_date?: string | null
    }> }

    if (!deals || !Array.isArray(deals)) {
      return NextResponse.json({ error: 'deals array is required' }, { status: 400 })
    }

    // Get current pursuits from database
    const { data: existingPursuits, error: pursuitsError } = await supabase
      .from('pursuits')
      .select(`
        pursuit_id,
        name,
        stage,
        estimated_value,
        weighted_value,
        probability,
        deal_owner,
        target_quarter,
        pursuit_type,
        account_plan_id,
        account_plans(account_name)
      `)

    if (pursuitsError) {
      console.error('Error fetching pursuits:', pursuitsError)
      return NextResponse.json({ error: 'Failed to fetch pursuits' }, { status: 500 })
    }

    // Create lookup map by deal name (normalized)
    const typedPursuits = (existingPursuits || []) as DBPursuit[]
    const existingByName = new Map<string, DBPursuit>()
    typedPursuits.forEach(p => {
      existingByName.set(p.name.toLowerCase().trim(), p)
    })

    const changes: PipelineChange[] = []
    const processedNames = new Set<string>()

    // Map deal type to pursuit type
    // Deal Types: PoC, Pilot, New Business, Renewal, Recurring, Upsell
    const mapDealType = (dealType: string | null): string => {
      if (!dealType) return 'new_business'
      const dt = dealType.toLowerCase().trim()
      if (dt === 'recurring') return 'recurring'  // Baseline ARR
      if (dt === 'renewal') return 'renewal'
      if (dt === 'upsell' || dt === 'expansion') return 'upsell'
      // PoC, Pilot, New Business all count as new_business
      return 'new_business'
    }

    // Helper to extract account name
    const getAccountName = (ap: DBPursuit['account_plans']): string => {
      if (!ap) return 'Unknown'
      if (Array.isArray(ap)) return ap[0]?.account_name || 'Unknown'
      return ap.account_name || 'Unknown'
    }

    // Compare each incoming deal
    for (const deal of deals) {
      const normalizedName = deal.deal_name.toLowerCase().trim()
      processedNames.add(normalizedName)

      const existing = existingByName.get(normalizedName)

      if (!existing) {
        // New deal
        changes.push({
          id: `new_${normalizedName}`,
          deal_name: deal.deal_name,
          company_name: deal.company_name,
          change_type: 'new',
          proposed: {
            stage: deal.stage || 'Discovery',
            estimated_value: deal.estimated_value,
            weighted_value: deal.weighted_value,
            probability: deal.probability,
            deal_owner: deal.deal_owner,
            target_quarter: deal.target_quarter,
            pursuit_type: mapDealType(deal.deal_type),
            close_date: deal.close_date,
            vertical: deal.vertical,
            recurring_value: deal.recurring_value,
          },
        })
      } else {
        // Compare for changes
        const changedFields: string[] = []

        // Helper to normalize strings for comparison (trim whitespace, lowercase)
        const normalize = (s: string | null | undefined): string =>
          (s || '').trim().toLowerCase()

        if (deal.stage && deal.stage !== existing.stage) {
          changedFields.push(`Stage: ${existing.stage} → ${deal.stage}`)
        }
        if (deal.estimated_value !== existing.estimated_value) {
          changedFields.push(`Value: ${formatCurrency(existing.estimated_value)} → ${formatCurrency(deal.estimated_value)}`)
        }
        // Compare owner with normalization (ignore case/whitespace differences)
        if (deal.deal_owner && normalize(deal.deal_owner) !== normalize(existing.deal_owner)) {
          changedFields.push(`Owner: ${existing.deal_owner || 'None'} → ${deal.deal_owner}`)
        }
        // Compare quarter with normalization
        if (deal.target_quarter && normalize(deal.target_quarter) !== normalize(existing.target_quarter)) {
          changedFields.push(`Quarter: ${existing.target_quarter || 'None'} → ${deal.target_quarter}`)
        }
        // Compare probability - convert spreadsheet decimal to integer for comparison
        if (deal.probability != null) {
          const newProb = deal.probability <= 1 ? Math.round(deal.probability * 100) : Math.round(deal.probability)
          const existingProb = existing.probability || 0
          if (newProb !== existingProb) {
            changedFields.push(`Probability: ${existingProb}% → ${newProb}%`)
          }
        }
        // Compare weighted_value from Column P
        if (deal.weighted_value != null) {
          const existingWeighted = existing.weighted_value
          if (existingWeighted == null || Math.abs(deal.weighted_value - existingWeighted) > 1) {
            changedFields.push(`Weighted: ${existingWeighted ? formatCurrency(existingWeighted) : 'N/A'} → ${formatCurrency(deal.weighted_value)}`)
          }
        }

        changes.push({
          id: existing.pursuit_id,
          deal_name: deal.deal_name,
          company_name: getAccountName(existing.account_plans) || deal.company_name,
          change_type: changedFields.length > 0 ? 'modified' : 'unchanged',
          current: {
            pursuit_id: existing.pursuit_id,
            stage: existing.stage || 'Discovery',
            estimated_value: existing.estimated_value,
            probability: existing.probability,
            deal_owner: existing.deal_owner,
            target_quarter: existing.target_quarter,
            pursuit_type: existing.pursuit_type,
          },
          proposed: changedFields.length > 0 ? {
            stage: deal.stage || existing.stage || 'Discovery',
            estimated_value: deal.estimated_value ?? existing.estimated_value,
            weighted_value: deal.weighted_value,
            probability: deal.probability,
            deal_owner: deal.deal_owner || existing.deal_owner,
            target_quarter: deal.target_quarter || existing.target_quarter,
            pursuit_type: mapDealType(deal.deal_type) || existing.pursuit_type,
            close_date: deal.close_date,
            vertical: deal.vertical,
            recurring_value: deal.recurring_value,
          } : undefined,
          changes: changedFields.length > 0 ? changedFields : undefined,
        })
      }
    }

    // Find removed deals (in DB but not in spreadsheet)
    typedPursuits.forEach(p => {
      if (!processedNames.has(p.name.toLowerCase().trim())) {
        changes.push({
          id: p.pursuit_id,
          deal_name: p.name,
          company_name: getAccountName(p.account_plans),
          change_type: 'removed',
          current: {
            pursuit_id: p.pursuit_id,
            stage: p.stage || 'Discovery',
            estimated_value: p.estimated_value,
            probability: p.probability,
            deal_owner: p.deal_owner,
            target_quarter: p.target_quarter,
            pursuit_type: p.pursuit_type,
          },
        })
      }
    })

    // Sort: new first, then modified, then removed, then unchanged
    const sortOrder = { new: 0, modified: 1, removed: 2, unchanged: 3 }
    changes.sort((a, b) => sortOrder[a.change_type] - sortOrder[b.change_type])

    const summary = {
      new: changes.filter(c => c.change_type === 'new').length,
      modified: changes.filter(c => c.change_type === 'modified').length,
      unchanged: changes.filter(c => c.change_type === 'unchanged').length,
      removed: changes.filter(c => c.change_type === 'removed').length,
      total: changes.length,
    }

    const response: PreviewResponse = {
      summary,
      changes,
      timestamp: new Date().toISOString(),
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Pipeline preview error:', error)
    return NextResponse.json({ error: 'Failed to generate preview' }, { status: 500 })
  }
}

function formatCurrency(value: number | null): string {
  if (value === null || value === undefined) return 'N/A'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}
