-- ============================================
-- SEED GAP DEFINITIONS
-- ============================================
-- These define the segments to analyze for pipeline gaps

INSERT INTO gap_definitions (name, vertical, value_min, value_max, campaign_id, min_pursuits_for_coverage, min_tam_for_opportunity, is_active) VALUES

-- Medical Device segments
('Medical High Value', 'Medical', 300000, NULL, NULL, 3, 5, true),
('Medical Mid Value', 'Medical', 100000, 300000, NULL, 5, 8, true),

-- Automotive segments
('Automotive Enterprise', 'Automotive', 500000, NULL, NULL, 2, 4, true),
('Automotive Mid-Market', 'Automotive', 200000, 500000, NULL, 4, 6, true),

-- Industrial segments
('Industrial Enterprise', 'Industrial', 400000, NULL, NULL, 2, 5, true),
('Industrial Mid-Market', 'Industrial', 150000, 400000, NULL, 4, 8, true);

-- Note: Campaign-specific gaps can be added once campaigns are created
-- Example: CRA Campaign Coverage would need the campaign_id from the campaigns table

-- Verify
SELECT name, vertical, value_min, value_max, min_pursuits_for_coverage, min_tam_for_opportunity
FROM gap_definitions
WHERE is_active = true
ORDER BY vertical, value_min DESC;
