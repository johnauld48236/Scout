import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// POST /api/admin/clear-data
// Clears all customer/pipeline data while preserving C2A context
export async function POST(request: Request) {
  // Safety check - require a confirmation in the request body
  const body = await request.json().catch(() => ({}))
  if (body.confirm !== 'CLEAR_ALL_CUSTOMER_DATA') {
    return NextResponse.json(
      { error: 'Missing confirmation. Send { "confirm": "CLEAR_ALL_CUSTOMER_DATA" }' },
      { status: 400 }
    )
  }

  const supabase = await createClient()
  const results: { table: string; status: string }[] = []

  // Tables to clear in order (respecting foreign key constraints)
  const tables = [
    'research_findings',
    'qualification_criteria',
    'pursuit_stakeholders',
    'action_items',
    'pursuits',
    'stakeholders',
    'account_plans',
    'campaign_tam_accounts',
    'account_signals',
    'tam_warm_paths',
    'tam_contacts',
    'tam_accounts',
    'prospect_contacts',
    'goal_progress'
  ]

  for (const table of tables) {
    try {
      // Use appropriate filter based on table
      const filterColumn = table === 'qualification_criteria' ? 'updated_at' : 'created_at'
      const { error } = await supabase.from(table).delete().gte(filterColumn, '1970-01-01')
      if (error) {
        results.push({ table, status: `error: ${error.message}` })
      } else {
        results.push({ table, status: 'cleared' })
      }
    } catch (e) {
      results.push({ table, status: `error: ${String(e)}` })
    }
  }

  // Reset goal current_value to 0
  try {
    const { error } = await supabase
      .from('goals')
      .update({ current_value: 0, updated_at: new Date().toISOString() })
      .gte('goal_id', '00000000-0000-0000-0000-000000000000')

    results.push({
      table: 'goals',
      status: error ? `error resetting: ${error.message}` : 'current_value reset to 0'
    })
  } catch (e) {
    results.push({ table: 'goals', status: `error: ${String(e)}` })
  }

  // Get counts of preserved vs cleared data
  const [
    { count: companyCount },
    { count: campaignCount },
    { count: goalCount },
    { count: tamCount },
    { count: planCount },
    { count: pursuitCount }
  ] = await Promise.all([
    supabase.from('company_profile').select('*', { count: 'exact', head: true }),
    supabase.from('campaigns').select('*', { count: 'exact', head: true }),
    supabase.from('goals').select('*', { count: 'exact', head: true }),
    supabase.from('tam_accounts').select('*', { count: 'exact', head: true }),
    supabase.from('account_plans').select('*', { count: 'exact', head: true }),
    supabase.from('pursuits').select('*', { count: 'exact', head: true })
  ])

  return NextResponse.json({
    message: 'Customer data cleared successfully',
    results,
    preserved: {
      company_profile: companyCount || 0,
      campaigns: campaignCount || 0,
      goals: goalCount || 0
    },
    cleared: {
      tam_accounts: tamCount || 0,
      account_plans: planCount || 0,
      pursuits: pursuitCount || 0
    }
  })
}
