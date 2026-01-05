-- ============================================
-- CAMPAIGNS + TAM INTELLIGENCE MODULE
-- Complete Schema with All Required Tables
-- ============================================
-- Run this in Supabase SQL Editor
-- ============================================

-- ============================================
-- PART 0: BASE TABLES (MISSING FROM ORIGINAL)
-- These must be created BEFORE the rest of the script
-- ============================================

-- 1. TAM Accounts - The core prospecting table
CREATE TABLE IF NOT EXISTS tam_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Company Info
    company_name VARCHAR(255) NOT NULL,
    website VARCHAR(255),
    vertical VARCHAR(100),

    -- Fit Assessment
    fit_tier VARCHAR(1) CHECK (fit_tier IN ('A', 'B', 'C')),
    estimated_deal_value DECIMAL(15,2),
    company_summary TEXT,
    fit_rationale TEXT,

    -- Import Tracking
    import_source VARCHAR(50),
    import_batch_id UUID,
    salesforce_id VARCHAR(18),

    -- Enrichment
    last_enriched_at TIMESTAMP WITH TIME ZONE,

    -- Priority Scoring
    priority_score INTEGER DEFAULT 0,
    priority_score_breakdown JSONB,

    -- Status & Promotion
    status VARCHAR(20) DEFAULT 'active'
        CHECK (status IN ('active', 'promoted', 'disqualified', 'dormant')),
    promoted_to_account_plan_id UUID,
    promoted_at TIMESTAMP WITH TIME ZONE,

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for tam_accounts
CREATE INDEX IF NOT EXISTS idx_tam_accounts_vertical ON tam_accounts(vertical);
CREATE INDEX IF NOT EXISTS idx_tam_accounts_fit_tier ON tam_accounts(fit_tier);
CREATE INDEX IF NOT EXISTS idx_tam_accounts_priority ON tam_accounts(priority_score DESC);
CREATE INDEX IF NOT EXISTS idx_tam_accounts_status ON tam_accounts(status);

-- 2. Account Signals - News, triggers, events for TAM accounts
CREATE TABLE IF NOT EXISTS account_signals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Links
    tam_account_id UUID REFERENCES tam_accounts(id) ON DELETE CASCADE,
    account_plan_id UUID,  -- Will add FK after account_plans is confirmed
    campaign_id UUID,      -- Will add FK after campaigns is created

    -- Signal Info
    signal_type VARCHAR(50) NOT NULL
        CHECK (signal_type IN ('regulatory', 'leadership', 'product', 'incident', 'strategic', 'funding', 'expansion', 'news')),
    signal_date DATE NOT NULL,
    summary TEXT NOT NULL,
    source VARCHAR(255),
    source_url TEXT,

    -- Scoring Impact
    signal_strength VARCHAR(20) DEFAULT 'medium'
        CHECK (signal_strength IN ('high', 'medium', 'low')),

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID
);

-- Indexes for account_signals
CREATE INDEX IF NOT EXISTS idx_account_signals_tam ON account_signals(tam_account_id);
CREATE INDEX IF NOT EXISTS idx_account_signals_date ON account_signals(signal_date DESC);
CREATE INDEX IF NOT EXISTS idx_account_signals_type ON account_signals(signal_type);

-- 3. TAM Warm Paths - Internal connections to TAM accounts
CREATE TABLE IF NOT EXISTS tam_warm_paths (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Links
    tam_account_id UUID NOT NULL REFERENCES tam_accounts(id) ON DELETE CASCADE,

    -- Connection Info
    internal_contact VARCHAR(255) NOT NULL,
    relationship_type VARCHAR(100),
    connection_strength VARCHAR(20) DEFAULT 'medium'
        CHECK (connection_strength IN ('strong', 'medium', 'weak')),
    target_contact VARCHAR(255),
    target_title VARCHAR(255),
    notes TEXT,

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for tam_warm_paths
CREATE INDEX IF NOT EXISTS idx_tam_warm_paths_tam ON tam_warm_paths(tam_account_id);

-- 4. TAM Contacts - People at TAM accounts
CREATE TABLE IF NOT EXISTS tam_contacts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Links
    tam_account_id UUID NOT NULL REFERENCES tam_accounts(id) ON DELETE CASCADE,

    -- Contact Info
    name VARCHAR(255) NOT NULL,
    title VARCHAR(255),
    department VARCHAR(100),
    email VARCHAR(255),
    phone VARCHAR(50),
    linkedin_url VARCHAR(500),

    -- Engagement
    last_contact_date DATE,
    notes TEXT,

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for tam_contacts
CREATE INDEX IF NOT EXISTS idx_tam_contacts_tam ON tam_contacts(tam_account_id);

-- ============================================
-- PART 1: CAMPAIGNS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS campaigns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Core Identity
    name VARCHAR(255) NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('vertical', 'thematic')),
    status VARCHAR(20) NOT NULL DEFAULT 'planned'
        CHECK (status IN ('planned', 'active', 'paused', 'completed')),

    -- Targeting
    target_verticals TEXT[],
    target_geos TEXT[],
    target_company_profile TEXT,

    -- Context
    regulatory_context TEXT,
    industry_dynamics TEXT,
    value_proposition TEXT,
    key_pain_points TEXT,
    signal_triggers TEXT,

    -- Timing
    start_date DATE,
    end_date DATE,

    -- Goals (for thematic)
    pipeline_goal DECIMAL(15,2),
    conversion_goal DECIMAL(5,4),

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID
);

-- Indexes for campaigns
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON campaigns(status);
CREATE INDEX IF NOT EXISTS idx_campaigns_type ON campaigns(type);

-- ============================================
-- PART 2: JUNCTION AND RELATIONSHIP TABLES
-- ============================================

-- Campaign <-> TAM Account fit scoring
CREATE TABLE IF NOT EXISTS campaign_tam_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    tam_account_id UUID NOT NULL REFERENCES tam_accounts(id) ON DELETE CASCADE,

    fit_score INTEGER CHECK (fit_score >= 0 AND fit_score <= 100),
    fit_rationale TEXT,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(campaign_id, tam_account_id)
);

-- Indexes for campaign_tam_accounts
CREATE INDEX IF NOT EXISTS idx_campaign_tam_accounts_campaign ON campaign_tam_accounts(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_tam_accounts_tam ON campaign_tam_accounts(tam_account_id);
CREATE INDEX IF NOT EXISTS idx_campaign_tam_accounts_score ON campaign_tam_accounts(fit_score DESC);

-- ============================================
-- PART 3: ALTER EXISTING TABLES
-- ============================================

-- Add campaign reference to account_plans
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'account_plans' AND column_name = 'campaign_id') THEN
        ALTER TABLE account_plans ADD COLUMN campaign_id UUID REFERENCES campaigns(id);
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_account_plans_campaign ON account_plans(campaign_id);

-- Add TAM origin reference to account_plans
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'account_plans' AND column_name = 'tam_account_id') THEN
        ALTER TABLE account_plans ADD COLUMN tam_account_id UUID REFERENCES tam_accounts(id);
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_account_plans_tam ON account_plans(tam_account_id);

-- Add campaign FK to account_signals (now that campaigns exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_name = 'account_signals' AND column_name = 'campaign_id') THEN
        -- Add constraint if column exists but constraint doesn't
        IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints
                       WHERE constraint_name = 'account_signals_campaign_id_fkey') THEN
            ALTER TABLE account_signals
                ADD CONSTRAINT account_signals_campaign_id_fkey
                FOREIGN KEY (campaign_id) REFERENCES campaigns(id);
        END IF;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_account_signals_campaign ON account_signals(campaign_id);

-- Add promoted_to FK on tam_accounts (now that we can reference account_plans)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints
                   WHERE constraint_name = 'tam_accounts_promoted_to_fkey') THEN
        ALTER TABLE tam_accounts
            ADD CONSTRAINT tam_accounts_promoted_to_fkey
            FOREIGN KEY (promoted_to_account_plan_id) REFERENCES account_plans(account_plan_id);
    END IF;
EXCEPTION WHEN others THEN
    -- Constraint may already exist or column types may not match, skip
    NULL;
END $$;

-- ============================================
-- PART 4: GAP DEFINITIONS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS gap_definitions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,

    -- Segment criteria
    vertical VARCHAR(100),
    value_min DECIMAL(15,2),
    value_max DECIMAL(15,2),
    campaign_id UUID REFERENCES campaigns(id),

    -- Thresholds
    min_pursuits_for_coverage INTEGER DEFAULT 2,
    min_tam_for_opportunity INTEGER DEFAULT 5,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE
);

-- ============================================
-- PART 5: SAMPLE CAMPAIGNS
-- ============================================

-- Vertical Campaigns (Evergreen)
INSERT INTO campaigns (name, type, status, target_verticals, target_geos, value_proposition, key_pain_points, signal_triggers) VALUES
('Medical Device', 'vertical', 'active',
 ARRAY['Medical'], ARRAY['US', 'EU', 'Global'],
 'End-to-end product security for connected medical devices. FDA compliance, SBOM management, vulnerability tracking.',
 'FDA 510k cybersecurity requirements, post-market surveillance, SBOM generation and maintenance, legacy device security',
 'FDA guidance updates, cybersecurity incidents in medical, new product launches, M&A activity'),

('Automotive OEM', 'vertical', 'active',
 ARRAY['Automotive'], ARRAY['US', 'EU', 'APAC', 'Global'],
 'ISO 21434 compliance and vehicle cybersecurity lifecycle management.',
 'ISO 21434 compliance gaps, TARA complexity, supplier security management, type approval requirements',
 'New vehicle programs, supplier incidents, regulation updates, competitive wins'),

('Industrial', 'vertical', 'active',
 ARRAY['Industrial'], ARRAY['US', 'EU', 'Global'],
 'OT/IT convergence security for industrial control systems and smart manufacturing.',
 'Legacy system vulnerabilities, IT/OT convergence risks, supply chain security, IEC 62443 compliance',
 'Digital transformation initiatives, security incidents, regulation changes')
ON CONFLICT DO NOTHING;

-- Thematic Campaigns (Time-bound)
INSERT INTO campaigns (name, type, status, target_verticals, target_geos, regulatory_context, value_proposition, key_pain_points, signal_triggers, start_date, end_date, pipeline_goal) VALUES
('CRA Compliance 2026', 'thematic', 'active',
 ARRAY['Medical', 'Automotive', 'Industrial'], ARRAY['EU', 'Global'],
 'EU Cyber Resilience Act (CRA) requires all products with digital elements sold in EU to meet cybersecurity requirements by 2026. Applies to manufacturers regardless of where they are headquartered.',
 'Comprehensive CRA readiness assessment and ongoing compliance management. SBOM, vulnerability handling, incident reporting.',
 'Understanding CRA scope and applicability, SBOM requirements, vulnerability disclosure timelines, documentation requirements',
 'CRA implementation guidance updates, EU enforcement news, competitor CRA offerings, customer EU expansion',
 '2024-10-01', '2026-12-31', 2000000),

('FDA SBOM Mandate', 'thematic', 'active',
 ARRAY['Medical'], ARRAY['US', 'Global'],
 'FDA now requires SBOM submission for premarket cybersecurity documentation. Refuse to file letters increasing for inadequate cybersecurity.',
 'Automated SBOM generation, vulnerability tracking, FDA submission-ready documentation.',
 'SBOM generation complexity, keeping SBOMs current, vulnerability correlation, FDA submission formatting',
 'FDA refuse to file letters, guidance updates, 510k submission timelines, competitor medical device incidents',
 '2024-06-01', '2025-12-31', 1500000)
ON CONFLICT DO NOTHING;

-- ============================================
-- PART 6: SAMPLE TAM ACCOUNTS
-- ============================================

-- Medical Device TAM Accounts
INSERT INTO tam_accounts (company_name, website, vertical, fit_tier, estimated_deal_value, company_summary, fit_rationale, import_source, status, priority_score) VALUES
('Medtronic', 'medtronic.com', 'Medical', 'A', 750000,
 'Global leader in medical technology. 95,000+ employees, $30B+ revenue. Broad portfolio of connected medical devices.',
 'Tier 1 medical device manufacturer with massive connected device portfolio. Known cybersecurity focus. FDA pressure on SBOM.',
 'csv', 'active', 85),

('Boston Scientific', 'bostonscientific.com', 'Medical', 'A', 500000,
 'Global medical device company. Cardiovascular, rhythm management, neuromodulation. 45,000 employees.',
 'Large connected device portfolio. Active in EU market (CRA relevant). Previous security incidents create urgency.',
 'csv', 'active', 80),

('Stryker', 'stryker.com', 'Medical', 'A', 600000,
 'Medical technology company. Orthopedics, surgical, neurotechnology. $18B revenue.',
 'Growing connected surgery portfolio. Digital surgery initiatives. Strong EU presence.',
 'csv', 'active', 78),

('Philips Healthcare', 'philips.com', 'Medical', 'A', 800000,
 'Health technology company. Diagnostic imaging, patient monitoring, connected care. Major digital health push.',
 'Massive connected device install base. Previous security vulnerabilities publicized. Strong compliance culture.',
 'csv', 'active', 88),

('Baxter International', 'baxter.com', 'Medical', 'B', 350000,
 'Healthcare company. Renal care, medication delivery, surgical care. $15B revenue.',
 'Connected infusion pumps and renal devices. Growing digital portfolio. FDA focus area.',
 'csv', 'active', 65),

('Becton Dickinson', 'bd.com', 'Medical', 'B', 400000,
 'Medical technology company. Medication management, infection prevention, diagnostics.',
 'Connected medication management systems. Alaris pump security history. Active security program.',
 'csv', 'active', 70),

('Zimmer Biomet', 'zimmerbiomet.com', 'Medical', 'B', 300000,
 'Musculoskeletal healthcare company. Joint reconstruction, spine, trauma.',
 'Growing connected surgery portfolio. Digital surgery roadmap. Compliance focused.',
 'csv', 'active', 60),

-- Automotive TAM Accounts
('Continental AG', 'continental.com', 'Automotive', 'A', 600000,
 'German automotive supplier. ADAS, connectivity, tires, powertrain. €40B+ revenue.',
 'Major Tier 1 with broad ECU portfolio. ISO 21434 pressure. EU headquartered (CRA).',
 'csv', 'active', 82),

('Bosch', 'bosch.com', 'Automotive', 'A', 800000,
 'Global technology company. Mobility solutions, industrial, consumer. €88B revenue.',
 'Largest automotive supplier. Massive ECU portfolio. Setting industry standards.',
 'csv', 'active', 90),

('ZF Friedrichshafen', 'zf.com', 'Automotive', 'A', 500000,
 'German automotive supplier. Driveline, chassis, active/passive safety. €43B revenue.',
 'Major Tier 1 with safety-critical systems. ISO 21434 compliance needs. EU based.',
 'csv', 'active', 75),

('Magna International', 'magna.com', 'Automotive', 'B', 400000,
 'Canadian automotive supplier. Body, chassis, powertrain, electronics. $38B revenue.',
 'Diverse automotive portfolio. Growing electronics business. North American HQ.',
 'csv', 'active', 62),

-- Industrial TAM Accounts
('Siemens', 'siemens.com', 'Industrial', 'A', 700000,
 'German industrial conglomerate. Digital industries, smart infrastructure. €72B revenue.',
 'Massive OT portfolio. Digital twin leadership. EU CRA exposure. Setting IEC 62443 standards.',
 'csv', 'active', 85),

('Rockwell Automation', 'rockwellautomation.com', 'Industrial', 'A', 500000,
 'American industrial automation. PLCs, drives, software. $8B revenue.',
 'Leading industrial automation. Connected enterprise strategy. IT/OT convergence focus.',
 'csv', 'active', 72),

('Schneider Electric', 'se.com', 'Industrial', 'A', 600000,
 'French industrial company. Energy management, industrial automation. €34B revenue.',
 'Broad OT portfolio. EcoStruxure platform. EU headquartered (CRA). IEC 62443 leader.',
 'csv', 'active', 80),

('ABB', 'abb.com', 'Industrial', 'B', 450000,
 'Swiss-Swedish industrial company. Electrification, robotics, automation. $29B revenue.',
 'Diverse industrial portfolio. ABB Ability platform. Strong EU presence.',
 'csv', 'active', 68)
ON CONFLICT DO NOTHING;

-- ============================================
-- PART 7: CAMPAIGN-TAM FIT SCORING
-- ============================================

-- Medical Device campaign fits
INSERT INTO campaign_tam_accounts (campaign_id, tam_account_id, fit_score, fit_rationale)
SELECT
    c.id,
    t.id,
    CASE
        WHEN t.fit_tier = 'A' THEN 90
        WHEN t.fit_tier = 'B' THEN 75
        ELSE 60
    END,
    'Strong vertical fit - ' || t.fit_tier || ' tier medical device manufacturer'
FROM campaigns c, tam_accounts t
WHERE c.name = 'Medical Device' AND t.vertical = 'Medical'
ON CONFLICT (campaign_id, tam_account_id) DO NOTHING;

-- Automotive OEM campaign fits
INSERT INTO campaign_tam_accounts (campaign_id, tam_account_id, fit_score, fit_rationale)
SELECT
    c.id,
    t.id,
    CASE
        WHEN t.fit_tier = 'A' THEN 90
        WHEN t.fit_tier = 'B' THEN 75
        ELSE 60
    END,
    'Strong vertical fit - ' || t.fit_tier || ' tier automotive supplier'
FROM campaigns c, tam_accounts t
WHERE c.name = 'Automotive OEM' AND t.vertical = 'Automotive'
ON CONFLICT (campaign_id, tam_account_id) DO NOTHING;

-- Industrial campaign fits
INSERT INTO campaign_tam_accounts (campaign_id, tam_account_id, fit_score, fit_rationale)
SELECT
    c.id,
    t.id,
    CASE
        WHEN t.fit_tier = 'A' THEN 90
        WHEN t.fit_tier = 'B' THEN 75
        ELSE 60
    END,
    'Strong vertical fit - ' || t.fit_tier || ' tier industrial company'
FROM campaigns c, tam_accounts t
WHERE c.name = 'Industrial' AND t.vertical = 'Industrial'
ON CONFLICT (campaign_id, tam_account_id) DO NOTHING;

-- CRA campaign fits (EU exposure across all verticals)
INSERT INTO campaign_tam_accounts (campaign_id, tam_account_id, fit_score, fit_rationale)
SELECT
    c.id,
    t.id,
    CASE
        WHEN t.company_name IN ('Philips Healthcare', 'Continental AG', 'Bosch', 'ZF Friedrichshafen', 'Siemens', 'Schneider Electric') THEN 85
        ELSE 70
    END,
    'CRA relevant - EU market presence or headquarters'
FROM campaigns c, tam_accounts t
WHERE c.name = 'CRA Compliance 2026'
AND t.vertical IN ('Medical', 'Automotive', 'Industrial')
ON CONFLICT (campaign_id, tam_account_id) DO NOTHING;

-- FDA SBOM campaign fits (Medical only)
INSERT INTO campaign_tam_accounts (campaign_id, tam_account_id, fit_score, fit_rationale)
SELECT
    c.id,
    t.id,
    CASE
        WHEN t.company_name IN ('Medtronic', 'Philips Healthcare', 'Becton Dickinson') THEN 90
        ELSE 75
    END,
    'FDA SBOM relevant - connected medical devices requiring 510k submission'
FROM campaigns c, tam_accounts t
WHERE c.name = 'FDA SBOM Mandate' AND t.vertical = 'Medical'
ON CONFLICT (campaign_id, tam_account_id) DO NOTHING;

-- ============================================
-- PART 8: SAMPLE SIGNALS
-- ============================================

-- Medtronic - FDA signal
INSERT INTO account_signals (tam_account_id, signal_type, signal_date, summary, source, campaign_id)
SELECT
    t.id,
    'regulatory',
    '2024-12-15',
    'FDA issued refuse to file letter citing inadequate cybersecurity documentation for new insulin pump submission.',
    'FDA Database',
    (SELECT id FROM campaigns WHERE name = 'FDA SBOM Mandate')
FROM tam_accounts t WHERE t.company_name = 'Medtronic';

-- Boston Scientific - Leadership change
INSERT INTO account_signals (tam_account_id, signal_type, signal_date, summary, source)
SELECT
    t.id,
    'leadership',
    '2024-12-20',
    'New CISO appointed - previously led product security at Johnson & Johnson.',
    'LinkedIn'
FROM tam_accounts t WHERE t.company_name = 'Boston Scientific';

-- Continental - CRA signal
INSERT INTO account_signals (tam_account_id, signal_type, signal_date, summary, source, campaign_id)
SELECT
    t.id,
    'regulatory',
    '2024-12-28',
    'Published CRA readiness assessment findings - identified gaps in SBOM processes and vulnerability handling.',
    'Company Blog',
    (SELECT id FROM campaigns WHERE name = 'CRA Compliance 2026')
FROM tam_accounts t WHERE t.company_name = 'Continental AG';

-- Stryker - Product launch
INSERT INTO account_signals (tam_account_id, signal_type, signal_date, summary, source)
SELECT
    t.id,
    'product',
    '2024-12-10',
    'Announced new connected surgery platform with AI-assisted guidance - 50+ connected components.',
    'Press Release'
FROM tam_accounts t WHERE t.company_name = 'Stryker';

-- Rockwell - Security incident
INSERT INTO account_signals (tam_account_id, signal_type, signal_date, summary, source)
SELECT
    t.id,
    'incident',
    '2024-11-30',
    'Security researcher disclosed vulnerabilities in legacy PLC firmware. Company issued advisory.',
    'ICS-CERT'
FROM tam_accounts t WHERE t.company_name = 'Rockwell Automation';

-- Philips - Regulatory
INSERT INTO account_signals (tam_account_id, signal_type, signal_date, summary, source, campaign_id)
SELECT
    t.id,
    'regulatory',
    '2024-12-22',
    'EU notified body requested additional cybersecurity documentation for MDR renewal on monitoring systems.',
    'Industry Source',
    (SELECT id FROM campaigns WHERE name = 'CRA Compliance 2026')
FROM tam_accounts t WHERE t.company_name = 'Philips Healthcare';

-- Bosch - Strategic
INSERT INTO account_signals (tam_account_id, signal_type, signal_date, summary, source)
SELECT
    t.id,
    'strategic',
    '2024-12-18',
    'Announced major investment in software-defined vehicle platform. Hiring 500+ cybersecurity engineers.',
    'Press Release'
FROM tam_accounts t WHERE t.company_name = 'Bosch';

-- Siemens - Product
INSERT INTO account_signals (tam_account_id, signal_type, signal_date, summary, source)
SELECT
    t.id,
    'product',
    '2024-12-05',
    'Launched new OT security monitoring service. Indicates increased focus on product security.',
    'Company Announcement'
FROM tam_accounts t WHERE t.company_name = 'Siemens';

-- ============================================
-- PART 9: SAMPLE WARM PATHS
-- ============================================

INSERT INTO tam_warm_paths (tam_account_id, internal_contact, relationship_type, connection_strength, notes)
SELECT t.id, 'John Auld', 'Former colleague', 'strong',
    'Worked with their VP Engineering at Siemens. Regular contact.'
FROM tam_accounts t WHERE t.company_name = 'Continental AG';

INSERT INTO tam_warm_paths (tam_account_id, internal_contact, relationship_type, connection_strength, notes)
SELECT t.id, 'Roy Fridman', 'Conference contact', 'medium',
    'Met at H-ISAC conference. Exchanged cards, discussed product security challenges.'
FROM tam_accounts t WHERE t.company_name = 'Medtronic';

INSERT INTO tam_warm_paths (tam_account_id, internal_contact, relationship_type, connection_strength, notes)
SELECT t.id, 'Paul Priepke', 'Industry contact', 'medium',
    'Connected through automotive security working group.'
FROM tam_accounts t WHERE t.company_name = 'Bosch';

INSERT INTO tam_warm_paths (tam_account_id, internal_contact, relationship_type, connection_strength, notes)
SELECT t.id, 'John Auld', 'Former customer', 'strong',
    'Worked together at previous company. Trusted relationship.'
FROM tam_accounts t WHERE t.company_name = 'Siemens';

INSERT INTO tam_warm_paths (tam_account_id, internal_contact, relationship_type, connection_strength, notes)
SELECT t.id, 'Kelly', 'Technical contact', 'medium',
    'Kelly did implementation work for their competitor. Knows their tech stack.'
FROM tam_accounts t WHERE t.company_name = 'Philips Healthcare';

-- ============================================
-- PART 10: SAMPLE TAM CONTACTS
-- ============================================

INSERT INTO tam_contacts (tam_account_id, name, title, email, linkedin_url, notes)
SELECT t.id, 'Sarah Chen', 'VP Product Security', 'schen@medtronic.com', 'linkedin.com/in/sarahchen',
    'Key decision maker for security tooling. Spoke at H-ISAC.'
FROM tam_accounts t WHERE t.company_name = 'Medtronic';

INSERT INTO tam_contacts (tam_account_id, name, title, email, linkedin_url, notes)
SELECT t.id, 'Dr. James Wilson', 'Chief Medical Officer', 'jwilson@medtronic.com', 'linkedin.com/in/jameswilson',
    'Executive sponsor for connected device initiatives. Quality background.'
FROM tam_accounts t WHERE t.company_name = 'Medtronic';

INSERT INTO tam_contacts (tam_account_id, name, title, email, linkedin_url, notes)
SELECT t.id, 'Michael Weber', 'Director Cybersecurity', 'michael.weber@continental.com', 'linkedin.com/in/mweber',
    'Leading ISO 21434 implementation. German speaker.'
FROM tam_accounts t WHERE t.company_name = 'Continental AG';

INSERT INTO tam_contacts (tam_account_id, name, title, email, linkedin_url, notes)
SELECT t.id, 'Anna Schmidt', 'Product Security Manager', 'anna.schmidt@continental.com', 'linkedin.com/in/annaschmidt',
    'Technical lead for ADAS security. Reports to Weber.'
FROM tam_accounts t WHERE t.company_name = 'Continental AG';

INSERT INTO tam_contacts (tam_account_id, name, title, email, linkedin_url, notes)
SELECT t.id, 'Jennifer Park', 'CISO', 'jpark@bostonsci.com', 'linkedin.com/in/jenniferpark',
    'Newly appointed. Previously J&J. Building out product security program.'
FROM tam_accounts t WHERE t.company_name = 'Boston Scientific';

INSERT INTO tam_contacts (tam_account_id, name, title, email, linkedin_url, notes)
SELECT t.id, 'Robert Torres', 'Director Engineering', 'rtorres@stryker.com', 'linkedin.com/in/roberttorres',
    'Leading digital surgery platform development. Security is top concern.'
FROM tam_accounts t WHERE t.company_name = 'Stryker';

INSERT INTO tam_contacts (tam_account_id, name, title, email, linkedin_url, notes)
SELECT t.id, 'Hans Mueller', 'VP Automotive Security', 'hans.mueller@bosch.com', 'linkedin.com/in/hansmueller',
    'Industry thought leader. Speaks at conferences. Sets strategy for Bosch automotive security.'
FROM tam_accounts t WHERE t.company_name = 'Bosch';

INSERT INTO tam_contacts (tam_account_id, name, title, email, linkedin_url, notes)
SELECT t.id, 'Lisa Chang', 'Product Security Director', 'lchang@siemens.com', 'linkedin.com/in/lisachang',
    'Responsible for ICS/OT security. IEC 62443 expert.'
FROM tam_accounts t WHERE t.company_name = 'Siemens';

INSERT INTO tam_contacts (tam_account_id, name, title, email, linkedin_url, notes)
SELECT t.id, 'Thomas Anderson', 'CISO', 'tanderson@philips.com', 'linkedin.com/in/thomasanderson',
    'Enterprise CISO with product security oversight. Compliance focused.'
FROM tam_accounts t WHERE t.company_name = 'Philips Healthcare';

-- ============================================
-- PART 11: GAP DEFINITIONS
-- ============================================

INSERT INTO gap_definitions (name, vertical, value_min, value_max, campaign_id, min_pursuits_for_coverage, min_tam_for_opportunity)
VALUES ('Medical High Value', 'Medical', 300000, NULL, NULL, 2, 3);

INSERT INTO gap_definitions (name, vertical, value_min, value_max, campaign_id, min_pursuits_for_coverage, min_tam_for_opportunity)
VALUES ('Medical Mid Value', 'Medical', 100000, 300000, NULL, 3, 5);

INSERT INTO gap_definitions (name, vertical, value_min, value_max, campaign_id, min_pursuits_for_coverage, min_tam_for_opportunity)
VALUES ('Automotive Enterprise', 'Automotive', 500000, NULL, NULL, 2, 3);

INSERT INTO gap_definitions (name, vertical, value_min, value_max, campaign_id, min_pursuits_for_coverage, min_tam_for_opportunity)
SELECT 'CRA Campaign Coverage', NULL, 200000, NULL,
    (SELECT id FROM campaigns WHERE name = 'CRA Compliance 2026'), 3, 5;

INSERT INTO gap_definitions (name, vertical, value_min, value_max, campaign_id, min_pursuits_for_coverage, min_tam_for_opportunity)
VALUES ('Industrial Enterprise', 'Industrial', 400000, NULL, NULL, 2, 4);

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Check campaigns created
SELECT name, type, status, target_verticals FROM campaigns;

-- Check TAM accounts with priority scores
SELECT company_name, vertical, fit_tier, priority_score, status FROM tam_accounts ORDER BY priority_score DESC;

-- Check campaign-TAM fits
SELECT
    c.name as campaign,
    t.company_name,
    cta.fit_score
FROM campaign_tam_accounts cta
JOIN campaigns c ON c.id = cta.campaign_id
JOIN tam_accounts t ON t.id = cta.tam_account_id
ORDER BY c.name, cta.fit_score DESC;

-- Check signals
SELECT
    t.company_name,
    s.signal_type,
    s.signal_date,
    s.summary
FROM account_signals s
JOIN tam_accounts t ON t.id = s.tam_account_id
ORDER BY s.signal_date DESC;

-- Check warm paths
SELECT
    t.company_name,
    wp.internal_contact,
    wp.connection_strength
FROM tam_warm_paths wp
JOIN tam_accounts t ON t.id = wp.tam_account_id;

-- Check contacts
SELECT
    t.company_name,
    tc.name,
    tc.title
FROM tam_contacts tc
JOIN tam_accounts t ON t.id = tc.tam_account_id
ORDER BY t.company_name;

-- Check gap definitions
SELECT name, vertical, value_min, value_max FROM gap_definitions;
