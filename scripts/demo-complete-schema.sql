-- ============================================
-- SCOUT DEMO - COMPLETE SCHEMA
-- Tables in dependency order (run on fresh Supabase)
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- LEVEL 0: NO DEPENDENCIES
-- ============================================

-- Company Profile (singleton)
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
  sales_intelligence JSONB DEFAULT '{}'::jsonb,
  hubspot_config JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Campaigns
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
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- TAM Accounts (prospects)
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
  promoted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tam_accounts_vertical ON tam_accounts(vertical);
CREATE INDEX IF NOT EXISTS idx_tam_accounts_status ON tam_accounts(status);

-- Goals (self-referencing)
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
  last_sf_sync TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE
);

-- ============================================
-- LEVEL 1: DEPENDS ON LEVEL 0
-- ============================================

-- Account Plans (main territories)
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
  activated_at TIMESTAMPTZ,

  -- Account thesis fields
  account_thesis TEXT,
  compelling_events TEXT,
  buying_signals TEXT,
  corporate_structure JSONB DEFAULT '{}',

  -- Messaging & review
  messaging_playbook JSONB DEFAULT '{}'::jsonb,
  review_cycle JSONB DEFAULT '{}'::jsonb,
  account_tier VARCHAR(20),
  account_source TEXT,
  account_owner TEXT,

  -- Vector In fields
  tier VARCHAR(20),
  lifecycle_stage VARCHAR(50),
  renewal_date DATE,
  nps_score INTEGER,
  csat_score INTEGER,

  -- Enrichment
  enrichment_status TEXT DEFAULT 'not_started',
  last_enriched_at TIMESTAMPTZ,
  enrichment_source TEXT,

  -- Favorites/Review
  is_favorite BOOLEAN DEFAULT FALSE,
  in_weekly_review BOOLEAN DEFAULT FALSE,

  -- External sources
  slack_channel_url TEXT,
  jira_project_url TEXT,
  asana_project_url TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_account_plans_campaign ON account_plans(campaign_id);

-- TAM Contacts
CREATE TABLE IF NOT EXISTS tam_contacts (
  contact_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tam_account_id UUID REFERENCES tam_accounts(tam_account_id) ON DELETE CASCADE,
  full_name VARCHAR(255),
  title VARCHAR(255),
  email VARCHAR(255),
  phone VARCHAR(50),
  linkedin_url VARCHAR(500),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- TAM Warm Paths
CREATE TABLE IF NOT EXISTS tam_warm_paths (
  warm_path_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tam_account_id UUID REFERENCES tam_accounts(tam_account_id) ON DELETE CASCADE,
  connection_name VARCHAR(255),
  relationship_type VARCHAR(100),
  strength VARCHAR(50),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Campaign TAM Accounts junction
CREATE TABLE IF NOT EXISTS campaign_tam_accounts (
  campaign_tam_account_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id UUID REFERENCES campaigns(campaign_id) ON DELETE CASCADE,
  tam_account_id UUID REFERENCES tam_accounts(tam_account_id) ON DELETE CASCADE,
  fit_score INTEGER DEFAULT 0,
  fit_rationale TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(campaign_id, tam_account_id)
);

-- Campaign Goals junction
CREATE TABLE IF NOT EXISTS campaign_goals (
  campaign_id UUID NOT NULL REFERENCES campaigns(campaign_id) ON DELETE CASCADE,
  goal_id UUID NOT NULL REFERENCES goals(goal_id) ON DELETE CASCADE,
  allocation_type VARCHAR(20) NOT NULL DEFAULT 'attributed',
  allocated_value DECIMAL(15,2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (campaign_id, goal_id)
);

-- ============================================
-- LEVEL 2: DEPENDS ON ACCOUNT_PLANS
-- ============================================

-- Account Divisions
CREATE TABLE IF NOT EXISTS account_divisions (
  division_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_plan_id UUID REFERENCES account_plans(account_plan_id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  division_type TEXT,
  products TEXT[],
  parent_division_id UUID REFERENCES account_divisions(division_id) ON DELETE SET NULL,
  headcount INTEGER,
  revenue_estimate TEXT,
  key_focus_areas TEXT[],
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_account_divisions_account ON account_divisions(account_plan_id);

-- Pursuits (Opportunities)
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
  deal_type VARCHAR(50),
  crm_source VARCHAR(100),
  pursuit_type VARCHAR(20) DEFAULT 'new_business',
  crm_url TEXT,
  hubspot_deal_id VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pursuits_account ON pursuits(account_plan_id);
CREATE INDEX IF NOT EXISTS idx_pursuits_stage ON pursuits(stage);

-- Account Signals
CREATE TABLE IF NOT EXISTS account_signals (
  signal_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tam_account_id UUID REFERENCES tam_accounts(tam_account_id) ON DELETE CASCADE,
  account_plan_id UUID REFERENCES account_plans(account_plan_id) ON DELETE CASCADE,
  title TEXT,
  signal_type VARCHAR(100),
  signal_date DATE,
  source VARCHAR(255),
  summary TEXT,
  raw_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_signals_tam ON account_signals(tam_account_id);
CREATE INDEX IF NOT EXISTS idx_signals_account ON account_signals(account_plan_id);

-- Buckets (Goals/Workstreams)
CREATE TABLE IF NOT EXISTS buckets (
  bucket_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_plan_id UUID NOT NULL REFERENCES account_plans(account_plan_id) ON DELETE CASCADE,
  pursuit_id UUID REFERENCES pursuits(pursuit_id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  target_date DATE,
  color VARCHAR(20) DEFAULT 'blue',
  status VARCHAR(20) DEFAULT 'active',
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_buckets_account ON buckets(account_plan_id);

-- ============================================
-- LEVEL 3: DEPENDS ON DIVISIONS/PURSUITS
-- ============================================

-- Stakeholders
CREATE TABLE IF NOT EXISTS stakeholders (
  stakeholder_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_plan_id UUID NOT NULL REFERENCES account_plans(account_plan_id) ON DELETE CASCADE,
  division_id UUID REFERENCES account_divisions(division_id) ON DELETE SET NULL,
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
  -- Relationship fields
  relationship_strength VARCHAR(20) DEFAULT 'unknown',
  relationship_history TEXT,
  purchasing_authority VARCHAR(30),
  last_contact_date DATE,
  preferred_contact_method VARCHAR(20),
  key_concerns TEXT,
  communication_style TEXT,
  -- Power/Interest (Vector In)
  power_level VARCHAR(20),
  interest_level VARCHAR(20),
  influence_level VARCHAR(50),
  engagement_level VARCHAR(50),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stakeholders_account ON stakeholders(account_plan_id);

-- Scout Themes (Trails/Missions)
CREATE TABLE IF NOT EXISTS scout_themes (
  theme_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_plan_id UUID REFERENCES account_plans(account_plan_id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES campaigns(campaign_id) ON DELETE SET NULL,

  -- Theme details
  title VARCHAR(255) NOT NULL,
  description TEXT,
  why_it_matters TEXT,

  -- Sizing (for Trails - Vector Out)
  size VARCHAR(20) DEFAULT 'medium',

  -- Health Impact (for Missions - Vector In)
  health_impact VARCHAR(20),

  -- Vector indicator
  vector VARCHAR(10) DEFAULT 'out',

  -- Category for organization
  category VARCHAR(50),

  -- Connected intelligence
  signals_connected UUID[],
  questions_to_explore TEXT[],

  -- Status tracking
  status VARCHAR(50) DEFAULT 'exploring',
  converted_to_pursuit_id UUID REFERENCES pursuits(pursuit_id) ON DELETE SET NULL,
  linked_pursuit_id UUID REFERENCES pursuits(pursuit_id) ON DELETE SET NULL,

  -- Metadata
  created_by VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_scout_themes_account ON scout_themes(account_plan_id);
CREATE INDEX IF NOT EXISTS idx_scout_themes_vector ON scout_themes(vector);
CREATE INDEX IF NOT EXISTS idx_scout_themes_status ON scout_themes(status);

-- Division Product Usage (White Space)
CREATE TABLE IF NOT EXISTS division_product_usage (
  usage_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_plan_id UUID NOT NULL REFERENCES account_plans(account_plan_id) ON DELETE CASCADE,
  division_id UUID REFERENCES account_divisions(division_id) ON DELETE CASCADE,
  product_module VARCHAR(100) NOT NULL,
  usage_status VARCHAR(50),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(account_plan_id, division_id, product_module)
);

CREATE INDEX IF NOT EXISTS idx_division_product_account ON division_product_usage(account_plan_id);

-- ============================================
-- LEVEL 4: DEPENDS ON STAKEHOLDERS/BUCKETS
-- ============================================

-- Action Items
CREATE TABLE IF NOT EXISTS action_items (
  action_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_plan_id UUID REFERENCES account_plans(account_plan_id) ON DELETE CASCADE,
  pursuit_id UUID REFERENCES pursuits(pursuit_id) ON DELETE SET NULL,
  initiative_id UUID REFERENCES buckets(bucket_id) ON DELETE SET NULL,
  title VARCHAR(500) NOT NULL,
  description TEXT,
  owner VARCHAR(255),
  due_date DATE,
  priority VARCHAR(50) DEFAULT 'Medium',
  category VARCHAR(100),
  status VARCHAR(50) DEFAULT 'Not Started',
  week_number INTEGER,
  milestone_id VARCHAR(100),
  bucket VARCHAR(10),
  bucket_type VARCHAR(20),
  slip_acknowledged BOOLEAN DEFAULT FALSE,
  bant_dimension VARCHAR(1),
  milestone_period VARCHAR(10),
  needs_review BOOLEAN DEFAULT FALSE,
  import_source VARCHAR(50),
  import_batch_id UUID,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_actions_account ON action_items(account_plan_id);
CREATE INDEX IF NOT EXISTS idx_actions_pursuit ON action_items(pursuit_id);
CREATE INDEX IF NOT EXISTS idx_actions_due ON action_items(due_date);
CREATE INDEX IF NOT EXISTS idx_actions_bucket ON action_items(bucket);

-- Risks
CREATE TABLE IF NOT EXISTS risks (
  risk_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_plan_id UUID REFERENCES account_plans(account_plan_id) ON DELETE CASCADE,
  pursuit_id UUID REFERENCES pursuits(pursuit_id) ON DELETE SET NULL,
  initiative_id UUID REFERENCES buckets(bucket_id) ON DELETE SET NULL,
  title TEXT,
  description TEXT NOT NULL,
  severity VARCHAR(20) DEFAULT 'medium',
  status VARCHAR(20) DEFAULT 'open',
  mitigation TEXT,
  impact_on_bant VARCHAR(1),
  identified_date DATE DEFAULT CURRENT_DATE,
  target_date DATE,
  bucket VARCHAR(10),
  needs_review BOOLEAN DEFAULT FALSE,
  import_source VARCHAR(50),
  import_batch_id UUID,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_risks_account ON risks(account_plan_id);
CREATE INDEX IF NOT EXISTS idx_risks_status ON risks(status);

-- Pain Points
CREATE TABLE IF NOT EXISTS pain_points (
  pain_point_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_plan_id UUID NOT NULL REFERENCES account_plans(account_plan_id) ON DELETE CASCADE,
  pursuit_id UUID REFERENCES pursuits(pursuit_id) ON DELETE SET NULL,
  stakeholder_id UUID REFERENCES stakeholders(stakeholder_id) ON DELETE SET NULL,
  initiative_id UUID REFERENCES buckets(bucket_id) ON DELETE SET NULL,

  -- Core content
  title TEXT,
  description TEXT,
  verbatim TEXT,
  impact TEXT,

  -- Classification
  severity VARCHAR(20) DEFAULT 'significant',
  category VARCHAR(50),
  bant_dimension VARCHAR(1),

  -- Source tracking
  source_type VARCHAR(30),
  source_date DATE,
  engagement_log_id UUID,

  -- Status
  status VARCHAR(20) DEFAULT 'active',
  addressed_date DATE,
  addressed_notes TEXT,
  target_date DATE,
  bucket VARCHAR(10),

  -- Review queue
  needs_review BOOLEAN DEFAULT FALSE,
  import_source VARCHAR(50),
  import_batch_id UUID,
  deleted_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pain_points_account ON pain_points(account_plan_id);
CREATE INDEX IF NOT EXISTS idx_pain_points_severity ON pain_points(severity);
CREATE INDEX IF NOT EXISTS idx_pain_points_status ON pain_points(status);

-- Pursuit Stakeholders junction
CREATE TABLE IF NOT EXISTS pursuit_stakeholders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pursuit_id UUID REFERENCES pursuits(pursuit_id) ON DELETE CASCADE,
  stakeholder_id UUID REFERENCES stakeholders(stakeholder_id) ON DELETE CASCADE,
  role_in_deal VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(pursuit_id, stakeholder_id)
);

-- Engagement Logs
CREATE TABLE IF NOT EXISTS engagement_logs (
  engagement_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_plan_id UUID NOT NULL REFERENCES account_plans(account_plan_id) ON DELETE CASCADE,
  pursuit_id UUID REFERENCES pursuits(pursuit_id) ON DELETE SET NULL,
  engagement_type VARCHAR(30) NOT NULL,
  engagement_date DATE NOT NULL,
  duration_minutes INTEGER,
  location TEXT,
  title TEXT,
  summary TEXT,
  key_moments TEXT,
  outcome TEXT,
  next_steps TEXT,
  recording_url TEXT,
  transcript TEXT,
  our_attendees TEXT[],
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_engagement_logs_account ON engagement_logs(account_plan_id);

-- Bucket Items junction
CREATE TABLE IF NOT EXISTS bucket_items (
  bucket_id UUID NOT NULL REFERENCES buckets(bucket_id) ON DELETE CASCADE,
  item_type VARCHAR(20) NOT NULL,
  item_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (bucket_id, item_type, item_id)
);

-- Engagement Attendees (junction for engagement logs)
CREATE TABLE IF NOT EXISTS engagement_attendees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  engagement_id UUID NOT NULL REFERENCES engagement_logs(engagement_id) ON DELETE CASCADE,
  stakeholder_id UUID REFERENCES stakeholders(stakeholder_id) ON DELETE SET NULL,
  role VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_engagement_attendees_engagement ON engagement_attendees(engagement_id);

-- BANT Analyses (deal qualification scoring)
CREATE TABLE IF NOT EXISTS bant_analyses (
  analysis_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pursuit_id UUID NOT NULL REFERENCES pursuits(pursuit_id) ON DELETE CASCADE,
  account_plan_id UUID REFERENCES account_plans(account_plan_id) ON DELETE CASCADE,
  budget_score INTEGER DEFAULT 0,
  authority_score INTEGER DEFAULT 0,
  need_score INTEGER DEFAULT 0,
  timeline_score INTEGER DEFAULT 0,
  budget_notes TEXT,
  authority_notes TEXT,
  need_notes TEXT,
  timeline_notes TEXT,
  total_score INTEGER GENERATED ALWAYS AS (budget_score + authority_score + need_score + timeline_score) STORED,
  analysis_date TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bant_analyses_pursuit ON bant_analyses(pursuit_id);
CREATE INDEX IF NOT EXISTS idx_bant_analyses_account ON bant_analyses(account_plan_id);

-- Review Notes
CREATE TABLE IF NOT EXISTS review_notes (
  note_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_plan_id UUID NOT NULL REFERENCES account_plans(account_plan_id) ON DELETE CASCADE,
  note_text TEXT NOT NULL,
  note_type VARCHAR(50) DEFAULT 'general',
  is_resolved BOOLEAN DEFAULT FALSE,
  resolved_at TIMESTAMPTZ,
  created_by VARCHAR(255),
  review_week DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Import Batches
CREATE TABLE IF NOT EXISTS import_batches (
  batch_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_plan_id UUID NOT NULL REFERENCES account_plans(account_plan_id) ON DELETE CASCADE,
  source_type VARCHAR(50) NOT NULL,
  source_title TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  status VARCHAR(20) DEFAULT 'pending'
);

-- Success Milestones
CREATE TABLE IF NOT EXISTS success_milestones (
  milestone_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_plan_id UUID NOT NULL REFERENCES account_plans ON DELETE CASCADE,
  pursuit_id UUID REFERENCES pursuits ON DELETE SET NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  milestone_type VARCHAR(50),
  bucket_type VARCHAR(20),
  target_date DATE,
  achieved_date DATE,
  status VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- ROW LEVEL SECURITY (Allow all for demo)
-- ============================================

ALTER TABLE company_profile ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE tam_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE account_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE stakeholders ENABLE ROW LEVEL SECURITY;
ALTER TABLE pursuits ENABLE ROW LEVEL SECURITY;
ALTER TABLE action_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE risks ENABLE ROW LEVEL SECURITY;
ALTER TABLE pain_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE scout_themes ENABLE ROW LEVEL SECURITY;
ALTER TABLE buckets ENABLE ROW LEVEL SECURITY;
ALTER TABLE bucket_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE account_divisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE account_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE engagement_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE division_product_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE success_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE import_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE engagement_attendees ENABLE ROW LEVEL SECURITY;
ALTER TABLE bant_analyses ENABLE ROW LEVEL SECURITY;

-- Allow all for anon users (demo mode)
CREATE POLICY "Allow all" ON company_profile FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON campaigns FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON tam_accounts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON account_plans FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON stakeholders FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON pursuits FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON action_items FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON risks FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON pain_points FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON scout_themes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON buckets FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON bucket_items FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON account_divisions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON account_signals FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON engagement_logs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON division_product_usage FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON success_milestones FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON review_notes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON import_batches FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON goals FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON tam_contacts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON tam_warm_paths FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON campaign_tam_accounts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON pursuit_stakeholders FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON engagement_attendees FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON bant_analyses FOR ALL USING (true) WITH CHECK (true);

-- ============================================
-- DONE! Now run demo-seed.sql to add demo data
-- ============================================
