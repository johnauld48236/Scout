-- Add sales rep and technical account manager fields to account_plans
-- Run this in Supabase SQL Editor

-- Add owner fields to account_plans
ALTER TABLE account_plans ADD COLUMN IF NOT EXISTS sales_rep VARCHAR(255);
ALTER TABLE account_plans ADD COLUMN IF NOT EXISTS technical_am VARCHAR(255);

-- Create index for filtering by owner
CREATE INDEX IF NOT EXISTS idx_account_plans_sales_rep ON account_plans(sales_rep);
CREATE INDEX IF NOT EXISTS idx_account_plans_technical_am ON account_plans(technical_am);

-- Add owner to pursuits as well (Deal Owner)
ALTER TABLE pursuits ADD COLUMN IF NOT EXISTS deal_owner VARCHAR(255);

-- Create prospect_contacts table for pre-associated contacts (like medical leads)
-- These are contacts that can be pulled into account planning as stakeholders
CREATE TABLE IF NOT EXISTS prospect_contacts (
  contact_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Can be linked to TAM account or account plan
  tam_account_id UUID REFERENCES tam_accounts(tam_account_id) ON DELETE SET NULL,
  account_plan_id UUID REFERENCES account_plans(account_plan_id) ON DELETE SET NULL,
  company_name VARCHAR(255),
  first_name VARCHAR(255),
  last_name VARCHAR(255),
  email VARCHAR(255),
  email_domain VARCHAR(255),
  job_title VARCHAR(255),
  phone VARCHAR(50),
  linkedin_url VARCHAR(500),
  -- Source tracking
  source VARCHAR(100), -- 'medical_leads', 'conference', 'webinar', etc.
  is_hot BOOLEAN DEFAULT false,
  attended_conference BOOLEAN DEFAULT false,
  attended_webinar BOOLEAN DEFAULT false,
  lifecycle_stage VARCHAR(50),
  -- Metadata
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_prospect_contacts_tam ON prospect_contacts(tam_account_id);
CREATE INDEX IF NOT EXISTS idx_prospect_contacts_account ON prospect_contacts(account_plan_id);
CREATE INDEX IF NOT EXISTS idx_prospect_contacts_company ON prospect_contacts(company_name);
CREATE INDEX IF NOT EXISTS idx_prospect_contacts_email_domain ON prospect_contacts(email_domain);
CREATE INDEX IF NOT EXISTS idx_prospect_contacts_is_hot ON prospect_contacts(is_hot);
