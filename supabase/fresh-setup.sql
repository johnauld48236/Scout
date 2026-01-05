-- ============================================
-- SCOUT PLATFORM - FRESH DATABASE SETUP
-- Run this on a new Supabase project to set up all tables
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- COMPANY PROFILE
-- ============================================
CREATE TABLE IF NOT EXISTS company_profile (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_name VARCHAR(255),
  industry VARCHAR(255),
  website VARCHAR(255),
  tagline TEXT,
  value_proposition TEXT,
  key_differentiators TEXT,
  ideal_customer_profile TEXT,
  target_verticals TEXT[],
  target_company_sizes TEXT[],
  target_geographies TEXT[],
  products_services TEXT,
  competitors TEXT[],
  competitive_positioning TEXT,
  buying_triggers TEXT,
  qualification_criteria TEXT,
  avg_sales_cycle VARCHAR(100),
  typical_deal_size VARCHAR(100),
  key_stakeholder_roles TEXT[],
  sales_methodology VARCHAR(100),
  custom_methodology_criteria TEXT[],
  sales_intelligence JSONB DEFAULT '{
    "target_market": {
      "ideal_customer_profile": "",
      "target_verticals": [],
      "target_company_sizes": [],
      "target_geographies": [],
      "buying_triggers": []
    },
    "value_proposition": {
      "core_value_prop": "",
      "key_differentiators": [],
      "pain_points_addressed": []
    },
    "market_context": {
      "regulations": [],
      "industry_dynamics": "",
      "timing_factors": []
    },
    "competitive": {
      "competitors": [],
      "differentiation": [],
      "common_objections": []
    },
    "evidence": {
      "proof_points": [],
      "customer_stories": [],
      "evidence_gaps": []
    },
    "signals": {
      "positive_indicators": [],
      "disqualifiers": [],
      "urgency_triggers": []
    }
  }'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- CAMPAIGNS
-- ============================================
CREATE TABLE IF NOT EXISTS campaigns (
  campaign_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL DEFAULT 'vertical',
  status VARCHAR(50) NOT NULL DEFAULT 'planned',
  start_date DATE,
  end_date DATE,
  target_verticals TEXT[],
  target_geos TEXT[],
  pipeline_goal DECIMAL(15,2),
  value_proposition TEXT,
  key_pain_points TEXT,
  signal_triggers TEXT,
  regulatory_context TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- TAM ACCOUNTS
-- ============================================
CREATE TABLE IF NOT EXISTS tam_accounts (
  tam_account_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_name VARCHAR(255) NOT NULL,
  website VARCHAR(255),
  vertical VARCHAR(100),
  employee_count VARCHAR(50),
  headquarters VARCHAR(255),
  company_summary TEXT,
  fit_tier VARCHAR(10),
  fit_rationale TEXT,
  priority_score INTEGER DEFAULT 0,
  estimated_deal_value DECIMAL(15,2),
  status VARCHAR(50) DEFAULT 'New',
  promoted_to_account_plan_id UUID,
  promoted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tam_accounts_vertical ON tam_accounts(vertical);
CREATE INDEX IF NOT EXISTS idx_tam_accounts_status ON tam_accounts(status);
CREATE INDEX IF NOT EXISTS idx_tam_accounts_priority ON tam_accounts(priority_score DESC);

-- ============================================
-- TAM CONTACTS
-- ============================================
CREATE TABLE IF NOT EXISTS tam_contacts (
  contact_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tam_account_id UUID REFERENCES tam_accounts(tam_account_id) ON DELETE CASCADE,
  full_name VARCHAR(255),
  title VARCHAR(255),
  email VARCHAR(255),
  phone VARCHAR(50),
  linkedin_url VARCHAR(500),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- TAM WARM PATHS
-- ============================================
CREATE TABLE IF NOT EXISTS tam_warm_paths (
  warm_path_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tam_account_id UUID REFERENCES tam_accounts(tam_account_id) ON DELETE CASCADE,
  connection_name VARCHAR(255),
  relationship_type VARCHAR(100),
  strength VARCHAR(50),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- ACCOUNT SIGNALS
-- ============================================
CREATE TABLE IF NOT EXISTS account_signals (
  signal_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tam_account_id UUID REFERENCES tam_accounts(tam_account_id) ON DELETE CASCADE,
  signal_type VARCHAR(100),
  signal_date DATE,
  source VARCHAR(255),
  summary TEXT,
  raw_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_signals_tam ON account_signals(tam_account_id);
CREATE INDEX IF NOT EXISTS idx_signals_date ON account_signals(signal_date DESC);

-- ============================================
-- CAMPAIGN TAM ACCOUNTS (Fit Scoring)
-- ============================================
CREATE TABLE IF NOT EXISTS campaign_tam_accounts (
  campaign_tam_account_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id UUID REFERENCES campaigns(campaign_id) ON DELETE CASCADE,
  tam_account_id UUID REFERENCES tam_accounts(tam_account_id) ON DELETE CASCADE,
  fit_score INTEGER DEFAULT 0,
  fit_rationale TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(campaign_id, tam_account_id)
);

-- ============================================
-- ACCOUNT PLANS
-- ============================================
CREATE TABLE IF NOT EXISTS account_plans (
  account_plan_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_name VARCHAR(255) NOT NULL,
  account_type VARCHAR(50) DEFAULT 'Prospect',
  website VARCHAR(255),
  industry VARCHAR(255),
  vertical VARCHAR(100),
  employee_count VARCHAR(50),
  headquarters VARCHAR(255),
  description TEXT,
  strategic_objectives TEXT,
  risk_factors TEXT,
  account_strategy TEXT,
  research_summary TEXT,
  research_findings JSONB,
  competitors JSONB,
  tam_account_id UUID REFERENCES tam_accounts(tam_account_id),
  campaign_id UUID REFERENCES campaigns(campaign_id),

  -- Planning fields
  business_units JSONB DEFAULT '[]',
  signal_mappings JSONB DEFAULT '{}',
  milestones JSONB DEFAULT '{"day_30": [], "day_60": [], "day_90": []}',
  plan_status VARCHAR(20) DEFAULT 'draft',
  plan_completeness INTEGER DEFAULT 0,
  planning_period_start DATE,
  planning_period_end DATE,
  activated_at TIMESTAMP WITH TIME ZONE,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_account_plans_campaign ON account_plans(campaign_id);
CREATE INDEX IF NOT EXISTS idx_account_plans_vertical ON account_plans(vertical);

-- ============================================
-- STAKEHOLDERS
-- ============================================
CREATE TABLE IF NOT EXISTS stakeholders (
  stakeholder_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_plan_id UUID NOT NULL REFERENCES account_plans(account_plan_id) ON DELETE CASCADE,
  full_name VARCHAR(255) NOT NULL,
  title VARCHAR(255),
  email VARCHAR(255),
  phone VARCHAR(50),
  linkedin_url VARCHAR(500),
  role_type VARCHAR(100),
  sentiment VARCHAR(100),
  notes TEXT,
  profile_notes TEXT,
  business_unit VARCHAR(100),
  is_placeholder BOOLEAN DEFAULT FALSE,
  placeholder_role VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stakeholders_account ON stakeholders(account_plan_id);

-- ============================================
-- PURSUITS (Opportunities)
-- ============================================
CREATE TABLE IF NOT EXISTS pursuits (
  pursuit_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_plan_id UUID NOT NULL REFERENCES account_plans(account_plan_id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  stage VARCHAR(100) DEFAULT 'Discovery',
  probability INTEGER DEFAULT 10,
  estimated_value DECIMAL(15,2),
  confirmed_value DECIMAL(15,2),
  target_close_date DATE,
  notes TEXT,
  originated_from_tam BOOLEAN DEFAULT FALSE,
  source_tam_account_id UUID REFERENCES tam_accounts(tam_account_id),
  business_unit_id VARCHAR(100),
  thesis TEXT,
  signal_ids JSONB DEFAULT '[]',
  engagement_plan JSONB,
  deal_type VARCHAR(50), -- new_business, upsell, renewal
  crm_source VARCHAR(100), -- spreadsheet, salesforce, hubspot, manual, etc.
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pursuits_account ON pursuits(account_plan_id);
CREATE INDEX IF NOT EXISTS idx_pursuits_stage ON pursuits(stage);
CREATE INDEX IF NOT EXISTS idx_pursuits_deal_type ON pursuits(deal_type);

-- ============================================
-- PURSUIT STAKEHOLDERS (Many-to-Many)
-- ============================================
CREATE TABLE IF NOT EXISTS pursuit_stakeholders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pursuit_id UUID REFERENCES pursuits(pursuit_id) ON DELETE CASCADE,
  stakeholder_id UUID REFERENCES stakeholders(stakeholder_id) ON DELETE CASCADE,
  role_in_deal VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(pursuit_id, stakeholder_id)
);

-- ============================================
-- ACTION ITEMS
-- ============================================
CREATE TABLE IF NOT EXISTS action_items (
  action_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_plan_id UUID REFERENCES account_plans(account_plan_id) ON DELETE CASCADE,
  pursuit_id UUID REFERENCES pursuits(pursuit_id) ON DELETE SET NULL,
  title VARCHAR(500) NOT NULL,
  description TEXT,
  owner VARCHAR(255),
  due_date DATE,
  priority VARCHAR(50) DEFAULT 'Medium',
  category VARCHAR(100),
  status VARCHAR(50) DEFAULT 'Not Started',
  week_number INTEGER,
  milestone_id VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_actions_account ON action_items(account_plan_id);
CREATE INDEX IF NOT EXISTS idx_actions_pursuit ON action_items(pursuit_id);
CREATE INDEX IF NOT EXISTS idx_actions_due ON action_items(due_date);

-- ============================================
-- GOALS
-- ============================================
CREATE TABLE IF NOT EXISTS goals (
  goal_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  parent_goal_id UUID REFERENCES goals(goal_id) ON DELETE SET NULL,
  name VARCHAR(255) NOT NULL,
  goal_type VARCHAR(50) NOT NULL,
  category VARCHAR(50),
  vertical VARCHAR(100),
  region VARCHAR(100),
  target_value DECIMAL(15,2) NOT NULL,
  target_year INTEGER NOT NULL DEFAULT 2026,
  current_value DECIMAL(15,2) DEFAULT 0,
  sf_synced BOOLEAN DEFAULT FALSE,
  sf_external_id VARCHAR(255),
  last_sf_sync TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE
);

CREATE INDEX IF NOT EXISTS idx_goals_parent ON goals(parent_goal_id);
CREATE INDEX IF NOT EXISTS idx_goals_type ON goals(goal_type);
CREATE INDEX IF NOT EXISTS idx_goals_year ON goals(target_year);

-- ============================================
-- GOAL PROGRESS
-- ============================================
CREATE TABLE IF NOT EXISTS goal_progress (
  progress_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  goal_id UUID NOT NULL REFERENCES goals(goal_id) ON DELETE CASCADE,
  recorded_at DATE NOT NULL,
  total_closed DECIMAL(15,2) DEFAULT 0,
  platform_originated DECIMAL(15,2) DEFAULT 0,
  active_pipeline DECIMAL(15,2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(goal_id, recorded_at)
);

CREATE INDEX IF NOT EXISTS idx_goal_progress_goal ON goal_progress(goal_id);

-- ============================================
-- CAMPAIGN GOALS (Many-to-Many)
-- ============================================
CREATE TABLE IF NOT EXISTS campaign_goals (
  campaign_id UUID NOT NULL REFERENCES campaigns(campaign_id) ON DELETE CASCADE,
  goal_id UUID NOT NULL REFERENCES goals(goal_id) ON DELETE CASCADE,
  allocation_type VARCHAR(20) NOT NULL DEFAULT 'attributed',
  allocated_value DECIMAL(15,2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (campaign_id, goal_id)
);

-- ============================================
-- QUALIFICATION CRITERIA
-- ============================================
CREATE TABLE IF NOT EXISTS qualification_criteria (
  criteria_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pursuit_id UUID NOT NULL REFERENCES pursuits(pursuit_id) ON DELETE CASCADE,
  framework VARCHAR(50) NOT NULL,
  category VARCHAR(100) NOT NULL,
  criteria_key VARCHAR(100) NOT NULL,
  value TEXT,
  confidence VARCHAR(20),
  source VARCHAR(255),
  notes TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(pursuit_id, framework, criteria_key)
);

CREATE INDEX IF NOT EXISTS idx_qual_pursuit ON qualification_criteria(pursuit_id);

-- ============================================
-- RESEARCH FINDINGS
-- ============================================
CREATE TABLE IF NOT EXISTS research_findings (
  finding_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_plan_id UUID NOT NULL REFERENCES account_plans(account_plan_id) ON DELETE CASCADE,
  category VARCHAR(100) NOT NULL,
  title VARCHAR(500),
  content TEXT,
  confidence VARCHAR(20),
  sources JSONB,
  status VARCHAR(20) DEFAULT 'pending',
  edited_content TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_findings_account ON research_findings(account_plan_id);

-- ============================================
-- HELPER VIEW: Goals with Progress
-- ============================================
CREATE OR REPLACE VIEW goals_with_progress AS
SELECT
  g.*,
  gp.total_closed AS latest_total_closed,
  gp.platform_originated AS latest_platform_originated,
  gp.active_pipeline AS latest_active_pipeline,
  CASE
    WHEN g.target_value > 0 THEN ROUND((g.current_value / g.target_value) * 100, 1)
    ELSE 0
  END AS progress_percentage,
  CASE
    WHEN g.target_value > 0 AND g.current_value >= g.target_value THEN 'achieved'
    WHEN g.target_value > 0 AND (g.current_value / g.target_value) >= 0.7 THEN 'on_track'
    WHEN g.target_value > 0 AND (g.current_value / g.target_value) >= 0.4 THEN 'at_risk'
    ELSE 'off_track'
  END AS status
FROM goals g
LEFT JOIN LATERAL (
  SELECT * FROM goal_progress
  WHERE goal_id = g.goal_id
  ORDER BY recorded_at DESC
  LIMIT 1
) gp ON TRUE;

-- ============================================
-- ENABLE ROW LEVEL SECURITY (Optional)
-- ============================================
-- For now, keeping RLS simple - enable as needed
-- ALTER TABLE company_profile ENABLE ROW LEVEL SECURITY;
-- etc.

-- ============================================
-- DONE!
-- ============================================
-- Run this script on your new Supabase project
-- Then configure your .env.c2a file with the new credentials
