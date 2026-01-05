-- Migration script to add missing columns to existing TAM tables
-- Run this BEFORE the seed-tam-data.sql script

-- ============================================
-- TAM_ACCOUNTS - Add missing columns
-- ============================================
ALTER TABLE tam_accounts ADD COLUMN IF NOT EXISTS fit_tier VARCHAR(1);
ALTER TABLE tam_accounts ADD COLUMN IF NOT EXISTS priority_score INTEGER DEFAULT 50;
ALTER TABLE tam_accounts ADD COLUMN IF NOT EXISTS estimated_deal_value NUMERIC(15,2);
ALTER TABLE tam_accounts ADD COLUMN IF NOT EXISTS promoted_to_account_plan_id UUID;
ALTER TABLE tam_accounts ADD COLUMN IF NOT EXISTS promoted_at TIMESTAMP WITH TIME ZONE;

-- ============================================
-- ACCOUNT_SIGNALS - Add missing columns
-- ============================================
ALTER TABLE account_signals ADD COLUMN IF NOT EXISTS tam_account_id UUID;
ALTER TABLE account_signals ADD COLUMN IF NOT EXISTS signal_type VARCHAR(50);
ALTER TABLE account_signals ADD COLUMN IF NOT EXISTS signal_date DATE;
ALTER TABLE account_signals ADD COLUMN IF NOT EXISTS summary TEXT;
ALTER TABLE account_signals ADD COLUMN IF NOT EXISTS source VARCHAR(100);
ALTER TABLE account_signals ADD COLUMN IF NOT EXISTS signal_strength VARCHAR(20);
ALTER TABLE account_signals ADD COLUMN IF NOT EXISTS campaign_id UUID;

-- ============================================
-- TAM_CONTACTS - Ensure table exists with all columns
-- ============================================
CREATE TABLE IF NOT EXISTS tam_contacts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tam_account_id UUID,
    name VARCHAR(255),
    title VARCHAR(255),
    email VARCHAR(255),
    phone VARCHAR(50),
    linkedin_url TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add any missing columns to existing table
ALTER TABLE tam_contacts ADD COLUMN IF NOT EXISTS tam_account_id UUID;
ALTER TABLE tam_contacts ADD COLUMN IF NOT EXISTS name VARCHAR(255);
ALTER TABLE tam_contacts ADD COLUMN IF NOT EXISTS title VARCHAR(255);
ALTER TABLE tam_contacts ADD COLUMN IF NOT EXISTS email VARCHAR(255);
ALTER TABLE tam_contacts ADD COLUMN IF NOT EXISTS phone VARCHAR(50);
ALTER TABLE tam_contacts ADD COLUMN IF NOT EXISTS linkedin_url TEXT;
ALTER TABLE tam_contacts ADD COLUMN IF NOT EXISTS notes TEXT;

-- ============================================
-- TAM_WARM_PATHS - Ensure table exists with all columns
-- ============================================
CREATE TABLE IF NOT EXISTS tam_warm_paths (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tam_account_id UUID,
    internal_contact_name VARCHAR(255),
    internal_contact_email VARCHAR(255),
    relationship_type VARCHAR(100),
    target_contact_name VARCHAR(255),
    target_contact_title VARCHAR(255),
    notes TEXT,
    strength VARCHAR(20),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add any missing columns
ALTER TABLE tam_warm_paths ADD COLUMN IF NOT EXISTS tam_account_id UUID;
ALTER TABLE tam_warm_paths ADD COLUMN IF NOT EXISTS internal_contact_name VARCHAR(255);
ALTER TABLE tam_warm_paths ADD COLUMN IF NOT EXISTS internal_contact_email VARCHAR(255);
ALTER TABLE tam_warm_paths ADD COLUMN IF NOT EXISTS relationship_type VARCHAR(100);
ALTER TABLE tam_warm_paths ADD COLUMN IF NOT EXISTS target_contact_name VARCHAR(255);
ALTER TABLE tam_warm_paths ADD COLUMN IF NOT EXISTS target_contact_title VARCHAR(255);
ALTER TABLE tam_warm_paths ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE tam_warm_paths ADD COLUMN IF NOT EXISTS strength VARCHAR(20);

-- ============================================
-- CAMPAIGN_TAM_ACCOUNTS - Ensure table exists
-- ============================================
CREATE TABLE IF NOT EXISTS campaign_tam_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campaign_id UUID,
    tam_account_id UUID,
    fit_score INTEGER,
    status VARCHAR(50) DEFAULT 'active',
    added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(campaign_id, tam_account_id)
);

-- Add any missing columns
ALTER TABLE campaign_tam_accounts ADD COLUMN IF NOT EXISTS campaign_id UUID;
ALTER TABLE campaign_tam_accounts ADD COLUMN IF NOT EXISTS tam_account_id UUID;
ALTER TABLE campaign_tam_accounts ADD COLUMN IF NOT EXISTS fit_score INTEGER;
ALTER TABLE campaign_tam_accounts ADD COLUMN IF NOT EXISTS status VARCHAR(50);

-- ============================================
-- CAMPAIGNS - Add missing columns
-- ============================================
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active';
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS campaign_type VARCHAR(20);
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS vertical VARCHAR(100);
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS start_date DATE;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS end_date DATE;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS target_deal_value NUMERIC(15,2);
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS target_account_count INTEGER;

-- ============================================
-- GRANT PERMISSIONS (for development)
-- ============================================
GRANT ALL ON tam_accounts TO anon, authenticated, service_role;
GRANT ALL ON account_signals TO anon, authenticated, service_role;
GRANT ALL ON tam_contacts TO anon, authenticated, service_role;
GRANT ALL ON tam_warm_paths TO anon, authenticated, service_role;
GRANT ALL ON campaign_tam_accounts TO anon, authenticated, service_role;
GRANT ALL ON campaigns TO anon, authenticated, service_role;

-- ============================================
-- CREATE INDEXES (will skip if exists)
-- ============================================
CREATE INDEX IF NOT EXISTS idx_tam_accounts_status ON tam_accounts(status);
CREATE INDEX IF NOT EXISTS idx_tam_accounts_fit_tier ON tam_accounts(fit_tier);
CREATE INDEX IF NOT EXISTS idx_tam_accounts_priority ON tam_accounts(priority_score DESC);
CREATE INDEX IF NOT EXISTS idx_account_signals_tam ON account_signals(tam_account_id);
CREATE INDEX IF NOT EXISTS idx_account_signals_date ON account_signals(signal_date DESC);
CREATE INDEX IF NOT EXISTS idx_tam_contacts_account ON tam_contacts(tam_account_id);
CREATE INDEX IF NOT EXISTS idx_tam_warm_paths_account ON tam_warm_paths(tam_account_id);
CREATE INDEX IF NOT EXISTS idx_campaign_tam_accounts_campaign ON campaign_tam_accounts(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_tam_accounts_tam ON campaign_tam_accounts(tam_account_id);

SELECT 'Migration complete - all missing columns added' AS result;
