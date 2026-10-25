# Documentation Enhancement Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create comprehensive documentation including TypeDoc API reference, interactive tutorial playground, and case study repository.

**Architecture:** Build on existing documentation infrastructure (Enhancement 12) with TypeDoc generation, Next.js playground, and markdown case studies.

**Tech Stack:** TypeDoc, Next.js, React, markdown, Mermaid diagrams

---

## File Structure

- Create: `typedoc.json` - TypeDoc configuration
- Create: `docs/api/` - Generated API reference
- Create: `playground/` - Next.js tutorial playground
  - `package.json`
  - `next.config.js`
  - `app/page.tsx`
  - `components/TutorialPlayer.tsx`
  - `components/CodeEditor.tsx`
  - `components/OutputDisplay.tsx`
- Create: `docs/case_studies/` - Markdown case studies
- Create: `.github/workflows/docs.yml` - Docs deployment workflow
- Modify: `package.json` - Add docs scripts

---

## Phase 1: TypeDoc API Reference

### Task 1.1: Configure TypeDoc

**Files:**
- Create: `typedoc.json`
- Modify: `package.json:scripts`

- [ ] **Step 1: Install TypeDoc**

```bash
npm install --save-dev typedoc typedoc-plugin-markdown
```

- [ ] **Step 2: Create typedoc.json**

```json
{
  "entryPoints": ["src/index.ts"],
  "out": "docs/api",
  "theme": "default",
  "plugin": ["typedoc-plugin-markdown"],
  "excludeExternals": true,
  "excludePrivate": true,
  "excludeProtected": true,
  "categorizeByGroup": true,
  "defaultCategory": "Core Modules",
  "categoryOrder": [
    "Core",
    "Statistical",
    "Accountability",
    "Visualization",
    "CLI",
    "Testing",
    "Documentation"
  ],
  "readme": "README.md",
  "githubPages": true,
  "cleanOutputDir": true
}
```

- [ ] **Step 3: Add docs scripts to package.json**

```json
"scripts": {
  "docs:api": "typedoc --options typedoc.json",
  "docs:serve": "npx http-server docs/api -p 8080"
}
```

- [ ] **Step 4: Generate and verify API docs**

```bash
npm run docs:api
ls docs/api/
```
Expected: Markdown files for all exported modules.

---

## Phase 2: Interactive Tutorial Playground

### Task 2.1: Scaffold Next.js playground

**Files:**
- Create: `playground/package.json`
- Create: `playground/next.config.js`
- Create: `playground/tsconfig.json`

- [ ] **Step 1: Initialize Next.js project**

```bash
cd /home/elw/Akashic-Civics/playground
npm init -y
npm install next@14 react@18 react-dom@18
npm install --save-dev typescript @types/react @types/node
```

- [ ] **Step 2: Create next.config.js**

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['akashic-civics'],
  output: 'export',
  distDir: '../docs/playground'
};
module.exports = nextConfig;
```

- [ ] **Step 3: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": {
      "@/*": ["./*"],
      "akashic-civics": ["../src/index.ts"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

---

### Task 2.2: Create tutorial playground components

**Files:**
- Create: `playground/app/layout.tsx`
- Create: `playground/app/page.tsx`
- Create: `playground/components/TutorialPlayer.tsx`
- Create: `playground/components/CodeEditor.tsx`
- Create: `playground/components/OutputDisplay.tsx`

- [ ] **Step 1: Create main page**

```tsx
// playground/app/page.tsx
import { TutorialPlayer } from '@/components/TutorialPlayer';
import { createTutorialPlayer } from 'akashic-civics/documentation';

export default function PlaygroundPage() {
  const player = createTutorialPlayer();
  const tutorials = player.getTutorials();

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">Akashic Civics Interactive Playground</h1>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <TutorialSidebar tutorials={tutorials} />
        <TutorialContent />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create TutorialPlayer component**

```tsx
// playground/components/TutorialPlayer.tsx
'use client';
import { useState } from 'react';
import { Tutorial, TutorialStep, TutorialProgress } from 'akashic-civics/documentation';

interface TutorialSidebarProps {
  tutorials: Tutorial[];
}

export function TutorialSidebar({ tutorials }: TutorialSidebarProps) {
  return (
    <div className="lg:col-span-1">
      <h2 className="text-xl font-semibold mb-4">Tutorials</h2>
      <ul className="space-y-2">
        {tutorials.map((t) => (
          <li key={t.id} className="p-3 border rounded hover:bg-gray-50 cursor-pointer">
            <h3 className="font-medium">{t.title}</h3>
            <p className="text-sm text-gray-600">{t.description}</p>
            <div className="flex gap-2 mt-2 text-xs text-gray-500">
              <span>{t.difficulty}</span>
              <span>{t.estimatedMinutes} min</span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

- [ ] **Step 3: Create CodeEditor with Monaco**

```bash
cd /home/elw/Akashic-Civics/playground
npm install @monaco-editor/react
```

```tsx
// playground/components/CodeEditor.tsx
'use client';
import { useRef, useEffect } from 'react';
import Editor from '@monaco-editor/react';

interface CodeEditorProps {
  code: string;
  onChange: (code: string) => void;
  language?: string;
}

export function CodeEditor({ code, onChange, language = 'typescript' }: CodeEditorProps) {
  const editorRef = useRef<Editor>(null);

  return (
    <Editor
      ref={editorRef}
      height="300"
      defaultLanguage={language}
      defaultValue={code}
      onChange={(value) => value && onChange(value)}
      theme="vs-dark"
      options={{
        minimap: { enabled: false },
        fontSize: 14,
        tabSize: 2,
        lineNumbers: 'on'
      }}
    />
  );
}
```

---

### Task 2.3: Add build script and test

**Files:**
- Modify: `playground/package.json`
- Create: `.github/workflows/playground.yml`

- [ ] **Step 1: Add build script**

```json
"scripts": {
  "dev": "next dev",
  "build": "next build",
  "export": "next build"
}
```

- [ ] **Step 2: Build playground**

```bash
cd /home/elw/Akashic-Civics/playground
npm run build
```
Expected: Static export in `../docs/playground/`

---

## Phase 3: Case Study Repository

### Task 3.1: Create case study templates and examples

**Files:**
- Create: `docs/case_studies/template.md`
- Create: `docs/case_studies/disparity_analysis_houston.md`
- Create: `docs/case_studies/sentencing_reform_chicago.md`
- Create: `docs/case_studies/juvenile_justice_california.md`

- [ ] **Step 1: Create template**

```markdown
# [Case Study Title]

## Context
- **Jurisdiction**: 
- **Time Period**: 
- **Policy Question**: 

## Data
- **Source**: 
- **Sample Size**: 
- **Key Variables**: 

## Analysis Pipeline
1. Data loading & validation
2. Descriptive statistics
3. Disconfirmation testing
4. Regression modeling
5. Causal inference
6. Benchmarking
7. Reporting

## Key Findings
- **Finding 1**: [effect size, confidence interval, disconfirmation score]
- **Finding 2**: ...

## Policy Implications
...

## Reproducibility
- **Code**: [link to notebook/script]
- **Data**: [availability statement]
- **Version**: Akashic Civics v1.13
```

- [ ] **Step 2: Create Houston disparity case study**

```markdown
# Racial Disparity Analysis: Harris County, TX (2018-2023)

## Context
- **Jurisdiction**: Harris County, Texas
- **Time Period**: 2018-2023
- **Policy Question**: Are Black defendants convicted at higher rates than White defendants after controlling for offense severity and prior record?

## Data
- **Source**: Harris County District Clerk public records
- **Sample Size**: 47,231 felony cases
- **Key Variables**: race_ethnicity, offense_severity, prior_convictions, conviction, sentence_months

## Analysis Pipeline
...

## Key Findings
- **Raw disparity**: Black conviction rate 72.3% vs White 65.1% (difference: 7.2pp)
- **Adjusted (logistic regression)**: Black defendants 1.28x odds of conviction (95% CI: 1.19-1.38)
- **Disconfirmation score**: 0.73 (passed 8/10 tests)
- **Peer comparison**: 85th percentile disparity among TX counties

## Policy Implications
Recommend case-level review of charging decisions for drug offenses.

## Reproducibility
- **Code**: `examples/houston_disparity_analysis.ts`
- **Data**: Public records request template included
- **Version**: Akashic Civics v1.13
```

---

## Phase 4: Documentation Deployment

### Task 4.1: Deploy docs to GitHub Pages

**Files:**
- Create: `.github/workflows/docs.yml`
- Modify: `package.json`

- [ ] **Step 1: Create docs workflow**

```yaml
name: Deploy Documentation

on:
  push:
    branches: [main]
    paths:
      - 'src/**'
      - 'typedoc.json'
      - 'playground/**'
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

jobs:
  build-docs:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      
      - run: npm ci
      
      - name: Generate API docs
        run: npm run docs:api
      
      - name: Build playground
        run: |
          cd playground && npm ci && npm run build
      
      - name: Deploy to GitHub Pages
        uses: actions/upload-pages-artifact@v3
        with:
          path: docs/

  deploy:
    needs: build-docs
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to GitHub Pages
        uses: actions/deploy-pages@v4
```

- [ ] **Step 2: Enable GitHub Pages**

Settings > Pages > Source: GitHub Actions

---

## Completion Tracking

Update ENHANCEMENT_TRACKER.md with documentation subtask completion.