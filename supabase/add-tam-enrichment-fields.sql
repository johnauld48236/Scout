-- TAM Account Enrichment Fields
-- Run this migration in Supabase SQL Editor
-- Date: 2026-01-05

-- Operating regions (where they sell/operate)
ALTER TABLE tam_accounts ADD COLUMN IF NOT EXISTS
  operating_regions TEXT[];

-- Products/services overview
ALTER TABLE tam_accounts ADD COLUMN IF NOT EXISTS
  products_overview TEXT;

-- Regulatory exposure (which cybersecurity regulations apply)
ALTER TABLE tam_accounts ADD COLUMN IF NOT EXISTS
  regulatory_exposure TEXT[];

-- Enrichment tracking
ALTER TABLE tam_accounts ADD COLUMN IF NOT EXISTS
  enrichment_status VARCHAR(50) DEFAULT 'pending';

ALTER TABLE tam_accounts ADD COLUMN IF NOT EXISTS
  enriched_at TIMESTAMPTZ;

-- Add comments for documentation
COMMENT ON COLUMN tam_accounts.operating_regions IS 'Array: North America, EU, APAC, Latin America, Middle East, Global';
COMMENT ON COLUMN tam_accounts.products_overview IS 'AI-generated summary of products/services relevant to cybersecurity';
COMMENT ON COLUMN tam_accounts.regulatory_exposure IS 'Array: FDA_524B, CRA, UN_R155, ISO_21434, MDR, NIS2, IEC_62443';
COMMENT ON COLUMN tam_accounts.enrichment_status IS 'pending, enriched, or failed';
COMMENT ON COLUMN tam_accounts.enriched_at IS 'Timestamp when AI enrichment completed';

-- Verify the changes
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'tam_accounts'
AND column_name IN ('operating_regions', 'products_overview', 'regulatory_exposure', 'enrichment_status', 'enriched_at')
ORDER BY column_name;
