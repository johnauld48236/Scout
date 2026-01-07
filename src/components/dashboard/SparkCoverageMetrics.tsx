'use client';

import { Zap, TrendingUp, Link2, ArrowUpRight, Database } from 'lucide-react';

interface SparkCoverageMetricsProps {
  // Active Sparks
  sparksActive: number;

  // Net New (Converted)
  sparksConverted: number;
  pipelineCreated: number;

  // Enrichment (Linked)
  sparksLinked: number;
  pipelineEnriched: number;

  // Coverage
  totalPipelineValue: number;
  coveredDealsCount: number;
  totalDealsCount: number;

  // TAM
  tamAccountsAvailable: number;
  tamAccountsEnriched: number;
  tamAccountsTotal: number;

  // Optional
  avgDealSize?: number;
  conversionRate?: number;
}

export function SparkCoverageMetrics({
  sparksActive,
  sparksConverted,
  pipelineCreated,
  sparksLinked,
  pipelineEnriched,
  totalPipelineValue,
  coveredDealsCount,
  totalDealsCount,
  tamAccountsAvailable,
  tamAccountsEnriched,
  tamAccountsTotal,
  avgDealSize = 150000,
  conversionRate = 0.1,
}: SparkCoverageMetricsProps) {
  const pipelineCoverage =
    totalDealsCount > 0 ? (coveredDealsCount / totalDealsCount) * 100 : 0;

  const enrichmentRate =
    tamAccountsTotal > 0 ? Math.round((tamAccountsEnriched / tamAccountsTotal) * 100) : 0;

  const conservativeRevenuePotential = tamAccountsAvailable * avgDealSize * conversionRate;

  const formatCurrency = (value: number) => {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`;
    }
    if (value >= 1000) {
      return `$${(value / 1000).toFixed(0)}K`;
    }
    return `$${value.toLocaleString()}`;
  };

  return (
    <div className="bg-white rounded-lg border p-4">
      <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">
        Scout Intelligence Impact
      </h3>

      {/* Compact Row: Sparks Active | Net New | Enrichment | Coverage */}
      <div className="grid grid-cols-4 gap-3 mb-4">
        {/* Sparks Active */}
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-amber-100 rounded">
            <Zap className="h-4 w-4 text-amber-600" />
          </div>
          <div>
            <p className="text-lg font-bold text-gray-900">{sparksActive}</p>
            <p className="text-[10px] text-gray-500">Active</p>
          </div>
        </div>

        {/* Net New (Converted) */}
        <div className="p-2 rounded border border-green-200 bg-green-50">
          <div className="flex items-center gap-1 mb-0.5">
            <ArrowUpRight className="h-3 w-3 text-green-600" />
            <span className="text-[10px] font-semibold text-green-700 uppercase">Net New</span>
          </div>
          <p className="text-base font-bold text-green-900">{formatCurrency(pipelineCreated)}</p>
          <p className="text-[10px] text-green-600">{sparksConverted} converted</p>
        </div>

        {/* Enrichment (Linked) */}
        <div className="p-2 rounded border border-blue-200 bg-blue-50">
          <div className="flex items-center gap-1 mb-0.5">
            <Link2 className="h-3 w-3 text-blue-600" />
            <span className="text-[10px] font-semibold text-blue-700 uppercase">Enrichment</span>
          </div>
          <p className="text-base font-bold text-blue-900">{formatCurrency(pipelineEnriched)}</p>
          <p className="text-[10px] text-blue-600">{sparksLinked} linked</p>
        </div>

        {/* Coverage */}
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-blue-100 rounded">
            <TrendingUp className="h-4 w-4 text-blue-600" />
          </div>
          <div>
            <p className="text-lg font-bold text-gray-900">{Math.round(pipelineCoverage)}%</p>
            <p className="text-[10px] text-gray-500">{coveredDealsCount}/{totalDealsCount} Deals</p>
          </div>
        </div>
      </div>

      {/* Coverage Bar - Compact */}
      <div className="mb-3">
        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-amber-500 rounded-full transition-all duration-500"
            style={{ width: `${Math.min(100, pipelineCoverage)}%` }}
          />
        </div>
      </div>

      {/* TAM Enrichment - Compact Inline */}
      <div className="flex items-center justify-between p-2 bg-gray-50 rounded text-sm">
        <div className="flex items-center gap-2">
          <Database className="h-3.5 w-3.5 text-gray-400" />
          <span className="text-gray-600">TAM Opportunity</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-gray-900 font-medium">{tamAccountsAvailable} available</span>
          <span className="text-gray-500">{enrichmentRate}% enriched</span>
          {conservativeRevenuePotential > 0 && (
            <span className="font-semibold text-gray-900">
              {formatCurrency(conservativeRevenuePotential)} potential
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
