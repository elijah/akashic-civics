# Akashic Civic Dashboard - Putnam County TN Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build out the civic dashboard implementation for Putnam County TN USA by integrating existing Putnam County connectors (gov data, courts, Reddit, news) into the akashic-data-pipeline, with minimal changes to the main Akashic application.

**Architecture:** Extension-first approach. All new data models, connectors, and ingestion logic live in `akashic-data-pipeline` and the connector packages. The main Akashic app only consumes the unified geo-intelligence feed.

**Tech Stack:** TypeScript, Next.js, akashic-data-pipeline (geo-intelligence), Prisma, existing connector packages

---

## Current State (as of 2026-09-13)

### What's Done:
- ✅ Core modularization: `akashic-data-pipeline` is a proper npm package with ESM support
- ✅ Root workspace config at `/home/elw/package.json` with 10 workspaces
- ✅ All 10 extension repos linked via npm workspaces
- ✅ Main Akashic imports `akashic-data-pipeline/lib/geo-intelligence/generator` and `types`
- ✅ Build and TypeScript checks pass
- ✅ Putnam County Gov connector exists (mock data + scraper stub)
- ✅ Putnam Courts connector exists (Python - needs npm fix)
- ✅ Reddit Cookeville connector exists
- ✅ News source connector exists
- ✅ Helm chart for deployment exists

### Existing Connectors:
| Package | Status | Data Types |
|---------|--------|------------|
| `akashic-putnam-county-gov` | Mock + TS scraper stub | County meetings, court dockets, ordinances, job listings |
| `akashic-putnam-courts` | Python (broken npm deps) | Circuit court, criminal court, federal MD-TN |
| `akashic-reddit-cookeville-connector` | Mock + stub | Reddit posts/comments |
| `akashic-news-source-connector` | Mock + stub | Herald-Citizen, gov meetings |
| `akashic-gov-data-connector` | Framework | Sheriff, courts, OSM |

---

## Phase 1: Data Pipeline Integration (Next 2-4 weeks)

### Goal: Make Putnam County data flow through the geo-intelligence pipeline

#### Task 1.1: Create Putnam Civic Types in Data Pipeline

**Files to create:**
- `akashic-data-pipeline/lib/geo-intelligence/connectors/putnam-civic.ts` - Main connector
- `akashic-data-pipeline/lib/geo-intelligence/connectors/putnam-civic/types.ts` - Type mappings

**Files to modify:**
- `akashic-data-pipeline/lib/geo-intelligence/connectors/index.ts` - Register connector

**Type Mapping Strategy:**
Map Putnam-specific types → pipeline types (`entity`, `event`, `claim`, `source`, `evidence`, `relationship`)

```typescript
// Putnam types → Pipeline types
CountyMeeting     → event (category: "politics", severity: "low")
CourtDocket/CourtCase → event (category: "conflict" or "politics")
Ordinance         → event (category: "politics")
JobListing        → entity (type: "job_listing")
DepartmentHead    → entity (type: "person" / "org")
VotingRecord      → claim (type: "vote")
```

- [ ] **Step 1.1.1:** Create Putnam civic types file with bi-directional mappings
- [ ] **Step 1.1.2:** Create Putnam civic connector implementing the `connector` interface
- [ ] **Step 1.1.3:** Register in `all_connectors` in `connectors/index.ts`
- [ ] **Step 1.1.4:** Test connector loads via `import { all_connectors } from "akashic-data-pipeline/lib/geo-intelligence/connectors"`

---

#### Task 1.2: Connect Putnam County Gov Scraper to Pipeline

**Files to modify:**
- `akashic-putnam-county-gov/lib/putnam-county-gov/scraper.ts` - Implement real scraping
- `akashic-putnam-county-gov/lib/putnam-county-gov/index.ts` - Export pipeline-compatible fetch

**Strategy:**
The existing `scraper.ts` is a stub. Implement real scraping for:
- Putnam County Commission meetings
- Sheriff department reports
- Building permits
- Budget documents

- [ ] **Step 1.2.1:** Update `scraper.ts` to implement real fetch from county websites
- [ ] **Step 1.2.2:** Transform output to match pipeline `transform_result` format
- [ ] **Step 1.2.3:** Add Putnam connector to data-pipeline's connector registry
- [ ] **Step 1.2.4:** Verify integration with `get_dynamic_geo_intel` generator

---

#### Task 1.3: Fix and Integrate Putnam Courts Connector

**Files to fix:**
- `akashic-putnam-courts/package.json` - Remove Python deps, add TS implementation
- `akashic-putnam-courts/lib/putnam-courts/` - Create TypeScript implementation

**Current Issues:**
- Python dependencies (`fastapi`, `beautifulsoup4`) in npm package.json
- No TypeScript export

- [ ] **Step 1.3.1:** Clean up package.json (remove Python deps, add TypeScript build)
- [ ] **Step 1.3.2:** Create TS wrapper that can call Python scripts via subprocess
- [ ] **Step 1.3.3:** Implement pipeline-compatible transform for court data
- [ ] **Step 1.3.4:** Register in data-pipeline connectors

---

#### Task 1.4: Integrate Reddit Cookeville Connector

**Files to modify:**
- `akashic-reddit-cookeville-connector/lib/` - Add pipeline-compatible transform
- Data-pipeline connector registry

- [ ] **Step 1.4.1:** Add transform to pipeline format
- [ ] **Step 1.4.2:** Register in connector registry

---

#### Task 1.5: Integrate News Source Connector

**Files to modify:**
- `akashic-news-source-connector/lib/` - Add pipeline-compatible transform
- Data-pipeline connector registry

- [ ] **Step 1.5.1:** Add transform for Herald-Citizen + gov meeting RSS
- [ ] **Step 1.5.2:** Register in connector registry

---

## Phase 2: Data Completeness - Putnam-Specific Data (1-2 months)

### Goal: Expand data sources to cover all relevant Putnam County civic information

### Task 2.1: County Commission & Government Meetings
**Sources:**
- Putnam County Commission meeting agendas/minutes
- Cookeville City Council meetings
- School Board meetings
- Planning Commission meetings

**Implementation:**
- [ ] **Step 2.1.1:** Add RSS/API endpoints to news-source-connector
- [ ] **Step 2.1.2:** Create meeting parser for agenda/minutes PDFs
- [ ] **Step 2.1.3:** Extract action items, votes, attendees as structured data

---

### Task 2.2: Sheriff & Public Safety
**Sources:**
- Putnam County Sheriff's Office incident reports
- Cookeville Police Department calls for service
- TN Bureau of Investigation crime stats
- 911 CAD data (if public)

**Implementation:**
- [ ] **Step 2.2.1:** Implement sheriff incident feed parser
- [ ] **Step 2.2.2:** Map incident types to pipeline event categories
- [ ] **Step 2.2.3:** Add geographic location extraction (address → lat/lng)

---

### Task 2.3: Courts & Legal
**Sources:**
- Putnam County Circuit Court dockets
- General Sessions Court
- Juvenile Court
- Federal MD-TN (Nashville division covers Putnam)

**Implementation:**
- [ ] **Step 2.3.1:** Fix Putnam courts connector (Phase 1.3)
- [ ] **Step 2.3.2:** Add case timeline extraction
- [ ] **Step 2.3.3:** Link defendants/parties to entities

---

### Task 2.4: Land Use & Development
**Sources:**
- Putnam County building permits
- Zoning changes
- Planning Commission decisions
- Subdivision plats

**Implementation:**
- [ ] **Step 2.4.1:** Add permit data source
- [ ] **Step 2.4.2:** Map to infrastructure/asset events

---

### Task 2.5: Elections & Voting
**Sources:**
- Putnam County Election Commission
- TN Secretary of State election results
- Campaign finance filings

**Implementation:**
- [ ] **Step 2.5.1:** Add election results feed
- [ ] **Step 2.5.2:** Add campaign finance tracking

---

### Task 2.6: Community Events & Calendar
**Sources:**
- Cookeville Chamber of Commerce events
- Putnam County Fair/Expo
- Library programming
- Farmers markets
- TN Tech events

**Implementation:**
- [ ] **Step 2.6.1:** Create events calendar connector
- [ ] **Step 2.6.2:** Map to geo_intel_event with "society" category

---

## Phase 3: Real-time & Alerts (1-2 months)

### Task 3.1: Emergency Alerts
- TN Emergency Management Agency (TEMA) alerts
- NWS weather alerts for Putnam County
- Putnam EMA alerts

---

### Task 3.2: Change Detection
- Monitor meeting agenda changes
- Track ordinance status changes
- Detect new court filings

---

## Phase 4: Dashboard UX (2-3 months)

### Task 4.1: Custom Putnam Map Layers
- County boundaries
- Commissioner districts
- School zones
- Fire districts
- Voting precincts

---

### Task 4.2: Timeline & Search
- Historical event timeline
- Full-text search across all sources
- Entity-centric views

---

### Task 4.3: Alert Subscriptions
- Email/SMS for specific event types
- Geographic area subscriptions
- Keyword alerts

---

## Technical Implementation Details

### Connector Interface Requirements

Every connector must implement:

```typescript
interface connector {
  source_name: string
  source_type: "api" | "rss" | "csv" | "scrape"
  license_note: string
  auth_required: boolean
  rate_limit: { requests: number, window_seconds: number }
  outputs: intel_type[]
  
  fetch(): Promise<fetch_result>
  transform(data: fetch_result): transform_result
}
```

### Transform Result Format

```typescript
interface transform_result {
  entities: entity[]      // People, orgs, places, assets
  events: event[]         // Meetings, incidents, elections
  claims: claim[]         // Votes, statements, allegations
  sources: source[]       // Data source metadata
  evidences: evidence[]   // Source documents/URLs
  relationships: relationship[] // Entity connections
}
```

### Entity Types for Putnam Data

| Civic Type | Pipeline Entity Type | Key Fields |
|------------|---------------------|------------|
| Commissioner | person | district, party, term |
| County Dept | org | department_head, budget |
| Meeting | event | agenda_items, votes, attendees |
| Ordinance | event | status, effective_date |
| Court Case | event | case_number, parties, judge |
| Incident | event | location, type, disposition |
| Permit | event | address, status, type |

---

## File Structure After Implementation

```
akashic-data-pipeline/
├── lib/
│   └── geo-intelligence/
│       ├── connectors/
│       │   ├── index.ts                    # ← Register putnam-civic
│       │   ├── putnam-civic.ts             # ← NEW: Main Putnam connector
│       │   ├── putnam-civic/
│       │   │   ├── types.ts                # ← Type mappings
│       │   │   ├── government.ts           # ← County gov scraper
│       │   │   ├── courts.ts               # ← Court data
│       │   │   ├── reddit.ts               # ← Reddit connector
│       │   │   ├── news.ts                 # ← News connector
│       │   │   └── transform.ts            # ← Pipeline transform
│       └── types.ts                        # ← Extended with Putnam types

akashic-putnam-county-gov/
├── lib/putnam-county-gov/
│   ├── scraper.ts                          # ← Real implementation
│   ├── transform.ts                        # ← NEW: Pipeline transform
│   └── index.ts                            # ← Export pipeline-compatible API

akashic-putnam-courts/
├── lib/putnam-courts/
│   ├── index.ts                            # ← TS wrapper
│   ├── python/                             # ← Python scripts (unchanged)
│   └── transform.ts                        # ← NEW: Pipeline transform

akashic-reddit-cookeville-connector/
├── lib/
│   └── transform.ts                        # ← NEW: Pipeline transform

akashic-news-source-connector/
├── lib/
│   └── transform.ts                        # ← NEW: Pipeline transform
```

---

## Verification Checklist

After each phase:

- [ ] `npx tsc --noEmit` passes in all workspaces
- [ ] `npm run build` passes in Akashic
- [ ] `get_dynamic_geo_intel()` returns Putnam events in geo_intel_feed_response
- [ ] Events have correct category/severity/location
- [ ] Entities link correctly (commissioners → meetings → votes)
- [ ] No regressions in existing global/geo-intelligence feeds

---

## Next Immediate Actions

1. **Create plan document** ✅ (this file)
2. **Start Task 1.1** - Create Putnam civic types and connector in data-pipeline
3. **Implement Task 1.2** - Wire up Putnam County Gov scraper
4. **Fix Task 1.3** - Putnam Courts npm package
5. **Integrate remaining connectors** (Reddit, News)

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Scraper breakage | Implement graceful degradation, cache last known good |
| Rate limiting | Respect robots.txt, add exponential backoff |
| Data quality | Cross-reference multiple sources, confidence scoring |
| Schema drift | Version types, add migration scripts |
| Deployment complexity | Helm chart already exists, add configmap for sources |