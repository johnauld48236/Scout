-- ============================================
-- COMPANY PROFILE TABLE
-- Stores the user's company context for AI
-- ============================================

CREATE TABLE IF NOT EXISTS company_profile (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Basic Company Info
    company_name VARCHAR(255) NOT NULL,
    industry VARCHAR(100),
    website VARCHAR(255),

    -- Value Proposition
    tagline VARCHAR(255),  -- One-liner description
    value_proposition TEXT,  -- What problem you solve
    key_differentiators TEXT,  -- Why you vs competitors

    -- Target Market
    ideal_customer_profile TEXT,  -- ICP description
    target_verticals TEXT[],  -- Array of verticals
    target_company_sizes TEXT[],  -- e.g., ['Enterprise', 'Mid-Market']
    target_geographies TEXT[],  -- e.g., ['North America', 'Europe']

    -- Products & Services
    products_services TEXT,  -- What you sell
    use_cases TEXT,  -- Common use cases

    -- Competitive Landscape
    competitors TEXT[],  -- Array of competitor names
    competitive_positioning TEXT,  -- How you position vs competitors

    -- Buying Signals
    buying_triggers TEXT,  -- What signals indicate a prospect is ready to buy
    qualification_criteria TEXT,  -- What makes a good fit

    -- Sales Context
    typical_sales_cycle VARCHAR(100),  -- e.g., '3-6 months'
    average_deal_size VARCHAR(100),  -- e.g., '$50K-$200K'
    key_stakeholder_roles TEXT[],  -- e.g., ['CISO', 'VP Engineering', 'CTO']

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_company_profile_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS company_profile_updated_at ON company_profile;
CREATE TRIGGER company_profile_updated_at
    BEFORE UPDATE ON company_profile
    FOR EACH ROW
    EXECUTE FUNCTION update_company_profile_updated_at();

-- RLS Policies (open for now - single tenant)
ALTER TABLE company_profile ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to company_profile"
    ON company_profile
    FOR ALL
    USING (true)
    WITH CHECK (true);
