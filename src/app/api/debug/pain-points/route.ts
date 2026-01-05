import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

export async function GET(request: Request) {
  const supabase = await createClient()
  const url = new URL(request.url)
  const accountId = url.searchParams.get('accountId')

  // Get all pain points (including those with needs_review=true)
  let query = supabase.from('pain_points').select('*')
  if (accountId) {
    query = query.eq('account_plan_id', accountId)
  }

  const { data, error } = await query.limit(50)

  if (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }

  const count = data ? data.length : 0

  return Response.json({
    count,
    pain_points: data,
    message: `Found ${count} pain points${accountId ? ` for account ${accountId}` : ''}`
  })
}
