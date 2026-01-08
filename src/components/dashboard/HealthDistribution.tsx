'use client';

import Link from 'next/link';
import { AlertTriangle } from 'lucide-react';
import {
  HEALTH_BANDS,
  HEALTH_BAND_COLORS,
  HEALTH_BAND_LABELS,
  type HealthBand,
} from '@/lib/scoring/health-score';

interface HealthDistributionProps {
  distribution: Record<HealthBand, number>;
}

export function HealthDistribution({ distribution }: HealthDistributionProps) {
  const total = Object.values(distribution).reduce((sum, count) => sum + count, 0);
  const atRiskCount = (distribution.at_risk || 0) + (distribution.critical || 0);

  return (
    <div className="bg-white rounded-lg border p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold" style={{ color: 'var(--scout-saddle)' }}>
            Account Health
          </h3>
          {atRiskCount > 0 && (
            <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-orange-100 text-orange-700">
              <AlertTriangle className="w-3 h-3" />
              {atRiskCount} need attention
            </span>
          )}
        </div>
        <span className="text-xs" style={{ color: 'var(--scout-earth-light)' }}>
          {total} accounts scored
        </span>
      </div>

      {total === 0 ? (
        <div className="text-center py-6" style={{ color: 'var(--scout-earth-light)' }}>
          <p className="text-sm">No health scores calculated yet</p>
          <p className="text-xs mt-1">Visit territory pages to calculate health scores</p>
        </div>
      ) : (
        <>
          {/* Distribution Bars */}
          <div className="space-y-2 mb-3">
            {HEALTH_BANDS.map((band) => {
              const count = distribution[band] || 0;
              const percentage = total > 0 ? (count / total) * 100 : 0;

              return (
                <div key={band} className="flex items-center gap-3">
                  <div className="w-16 text-xs font-medium" style={{ color: 'var(--scout-earth)' }}>
                    {HEALTH_BAND_LABELS[band]}
                  </div>
                  <div className="flex-1 h-4 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${HEALTH_BAND_COLORS[band]} transition-all duration-500`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <div className="w-8 text-xs font-medium text-right" style={{ color: 'var(--scout-saddle)' }}>
                    {count}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Link to at-risk accounts */}
          {atRiskCount > 0 && (
            <Link
              href="/territories?health=at_risk,critical"
              className="text-xs font-medium flex items-center gap-1 hover:underline"
              style={{ color: 'var(--scout-sky)' }}
            >
              View accounts needing attention →
            </Link>
          )}
        </>
      )}
    </div>
  );
}
