'use client';

import { useState, useEffect, useCallback } from 'react';

interface SparkMetrics {
  // Active Sparks
  sparksActive: number;

  // Net New (Converted)
  sparksConverted: number;
  pipelineCreated: number;

  // Enrichment (Linked)
  sparksLinked: number;
  pipelineEnriched: number;

  // Pipeline
  totalPipelineValue: number;
  coveredDealsCount: number;
  totalDealsCount: number;
  pipelineCoverage: number;

  // TAM
  tamAccountsAvailable: number;
  tamAccountsEnriched: number;
  tamAccountsTotal: number;
  enrichmentRate: number;
}

interface UseSparkMetricsResult {
  metrics: SparkMetrics | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function useSparkMetrics(): UseSparkMetricsResult {
  const [metrics, setMetrics] = useState<SparkMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchMetrics = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/dashboard/spark-metrics');
      if (!response.ok) {
        throw new Error('Failed to fetch spark metrics');
      }
      const data = await response.json();
      setMetrics(data);
    } catch (e) {
      setError(e as Error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  return { metrics, isLoading, error, refetch: fetchMetrics };
}
