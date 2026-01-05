import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// Define consolidation rules: variants -> main account name
const CONSOLIDATION_RULES: Record<string, string> = {
  'Aptiv TARA': 'Aptiv',
  'Cummins (Accelera)': 'Cummins',
  'Cummins (EBU)': 'Cummins',
  'Cummins (PCRA)': 'Cummins',
  'Rivian VW': 'Rivian',
}

export async function GET() {
  const supabase = await createClient()

  // Preview what would be consolidated
  const { data: accountPlans } = await supabase
    .from('account_plans')
    .select('account_plan_id, account_name')

  const { data: pursuits } = await supabase
    .from('pursuits')
    .select('pursuit_id, name, account_plan_id, account_plans(account_name)')

  if (!accountPlans || !pursuits) {
    return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 })
  }

  // Build lookup of account names to IDs
  const accountByName = new Map<string, string>()
  accountPlans.forEach(ap => {
    accountByName.set(ap.account_name.toLowerCase().trim(), ap.account_plan_id)
  })

  // Find pursuits that need to be moved
  const toConsolidate: Array<{
    pursuit_id: string
    pursuit_name: string
    current_account: string
    target_account: string
    target_account_id: string | null
  }> = []

  pursuits.forEach(p => {
    const accountPlan = p.account_plans as unknown as { account_name: string } | null
    const currentAccount = accountPlan?.account_name || ''
    const targetAccount = CONSOLIDATION_RULES[currentAccount]

    if (targetAccount) {
      const targetId = accountByName.get(targetAccount.toLowerCase().trim())
      toConsolidate.push({
        pursuit_id: p.pursuit_id,
        pursuit_name: p.name,
        current_account: currentAccount,
        target_account: targetAccount,
        target_account_id: targetId || null,
      })
    }
  })

  return NextResponse.json({
    preview: true,
    consolidations: toConsolidate,
    summary: {
      total: toConsolidate.length,
      byAccount: toConsolidate.reduce((acc, c) => {
        acc[c.target_account] = (acc[c.target_account] || 0) + 1
        return acc
      }, {} as Record<string, number>),
    },
  })
}

// DELETE: Clean up empty variant accounts that were already processed
export async function DELETE() {
  const supabase = await createClient()

  const variantNames = Object.keys(CONSOLIDATION_RULES)
  const results = { deleted: 0, errors: [] as string[] }

  for (const variantName of variantNames) {
    // Find the variant account
    const { data: variant } = await supabase
      .from('account_plans')
      .select('account_plan_id')
      .eq('account_name', variantName)
      .single()

    if (!variant) continue

    // Check if it has any pursuits
    const { count } = await supabase
      .from('pursuits')
      .select('*', { count: 'exact', head: true })
      .eq('account_plan_id', variant.account_plan_id)

    if (count === 0) {
      // Safe to delete
      const { error } = await supabase
        .from('account_plans')
        .delete()
        .eq('account_plan_id', variant.account_plan_id)

      if (error) {
        results.errors.push(`Failed to delete ${variantName}: ${error.message}`)
      } else {
        results.deleted++
      }
    }
  }

  return NextResponse.json({
    success: true,
    results,
    message: `Deleted ${results.deleted} empty variant accounts.`,
  })
}

export async function POST() {
  const supabase = await createClient()

  try {
    // Get current data
    const { data: accountPlans, error: apError } = await supabase
      .from('account_plans')
      .select('account_plan_id, account_name')

    if (apError) {
      return NextResponse.json({ error: 'Failed to fetch accounts: ' + apError.message }, { status: 500 })
    }

    // Build lookup of account names to IDs
    const accountByName = new Map<string, string>()
    ;(accountPlans || []).forEach(ap => {
      accountByName.set(ap.account_name.toLowerCase().trim(), ap.account_plan_id)
    })

    const results = {
      moved: 0,
      renamed: 0,
      deleted: 0,
      errors: [] as string[],
    }

    // Process each consolidation rule
    for (const [variantName, mainName] of Object.entries(CONSOLIDATION_RULES)) {
      const mainAccountId = accountByName.get(mainName.toLowerCase().trim())
      const variantAccountId = accountByName.get(variantName.toLowerCase().trim())

      if (!variantAccountId) {
        // Variant doesn't exist, nothing to do
        continue
      }

      if (!mainAccountId) {
        // Main account doesn't exist - rename the variant to main
        const { error: renameError } = await supabase
          .from('account_plans')
          .update({ account_name: mainName })
          .eq('account_plan_id', variantAccountId)

        if (renameError) {
          results.errors.push(`Failed to rename ${variantName} to ${mainName}: ${renameError.message}`)
        } else {
          results.renamed++
          accountByName.set(mainName.toLowerCase().trim(), variantAccountId)
        }
        continue
      }

      // Both exist - move pursuits from variant to main, then delete variant
      if (variantAccountId !== mainAccountId) {
        const { data: movedPursuits, error: moveError } = await supabase
          .from('pursuits')
          .update({ account_plan_id: mainAccountId })
          .eq('account_plan_id', variantAccountId)
          .select('pursuit_id')

        if (moveError) {
          results.errors.push(`Failed to move pursuits from ${variantName}: ${moveError.message}`)
        } else {
          results.moved += movedPursuits?.length || 0

          // Delete the now-empty variant account
          const { error: deleteError } = await supabase
            .from('account_plans')
            .delete()
            .eq('account_plan_id', variantAccountId)

          if (deleteError) {
            results.errors.push(`Failed to delete ${variantName}: ${deleteError.message}`)
          } else {
            results.deleted++
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      results,
      message: `Moved ${results.moved} pursuits, renamed ${results.renamed} accounts, deleted ${results.deleted} variant accounts.`,
    })
  } catch (err) {
    console.error('Consolidation error:', err)
    return NextResponse.json({ error: 'Consolidation failed: ' + String(err) }, { status: 500 })
  }
}
