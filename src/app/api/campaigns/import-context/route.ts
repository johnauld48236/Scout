import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import * as fs from 'fs/promises'
import * as path from 'path'

export const runtime = 'nodejs'

// Known campaign context files (for initial loading)
const CAMPAIGN_CONTEXT_FILES: Record<string, string> = {
  'Medical Device': 'C2A Data/Platform Data/C2A_Campaign_Medical_Device.md',
  'CRA': 'C2A Data/Platform Data/C2A_Campaign_CRA.md',
}

const COMPANY_CONTEXT_FILE = 'C2A Data/Platform Data/C2A_Sales_Intelligence_Config.md'

// POST /api/campaigns/import-context - Import campaign context from markdown files
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await request.json()
    const { campaign_name, markdown_content, import_all } = body

    // If markdown_content is provided, use it directly
    if (campaign_name && markdown_content) {
      // Find the campaign by name
      const { data: campaign, error: findError } = await supabase
        .from('campaigns')
        .select('campaign_id')
        .ilike('name', `%${campaign_name}%`)
        .limit(1)
        .single()

      if (findError || !campaign) {
        return Response.json({ error: `Campaign "${campaign_name}" not found` }, { status: 404 })
      }

      // Update campaign context
      const { error: updateError } = await supabase
        .from('campaigns')
        .update({
          campaign_context: markdown_content,
          context_updated_at: new Date().toISOString(),
        })
        .eq('campaign_id', campaign.campaign_id)

      if (updateError) {
        return Response.json({ error: updateError.message }, { status: 500 })
      }

      return Response.json({
        success: true,
        campaign_id: campaign.campaign_id,
        message: `Context updated for campaign "${campaign_name}"`,
      })
    }

    // Import all known campaign context files
    if (import_all) {
      const results: Array<{ campaign: string; status: string; error?: string }> = []
      const projectRoot = process.cwd()

      // Import campaign contexts
      for (const [campaignName, filePath] of Object.entries(CAMPAIGN_CONTEXT_FILES)) {
        try {
          const fullPath = path.join(projectRoot, filePath)
          const content = await fs.readFile(fullPath, 'utf-8')

          // Find campaign by name
          const { data: campaign } = await supabase
            .from('campaigns')
            .select('campaign_id')
            .ilike('name', `%${campaignName}%`)
            .limit(1)
            .single()

          if (campaign) {
            await supabase
              .from('campaigns')
              .update({
                campaign_context: content,
                context_updated_at: new Date().toISOString(),
              })
              .eq('campaign_id', campaign.campaign_id)

            results.push({ campaign: campaignName, status: 'updated' })
          } else {
            results.push({ campaign: campaignName, status: 'campaign_not_found' })
          }
        } catch (err) {
          results.push({
            campaign: campaignName,
            status: 'error',
            error: err instanceof Error ? err.message : 'Unknown error',
          })
        }
      }

      // Import company context
      try {
        const companyContextPath = path.join(projectRoot, COMPANY_CONTEXT_FILE)
        const companyContent = await fs.readFile(companyContextPath, 'utf-8')

        // Get the company profile ID first
        const { data: existingProfile } = await supabase
          .from('company_profile')
          .select('id')
          .limit(1)
          .single()

        const { error: companyError } = await supabase
          .from('company_profile')
          .update({
            sales_intelligence_context: companyContent,
            context_updated_at: new Date().toISOString(),
          })
          .eq('id', existingProfile?.id || 1)

        if (companyError) {
          results.push({ campaign: 'Company Profile', status: 'error', error: companyError.message })
        } else {
          results.push({ campaign: 'Company Profile', status: 'updated' })
        }
      } catch (err) {
        results.push({
          campaign: 'Company Profile',
          status: 'error',
          error: err instanceof Error ? err.message : 'Unknown error',
        })
      }

      return Response.json({
        success: true,
        results,
      })
    }

    return Response.json({ error: 'Provide campaign_name + markdown_content, or import_all: true' }, { status: 400 })
  } catch (error) {
    console.error('Import context error:', error)
    return Response.json(
      { error: 'Failed to import context' },
      { status: 500 }
    )
  }
}
