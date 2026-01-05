-- Multi-deal tagging for risks, pain points, and buckets
-- Run this in Supabase SQL Editor

-- Junction table for risks to pursuits (many-to-many)
CREATE TABLE IF NOT EXISTS risk_pursuits (
  risk_id UUID NOT NULL REFERENCES risks(risk_id) ON DELETE CASCADE,
  pursuit_id UUID NOT NULL REFERENCES pursuits(pursuit_id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (risk_id, pursuit_id)
);

CREATE INDEX IF NOT EXISTS idx_risk_pursuits_risk ON risk_pursuits(risk_id);
CREATE INDEX IF NOT EXISTS idx_risk_pursuits_pursuit ON risk_pursuits(pursuit_id);

-- Junction table for pain points to pursuits (many-to-many)
CREATE TABLE IF NOT EXISTS pain_point_pursuits (
  pain_point_id UUID NOT NULL REFERENCES pain_points(pain_point_id) ON DELETE CASCADE,
  pursuit_id UUID NOT NULL REFERENCES pursuits(pursuit_id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (pain_point_id, pursuit_id)
);

CREATE INDEX IF NOT EXISTS idx_pain_point_pursuits_pain_point ON pain_point_pursuits(pain_point_id);
CREATE INDEX IF NOT EXISTS idx_pain_point_pursuits_pursuit ON pain_point_pursuits(pursuit_id);

-- Junction table for buckets to pursuits (many-to-many)
CREATE TABLE IF NOT EXISTS bucket_pursuits (
  bucket_id UUID NOT NULL REFERENCES buckets(bucket_id) ON DELETE CASCADE,
  pursuit_id UUID NOT NULL REFERENCES pursuits(pursuit_id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (bucket_id, pursuit_id)
);

CREATE INDEX IF NOT EXISTS idx_bucket_pursuits_bucket ON bucket_pursuits(bucket_id);
CREATE INDEX IF NOT EXISTS idx_bucket_pursuits_pursuit ON bucket_pursuits(pursuit_id);

-- Migration helper: copy existing single pursuit_id to junction tables
-- For risks
INSERT INTO risk_pursuits (risk_id, pursuit_id)
SELECT risk_id, pursuit_id FROM risks WHERE pursuit_id IS NOT NULL
ON CONFLICT DO NOTHING;

-- For pain_points
INSERT INTO pain_point_pursuits (pain_point_id, pursuit_id)
SELECT pain_point_id, pursuit_id FROM pain_points WHERE pursuit_id IS NOT NULL
ON CONFLICT DO NOTHING;

-- For buckets
INSERT INTO bucket_pursuits (bucket_id, pursuit_id)
SELECT bucket_id, pursuit_id FROM buckets WHERE pursuit_id IS NOT NULL
ON CONFLICT DO NOTHING;
