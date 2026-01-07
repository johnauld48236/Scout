-- Add external source URLs to account_plans for integration placeholders
-- These allow reps to quickly link to external tools related to each account

ALTER TABLE account_plans
ADD COLUMN IF NOT EXISTS slack_channel_url VARCHAR(500),
ADD COLUMN IF NOT EXISTS jira_project_url VARCHAR(500),
ADD COLUMN IF NOT EXISTS asana_project_url VARCHAR(500);

-- Add comment for documentation
COMMENT ON COLUMN account_plans.slack_channel_url IS 'URL to account Slack channel for quick access';
COMMENT ON COLUMN account_plans.jira_project_url IS 'URL to Jira project/board for this account';
COMMENT ON COLUMN account_plans.asana_project_url IS 'URL to Asana project for this account';
