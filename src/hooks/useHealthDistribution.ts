'use client';

import { useState, useEffect, useCallback } from 'react';
import type { HealthBand } from '@/lib/scoring/health-score';

type HealthDistribution = Record<HealthBand, number>;

interface UseHealthDistributionResult {
  distribution: HealthDistribution | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function useHealthDistribution(): UseHealthDistributionResult {
  const [distribution, setDistribution] = useState<HealthDistribution | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchDistribution = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/dashboard/health-distribution');
      if (!response.ok) {
        throw new Error('Failed to fetch health distribution');
      }
      const data = await response.json();
      setDistribution(data);
    } catch (e) {
      setError(e as Error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDistribution();
  }, [fetchDistribution]);

  return { distribution, isLoading, error, refetch: fetchDistribution };
}
