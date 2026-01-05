-- ============================================
-- INTELLIGENCE SIGNALS SCHEMA
-- For storing and tracking intelligence gathered from web research
-- ============================================

-- Intelligence signals table - stores individual signals found during scans
CREATE TABLE IF NOT EXISTS intelligence_signals (
  signal_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- What was found
  title VARCHAR(500) NOT NULL,
  summary TEXT,
  source_url VARCHAR(1000),
  signal_date DATE,

  -- Classification
  signal_type VARCHAR(100), -- 'regulatory_action', 'security_incident', 'hiring', 'news_mention', 'compliance_issue'
  regulations_matched TEXT[], -- ['FDA_524B', 'CRA', 'UN_R155', etc.]
  confidence VARCHAR(20) DEFAULT 'medium', -- 'high', 'medium', 'low'

  -- Matching
  company_mentioned VARCHAR(255), -- Company name extracted from signal
  tam_account_id UUID REFERENCES tam_accounts(tam_account_id) ON DELETE SET NULL,
  account_plan_id UUID REFERENCES account_plans(account_plan_id) ON DELETE SET NULL,
  match_type VARCHAR(50), -- 'direct_mention', 'industry_match', 'regulation_match'

  -- Metadata
  scan_batch_id UUID, -- Group signals from same scan
  needs_review BOOLEAN DEFAULT true,
  is_dismissed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for quick lookups
CREATE INDEX IF NOT EXISTS idx_signals_tam_account ON intelligence_signals(tam_account_id);
CREATE INDEX IF NOT EXISTS idx_signals_account_plan ON intelligence_signals(account_plan_id);
CREATE INDEX IF NOT EXISTS idx_signals_regulations ON intelligence_signals USING GIN(regulations_matched);
CREATE INDEX IF NOT EXISTS idx_signals_scan_batch ON intelligence_signals(scan_batch_id);
CREATE INDEX IF NOT EXISTS idx_signals_dismissed ON intelligence_signals(is_dismissed);
CREATE INDEX IF NOT EXISTS idx_signals_created ON intelligence_signals(created_at DESC);

-- Track scan runs
CREATE TABLE IF NOT EXISTS intelligence_scan_logs (
  scan_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  status VARCHAR(50) DEFAULT 'running', -- 'running', 'completed', 'failed'
  signals_found INTEGER DEFAULT 0,
  accounts_matched INTEGER DEFAULT 0,
  error_message TEXT
);

CREATE INDEX IF NOT EXISTS idx_scan_logs_status ON intelligence_scan_logs(status);
CREATE INDEX IF NOT EXISTS idx_scan_logs_started ON intelligence_scan_logs(started_at DESC);

-- Add comments
COMMENT ON TABLE intelligence_signals IS 'Stores intelligence signals gathered from web research scans';
COMMENT ON TABLE intelligence_scan_logs IS 'Tracks intelligence scan run history and results';
COMMENT ON COLUMN intelligence_signals.match_type IS 'How this signal was matched: direct_mention, industry_match, or regulation_match';
COMMENT ON COLUMN intelligence_signals.regulations_matched IS 'Array of regulation codes matched: FDA_524B, CRA, UN_R155, ISO_21434, MDR, NIS2, IEC_62443';
