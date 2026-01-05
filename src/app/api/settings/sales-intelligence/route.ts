import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { SalesIntelligence } from '@/lib/sales-intelligence/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// GET /api/settings/sales-intelligence - Load sales intelligence
export async function GET() {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('company_profile')
      .select('sales_intelligence')
      .limit(1)
      .single()

    if (error && error.code !== 'PGRST116') {
      console.error('Error loading sales intelligence:', error)
      return Response.json({ error: 'Failed to load sales intelligence' }, { status: 500 })
    }

    return Response.json({
      success: true,
      data: data?.sales_intelligence || null
    })
  } catch (error) {
    console.error('Sales intelligence API error:', error)
    return Response.json({ error: 'Failed to load sales intelligence' }, { status: 500 })
  }
}

// POST /api/settings/sales-intelligence - Save sales intelligence
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body: SalesIntelligence = await request.json()

    // Add metadata
    const dataToSave = {
      ...body,
      last_updated: new Date().toISOString(),
      version: (body.version || 0) + 1,
    }

    // Check if company profile exists
    const { data: existing } = await supabase
      .from('company_profile')
      .select('id')
      .limit(1)
      .single()

    let result

    if (existing?.id) {
      // Update existing profile with sales_intelligence
      result = await supabase
        .from('company_profile')
        .update({
          sales_intelligence: dataToSave,
        })
        .eq('id', existing.id)
        .select('sales_intelligence')
        .single()
    } else {
      // Create new profile with just sales_intelligence
      // (User should have created profile first, but handle this gracefully)
      result = await supabase
        .from('company_profile')
        .insert({
          company_name: 'My Company', // Placeholder
          sales_intelligence: dataToSave,
        })
        .select('sales_intelligence')
        .single()
    }

    if (result.error) {
      console.error('Error saving sales intelligence:', result.error)
      return Response.json({
        error: 'Failed to save sales intelligence',
        details: result.error.message
      }, { status: 500 })
    }

    return Response.json({
      success: true,
      data: result.data?.sales_intelligence
    })
  } catch (error) {
    console.error('Sales intelligence API error:', error)
    return Response.json({ error: 'Failed to save sales intelligence' }, { status: 500 })
  }
}
