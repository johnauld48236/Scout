'use client';

import { Zap, TrendingUp, Target, AlertCircle } from 'lucide-react';

interface ScoutHealthMetricsProps {
  sparksActive: number;
  pipelineCoverage: number;
  dealsWithCoverage: number;
  totalDeals: number;
  healthyAccounts: number;
  atRiskAccounts: number;
  overdueActions: number;
}

export function ScoutHealthMetrics({
  sparksActive,
  pipelineCoverage,
  dealsWithCoverage,
  totalDeals,
  healthyAccounts,
  atRiskAccounts,
  overdueActions,
}: ScoutHealthMetricsProps) {
  // Determine overall health status
  const getHealthStatus = () => {
    if (overdueActions > 5 || atRiskAccounts > 3) return 'needs_attention';
    if (pipelineCoverage < 30) return 'building';
    if (pipelineCoverage >= 70) return 'strong';
    return 'developing';
  };

  const healthStatus = getHealthStatus();

  // Scout brand status configurations
  const statusConfig = {
    strong: {
      bg: 'rgba(93, 122, 93, 0.1)',
      border: 'var(--scout-trail)',
      text: 'var(--scout-trail)',
      dot: 'var(--scout-trail)',
      label: 'Strong Coverage'
    },
    developing: {
      bg: 'rgba(56, 152, 199, 0.1)',
      border: 'var(--scout-sky)',
      text: 'var(--scout-sky)',
      dot: 'var(--scout-sky)',
      label: 'Developing'
    },
    building: {
      bg: 'rgba(210, 105, 30, 0.1)',
      border: 'var(--scout-sunset)',
      text: 'var(--scout-sunset)',
      dot: 'var(--scout-sunset)',
      label: 'Building'
    },
    needs_attention: {
      bg: 'rgba(169, 68, 66, 0.1)',
      border: 'var(--scout-clay)',
      text: 'var(--scout-clay)',
      dot: 'var(--scout-clay)',
      label: 'Needs Attention'
    },
  };

  const config = statusConfig[healthStatus];

  return (
    <div
      className="rounded-lg border p-4"
      style={{ backgroundColor: config.bg, borderColor: config.border }}
    >
      <div className="flex items-center justify-between">
        {/* Left side - Status + Key Metrics */}
        <div className="flex items-center gap-6">
          {/* Overall Status Badge */}
          <div className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: config.dot }}
            />
            <span className="text-sm font-medium" style={{ color: config.text }}>
              {config.label}
            </span>
          </div>

          <div className="h-6 w-px" style={{ backgroundColor: 'var(--scout-border)' }} />

          {/* Key Metrics */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4" style={{ color: 'var(--scout-sunset)' }} />
              <span className="text-sm" style={{ color: 'var(--scout-earth)' }}>
                <span className="font-semibold" style={{ color: 'var(--scout-saddle)' }}>{sparksActive}</span> Trails Active
              </span>
            </div>

            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4" style={{ color: 'var(--scout-sky)' }} />
              <span className="text-sm" style={{ color: 'var(--scout-earth)' }}>
                <span className="font-semibold" style={{ color: 'var(--scout-saddle)' }}>{Math.round(pipelineCoverage)}%</span> Pipeline Coverage
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Target className="w-4 h-4" style={{ color: 'var(--scout-trail)' }} />
              <span className="text-sm" style={{ color: 'var(--scout-earth)' }}>
                <span className="font-semibold" style={{ color: 'var(--scout-saddle)' }}>{dealsWithCoverage}/{totalDeals}</span> Deals Covered
              </span>
            </div>
          </div>
        </div>

        {/* Right side - Attention Items */}
        {(overdueActions > 0 || atRiskAccounts > 0) && (
          <div className="flex items-center gap-3">
            {overdueActions > 0 && (
              <div className="flex items-center gap-1 text-sm" style={{ color: 'var(--scout-clay)' }}>
                <AlertCircle className="w-4 h-4" />
                <span>{overdueActions} overdue</span>
              </div>
            )}
            {atRiskAccounts > 0 && (
              <div className="flex items-center gap-1 text-sm" style={{ color: 'var(--scout-sunset)' }}>
                <AlertCircle className="w-4 h-4" />
                <span>{atRiskAccounts} at risk</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
