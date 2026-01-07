-- Add notes field to tam_accounts for sales rep notes
ALTER TABLE tam_accounts ADD COLUMN IF NOT EXISTS notes TEXT;

-- Add comment
COMMENT ON COLUMN tam_accounts.notes IS 'Sales rep notes that persist to account plan';
