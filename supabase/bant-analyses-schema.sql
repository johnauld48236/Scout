-- ============================================
-- BANT ANALYSES TABLE
-- Tracks qualification health over time
-- ============================================

CREATE TABLE IF NOT EXISTS bant_analyses (
  bant_analysis_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pursuit_id UUID NOT NULL REFERENCES pursuits(pursuit_id) ON DELETE CASCADE,
  analysis_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- BANT Scores (0, 15, or 25 per dimension = max 100)
  budget_score INTEGER DEFAULT 0 CHECK (budget_score IN (0, 15, 25)),
  budget_evidence TEXT,
  budget_notes TEXT,

  authority_score INTEGER DEFAULT 0 CHECK (authority_score IN (0, 15, 25)),
  authority_evidence TEXT,
  authority_notes TEXT,

  need_score INTEGER DEFAULT 0 CHECK (need_score IN (0, 15, 25)),
  need_evidence TEXT,
  need_notes TEXT,

  timeline_score INTEGER DEFAULT 0 CHECK (timeline_score IN (0, 15, 25)),
  timeline_evidence TEXT,
  timeline_notes TEXT,

  -- Metadata
  analysis_source VARCHAR(100), -- 'Call', 'Email', 'Meeting', 'Quick Edit', etc.
  key_gaps TEXT,
  recommended_actions TEXT,

  -- Methodology support (for non-BANT frameworks)
  methodology VARCHAR(50) DEFAULT 'BANT',
  criteria_scores JSONB,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_bant_analyses_pursuit ON bant_analyses(pursuit_id);
CREATE INDEX IF NOT EXISTS idx_bant_analyses_date ON bant_analyses(analysis_date DESC);

-- Enable RLS
ALTER TABLE bant_analyses ENABLE ROW LEVEL SECURITY;

-- RLS Policies (allow all operations for authenticated users)
CREATE POLICY "Allow all for authenticated users" ON bant_analyses
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- Also allow anon for development
CREATE POLICY "Allow all for anon" ON bant_analyses
  FOR ALL TO anon
  USING (true)
  WITH CHECK (true);

-- Comments
COMMENT ON TABLE bant_analyses IS 'Tracks BANT qualification scores over time for pursuits';
COMMENT ON COLUMN bant_analyses.budget_score IS '0=No/Unknown, 15=Partial, 25=Yes/Confirmed';
COMMENT ON COLUMN bant_analyses.methodology IS 'Sales methodology: BANT, MEDDICC, MEDDPICC, SPIN, Challenger, Custom';
