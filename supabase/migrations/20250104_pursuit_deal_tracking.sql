-- Migration: Add deal_type and crm_source to pursuits table
-- Date: 2025-01-04
-- Purpose: Enable gap analysis by deal category and CRM source tracking

-- Add deal_type field (new_business, upsell, renewal)
ALTER TABLE pursuits
ADD COLUMN IF NOT EXISTS deal_type VARCHAR(50);

-- Add CRM source tracking
ALTER TABLE pursuits
ADD COLUMN IF NOT EXISTS crm_source VARCHAR(100);

-- Add index for deal_type (used in gap analysis queries)
CREATE INDEX IF NOT EXISTS idx_pursuits_deal_type ON pursuits(deal_type);

-- Comment the columns for documentation
COMMENT ON COLUMN pursuits.deal_type IS 'Type of deal: new_business, upsell, or renewal';
COMMENT ON COLUMN pursuits.crm_source IS 'Source CRM/system: spreadsheet, salesforce, hubspot, manual, etc.';
