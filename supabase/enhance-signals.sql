-- Enhance account_signals table for entity linking and richer intelligence
-- Run this migration to add new columns

-- Add account_plan_id if not exists (some migrations may have added this)
ALTER TABLE account_signals ADD COLUMN IF NOT EXISTS account_plan_id UUID REFERENCES account_plans(account_plan_id) ON DELETE CASCADE;

-- Add title for display
ALTER TABLE account_signals ADD COLUMN IF NOT EXISTS title VARCHAR(255);

-- Add confidence level
ALTER TABLE account_signals ADD COLUMN IF NOT EXISTS confidence VARCHAR(20) DEFAULT 'medium';

-- Add entity linking columns
ALTER TABLE account_signals ADD COLUMN IF NOT EXISTS stakeholder_id UUID REFERENCES stakeholders(stakeholder_id) ON DELETE SET NULL;
ALTER TABLE account_signals ADD COLUMN IF NOT EXISTS pursuit_id UUID REFERENCES pursuits(pursuit_id) ON DELETE SET NULL;

-- Add category for broader classification (financial, people, competitive, regulatory, product, news)
ALTER TABLE account_signals ADD COLUMN IF NOT EXISTS category VARCHAR(50);

-- Add sentiment score for financial health tracking (-1.0 negative to 1.0 positive)
ALTER TABLE account_signals ADD COLUMN IF NOT EXISTS sentiment_score DECIMAL(3,2);

-- Add is_financial flag for easy filtering of financial health signals
ALTER TABLE account_signals ADD COLUMN IF NOT EXISTS is_financial BOOLEAN DEFAULT FALSE;

-- Create indexes for entity linking
CREATE INDEX IF NOT EXISTS idx_account_signals_account_plan ON account_signals(account_plan_id);
CREATE INDEX IF NOT EXISTS idx_account_signals_stakeholder ON account_signals(stakeholder_id);
CREATE INDEX IF NOT EXISTS idx_account_signals_pursuit ON account_signals(pursuit_id);
CREATE INDEX IF NOT EXISTS idx_account_signals_category ON account_signals(category);
CREATE INDEX IF NOT EXISTS idx_account_signals_financial ON account_signals(is_financial) WHERE is_financial = TRUE;

-- Add comments
COMMENT ON COLUMN account_signals.title IS 'Short title for display in lists';
COMMENT ON COLUMN account_signals.confidence IS 'Confidence level: high, medium, low';
COMMENT ON COLUMN account_signals.stakeholder_id IS 'Optional link to a specific stakeholder this signal relates to';
COMMENT ON COLUMN account_signals.pursuit_id IS 'Optional link to a specific pursuit/deal this signal relates to';
COMMENT ON COLUMN account_signals.category IS 'Broad category: financial, people, competitive, regulatory, product, news, strategic';
COMMENT ON COLUMN account_signals.sentiment_score IS 'Sentiment score from -1.0 (very negative) to 1.0 (very positive) for trend analysis';
COMMENT ON COLUMN account_signals.is_financial IS 'Flag for financial health signals for quick aggregation';

-- Grant permissions
GRANT ALL ON account_signals TO anon, authenticated, service_role;
