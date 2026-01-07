'use client';

import { useState, useEffect, useCallback } from 'react';
import type { HealthBand } from '@/lib/scoring/health-score';

interface AccountHealthScore {
  health_score_id: string;
  account_plan_id: string;
  engagement_score: number;
  momentum_score: number;
  risk_score: number;
  intelligence_score: number;
  total_score: number;
  health_band: HealthBand;
  score_inputs: Record<string, unknown>;
  calculated_at: string;
  exists: boolean;
}

interface UseAccountHealthResult {
  healthScore: AccountHealthScore | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  recalculate: () => Promise<void>;
}

export function useAccountHealth(accountPlanId: string): UseAccountHealthResult {
  const [healthScore, setHealthScore] = useState<AccountHealthScore | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchHealthScore = useCallback(async () => {
    if (!accountPlanId) return;

    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/accounts/${accountPlanId}/health`);
      if (!response.ok) {
        throw new Error('Failed to fetch health score');
      }
      const data = await response.json();
      setHealthScore(data);
    } catch (e) {
      setError(e as Error);
    } finally {
      setIsLoading(false);
    }
  }, [accountPlanId]);

  const recalculate = useCallback(async () => {
    if (!accountPlanId) return;

    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/accounts/${accountPlanId}/health`, {
        method: 'POST',
      });
      if (!response.ok) {
        throw new Error('Failed to recalculate health score');
      }
      const data = await response.json();
      setHealthScore({ ...data, exists: true });
    } catch (e) {
      setError(e as Error);
    } finally {
      setIsLoading(false);
    }
  }, [accountPlanId]);

  useEffect(() => {
    fetchHealthScore();
  }, [fetchHealthScore]);

  return { healthScore, isLoading, error, refetch: fetchHealthScore, recalculate };
}
