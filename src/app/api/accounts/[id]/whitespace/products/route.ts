import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// POST - Add a new product module (creates placeholder record)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await request.json()
  const { product_module } = body

  if (!product_module) {
    return NextResponse.json({ error: 'product_module required' }, { status: 400 })
  }

  const supabase = await createClient()

  // Check if product already exists for this account
  const { data: existing } = await supabase
    .from('division_product_usage')
    .select('product_module')
    .eq('account_plan_id', id)
    .eq('product_module', product_module)
    .limit(1)

  if (existing && existing.length > 0) {
    return NextResponse.json({ error: 'Product already exists' }, { status: 400 })
  }

  // Create a placeholder record with null division (account-level product)
  const { data, error } = await supabase
    .from('division_product_usage')
    .insert({
      account_plan_id: id,
      division_id: null,
      product_module,
      usage_status: null,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ product: data })
}

// DELETE - Remove a product module (removes all usage records for this product)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { searchParams } = new URL(request.url)
  const productModule = searchParams.get('product_module')

  if (!productModule) {
    return NextResponse.json({ error: 'product_module required' }, { status: 400 })
  }

  const supabase = await createClient()

  const { error } = await supabase
    .from('division_product_usage')
    .delete()
    .eq('account_plan_id', id)
    .eq('product_module', productModule)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
