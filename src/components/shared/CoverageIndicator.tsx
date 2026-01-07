'use client';

import { Zap, Link2, ArrowUpRight } from 'lucide-react';

type CoverageType = 'none' | 'linked' | 'converted';

interface CoverageIndicatorProps {
  coverageType: CoverageType;
  size?: 'sm' | 'md';
  showLabel?: boolean;
}

export function CoverageIndicator({
  coverageType,
  size = 'sm',
  showLabel = false,
}: CoverageIndicatorProps) {
  const iconSize = size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4';

  if (coverageType === 'converted') {
    return (
      <div
        className="inline-flex items-center gap-1 text-green-600"
        title="Created from Spark (Net New)"
      >
        <ArrowUpRight className={`${iconSize}`} />
        {showLabel && <span className="text-xs font-medium">Created from Spark</span>}
      </div>
    );
  }

  if (coverageType === 'linked') {
    return (
      <div
        className="inline-flex items-center gap-1 text-blue-600"
        title="Scout Coverage (Enrichment)"
      >
        <Link2 className={`${iconSize}`} />
        {showLabel && <span className="text-xs font-medium">Scout Coverage</span>}
      </div>
    );
  }

  return (
    <div className="inline-flex items-center gap-1 text-gray-300" title="No Scout Coverage">
      <Zap className={iconSize} />
      {showLabel && <span className="text-xs text-gray-400">No Coverage</span>}
    </div>
  );
}

interface DealCoverageIndicatorProps {
  linkedPursuitId: string | null;
  convertedPursuitId: string | null;
  currentPursuitId: string;
  size?: 'sm' | 'md';
  showLabel?: boolean;
}

export function DealCoverageIndicator({
  linkedPursuitId,
  convertedPursuitId,
  currentPursuitId,
  size = 'sm',
  showLabel = false,
}: DealCoverageIndicatorProps) {
  let coverageType: CoverageType = 'none';

  if (convertedPursuitId === currentPursuitId) {
    coverageType = 'converted';
  } else if (linkedPursuitId === currentPursuitId) {
    coverageType = 'linked';
  }

  return <CoverageIndicator coverageType={coverageType} size={size} showLabel={showLabel} />;
}

interface CoverageBadgeProps {
  coverageType: CoverageType;
}

export function CoverageBadge({ coverageType }: CoverageBadgeProps) {
  if (coverageType === 'converted') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
        <ArrowUpRight className="h-3 w-3" />
        Net New
      </span>
    );
  }

  if (coverageType === 'linked') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
        <Link2 className="h-3 w-3" />
        Enrichment
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
      <Zap className="h-3 w-3" />
      No Coverage
    </span>
  );
}
