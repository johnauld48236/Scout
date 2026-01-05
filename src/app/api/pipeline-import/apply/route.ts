import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

interface ApplyChange {
  id: string
  change_type: 'new' | 'modified' | 'removed'
  deal_name: string
  company_name: string
  proposed?: {
    stage: string
    estimated_value: number | null
    weighted_value?: number | null
    probability?: number | null
    deal_owner?: string | null
    target_quarter?: string | null
    pursuit_type: string | null
    close_date?: string | null
    vertical?: string | null
    recurring_value?: number | null
  }
}

interface AccountAssignment {
  account_name: string
  sales_manager: string | null
  account_manager: string | null
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()

  try {
    const body = await request.json()
    const { changes, accountAssignments, options } = body as {
      changes: ApplyChange[]
      accountAssignments?: AccountAssignment[]
      options?: {
        skipRemoved?: boolean
        skipNew?: boolean
      }
    }

    if (!changes || !Array.isArray(changes)) {
      return NextResponse.json({ error: 'changes array is required' }, { status: 400 })
    }

    const results = {
      created: 0,
      updated: 0,
      removed: 0,
      accountsUpdated: 0,
      errors: [] as string[],
    }

    // Create lookup map for account assignments
    const assignmentsByAccount = new Map<string, AccountAssignment>()
    if (accountAssignments) {
      accountAssignments.forEach(a => {
        assignmentsByAccount.set(a.account_name.toLowerCase().trim(), a)
      })
    }

    // Process each change
    for (const change of changes) {
      try {
        if (change.change_type === 'new' && !options?.skipNew) {
          // Create new pursuit - first need to find or create account plan
          let accountPlanId: string | null = null

          // Try to find existing account plan
          const { data: existingAccount } = await supabase
            .from('account_plans')
            .select('account_plan_id')
            .ilike('account_name', change.company_name)
            .single()

          if (existingAccount) {
            accountPlanId = existingAccount.account_plan_id

            // Update account with assignments if available
            const assignment = assignmentsByAccount.get(change.company_name.toLowerCase().trim())
            if (assignment) {
              const accountUpdateData: Record<string, unknown> = {}
              if (assignment.sales_manager) accountUpdateData.sales_rep = assignment.sales_manager
              if (assignment.account_manager) accountUpdateData.technical_am = assignment.account_manager
              if (Object.keys(accountUpdateData).length > 0) {
                await supabase
                  .from('account_plans')
                  .update(accountUpdateData)
                  .eq('account_plan_id', accountPlanId)
                results.accountsUpdated++
              }
            }
          } else {
            // Create new account plan with assignments
            const assignment = assignmentsByAccount.get(change.company_name.toLowerCase().trim())
            const accountData: Record<string, unknown> = {
              account_name: change.company_name,
              account_type: 'Prospect',
            }
            if (change.proposed?.vertical) accountData.vertical = change.proposed.vertical
            if (assignment?.sales_manager) accountData.sales_rep = assignment.sales_manager
            if (assignment?.account_manager) accountData.technical_am = assignment.account_manager

            const { data: newAccount, error: accountError } = await supabase
              .from('account_plans')
              .insert(accountData)
              .select('account_plan_id')
              .single()

            if (accountError) {
              results.errors.push(`Failed to create account for ${change.company_name}: ${accountError.message}`)
              continue
            }
            accountPlanId = newAccount.account_plan_id
          }

          // Create pursuit
          const pursuitData: Record<string, unknown> = {
            account_plan_id: accountPlanId,
            name: change.deal_name,
            stage: change.proposed?.stage || 'Discovery',
            estimated_value: change.proposed?.estimated_value,
            pursuit_type: change.proposed?.pursuit_type || 'new_business',
          }

          // Handle probability from spreadsheet - convert decimal (0.35) to integer (35) if needed
          if (change.proposed?.probability != null) {
            const prob = change.proposed.probability
            pursuitData.probability = prob <= 1 ? Math.round(prob * 100) : Math.round(prob)
          }

          // Store pre-calculated weighted value from spreadsheet (Column P)
          if (change.proposed?.weighted_value != null) {
            pursuitData.weighted_value = change.proposed.weighted_value
          }

          // Handle close date
          if (change.proposed?.close_date) {
            pursuitData.target_close_date = change.proposed.close_date
          }

          // Handle closed won deals
          if (change.proposed?.stage === 'Closed_Won') {
            pursuitData.confirmed_value = change.proposed.estimated_value
          }

          const { error: pursuitError } = await supabase
            .from('pursuits')
            .insert(pursuitData)

          if (pursuitError) {
            results.errors.push(`Failed to create pursuit ${change.deal_name}: ${pursuitError.message}`)
          } else {
            results.created++
          }
        }

        if (change.change_type === 'modified' && change.proposed) {
          // Update existing pursuit
          const updateData: Record<string, unknown> = {}

          if (change.proposed.stage) updateData.stage = change.proposed.stage
          if (change.proposed.estimated_value !== undefined) updateData.estimated_value = change.proposed.estimated_value
          // Convert probability from decimal (0.35) to integer (35) if needed
          if (change.proposed.probability != null) {
            const prob = change.proposed.probability
            updateData.probability = prob <= 1 ? Math.round(prob * 100) : Math.round(prob)
          }
          // Store pre-calculated weighted value from spreadsheet (Column P)
          if (change.proposed.weighted_value != null) {
            updateData.weighted_value = change.proposed.weighted_value
          }
          if (change.proposed.pursuit_type) updateData.pursuit_type = change.proposed.pursuit_type
          if (change.proposed.close_date) updateData.target_close_date = change.proposed.close_date
          if (change.proposed.deal_owner) updateData.deal_owner = change.proposed.deal_owner
          if (change.proposed.target_quarter) updateData.target_quarter = change.proposed.target_quarter

          // Handle closed won
          if (change.proposed.stage === 'Closed_Won') {
            updateData.confirmed_value = change.proposed.estimated_value
          }

          const { error: updateError } = await supabase
            .from('pursuits')
            .update(updateData)
            .eq('pursuit_id', change.id)

          if (updateError) {
            results.errors.push(`Failed to update ${change.deal_name}: ${updateError.message}`)
          } else {
            results.updated++
          }
        }

        if (change.change_type === 'removed' && !options?.skipRemoved) {
          // Soft delete (mark as closed lost) instead of hard delete
          const { error: removeError } = await supabase
            .from('pursuits')
            .update({ stage: 'Closed_Lost' })
            .eq('pursuit_id', change.id)

          if (removeError) {
            results.errors.push(`Failed to remove ${change.deal_name}: ${removeError.message}`)
          } else {
            results.removed++
          }
        }
      } catch (err) {
        results.errors.push(`Error processing ${change.deal_name}: ${err}`)
      }
    }

    // Apply remaining account assignments that weren't covered by deals
    if (accountAssignments && accountAssignments.length > 0) {
      for (const assignment of accountAssignments) {
        const { data: account } = await supabase
          .from('account_plans')
          .select('account_plan_id, sales_rep, technical_am')
          .ilike('account_name', assignment.account_name)
          .single()

        if (account) {
          const updateData: Record<string, unknown> = {}
          if (assignment.sales_manager && account.sales_rep !== assignment.sales_manager) {
            updateData.sales_rep = assignment.sales_manager
          }
          if (assignment.account_manager && account.technical_am !== assignment.account_manager) {
            updateData.technical_am = assignment.account_manager
          }
          if (Object.keys(updateData).length > 0) {
            await supabase
              .from('account_plans')
              .update(updateData)
              .eq('account_plan_id', account.account_plan_id)
            results.accountsUpdated++
          }
        }
      }
    }

    // Return success even if there were some errors (partial success)
    // Only fail completely if no operations succeeded
    const anySuccess = results.created > 0 || results.updated > 0 || results.removed > 0 || results.accountsUpdated > 0
    const allFailed = !anySuccess && results.errors.length > 0

    return NextResponse.json({
      success: !allFailed,
      results,
      errors: results.errors,
      message: `Created ${results.created}, updated ${results.updated}, removed ${results.removed} deals. Updated ${results.accountsUpdated} account assignments.${results.errors.length > 0 ? ` (${results.errors.length} errors)` : ''}`,
    })
  } catch (error) {
    console.error('Pipeline apply error:', error)
    return NextResponse.json({ error: 'Failed to apply changes' }, { status: 500 })
  }
}
