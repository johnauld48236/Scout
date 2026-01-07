// lib/scoring/health-score.ts
// Health Scoring System v1 - Observable signals, simple weights, pattern learning

export interface EngagementInputs {
  days_since_contact: number;
  last_contact_type: string | null;
  contact_count_30d: number;
}

export interface MomentumInputs {
  stage_30d_ago: string | null;
  stage_now: string;
  movement: number; // -3 to +3
}

export interface RiskInputs {
  open_risks: number;
  critical_risks: number;
  risk_age_avg_days: number;
}

export interface IntelligenceInputs {
  sparks_count: number;
  stakeholders_mapped: number;
  signals_30d: number;
}

export interface HealthInputs {
  engagement: EngagementInputs;
  momentum: MomentumInputs;
  risk: RiskInputs;
  intelligence: IntelligenceInputs;
}

export interface HealthScore {
  engagement_score: number;
  momentum_score: number;
  risk_score: number;
  intelligence_score: number;
  total_score: number;
  health_band: HealthBand;
  score_inputs: HealthInputs;
}

export const HEALTH_BANDS = ['healthy', 'monitor', 'at_risk', 'critical'] as const;
export type HealthBand = (typeof HEALTH_BANDS)[number];

export const HEALTH_BAND_COLORS: Record<HealthBand, string> = {
  healthy: 'bg-green-500',
  monitor: 'bg-yellow-500',
  at_risk: 'bg-orange-500',
  critical: 'bg-red-500',
};

export const HEALTH_BAND_TEXT_COLORS: Record<HealthBand, string> = {
  healthy: 'text-green-700',
  monitor: 'text-yellow-700',
  at_risk: 'text-orange-700',
  critical: 'text-red-700',
};

export const HEALTH_BAND_BG_COLORS: Record<HealthBand, string> = {
  healthy: 'bg-green-100',
  monitor: 'bg-yellow-100',
  at_risk: 'bg-orange-100',
  critical: 'bg-red-100',
};

export const HEALTH_BAND_LABELS: Record<HealthBand, string> = {
  healthy: 'Healthy',
  monitor: 'Monitor',
  at_risk: 'At Risk',
  critical: 'Critical',
};

/**
 * Calculate engagement score (0-25)
 * Based on recency and frequency of contact
 */
export function calculateEngagementScore(inputs: EngagementInputs): number {
  // Recency: 0-14 days = full points (15), decays from there
  const recencyScore = Math.max(0, 15 - Math.floor(inputs.days_since_contact / 2));

  // Frequency: Up to 10 points for contacts in last 30 days
  const frequencyScore = Math.min(10, inputs.contact_count_30d * 2);

  return Math.min(25, recencyScore + frequencyScore);
}

/**
 * Calculate momentum score (0-25)
 * Based on deal stage movement over 30 days
 */
export function calculateMomentumScore(inputs: MomentumInputs): number {
  // Movement scale: -3 to +3 maps to 0-25
  // 0 movement = 12.5 (middle)
  // +3 movement = 25 (max)
  // -3 movement = 0 (min)
  const normalizedMovement = Math.max(-3, Math.min(3, inputs.movement));
  return Math.round(12.5 + normalizedMovement * 4.17);
}

/**
 * Calculate risk score (0-25)
 * Inverse scoring - fewer risks = higher score
 */
export function calculateRiskScore(inputs: RiskInputs): number {
  // Start with max score, subtract for risks
  // Each open risk: -4 points
  // Each critical risk: additional -3 points
  const riskPenalty = inputs.open_risks * 4 + inputs.critical_risks * 3;
  return Math.max(0, 25 - riskPenalty);
}

/**
 * Calculate intelligence score (0-25)
 * Based on Spark coverage, stakeholder mapping, and signal activity
 */
export function calculateIntelligenceScore(inputs: IntelligenceInputs): number {
  // Sparks: up to 10 points (3 points per spark, max 10)
  const sparkScore = Math.min(10, inputs.sparks_count * 3);

  // Stakeholders: up to 10 points (1 point per stakeholder, max 10)
  const stakeholderScore = Math.min(10, inputs.stakeholders_mapped);

  // Signals: up to 5 points (1 point per signal, max 5)
  const signalScore = Math.min(5, inputs.signals_30d);

  return sparkScore + stakeholderScore + signalScore;
}

/**
 * Determine health band from total score
 */
export function getHealthBand(totalScore: number): HealthBand {
  if (totalScore >= 80) return 'healthy';
  if (totalScore >= 60) return 'monitor';
  if (totalScore >= 40) return 'at_risk';
  return 'critical';
}

/**
 * Calculate complete health score from inputs
 */
export function calculateHealthScore(inputs: HealthInputs): HealthScore {
  const engagement_score = calculateEngagementScore(inputs.engagement);
  const momentum_score = calculateMomentumScore(inputs.momentum);
  const risk_score = calculateRiskScore(inputs.risk);
  const intelligence_score = calculateIntelligenceScore(inputs.intelligence);

  const total_score = engagement_score + momentum_score + risk_score + intelligence_score;
  const health_band = getHealthBand(total_score);

  return {
    engagement_score,
    momentum_score,
    risk_score,
    intelligence_score,
    total_score,
    health_band,
    score_inputs: inputs,
  };
}

/**
 * Stage movement calculation helper
 * Returns movement value from -3 to +3
 */
const STAGE_ORDER = [
  'discovery',
  'qualification',
  'proposal',
  'negotiation',
  'closed_won',
];

export function calculateStageMovement(stageBefore: string | null, stageNow: string): number {
  if (!stageBefore) return 0;

  const beforeIndex = STAGE_ORDER.indexOf(stageBefore);
  const nowIndex = STAGE_ORDER.indexOf(stageNow);

  if (beforeIndex === -1 || nowIndex === -1) return 0;

  // Clamp to -3 to +3
  return Math.max(-3, Math.min(3, nowIndex - beforeIndex));
}

/**
 * Get score breakdown for display
 */
export function getScoreBreakdown(score: HealthScore) {
  return [
    { label: 'Engagement', value: score.engagement_score, max: 25 },
    { label: 'Momentum', value: score.momentum_score, max: 25 },
    { label: 'Risk', value: score.risk_score, max: 25 },
    { label: 'Intelligence', value: score.intelligence_score, max: 25 },
  ];
}
