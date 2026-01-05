import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// POST /api/tam/enrich-batch - Enrich multiple pending TAM accounts
export async function POST() {
  const supabase = await createClient()

  // Get pending accounts (limit to avoid timeout)
  const { data: pendingAccounts, error } = await supabase
    .from('tam_accounts')
    .select('tam_account_id, company_name')
    .or('enrichment_status.eq.pending,enrichment_status.is.null')
    .limit(20)

  if (error) {
    return Response.json({ error: 'Failed to fetch accounts' }, { status: 500 })
  }

  if (!pendingAccounts || pendingAccounts.length === 0) {
    return Response.json({
      success: true,
      data: { enriched_count: 0, failed_count: 0, message: 'No pending accounts' }
    })
  }

  const results = {
    enriched_count: 0,
    failed_count: 0,
    failed_accounts: [] as string[]
  }

  // Process sequentially with delay to avoid rate limits
  for (const account of pendingAccounts) {
    try {
      // Call the single enrichment endpoint internally
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL ||
                      process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` :
                      'http://localhost:3000'

      const res = await fetch(`${baseUrl}/api/tam/${account.tam_account_id}/enrich`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })

      if (res.ok) {
        results.enriched_count++
      } else {
        results.failed_count++
        results.failed_accounts.push(account.company_name)
      }

      // Delay between calls to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 2000))

    } catch {
      results.failed_count++
      results.failed_accounts.push(account.company_name)
    }
  }

  return Response.json({
    success: true,
    data: results
  })
}
