// Clear customer/pipeline data while preserving C2A context
// Usage: node scripts/clear-customer-data.mjs

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  console.error('Make sure to run with: source .env.local && node scripts/clear-customer-data.mjs')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function clearData() {
  console.log('Starting customer data cleanup...\n')

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
    'goal_progress'
  ]

  for (const table of tables) {
    const { error } = await supabase.from(table).delete().gte('created_at', '1970-01-01')
    if (error) {
      console.log(`  ${table}: ERROR - ${error.message}`)
    } else {
      console.log(`  ${table}: cleared`)
    }
  }

  // Reset goal current_value to 0
  console.log('\nResetting goal progress...')
  const { error: goalError } = await supabase
    .from('goals')
    .update({ current_value: 0 })
    .gte('goal_id', '00000000-0000-0000-0000-000000000000')

  if (goalError) {
    console.log(`  goals: ERROR resetting - ${goalError.message}`)
  } else {
    console.log('  goals: current_value reset to 0')
  }

  // Verify preserved data
  console.log('\n--- Preserved Data ---')

  const { data: company, count: companyCount } = await supabase
    .from('company_profile').select('company_name', { count: 'exact' })
  console.log(`company_profile: ${companyCount || 0} records${company?.[0]?.company_name ? ` (${company[0].company_name})` : ''}`)

  const { count: campaignCount } = await supabase
    .from('campaigns').select('*', { count: 'exact', head: true })
  console.log(`campaigns: ${campaignCount || 0} records`)

  const { count: goalCount } = await supabase
    .from('goals').select('*', { count: 'exact', head: true })
  console.log(`goals: ${goalCount || 0} records`)

  console.log('\n--- Cleared Data ---')
  const { count: tamCount } = await supabase
    .from('tam_accounts').select('*', { count: 'exact', head: true })
  console.log(`tam_accounts: ${tamCount || 0} records`)

  const { count: planCount } = await supabase
    .from('account_plans').select('*', { count: 'exact', head: true })
  console.log(`account_plans: ${planCount || 0} records`)

  const { count: pursuitCount } = await supabase
    .from('pursuits').select('*', { count: 'exact', head: true })
  console.log(`pursuits: ${pursuitCount || 0} records`)

  console.log('\nDone! Customer data cleared, C2A context preserved.')
}

clearData().catch(console.error)
