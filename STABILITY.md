# Stability Manifest - Scout Platform

Last updated: 2026-01-06

## Purpose
This document tracks which parts of the platform are stable (don't touch) vs. in active development. Use this to avoid breaking working functionality during the Two-Vector rebuild.

---

## 🟢 STABLE - Do Not Modify Without Review

### Database Tables (Production Data)
| Table | Status | Notes |
|-------|--------|-------|
| `account_plans` | STABLE | Core table, has production data |
| `pursuits` | STABLE | Active deals |
| `stakeholders` | STABLE | Contact data |
| `action_items` | STABLE | Active tasks (new `vector` column added) |
| `risks` | STABLE | Risk tracking |
| `pain_points` | STABLE | Pain points (new `vector` column added) |
| `account_signals` | STABLE | Intelligence data |
| `account_divisions` | STABLE | Org structure |
| `tam_accounts` | STABLE | TAM pipeline |
| `buckets` | STABLE | 30/60/90 tracker |
| `scout_themes` | STABLE | Existing themes (UI calls these "Sparks") |
| `campaigns` | STABLE | Campaign data |
| `company_profile` | STABLE | Settings |

### API Endpoints (Working)
| Endpoint | Status | Notes |
|----------|--------|-------|
| `/api/accounts/*` | STABLE | All account CRUD |
| `/api/pursuits` | STABLE | Deal management |
| `/api/stakeholders` | STABLE | Contact management |
| `/api/action-items/*` | STABLE | Task management |
| `/api/tam/*` | STABLE | TAM operations |
| `/api/scout-themes/*` | STABLE | Theme CRUD |
| `/api/ai/*` | STABLE | AI endpoints |

### Pages (Working)
| Route | Status | Notes |
|-------|--------|-------|
| `/` | STABLE | Dashboard |
| `/accounts` | STABLE | Account list |
| `/accounts/[id]` | STABLE | Classic + New View toggle |
| `/tam/*` | STABLE | TAM pages |
| `/settings` | STABLE | Settings |
| `/weekly-review` | STABLE | Weekly review |

---

## 🟡 IN TRANSITION - Use Carefully

### Components Being Replaced
| Component | Status | Replacement |
|-----------|--------|-------------|
| `AccountModeView.tsx` | TRANSITION | Will be replaced by prototype components |
| `DiscoveryMode.tsx` | TRANSITION | → `VectorOut/DiscoveryMode.tsx` |
| `ExecutionMode.tsx` | TRANSITION | → `VectorOut/ExecutionMode.tsx` |
| `AccountEnrichmentWorkflow.tsx` | TRANSITION | May need significant changes |

### Database Tables (New, Empty)
| Table | Status | Notes |
|-------|--------|-------|
| `sparks` | NEW | Empty, ready for use |
| `patterns` | NEW | Empty, Vector In concept |
| `account_issues` | NEW | Empty, Vector In concept |

---

## 🔴 ACTIVE DEVELOPMENT - Prototype Zone

### New Routes
| Route | Status | Notes |
|-------|--------|-------|
| `/accounts/[id]/prototype` | PROTOTYPE | Two-vector design validation |

### New Components (Prototype)
| Path | Status | Notes |
|------|--------|-------|
| `src/components/prototype/*` | PROTOTYPE | Mock data, annotations |
| `src/components/account/VectorOut/*` | PROTOTYPE | New Vector Out UI |
| `src/components/account/VectorIn/*` | PROTOTYPE | New Vector In UI |

---

## Migration Strategy

### Phase 1: Validate Design (Current)
- [x] Build prototype with mock data
- [x] Create new DB tables
- [ ] User testing on prototype
- [ ] Finalize UI/UX decisions

### Phase 2: Wire Vector Out
- [ ] Connect `VectorOut/DiscoveryMode` to real data
- [ ] Connect `VectorOut/ExecutionMode` to real data
- [ ] Use existing tables (scout_themes → "Sparks" in UI)
- [ ] Test with real accounts

### Phase 3: Build Vector In
- [ ] Create Vector In API endpoints
- [ ] Build issue import (Jira/Asana/Monday)
- [ ] Implement pattern detection
- [ ] Wire Vector In components

### Phase 4: Replace Classic View
- [ ] Remove layout toggle
- [ ] Prototype becomes the default
- [ ] Archive old components

---

## Rules for Development

### DO:
- Build new features in `/prototype` route first
- Use new `VectorOut/*` and `VectorIn/*` components
- Add to new tables (`sparks`, `patterns`, `account_issues`)
- Test against mock data before wiring real data

### DON'T:
- Modify stable API endpoints without review
- Change stable DB table schemas
- Delete existing components until Phase 4
- Break the classic view (users depend on it)

---

## Quick Reference

**To test prototype:**
```
http://localhost:3000/accounts/[any-id]/prototype
```

**To use classic view:**
```
http://localhost:3000/accounts/[id]  (click "Classic View" button)
```

**New tables ready for data:**
- `sparks` - Use instead of creating new scout_themes
- `patterns` - For Vector In recurring issues
- `account_issues` - For imported tickets
