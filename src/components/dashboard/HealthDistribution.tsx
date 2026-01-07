'use client';

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

  return (
    <div className="bg-white rounded-lg border p-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide">
          Account Health
        </h3>
        <span className="text-xs text-gray-400">{total} scored</span>
      </div>

      {total === 0 ? (
        <div className="text-center py-4 text-gray-500">
          <p className="text-xs">No health scores yet</p>
        </div>
      ) : (
        <>
          {/* Compact Stacked Bar */}
          <div className="h-2 rounded-full overflow-hidden flex mb-2">
            {HEALTH_BANDS.map((band) => {
              const count = distribution[band] || 0;
              const percentage = total > 0 ? (count / total) * 100 : 0;

              if (percentage === 0) return null;

              return (
                <div
                  key={band}
                  className={`${HEALTH_BAND_COLORS[band]} transition-all duration-500`}
                  style={{ width: `${percentage}%` }}
                  title={`${HEALTH_BAND_LABELS[band]}: ${count}`}
                />
              );
            })}
          </div>

          {/* Inline Legend */}
          <div className="flex flex-wrap gap-3">
            {HEALTH_BANDS.map((band) => {
              const count = distribution[band] || 0;

              return (
                <div key={band} className="flex items-center gap-1">
                  <div className={`w-2 h-2 rounded-full ${HEALTH_BAND_COLORS[band]}`} />
                  <span className="text-xs text-gray-600">
                    {count} {HEALTH_BAND_LABELS[band]}
                  </span>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
