-- Add deal-specific fields to pursuits table
-- These were previously being stored in the notes field during import

-- Deal owner (person responsible for the deal)
ALTER TABLE pursuits
ADD COLUMN IF NOT EXISTS deal_owner VARCHAR(255);

-- Deal type (e.g., New Business, Expansion, Renewal)
ALTER TABLE pursuits
ADD COLUMN IF NOT EXISTS deal_type VARCHAR(100);

-- Target quarter (original value from spreadsheet like "Q1 2026")
ALTER TABLE pursuits
ADD COLUMN IF NOT EXISTS target_quarter VARCHAR(20);

-- Comments for clarity
COMMENT ON COLUMN pursuits.deal_owner IS 'Name of the deal owner/rep responsible';
COMMENT ON COLUMN pursuits.deal_type IS 'Type of deal: New Business, Expansion, Renewal, etc.';
COMMENT ON COLUMN pursuits.target_quarter IS 'Original quarter value from import (e.g., Q1 2026)';
COMMENT ON COLUMN pursuits.pursuit_type IS 'Categorization: new_business, renewal, expansion, recurring';
