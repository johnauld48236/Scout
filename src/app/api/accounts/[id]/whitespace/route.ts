import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET - Fetch all whitespace data for an account
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  // Fetch divisions and product usage in parallel
  const [divisionsRes, usageRes, productsRes] = await Promise.all([
    supabase
      .from('account_divisions')
      .select('*')
      .eq('account_plan_id', id)
      .order('sort_order'),
    supabase
      .from('division_product_usage')
      .select('*')
      .eq('account_plan_id', id),
    // Get unique product modules for this account
    supabase
      .from('division_product_usage')
      .select('product_module')
      .eq('account_plan_id', id),
  ])

  if (divisionsRes.error) {
    return NextResponse.json({ error: divisionsRes.error.message }, { status: 500 })
  }

  // Extract unique product modules
  const productModules = [...new Set(
    (productsRes.data || []).map(p => p.product_module)
  )].sort()

  return NextResponse.json({
    divisions: divisionsRes.data || [],
    usage: usageRes.data || [],
    productModules,
  })
}

// POST - Create or update a usage record
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await request.json()
  const { division_id, product_module, usage_status, notes } = body

  const supabase = await createClient()

  // Upsert the usage record
  const { data, error } = await supabase
    .from('division_product_usage')
    .upsert(
      {
        account_plan_id: id,
        division_id: division_id || null,
        product_module,
        usage_status,
        notes,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: 'account_plan_id,division_id,product_module',
      }
    )
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ usage: data })
}

// DELETE - Remove a usage record
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { searchParams } = new URL(request.url)
  const usageId = searchParams.get('usage_id')

  if (!usageId) {
    return NextResponse.json({ error: 'usage_id required' }, { status: 400 })
  }

  const supabase = await createClient()

  const { error } = await supabase
    .from('division_product_usage')
    .delete()
    .eq('usage_id', usageId)
    .eq('account_plan_id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
