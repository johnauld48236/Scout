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
-- COMPANY PROFILE (singleton)
-- ============================================================================
INSERT INTO company_profile (
  id, company_name, industry, website, tagline, value_proposition,
  key_differentiators, ideal_customer_profile, target_verticals,
  products_services, competitors, avg_sales_cycle, typical_deal_size,
  sales_methodology
) VALUES (
  '00000000-0000-0000-0000-000000000001',
  'C2A Security',
  'Cybersecurity',
  'https://c2a-security.com',
  'Securing the Software-Defined Vehicle',
  'C2A Security delivers comprehensive automotive cybersecurity solutions that protect vehicles from design to deployment and throughout their lifecycle.',
  'Only end-to-end automotive cybersecurity platform covering DevSecOps to runtime protection; Deep OEM partnerships; ISO 21434 and UNECE compliance expertise',
  'Automotive OEMs and Tier 1 suppliers with 500+ employees developing connected vehicles, EVs, or ADAS features',
  ARRAY['Automotive', 'Transportation', 'EV Manufacturers', 'Tier 1 Suppliers'],
  'EVSec DevSecOps Platform, AutoSec Runtime Protection, Compliance Management Suite, Vehicle SOC',
  ARRAY['Upstream Security', 'Argus', 'Karamba Security', 'Harman'],
  '6-12 months',
  '$500K - $2M',
  'MEDDPICC'
);

-- ============================================================================
-- GOALS (2026 Targets)
-- ============================================================================
-- Master Revenue Goal
INSERT INTO goals (goal_id, name, goal_type, category, target_value, target_year, current_value, is_active) VALUES
('00000000-0000-0000-0000-000000000101', '2026 New Business Revenue', 'revenue', 'new_business', 8500000, 2026, 1250000, true);

-- Vertical Goals (children of master)
INSERT INTO goals (goal_id, parent_goal_id, name, goal_type, category, vertical, target_value, target_year, current_value, is_active) VALUES
('00000000-0000-0000-0000-000000000102', '00000000-0000-0000-0000-000000000101', 'Automotive OEM Revenue', 'revenue', 'new_business', 'Automotive', 5000000, 2026, 950000, true),
('00000000-0000-0000-0000-000000000103', '00000000-0000-0000-0000-000000000101', 'Tier 1 Supplier Revenue', 'revenue', 'new_business', 'Tier 1 Suppliers', 2500000, 2026, 200000, true),
('00000000-0000-0000-0000-000000000104', '00000000-0000-0000-0000-000000000101', 'EV Manufacturer Revenue', 'revenue', 'new_business', 'EV Manufacturers', 1000000, 2026, 100000, true);

-- Regional Goals
INSERT INTO goals (goal_id, parent_goal_id, name, goal_type, category, region, target_value, target_year, current_value, is_active) VALUES
('00000000-0000-0000-0000-000000000105', '00000000-0000-0000-0000-000000000101', 'North America Revenue', 'revenue', 'new_business', 'North America', 4500000, 2026, 750000, true),
('00000000-0000-0000-0000-000000000106', '00000000-0000-0000-0000-000000000101', 'EMEA Revenue', 'revenue', 'new_business', 'EMEA', 3000000, 2026, 400000, true),
('00000000-0000-0000-0000-000000000107', '00000000-0000-0000-0000-000000000101', 'APAC Revenue', 'revenue', 'new_business', 'APAC', 1000000, 2026, 100000, true);

-- Pipeline Goal
INSERT INTO goals (goal_id, name, goal_type, category, target_value, target_year, current_value, is_active) VALUES
('00000000-0000-0000-0000-000000000108', 'Q1 2026 Pipeline Target', 'pipeline', 'generation', 25000000, 2026, 8500000, true);

-- ============================================================================
-- CAMPAIGNS
-- ============================================================================
INSERT INTO campaigns (campaign_id, name, type, status, start_date, end_date, target_verticals, pipeline_goal, value_proposition, key_pain_points) VALUES
('00000000-0000-0000-0000-000000000201', 'UNECE R155 Compliance Push', 'compliance', 'active', '2026-01-01', '2026-06-30', ARRAY['Automotive', 'Tier 1 Suppliers'], 5000000, 'Be compliant before July 2026 deadline', 'Compliance deadline approaching; Audit failures; Manual TARA processes'),
('00000000-0000-0000-0000-000000000202', 'EV Security Initiative', 'vertical', 'active', '2026-01-01', '2026-12-31', ARRAY['EV Manufacturers'], 3000000, 'Purpose-built security for electric and autonomous vehicles', 'New attack surfaces in EVs; OTA update vulnerabilities; Charging infrastructure risks'),
('00000000-0000-0000-0000-000000000203', 'Tier 1 Expansion', 'account_based', 'planned', '2026-03-01', '2026-12-31', ARRAY['Tier 1 Suppliers'], 4000000, 'Security-by-design for component suppliers', 'OEM security requirements flowing down; Lack of automotive security expertise; Integration complexity');

-- ============================================================================
-- TAM ACCOUNTS (Prospects)
-- ============================================================================
INSERT INTO tam_accounts (tam_account_id, company_name, website, vertical, employee_count, headquarters, company_summary, fit_tier, fit_rationale, priority_score, estimated_deal_value, status) VALUES
-- High priority prospects
('00000000-0000-0000-0000-000000000301', 'Rivian Automotive', 'https://rivian.com', 'EV Manufacturers', '10000+', 'Irvine, CA', 'American electric vehicle manufacturer known for R1T pickup and R1S SUV. Strong focus on adventure vehicles with advanced software capabilities.', 'A', 'EV-native company with heavy software focus. Growing rapidly and building security team.', 95, 750000, 'Engaged'),
('00000000-0000-0000-0000-000000000302', 'Magna International', 'https://magna.com', 'Tier 1 Suppliers', '158000', 'Aurora, Ontario', 'Global automotive supplier with complete vehicle capabilities. Supplies to most major OEMs worldwide.', 'A', 'Tier 1 giant with multiple entry points. Already supplying cybersecurity to some OEMs.', 90, 1200000, 'Researching'),
('00000000-0000-0000-0000-000000000303', 'Lucid Motors', 'https://lucidmotors.com', 'EV Manufacturers', '7000', 'Newark, CA', 'Luxury EV manufacturer with industry-leading range and performance. Backed by Saudi PIF.', 'A', 'Premium positioning aligns with security focus. Building out platform security team.', 88, 650000, 'New'),
-- Medium priority
('00000000-0000-0000-0000-000000000304', 'ZF Friedrichshafen', 'https://zf.com', 'Tier 1 Suppliers', '150000', 'Friedrichshafen, Germany', 'Major Tier 1 supplier specializing in driveline and chassis technology. Strong in ADAS systems.', 'B', 'Large addressable market but entrenched with existing vendor. Need champion.', 75, 800000, 'New'),
('00000000-0000-0000-0000-000000000305', 'Canoo', 'https://canoo.com', 'EV Manufacturers', '800', 'Torrance, CA', 'Startup EV company with unique skateboard platform architecture. Focus on commercial vehicles.', 'B', 'Small team but greenfield opportunity. Budget may be constrained.', 70, 350000, 'New');

-- TAM Contacts
INSERT INTO tam_contacts (contact_id, tam_account_id, full_name, title, email, linkedin_url, notes) VALUES
('00000000-0000-0000-0000-000000000401', '00000000-0000-0000-0000-000000000301', 'Mark Wilson', 'VP Vehicle Software', 'mwilson@rivian.example.com', 'https://linkedin.com/in/markwilson', 'Met at CES 2025. Interested in security tooling.'),
('00000000-0000-0000-0000-000000000402', '00000000-0000-0000-0000-000000000301', 'Sarah Chen', 'Director of Security', 'schen@rivian.example.com', 'https://linkedin.com/in/sarahchen', 'Building out security org. Key decision maker.'),
('00000000-0000-0000-0000-000000000403', '00000000-0000-0000-0000-000000000302', 'Hans Mueller', 'Chief Security Officer', 'hmueller@magna.example.com', 'https://linkedin.com/in/hansmueller', 'Global remit. German-speaking.'),
('00000000-0000-0000-0000-000000000404', '00000000-0000-0000-0000-000000000303', 'Jennifer Park', 'VP Engineering', 'jpark@lucid.example.com', 'https://linkedin.com/in/jenniferpark', 'Ex-Tesla. Very technical.'),
('00000000-0000-0000-0000-000000000405', '00000000-0000-0000-0000-000000000304', 'Thomas Schneider', 'Head of ADAS Security', 'tschneider@zf.example.com', 'https://linkedin.com/in/thomasschneider', 'Owns security for ADAS division.');

-- TAM Warm Paths
INSERT INTO tam_warm_paths (warm_path_id, tam_account_id, connection_name, relationship_type, strength, notes) VALUES
('00000000-0000-0000-0000-000000000501', '00000000-0000-0000-0000-000000000301', 'David Kim (Board connection)', 'investor_intro', 'strong', 'David sits on Rivian board. Offered to make intro.'),
('00000000-0000-0000-0000-000000000502', '00000000-0000-0000-0000-000000000301', 'AutoTech Ventures', 'vc_portfolio', 'medium', 'Shared investor with portfolio companies.'),
('00000000-0000-0000-0000-000000000503', '00000000-0000-0000-0000-000000000302', 'BMW Partnership', 'customer_referral', 'strong', 'BMW can intro to Magna as they supply them.'),
('00000000-0000-0000-0000-000000000504', '00000000-0000-0000-0000-000000000303', 'Peter Rawlinson (CEO)', 'linkedin_connection', 'weak', 'CEO connected on LinkedIn. Engaged with our content.');

-- Campaign-TAM Account Links
INSERT INTO campaign_tam_accounts (campaign_id, tam_account_id, fit_score, fit_rationale) VALUES
('00000000-0000-0000-0000-000000000202', '00000000-0000-0000-0000-000000000301', 95, 'Perfect fit - EV native, software-first'),
('00000000-0000-0000-0000-000000000202', '00000000-0000-0000-0000-000000000303', 90, 'Premium EV, building security capabilities'),
('00000000-0000-0000-0000-000000000202', '00000000-0000-0000-0000-000000000305', 70, 'EV startup, budget concerns'),
('00000000-0000-0000-0000-000000000203', '00000000-0000-0000-0000-000000000302', 85, 'Large Tier 1, multiple entry points'),
('00000000-0000-0000-0000-000000000203', '00000000-0000-0000-0000-000000000304', 75, 'ADAS focus aligns with our strengths');

-- Campaign-Goal Links
INSERT INTO campaign_goals (campaign_id, goal_id, allocation_type, allocated_value) VALUES
('00000000-0000-0000-0000-000000000201', '00000000-0000-0000-0000-000000000102', 'attributed', 2000000),
('00000000-0000-0000-0000-000000000201', '00000000-0000-0000-0000-000000000103', 'attributed', 1500000),
('00000000-0000-0000-0000-000000000202', '00000000-0000-0000-0000-000000000104', 'primary', 1000000),
('00000000-0000-0000-0000-000000000203', '00000000-0000-0000-0000-000000000103', 'primary', 2500000);

-- ============================================================================
-- REVIEW NOTES (for Weekly Review)
-- ============================================================================
INSERT INTO review_notes (note_id, account_plan_id, note_text, note_type, is_resolved) VALUES
('00000000-0000-0000-0001-000000000801', '00000000-0000-0000-0001-000000000001', 'Escalation call scheduled with Engineering VP for Thursday', 'escalation', false),
('00000000-0000-0000-0001-000000000802', '00000000-0000-0000-0001-000000000001', 'Need to prep executive summary before QBR', 'action', false),
('00000000-0000-0000-0002-000000000801', '00000000-0000-0000-0002-000000000001', 'Cambridge expansion proposal looking strong - CMIO very supportive', 'positive', false),
('00000000-0000-0000-0003-000000000801', '00000000-0000-0000-0003-000000000001', 'SSO blocker may push renewal timeline - escalating to product', 'risk', false);

-- ============================================================================
-- ENGAGEMENT LOGS (Recent Activity)
-- ============================================================================
INSERT INTO engagement_logs (engagement_id, account_plan_id, engagement_type, engagement_date, title, summary, our_attendees) VALUES
('00000000-0000-0000-0001-000000000701', '00000000-0000-0000-0001-000000000001', 'call', NOW() - INTERVAL '3 days', 'Emergency Technical Review', 'Discussed production module issues. Customer escalated to VP level. Agreed to daily standups until resolved.', ARRAY['John (CSM)', 'Mike (Solutions Engineer)']),
('00000000-0000-0000-0002-000000000701', '00000000-0000-0000-0002-000000000001', 'meeting', NOW() - INTERVAL '7 days', 'Cambridge Expansion Planning', 'Walked through expansion timeline with CMIO and IT Director. Strong buy-in for Q2 deployment.', ARRAY['John (CSM)', 'Sarah (AE)']),
('00000000-0000-0000-0003-000000000701', '00000000-0000-0000-0003-000000000001', 'call', NOW() - INTERVAL '5 days', 'SSO Troubleshooting Session', 'Worked with Carlos on SSO integration. Identified config issue on their SAML setup.', ARRAY['John (CSM)']);

-- ============================================================================
-- DONE! Demo data loaded.
-- ============================================================================
