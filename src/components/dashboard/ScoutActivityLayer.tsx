'use client';

import { SparkCoverageMetrics } from './SparkCoverageMetrics';
import { HealthDistribution } from './HealthDistribution';
import type { HealthBand } from '@/lib/scoring/health-score';

interface SparkMetrics {
  sparksActive: number;
  sparksConverted: number;
  sparksLinked: number;
  pipelineCreated: number;
  pipelineEnriched: number;
  totalPipelineValue: number;
  coveredDealsCount: number;
  totalDealsCount: number;
  tamAccountsAvailable: number;
  tamAccountsEnriched: number;
  tamAccountsTotal: number;
}

interface ScoutActivityLayerProps {
  sparkMetrics: SparkMetrics;
  healthDistribution: Record<HealthBand, number>;
  avgDealSize?: number;
  conversionRate?: number;
}

export function ScoutActivityLayer({
  sparkMetrics,
  healthDistribution,
  avgDealSize = 150000,
  conversionRate = 0.1,
}: ScoutActivityLayerProps) {
  return (
    <div className="space-y-3">
      {/* Intelligence Coverage */}
      <SparkCoverageMetrics
        sparksActive={sparkMetrics.sparksActive}
        sparksConverted={sparkMetrics.sparksConverted}
        sparksLinked={sparkMetrics.sparksLinked}
        pipelineCreated={sparkMetrics.pipelineCreated}
        pipelineEnriched={sparkMetrics.pipelineEnriched}
        totalPipelineValue={sparkMetrics.totalPipelineValue}
        coveredDealsCount={sparkMetrics.coveredDealsCount}
        totalDealsCount={sparkMetrics.totalDealsCount}
        tamAccountsAvailable={sparkMetrics.tamAccountsAvailable}
        tamAccountsEnriched={sparkMetrics.tamAccountsEnriched}
        tamAccountsTotal={sparkMetrics.tamAccountsTotal}
        avgDealSize={avgDealSize}
        conversionRate={conversionRate}
      />

      {/* Health Distribution */}
      <HealthDistribution distribution={healthDistribution} />
    </div>
  );
}
