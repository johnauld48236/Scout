// app/api/dashboard/spark-metrics/route.ts
// Spark metrics API with dual tracking: Net New (converted) vs Enrichment (linked)

import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const supabase = await createClient();

    // Use the view we created (handles dual tracking)
    const { data, error } = await supabase.from('spark_metrics').select('*').single();

    if (error) {
      // View might not exist yet, return empty metrics
      if (error.code === 'PGRST116' || error.message?.includes('does not exist')) {
        return NextResponse.json({
          sparksActive: 0,
          sparksConverted: 0,
          sparksLinked: 0,
          pipelineCreated: 0,
          pipelineEnriched: 0,
          totalPipelineValue: 0,
          coveredDealsCount: 0,
          totalDealsCount: 0,
          pipelineCoverage: 0,
          tamAccountsAvailable: 0,
          tamAccountsEnriched: 0,
          tamAccountsTotal: 0,
          enrichmentRate: 0,
        });
      }
      throw error;
    }

    // Calculate derived metrics
    const pipelineCoverage =
      data.total_deals_count > 0 ? (data.covered_deals_count / data.total_deals_count) * 100 : 0;

    const enrichmentRate =
      data.tam_accounts_total > 0 ? (data.tam_accounts_enriched / data.tam_accounts_total) * 100 : 0;

    return NextResponse.json({
      // Active Sparks
      sparksActive: data.sparks_active || 0,

      // Net New (Converted)
      sparksConverted: data.sparks_converted || 0,
      pipelineCreated: data.pipeline_created || 0,

      // Enrichment (Linked)
      sparksLinked: data.sparks_linked || 0,
      pipelineEnriched: data.pipeline_enriched || 0,

      // Total Pipeline
      totalPipelineValue: data.total_pipeline_value || 0,
      coveredDealsCount: data.covered_deals_count || 0,
      totalDealsCount: data.total_deals_count || 0,
      pipelineCoverage,

      // TAM
      tamAccountsAvailable: data.tam_accounts_available || 0,
      tamAccountsEnriched: data.tam_accounts_enriched || 0,
      tamAccountsTotal: data.tam_accounts_total || 0,
      enrichmentRate,
    });
  } catch (error) {
    console.error('Error fetching spark metrics:', error);
    return NextResponse.json({ error: 'Failed to fetch spark metrics' }, { status: 500 });
  }
}
