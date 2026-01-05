'use client'

interface TAMFiltersProps {
  verticals: string[]
  campaigns: { campaign_id: string; name: string }[]
  currentFilters: {
    vertical?: string
    fit_tier?: string
    campaign?: string
    min_priority?: string
  }
}

export function TAMFilters({ verticals, campaigns, currentFilters }: TAMFiltersProps) {
  const updateFilter = (key: string, value: string) => {
    const url = new URL(window.location.href)
    if (value) {
      url.searchParams.set(key, value)
    } else {
      url.searchParams.delete(key)
    }
    window.location.href = url.toString()
  }

  return (
    <div className="flex flex-wrap gap-4 mb-6 p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg">
      <div>
        <label className="block text-xs text-zinc-500 mb-1">Vertical</label>
        <select
          defaultValue={currentFilters.vertical || ''}
          className="px-3 py-1.5 rounded border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-sm"
          onChange={(e) => updateFilter('vertical', e.target.value)}
        >
          <option value="">All Verticals</option>
          {verticals.map(v => (
            <option key={v} value={v}>{v}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-xs text-zinc-500 mb-1">Fit Tier</label>
        <select
          defaultValue={currentFilters.fit_tier || ''}
          className="px-3 py-1.5 rounded border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-sm"
          onChange={(e) => updateFilter('fit_tier', e.target.value)}
        >
          <option value="">All Tiers</option>
          <option value="A">Tier A</option>
          <option value="B">Tier B</option>
          <option value="C">Tier C</option>
        </select>
      </div>

      <div>
        <label className="block text-xs text-zinc-500 mb-1">Campaign</label>
        <select
          defaultValue={currentFilters.campaign || ''}
          className="px-3 py-1.5 rounded border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-sm"
          onChange={(e) => updateFilter('campaign', e.target.value)}
        >
          <option value="">All Campaigns</option>
          {campaigns.map(c => (
            <option key={c.campaign_id} value={c.campaign_id}>{c.name}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-xs text-zinc-500 mb-1">Min Priority</label>
        <select
          defaultValue={currentFilters.min_priority || ''}
          className="px-3 py-1.5 rounded border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-sm"
          onChange={(e) => updateFilter('min_priority', e.target.value)}
        >
          <option value="">Any</option>
          <option value="80">80+ (High)</option>
          <option value="70">70+ (Ready)</option>
          <option value="60">60+ (Medium)</option>
        </select>
      </div>
    </div>
  )
}
