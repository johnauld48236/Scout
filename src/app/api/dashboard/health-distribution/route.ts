// app/api/dashboard/health-distribution/route.ts

import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import type { HealthBand } from '@/lib/scoring/health-score';

export async function GET() {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase.from('health_distribution').select('*');

    if (error) {
      // View might not exist yet, return empty distribution
      if (error.code === 'PGRST116' || error.message?.includes('does not exist')) {
        return NextResponse.json({
          healthy: 0,
          monitor: 0,
          at_risk: 0,
          critical: 0,
        });
      }
      throw error;
    }

    // Convert to record format
    const distribution: Record<HealthBand, number> = {
      healthy: 0,
      monitor: 0,
      at_risk: 0,
      critical: 0,
    };

    data?.forEach((row) => {
      if (row.health_band in distribution) {
        distribution[row.health_band as HealthBand] = row.count;
      }
    });

    return NextResponse.json(distribution);
  } catch (error) {
    console.error('Error fetching health distribution:', error);
    return NextResponse.json({ error: 'Failed to fetch health distribution' }, { status: 500 });
  }
}
