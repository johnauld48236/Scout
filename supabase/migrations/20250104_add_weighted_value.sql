-- Migration: Add weighted_value to pursuits table
-- Date: 2025-01-04
-- Purpose: Store pre-calculated weighted values from CRM/spreadsheet (Column P)

-- Add weighted_value field (from spreadsheet Column P "Weighted Amount Conservative")
ALTER TABLE pursuits
ADD COLUMN IF NOT EXISTS weighted_value DECIMAL(15,2);

-- Add target_quarter for tracking expected close quarter
ALTER TABLE pursuits
ADD COLUMN IF NOT EXISTS target_quarter VARCHAR(20);

-- Add pursuit_type if it doesn't exist (may have been added as deal_type)
ALTER TABLE pursuits
ADD COLUMN IF NOT EXISTS pursuit_type VARCHAR(50);

-- Comment the columns for documentation
COMMENT ON COLUMN pursuits.weighted_value IS 'Pre-calculated weighted value from CRM (Column P in spreadsheet)';
COMMENT ON COLUMN pursuits.target_quarter IS 'Target close quarter (e.g., Q1''26, Q2''26)';
COMMENT ON COLUMN pursuits.pursuit_type IS 'Type of pursuit: new_business, upsell, or renewal';
