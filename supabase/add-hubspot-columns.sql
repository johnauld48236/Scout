-- Add HubSpot tracking columns to TAM tables

-- Add hubspot columns to tam_contacts
ALTER TABLE tam_contacts ADD COLUMN IF NOT EXISTS hubspot_contact_id VARCHAR(50);
ALTER TABLE tam_contacts ADD COLUMN IF NOT EXISTS source VARCHAR(50) DEFAULT 'manual';

-- Add hubspot columns to tam_accounts
ALTER TABLE tam_accounts ADD COLUMN IF NOT EXISTS hubspot_company_id VARCHAR(50);

-- Ensure tam_contacts has full_name column (some schemas use 'name' instead)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'tam_contacts' AND column_name = 'full_name'
    ) THEN
        ALTER TABLE tam_contacts ADD COLUMN full_name VARCHAR(255);
        -- Copy from name column if it exists
        UPDATE tam_contacts SET full_name = name WHERE full_name IS NULL AND name IS NOT NULL;
    END IF;
END $$;

-- Grant permissions
GRANT ALL ON tam_contacts TO anon, authenticated, service_role;
GRANT ALL ON tam_accounts TO anon, authenticated, service_role;

-- Create index for hubspot lookups
CREATE INDEX IF NOT EXISTS idx_tam_contacts_hubspot ON tam_contacts(hubspot_contact_id);
CREATE INDEX IF NOT EXISTS idx_tam_accounts_hubspot ON tam_accounts(hubspot_company_id);
