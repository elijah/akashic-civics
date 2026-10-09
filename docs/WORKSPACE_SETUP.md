# Akashic Civics Workspace Setup

This document describes how to integrate Akashic Civics into the main Akashic
monorepo using npm workspaces, without polluting the main project.

## Architecture

```
/home/elw/
├── Akashic/                 # Main Akashic app (Next.js monorepo)
├── akashic-civics/          # This project (Akashic Civics analysis)
├── akashic-data-pipeline/   # Core data pipeline
├── akashic-dashboard/       # UI components
├── akashic-llm/             # ML integration
└── akashic-putnam-county-gov/  # Putnam County connector
```

## Option 1: Standalone (Recommended for development)

Akashic Civics is self-contained. Install it standalone:

```bash
cd akashic-civics
./scripts/install.sh
```

Then use it in any project:

```typescript
import { AnalysisPipeline } from 'akashic-civics';
```

## Option 2: Workspace Integration

If you want Akashic Civics to be part of the main Akashic workspace:

### Step 1: Create Root Workspace

Create `/home/elw/package.json`:

```json
{
  "name": "akashic-workspace",
  "private": true,
  "workspaces": [
    "Akashic",
    "akashic-civics",
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
    "build": "npm run build --workspaces",
    "test": "npm run test --workspaces"
  }
}
```

### Step 2: Install from Root

```bash
cd /home/elw
npm install
```

### Step 3: Add Akashic Civics as Dependency

In the main Akashic `package.json`, add:

```json
"dependencies": {
  "akashic-civics": "file:../akashic-civics"
}
```

### Step 4: Update TypeScript Config

In the main Akashic `tsconfig.json`, add path mapping:

```json
"paths": {
  "akashic-civics/*": ["../akashic-civics/src/*"]
}
```

## Verification

After setup, verify everything works:

```bash
# Check workspace recognition
npm workspace list

# Build Akashic Civics
cd akashic-civics && npm run build

# Run tests
npm test
```

## Notes

- Akashic Civics uses TypeScript source files directly (no build step required for development)
- The `dist/` directory contains compiled JavaScript for production use
- R integration requires `Rscript` on PATH for full analysis capabilities
- The JS fallback implementation ensures basic analysis works without R