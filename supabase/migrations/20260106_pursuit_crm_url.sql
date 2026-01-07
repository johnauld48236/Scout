-- Migration: Add CRM URL to pursuits for direct linking
-- Date: 2026-01-06
-- Purpose: Allow linking directly to HubSpot or other CRM deals from Scout

-- Add CRM URL field for direct link to deal in CRM
ALTER TABLE pursuits
ADD COLUMN IF NOT EXISTS crm_url VARCHAR(500);

-- Add HubSpot deal ID for integration
ALTER TABLE pursuits
ADD COLUMN IF NOT EXISTS hubspot_deal_id VARCHAR(50);

-- Comments for documentation
COMMENT ON COLUMN pursuits.crm_url IS 'Direct URL to the deal in CRM (HubSpot, Salesforce, etc.)';
COMMENT ON COLUMN pursuits.hubspot_deal_id IS 'HubSpot deal ID for API integration';

-- Create index for HubSpot lookups
CREATE INDEX IF NOT EXISTS idx_pursuits_hubspot_deal ON pursuits(hubspot_deal_id);
