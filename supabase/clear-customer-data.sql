-- ============================================
-- CLEAR CUSTOMER/PIPELINE DATA
-- Preserves C2A context: company_profile, campaigns, goals
-- ============================================

-- Order matters due to foreign key constraints
-- Start with tables that reference others

-- 1. Clear research findings
DELETE FROM research_findings;

-- 2. Clear qualification criteria
DELETE FROM qualification_criteria;

-- 3. Clear pursuit stakeholder links
DELETE FROM pursuit_stakeholders;

-- 4. Clear action items
DELETE FROM action_items;

-- 5. Clear pursuits
DELETE FROM pursuits;

-- 6. Clear stakeholders
DELETE FROM stakeholders;

-- 7. Clear account plans
DELETE FROM account_plans;

-- 8. Clear campaign-TAM account links
DELETE FROM campaign_tam_accounts;

-- 9. Clear account signals
DELETE FROM account_signals;

-- 10. Clear TAM warm paths
DELETE FROM tam_warm_paths;

-- 11. Clear TAM contacts
DELETE FROM tam_contacts;

-- 12. Clear TAM accounts
DELETE FROM tam_accounts;

-- 13. Clear goal progress history (but keep goal targets)
DELETE FROM goal_progress;

-- 14. Reset current_value on goals to 0 (fresh start)
UPDATE goals SET current_value = 0, updated_at = NOW();

-- Verify what remains
SELECT 'company_profile' as table_name, COUNT(*) as count FROM company_profile
UNION ALL
SELECT 'campaigns', COUNT(*) FROM campaigns
UNION ALL
SELECT 'goals', COUNT(*) FROM goals
UNION ALL
SELECT 'campaign_goals', COUNT(*) FROM campaign_goals
UNION ALL
SELECT 'tam_accounts', COUNT(*) FROM tam_accounts
UNION ALL
SELECT 'account_plans', COUNT(*) FROM account_plans
UNION ALL
SELECT 'pursuits', COUNT(*) FROM pursuits;
