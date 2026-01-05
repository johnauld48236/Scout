import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// GET /api/accounts - List all accounts
export async function GET() {
  try {
    const supabase = await createClient()

    const { data: accounts, error } = await supabase
      .from('account_plans')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching accounts:', error)
      return Response.json({ error: 'Failed to fetch accounts' }, { status: 500 })
    }

    return Response.json({ success: true, accounts })
  } catch (error) {
    console.error('Accounts API error:', error)
    return Response.json({ error: 'Failed to fetch accounts' }, { status: 500 })
  }
}

// POST /api/accounts - Create a new account
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await request.json()

    // Build insert data with all supported fields
    const insertData: Record<string, unknown> = {}

    const allowedFields = [
      'account_name',
      'website',
      'industry',
      'vertical',
      'account_type',
      'employee_count',
      'headquarters',
      'description',
      'account_strategy',
      'strategic_objectives',
      'risk_factors',
      'sales_rep',
      'technical_am',
      // Enrichment fields
      'corporate_structure',
      'enrichment_status',
      'enrichment_source',
      'last_enriched_at',
      // Intelligence fields
      'account_thesis',
      'campaign_ids',
      'compelling_events',
      'buying_signals',
      'research_summary',
      'research_findings',
      // Linkage
      'tam_account_id',
      'campaign_id',
    ]

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        insertData[field] = body[field]
      }
    }

    // Require account_name
    if (!insertData.account_name) {
      return Response.json({ error: 'account_name is required' }, { status: 400 })
    }

    const { data: account, error } = await supabase
      .from('account_plans')
      .insert(insertData)
      .select()
      .single()

    if (error) {
      console.error('Error creating account:', error)
      return Response.json({ error: `Failed to create account: ${error.message}` }, { status: 500 })
    }

    return Response.json({ success: true, account })
  } catch (error) {
    console.error('Accounts API error:', error)
    return Response.json({ error: 'Failed to create account' }, { status: 500 })
  }
}
