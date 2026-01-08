// lib/scoring/health-score.ts
// Health Scoring System v2 - Supports Vector Out (prospects) and Vector In (customers)

// ============================================
// SCORING PROFILE TYPES
// ============================================
export type ScoringProfile = 'vector_out' | 'vector_in';

// ============================================
// VECTOR OUT INPUTS (Prospects)
// ============================================
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

// ============================================
// VECTOR IN INPUTS (Customers)
// ============================================
export interface SentimentInputs {
  nps_score: number | null;  // -100 to +100
  csat_score: number | null; // 0 to 100
}

export interface UsageInputs {
  // Placeholder for product analytics integration
  usage_percentage: number | null; // 0 to 100 (MAU / Total Licenses * 100)
}

export interface SupportInputs {
  // Placeholder for Jira/support integration
  critical_overdue: number;
  high_overdue: number;
}

export interface CustomerEngagementInputs {
  days_since_contact: number;
  contact_count_30d: number;
}

export interface VectorInHealthInputs {
  sentiment: SentimentInputs;
  usage: UsageInputs;
  support: SupportInputs;
  engagement: CustomerEngagementInputs;
}

// ============================================
// UNIFIED HEALTH SCORE RESULT
// ============================================

// Vector Out (Prospect) Health Score
export interface VectorOutHealthScore {
  profile: 'vector_out';
  engagement_score: number;
  momentum_score: number;
  risk_score: number;
  intelligence_score: number;
  total_score: number;
  health_band: HealthBand;
  score_inputs: HealthInputs;
}

// Vector In (Customer) Health Score
export interface VectorInHealthScore {
  profile: 'vector_in';
  sentiment_score: number;
  usage_score: number;
  support_score: number;
  engagement_score: number;
  total_score: number;
  health_band: HealthBand;
  score_inputs: VectorInHealthInputs;
}

// Legacy compatible interface (defaults to Vector Out structure)
export interface HealthScore {
  engagement_score: number;
  momentum_score: number;
  risk_score: number;
  intelligence_score: number;
  total_score: number;
  health_band: HealthBand;
  score_inputs: HealthInputs;
}

// Union type for either score type
export type UnifiedHealthScore = VectorOutHealthScore | VectorInHealthScore;

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
 * Get score breakdown for display (Vector Out)
 */
export function getScoreBreakdown(score: HealthScore) {
  return [
    { label: 'Engagement', value: score.engagement_score, max: 25 },
    { label: 'Momentum', value: score.momentum_score, max: 25 },
    { label: 'Risk', value: score.risk_score, max: 25 },
    { label: 'Intelligence', value: score.intelligence_score, max: 25 },
  ];
}

// ============================================
// VECTOR IN (CUSTOMER) SCORING FUNCTIONS
// ============================================

/**
 * Calculate sentiment score (0-40) - 40% weight
 * Based on NPS and CSAT scores
 */
export function calculateSentimentScore(inputs: SentimentInputs): number {
  // Convert NPS from -100:+100 to 0:100
  const npsGrade = inputs.nps_score !== null
    ? (inputs.nps_score + 100) / 2
    : null;

  // CSAT is already 0-100
  const csatGrade = inputs.csat_score;

  // Calculate sentiment: average of available scores, or 50 if both null
  let sentiment: number;
  if (npsGrade !== null && csatGrade !== null) {
    sentiment = (npsGrade + csatGrade) / 2;
  } else if (npsGrade !== null) {
    sentiment = npsGrade;
  } else if (csatGrade !== null) {
    sentiment = csatGrade;
  } else {
    sentiment = 50; // Neutral default
  }

  // Scale to 0-40 (40% weight)
  return Math.round(sentiment * 0.4);
}

/**
 * Calculate usage score (0-30) - 30% weight
 * Based on product usage metrics
 */
export function calculateUsageScore(inputs: UsageInputs): number {
  // For now, hardcode to 50% (placeholder until product analytics integration)
  const usagePercentage = inputs.usage_percentage ?? 50;

  // Scale to 0-30 (30% weight)
  return Math.round(usagePercentage * 0.3);
}

/**
 * Calculate support score (0-20) - 20% weight
 * Based on support ticket health
 */
export function calculateSupportScore(inputs: SupportInputs): number {
  // For now, hardcode to 75% health (placeholder until Jira integration)
  // Future formula: 100 - (10 * critical_overdue) - (5 * high_overdue)
  const supportHealth = Math.max(0, 100 - (10 * inputs.critical_overdue) - (5 * inputs.high_overdue));

  // Default to 75 if no ticket data
  const effectiveHealth = (inputs.critical_overdue === 0 && inputs.high_overdue === 0) ? 75 : supportHealth;

  // Scale to 0-20 (20% weight)
  return Math.round(effectiveHealth * 0.2);
}

/**
 * Calculate customer engagement score (0-10) - 10% weight
 * Based on recency of contact
 */
export function calculateCustomerEngagementScore(inputs: CustomerEngagementInputs): number {
  // Score based on days since contact
  // 0-7 days = 100%, 8-14 days = 80%, 15-30 days = 60%, 31-60 days = 40%, 60+ days = 20%
  let engagementPct: number;
  if (inputs.days_since_contact <= 7) {
    engagementPct = 100;
  } else if (inputs.days_since_contact <= 14) {
    engagementPct = 80;
  } else if (inputs.days_since_contact <= 30) {
    engagementPct = 60;
  } else if (inputs.days_since_contact <= 60) {
    engagementPct = 40;
  } else {
    engagementPct = 20;
  }

  // Boost for recent activity
  const activityBonus = Math.min(20, inputs.contact_count_30d * 5);
  engagementPct = Math.min(100, engagementPct + activityBonus);

  // Scale to 0-10 (10% weight)
  return Math.round(engagementPct * 0.1);
}

/**
 * Calculate complete Vector In health score from inputs
 */
export function calculateVectorInHealthScore(inputs: VectorInHealthInputs): VectorInHealthScore {
  const sentiment_score = calculateSentimentScore(inputs.sentiment);
  const usage_score = calculateUsageScore(inputs.usage);
  const support_score = calculateSupportScore(inputs.support);
  const engagement_score = calculateCustomerEngagementScore(inputs.engagement);

  const total_score = sentiment_score + usage_score + support_score + engagement_score;
  const health_band = getHealthBand(total_score);

  return {
    profile: 'vector_in',
    sentiment_score,
    usage_score,
    support_score,
    engagement_score,
    total_score,
    health_band,
    score_inputs: inputs,
  };
}

/**
 * Calculate Vector Out health score (wrapper for existing function)
 */
export function calculateVectorOutHealthScore(inputs: HealthInputs): VectorOutHealthScore {
  const result = calculateHealthScore(inputs);
  return {
    profile: 'vector_out',
    ...result,
  };
}

/**
 * Get score breakdown for Vector In display
 */
export function getVectorInScoreBreakdown(score: VectorInHealthScore) {
  return [
    { label: 'Sentiment', value: score.sentiment_score, max: 40 },
    { label: 'Product Usage', value: score.usage_score, max: 30 },
    { label: 'Support Health', value: score.support_score, max: 20 },
    { label: 'Engagement', value: score.engagement_score, max: 10 },
  ];
}

/**
 * Get unified score breakdown based on profile
 */
export function getUnifiedScoreBreakdown(score: UnifiedHealthScore) {
  if (score.profile === 'vector_in') {
    return getVectorInScoreBreakdown(score);
  }
  return [
    { label: 'Engagement', value: score.engagement_score, max: 25 },
    { label: 'Momentum', value: score.momentum_score, max: 25 },
    { label: 'Risk', value: score.risk_score, max: 25 },
    { label: 'Intelligence', value: score.intelligence_score, max: 25 },
  ];
}
