'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Star, Zap, Link2, ChevronRight, Building2, Filter, Search } from 'lucide-react';

interface AccountWithCoverage {
  account_plan_id: string;
  account_name: string;
  vertical?: string;
  account_type?: string;
  arr_target?: number;
  stakeholders?: { count: number }[];
  pursuits?: { count: number }[];
  action_items?: { status: string; due_date: string | null }[];
  sparksCount: number;
  linkedSparksCount: number;
  pipelineValue: number;
  pursuitCount: number;
  sparkRating: number;
  hasVectorOut: boolean;
  hasVectorIn: boolean;
  hasCoverage: boolean;
}

interface AccountPlansGroupedListProps {
  accounts: AccountWithCoverage[];
  verticals: string[];
  accountTypes: string[];
  basePath?: string; // Optional base path for links (e.g., '/territory')
  useScoutTerminology?: boolean; // Use Scout terminology (Trails instead of Sparks)
}

export function AccountPlansGroupedList({
  accounts,
  verticals,
  accountTypes,
  basePath = '/accounts',
  useScoutTerminology = false,
}: AccountPlansGroupedListProps) {
  // Scout terminology labels
  const sparkLabel = useScoutTerminology ? 'trails' : 'sparks';
  const coverageLabel = useScoutTerminology ? 'Trail Coverage' : 'Spark Coverage';
  const [searchQuery, setSearchQuery] = useState('');
  const [verticalFilter, setVerticalFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);

  // Filter accounts
  const filteredAccounts = accounts.filter((account) => {
    const name = account.account_name || '';
    const matchesSearch = name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesVertical = verticalFilter === 'all' || account.vertical === verticalFilter;
    const matchesType = typeFilter === 'all' || account.account_type === typeFilter;
    return matchesSearch && matchesVertical && matchesType;
  });

  // Group accounts
  const favorites = filteredAccounts.filter((a) => {
    // TODO: Check if account is in weekly review favorites
    // For now, use accounts with highest pipeline + coverage
    return a.pipelineValue > 100000 && a.hasCoverage;
  }).slice(0, 5);

  const favoriteIds = new Set(favorites.map((f) => f.account_plan_id));

  const withCoverage = filteredAccounts.filter(
    (a) => a.hasCoverage && !favoriteIds.has(a.account_plan_id)
  );

  const noCoverage = filteredAccounts.filter((a) => !a.hasCoverage);

  const formatCurrency = (value: number) => {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
    return `$${value.toLocaleString()}`;
  };

  return (
    <div className="space-y-6">
      {/* Search and Filter Bar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search accounts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-2 px-3 py-2 border rounded-lg text-sm transition-colors ${
            showFilters || verticalFilter !== 'all' || typeFilter !== 'all'
              ? 'bg-blue-50 border-blue-200 text-blue-700'
              : 'hover:bg-gray-50'
          }`}
        >
          <Filter className="w-4 h-4" />
          Filters
          {(verticalFilter !== 'all' || typeFilter !== 'all') && (
            <span className="ml-1 px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">
              {(verticalFilter !== 'all' ? 1 : 0) + (typeFilter !== 'all' ? 1 : 0)}
            </span>
          )}
        </button>
      </div>

      {/* Expanded Filters */}
      {showFilters && (
        <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Vertical</label>
            <select
              value={verticalFilter}
              onChange={(e) => setVerticalFilter(e.target.value)}
              className="px-3 py-1.5 border rounded text-sm bg-white"
            >
              <option value="all">All Verticals</option>
              {verticals.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Account Type</label>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-3 py-1.5 border rounded text-sm bg-white"
            >
              <option value="all">All Types</option>
              {accountTypes.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          {(verticalFilter !== 'all' || typeFilter !== 'all') && (
            <button
              onClick={() => {
                setVerticalFilter('all');
                setTypeFilter('all');
              }}
              className="text-sm text-gray-500 hover:text-gray-700 underline"
            >
              Clear filters
            </button>
          )}
        </div>
      )}

      {/* Favorites Section */}
      {favorites.length > 0 && (
        <AccountGroup
          title="Favorites"
          subtitle="Top accounts in weekly review"
          icon={<Star className="w-4 h-4 text-amber-500" />}
          accounts={favorites}
          formatCurrency={formatCurrency}
          basePath={basePath}
          sparkLabel={sparkLabel}
        />
      )}

      {/* With Spark/Trail Coverage */}
      {withCoverage.length > 0 && (
        <AccountGroup
          title={`With ${coverageLabel}`}
          subtitle={`${withCoverage.length} accounts with active intelligence`}
          icon={<Zap className="w-4 h-4 text-amber-500" />}
          accounts={withCoverage}
          formatCurrency={formatCurrency}
          basePath={basePath}
          sparkLabel={sparkLabel}
        />
      )}

      {/* No Coverage */}
      {noCoverage.length > 0 && (
        <AccountGroup
          title="No Coverage"
          subtitle={`${noCoverage.length} accounts need attention`}
          icon={<Building2 className="w-4 h-4 text-gray-400" />}
          accounts={noCoverage}
          formatCurrency={formatCurrency}
          muted
          basePath={basePath}
          sparkLabel={sparkLabel}
        />
      )}

      {/* Empty State */}
      {filteredAccounts.length === 0 && (
        <div className="text-center py-12 bg-white rounded-lg border">
          <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No accounts match your filters</p>
          <button
            onClick={() => {
              setSearchQuery('');
              setVerticalFilter('all');
              setTypeFilter('all');
            }}
            className="mt-2 text-sm text-blue-600 hover:text-blue-700"
          >
            Clear all filters
          </button>
        </div>
      )}
    </div>
  );
}

interface AccountGroupProps {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  accounts: AccountWithCoverage[];
  formatCurrency: (value: number) => string;
  muted?: boolean;
  basePath?: string;
  sparkLabel?: string;
}

function AccountGroup({ title, subtitle, icon, accounts, formatCurrency, muted, basePath = '/accounts', sparkLabel = 'sparks' }: AccountGroupProps) {
  return (
    <div className="bg-white rounded-lg border overflow-hidden">
      {/* Group Header */}
      <div className="px-4 py-3 bg-gray-50 border-b flex items-center gap-2">
        {icon}
        <div>
          <h3 className="text-sm font-medium text-gray-900">{title}</h3>
          <p className="text-xs text-gray-500">{subtitle}</p>
        </div>
      </div>

      {/* Account Cards */}
      <div className="divide-y">
        {accounts.map((account) => (
          <AccountCard
            key={account.account_plan_id}
            account={account}
            formatCurrency={formatCurrency}
            muted={muted}
            basePath={basePath}
            sparkLabel={sparkLabel}
          />
        ))}
      </div>
    </div>
  );
}

interface AccountCardProps {
  account: AccountWithCoverage;
  formatCurrency: (value: number) => string;
  muted?: boolean;
  basePath?: string;
  sparkLabel?: string;
}

function AccountCard({ account, formatCurrency, muted, basePath = '/accounts', sparkLabel = 'sparks' }: AccountCardProps) {
  const stakeholderCount = account.stakeholders?.[0]?.count ?? 0;
  const pursuitCount = account.pursuits?.[0]?.count ?? 0;

  // Calculate overdue action items
  const overdueCount =
    account.action_items?.filter(
      (action) =>
        action.status !== 'Completed' && action.due_date && new Date(action.due_date) < new Date()
    ).length ?? 0;

  // Render spark rating dots (max 4)
  const renderSparkDots = () => {
    const filledDots = Math.ceil(account.sparkRating / 3);
    return (
      <div className="flex gap-0.5">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className={`w-1.5 h-1.5 rounded-full ${
              i <= filledDots ? 'bg-amber-500' : 'bg-gray-200'
            }`}
          />
        ))}
      </div>
    );
  };

  return (
    <Link
      href={`${basePath}/${account.account_plan_id}`}
      className={`block px-4 py-3 hover:bg-gray-50 transition-colors ${muted ? 'opacity-75' : ''}`}
    >
      <div className="flex items-center justify-between">
        {/* Left: Name + Coverage Indicators */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium text-gray-900 truncate">{account.account_name || 'Unnamed Account'}</span>
              {/* Coverage badges */}
              <div className="flex items-center gap-1">
                {account.hasVectorOut && (
                  <span className="flex items-center gap-0.5 px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded text-xs">
                    <Zap className="w-3 h-3" />
                    Out
                  </span>
                )}
                {account.hasVectorIn && (
                  <span className="flex items-center gap-0.5 px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">
                    <Link2 className="w-3 h-3" />
                    In
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3 text-xs text-gray-500 mt-0.5">
              {account.vertical && <span>{account.vertical}</span>}
              {account.account_type && (
                <>
                  <span className="text-gray-300">·</span>
                  <span>{account.account_type}</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Center: Metrics */}
        <div className="flex items-center gap-6 text-sm">
          {/* Spark/Trail Rating */}
          {account.sparksCount > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">{account.sparksCount} {sparkLabel}</span>
              {renderSparkDots()}
            </div>
          )}

          {/* Pipeline */}
          {account.pipelineValue > 0 && (
            <div className="text-right">
              <span className="font-medium text-gray-900">{formatCurrency(account.pipelineValue)}</span>
              <span className="text-xs text-gray-500 ml-1">pipeline</span>
            </div>
          )}

          {/* Counts */}
          <div className="flex items-center gap-3 text-xs text-gray-500">
            <span>{pursuitCount} pursuits</span>
            <span>{stakeholderCount} contacts</span>
          </div>

          {/* Overdue Warning */}
          {overdueCount > 0 && (
            <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded text-xs">
              {overdueCount} overdue
            </span>
          )}
        </div>

        {/* Right: Chevron */}
        <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0 ml-4" />
      </div>
    </Link>
  );
}
