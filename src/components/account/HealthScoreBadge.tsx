'use client';

import {
  HEALTH_BAND_COLORS,
  HEALTH_BAND_TEXT_COLORS,
  HEALTH_BAND_BG_COLORS,
  HEALTH_BAND_LABELS,
  type HealthBand,
} from '@/lib/scoring/health-score';

interface HealthScoreBadgeProps {
  score: number;
  band: HealthBand;
  size?: 'sm' | 'md' | 'lg';
  showScore?: boolean;
  showBreakdown?: boolean;
  breakdown?: {
    engagement: number;
    momentum: number;
    risk: number;
    intelligence: number;
  };
}

const SIZE_CLASSES = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-3 py-1 text-sm',
  lg: 'px-4 py-1.5 text-base',
};

export function HealthScoreBadge({
  score,
  band,
  size = 'md',
  showScore = true,
  showBreakdown = false,
  breakdown,
}: HealthScoreBadgeProps) {
  return (
    <div className="inline-block">
      <div
        className={`
          inline-flex items-center gap-2 rounded-full
          ${HEALTH_BAND_BG_COLORS[band]}
          ${HEALTH_BAND_TEXT_COLORS[band]}
          ${SIZE_CLASSES[size]}
          font-medium
        `}
      >
        <span className={`w-2 h-2 rounded-full ${HEALTH_BAND_COLORS[band]}`} />
        <span>{HEALTH_BAND_LABELS[band]}</span>
        {showScore && <span className="opacity-70">({score})</span>}
      </div>

      {showBreakdown && breakdown && (
        <div className="mt-2 text-xs text-gray-500 space-y-1">
          <div className="flex justify-between">
            <span>Engagement</span>
            <span>{breakdown.engagement}/25</span>
          </div>
          <div className="flex justify-between">
            <span>Momentum</span>
            <span>{breakdown.momentum}/25</span>
          </div>
          <div className="flex justify-between">
            <span>Risk</span>
            <span>{breakdown.risk}/25</span>
          </div>
          <div className="flex justify-between">
            <span>Intelligence</span>
            <span>{breakdown.intelligence}/25</span>
          </div>
        </div>
      )}
    </div>
  );
}

interface HealthScoreCardProps {
  score: number;
  band: HealthBand;
  breakdown: {
    engagement: number;
    momentum: number;
    risk: number;
    intelligence: number;
  };
  calculatedAt?: string;
}

export function HealthScoreCard({ score, band, breakdown, calculatedAt }: HealthScoreCardProps) {
  const components = [
    { label: 'Engagement', value: breakdown.engagement, color: 'bg-blue-500' },
    { label: 'Momentum', value: breakdown.momentum, color: 'bg-green-500' },
    { label: 'Risk', value: breakdown.risk, color: 'bg-orange-500' },
    { label: 'Intelligence', value: breakdown.intelligence, color: 'bg-purple-500' },
  ];

  return (
    <div className="bg-white rounded-lg border p-4">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-sm font-medium text-gray-700">Account Health</h4>
        <HealthScoreBadge score={score} band={band} size="sm" />
      </div>

      {/* Score Ring */}
      <div className="flex items-center gap-4 mb-4">
        <div className="relative w-16 h-16">
          <svg className="w-16 h-16 transform -rotate-90">
            <circle
              cx="32"
              cy="32"
              r="28"
              stroke="currentColor"
              strokeWidth="6"
              fill="none"
              className="text-gray-100"
            />
            <circle
              cx="32"
              cy="32"
              r="28"
              stroke="currentColor"
              strokeWidth="6"
              fill="none"
              strokeDasharray={`${(score / 100) * 176} 176`}
              className={HEALTH_BAND_TEXT_COLORS[band]}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-lg font-bold text-gray-900">{score}</span>
          </div>
        </div>

        <div className="flex-1 space-y-2">
          {components.map((component) => (
            <div key={component.label} className="flex items-center gap-2">
              <span className="text-xs text-gray-500 w-20">{component.label}</span>
              <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full ${component.color} rounded-full transition-all`}
                  style={{ width: `${(component.value / 25) * 100}%` }}
                />
              </div>
              <span className="text-xs text-gray-600 w-8 text-right">{component.value}</span>
            </div>
          ))}
        </div>
      </div>

      {calculatedAt && (
        <p className="text-xs text-gray-400">
          Last calculated: {new Date(calculatedAt).toLocaleDateString()}
        </p>
      )}
    </div>
  );
}
