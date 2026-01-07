// Mock data for the two-vector prototype
// This data is used for design validation before wiring up real data

export const MOCK_ACCOUNT = {
  account_plan_id: 'mock-001',
  company_name: 'Acme Medical Devices',
  website: 'https://acmemedical.com',
  vertical: 'Medical Devices',
  headquarters: 'Boston, MA',
  employee_count: 2500,
  annual_revenue: '$2.3B',
  account_type: 'customer' as const,
  account_thesis: 'Large medical device manufacturer with FDA compliance needs. Strong expansion potential in connected devices division.',
  is_favorite: true,
  in_weekly_review: true,
  health_status: 'at_risk' as const, // 'healthy', 'at_risk', 'critical'
  health_reason: 'Strong sales pipeline but 3 open P1 tickets',
  last_refreshed: '2 hours ago',
}

export const MOCK_VECTOR_OUT = {
  divisions: [
    { division_id: 'div-1', name: 'Connected Devices', description: 'IoT medical devices including patient monitors and wearables' },
    { division_id: 'div-2', name: 'Imaging Systems', description: 'MRI, CT, X-ray equipment and software' },
    { division_id: 'div-3', name: 'Surgical', description: 'Surgical instruments and robotic systems' },
  ],

  stakeholders: [
    { stakeholder_id: 's-1', name: 'Sarah Chen', title: 'VP Product Security', influence_level: 'high', sentiment: 'positive', department: 'Engineering' },
    { stakeholder_id: 's-2', name: 'Michael Torres', title: 'Director Regulatory Affairs', influence_level: 'high', sentiment: 'neutral', department: 'Regulatory' },
    { stakeholder_id: 's-3', name: 'James Wilson', title: 'CISO', influence_level: 'high', sentiment: 'neutral', department: 'IT Security' },
    { stakeholder_id: 's-4', name: 'Emily Rodriguez', title: 'VP Engineering', influence_level: 'high', sentiment: 'positive', department: 'Engineering' },
    { stakeholder_id: 's-5', name: 'David Kim', title: 'Director IT', influence_level: 'medium', sentiment: 'neutral', department: 'IT' },
    { stakeholder_id: 's-6', name: 'Lisa Thompson', title: 'Product Manager', influence_level: 'medium', sentiment: 'positive', department: 'Product' },
    { stakeholder_id: 's-7', name: 'Robert Brown', title: 'Security Architect', influence_level: 'medium', sentiment: 'positive', department: 'Engineering' },
    { stakeholder_id: 's-8', name: 'Jennifer Martinez', title: 'Compliance Manager', influence_level: 'medium', sentiment: 'neutral', department: 'Regulatory' },
    { stakeholder_id: 's-9', name: 'Chris Lee', title: 'DevOps Lead', influence_level: 'low', sentiment: 'positive', department: 'Engineering' },
    { stakeholder_id: 's-10', name: 'Amanda White', title: 'QA Manager', influence_level: 'low', sentiment: 'neutral', department: 'Quality' },
    { stakeholder_id: 's-11', name: 'Mark Johnson', title: 'Software Developer', influence_level: 'low', sentiment: 'positive', department: 'Engineering' },
    { stakeholder_id: 's-12', name: 'Rachel Green', title: 'Business Analyst', influence_level: 'low', sentiment: 'neutral', department: 'Product' },
  ],

  signals: [
    { signal_id: 'sig-1', title: 'FDA 524B compliance deadline Q2', type: 'regulatory', date: '2026-01-03', summary: 'FDA cybersecurity requirements for medical devices take effect Q2 2026. Acme has 3 product lines that need certification.' },
    { signal_id: 'sig-2', title: 'Expansion budget approved for security', type: 'buying_signal', date: '2026-01-02', summary: 'Board approved $2M security modernization budget for FY26. VP Engineering confirmed priority on connected devices.' },
    { signal_id: 'sig-3', title: 'Hired new CISO from competitor', type: 'leadership_change', date: '2025-12-15', summary: 'James Wilson joined as CISO from Medtronic. Known for driving security transformation initiatives.' },
  ],

  // UI will call these "Sparks" but data could come from scout_themes table
  sparks: [
    {
      spark_id: 'spark-1',
      title: 'FDA Compliance Acceleration',
      description: 'Help Acme accelerate their FDA 524B compliance for connected medical devices before the Q2 deadline.',
      size: 'high' as const,
      signals_connected: ['sig-1', 'sig-2'],
      questions_to_explore: [
        'Who owns FDA submissions for connected devices?',
        'What is their current threat modeling process?',
        'How much timeline pressure are they under?',
      ],
      status: 'exploring',
      why_it_matters: 'Q2 deadline creates urgency. $2M budget available. Multiple stakeholders aligned.',
    },
    {
      spark_id: 'spark-2',
      title: 'Connected Devices Security Platform',
      description: 'Unified security platform for their IoT medical device portfolio including patient monitors and wearables.',
      size: 'medium' as const,
      signals_connected: ['sig-2'],
      questions_to_explore: [
        'Which connected devices are in production?',
        'What is their current security posture for IoT?',
      ],
      status: 'exploring',
      why_it_matters: 'Connected Devices division is growing. New CISO likely to prioritize.',
    },
  ],

  pursuits: [
    {
      pursuit_id: 'pursuit-1',
      name: 'Enterprise Security Platform',
      stage: 'Proposal',
      estimated_value: 450000,
      probability: 60,
      expected_close_date: '2026-03-15',
      thesis: 'Unified threat modeling and compliance platform for FDA submission acceleration.',
    },
  ],

  pain_points: [
    { pain_point_id: 'pp-1', title: 'Manual threat modeling taking 6+ months', severity: 'critical', description: 'Each product line requires separate threat model. Current manual process blocks FDA submissions.' },
    { pain_point_id: 'pp-2', title: 'FDA documentation gaps', severity: 'critical', description: 'Missing required documentation for 524B submissions. Audit found 40% gap.' },
    { pain_point_id: 'pp-3', title: 'No visibility across product security', severity: 'significant', description: 'Each division manages security independently. CISO has no unified dashboard.' },
    { pain_point_id: 'pp-4', title: 'Compliance team understaffed', severity: 'significant', description: 'Only 3 people managing compliance for 12 product lines.' },
    { pain_point_id: 'pp-5', title: 'Third-party component tracking', severity: 'significant', description: 'No SBOM process. Unknown vulnerabilities in supply chain.' },
    { pain_point_id: 'pp-6', title: 'Slow vulnerability response', severity: 'moderate', description: '45-day average patch cycle. Industry target is 14 days.' },
    { pain_point_id: 'pp-7', title: 'Manual security testing', severity: 'moderate', description: 'No automated security testing in CI/CD pipeline.' },
    { pain_point_id: 'pp-8', title: 'Training gaps', severity: 'moderate', description: 'Development team lacks secure coding training.' },
  ],

  risks: [
    { risk_id: 'risk-1', title: 'CISO risk-averse, may delay decision', severity: 'high', status: 'open', description: 'New CISO wants to evaluate multiple vendors. May push timeline to Q3.' },
    { risk_id: 'risk-2', title: 'Incumbent competitor relationship', severity: 'medium', status: 'open', description: 'Current vendor has 5-year relationship. Will fight to retain.' },
    { risk_id: 'risk-3', title: 'Budget cycle ends March', severity: 'medium', status: 'open', description: 'Approved budget must be committed by March 31 or returns to pool.' },
  ],

  action_items: [
    { action_id: 'act-1', title: 'Send ROI analysis to Sarah Chen', due_date: '2026-01-10', status: 'pending', priority: 'High', bucket: '30' as const },
    { action_id: 'act-2', title: 'Schedule FDA deep-dive with Regulatory team', due_date: '2026-01-15', status: 'pending', priority: 'High', bucket: '30' as const },
    { action_id: 'act-3', title: 'Map stakeholder influence network', due_date: '2026-01-19', status: 'in_progress', priority: 'Medium', bucket: '30' as const },
    { action_id: 'act-4', title: 'Prepare competitive differentiation deck', due_date: '2026-01-25', status: 'pending', priority: 'Medium', bucket: '30' as const },
    { action_id: 'act-5', title: 'Connect CISO with reference customer', due_date: '2026-02-01', status: 'pending', priority: 'High', bucket: '60' as const },
    { action_id: 'act-6', title: 'Technical proof of concept planning', due_date: '2026-02-10', status: 'pending', priority: 'Medium', bucket: '60' as const },
    { action_id: 'act-7', title: 'Executive sponsor alignment meeting', due_date: '2026-02-15', status: 'pending', priority: 'High', bucket: '60' as const },
    { action_id: 'act-8', title: 'Proposal draft review', due_date: '2026-02-20', status: 'pending', priority: 'Medium', bucket: '60' as const },
    { action_id: 'act-9', title: 'Legal and procurement intro', due_date: '2026-03-01', status: 'pending', priority: 'Medium', bucket: '90' as const },
    { action_id: 'act-10', title: 'Contract negotiation prep', due_date: '2026-03-10', status: 'pending', priority: 'Low', bucket: '90' as const },
    { action_id: 'act-11', title: 'Implementation planning workshop', due_date: '2026-03-15', status: 'pending', priority: 'Low', bucket: '90' as const },
    { action_id: 'act-12', title: 'Q3 expansion roadmap discussion', due_date: '2026-04-01', status: 'pending', priority: 'Low', bucket: '90' as const },
  ],

  // Discovery completion status
  discovery_status: {
    structure: { complete: true, count: 3 },
    people: { complete: true, count: 12 },
    signals: { complete: false, count: 3 }, // in_progress
    sparks: { complete: false, count: 2 }, // ready
    plan: { complete: true, count: 12 },
  },
}

export const MOCK_VECTOR_IN = {
  // Same divisions as Vector Out (shared)
  divisions: MOCK_VECTOR_OUT.divisions,

  // Contacts for Vector In (different view of stakeholders)
  contacts: [
    { stakeholder_id: 'c-1', name: 'John Smith', title: 'IT Administrator', type: 'admin', department: 'IT' },
    { stakeholder_id: 'c-2', name: 'Jane Doe', title: 'Power User', type: 'user', department: 'Engineering' },
    { stakeholder_id: 'c-3', name: 'Bob Johnson', title: 'Technical Lead', type: 'user', department: 'Development' },
    { stakeholder_id: 'c-4', name: 'Alice Williams', title: 'System Admin', type: 'admin', department: 'IT' },
    { stakeholder_id: 'c-5', name: 'Tom Davis', title: 'Security Analyst', type: 'user', department: 'Security' },
    { stakeholder_id: 'c-6', name: 'Mary Brown', title: 'QA Engineer', type: 'user', department: 'Quality' },
    { stakeholder_id: 'c-7', name: 'Steve Wilson', title: 'DevOps Engineer', type: 'user', department: 'Engineering' },
    { stakeholder_id: 'c-8', name: 'Karen Miller', title: 'Product Owner', type: 'user', department: 'Product' },
  ],

  issues: [
    {
      issue_id: 'issue-1',
      external_id: 'ACME-1234',
      source: 'jira',
      title: 'Login failures for SSO users',
      description: 'Multiple users reporting intermittent SSO login failures. Affects approximately 15% of login attempts.',
      priority: 'P1',
      status: 'In Progress',
      created_days_ago: 3,
      reporter: 'John Smith',
      assignee: 'Support Team',
      pattern_id: 'pattern-1',
    },
    {
      issue_id: 'issue-2',
      external_id: 'ACME-1235',
      source: 'jira',
      title: 'Report export timing out',
      description: 'Large compliance reports (>1000 rows) timeout before completing export.',
      priority: 'P2',
      status: 'Open',
      created_days_ago: 5,
      reporter: 'Jane Doe',
      assignee: 'Unassigned',
      pattern_id: null,
    },
    {
      issue_id: 'issue-3',
      external_id: 'ACME-1230',
      source: 'jira',
      title: 'Dashboard loading slow',
      description: 'Main dashboard takes 8+ seconds to load. Started after last update.',
      priority: 'P3',
      status: 'Open',
      created_days_ago: 10,
      reporter: 'Bob Johnson',
      assignee: 'Unassigned',
      pattern_id: 'pattern-2',
    },
    {
      issue_id: 'issue-4',
      external_id: 'ACME-1228',
      source: 'jira',
      title: 'SSO redirect loop on mobile',
      description: 'Mobile browser users stuck in redirect loop when authenticating.',
      priority: 'P1',
      status: 'In Progress',
      created_days_ago: 2,
      reporter: 'Alice Williams',
      assignee: 'Support Team',
      pattern_id: 'pattern-1',
    },
    {
      issue_id: 'issue-5',
      external_id: 'ACME-1225',
      source: 'jira',
      title: 'API response times degraded',
      description: 'API calls averaging 3s response time, up from 500ms baseline.',
      priority: 'P2',
      status: 'Investigating',
      created_days_ago: 7,
      reporter: 'Tom Davis',
      assignee: 'Engineering',
      pattern_id: 'pattern-2',
    },
    {
      issue_id: 'issue-6',
      external_id: 'ACME-1220',
      source: 'jira',
      title: 'Session timeout too aggressive',
      description: 'Users being logged out after 15 minutes of activity.',
      priority: 'P3',
      status: 'Open',
      created_days_ago: 12,
      reporter: 'Mary Brown',
      assignee: 'Unassigned',
      pattern_id: 'pattern-1',
    },
  ],

  patterns: [
    {
      pattern_id: 'pattern-1',
      title: 'Authentication Issues',
      pattern_type: 'recurring',
      severity: 'high',
      related_issues: ['issue-1', 'issue-4', 'issue-6'],
      description: 'SSO and login failures reported by 5 different users this month. Pattern suggests infrastructure or configuration issue.',
      status: 'active',
    },
    {
      pattern_id: 'pattern-2',
      title: 'Performance Complaints',
      pattern_type: 'spreading',
      severity: 'medium',
      related_issues: ['issue-3', 'issue-5'],
      description: 'Started in one department, now reported by 3 departments. Correlation with recent deployment.',
      status: 'active',
    },
  ],

  issue_signals: [
    { signal_id: 'isig-1', title: 'Escalation risk - P1 open > 3 days', type: 'risk', severity: 'high' },
    { signal_id: 'isig-2', title: 'Sentiment declining - frustration detected in ticket language', type: 'sentiment', severity: 'medium' },
    { signal_id: 'isig-3', title: 'Pattern emerging - auth issues spreading', type: 'pattern', severity: 'high' },
  ],

  // Discovery completion status
  discovery_status: {
    structure: { complete: true, count: 3, shared: true }, // Shared with Vector Out
    people: { complete: false, count: 0 },
    issues: { complete: false, count: 0 },
    patterns: { complete: false, count: 0 },
    plan: { complete: false, count: 0 },
  },

  // Resolution tracker items (similar to action_items but for Vector In)
  resolution_items: [
    { action_id: 'res-1', title: 'Investigate SSO infrastructure', due_date: '2026-01-08', status: 'in_progress', priority: 'P1', timeframe: 'this_week' },
    { action_id: 'res-2', title: 'Deploy SSO hotfix', due_date: '2026-01-10', status: 'pending', priority: 'P1', timeframe: 'this_week' },
    { action_id: 'res-3', title: 'Performance profiling', due_date: '2026-01-12', status: 'pending', priority: 'P2', timeframe: 'this_week' },
    { action_id: 'res-4', title: 'Customer communication - auth issues', due_date: '2026-01-15', status: 'pending', priority: 'P1', timeframe: 'next_week' },
    { action_id: 'res-5', title: 'Root cause analysis report', due_date: '2026-01-20', status: 'pending', priority: 'P2', timeframe: 'next_week' },
    { action_id: 'res-6', title: 'Performance optimization sprint', due_date: '2026-01-31', status: 'pending', priority: 'P2', timeframe: 'this_month' },
  ],
}

// Helper to calculate health status
export function calculateHealthStatus(vectorOut: typeof MOCK_VECTOR_OUT, vectorIn: typeof MOCK_VECTOR_IN): {
  status: 'healthy' | 'at_risk' | 'critical'
  reason: string
} {
  const hasP1Issues = vectorIn.issues.filter(i => i.priority === 'P1').length > 0
  const p1Count = vectorIn.issues.filter(i => i.priority === 'P1').length
  const pipelineValue = vectorOut.pursuits.reduce((sum, p) => sum + p.estimated_value, 0)
  const hasPipeline = pipelineValue > 0

  if (hasP1Issues && !hasPipeline) {
    return { status: 'critical', reason: `${p1Count} P1 tickets and no active pipeline` }
  }
  if (hasP1Issues && hasPipeline) {
    return { status: 'at_risk', reason: `Strong pipeline ($${(pipelineValue / 1000).toFixed(0)}K) but ${p1Count} P1 tickets open` }
  }
  if (!hasP1Issues && hasPipeline) {
    return { status: 'healthy', reason: `$${(pipelineValue / 1000).toFixed(0)}K pipeline, no critical issues` }
  }
  return { status: 'at_risk', reason: 'Limited engagement - needs attention' }
}
