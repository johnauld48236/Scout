'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp, Target, AlertTriangle, Zap, FileText, Users } from 'lucide-react';

interface Campaign {
  campaign_id: string;
  name: string;
  type: string;
  status: string;
  target_verticals?: string[];
  target_geos?: string[];
  value_proposition?: string;
  key_pain_points?: string;
  signal_triggers?: string;
  regulatory_context?: string;
  start_date?: string;
  end_date?: string;
  pipeline_goal?: number;
  pipelineValue: number;
  pursuitCount: number;
  tamCount: number;
  sparksCount?: number;
  accountsCount?: number;
}

interface CampaignDetailCardProps {
  campaign: Campaign;
}

function TypeBadge({ type }: { type: string }) {
  const config: Record<string, { bg: string; text: string; label: string }> = {
    vertical: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Vertical' },
    thematic: { bg: 'bg-purple-100', text: 'text-purple-700', label: 'Thematic' },
  };
  const { bg, text, label } = config[type] || config.vertical;
  return <span className={`px-2 py-1 rounded text-xs font-medium ${bg} ${text}`}>{label}</span>;
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { bg: string; text: string }> = {
    active: { bg: 'bg-green-100', text: 'text-green-700' },
    planned: { bg: 'bg-gray-100', text: 'text-gray-600' },
    paused: { bg: 'bg-yellow-100', text: 'text-yellow-700' },
    completed: { bg: 'bg-gray-100', text: 'text-gray-500' },
  };
  const { bg, text } = config[status] || config.planned;
  return (
    <span className={`px-2 py-1 rounded text-xs font-medium ${bg} ${text}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

function Section({
  title,
  icon: Icon,
  children,
  isEmpty,
}: {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
  isEmpty?: boolean;
}) {
  if (isEmpty) return null;
  return (
    <div className="border-t pt-4 mt-4">
      <div className="flex items-center gap-2 mb-2">
        <Icon className="w-4 h-4 text-gray-400" />
        <h4 className="text-sm font-medium text-gray-700">{title}</h4>
      </div>
      <div className="text-sm text-gray-600 whitespace-pre-wrap">{children}</div>
    </div>
  );
}

export function CampaignDetailCard({ campaign }: CampaignDetailCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const hasContent =
    campaign.value_proposition ||
    campaign.key_pain_points ||
    campaign.signal_triggers ||
    campaign.regulatory_context;

  const formatCurrency = (value: number) => {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
    return `$${value.toLocaleString()}`;
  };

  return (
    <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
      {/* Header - Always Visible */}
      <div
        className="p-5 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h3 className="text-lg font-semibold text-gray-900">{campaign.name}</h3>
              <TypeBadge type={campaign.type} />
              <StatusBadge status={campaign.status} />
            </div>

            {campaign.target_verticals && campaign.target_verticals.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-2">
                {campaign.target_verticals.map((vertical) => (
                  <span
                    key={vertical}
                    className="px-2 py-0.5 bg-gray-100 rounded text-xs text-gray-600"
                  >
                    {vertical}
                  </span>
                ))}
              </div>
            )}

            {/* Summary line */}
            {campaign.value_proposition && (
              <p className="text-sm text-gray-600 line-clamp-2">{campaign.value_proposition}</p>
            )}
          </div>

          <button
            className="ml-4 p-1 rounded hover:bg-gray-100"
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
          >
            {isExpanded ? (
              <ChevronUp className="w-5 h-5 text-gray-400" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-400" />
            )}
          </button>
        </div>

        {/* Metrics Row */}
        <div className="grid grid-cols-5 gap-4 mt-4 pt-4 border-t">
          <div>
            <p className="text-xs text-gray-500">Pipeline</p>
            <p className="text-sm font-semibold text-gray-900">
              {formatCurrency(campaign.pipelineValue)}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Pursuits</p>
            <p className="text-sm font-semibold text-gray-900">{campaign.pursuitCount}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Sparks</p>
            <p className="text-sm font-semibold text-gray-900">{campaign.sparksCount || 0}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Accounts</p>
            <p className="text-sm font-semibold text-gray-900">{campaign.accountsCount || 0}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">TAM Fit</p>
            <p className="text-sm font-semibold text-gray-900">{campaign.tamCount}</p>
          </div>
        </div>

        {/* Progress bar for thematic campaigns */}
        {campaign.type === 'thematic' && campaign.pipeline_goal && campaign.pipeline_goal > 0 && (
          <div className="mt-4">
            <div className="flex justify-between text-xs mb-1">
              <span className="text-gray-500">Goal Progress</span>
              <span className="font-medium text-gray-700">
                {Math.round((campaign.pipelineValue / campaign.pipeline_goal) * 100)}%
              </span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-purple-500 rounded-full transition-all"
                style={{
                  width: `${Math.min((campaign.pipelineValue / campaign.pipeline_goal) * 100, 100)}%`,
                }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Expanded Content */}
      {isExpanded && hasContent && (
        <div className="px-5 pb-5 bg-gray-50">
          {/* WHY - Value Proposition */}
          <Section title="WHY - Value Proposition" icon={Target} isEmpty={!campaign.value_proposition}>
            {campaign.value_proposition}
          </Section>

          {/* WHAT - Pain Points */}
          <Section
            title="WHAT - Target Pain Points"
            icon={AlertTriangle}
            isEmpty={!campaign.key_pain_points}
          >
            {campaign.key_pain_points}
          </Section>

          {/* HOW - Signal Triggers */}
          <Section title="HOW - Signal Triggers" icon={Zap} isEmpty={!campaign.signal_triggers}>
            {campaign.signal_triggers}
          </Section>

          {/* Regulatory Context */}
          <Section
            title="Regulatory Context"
            icon={FileText}
            isEmpty={!campaign.regulatory_context}
          >
            {campaign.regulatory_context}
          </Section>

          {/* Target Geos */}
          {campaign.target_geos && campaign.target_geos.length > 0 && (
            <Section title="Target Geographies" icon={Users} isEmpty={false}>
              <div className="flex flex-wrap gap-2">
                {campaign.target_geos.map((geo) => (
                  <span key={geo} className="px-2 py-1 bg-white rounded border text-xs">
                    {geo}
                  </span>
                ))}
              </div>
            </Section>
          )}

          {/* Timeline for thematic */}
          {campaign.type === 'thematic' && campaign.start_date && (
            <div className="border-t pt-4 mt-4">
              <p className="text-xs text-gray-500">
                Campaign Period: {new Date(campaign.start_date).toLocaleDateString()} -{' '}
                {campaign.end_date ? new Date(campaign.end_date).toLocaleDateString() : 'Ongoing'}
              </p>
            </div>
          )}
        </div>
      )}

      {/* No content warning */}
      {isExpanded && !hasContent && (
        <div className="px-5 pb-5 bg-amber-50">
          <div className="flex items-center gap-2 text-amber-700">
            <AlertTriangle className="w-4 h-4" />
            <p className="text-sm">
              No campaign context configured. Add value proposition, pain points, and signal
              triggers to help the AI provide better intelligence.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
