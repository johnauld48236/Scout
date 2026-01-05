import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()

  const { data: campaigns, error } = await supabase
    .from('campaigns')
    .select('campaign_id, name, type, status, campaign_context')
    .order('status', { ascending: true })
    .order('name')

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ campaigns })
}
