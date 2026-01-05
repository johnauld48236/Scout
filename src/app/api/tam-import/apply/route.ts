import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

interface ApplyChange {
  id: string
  change_type: 'new' | 'modified'
  company_name: string
  proposed: {
    vertical: string
    website: string | null
    fit_tier: string | null
    estimated_deal_value: number | null
    company_summary: string | null
  }
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()

  try {
    const body = await request.json()
    const { changes } = body as { changes: ApplyChange[] }

    if (!changes || !Array.isArray(changes)) {
      return NextResponse.json({ error: 'changes array is required' }, { status: 400 })
    }

    // Filter to only new and modified
    const toProcess = changes.filter(c => c.change_type === 'new' || c.change_type === 'modified')

    const results = {
      created: 0,
      updated: 0,
      errors: [] as string[],
    }

    for (const change of toProcess) {
      try {
        if (change.change_type === 'new') {
          // Create new TAM account
          const insertData: Record<string, unknown> = {
            company_name: change.company_name,
            vertical: change.proposed.vertical,
            status: 'Prospecting',
            fit_tier: change.proposed.fit_tier || 'C',
          }

          if (change.proposed.website) insertData.website = change.proposed.website
          if (change.proposed.estimated_deal_value) insertData.estimated_deal_value = change.proposed.estimated_deal_value
          if (change.proposed.company_summary) insertData.fit_rationale = change.proposed.company_summary

          const { error: insertError } = await supabase
            .from('tam_accounts')
            .insert(insertData)

          if (insertError) {
            results.errors.push(`Failed to create ${change.company_name}: ${insertError.message}`)
          } else {
            results.created++
          }
        }

        if (change.change_type === 'modified') {
          // Update existing TAM account
          const updateData: Record<string, unknown> = {
            updated_at: new Date().toISOString(),
          }

          if (change.proposed.vertical) updateData.vertical = change.proposed.vertical
          if (change.proposed.website) updateData.website = change.proposed.website
          if (change.proposed.fit_tier) updateData.fit_tier = change.proposed.fit_tier
          if (change.proposed.estimated_deal_value) updateData.estimated_deal_value = change.proposed.estimated_deal_value
          if (change.proposed.company_summary) updateData.company_summary = change.proposed.company_summary

          const { error: updateError } = await supabase
            .from('tam_accounts')
            .update(updateData)
            .eq('tam_account_id', change.id)

          if (updateError) {
            results.errors.push(`Failed to update ${change.company_name}: ${updateError.message}`)
          } else {
            results.updated++
          }
        }
      } catch (err) {
        results.errors.push(`Error processing ${change.company_name}: ${err}`)
      }
    }

    const anySuccess = results.created > 0 || results.updated > 0
    const allFailed = !anySuccess && results.errors.length > 0

    return NextResponse.json({
      success: !allFailed,
      results,
      message: `Created ${results.created}, updated ${results.updated} TAM accounts.${results.errors.length > 0 ? ` (${results.errors.length} errors)` : ''}`,
    })
  } catch (error) {
    console.error('TAM apply error:', error)
    return NextResponse.json({ error: 'Failed to apply changes' }, { status: 500 })
  }
}
