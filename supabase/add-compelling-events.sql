-- Add compelling_events to account_plans and account_signals table

-- Add compelling_events JSONB array to account_plans
ALTER TABLE account_plans ADD COLUMN IF NOT EXISTS compelling_events JSONB DEFAULT '[]'::jsonb;

-- Add compelling_events to tam_accounts for the pre-promotion phase
ALTER TABLE tam_accounts ADD COLUMN IF NOT EXISTS compelling_events JSONB DEFAULT '[]'::jsonb;

-- Add buying_signals to account_plans (distinct from general signals)
ALTER TABLE account_plans ADD COLUMN IF NOT EXISTS buying_signals JSONB DEFAULT '[]'::jsonb;
ALTER TABLE tam_accounts ADD COLUMN IF NOT EXISTS buying_signals JSONB DEFAULT '[]'::jsonb;

-- Add thesis field to capture the account thesis from research
ALTER TABLE account_plans ADD COLUMN IF NOT EXISTS account_thesis TEXT;
ALTER TABLE tam_accounts ADD COLUMN IF NOT EXISTS account_thesis TEXT;

-- Add campaign_ids to tam_accounts (for pre-promotion campaign assignment)
ALTER TABLE tam_accounts ADD COLUMN IF NOT EXISTS campaign_ids UUID[] DEFAULT '{}';

-- Add campaign_ids to account_plans (for post-promotion campaign tracking)
ALTER TABLE account_plans ADD COLUMN IF NOT EXISTS campaign_ids UUID[] DEFAULT '{}';

-- Comments for documentation
COMMENT ON COLUMN account_plans.compelling_events IS 'Array of compelling events: [{id, title, description, event_date, source, impact}]';
COMMENT ON COLUMN account_plans.buying_signals IS 'Array of buying signals: [{id, signal_type, description, strength, detected_date, source}]';
COMMENT ON COLUMN account_plans.account_thesis IS 'AI-generated or user-refined thesis for pursuing this account';
COMMENT ON COLUMN tam_accounts.campaign_ids IS 'Campaign IDs assigned during TAM research phase';
