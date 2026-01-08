'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp, MessageSquare, Mail, ClipboardList, Building2, CheckSquare, ExternalLink, Settings, FileText } from 'lucide-react';

interface ExternalSourcesPanelProps {
  accountPlanId: string;
  accountSlug: string;
  slackChannelUrl?: string | null;
  jiraProjectUrl?: string | null;
  asanaProjectUrl?: string | null;
  crmOpportunityUrl?: string | null;
  emailCount?: number;
  onConfigureClick?: () => void;
  onImportNotesClick?: () => void;
  // Scout terminology support
  title?: string;  // "Scout Workbench" or "External Sources"
  // Allow controlling initial expand state
  defaultExpanded?: boolean;
}

export function ExternalSourcesPanel({
  accountPlanId,
  accountSlug,
  slackChannelUrl,
  jiraProjectUrl,
  asanaProjectUrl,
  crmOpportunityUrl,
  emailCount = 0,
  onConfigureClick,
  onImportNotesClick,
  title = 'Scout Workbench',  // Default to Scout terminology
  defaultExpanded = true,
}: ExternalSourcesPanelProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  // Generate email forward address
  const emailForwardAddress = `scout+${accountSlug}@yourapp.com`;

  const hasAnyConfigured = slackChannelUrl || jiraProjectUrl || asanaProjectUrl || crmOpportunityUrl;

  return (
    <div className="bg-white rounded-lg border overflow-hidden">
      {/* Header */}
      <div
        className="px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors flex items-center justify-between"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          <ExternalLink className="w-4 h-4 text-gray-400" />
          <h3 className="text-sm font-medium text-gray-700">{title}</h3>
          {!hasAnyConfigured && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-50 text-amber-600">
              Not configured
            </span>
          )}
        </div>
        <button className="p-1 rounded hover:bg-gray-100">
          {isExpanded ? (
            <ChevronUp className="w-4 h-4 text-gray-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-gray-400" />
          )}
        </button>
      </div>

      {/* Content */}
      {isExpanded && (
        <div className="px-4 pb-4 border-t">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-3">
            {/* Slack */}
            <ExternalSourceCard
              icon={<MessageSquare className="w-4 h-4" />}
              label="Slack"
              sublabel={slackChannelUrl ? 'Connected' : 'Not connected'}
              url={slackChannelUrl}
              placeholder="Connect Channel"
              color="purple"
            />

            {/* Email */}
            <ExternalSourceCard
              icon={<Mail className="w-4 h-4" />}
              label="Email"
              sublabel={emailCount > 0 ? `${emailCount} new` : emailForwardAddress.split('@')[0]}
              url={null}
              placeholder="View Inbox"
              color="blue"
              comingSoon
            />

            {/* Jira */}
            <ExternalSourceCard
              icon={<ClipboardList className="w-4 h-4" />}
              label="Jira"
              sublabel={jiraProjectUrl ? 'Linked' : 'Not linked'}
              url={jiraProjectUrl}
              placeholder="Link Project"
              color="blue"
            />

            {/* CRM */}
            <ExternalSourceCard
              icon={<Building2 className="w-4 h-4" />}
              label="CRM"
              sublabel={crmOpportunityUrl ? 'View Deal' : 'Not linked'}
              url={crmOpportunityUrl}
              placeholder="Link Deal"
              color="green"
            />

            {/* Asana */}
            <ExternalSourceCard
              icon={<CheckSquare className="w-4 h-4" />}
              label="Asana"
              sublabel={asanaProjectUrl ? 'Linked' : 'Not linked'}
              url={asanaProjectUrl}
              placeholder="Link Project"
              color="orange"
            />

            {/* Import Notes */}
            {onImportNotesClick && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onImportNotesClick();
                }}
                className="flex flex-col items-center justify-center p-3 rounded-lg border border-dashed border-green-200 hover:border-green-300 hover:bg-green-50 transition-colors text-green-600 hover:text-green-700"
              >
                <FileText className="w-4 h-4 mb-1" />
                <span className="text-xs font-medium">Import Notes</span>
                <span className="text-[10px] text-green-500">AI Extract</span>
              </button>
            )}

            {/* Configure */}
            {onConfigureClick && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onConfigureClick();
                }}
                className="flex flex-col items-center justify-center p-3 rounded-lg border border-dashed border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-colors text-gray-400 hover:text-gray-500"
              >
                <Settings className="w-4 h-4 mb-1" />
                <span className="text-xs">Configure</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

interface ExternalSourceCardProps {
  icon: React.ReactNode;
  label: string;
  sublabel: string;
  url?: string | null;
  placeholder: string;
  color: 'purple' | 'blue' | 'green' | 'orange';
  comingSoon?: boolean;
}

function ExternalSourceCard({
  icon,
  label,
  sublabel,
  url,
  placeholder,
  color,
  comingSoon,
}: ExternalSourceCardProps) {
  const colorClasses = {
    purple: {
      bg: 'bg-purple-50',
      icon: 'text-purple-500',
      text: 'text-purple-600',
    },
    blue: {
      bg: 'bg-blue-50',
      icon: 'text-blue-500',
      text: 'text-blue-600',
    },
    green: {
      bg: 'bg-green-50',
      icon: 'text-green-500',
      text: 'text-green-600',
    },
    orange: {
      bg: 'bg-orange-50',
      icon: 'text-orange-500',
      text: 'text-orange-600',
    },
  };

  const colors = colorClasses[color];
  const isConfigured = !!url;

  const content = (
    <div
      className={`flex flex-col items-center justify-center p-3 rounded-lg border transition-colors ${
        isConfigured
          ? `${colors.bg} border-transparent hover:opacity-80`
          : 'bg-gray-50 border-gray-100 hover:bg-gray-100'
      }`}
    >
      <div className={isConfigured ? colors.icon : 'text-gray-400'}>{icon}</div>
      <span className={`text-xs font-medium mt-1 ${isConfigured ? colors.text : 'text-gray-600'}`}>
        {label}
      </span>
      <span className="text-[10px] text-gray-500 truncate max-w-full">
        {isConfigured ? sublabel : placeholder}
      </span>
      {comingSoon && (
        <span className="text-[9px] px-1 py-0.5 bg-gray-100 text-gray-400 rounded mt-1">
          Soon
        </span>
      )}
    </div>
  );

  if (url) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="block"
        onClick={(e) => e.stopPropagation()}
      >
        {content}
      </a>
    );
  }

  return (
    <div className="cursor-default" title={comingSoon ? 'Coming soon' : `Click to ${placeholder.toLowerCase()}`}>
      {content}
    </div>
  );
}
