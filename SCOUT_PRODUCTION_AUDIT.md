# Scout Production Audit

**Date:** 2026-01-06
**Status:** Phase 2 Complete - Discovery Panels Functional

## Completed Work

### Phase 2A: URL Pre-Population Fix
- Added auto-lookup in `AccountEnrichmentWorkflow.tsx` for missing website URLs
- When wizard opens with NULL website, auto-calls `/api/ai/company-lookup`
- Shows loading spinner during lookup
- Disables Continue button while lookup in progress

### Phase 2B: Route Consolidation
New routes created with Scout terminology:
- `/landscape` → Market view (was `/tam`)
- `/landscape/list` → Landscape accounts list
- `/landscape/[id]` → Landscape account detail
- `/landscape/gaps` → Gap analysis
- `/territories` → Territories list (was `/accounts`)
- `/territories/new` → Establish new territory
- `/territory/[id]` → Territory detail (prototype view as default)
- `/territory/[id]/classic` → Classic view fallback

All old routes redirect to new ones.

### Phase 2C: Wire Territory Page Buttons
Wired all header and opportunities buttons:
- **Favorites toggle** → Calls `/api/accounts/[id]/favorite`, updates UI state
- **Weekly Review toggle** → Calls `/api/accounts/[id]/weekly-review`, updates UI state
- **Refresh Intelligence** → Calls `/api/ai/research`, reloads page
- **Explore Sparks / Blaze New Trail** → Handler wired (placeholder, needs modal)
- **Add Deal / Connect to CRM** → Handler wired (placeholder, needs drawer)

Terminology support added:
- VectorOutExecutionMode accepts `sparkLabel`, `exploreButtonText`, `addDealButtonText` props
- Labels automatically switch between Sparks/Trails based on `useScoutTerminology` prop

### Phase 2D: Discovery Panels Basic Functionality
Created slide-out panel system with CRUD operations for each discovery area:

**New Components:**
- `SlideOutPanel.tsx` - Reusable slide-out panel with escape key, backdrop click
- `StructurePanel.tsx` - Division management (add/delete)
- `CompassPanel.tsx` - Confirmed contacts + Waypoints (roles to find), with convert action
- `SignalsPanel.tsx` - Intelligence signals grouped by type (add/delete)
- `TrailsPanel.tsx` - Opportunity themes with status management (scouting → blazing → active)
- `PlanPanel.tsx` - 30/60/90 bucket tracker with slipped item indicators

**Features:**
- All panels support Scout terminology switching (Compass vs Stakeholders, Trails vs Sparks)
- Panels call existing APIs for CRUD operations
- AI assist buttons (placeholders) for future AI discovery features
- Click any Discovery mode card to open corresponding panel

---

## Current Routes

| Route | Status | Notes |
|-------|--------|-------|
| `/tam` | Working | Redirects to /tam/list |
| `/tam/list` | Working | Shows TAM accounts list |
| `/tam/[id]` | Working | TAM detail with EnrichmentWizardModal |
| `/tam/gaps` | Working | Gap analysis |
| `/accounts` | Working | Account plans list (grouped by coverage) |
| `/accounts/new` | Working | Launches AccountPlanWizard |
| `/accounts/[id]` | Working | **Classic view** - full featured |
| `/accounts/[id]/prototype` | Working | **Target view** - wired to real data |
| `/accounts/[id]/plan-builder` | Working | 7-step plan builder |
| `/accounts/[id]/explore` | Working | AI chat exploration |
| `/accounts/[id]/org-builder` | Working | Org chart builder |
| `/weekly-review` | Working | Account review cards |
| `/campaigns` | Working | Campaign list |
| `/campaigns/[id]` | Working | Campaign detail |
| `/actions` | Working | Global action items |
| `/pursuits` | Working | Global pursuits |
| `/stakeholders` | Working | Global stakeholders |
| `/goals` | Working | Goals management |
| `/settings` | Working | Company profile, HubSpot config |

---

## Wizard URL Field Issue

### Where is TAM website_url stored?
- **Table:** `tam_accounts`
- **Column:** `website` (string)

### Flow from TAM to Wizard:

1. **TAMDetailClient** receives `account.website` from server
2. **TAMDetailClient** passes to `EnrichmentWizardModal`:
   ```typescript
   initialData={{
     company_name: account.company_name,
     website: account.website,  // <-- HERE
     ...
   }}
   ```
3. **EnrichmentWizardModal** passes to **AccountEnrichmentWorkflow**
4. **AccountEnrichmentWorkflow** initializes state:
   ```typescript
   const [companyInfo, setCompanyInfo] = useState<CompanyInfo>(initialData)
   ```
5. **Step 1 input** uses:
   ```typescript
   value={companyInfo.website || ''}
   ```

### Potential Issue Found:
The flow looks correct. The issue might be:
1. `account.website` is NULL in the database for some TAM accounts
2. OR the enrichment process isn't populating website
3. OR there's a timing issue where wizard opens before data loads

### How to Fix:
1. Add `console.log` in TAMDetailClient to verify `account.website` value
2. Check database for NULL website values
3. Ensure TAM enrichment API populates website field
4. **Test with account that has NULL website in database** (edge case that may be causing the URL issue)

---

## Prototype Page Buttons

| Button | Wired? | Handler Location | Status |
|--------|--------|------------------|--------|
| Explore Sparks / Blaze New Trail | **YES** | VectorOutExecutionMode.tsx | Calls handler, shows placeholder (TODO: open modal) |
| Add Deal / Connect to CRM | **YES** | VectorOutExecutionMode.tsx | Calls handler, shows placeholder (TODO: open drawer) |
| Favorites (star) | **YES** | PrototypeHealthBanner.tsx | Calls `/api/accounts/[id]/favorite` - WORKING |
| Weekly Review (clipboard) | **YES** | PrototypeHealthBanner.tsx | Calls `/api/accounts/[id]/weekly-review` - WORKING |
| Refresh Intelligence (🔄) | **YES** | PrototypeHealthBanner.tsx | Calls `/api/ai/research` - WORKING |
| Link to Deal | **YES** | VectorOutExecutionMode.tsx | Calls `/api/sparks/[id]/link` - WORKING |

### Completed:
- ✅ Favorites toggle - wired to API, updates state
- ✅ Weekly Review toggle - wired to API, updates state
- ✅ Refresh Intelligence - calls AI research, reloads page
- ✅ Explore Sparks / Blaze New Trail - handler wired, shows placeholder
- ✅ Add Deal / Connect to CRM - handler wired, shows placeholder

### Remaining Work:
- [ ] Explore Sparks → Replace placeholder with actual Trail creation modal/slide-out
- [ ] Add Deal → Replace placeholder with pursuit creation drawer or CRM linking modal

---

## Discovery Panels

**Location:** `/accounts/[id]/prototype` → Discovery mode (toggle)

| Panel | Status | Opens |
|-------|--------|-------|
| Structure | **WORKING** | SlideOutPanel with StructurePanel - Division CRUD |
| People | **WORKING** | SlideOutPanel with CompassPanel - Confirmed + Waypoints CRUD |
| Intelligence/Signals | **WORKING** | SlideOutPanel with SignalsPanel - Signals CRUD by type |
| Sparks/Trails | **WORKING** | SlideOutPanel with TrailsPanel - Theme CRUD with status |
| Plan | **WORKING** | SlideOutPanel with PlanPanel - 30/60/90 bucket management |

**All panels feature:**
- Add/Edit/Delete operations
- Scout terminology support when `useScoutTerminology={true}`
- AI assist buttons (placeholder for future integration)

---

## Database Tables to Rename (UI layer only)

| Table | Current UI Name | New UI Name (Scout Terminology) |
|-------|-----------------|--------------------------------|
| `tam_accounts` | TAM, TAM Accounts | **Landscape Accounts** |
| `account_plans` | Account Plans, Accounts | **Territories** |
| `scout_themes` | Sparks, Opportunity Themes | **Trails** |
| `stakeholders` | Stakeholders, Contacts | **Compass** |

---

## Terminology Mapping

### Navigation
| Current | New |
|---------|-----|
| TAM | Landscape |
| TAM Intelligence | Landscape Signals |
| Account Plans | Territories |
| Sparks | Trails |
| Stakeholders | Compass |

### Buttons
| Current | New |
|---------|-----|
| Create Account Plan | Establish Territory |
| Explore Sparks | Blaze New Trail |
| Add Stakeholder | Add to Compass |
| Add Deal | Link to CRM / Connect to CRM |

### Trail Statuses
| Current | New |
|---------|-----|
| exploring | Scouting |
| linked | Blazing |
| converted | Active |
| closed | Closed |

### Compass Types (NEW)
| Type | Description |
|------|-------------|
| Confirmed | Named person, verified exists |
| Waypoint | Role placeholder (need to find person) |

---

## Existing Wizards/Workflows

### 1. AccountPlanWizard (7 steps)
**Location:** `src/components/wizard/AccountPlanWizard.tsx`
**Launch from:** `/accounts/new` page
**Steps:**
1. Account Basics - Company search/entry
2. Research - AI research
3. Stakeholders - Find people
4. Opportunities - Theme exploration
5. Competitors - Competitive analysis
6. Strategy - Positioning
7. Actions - 30/60/90 plan

### 2. EnrichmentWizardModal (7 steps)
**Location:** `src/components/enrichment/EnrichmentWizardModal.tsx`
**Launch from:** TAM detail page
**Steps:**
1. Basic Info (website verification)
2. Campaign & Research
3. Structure Enrichment
4. People Discovery
5. Revenue Theory Chat
6. 30/60/90 Plan Chat
7. Create Account

**Note:** This is the main wizard flow from TAM → Account Plan (Territory)

---

## Views to Consolidate

### Current State:
- `/accounts/[id]` → Classic view (original, full-featured)
- `/accounts/[id]/prototype` → New view (two-vector layout, production target)
- Toggle buttons exist in both views

### Target State:
- `/territory/[id]` → New view (default) - formerly prototype
- `/territory/[id]/classic` → Classic view (fallback)
- Remove experimental toggles

### Route Rename Plan:
| Current | New |
|---------|-----|
| `/tam` | `/landscape` |
| `/tam/list` | `/landscape/list` |
| `/tam/[id]` | `/landscape/[id]` |
| `/tam/gaps` | `/landscape/gaps` |
| `/accounts` | `/territories` |
| `/accounts/new` | `/territories/new` |
| `/accounts/[id]` | `/territory/[id]/classic` |
| `/accounts/[id]/prototype` | `/territory/[id]` (default) |
| `/accounts/[id]/plan-builder` | `/territory/[id]/plan-builder` |
| `/accounts/[id]/explore` | `/territory/[id]/explore` |
| `/accounts/[id]/org-builder` | `/territory/[id]/org-builder` |

---

## Critical Fixes Needed

### Priority 1: URL Pre-Population
- Verify `tam_accounts.website` has data
- Add logging to trace data flow
- Ensure field pre-fills in wizard Step 1

### Priority 2: Wire Prototype Buttons
- Explore Sparks → Open trail creation
- Add Deal → Open pursuit drawer
- Favorites/Weekly Review → API calls
- Refresh Intelligence → AI enrichment

### Priority 3: Discovery Panels
- Replace alerts with actual slide-outs
- Each panel needs CRUD capabilities

### Priority 4: Compass Enhancement
- Separate Confirmed vs Waypoints
- Add `type` field to stakeholders table

### Priority 5: Terminology Rename
- Update UI labels (not DB)
- Route renaming

---

## Files to Modify (Phase 2)

### URL Fix
- `src/components/enrichment/AccountEnrichmentWorkflow.tsx` - Add logging
- `src/components/tam/TAMDetailClient.tsx` - Verify website passed

### Button Wiring
- `src/components/account/VectorOut/ExecutionMode.tsx` - Wire buttons
- `src/components/prototype/PrototypeHealthBanner.tsx` - Wire actions
- `src/app/accounts/[id]/prototype/PrototypePageClient.tsx` - Add handlers

### Discovery Panels
- Create new slide-out components:
  - `StructurePanel.tsx`
  - `CompassPanel.tsx`
  - `SignalsPanel.tsx`
  - `TrailsPanel.tsx`
  - `PlanPanel.tsx`

### Route Renaming
- Create new route structure under `/src/app/landscape` and `/src/app/territory`
- Add redirects from old routes

---

## Protected Flows (DO NOT MODIFY)

1. **TAM → Account Plan Onboarding** (EnrichmentWizardModal)
2. **7-Step Planning Wizard** (PlanBuilder)
3. **30/60/90 Day Tracker** (RollingTracker - already has CRUD)
4. **Action Items CRUD** (Working)
5. **Risks CRUD** (Working)
6. **Stakeholders CRUD** (Working)
7. **Dashboard** (Working - style changes only)
8. **Campaign Display** (Working)

---

## Testing Checklist (After Each Change)

- [ ] Navigate to Landscape (was TAM)
- [ ] Navigate to Territory (was Account Plan)
- [ ] Create Territory from Landscape (wizard launches)
- [ ] **URL pre-populates in wizard Step 1**
- [ ] **Test with account that has NULL website** (edge case)
- [ ] Wizard completes all steps
- [ ] New Territory lands on correct page
- [ ] Territory shows real data
- [ ] Can create/edit Trails
- [ ] Can create/edit Compass contacts
- [ ] Dashboard still loads
- [ ] No console errors

---

**Audit Status:** Complete
**Ready for Phase 2:** Awaiting approval

---

*Generated: 2026-01-06*
