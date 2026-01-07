# Scout - AI-Powered Sales Intelligence Platform

## CLAUDE.md v3 - Complete Architecture Reference

**Last Updated:** 2026-01-06
**Version:** 3.0 - Two-Vector Architecture, Spark Metrics, Health Scoring

---

## PROJECT OVERVIEW

Scout is a B2B sales intelligence platform with a **two-vector architecture**:
- **Vector Out (Sales):** Us looking at prospects - intelligence gathering, opportunity exploration, pursuit execution
- **Vector In (Customer Success):** Their experience with us - issue tracking, pattern detection, resolution management

Both vectors share common infrastructure (accounts, stakeholders, corporate structure) but serve different purposes.

---

## TECH STACK

| Component | Technology |
|-----------|------------|
| Framework | Next.js 16.1.1 (App Router) |
| React | 19.2.3 |
| Database | Supabase (PostgreSQL) |
| AI | Anthropic Claude API |
| Styling | Tailwind CSS 4 |
| TypeScript | Strict mode enabled |

---

## CORE COMMANDS

```bash
npm run dev          # Start development server (http://localhost:3000)
npm run build        # Build for production (RUN AFTER EVERY CHANGE)
npm run lint         # Check for code issues
```

**CRITICAL:** Always run `npm run build` after changes to catch TypeScript errors.

---

## FILE STRUCTURE

```
src/
├── app/
│   ├── accounts/
│   │   ├── [id]/
│   │   │   ├── page.tsx           # Account plan page (classic + new view toggle)
│   │   │   └── prototype/         # Two-vector prototype
│   │   │       └── page.tsx
│   │   └── page.tsx               # Accounts list
│   ├── api/
│   │   ├── ai/                    # AI enrichment endpoints
│   │   ├── accounts/              # Account CRUD
│   │   ├── action-items/          # Action item CRUD
│   │   └── scout-themes/          # Spark CRUD
│   ├── tam/                       # TAM intelligence pages
│   ├── settings/                  # App settings
│   └── weekly-review/             # Weekly review
├── components/
│   ├── account/                   # Account page components
│   │   ├── AccountHealthBanner.tsx
│   │   ├── AccountModeView.tsx
│   │   ├── AccountLayoutToggle.tsx
│   │   ├── DiscoveryMode.tsx
│   │   ├── ExecutionMode.tsx
│   │   ├── VectorOut/             # NEW: Vector Out prototype components
│   │   │   ├── DiscoveryMode.tsx
│   │   │   └── ExecutionMode.tsx
│   │   └── VectorIn/              # NEW: Vector In prototype components
│   │       ├── DiscoveryMode.tsx
│   │       └── ExecutionMode.tsx
│   ├── prototype/                 # Prototype-specific components
│   │   ├── DataAnnotation.tsx
│   │   ├── VectorTabs.tsx
│   │   ├── PrototypeHealthBanner.tsx
│   │   └── mockData.ts
│   ├── dashboard/                 # Dashboard components
│   │   ├── SparkCoverageMetrics.tsx   # TODO
│   │   ├── HealthDistribution.tsx     # TODO
│   │   └── ScoutActivityLayer.tsx     # TODO
│   ├── enrichment/                # Enrichment workflow
│   └── ui/                        # Shared UI components
├── lib/
│   ├── supabase/
│   │   ├── client.ts
│   │   └── server.ts
│   ├── ai/
│   │   └── context/               # AI context builder
│   └── scoring/
│       └── health-score.ts        # TODO: Health scoring logic
└── types/
```

---

## CRITICAL RULES

### Before ANY Change

1. Read relevant section of this CLAUDE.md
2. Check if table/field exists in schema below
3. Use exact enum values listed (lowercase)
4. Run `npm run build` after changes

### NEVER Do These

- Create new tables without adding to this doc
- Use wrong case for enum fields (always lowercase)
- Delete data without explicit user confirmation
- Modify JSONB structure without migration plan
- Add fields to tables without updating this doc
- Ignore TypeScript errors
- Mix Vector Out and Vector In data without clear separation

---

## TWO-VECTOR ARCHITECTURE

### Vector Out (Sales Intelligence)

**Purpose:** Build intelligence about prospects to drive sales

**Flow:**
```
Corporate Structure → Stakeholders → Signals → Sparks → CRM Deals → 30/60/90 Plan
```

**Key Entities:**
- `scout_themes` (UI: "Sparks") - Exploratory opportunity themes
- `pursuits` - Active sales opportunities
- `action_items` - Execution tasks
- `account_signals` - Market intelligence

**User Personas:** Sales reps, AEs, Sales leadership

### Vector In (Customer Success)

**Purpose:** Track customer experience and resolve issues

**Flow:**
```
Issues (Jira/Asana) → Patterns → Resolution Plans → Health Score
```

**Key Entities:**
- `account_issues` - Imported from external systems
- `patterns` - AI-identified recurring problems
- `action_items` (vector='in') - Resolution actions

**User Personas:** CSMs, Support, Product

### Shared Entities (Both Vectors)

- `account_plans` - Primary account records (everything flows through this)
- `stakeholders` - People at accounts
- `account_divisions` - Business units/divisions
- `account_health_scores` - Unified health metrics

---

## DATABASE SCHEMA

### Core Tables

#### account_plans
Primary table for managed accounts. **Everything flows through this.**

| Column | Type | Notes |
|--------|------|-------|
| account_plan_id | UUID | Primary key |
| company_name | VARCHAR(255) | Required |
| website | VARCHAR(255) | |
| vertical | VARCHAR(100) | Industry vertical |
| account_type | VARCHAR(50) | 'prospect', 'customer' |
| account_thesis | TEXT | Strategic positioning |
| is_favorite | BOOLEAN | Default FALSE |
| in_weekly_review | BOOLEAN | Default FALSE |
| last_reviewed_at | TIMESTAMPTZ | |
| last_reviewed_by | VARCHAR(255) | |
| business_units | JSONB | DEPRECATED: Use account_divisions |
| milestones | JSONB | DEPRECATED: Use buckets |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

**Cascade behavior:** Deleting account_plan deletes ALL children.

#### account_divisions

| Column | Type | Notes |
|--------|------|-------|
| division_id | UUID | Primary key |
| account_plan_id | UUID | FK → account_plans (CASCADE) |
| name | VARCHAR(255) | Required |
| description | TEXT | |
| created_at | TIMESTAMPTZ | |

#### stakeholders

| Column | Type | Notes |
|--------|------|-------|
| stakeholder_id | UUID | Primary key |
| account_plan_id | UUID | FK → account_plans (CASCADE) |
| full_name | VARCHAR(255) | Required |
| title | VARCHAR(255) | Job title |
| email | VARCHAR(255) | |
| phone | VARCHAR(50) | |
| division_id | UUID | FK → account_divisions |
| influence_level | VARCHAR(20) | 'high', 'medium', 'low' |
| sentiment | VARCHAR(20) | 'champion', 'supporter', 'neutral', 'skeptic', 'blocker' |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

### Sparks (Scout Themes)

#### scout_themes (UI: "Sparks")

| Column | Type | Notes |
|--------|------|-------|
| theme_id | UUID | Primary key |
| account_plan_id | UUID | FK → account_plans (CASCADE) |
| title | VARCHAR(255) | Required |
| description | TEXT | |
| why_it_matters | TEXT | |
| size | VARCHAR(20) | 'high', 'medium', 'low' |
| questions_to_explore | TEXT[] | |
| status | VARCHAR(50) | 'exploring', 'linked', 'converted', 'closed' |
| linked_pursuit_id | UUID | FK → pursuits (when linked to CRM deal) |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

**Spark Status Lifecycle:**
| Status | Meaning | Visual |
|--------|---------|--------|
| `exploring` | Scout theme, no CRM connection | Gray, floating |
| `linked` | Associated to existing CRM Deal | Blue, connected |
| `converted` | Spark became a new CRM Deal | Green, arrow down |
| `closed` | Spark didn't pan out | Dimmed, archived |

**Spark Sizing:**
| Size | Meaning | Signals |
|------|---------|---------|
| `high` $$$ | Large potential, strategic fit | Multiple buying signals, exec sponsor |
| `medium` $$ | Solid opportunity, worth pursuing | Some signals, clear contact |
| `low` $ | Smaller scope, tactical | Single contact, unclear need |

### Pursuits (CRM Deals)

#### pursuits

| Column | Type | Notes |
|--------|------|-------|
| pursuit_id | UUID | Primary key |
| account_plan_id | UUID | FK → account_plans (CASCADE) |
| name | VARCHAR(255) | Deal name |
| stage | VARCHAR(50) | See stages below |
| estimated_value | DECIMAL | Deal value |
| probability | INTEGER | Win probability 0-100 |
| expected_close_date | DATE | |
| thesis | TEXT | Deal thesis |
| business_unit_id | VARCHAR | References business_units JSONB |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

**Pursuit Stages:**
- `discovery`
- `qualification`
- `proposal`
- `negotiation`
- `closed_won`
- `closed_lost`

### Health Scoring

#### account_health_scores (NEW)

| Column | Type | Notes |
|--------|------|-------|
| health_score_id | UUID | Primary key |
| account_plan_id | UUID | FK → account_plans (CASCADE) |
| engagement_score | INTEGER | 0-25 points |
| momentum_score | INTEGER | 0-25 points |
| risk_score | INTEGER | 0-25 points |
| intelligence_score | INTEGER | 0-25 points |
| total_score | INTEGER | 0-100 (computed) |
| health_band | VARCHAR(20) | 'healthy', 'monitor', 'at_risk', 'critical' |
| score_inputs | JSONB | Raw inputs for learning |
| calculated_at | TIMESTAMPTZ | |
| created_at | TIMESTAMPTZ | |

**Health Bands:**
| Score Range | Band | Color |
|-------------|------|-------|
| 80-100 | `healthy` | Green |
| 60-79 | `monitor` | Yellow |
| 40-59 | `at_risk` | Orange |
| 0-39 | `critical` | Red |

### Execution Tracking

#### action_items

| Column | Type | Notes |
|--------|------|-------|
| action_id | UUID | Primary key |
| account_plan_id | UUID | FK → account_plans (CASCADE) |
| pursuit_id | UUID | FK → pursuits (SET NULL) |
| title | VARCHAR(500) | Required |
| description | TEXT | |
| owner | VARCHAR(255) | |
| due_date | DATE | |
| priority | VARCHAR(50) | 'high', 'medium', 'low' |
| status | VARCHAR(50) | 'pending', 'in_progress', 'completed', 'blocked' |
| vector | VARCHAR(10) | 'out' (sales), 'in' (customer success) |
| needs_review | BOOLEAN | AI-imported pending review |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

#### buckets (30/60/90 Tracker)

| Column | Type | Notes |
|--------|------|-------|
| bucket_id | UUID | Primary key |
| account_plan_id | UUID | FK → account_plans (CASCADE) |
| name | VARCHAR(255) | Custom milestone name |
| target_date | DATE | |
| status | VARCHAR(50) | 'active', 'completed' |

### Risks

#### risks

| Column | Type | Notes |
|--------|------|-------|
| risk_id | UUID | Primary key |
| account_plan_id | UUID | FK → account_plans (CASCADE) |
| pursuit_id | UUID | FK → pursuits (SET NULL) |
| title | VARCHAR(255) | Required |
| description | TEXT | |
| severity | VARCHAR(20) | 'low', 'medium', 'high', 'critical' |
| status | VARCHAR(50) | 'open', 'mitigating', 'resolved', 'accepted' |
| target_date | DATE | |
| needs_review | BOOLEAN | |
| deleted_at | TIMESTAMPTZ | Soft delete |

#### pain_points

| Column | Type | Notes |
|--------|------|-------|
| pain_point_id | UUID | Primary key |
| account_plan_id | UUID | FK → account_plans (CASCADE) |
| pursuit_id | UUID | FK → pursuits (SET NULL) |
| stakeholder_id | UUID | FK → stakeholders (SET NULL) |
| title | VARCHAR(255) | Required |
| description | TEXT | |
| severity | VARCHAR(20) | 'critical', 'significant', 'moderate', 'minor' |
| status | VARCHAR(50) | |
| vector | VARCHAR(10) | 'out' (sales opp), 'in' (customer issue) |
| target_date | DATE | |
| needs_review | BOOLEAN | |
| deleted_at | TIMESTAMPTZ | Soft delete |

### TAM Intelligence

#### tam_accounts

| Column | Type | Notes |
|--------|------|-------|
| tam_account_id | UUID | Primary key |
| company_name | VARCHAR(255) | Required |
| website | VARCHAR(255) | |
| vertical | VARCHAR(100) | |
| headquarters | VARCHAR(255) | |
| employee_count | INTEGER | |
| fit_tier | VARCHAR(10) | 'A', 'B', 'C' |
| priority_score | INTEGER | 0-100 |
| estimated_deal_value | DECIMAL | |
| status | VARCHAR(50) | 'new', 'qualified', 'researching', 'pursuing', 'promoted' |
| promoted_to_account_plan_id | UUID | When promoted |
| account_thesis | TEXT | |
| campaign_ids | UUID[] | |
| notes | TEXT | |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

#### account_signals

| Column | Type | Notes |
|--------|------|-------|
| signal_id | UUID | Primary key |
| tam_account_id | UUID | FK → tam_accounts (can be NULL) |
| account_plan_id | UUID | FK → account_plans (can be NULL) |
| signal_type | VARCHAR(100) | |
| title | VARCHAR(255) | |
| summary | TEXT | |
| signal_date | DATE | |
| source | VARCHAR(255) | URL |
| confidence | VARCHAR(20) | 'high', 'medium', 'low' |

### Vector In Tables (Customer Success)

#### account_issues

| Column | Type | Notes |
|--------|------|-------|
| issue_id | UUID | Primary key |
| account_plan_id | UUID | FK → account_plans (CASCADE) |
| external_id | VARCHAR(255) | Jira/Asana/Monday ID |
| source | VARCHAR(50) | 'jira', 'asana', 'monday', 'zendesk', 'manual' |
| title | VARCHAR(500) | Required |
| description | TEXT | |
| priority | VARCHAR(50) | 'p1', 'p2', 'p3' or 'high', 'medium', 'low' |
| status | VARCHAR(100) | 'open', 'in_progress', 'resolved', 'closed' |
| assignee | VARCHAR(255) | |
| reporter | VARCHAR(255) | |
| stakeholder_id | UUID | FK → stakeholders (SET NULL) |
| pattern_id | UUID | FK → patterns (SET NULL) |
| created_date | DATE | |
| resolved_date | DATE | |
| raw_data | JSONB | Original data from source |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

#### patterns

| Column | Type | Notes |
|--------|------|-------|
| pattern_id | UUID | Primary key |
| account_plan_id | UUID | FK → account_plans (CASCADE) |
| title | VARCHAR(255) | Required |
| description | TEXT | |
| pattern_type | VARCHAR(50) | 'recurring', 'escalating', 'spreading', 'sentiment' |
| severity | VARCHAR(20) | 'low', 'medium', 'high', 'critical' |
| related_issues | UUID[] | References account_issues |
| status | VARCHAR(50) | 'active', 'addressed', 'monitoring', 'resolved' |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

---

## SPARK METRICS SYSTEM

### Key Metrics

| Metric | Calculation | Purpose |
|--------|-------------|---------|
| **Sparks Active** | COUNT(scout_themes WHERE status IN ('exploring', 'linked')) | Activity level |
| **Revenue Under Intelligence** | SUM(pursuits.value WHERE pursuit has linked spark) | Quality of pipeline coverage |
| **Pipeline Coverage %** | (Deals with Sparks / Total pipeline deals) × 100 | Are we flying blind? |
| **TAM Accounts Available** | COUNT(tam_accounts not yet enriched) | Growth opportunity |

### Dashboard Queries

```sql
-- Sparks Active
SELECT COUNT(*) FROM scout_themes
WHERE status IN ('exploring', 'linked');

-- Revenue Under Intelligence
SELECT SUM(p.estimated_value)
FROM pursuits p
JOIN scout_themes st ON st.linked_pursuit_id = p.pursuit_id
WHERE st.status = 'linked';

-- Pipeline Coverage
SELECT
  (SELECT COUNT(*) FROM pursuits WHERE pursuit_id IN
    (SELECT linked_pursuit_id FROM scout_themes WHERE status = 'linked')
  ) * 100.0 /
  NULLIF((SELECT COUNT(*) FROM pursuits WHERE stage NOT IN ('closed_won', 'closed_lost')), 0)
AS coverage_percent;

-- Health Distribution
SELECT health_band, COUNT(*)
FROM account_health_scores
GROUP BY health_band;
```

---

## HEALTH SCORING SYSTEM

### Philosophy

Start with observable signals, weight simply, learn patterns, refine later.

### Component Weights

| Component | Max Points | What It Measures |
|-----------|------------|------------------|
| **Engagement** | 25 | Recency and frequency of contact |
| **Momentum** | 25 | Deal stage movement (advancing vs stalling) |
| **Risk Load** | 25 | Inverse of open risks (fewer = better) |
| **Intelligence** | 25 | Spark coverage, stakeholder mapping, signals |

### Scoring Functions

```typescript
// lib/scoring/health-score.ts

interface HealthInputs {
  engagement: {
    days_since_contact: number;
    contact_count_30d: number;
  };
  momentum: {
    stage_movement: number; // -3 to +3
  };
  risk: {
    open_risks: number;
    critical_risks: number;
  };
  intelligence: {
    sparks_count: number;
    stakeholders_mapped: number;
    signals_30d: number;
  };
}

function calculateEngagementScore(inputs: HealthInputs['engagement']): number {
  // 0-14 days = full points, decays from there
  const recencyScore = Math.max(0, 15 - (inputs.days_since_contact / 2));
  const frequencyScore = Math.min(10, inputs.contact_count_30d * 2);
  return Math.min(25, recencyScore + frequencyScore);
}

function calculateMomentumScore(inputs: HealthInputs['momentum']): number {
  // -3 to +3 movement maps to 0-25
  return Math.max(0, Math.min(25, 12.5 + (inputs.stage_movement * 4)));
}

function calculateRiskScore(inputs: HealthInputs['risk']): number {
  // Inverse: 0 risks = 25, 5+ risks = 0
  const riskPenalty = inputs.open_risks * 4 + inputs.critical_risks * 3;
  return Math.max(0, 25 - riskPenalty);
}

function calculateIntelligenceScore(inputs: HealthInputs['intelligence']): number {
  const sparkScore = Math.min(10, inputs.sparks_count * 3);
  const stakeholderScore = Math.min(10, inputs.stakeholders_mapped);
  const signalScore = Math.min(5, inputs.signals_30d);
  return sparkScore + stakeholderScore + signalScore;
}

function getHealthBand(totalScore: number): string {
  if (totalScore >= 80) return 'healthy';
  if (totalScore >= 60) return 'monitor';
  if (totalScore >= 40) return 'at_risk';
  return 'critical';
}
```

---

## SPARK-TO-DEAL LINKING

### UI Pattern

```
┌─────────────────────────────────────────────────────────────────┐
│  SPARK: Enterprise Security Platform Expansion                  │
│  Size: $$$ High                                                 │
├─────────────────────────────────────────────────────────────────┤
│  Link to CRM Deal: [Select Deal ▼]                             │
│                    ┌────────────────────────────────────┐      │
│                    │ ○ Q1 Security Renewal - $180K     │      │
│                    │ ○ Platform Expansion - $250K      │      │
│                    │ ○ New Module Add-on - $75K        │      │
│                    │ ─────────────────────────         │      │
│                    │ + Create New CRM Deal             │      │
│                    └────────────────────────────────────┘      │
│                                                                 │
│  Status: ○ Exploring  ◉ Linked  ○ Converted  ○ Closed         │
└─────────────────────────────────────────────────────────────────┘
```

### Linking Logic

```typescript
async function linkSparkToDeal(sparkId: string, pursuitId: string) {
  await supabase
    .from('scout_themes')
    .update({
      linked_pursuit_id: pursuitId,
      status: 'linked',
      updated_at: new Date().toISOString()
    })
    .eq('theme_id', sparkId);
}

async function convertSparkToDeal(sparkId: string, newDealData: Partial<Pursuit>) {
  // Create new pursuit
  const { data: newDeal } = await supabase
    .from('pursuits')
    .insert(newDealData)
    .select()
    .single();

  // Link and update status
  await supabase
    .from('scout_themes')
    .update({
      linked_pursuit_id: newDeal.pursuit_id,
      status: 'converted',
      updated_at: new Date().toISOString()
    })
    .eq('theme_id', sparkId);

  return newDeal;
}
```

---

## VALID ENUM VALUES (All Lowercase)

### Spark Status
```typescript
const SPARK_STATUS = ['exploring', 'linked', 'converted', 'closed'] as const;
```

### Spark Size
```typescript
const SPARK_SIZE = ['high', 'medium', 'low'] as const;
```

### Health Bands
```typescript
const HEALTH_BANDS = ['healthy', 'monitor', 'at_risk', 'critical'] as const;
```

### Pursuit Stages
```typescript
const PURSUIT_STAGES = [
  'discovery', 'qualification', 'proposal',
  'negotiation', 'closed_won', 'closed_lost'
] as const;
```

### Action Item Status
```typescript
const ACTION_STATUS = ['pending', 'in_progress', 'completed', 'blocked'] as const;
```

### Action Item Priority
```typescript
const PRIORITY = ['high', 'medium', 'low'] as const;
```

### Risk Severity
```typescript
const RISK_SEVERITY = ['low', 'medium', 'high', 'critical'] as const;
```

### Risk Status
```typescript
const RISK_STATUS = ['open', 'mitigating', 'resolved', 'accepted'] as const;
```

### Pain Point Severity
```typescript
const PAIN_POINT_SEVERITY = ['critical', 'significant', 'moderate', 'minor'] as const;
```

### Pattern Types (Vector In)
```typescript
const PATTERN_TYPES = ['recurring', 'escalating', 'spreading', 'sentiment'] as const;
```

### TAM Account Status
```typescript
const TAM_STATUS = ['new', 'qualified', 'researching', 'pursuing', 'promoted'] as const;
```

---

## COMMON PATTERNS

### Supabase Query Pattern (Explicit FK)

When tables have multiple FKs, specify which one:

```typescript
// WRONG - causes "ambiguous relationship" error
supabase.from('pain_points').select('*, pursuits(name)')

// CORRECT - explicit foreign key
supabase.from('pain_points').select('*, pursuits!pursuit_id(name)')
```

### Soft Delete Pattern

```typescript
// Always filter out soft-deleted records
supabase.from('risks').select('*').is('deleted_at', null)
supabase.from('pain_points').select('*').is('deleted_at', null)
```

### Review Queue Filter

Items with `needs_review = true` are HIDDEN from account page views.
**If items "disappear" after AI import, check this flag.**

---

## PROTOTYPE vs PRODUCTION

### Prototype Route
```
/accounts/[id]/prototype
```
- Uses mock data
- Shows data annotations
- Tests two-vector architecture

### Production Routes
```
/accounts/[id]              # Classic + New View toggle
/accounts/[id]/prototype    # Design validation
```

---

## PENDING MIGRATIONS

### Priority 1: Health Scoring
- [ ] Create `account_health_scores` table
- [ ] Add indexes for dashboard queries

### Priority 2: Spark Linking
- [ ] Add `linked_pursuit_id` to `scout_themes`
- [ ] Update `status` enum values in `scout_themes`

### Priority 3: Enum Cleanup
- [ ] Migrate existing data to lowercase enums
- [ ] Update API endpoints to use lowercase

---

## SUCCESS CRITERIA

The build is successful when:

1. Dashboard shows Spark metrics (active count, revenue under intelligence, coverage %)
2. Account pages show health score badge
3. Sparks can be linked to CRM deals via dropdown
4. Pipeline views show coverage indicators (⚡/○)
5. Health scores calculate and cache correctly
6. All TypeScript compiles (`npm run build` passes)
7. Prototype route works at `/accounts/[id]/prototype`

---

*END OF CLAUDE.md v3*
