import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// PATCH /api/tam/[id] - Update TAM account
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const body = await request.json()

    // Build update object with only provided fields
    const updateData: Record<string, unknown> = {}

    // Note: 'industry' is NOT a column in tam_accounts - use 'vertical' instead
    const allowedFields = [
      'company_name',
      'website',
      'vertical',
      // 'industry' - NOT in tam_accounts table, mapped to vertical below
      'employee_count',
      'annual_revenue',
      'headquarters',
      'city',
      'state',
      'country',
      'company_summary',
      'fit_rationale',
      'fit_tier',
      'status',
      'priority_score',
      'estimated_deal_value',
      'hubspot_company_id',
      'account_thesis',
      'campaign_ids',
      'compelling_events',
      'buying_signals',
      'notes',
      // Promotion linkage
      'account_plan_id',
      'promoted_to_account_plan_id',
      'promoted_at',
    ]

    // Map 'industry' to 'vertical' if provided (industry is not a TAM column)
    if ('industry' in body && !('vertical' in body)) {
      body.vertical = body.industry
    }
    delete body.industry

    for (const field of allowedFields) {
      if (field in body) {
        updateData[field] = body[field] === '' ? null : body[field]
      }
    }

    if (Object.keys(updateData).length === 0) {
      return Response.json({ error: 'No valid fields to update' }, { status: 400 })
    }

    const { data: account, error } = await supabase
      .from('tam_accounts')
      .update(updateData)
      .eq('tam_account_id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating TAM account:', error)
      return Response.json({ error: `Failed to update TAM account: ${error.message}` }, { status: 500 })
    }

    return Response.json({ success: true, account })
  } catch (error) {
    console.error('TAM API error:', error)
    return Response.json({ error: 'Failed to update TAM account' }, { status: 500 })
  }
}

// GET /api/tam/[id] - Get TAM account
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    const { data: account, error } = await supabase
      .from('tam_accounts')
      .select('*')
      .eq('tam_account_id', id)
      .single()

    if (error) {
      console.error('Error fetching TAM account:', error)
      return Response.json({ error: 'TAM account not found' }, { status: 404 })
    }

    return Response.json({ success: true, account })
  } catch (error) {
    console.error('TAM API error:', error)
    return Response.json({ error: 'Failed to fetch TAM account' }, { status: 500 })
  }
}
