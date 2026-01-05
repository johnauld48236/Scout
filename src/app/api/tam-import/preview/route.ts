import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

interface TamChange {
  id: string
  company_name: string
  vertical: string
  change_type: 'new' | 'modified' | 'unchanged'
  current?: {
    id: string
    vertical: string | null
    fit_tier: string | null
    estimated_deal_value: number | null
  }
  proposed?: {
    vertical: string
    website: string | null
    fit_tier: string | null
    estimated_deal_value: number | null
    company_summary: string | null
  }
  changes?: string[]
}

interface PreviewResponse {
  summary: {
    new: number
    modified: number
    unchanged: number
    total: number
  }
  changes: TamChange[]
  timestamp: string
}

interface DBTamAccount {
  tam_account_id: string
  company_name: string
  vertical: string | null
  website: string | null
  fit_tier: string | null
  estimated_deal_value: number | null
  company_summary: string | null
}

// POST - Compare uploaded TAM data against current database
export async function POST(request: NextRequest) {
  const supabase = await createClient()

  try {
    const body = await request.json()
    const { accounts } = body as { accounts: Array<{
      company_name: string
      website: string | null
      vertical: string
      fit_tier: string | null
      estimated_deal_value: number | null
      company_summary: string | null
    }> }

    if (!accounts || !Array.isArray(accounts)) {
      return NextResponse.json({ error: 'accounts array is required' }, { status: 400 })
    }

    // Get current TAM accounts from database
    const { data: existingAccounts, error: fetchError } = await supabase
      .from('tam_accounts')
      .select('tam_account_id, company_name, vertical, website, fit_tier, estimated_deal_value, company_summary')

    if (fetchError) {
      console.error('Error fetching TAM accounts:', fetchError)
      return NextResponse.json({ error: 'Failed to fetch existing accounts' }, { status: 500 })
    }

    // Create lookup map by company name (normalized)
    const existingByName = new Map<string, DBTamAccount>()
    ;(existingAccounts || []).forEach(a => {
      existingByName.set(a.company_name.toLowerCase().trim(), a)
    })

    const changes: TamChange[] = []

    // Compare each incoming account
    for (const account of accounts) {
      const normalizedName = account.company_name.toLowerCase().trim()
      const existing = existingByName.get(normalizedName)

      if (!existing) {
        // New account
        changes.push({
          id: `new_${normalizedName}`,
          company_name: account.company_name,
          vertical: account.vertical,
          change_type: 'new',
          proposed: {
            vertical: account.vertical,
            website: account.website,
            fit_tier: account.fit_tier,
            estimated_deal_value: account.estimated_deal_value,
            company_summary: account.company_summary,
          },
        })
      } else {
        // Compare for changes
        const changedFields: string[] = []

        // Only flag as change if we have new data to add
        if (account.vertical && account.vertical !== existing.vertical) {
          changedFields.push(`Vertical: ${existing.vertical || 'None'} → ${account.vertical}`)
        }
        if (account.website && !existing.website) {
          changedFields.push(`Website: Added ${account.website}`)
        }
        if (account.fit_tier && account.fit_tier !== existing.fit_tier) {
          changedFields.push(`Tier: ${existing.fit_tier || 'None'} → ${account.fit_tier}`)
        }
        if (account.estimated_deal_value && !existing.estimated_deal_value) {
          changedFields.push(`Value: Added $${account.estimated_deal_value.toLocaleString()}`)
        }

        changes.push({
          id: existing.tam_account_id,
          company_name: account.company_name,
          vertical: account.vertical,
          change_type: changedFields.length > 0 ? 'modified' : 'unchanged',
          current: {
            id: existing.tam_account_id,
            vertical: existing.vertical,
            fit_tier: existing.fit_tier,
            estimated_deal_value: existing.estimated_deal_value,
          },
          proposed: changedFields.length > 0 ? {
            vertical: account.vertical,
            website: account.website,
            fit_tier: account.fit_tier,
            estimated_deal_value: account.estimated_deal_value,
            company_summary: account.company_summary,
          } : undefined,
          changes: changedFields.length > 0 ? changedFields : undefined,
        })
      }
    }

    // Sort: new first, then modified, then unchanged
    const sortOrder = { new: 0, modified: 1, unchanged: 2 }
    changes.sort((a, b) => sortOrder[a.change_type] - sortOrder[b.change_type])

    const summary = {
      new: changes.filter(c => c.change_type === 'new').length,
      modified: changes.filter(c => c.change_type === 'modified').length,
      unchanged: changes.filter(c => c.change_type === 'unchanged').length,
      total: changes.length,
    }

    const response: PreviewResponse = {
      summary,
      changes,
      timestamp: new Date().toISOString(),
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('TAM preview error:', error)
    return NextResponse.json({ error: 'Failed to generate preview' }, { status: 500 })
  }
}
