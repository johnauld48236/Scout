-- Goals Schema for KPI-Based Targets
-- Run this in Supabase SQL Editor

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- GOALS TABLE
-- Hierarchical goal structure with SF sync support
-- ============================================
CREATE TABLE IF NOT EXISTS goals (
  goal_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  parent_goal_id UUID REFERENCES goals(goal_id) ON DELETE SET NULL,

  -- Goal definition
  name VARCHAR(255) NOT NULL,
  goal_type VARCHAR(50) NOT NULL,  -- 'revenue', 'logos', 'deals'
  category VARCHAR(50),            -- 'new_arr', 'renewal', 'upsell' (for revenue type)
  vertical VARCHAR(100),           -- optional vertical filter
  region VARCHAR(100),             -- optional region filter

  -- Targets (annual for Phase 1)
  target_value DECIMAL(15,2) NOT NULL,
  target_year INTEGER NOT NULL DEFAULT 2026,

  -- Progress tracking
  current_value DECIMAL(15,2) DEFAULT 0,

  -- Salesforce sync (placeholder for next week)
  sf_synced BOOLEAN DEFAULT FALSE,
  sf_external_id VARCHAR(255),
  last_sf_sync TIMESTAMP WITH TIME ZONE,

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE
);

-- Index for hierarchy queries
CREATE INDEX IF NOT EXISTS idx_goals_parent ON goals(parent_goal_id);
CREATE INDEX IF NOT EXISTS idx_goals_type ON goals(goal_type);
CREATE INDEX IF NOT EXISTS idx_goals_year ON goals(target_year);

-- ============================================
-- GOAL PROGRESS TABLE
-- Historical tracking of progress over time
-- ============================================
CREATE TABLE IF NOT EXISTS goal_progress (
  progress_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  goal_id UUID NOT NULL REFERENCES goals(goal_id) ON DELETE CASCADE,
  recorded_at DATE NOT NULL,

  -- Progress breakdown
  total_closed DECIMAL(15,2) DEFAULT 0,           -- from SF or manual
  platform_originated DECIMAL(15,2) DEFAULT 0,    -- deals from TAM intelligence
  active_pipeline DECIMAL(15,2) DEFAULT 0,        -- current pursuit value

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Prevent duplicate entries for same goal/date
  UNIQUE(goal_id, recorded_at)
);

CREATE INDEX IF NOT EXISTS idx_goal_progress_goal ON goal_progress(goal_id);
CREATE INDEX IF NOT EXISTS idx_goal_progress_date ON goal_progress(recorded_at);

-- ============================================
-- CAMPAIGN GOALS TABLE
-- Link campaigns to goals (allocated or attributed)
-- ============================================
CREATE TABLE IF NOT EXISTS campaign_goals (
  campaign_id UUID NOT NULL REFERENCES campaigns(campaign_id) ON DELETE CASCADE,
  goal_id UUID NOT NULL REFERENCES goals(goal_id) ON DELETE CASCADE,

  allocation_type VARCHAR(20) NOT NULL DEFAULT 'attributed',  -- 'allocated' or 'attributed'
  allocated_value DECIMAL(15,2),  -- if allocated, the $ amount owned by this campaign

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  PRIMARY KEY (campaign_id, goal_id)
);

-- ============================================
-- MODIFY PURSUITS TABLE
-- Add origin tracking for TAM intelligence contribution
-- ============================================
ALTER TABLE pursuits
ADD COLUMN IF NOT EXISTS originated_from_tam BOOLEAN DEFAULT FALSE;

ALTER TABLE pursuits
ADD COLUMN IF NOT EXISTS source_tam_account_id UUID REFERENCES tam_accounts(tam_account_id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_pursuits_tam_origin ON pursuits(originated_from_tam) WHERE originated_from_tam = TRUE;

-- ============================================
-- SEED DATA: Sample Goal Hierarchy
-- Simulated Salesforce data for demo
-- ============================================

-- Clear existing goals (for re-running)
-- DELETE FROM campaign_goals;
-- DELETE FROM goal_progress;
-- DELETE FROM goals;

-- Top Level: 2026 Total Revenue
INSERT INTO goals (goal_id, name, goal_type, target_value, target_year, current_value, sf_synced, sf_external_id)
VALUES (
  'aaaaaaaa-0001-0001-0001-000000000001',
  '2026 Total Revenue',
  'revenue',
  10000000,  -- $10M
  2026,
  2100000,   -- $2.1M closed (simulated SF)
  TRUE,
  'SF_GOAL_2026_TOTAL'
);

-- Level 2: Revenue Categories
INSERT INTO goals (goal_id, parent_goal_id, name, goal_type, category, target_value, target_year, current_value, sf_synced, sf_external_id)
VALUES
  -- New ARR: $6M target, $1.4M closed
  (
    'aaaaaaaa-0001-0001-0001-000000000002',
    'aaaaaaaa-0001-0001-0001-000000000001',
    'New ARR',
    'revenue',
    'new_arr',
    6000000,
    2026,
    1400000,
    TRUE,
    'SF_GOAL_2026_NEW_ARR'
  ),
  -- Renewal: $3M target, $500K closed
  (
    'aaaaaaaa-0001-0001-0001-000000000003',
    'aaaaaaaa-0001-0001-0001-000000000001',
    'Renewal Revenue',
    'revenue',
    'renewal',
    3000000,
    2026,
    500000,
    TRUE,
    'SF_GOAL_2026_RENEWAL'
  ),
  -- Upsell: $1M target, $200K closed
  (
    'aaaaaaaa-0001-0001-0001-000000000004',
    'aaaaaaaa-0001-0001-0001-000000000001',
    'Upsell Revenue',
    'revenue',
    'upsell',
    1000000,
    2026,
    200000,
    TRUE,
    'SF_GOAL_2026_UPSELL'
  );

-- Level 3: Vertical Goals (under New ARR)
INSERT INTO goals (goal_id, parent_goal_id, name, goal_type, category, vertical, target_value, target_year, current_value, sf_synced, sf_external_id)
VALUES
  -- Medical: $2.5M target, $600K closed
  (
    'aaaaaaaa-0001-0001-0001-000000000005',
    'aaaaaaaa-0001-0001-0001-000000000002',
    'Medical Device New ARR',
    'revenue',
    'new_arr',
    'Medical',
    2500000,
    2026,
    600000,
    TRUE,
    'SF_GOAL_2026_MEDICAL'
  ),
  -- Automotive: $2M target, $450K closed
  (
    'aaaaaaaa-0001-0001-0001-000000000006',
    'aaaaaaaa-0001-0001-0001-000000000002',
    'Automotive New ARR',
    'revenue',
    'new_arr',
    'Automotive',
    2000000,
    2026,
    450000,
    TRUE,
    'SF_GOAL_2026_AUTO'
  ),
  -- Industrial: $1.5M target, $350K closed
  (
    'aaaaaaaa-0001-0001-0001-000000000007',
    'aaaaaaaa-0001-0001-0001-000000000002',
    'Industrial New ARR',
    'revenue',
    'new_arr',
    'Industrial',
    1500000,
    2026,
    350000,
    TRUE,
    'SF_GOAL_2026_INDUSTRIAL'
  );

-- Separate Goal: New Logos
INSERT INTO goals (goal_id, name, goal_type, target_value, target_year, current_value)
VALUES (
  'aaaaaaaa-0001-0001-0001-000000000010',
  '2026 New Logos',
  'logos',
  8,  -- 8 new logos
  2026,
  2   -- 2 closed so far
);

-- Logo goals by vertical
INSERT INTO goals (goal_id, parent_goal_id, name, goal_type, vertical, target_value, target_year, current_value)
VALUES
  (
    'aaaaaaaa-0001-0001-0001-000000000011',
    'aaaaaaaa-0001-0001-0001-000000000010',
    'Medical New Logos',
    'logos',
    'Medical',
    3,
    2026,
    1
  ),
  (
    'aaaaaaaa-0001-0001-0001-000000000012',
    'aaaaaaaa-0001-0001-0001-000000000010',
    'Automotive New Logos',
    'logos',
    'Automotive',
    3,
    2026,
    1
  ),
  (
    'aaaaaaaa-0001-0001-0001-000000000013',
    'aaaaaaaa-0001-0001-0001-000000000010',
    'Industrial New Logos',
    'logos',
    'Industrial',
    2,
    2026,
    0
  );

-- ============================================
-- SEED DATA: Goal Progress (Simulated History)
-- ============================================
INSERT INTO goal_progress (goal_id, recorded_at, total_closed, platform_originated, active_pipeline)
VALUES
  -- Total Revenue progress
  ('aaaaaaaa-0001-0001-0001-000000000001', '2026-01-01', 2100000, 840000, 3200000),

  -- New ARR progress
  ('aaaaaaaa-0001-0001-0001-000000000002', '2026-01-01', 1400000, 560000, 2400000),

  -- Medical progress
  ('aaaaaaaa-0001-0001-0001-000000000005', '2026-01-01', 600000, 350000, 900000),

  -- Automotive progress
  ('aaaaaaaa-0001-0001-0001-000000000006', '2026-01-01', 450000, 150000, 800000),

  -- Industrial progress
  ('aaaaaaaa-0001-0001-0001-000000000007', '2026-01-01', 350000, 60000, 700000);

-- ============================================
-- SEED DATA: Link Campaigns to Goals
-- ============================================
-- Link existing campaigns to goals (if campaigns exist)
INSERT INTO campaign_goals (campaign_id, goal_id, allocation_type, allocated_value)
SELECT
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',  -- Medical Device Campaign
  'aaaaaaaa-0001-0001-0001-000000000005',  -- Medical New ARR goal
  'allocated',
  1000000  -- $1M allocated from the $2.5M goal
WHERE EXISTS (SELECT 1 FROM campaigns WHERE campaign_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');

INSERT INTO campaign_goals (campaign_id, goal_id, allocation_type)
SELECT
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',  -- CRA Compliance Campaign
  'aaaaaaaa-0001-0001-0001-000000000002',  -- New ARR goal (attributed, not allocated)
  'attributed'
WHERE EXISTS (SELECT 1 FROM campaigns WHERE campaign_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb');

-- ============================================
-- HELPER VIEW: Goals with Rollup Calculations
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
