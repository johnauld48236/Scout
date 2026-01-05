-- Add campaign_context field to store rich markdown context for AI intelligence
-- This stores the full campaign intelligence brief as markdown

-- Add campaign_context to campaigns table
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS campaign_context TEXT;

-- Add context_updated_at to track when context was last updated
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS context_updated_at TIMESTAMPTZ;

-- Comments for documentation
COMMENT ON COLUMN campaigns.campaign_context IS 'Rich markdown content containing campaign intelligence context: pain points, signal triggers, research frameworks, search queries, messaging templates';
COMMENT ON COLUMN campaigns.context_updated_at IS 'Timestamp when campaign context was last updated';

-- Also ensure company_profile has a field for the full sales intelligence context
ALTER TABLE company_profile ADD COLUMN IF NOT EXISTS sales_intelligence_context TEXT;
ALTER TABLE company_profile ADD COLUMN IF NOT EXISTS context_updated_at TIMESTAMPTZ;

COMMENT ON COLUMN company_profile.sales_intelligence_context IS 'Rich markdown content containing company sales intelligence: products, value props, competitive landscape, whitespace opportunities';
