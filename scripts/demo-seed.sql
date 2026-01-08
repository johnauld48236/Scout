-- Demo Environment Seed Data
-- 3 Demo Accounts showcasing different health states
-- Uses valid UUID format

-- ============================================================================
-- ACCOUNT 1: Apex Manufacturing (CRITICAL Health - At Risk)
-- UUID Pattern: 00000000-0000-0000-0001-xxxxxxxxxxxx
-- ============================================================================
INSERT INTO account_plans (
  account_plan_id, account_name, industry, headquarters, employee_count, website,
  account_type, nps_score, csat_score, account_thesis, is_favorite, in_weekly_review
) VALUES (
  '00000000-0000-0000-0001-000000000001',
  'Apex Manufacturing',
  'Manufacturing',
  'Detroit, MI',
  '2500',
  'https://apex-mfg.example.com',
  'enterprise',
  -15,
  55,
  'Large manufacturing account with significant adoption issues. Critical escalations around production module performance.',
  true,
  true
);

-- Apex Stakeholders
INSERT INTO stakeholders (stakeholder_id, account_plan_id, full_name, title, email, influence_level, engagement_level) VALUES
('00000000-0000-0000-0001-000000000101', '00000000-0000-0000-0001-000000000001', 'Marcus Chen', 'VP Operations', 'mchen@apex-mfg.example.com', 'high', 'disengaged'),
('00000000-0000-0000-0001-000000000102', '00000000-0000-0000-0001-000000000001', 'Sarah Johnson', 'IT Director', 'sjohnson@apex-mfg.example.com', 'high', 'medium'),
('00000000-0000-0000-0001-000000000103', '00000000-0000-0000-0001-000000000001', 'Tom Rivera', 'Plant Manager', 'trivera@apex-mfg.example.com', 'medium', 'low'),
('00000000-0000-0000-0001-000000000104', '00000000-0000-0000-0001-000000000001', 'Lisa Park', 'System Admin', 'lpark@apex-mfg.example.com', 'low', 'high');

-- Apex Divisions
INSERT INTO account_divisions (division_id, account_plan_id, name, division_type, sort_order) VALUES
('00000000-0000-0000-0001-000000000201', '00000000-0000-0000-0001-000000000001', 'Apex Manufacturing Corp', 'corporate', 1),
('00000000-0000-0000-0001-000000000202', '00000000-0000-0000-0001-000000000001', 'Detroit Plant', 'business_unit', 2),
('00000000-0000-0000-0001-000000000203', '00000000-0000-0000-0001-000000000001', 'Chicago Distribution', 'business_unit', 3);

-- Apex Risks (Hazards in Vector In)
INSERT INTO risks (risk_id, account_plan_id, title, description, severity, status, target_date) VALUES
('00000000-0000-0000-0001-000000000301', '00000000-0000-0000-0001-000000000001', 'Executive sponsor departure', 'VP Ops considering leaving - our main champion', 'critical', 'open', NOW() + INTERVAL '14 days'),
('00000000-0000-0000-0001-000000000302', '00000000-0000-0000-0001-000000000001', 'Production module performance degrading', 'Response times increased 300% since last update', 'critical', 'open', NOW() + INTERVAL '7 days'),
('00000000-0000-0000-0001-000000000303', '00000000-0000-0000-0001-000000000001', 'Competitor demo scheduled', 'Competitor scheduled demo for Feb 15', 'high', 'open', NOW() + INTERVAL '21 days');

-- Apex Pain Points (Field Requests in Vector In)
INSERT INTO pain_points (pain_point_id, account_plan_id, title, description, severity, status, target_date) VALUES
('00000000-0000-0000-0001-000000000401', '00000000-0000-0000-0001-000000000001', 'API integration failures', 'ERP integration breaking multiple times per week', 'critical', 'active', NOW() + INTERVAL '7 days'),
('00000000-0000-0000-0001-000000000402', '00000000-0000-0000-0001-000000000001', 'Report generation slow', 'Monthly reports taking 4+ hours to generate', 'significant', 'active', NOW() + INTERVAL '14 days'),
('00000000-0000-0000-0001-000000000403', '00000000-0000-0000-0001-000000000001', 'Mobile app crashes', 'Floor managers unable to use mobile app reliably', 'moderate', 'active', NULL);

-- Apex Missions (Vector In themes)
INSERT INTO scout_themes (theme_id, account_plan_id, title, description, vector, health_impact, status, questions_to_explore) VALUES
('00000000-0000-0000-0001-000000000501', '00000000-0000-0000-0001-000000000001', 'Q1 Stabilization', 'Emergency stabilization effort to address critical issues before renewal', 'in', 'high', 'active', ARRAY['What is the root cause of API failures?', 'Can we expedite the performance fix?', 'Who should own the escalation?']),
('00000000-0000-0000-0001-000000000502', '00000000-0000-0000-0001-000000000001', 'Executive Re-engagement', 'Rebuild executive relationship before sponsor leaves', 'in', 'high', 'exploring', ARRAY['Who else can champion internally?', 'What value proof do we need to show?']);

-- Apex Action Items
INSERT INTO action_items (action_id, account_plan_id, title, priority, status, due_date, bucket) VALUES
('00000000-0000-0000-0001-000000000601', '00000000-0000-0000-0001-000000000001', 'Emergency call with IT Director', 'P1', 'in_progress', NOW() - INTERVAL '2 days', '30'),
('00000000-0000-0000-0001-000000000602', '00000000-0000-0000-0001-000000000001', 'Escalate to engineering leadership', 'P1', 'pending', NOW() + INTERVAL '1 day', '30'),
('00000000-0000-0000-0001-000000000603', '00000000-0000-0000-0001-000000000001', 'Prepare QBR deck with improvement plan', 'P2', 'pending', NOW() + INTERVAL '7 days', '30'),
('00000000-0000-0000-0001-000000000604', '00000000-0000-0000-0001-000000000001', 'Schedule executive sponsor meeting', 'P1', 'pending', NOW() + INTERVAL '3 days', '30');

-- ============================================================================
-- ACCOUNT 2: Meridian Health (HEALTHY - Expansion Opportunity)
-- UUID Pattern: 00000000-0000-0000-0002-xxxxxxxxxxxx
-- ============================================================================
INSERT INTO account_plans (
  account_plan_id, account_name, industry, headquarters, employee_count, website,
  account_type, nps_score, csat_score, account_thesis, is_favorite, in_weekly_review
) VALUES (
  '00000000-0000-0000-0002-000000000001',
  'Meridian Health Systems',
  'Healthcare',
  'Boston, MA',
  '8000',
  'https://meridianhealth.example.com',
  'strategic',
  72,
  92,
  'Strategic healthcare account with strong adoption. Multiple expansion opportunities across their network.',
  true,
  false
);

-- Meridian Stakeholders
INSERT INTO stakeholders (stakeholder_id, account_plan_id, full_name, title, email, influence_level, engagement_level) VALUES
('00000000-0000-0000-0002-000000000101', '00000000-0000-0000-0002-000000000001', 'Dr. Amanda Foster', 'CMIO', 'afoster@meridianhealth.example.com', 'high', 'high'),
('00000000-0000-0000-0002-000000000102', '00000000-0000-0000-0002-000000000001', 'James Liu', 'CIO', 'jliu@meridianhealth.example.com', 'high', 'high'),
('00000000-0000-0000-0002-000000000103', '00000000-0000-0000-0002-000000000001', 'Rebecca Torres', 'VP Clinical Operations', 'rtorres@meridianhealth.example.com', 'high', 'medium'),
('00000000-0000-0000-0002-000000000104', '00000000-0000-0000-0002-000000000001', 'Michael Brown', 'IT Manager', 'mbrown@meridianhealth.example.com', 'medium', 'high'),
('00000000-0000-0000-0002-000000000105', '00000000-0000-0000-0002-000000000001', 'Dr. Kevin Patel', 'Department Head, Cardiology', 'kpatel@meridianhealth.example.com', 'medium', 'high');

-- Meridian Divisions
INSERT INTO account_divisions (division_id, account_plan_id, name, division_type, sort_order) VALUES
('00000000-0000-0000-0002-000000000201', '00000000-0000-0000-0002-000000000001', 'Meridian Health Systems', 'corporate', 1),
('00000000-0000-0000-0002-000000000202', '00000000-0000-0000-0002-000000000001', 'Boston Medical Center', 'business_unit', 2),
('00000000-0000-0000-0002-000000000203', '00000000-0000-0000-0002-000000000001', 'Cambridge Community Hospital', 'business_unit', 3),
('00000000-0000-0000-0002-000000000204', '00000000-0000-0000-0002-000000000001', 'Meridian Specialty Clinics', 'business_unit', 4);

-- Meridian Pursuits (Vector Out opportunities)
INSERT INTO pursuits (pursuit_id, account_plan_id, name, stage, estimated_value, target_close_date, deal_type) VALUES
('00000000-0000-0000-0002-000000000301', '00000000-0000-0000-0002-000000000001', 'Cambridge Hospital Expansion', 'Proposal', 450000, NOW() + INTERVAL '45 days', 'expansion'),
('00000000-0000-0000-0002-000000000302', '00000000-0000-0000-0002-000000000001', 'Cardiology Department Add-on', 'Discovery', 180000, NOW() + INTERVAL '60 days', 'cross_sell'),
('00000000-0000-0000-0002-000000000303', '00000000-0000-0000-0002-000000000001', 'Specialty Clinics Phase 2', 'Negotiation', 320000, NOW() + INTERVAL '30 days', 'expansion');

-- Meridian Trails (Vector Out themes)
INSERT INTO scout_themes (theme_id, account_plan_id, title, description, vector, size, status, questions_to_explore, linked_pursuit_id) VALUES
('00000000-0000-0000-0002-000000000401', '00000000-0000-0000-0002-000000000001', 'Network-wide Rollout', 'Expand deployment to all 12 facilities in the network', 'out', 'high', 'active', ARRAY['What is the rollout timeline preference?', 'Which facilities are highest priority?', 'Budget approval process?'], '00000000-0000-0000-0002-000000000301'),
('00000000-0000-0000-0002-000000000402', '00000000-0000-0000-0002-000000000001', 'Cardiology Integration', 'Deep integration with cardiology workflow systems', 'out', 'medium', 'exploring', ARRAY['What workflows are most critical?', 'Integration requirements?', 'Who are the key clinical champions?'], '00000000-0000-0000-0002-000000000302');

-- Meridian Missions (Vector In themes) - minimal since healthy
INSERT INTO scout_themes (theme_id, account_plan_id, title, description, vector, health_impact, status, questions_to_explore) VALUES
('00000000-0000-0000-0002-000000000403', '00000000-0000-0000-0002-000000000001', 'Power User Program', 'Establish super-user program for knowledge transfer', 'in', 'low', 'active', ARRAY['Who are candidates for power users?', 'What training do they need?']);

-- Meridian Action Items
INSERT INTO action_items (action_id, account_plan_id, title, priority, status, due_date, bucket) VALUES
('00000000-0000-0000-0002-000000000501', '00000000-0000-0000-0002-000000000001', 'Prepare Cambridge expansion proposal', 'P2', 'in_progress', NOW() + INTERVAL '7 days', '30'),
('00000000-0000-0000-0002-000000000502', '00000000-0000-0000-0002-000000000001', 'Schedule QBR with CMIO', 'P2', 'pending', NOW() + INTERVAL '14 days', '60'),
('00000000-0000-0000-0002-000000000503', '00000000-0000-0000-0002-000000000001', 'Demo new features to Cardiology team', 'P2', 'pending', NOW() + INTERVAL '21 days', '90');

-- Meridian Pain Points (minimal - healthy account)
INSERT INTO pain_points (pain_point_id, account_plan_id, title, description, severity, status) VALUES
('00000000-0000-0000-0002-000000000601', '00000000-0000-0000-0002-000000000001', 'Minor UI feedback', 'Users requested dark mode option', 'minor', 'active');

-- ============================================================================
-- ACCOUNT 3: Cobalt Systems (MONITOR - Mixed Signals)
-- UUID Pattern: 00000000-0000-0000-0003-xxxxxxxxxxxx
-- ============================================================================
INSERT INTO account_plans (
  account_plan_id, account_name, industry, headquarters, employee_count, website,
  account_type, nps_score, csat_score, account_thesis, is_favorite, in_weekly_review
) VALUES (
  '00000000-0000-0000-0003-000000000001',
  'Cobalt Systems Inc',
  'Technology',
  'Austin, TX',
  '1200',
  'https://cobaltsystems.example.com',
  'growth',
  35,
  72,
  'Growing tech company with mixed engagement. Some departments thriving, others underutilizing. Key renewal coming in Q2.',
  false,
  true
);

-- Cobalt Stakeholders
INSERT INTO stakeholders (stakeholder_id, account_plan_id, full_name, title, email, influence_level, engagement_level) VALUES
('00000000-0000-0000-0003-000000000101', '00000000-0000-0000-0003-000000000001', 'David Kim', 'VP Engineering', 'dkim@cobaltsystems.example.com', 'high', 'medium'),
('00000000-0000-0000-0003-000000000102', '00000000-0000-0000-0003-000000000001', 'Jennifer Walsh', 'Director of Product', 'jwalsh@cobaltsystems.example.com', 'medium', 'high'),
('00000000-0000-0000-0003-000000000103', '00000000-0000-0000-0003-000000000001', 'Carlos Mendez', 'IT Lead', 'cmendez@cobaltsystems.example.com', 'medium', 'low'),
('00000000-0000-0000-0003-000000000104', '00000000-0000-0000-0003-000000000001', 'Amy Chen', 'Project Manager', 'achen@cobaltsystems.example.com', 'low', 'high');

-- Cobalt Divisions
INSERT INTO account_divisions (division_id, account_plan_id, name, division_type, sort_order) VALUES
('00000000-0000-0000-0003-000000000201', '00000000-0000-0000-0003-000000000001', 'Cobalt Systems Inc', 'corporate', 1),
('00000000-0000-0000-0003-000000000202', '00000000-0000-0000-0003-000000000001', 'Engineering', 'department', 2),
('00000000-0000-0000-0003-000000000203', '00000000-0000-0000-0003-000000000001', 'Product Team', 'department', 3);

-- Cobalt Risks
INSERT INTO risks (risk_id, account_plan_id, title, description, severity, status, target_date) VALUES
('00000000-0000-0000-0003-000000000301', '00000000-0000-0000-0003-000000000001', 'Renewal at risk', 'Engineering team pushing for competitive evaluation', 'high', 'open', NOW() + INTERVAL '30 days'),
('00000000-0000-0000-0003-000000000302', '00000000-0000-0000-0003-000000000001', 'Low adoption in Engineering', 'Only 40% of Engineering licenses actively used', 'medium', 'open', NOW() + INTERVAL '45 days');

-- Cobalt Pain Points
INSERT INTO pain_points (pain_point_id, account_plan_id, title, description, severity, status, target_date) VALUES
('00000000-0000-0000-0003-000000000401', '00000000-0000-0000-0003-000000000001', 'SSO integration incomplete', 'Engineering team blocked on SSO setup', 'significant', 'active', NOW() + INTERVAL '14 days'),
('00000000-0000-0000-0003-000000000402', '00000000-0000-0000-0003-000000000001', 'API rate limits', 'Product team hitting rate limits during peak', 'moderate', 'active', NOW() + INTERVAL '21 days');

-- Cobalt Pursuits
INSERT INTO pursuits (pursuit_id, account_plan_id, name, stage, estimated_value, target_close_date, deal_type) VALUES
('00000000-0000-0000-0003-000000000501', '00000000-0000-0000-0003-000000000001', 'Renewal + True-up', 'Negotiation', 95000, NOW() + INTERVAL '60 days', 'renewal');

-- Cobalt Trails
INSERT INTO scout_themes (theme_id, account_plan_id, title, description, vector, size, status, questions_to_explore) VALUES
('00000000-0000-0000-0003-000000000601', '00000000-0000-0000-0003-000000000001', 'Engineering Adoption Push', 'Drive adoption in Engineering before renewal', 'out', 'medium', 'active', ARRAY['Who are the blockers?', 'What would make them successful?', 'Can we get executive sponsorship?']);

-- Cobalt Missions
INSERT INTO scout_themes (theme_id, account_plan_id, title, description, vector, health_impact, status, questions_to_explore) VALUES
('00000000-0000-0000-0003-000000000602', '00000000-0000-0000-0003-000000000001', 'SSO Resolution', 'Unblock Engineering team on SSO', 'in', 'medium', 'active', ARRAY['What is blocking the SSO integration?', 'Do we need to involve their IT?']),
('00000000-0000-0000-0003-000000000603', '00000000-0000-0000-0003-000000000001', 'Adoption Workshop', 'Run adoption workshop for Engineering team', 'in', 'medium', 'exploring', ARRAY['When can we schedule?', 'Who should attend?', 'What content to cover?']);

-- Cobalt Action Items
INSERT INTO action_items (action_id, account_plan_id, title, priority, status, due_date, bucket) VALUES
('00000000-0000-0000-0003-000000000701', '00000000-0000-0000-0003-000000000001', 'Debug SSO integration with Carlos', 'P1', 'in_progress', NOW() + INTERVAL '3 days', '30'),
('00000000-0000-0000-0003-000000000702', '00000000-0000-0000-0003-000000000001', 'Schedule adoption workshop', 'P2', 'pending', NOW() + INTERVAL '10 days', '30'),
('00000000-0000-0000-0003-000000000703', '00000000-0000-0000-0003-000000000001', 'Prepare renewal proposal', 'P2', 'pending', NOW() + INTERVAL '21 days', '60'),
('00000000-0000-0000-0003-000000000704', '00000000-0000-0000-0003-000000000001', 'Meet with VP Engineering', 'P1', 'pending', NOW() + INTERVAL '7 days', '30');

-- ============================================================================
-- Account Signals for Intelligence
-- ============================================================================
INSERT INTO account_signals (signal_id, account_plan_id, title, signal_type, signal_date, source) VALUES
('00000000-0000-0000-0001-000000000901', '00000000-0000-0000-0001-000000000001', 'Support ticket volume up 40%', 'risk', NOW() - INTERVAL '5 days', 'zendesk'),
('00000000-0000-0000-0001-000000000902', '00000000-0000-0000-0001-000000000001', 'VP Ops updated LinkedIn - exploring opportunities', 'org_change', NOW() - INTERVAL '3 days', 'linkedin'),
('00000000-0000-0000-0002-000000000901', '00000000-0000-0000-0002-000000000001', 'Press release: Meridian expanding to 3 new facilities', 'expansion', NOW() - INTERVAL '10 days', 'news'),
('00000000-0000-0000-0002-000000000902', '00000000-0000-0000-0002-000000000001', 'CMIO speaking at healthcare conference about our solution', 'reference', NOW() - INTERVAL '7 days', 'conference'),
('00000000-0000-0000-0003-000000000901', '00000000-0000-0000-0003-000000000001', 'Competitive RFP published on procurement site', 'competitor', NOW() - INTERVAL '14 days', 'procurement');

-- ============================================================================
-- DONE! Demo data loaded.
-- ============================================================================
