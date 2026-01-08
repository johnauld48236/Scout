'use client';

import {
  HEALTH_BAND_COLORS,
  HEALTH_BAND_TEXT_COLORS,
  HEALTH_BAND_BG_COLORS,
  HEALTH_BAND_LABELS,
  type HealthBand,
  type ScoringProfile,
} from '@/lib/scoring/health-score';

// Vector Out breakdown (prospects)
interface VectorOutBreakdown {
  engagement: number;
  momentum: number;
  risk: number;
  intelligence: number;
}

// Vector In breakdown (customers)
interface VectorInBreakdown {
  sentiment: number;
  usage: number;
  support: number;
  engagement: number;
}

interface HealthScoreBadgeProps {
  score: number;
  band: HealthBand;
  size?: 'sm' | 'md' | 'lg';
  showScore?: boolean;
  showBreakdown?: boolean;
  profile?: ScoringProfile;
  breakdown?: VectorOutBreakdown;
  vectorInBreakdown?: VectorInBreakdown;
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
  profile = 'vector_out',
  breakdown,
  vectorInBreakdown,
}: HealthScoreBadgeProps) {
  const isVectorIn = profile === 'vector_in';

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

      {showBreakdown && isVectorIn && vectorInBreakdown && (
        <div className="mt-2 text-xs text-gray-500 space-y-1">
          <div className="flex justify-between">
            <span>Sentiment</span>
            <span>{vectorInBreakdown.sentiment}/40</span>
          </div>
          <div className="flex justify-between">
            <span>Product Usage</span>
            <span>{vectorInBreakdown.usage}/30</span>
          </div>
          <div className="flex justify-between">
            <span>Support Health</span>
            <span>{vectorInBreakdown.support}/20</span>
          </div>
          <div className="flex justify-between">
            <span>Engagement</span>
            <span>{vectorInBreakdown.engagement}/10</span>
          </div>
        </div>
      )}

      {showBreakdown && !isVectorIn && breakdown && (
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
  profile?: ScoringProfile;
  breakdown?: VectorOutBreakdown;
  vectorInBreakdown?: VectorInBreakdown;
  calculatedAt?: string;
}

export function HealthScoreCard({
  score,
  band,
  profile = 'vector_out',
  breakdown,
  vectorInBreakdown,
  calculatedAt,
}: HealthScoreCardProps) {
  const isVectorIn = profile === 'vector_in';

  // Vector In components with their max scores
  const vectorInComponents = vectorInBreakdown ? [
    { label: 'Sentiment', value: vectorInBreakdown.sentiment, max: 40, color: 'bg-pink-500' },
    { label: 'Product Usage', value: vectorInBreakdown.usage, max: 30, color: 'bg-cyan-500' },
    { label: 'Support Health', value: vectorInBreakdown.support, max: 20, color: 'bg-amber-500' },
    { label: 'Engagement', value: vectorInBreakdown.engagement, max: 10, color: 'bg-blue-500' },
  ] : [];

  // Vector Out components with their max scores
  const vectorOutComponents = breakdown ? [
    { label: 'Engagement', value: breakdown.engagement, max: 25, color: 'bg-blue-500' },
    { label: 'Momentum', value: breakdown.momentum, max: 25, color: 'bg-green-500' },
    { label: 'Risk', value: breakdown.risk, max: 25, color: 'bg-orange-500' },
    { label: 'Intelligence', value: breakdown.intelligence, max: 25, color: 'bg-purple-500' },
  ] : [];

  const components = isVectorIn ? vectorInComponents : vectorOutComponents;

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
              <span className="text-xs text-gray-500 w-24 truncate">{component.label}</span>
              <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full ${component.color} rounded-full transition-all`}
                  style={{ width: `${(component.value / component.max) * 100}%` }}
                />
              </div>
              <span className="text-xs text-gray-600 w-10 text-right">{component.value}/{component.max}</span>
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
