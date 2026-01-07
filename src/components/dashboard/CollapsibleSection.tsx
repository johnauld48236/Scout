'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface CollapsibleSectionProps {
  title: string;
  subtitle?: string;
  defaultExpanded?: boolean;
  children: React.ReactNode;
  headerContent?: React.ReactNode;
}

export function CollapsibleSection({
  title,
  subtitle,
  defaultExpanded = true,
  children,
  headerContent,
}: CollapsibleSectionProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  return (
    <div className="bg-white rounded-lg border overflow-hidden">
      {/* Header - Always visible, clickable to toggle */}
      <div
        className="p-4 cursor-pointer hover:bg-gray-50 transition-colors flex items-center justify-between"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-4">
          <div>
            <h3 className="text-sm font-medium text-gray-700">{title}</h3>
            {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
          </div>
          {headerContent}
        </div>
        <button className="p-1 rounded hover:bg-gray-100">
          {isExpanded ? (
            <ChevronUp className="w-4 h-4 text-gray-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-gray-400" />
          )}
        </button>
      </div>

      {/* Content - Collapsible */}
      {isExpanded && <div className="border-t">{children}</div>}
    </div>
  );
}

interface CompactARRSummaryProps {
  arrTarget: number;
  totalWeightedPipeline: number;
  gap: number;
  recurring: number;
  upsell: number;
  newBiz: number;
}

export function CompactARRSummary({
  arrTarget,
  totalWeightedPipeline,
  gap,
  recurring,
  upsell,
  newBiz,
}: CompactARRSummaryProps) {
  const formatCurrency = (value: number) => {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
    return `$${value.toLocaleString()}`;
  };

  return (
    <div className="flex items-center gap-6 text-sm">
      <div className="flex items-center gap-2">
        <span className="text-gray-500">Target:</span>
        <span className="font-semibold text-gray-900">{formatCurrency(arrTarget)}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-gray-500">Weighted:</span>
        <span className="font-semibold text-gray-900">{formatCurrency(totalWeightedPipeline)}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-gray-500">Gap:</span>
        <span className="font-semibold text-red-600">{formatCurrency(gap)}</span>
      </div>
      <div className="h-4 w-px bg-gray-200" />
      <div className="flex items-center gap-3 text-xs">
        <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded">
          Recurring {formatCurrency(recurring)}
        </span>
        <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded">
          Upsell {formatCurrency(upsell)}
        </span>
        <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded">
          New Biz {formatCurrency(newBiz)}
        </span>
      </div>
    </div>
  );
}
