-- Planning Experience Schema Migration
-- Run this migration to add planning capabilities to account plans

-- =====================================================
-- ACCOUNT PLANS TABLE ADDITIONS
-- =====================================================

-- Business units stored as JSONB array
-- Structure: [{ id, name, description, parent_id, products: [] }]
ALTER TABLE account_plans ADD COLUMN IF NOT EXISTS
  business_units JSONB DEFAULT '[]';

-- Signal mappings: maps research_finding ids to business_unit ids
-- Structure: { "finding_id": "business_unit_id", ... }
ALTER TABLE account_plans ADD COLUMN IF NOT EXISTS
  signal_mappings JSONB DEFAULT '{}';

-- Milestones for 30/60/90 day planning
-- Structure: { day_30: [{id, text, completed}], day_60: [...], day_90: [...] }
ALTER TABLE account_plans ADD COLUMN IF NOT EXISTS
  milestones JSONB DEFAULT '{"day_30": [], "day_60": [], "day_90": []}';

-- Plan status tracking
ALTER TABLE account_plans ADD COLUMN IF NOT EXISTS
  plan_status VARCHAR(20) DEFAULT 'draft';

-- Computed completeness score (0-100)
ALTER TABLE account_plans ADD COLUMN IF NOT EXISTS
  plan_completeness INTEGER DEFAULT 0;

-- Planning period dates
ALTER TABLE account_plans ADD COLUMN IF NOT EXISTS
  planning_period_start DATE;

ALTER TABLE account_plans ADD COLUMN IF NOT EXISTS
  planning_period_end DATE;

-- When the plan was activated
ALTER TABLE account_plans ADD COLUMN IF NOT EXISTS
  activated_at TIMESTAMP;

-- =====================================================
-- STAKEHOLDERS TABLE ADDITIONS
-- =====================================================

-- Flag for placeholder contacts (role needed but no name yet)
ALTER TABLE stakeholders ADD COLUMN IF NOT EXISTS
  is_placeholder BOOLEAN DEFAULT FALSE;

-- Role description for placeholders
ALTER TABLE stakeholders ADD COLUMN IF NOT EXISTS
  placeholder_role VARCHAR(255);

-- =====================================================
-- PURSUITS TABLE ADDITIONS
-- =====================================================

-- Link pursuit to a business unit
ALTER TABLE pursuits ADD COLUMN IF NOT EXISTS
  business_unit_id VARCHAR(100);

-- Why they should buy (value proposition for this opportunity)
ALTER TABLE pursuits ADD COLUMN IF NOT EXISTS
  thesis TEXT;

-- Link to research signals that support this opportunity
-- Structure: ["finding_id_1", "finding_id_2", ...]
ALTER TABLE pursuits ADD COLUMN IF NOT EXISTS
  signal_ids JSONB DEFAULT '[]';

-- Engagement plan for stakeholders in this opportunity
-- Structure: {
--   sequence: [
--     { stakeholder_id, order, role_in_deal, message, proof_needed, objections }
--   ]
-- }
ALTER TABLE pursuits ADD COLUMN IF NOT EXISTS
  engagement_plan JSONB;

-- =====================================================
-- ACTION ITEMS TABLE ADDITIONS
-- =====================================================

-- Week number for kanban grouping (1-12 for 90-day plan)
ALTER TABLE action_items ADD COLUMN IF NOT EXISTS
  week_number INTEGER;

-- Link to a specific milestone
ALTER TABLE action_items ADD COLUMN IF NOT EXISTS
  milestone_id VARCHAR(100);

-- =====================================================
-- PURSUIT-STAKEHOLDER JUNCTION TABLE
-- =====================================================

-- Many-to-many relationship between pursuits and stakeholders
-- Tracks which stakeholders are involved in which opportunities
CREATE TABLE IF NOT EXISTS pursuit_stakeholders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pursuit_id UUID REFERENCES pursuits(pursuit_id) ON DELETE CASCADE,
  stakeholder_id UUID REFERENCES stakeholders(stakeholder_id) ON DELETE CASCADE,
  role_in_deal VARCHAR(100), -- Champion, Decision Maker, Influencer, etc.
  engagement_order INTEGER, -- Order in engagement sequence
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(pursuit_id, stakeholder_id)
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_pursuit_stakeholders_pursuit
  ON pursuit_stakeholders(pursuit_id);
CREATE INDEX IF NOT EXISTS idx_pursuit_stakeholders_stakeholder
  ON pursuit_stakeholders(stakeholder_id);

-- =====================================================
-- COMMENTS FOR DOCUMENTATION
-- =====================================================

COMMENT ON COLUMN account_plans.business_units IS 'JSONB array of business units: [{id, name, description, parent_id, products}]';
COMMENT ON COLUMN account_plans.signal_mappings IS 'Maps research finding IDs to business unit IDs';
COMMENT ON COLUMN account_plans.milestones IS '30/60/90 day milestones: {day_30: [], day_60: [], day_90: []}';
COMMENT ON COLUMN account_plans.plan_status IS 'Plan status: draft, active, completed, archived';
COMMENT ON COLUMN account_plans.plan_completeness IS 'Computed completeness score 0-100';

COMMENT ON COLUMN stakeholders.is_placeholder IS 'True if this is a placeholder for a role we need to fill';
COMMENT ON COLUMN stakeholders.placeholder_role IS 'Description of the role for placeholder stakeholders';

COMMENT ON COLUMN pursuits.thesis IS 'Value proposition: why they should buy for this specific opportunity';
COMMENT ON COLUMN pursuits.signal_ids IS 'Array of research finding IDs that support this opportunity';
COMMENT ON COLUMN pursuits.engagement_plan IS 'Stakeholder engagement sequence and messaging';

COMMENT ON COLUMN action_items.week_number IS 'Week 1-12 for 90-day planning kanban';
COMMENT ON COLUMN action_items.milestone_id IS 'Links action to a specific milestone';

COMMENT ON TABLE pursuit_stakeholders IS 'Junction table linking stakeholders to opportunities';
