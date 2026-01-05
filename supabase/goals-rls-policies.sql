-- RLS Policies for Goals tables
-- Run this in Supabase SQL Editor

-- Disable RLS on goals tables (simplest approach for now)
ALTER TABLE goals DISABLE ROW LEVEL SECURITY;
ALTER TABLE goal_progress DISABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_goals DISABLE ROW LEVEL SECURITY;

-- Or if you want to keep RLS enabled with open policies:
-- ALTER TABLE goals ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Allow all access to goals" ON goals FOR ALL USING (true) WITH CHECK (true);

-- ALTER TABLE goal_progress ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Allow all access to goal_progress" ON goal_progress FOR ALL USING (true) WITH CHECK (true);

-- ALTER TABLE campaign_goals ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Allow all access to campaign_goals" ON campaign_goals FOR ALL USING (true) WITH CHECK (true);

-- Now re-run the seed data
DELETE FROM goal_progress;
DELETE FROM campaign_goals;
DELETE FROM goals;

-- Top Level: 2026 Total Revenue
INSERT INTO goals (goal_id, name, goal_type, target_value, target_year, current_value, sf_synced, sf_external_id)
VALUES (
  'aaaaaaaa-0001-0001-0001-000000000001',
  '2026 Total Revenue',
  'revenue',
  10000000,
  2026,
  2100000,
  TRUE,
  'SF_GOAL_2026_TOTAL'
);

-- Level 2: Revenue Categories
INSERT INTO goals (goal_id, parent_goal_id, name, goal_type, category, target_value, target_year, current_value, sf_synced, sf_external_id)
VALUES
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
  8,
  2026,
  2
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

-- Goal Progress (simulated history)
INSERT INTO goal_progress (goal_id, recorded_at, total_closed, platform_originated, active_pipeline)
VALUES
  ('aaaaaaaa-0001-0001-0001-000000000001', '2026-01-01', 2100000, 840000, 3200000),
  ('aaaaaaaa-0001-0001-0001-000000000002', '2026-01-01', 1400000, 560000, 2400000),
  ('aaaaaaaa-0001-0001-0001-000000000005', '2026-01-01', 600000, 350000, 900000),
  ('aaaaaaaa-0001-0001-0001-000000000006', '2026-01-01', 450000, 150000, 800000),
  ('aaaaaaaa-0001-0001-0001-000000000007', '2026-01-01', 350000, 60000, 700000);
