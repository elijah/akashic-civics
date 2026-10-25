# Ecosystem Enhancement Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build ecosystem infrastructure: npm package publication, CI/CD pipeline, VS Code extension, and CLI improvements.

**Architecture:** Extend existing CLI tools (Enhancement 9) with package publishing, editor integration, and automated release workflows.

**Tech Stack:** npm, GitHub Actions, VS Code extension API, commander.js

---

## File Structure

- Create: `.github/workflows/release.yml`
- Create: `.github/workflows/ci.yml`
- Modify: `package.json` - scripts, repository, publish config
- Create: `vscode/extension/` - VS Code extension
  - `package.json`
  - `src/extension.ts`
  - `src/commands/analyze.ts`
  - `src/providers/dataProvider.ts`
- Create: `scripts/release.sh` - Release automation
- Create: `CHANGELOG.md` - Changelog (automated)

---

## Phase 1: CI/CD Pipeline

### Task 1.1: Create CI workflow

**Files:**
- Create: `.github/workflows/ci.yml`

- [ ] **Step 1: Create CI workflow**

```yaml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    strategy:
      matrix:
        node-version: [18.x, 20.x]
        os: [ubuntu-latest, macos-latest, windows-latest]
    runs-on: ${{ matrix.os }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
          cache: 'npm'
      - run: npm ci
      - run: npm run lint
      - run: npx tsc --noEmit
      - run: npm test -- --coverage=false
      - run: npm run test:mutation -- --coverage-analysis perTest
        continue-on-error: true
        timeout-minutes: 30
```

- [ ] **Step 2: Create release workflow**

```yaml
# .github/workflows/release.yml
name: Release

on:
  push:
    tags: ['v*']

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          registry-url: 'https://registry.npmjs.org'
      
      - run: npm ci
      - run: npm test -- --coverage=false
      - run: npx tsc --noEmit
      
      - name: Build package
        run: npm run build
      
      - name: Publish to npm
        run: npm publish --access public
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

- [ ] **Step 3: Add build script to package.json**

```json
"scripts": {
  "build": "tsc --emitDeclarationOnly --declaration --declarationDir dist",
  "prepack": "npm run build",
  "release": "standard-version"
}
```

- [ ] **Step 4: Verify CI runs**

Push a test commit and confirm all matrix jobs pass.

---

## Phase 2: Package Publishing Preparation

### Task 2.1: Configure package.json for npm

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Add package metadata**

Add or update these fields:
```json
{
  "name": "akashic-civics",
  "version": "1.13.0",
  "description": "Criminal justice disparity analysis platform",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js",
      "require": "./dist/index.js"
    },
    "./documentation": {
      "types": "./dist/documentation/index.d.ts",
      "import": "./dist/documentation/index.js",
      "require": "./dist/documentation/index.js"
    },
    "./statistical": {
      "types": "./dist/statistical/index.d.ts",
      "import": "./dist/statistical/index.js",
      "require": "./dist/statistical/index.js"
    }
  },
  "files": ["dist/", "README.md", "LICENSE"],
  "repository": {
    "type": "git",
    "url": "https://github.com/akashic-civics/platform.git"
  },
  "publishConfig": {
    "access": "public"
  },
  "keywords": ["criminal-justice", "disparity", "statistics", "civics"],
  "license": "MIT"
}
```

- [ ] **Step 2: Add tsconfig build config**

Create `tsconfig.build.json`:
```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "declaration": true,
    "declarationDir": "dist",
    "emitDeclarationOnly": true,
    "sourceMap": false,
    "noEmit": false
  },
  "include": ["src/**/*.ts"],
  "exclude": ["src/**/__tests__/**", "src/**/*.test.ts"]
}
```

- [ ] **Step 3: Create README.md if missing**

```markdown
# Akashic Civics

Criminal justice disparity analysis platform for researchers, journalists, and policy analysts.

## Installation

```bash
npm install akashic-civics
```

## Quick Start

```typescript
import { DataNormalizer, computeDescriptiveStatistics } from 'akashic-civics';

const normalizer = new DataNormalizer();
const cases = await normalizer.loadFromJSONL('./data/cases.jsonl');
const stats = computeDescriptiveStatistics(cases);
console.log(`Conviction rate: ${(stats.conviction_rate * 100).toFixed(1)}%`);
```

## Documentation

Full documentation at https://akashic-civics.dev

- [API Reference](https://akashic-civics.dev/api)
- [Tutorials & Playground](https://akashic-civics.dev/playground)
- [Case Studies](https://akashic-civics.dev/case-studies)

## License

MIT
```

- [ ] **Step 4: Verify package builds**

```bash
npm run build
ls dist/
```
Expected: `dist/` contains `.js` and `.d.ts` files.

---

## Phase 3: VS Code Extension

### Task 3.1: Scaffold VS Code extension

**Files:**
- Create: `vscode/extension/package.json`
- Create: `vscode/extension/src/extension.ts`
- Create: `vscode/extension/src/commands/runAnalysis.ts`
- Create: `vscode/extension/src/providers/caseProvider.ts`

- [ ] **Step 1: Create package.json for extension**

```json
{
  "name": "akashic-civics",
  "displayName": "Akashic Civics",
  "description": "Criminal justice disparity analysis tools",
  "version": "1.0.0",
  "publisher": "akashic-civics",
  "engines": {
    "vscode": "^1.80.0"
  },
  "activationEvents": ["onCommand:akashic-civics.runAnalysis"],
  "main": "./dist/extension.js",
  "contributes": {
    "commands": [
      {
        "command": "akashic-civics.runAnalysis",
        "title": "Run Disparity Analysis",
        "category": "Akashic Civics"
      },
      {
        "command": "akashic-civics.loadCases",
        "title": "Load Case Dataset",
        "category": "Akashic Civics"
      }
    ],
    "configuration": [
      {
        "title": "Akashic Civics",
        "properties": {
          "akashic-civics.defaultJurisdiction": {
            "type": "string",
            "description": "Default jurisdiction code",
            "default": ""
          },
          "akashic-civics.confidenceLevel": {
            "type": "number",
            "description": "Default confidence level",
            "default": 0.95
          }
        }
      }
    ]
  },
  "scripts": {
    "vscode:prepublish": "npm run build",
    "build": "tsc -p ./",
    "watch": "tsc -watch -p ./",
    "package": "vsce package",
    "publish": "vsce publish"
  },
  "devDependencies": {
    "@types/vscode": "^1.80.0",
    "@types/node": "^20.x",
    "typescript": "^5.x",
    "@vscode/vsce": "^2.x"
  }
}
```

- [ ] **Step 2: Create extension.ts entry point**

```typescript
import * as vscode from 'vscode';
import { runAnalysisCommand } from './commands/runAnalysis';
import { loadCasesCommand } from './commands/loadCases';

export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerCommand('akashic-civics.runAnalysis', runAnalysisCommand),
    vscode.commands.registerCommand('akashic-civics.loadCases', loadCasesCommand)
  );
}

export function deactivate() {}
```

- [ ] **Step 3: Create runAnalysis command**

```typescript
import * as vscode from 'vscode';

export function runAnalysisCommand() {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    vscode.window.showInformationMessage('No active editor');
    return;
  }
  
  vscode.window.withProgress({
    location: vscode.ProgressLocation.Notification,
    title: "Akashic Civics",
    cancellable: true
  }, async (progress, token) => {
    progress.report({ message: 'Analyzing...' });
    // Analysis logic here
    vscode.window.showInformationMessage('Analysis complete');
  });
}
```

- [ ] **Step 4: Install extension dependencies and verify**

```bash
cd /home/elw/Akashic-Civics/vscode/extension
npm install
npm run build
ls dist/
```
Expected: Compiled extension in `dist/`.

---

## Phase 4: Release Automation

### Task 4.1: Set up conventional commits and release tooling

**Files:**
- Create: `scripts/release.sh`
- Modify: `package.json`

- [ ] **Step 1: Install standard-version**

```bash
npm install --save-dev standard-version conventional-changelog-conventionalcommits
```

- [ ] **Step 2: Create release script**

```bash
#!/bin/bash
set -e

echo "🚀 Starting release process..."

# Run tests
npm test -- --coverage=false

# Type check
npx tsc --noEmit

# Build
npm run build

# Bump version and generate changelog
npx standard-version

# Publish to npm
npm publish --access public

# Push tags
git push --follow-tags origin main

echo "✅ Release complete!"
```

- [ ] **Step 3: Add release script to package.json**

```json
"scripts": {
  "release": "bash scripts/release.sh",
  "changelog": "standard-version --dry-run"
}
```

---

## Completion Tracking

Update ENHANCEMENT_TRACKER.md with ecosystem subtask completion.