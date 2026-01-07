'use client';

import { Link2, ArrowUpRight, X, Search } from 'lucide-react';

export const SPARK_STATUSES = [
  {
    value: 'exploring',
    label: 'Exploring',
    color: 'bg-gray-400',
    textColor: 'text-gray-700',
    bgColor: 'bg-gray-100',
    description: 'No pursuit connection yet',
    icon: Search,
  },
  {
    value: 'linked',
    label: 'Linked',
    color: 'bg-blue-500',
    textColor: 'text-blue-700',
    bgColor: 'bg-blue-100',
    description: 'Enriching existing deal',
    icon: Link2,
  },
  {
    value: 'converted',
    label: 'Converted',
    color: 'bg-green-500',
    textColor: 'text-green-700',
    bgColor: 'bg-green-100',
    description: 'Created new deal',
    icon: ArrowUpRight,
  },
  {
    value: 'closed',
    label: 'Closed',
    color: 'bg-gray-300',
    textColor: 'text-gray-500',
    bgColor: 'bg-gray-50',
    description: 'Did not pan out',
    icon: X,
  },
] as const;

export type SparkStatus = (typeof SPARK_STATUSES)[number]['value'];

interface SparkStatusSelectorProps {
  currentStatus: SparkStatus;
  onStatusChange: (status: SparkStatus) => void;
  disabled?: boolean;
  hasLinkedPursuit?: boolean;
  hasConvertedPursuit?: boolean;
}

export function SparkStatusSelector({
  currentStatus,
  onStatusChange,
  disabled = false,
  hasLinkedPursuit = false,
  hasConvertedPursuit = false,
}: SparkStatusSelectorProps) {
  const handleStatusChange = (newStatus: SparkStatus) => {
    // Prevent invalid transitions
    if (hasConvertedPursuit && newStatus === 'linked') {
      return; // Can't go from converted to linked
    }
    if (hasLinkedPursuit && newStatus === 'exploring') {
      return; // Can't go back to exploring if linked
    }
    onStatusChange(newStatus);
  };

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-gray-500">Status:</span>
      <div className="flex items-center gap-1">
        {SPARK_STATUSES.map((status) => {
          const isDisabled =
            disabled ||
            (hasConvertedPursuit && status.value === 'linked') ||
            (hasLinkedPursuit && status.value === 'exploring');

          const Icon = status.icon;

          return (
            <button
              key={status.value}
              onClick={() => handleStatusChange(status.value)}
              disabled={isDisabled}
              title={status.description}
              className={`
                flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium
                transition-all duration-200
                ${
                  currentStatus === status.value
                    ? `${status.bgColor} ring-2 ring-offset-1 ring-gray-300`
                    : 'hover:bg-gray-50'
                }
                ${isDisabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}
              `}
            >
              <Icon className={`w-3 h-3 ${currentStatus === status.value ? status.textColor : 'text-gray-400'}`} />
              <span className={currentStatus === status.value ? status.textColor : 'text-gray-600'}>
                {status.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

interface SparkStatusBadgeProps {
  status: SparkStatus;
  size?: 'sm' | 'md';
}

export function SparkStatusBadge({ status, size = 'sm' }: SparkStatusBadgeProps) {
  const statusConfig = SPARK_STATUSES.find((s) => s.value === status);
  if (!statusConfig) return null;

  const Icon = statusConfig.icon;
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm';

  return (
    <span
      className={`
        inline-flex items-center gap-1 rounded-full font-medium
        ${statusConfig.bgColor} ${statusConfig.textColor}
        ${sizeClasses}
      `}
    >
      <Icon className={size === 'sm' ? 'w-3 h-3' : 'w-4 h-4'} />
      {statusConfig.label}
    </span>
  );
}
