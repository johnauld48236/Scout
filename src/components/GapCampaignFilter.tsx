'use client'

interface Campaign {
  campaign_id: string
  name: string
}

interface GapCampaignFilterProps {
  campaigns: Campaign[]
  currentCampaign: string
}

export function GapCampaignFilter({ campaigns, currentCampaign }: GapCampaignFilterProps) {
  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const url = new URL(window.location.href)
    if (e.target.value) {
      url.searchParams.set('campaign', e.target.value)
    } else {
      url.searchParams.delete('campaign')
    }
    window.location.href = url.toString()
  }

  return (
    <div className="flex items-center gap-2">
      <label className="text-sm text-zinc-500">Campaign:</label>
      <select
        defaultValue={currentCampaign}
        onChange={handleChange}
        className="px-3 py-1.5 rounded border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-sm"
      >
        <option value="">All Campaigns</option>
        {campaigns.map(c => (
          <option key={c.campaign_id} value={c.campaign_id}>{c.name}</option>
        ))}
      </select>
    </div>
  )
}
