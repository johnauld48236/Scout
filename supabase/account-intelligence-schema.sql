-- ============================================
-- ACCOUNT INTELLIGENCE SCHEMA - Phase 1
-- Adds pain points, engagement logs, stakeholder
-- enhancements, and messaging playbook
-- ============================================

-- 1. Pain Points - First-class signals with severity, source, verbatims
CREATE TABLE IF NOT EXISTS pain_points (
  pain_point_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_plan_id UUID NOT NULL REFERENCES account_plans(account_plan_id) ON DELETE CASCADE,
  pursuit_id UUID REFERENCES pursuits(pursuit_id) ON DELETE SET NULL,
  stakeholder_id UUID REFERENCES stakeholders(stakeholder_id) ON DELETE SET NULL,

  -- Core content
  description TEXT NOT NULL,
  verbatim TEXT,                    -- Exact quote from conversation
  impact TEXT,                      -- Business impact description

  -- Classification
  severity VARCHAR(20) DEFAULT 'significant',  -- 'critical', 'significant', 'moderate', 'minor'
  category VARCHAR(50),             -- 'process', 'tool', 'resource', 'compliance', 'cost', 'time'
  bant_dimension VARCHAR(1),        -- Which BANT dimension this affects: 'B', 'A', 'N', 'T'

  -- Source tracking
  source_type VARCHAR(30),          -- 'call', 'meeting', 'email', 'conference', 'document', 'demo'
  source_date DATE,
  engagement_log_id UUID,           -- Link to specific engagement (added after engagement_logs created)

  -- Status
  status VARCHAR(20) DEFAULT 'active',  -- 'active', 'addressed', 'dormant', 'invalid'
  addressed_date DATE,
  addressed_notes TEXT,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for pain_points
CREATE INDEX IF NOT EXISTS idx_pain_points_account ON pain_points(account_plan_id);
CREATE INDEX IF NOT EXISTS idx_pain_points_pursuit ON pain_points(pursuit_id);
CREATE INDEX IF NOT EXISTS idx_pain_points_severity ON pain_points(severity);
CREATE INDEX IF NOT EXISTS idx_pain_points_status ON pain_points(status);

-- RLS for pain_points
ALTER TABLE pain_points ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON pain_points;
CREATE POLICY "Allow all for authenticated users" ON pain_points
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Allow all for anon" ON pain_points;
CREATE POLICY "Allow all for anon" ON pain_points
  FOR ALL TO anon USING (true) WITH CHECK (true);


-- 2. Engagement Logs - Call/meeting history with outcomes
CREATE TABLE IF NOT EXISTS engagement_logs (
  engagement_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_plan_id UUID NOT NULL REFERENCES account_plans(account_plan_id) ON DELETE CASCADE,
  pursuit_id UUID REFERENCES pursuits(pursuit_id) ON DELETE SET NULL,

  -- Engagement details
  engagement_type VARCHAR(30) NOT NULL,  -- 'call', 'meeting', 'email', 'conference', 'demo', 'presentation'
  engagement_date DATE NOT NULL,
  duration_minutes INTEGER,
  location TEXT,                    -- 'Zoom', 'On-site', 'Conference booth', etc.

  -- Content
  title TEXT,
  summary TEXT,
  key_moments TEXT,                 -- Bullet points of important moments
  outcome TEXT,                     -- What was the result
  next_steps TEXT,                  -- Agreed next steps

  -- Recording/transcript
  recording_url TEXT,
  transcript TEXT,                  -- Full transcript for AI processing

  -- Attendees (our side)
  our_attendees TEXT[],             -- Array of names from our team

  -- Metadata
  created_by TEXT,                  -- Who logged this
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Junction table for engagement attendees (stakeholders)
CREATE TABLE IF NOT EXISTS engagement_attendees (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  engagement_id UUID NOT NULL REFERENCES engagement_logs(engagement_id) ON DELETE CASCADE,
  stakeholder_id UUID NOT NULL REFERENCES stakeholders(stakeholder_id) ON DELETE CASCADE,
  role_in_meeting VARCHAR(50),      -- 'presenter', 'decision_maker', 'observer', 'technical'
  notes TEXT,
  UNIQUE(engagement_id, stakeholder_id)
);

-- Indexes for engagement_logs
CREATE INDEX IF NOT EXISTS idx_engagement_logs_account ON engagement_logs(account_plan_id);
CREATE INDEX IF NOT EXISTS idx_engagement_logs_pursuit ON engagement_logs(pursuit_id);
CREATE INDEX IF NOT EXISTS idx_engagement_logs_date ON engagement_logs(engagement_date DESC);
CREATE INDEX IF NOT EXISTS idx_engagement_logs_type ON engagement_logs(engagement_type);

CREATE INDEX IF NOT EXISTS idx_engagement_attendees_engagement ON engagement_attendees(engagement_id);
CREATE INDEX IF NOT EXISTS idx_engagement_attendees_stakeholder ON engagement_attendees(stakeholder_id);

-- RLS for engagement_logs
ALTER TABLE engagement_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON engagement_logs;
CREATE POLICY "Allow all for authenticated users" ON engagement_logs
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Allow all for anon" ON engagement_logs;
CREATE POLICY "Allow all for anon" ON engagement_logs
  FOR ALL TO anon USING (true) WITH CHECK (true);

-- RLS for engagement_attendees
ALTER TABLE engagement_attendees ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON engagement_attendees;
CREATE POLICY "Allow all for authenticated users" ON engagement_attendees
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Allow all for anon" ON engagement_attendees;
CREATE POLICY "Allow all for anon" ON engagement_attendees
  FOR ALL TO anon USING (true) WITH CHECK (true);


-- 3. Stakeholder Enhancements - Add relationship depth fields
ALTER TABLE stakeholders
ADD COLUMN IF NOT EXISTS relationship_strength VARCHAR(20) DEFAULT 'unknown',  -- 'strong', 'warm', 'cold', 'unknown'
ADD COLUMN IF NOT EXISTS relationship_history TEXT,          -- 'former customer', 'conference contact', 'cold outreach', etc.
ADD COLUMN IF NOT EXISTS purchasing_authority VARCHAR(30),   -- 'decision_maker', 'influencer', 'blocker', 'user', 'evaluator', 'champion'
ADD COLUMN IF NOT EXISTS last_contact_date DATE,
ADD COLUMN IF NOT EXISTS preferred_contact_method VARCHAR(20),  -- 'email', 'phone', 'linkedin', 'text'
ADD COLUMN IF NOT EXISTS key_concerns TEXT,                  -- Their main priorities/worries
ADD COLUMN IF NOT EXISTS communication_style TEXT;           -- Notes on how to communicate with them


-- 4. Stakeholder Relationships - Who knows who, influence paths
CREATE TABLE IF NOT EXISTS stakeholder_relationships (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  from_stakeholder_id UUID NOT NULL REFERENCES stakeholders(stakeholder_id) ON DELETE CASCADE,
  to_stakeholder_id UUID NOT NULL REFERENCES stakeholders(stakeholder_id) ON DELETE CASCADE,

  relationship_type VARCHAR(30),    -- 'reports_to', 'peers_with', 'influences', 'knows', 'introduced_by'
  strength VARCHAR(20),             -- 'strong', 'moderate', 'weak'
  notes TEXT,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(from_stakeholder_id, to_stakeholder_id, relationship_type)
);

CREATE INDEX IF NOT EXISTS idx_stakeholder_relationships_from ON stakeholder_relationships(from_stakeholder_id);
CREATE INDEX IF NOT EXISTS idx_stakeholder_relationships_to ON stakeholder_relationships(to_stakeholder_id);

-- RLS for stakeholder_relationships
ALTER TABLE stakeholder_relationships ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON stakeholder_relationships;
CREATE POLICY "Allow all for authenticated users" ON stakeholder_relationships
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Allow all for anon" ON stakeholder_relationships;
CREATE POLICY "Allow all for anon" ON stakeholder_relationships
  FOR ALL TO anon USING (true) WITH CHECK (true);


-- 5. Messaging Playbook - What works, what doesn't, per account
ALTER TABLE account_plans
ADD COLUMN IF NOT EXISTS messaging_playbook JSONB DEFAULT '{
  "what_lands": [],
  "what_to_avoid": [],
  "proof_points_needed": [],
  "common_objections": [],
  "key_verbatims": []
}'::jsonb;


-- 6. Account Review Cycle - Weekly review tracking
ALTER TABLE account_plans
ADD COLUMN IF NOT EXISTS review_cycle JSONB DEFAULT '{
  "in_review": false,
  "review_frequency": "weekly",
  "last_review_date": null,
  "next_review_date": null,
  "coaching_notes": [],
  "review_history": []
}'::jsonb,
ADD COLUMN IF NOT EXISTS account_tier VARCHAR(20),           -- 'strategic', 'growth', 'maintain', 'develop'
ADD COLUMN IF NOT EXISTS account_source TEXT,                -- How we got this account
ADD COLUMN IF NOT EXISTS account_owner TEXT;                 -- Primary owner name


-- 7. Add foreign key from pain_points to engagement_logs (now that both exist)
ALTER TABLE pain_points
ADD CONSTRAINT IF NOT EXISTS fk_pain_points_engagement
  FOREIGN KEY (engagement_log_id) REFERENCES engagement_logs(engagement_id) ON DELETE SET NULL;


-- 8. Verbatims/Quotes table - For key evidence capture
CREATE TABLE IF NOT EXISTS verbatims (
  verbatim_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_plan_id UUID NOT NULL REFERENCES account_plans(account_plan_id) ON DELETE CASCADE,
  engagement_id UUID REFERENCES engagement_logs(engagement_id) ON DELETE SET NULL,
  stakeholder_id UUID REFERENCES stakeholders(stakeholder_id) ON DELETE SET NULL,
  pursuit_id UUID REFERENCES pursuits(pursuit_id) ON DELETE SET NULL,

  quote TEXT NOT NULL,
  speaker_name TEXT,                -- In case stakeholder not in system
  context TEXT,                     -- What was being discussed
  category VARCHAR(30),             -- 'pain_point', 'objection', 'validation', 'requirement', 'champion_statement'

  quote_date DATE,
  source_type VARCHAR(30),          -- 'call', 'meeting', 'email', etc.

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_verbatims_account ON verbatims(account_plan_id);
CREATE INDEX IF NOT EXISTS idx_verbatims_stakeholder ON verbatims(stakeholder_id);
CREATE INDEX IF NOT EXISTS idx_verbatims_category ON verbatims(category);

-- RLS for verbatims
ALTER TABLE verbatims ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON verbatims;
CREATE POLICY "Allow all for authenticated users" ON verbatims
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Allow all for anon" ON verbatims;
CREATE POLICY "Allow all for anon" ON verbatims
  FOR ALL TO anon USING (true) WITH CHECK (true);


-- Comments
COMMENT ON TABLE pain_points IS 'First-class signals capturing customer pain with severity, source, and verbatims';
COMMENT ON TABLE engagement_logs IS 'Call and meeting history with outcomes, transcripts, and attendees';
COMMENT ON TABLE engagement_attendees IS 'Junction table linking engagements to stakeholder attendees';
COMMENT ON TABLE stakeholder_relationships IS 'Influence network - who knows who, reporting structure, influence paths';
COMMENT ON TABLE verbatims IS 'Key quotes and statements from stakeholders for evidence capture';
COMMENT ON COLUMN account_plans.messaging_playbook IS 'JSON: what_lands, what_to_avoid, proof_points_needed, common_objections, key_verbatims';
COMMENT ON COLUMN account_plans.review_cycle IS 'JSON: in_review, frequency, dates, coaching_notes, review_history';
COMMENT ON COLUMN stakeholders.relationship_strength IS 'Quality of relationship: strong, warm, cold, unknown';
COMMENT ON COLUMN stakeholders.purchasing_authority IS 'Role in buying: decision_maker, influencer, blocker, user, evaluator, champion';
