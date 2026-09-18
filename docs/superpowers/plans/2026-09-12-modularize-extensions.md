# Modularize Akashic Extensions - Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor the Akashic monorepo-style structure into separately installable npm packages, with the main app consuming extensions via proper dependency imports.

**Architecture:** Each extension (data-pipeline, dashboard, llm, connectors) lives in its own Git repo with proper npm package.json exports. The main Akashic app references them via npm dependency imports and TypeScript path mappings. Root-level workspace config ties them together for unified development.

**Tech Stack:** npm workspaces, TypeScript path mappings, Next.js, Git submodules/worktrees

---

## Current State (as of 2026-09-12)

### What's Done:
- All extension repos exist separately: `akashic-data-pipeline`, `akashic-dashboard`, `akashic-llm`, `akashic-gov-data-connector`, `akashic-news-source-connector`, `akashic-facebook-cookeville-connector`, `akashic-putnam-county-gov`, `akashic-putnam-courts`, `akashic-reddit-cookeville-connector`
- Each repo has proper `package.json` with `exports` field mapping subpath imports to files
- `akashic-data-pipeline` is symlinked into main app's node_modules (`node_modules/akashic-data-pipeline -> ../../akashic-data-pipeline`)
- Initial import refactoring started: `app/api/geo-intelligence/route.ts` and `app/page.tsx` updated to use `akashic-data-pipeline/lib/...` imports
- `tsconfig.json` has path mappings for `akashic-data-pipeline/*`
- `next.config.ts` has module resolution path for node_modules

### What's Not Done:
- Uncommitted changes in main repo (4 modified files, not committed)
- Import migration incomplete: `lib/geo-intelligence/`, `lib/worldmonitor/`, `lib/weather/`, `lib/live/`, `lib/recon/`, `lib/sigint/`, `lib/resolution/` still in main app
- No root-level workspace config (npm/pnpm workspaces)
- No unified install script
- Type resolution may have issues for non-data-pipeline imports
- Packages not listed in each other's dependencies
- No root-level package.json for workspace management

---

## Task 1: Commit Current In-Progress Changes

**Files:**
- Modified: `app/api/geo-intelligence/route.ts`
- Modified: `app/page.tsx`
- Modified: `next.config.ts`
- Modified: `tsconfig.json`

- [ ] **Step 1: Review the current diff to confirm correctness**

Run: `git diff -- app/api/geo-intelligence/route.ts app/page.tsx next.config.ts tsconfig.json`

Expected: Review that imports correctly point to `akashic-data-pipeline/lib/...` and paths are correct.

- [ ] **Step 2: Stage and commit the in-progress changes**

```bash
git add app/api/geo-intelligence/route.ts app/page.tsx next.config.ts tsconfig.json
git commit -m "refactor: migrate geo-intelligence imports to akashic-data-pipeline package"
```

Expected: Clean commit with descriptive message.

- [ ] **Step 3: Verify commit**

Run: `git log --oneline -3`
Expected: Shows the new commit at top.

---

## Task 2: Complete Import Migration in Main App

**Files to modify:**
- `app/api/wm/infrastructure/route.ts` (lines with `@/lib/worldmonitor` imports)
- `app/api/wm/military/route.ts` (lines with `@/lib/worldmonitor` imports)
- All other files importing from `@/lib/geo-intelligence/*`, `@/lib/weather/*`, `@/lib/live/*`, `@/lib/recon/*`, `@/lib/sigint/*`, `@/lib/resolution/*`, `@/lib/net/*`, `@/lib/db/*`, `@/lib/cache/*`, `@/lib/analytics/*`, `@/lib/geo/*`, `@/lib/pipeline/*`, `@/lib/reports/*`

- [ ] **Step 1: Find ALL remaining @/lib/ imports in the main app**

Run: `grep -rn "from '@/lib" --include="*.ts" --include="*.tsx" app/ components/`
Expected: List of all files still using internal imports.

- [ ] **Step 2: Map each @/lib/ import to its target package**

For each file found in step 1, determine which package the import should target:
- `@/lib/geo-intelligence/*` -> `akashic-data-pipeline/lib/geo-intelligence/*`
- `@/lib/worldmonitor/*` -> `akashic-data-pipeline/lib/worldmonitor/*` (if exported) or stays in app
- `@/lib/weather/*` -> `akashic-data-pipeline/lib/weather/*` or `akashic-dashboard/lib/weather/*`
- `@/lib/live/*` -> `akashic-dashboard/lib/live/*` or `akashic-data-pipeline/lib/live/*`
- `@/lib/recon/*` -> `akashic-dashboard/lib/recon/*` or `akashic-data-pipeline/lib/recon/*`
- `@/lib/sigint/*` -> `akashic-data-pipeline/lib/sigint/*`
- `@/lib/resolution/*` -> `akashic-data-pipeline/lib/resolution/*`
- `@/lib/net/*` -> `akashic-data-pipeline/lib/net/*`
- `@/lib/db/*` -> `akashic-data-pipeline/lib/db/*`
- `@/lib/cache/*` -> `akashic-data-pipeline/lib/cache/*`
- `@/lib/analytics/*` -> `akashic-data-pipeline/lib/analytics/*`
- `@/lib/geo/*` -> `akashic-data-pipeline/lib/geo/*`
- `@/lib/pipeline/*` -> `akashic-data-pipeline/lib/pipeline/*`
- `@/lib/reports/*` -> `akashic-data-pipeline/lib/reports/*`

- [ ] **Step 3: Verify which modules already exist in each package's exports**

For each package, check `package.json` `exports` field to confirm the target path is exported.
Run for data-pipeline: `cat ../akashic-data-pipeline/package.json | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>console.log(JSON.parse(s).exports))"`

- [ ] **Step 4: Update imports in each file**

For each file, replace `@/lib/...` with the appropriate package path. Update tsconfig.json paths as needed.

- [ ] **Step 5: Verify no stale @/lib/ imports remain (except app-internal ones)**

Run: `grep -rn "from '@/lib" --include="*.ts" --include="*.tsx" app/ components/`
Expected: Only app-internal modules that should NOT be extracted should remain (e.g., types, shared utilities used only within app).

---

## Task 3: Add akashic-dashboard to Dependency Chain

**Files to modify:**
- Create/modify: `/home/elw/Akashic/package.json` (add dependency)
- Modify: `tsconfig.json` (add dashboard path mappings)
- Modify: `next.config.ts` (add dashboard module resolution)

- [ ] **Step 1: Check if akashic-dashboard exports are needed by main app**

Check which components/modules the main app imports from dashboard package.
Run: `grep -rn "akashic-dashboard" --include="*.ts" --include="*.tsx" app/ components/`

- [ ] **Step 2: Add akashic-dashboard symlink to node_modules**

```bash
ln -s ../../akashic-dashboard node_modules/akashic-dashboard
```

- [ ] **Step 3: Add dashboard exports to tsconfig.json paths**

Add to tsconfig.json paths:
```json
"akashic-dashboard/*": ["./node_modules/akashic-dashboard/*"],
```

- [ ] **Step 4: Add dashboard to main package.json dependencies**

```json
"akashic-dashboard": "file:../akashic-dashboard"
```

---

## Task 4: Create Root-Level Workspace Configuration

**Files to create:**
- `/home/elw/workspace-package.json` (root package.json)
- `/home/elw/.gitignore` (if not exists, for workspace)

- [ ] **Step 1: Create root package.json with npm workspaces config**

```json
{
  "name": "akashic-workspace",
  "private": true,
  "workspaces": [
    "Akashic",
    "akashic-data-pipeline",
    "akashic-dashboard",
    "akashic-llm",
    "akashic-gov-data-connector",
    "akashic-news-source-connector",
    "akashic-facebook-cookeville-connector",
    "akashic-putnam-county-gov",
    "akashic-putnam-courts",
    "akashic-reddit-cookeville-connector"
  ],
  "scripts": {
    "dev": "npm --workspace=Akashic run dev",
    "build": "npm --workspace=Akashic run build",
    "test": "npm run test --workspaces"
  }
}
```

- [ ] **Step 2: Verify npm workspaces recognize all packages**

Run: `cd /home/elw && npm workspace list`
Expected: All 10 packages listed as workspaces.

- [ ] **Step 3: Test install from root**

Run: `cd /home/elw && npm install`
Expected: All workspace dependencies resolved, symlinks created automatically.

---

## Task 5: Verify All Packages Are Sanely Installable

**Files to verify:** All package.json files in all repos

- [ ] **Step 1: Verify each package's exports field matches its lib structure**

For each repo, check that exports in package.json map to actual files:
```bash
for dir in Akashic akashic-data-pipeline akashic-dashboard akashic-llm akashic-gov-data-connector akashic-news-source-connector akashic-facebook-cookeville-connector akashic-putnam-county-gov akashic-putnam-courts akashic-reddit-cookeville-connector; do
  echo "=== $dir ==="
  ls ../$dir/lib 2>/dev/null || echo "(no lib dir)"
done
```

- [ ] **Step 2: Verify each package has a valid main/module entry**

Check that each package.json has `main` pointing to a real file.

- [ ] **Step 3: Verify dependency declarations are correct**

Each package should declare dependencies on packages it imports from.

- [ ] **Step 4: Test npm pack dry-run for each package**

```bash
cd ../akashic-data-pipeline && npm pack --dry-run
```
Expected: Lists files that would be published.

---

## Task 6: Create Unified Installation Script

**Files to create:**
- `/home/elw/Akashic/INSTALL.md` (installation instructions)
- `/home/elw/setup.sh` (setup script)

- [ ] **Step 1: Create installation documentation**

Document the new multi-repo setup process including:
- Prerequisites (Node 20+, npm)
- Cloning all repos
- Running npm install from root workspace
- Starting development server

- [ ] **Step 2: Create automated setup script**

```bash
#!/bin/bash
# setup.sh - Unified Akashic workspace setup
set -e
ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"

echo "Installing Akashic workspace..."
npm install

echo "Building all packages..."
npm run build --workspaces

echo "Setup complete!"
```

- [ ] **Step 3: Make script executable and test**

Run: `chmod +x setup.sh && ./setup.sh`
Expected: All packages install and build successfully.

---

## Task 7: Final Testing and Commit

- [ ] **Step 1: Run TypeScript type check**

Run: `npx tsc --noEmit`
Expected: No type errors.

- [ ] **Step 2: Run Next.js build**

Run: `npm run build`
Expected: Build succeeds without errors.

- [ ] **Step 3: Commit all remaining changes**

```bash
git add -A
git commit -m "feat: complete modularization with workspace config and install scripts"
```

- [ ] **Step 4: Push changes**

Run: `git push origin main`
Expected: All changes pushed successfully.

---

## Summary of File Changes Across All Tasks

| File | Action | Purpose |
|------|--------|---------|
| `app/api/geo-intelligence/route.ts` | Modify | Change import to akashic-data-pipeline |
| `app/page.tsx` | Modify | Change type import to akashic-data-pipeline |
| `next.config.ts` | Modify | Add module resolution path |
| `tsconfig.json` | Modify | Add path mappings |
| `app/api/wm/infrastructure/route.ts` | Modify | Change worldmonitor imports |
| `app/api/wm/military/route.ts` | Modify | Change worldmonitor imports |
| (TBD files) | Modify | Change remaining @/lib imports |
| `Akashic/package.json` | Modify | Add workspace deps |
| `Akashic/tsconfig.json` | Modify | Add more path mappings |
| `/home/elw/workspace-package.json` | Create | Root workspace config |
| `Akashic/INSTALL.md` | Create | Installation docs |
| `/home/elw/setup.sh` | Create | Setup script |