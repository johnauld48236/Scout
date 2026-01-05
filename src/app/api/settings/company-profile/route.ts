import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { CompanyProfile } from '@/lib/ai/context/company-profile'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// GET /api/settings/company-profile - Load company profile
export async function GET() {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('company_profile')
      .select('*')
      .limit(1)
      .single()

    if (error && error.code !== 'PGRST116') {
      // PGRST116 = no rows returned, which is fine for new setup
      console.error('Error loading company profile:', error)
      return Response.json({ error: 'Failed to load company profile' }, { status: 500 })
    }

    return Response.json({
      success: true,
      profile: data || null
    })
  } catch (error) {
    console.error('Company profile API error:', error)
    return Response.json({ error: 'Failed to load company profile' }, { status: 500 })
  }
}

// POST /api/settings/company-profile - Save company profile
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body: CompanyProfile = await request.json()

    // Check if profile exists
    const { data: existing } = await supabase
      .from('company_profile')
      .select('id')
      .limit(1)
      .single()

    let result

    if (existing?.id) {
      // Update existing
      result = await supabase
        .from('company_profile')
        .update({
          company_name: body.company_name,
          industry: body.industry,
          website: body.website,
          tagline: body.tagline,
          value_proposition: body.value_proposition,
          key_differentiators: body.key_differentiators,
          ideal_customer_profile: body.ideal_customer_profile,
          target_verticals: body.target_verticals,
          target_company_sizes: body.target_company_sizes,
          target_geographies: body.target_geographies,
          products_services: body.products_services,
          use_cases: body.use_cases,
          competitors: body.competitors,
          competitive_positioning: body.competitive_positioning,
          buying_triggers: body.buying_triggers,
          qualification_criteria: body.qualification_criteria,
          typical_sales_cycle: body.typical_sales_cycle,
          average_deal_size: body.average_deal_size,
          key_stakeholder_roles: body.key_stakeholder_roles,
          sales_methodology: body.sales_methodology,
          custom_methodology_criteria: body.custom_methodology_criteria,
        })
        .eq('id', existing.id)
        .select()
        .single()
    } else {
      // Insert new
      result = await supabase
        .from('company_profile')
        .insert({
          company_name: body.company_name,
          industry: body.industry,
          website: body.website,
          tagline: body.tagline,
          value_proposition: body.value_proposition,
          key_differentiators: body.key_differentiators,
          ideal_customer_profile: body.ideal_customer_profile,
          target_verticals: body.target_verticals,
          target_company_sizes: body.target_company_sizes,
          target_geographies: body.target_geographies,
          products_services: body.products_services,
          use_cases: body.use_cases,
          competitors: body.competitors,
          competitive_positioning: body.competitive_positioning,
          buying_triggers: body.buying_triggers,
          qualification_criteria: body.qualification_criteria,
          typical_sales_cycle: body.typical_sales_cycle,
          average_deal_size: body.average_deal_size,
          key_stakeholder_roles: body.key_stakeholder_roles,
          sales_methodology: body.sales_methodology,
          custom_methodology_criteria: body.custom_methodology_criteria,
        })
        .select()
        .single()
    }

    if (result.error) {
      console.error('Error saving company profile:', result.error)
      return Response.json({ error: 'Failed to save company profile' }, { status: 500 })
    }

    return Response.json({
      success: true,
      profile: result.data
    })
  } catch (error) {
    console.error('Company profile API error:', error)
    return Response.json({ error: 'Failed to save company profile' }, { status: 500 })
  }
}
