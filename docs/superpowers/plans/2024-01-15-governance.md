# Governance Enhancement Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Establish project governance including contributing guidelines, code owners, security policy, release process, and community health files.

**Architecture:** Add standard GitHub community files, CODEOWNERS, SECURITY.md, release automation, and contribution workflow.

**Tech Stack:** GitHub features, dependabot, renovate, semantic release

---

## File Structure

- Create: `CONTRIBUTING.md`
- Create: `CODEOWNERS`
- Create: `SECURITY.md`
- Create: `.github/dependabot.yml`
- Create: `.github/renovate.json`
- Create: `.github/CODE_OF_CONDUCT.md`
- Create: `.github/PULL_REQUEST_TEMPLATE.md`
- Create: `.github/ISSUE_TEMPLATE/`
  - `bug_report.yml`
  - `feature_request.yml`
  - `security_vulnerability.yml`
- Modify: `package.json` - add governance scripts
- Create: `scripts/verify_contribution.sh`

---

## Phase 1: Community Health Files

### Task 1.1: Create CONTRIBUTING.md

**Files:**
- Create: `CONTRIBUTING.md`

- [ ] **Step 1: Write contributing guide**

```markdown
# Contributing to Akashic Civics

Thank you for your interest in contributing! This project welcomes contributions from researchers, developers, and criminal justice practitioners.

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/YOUR-USERNAME/akashic-civics.git`
3. Install dependencies: `npm ci`
4. Create a branch: `git checkout -b feature/your-feature-name`

## Development Workflow

### Code Standards

- TypeScript strict mode required
- ESLint + Prettier formatting
- All new code must have tests
- Mutation testing threshold: 50% minimum

### Testing Requirements

```bash
# Run all tests
npm test

# Run with coverage
npm test -- --coverage

# Run mutation tests
npm run test:mutation

# Run fuzz tests
npm run test:fuzz
```

### Commit Messages

Use conventional commits:
- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation changes
- `test:` Test additions
- `refactor:` Code restructuring
- `perf:` Performance improvements

### Pull Request Process

1. Ensure all tests pass
2. Update documentation if needed
3. Add entry to CHANGELOG.md (automated via standard-version)
4. Request review from CODEOWNERS
5. Address feedback

## Project Structure

```
src/
├── statistical/        # Statistical methods
├── accountability/     # Accountability tools
├── visualization/      # D3.js visualizations
├── cli/               # Command-line interface
├── documentation/      # Tutorials & guides
├── testing/           # Property/fuzz/mutation tests
└── index.ts           # Main exports
```

## Reporting Issues

Use the issue templates:
- Bug reports
- Feature requests
- Security vulnerabilities (private)

## Code of Conduct

See [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md)

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
```

---

### Task 1.2: Create CODEOWNERS

**Files:**
- Create: `.github/CODEOWNERS`

- [ ] **Step 1: Define code owners**

```text
# Core maintainers
* @akashic-civics/maintainers

# Statistical modules
/src/statistical/ @akashic-civics/statisticians

# Accountability tools
/src/accountability/ @akashic-civics/accountability-team

# Visualization
/src/visualization/ @akashic-civics/visualization-team

# CLI tools
/src/cli/ @akashic-civics/cli-team

# Documentation
/src/documentation/ @akashic-civics/documentation-team
/docs/ @akashic-civics/documentation-team

# Testing infrastructure
/src/testing/ @akashic-civics/testing-team

# CI/CD
/.github/workflows/ @akashic-civics/infrastructure-team

# Security
SECURITY.md @akashic-civics/security-team
```

---

### Task 1.3: Create SECURITY.md

**Files:**
- Create: `SECURITY.md`

- [ ] **Step 1: Write security policy**

```markdown
# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.13.x  | :white_check_mark: |
| 1.12.x  | :x:                |
| < 1.12  | :x:                |

## Reporting a Vulnerability

**Do not report security vulnerabilities via public GitHub issues.**

Email: security@akashic-civics.org

Include:
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

We will acknowledge receipt within 48 hours and provide a timeline for fix.

## Disclosure Policy

- We follow coordinated disclosure
- Security patches released within 30 days for critical issues
- CVE requested for confirmed vulnerabilities
- Public disclosure after patch release

## Security Features

- Input validation on all external data
- SQL injection prevention (parameterized queries)
- Path traversal protection
- Resource limits (max file size, execution time)
- No eval() or dynamic code execution
- Dependency scanning (npm audit, dependabot)

## Testing Security

```bash
npm run test:security  # Runs security test suite
npm audit              # Dependency vulnerabilities
```

## Known Limitations

- R script execution runs in sandboxed environment
- No authentication built-in (designed for offline use)
- File system access limited to configured directories
```

---

### Task 1.4: Create Code of Conduct

**Files:**
- Create: `.github/CODE_OF_CONDUCT.md`

- [ ] **Step 1: Use Contributor Covenant**

```markdown
# Contributor Covenant Code of Conduct

## Our Pledge

We as members, contributors, and leaders pledge to make participation in our
community a harassment-free experience for everyone.

## Our Standards

Examples of behavior that contributes to a positive environment:

* Using welcoming and inclusive language
* Being respectful of differing viewpoints and experiences
* Gracefully accepting constructive criticism
* Focusing on what is best for the community
* Showing empathy towards other community members

Examples of unacceptable behavior:

* The use of sexualized language or imagery
* Trolling, insulting/derogatory comments, personal attacks
* Public or private harassment
* Publishing others' private information without explicit permission
* Other conduct which could reasonably be considered inappropriate

## Enforcement Responsibilities

Community leaders are responsible for clarifying and enforcing our standards of
acceptable behavior and will take appropriate and fair corrective action in
response to any behavior that they deem inappropriate, threatening, offensive,
or harmful.

## Scope

This Code of Conduct applies within all community spaces, and also applies when
an individual is officially representing the community in public spaces.

## Enforcement

Instances of abusive, harassing, or otherwise unacceptable behavior may be
reported by contacting the project team at conduct@akashic-civics.org.

## Attribution

This Code of Conduct is adapted from the [Contributor Covenant][homepage],
version 2.1, available at
[https://www.contributor-covenant.org/version/2/1/code_of_conduct.html][v2.1].

[homepage]: https://www.contributor-covenant.org
[v2.1]: https://www.contributor-covenant.org/version/2/1/code_of_conduct.html
```

---

## Phase 2: Issue & PR Templates

### Task 2.1: Create issue templates

**Files:**
- Create: `.github/ISSUE_TEMPLATE/bug_report.yml`
- Create: `.github/ISSUE_TEMPLATE/feature_request.yml`
- Create: `.github/ISSUE_TEMPLATE/security_vulnerability.yml`

- [ ] **Step 1: Bug report template**

```yaml
name: Bug Report
description: File a bug report
title: "[Bug]: "
labels: ["bug", "triage"]
body:
  - type: markdown
    attributes:
      value: |
        Thanks for taking the time to fill out this bug report!
  - type: input
    id: version
    attributes:
      label: Version
      description: What version of Akashic Civics are you using?
      placeholder: "1.13.0"
    validations:
      required: true
  - type: textarea
    id: description
    attributes:
      label: Description
      description: A clear and concise description of what the bug is.
    validations:
      required: true
  - type: textarea
    id: reproduction
    attributes:
      label: Steps to Reproduce
      description: Steps to reproduce the behavior
      placeholder: |
        1. Run `akashic analyze ...`
        2. See error
    validations:
      required: true
  - type: textarea
    id: expected
    attributes:
      label: Expected Behavior
      description: What you expected to happen
    validations:
      required: true
  - type: textarea
    id: logs
    attributes:
      label: Logs/Output
      description: Relevant log output or error messages
      render: shell
  - type: dropdown
    id: severity
    attributes:
      label: Severity
      options:
        - Low - Minor issue, workaround exists
        - Medium - Affects functionality
        - High - Blocks critical workflow
        - Critical - Security or data loss
    validations:
      required: true
```

- [ ] **Step 2: Feature request template**

```yaml
name: Feature Request
description: Suggest an idea for this project
title: "[Feature]: "
labels: ["enhancement", "triage"]
body:
  - type: markdown
    attributes:
      value: |
        Thanks for suggesting a feature!
  - type: textarea
    id: problem
    attributes:
      label: Problem Statement
      description: What problem does this solve?
    validations:
      required: true
  - type: textarea
    id: solution
    attributes:
      label: Proposed Solution
      description: Describe your ideal solution
    validations:
      required: true
  - type: textarea
    id: alternatives
    attributes:
      label: Alternatives Considered
      description: Other solutions you've considered
  - type: dropdown
    id: priority
    attributes:
      label: Priority
      options:
        - Nice to have
        - Important
        - Critical for my workflow
    validations:
      required: true
```

- [ ] **Step 3: Security vulnerability template**

```yaml
name: Security Vulnerability
description: Report a security vulnerability (private)
title: "[Security]: "
labels: ["security", "triage"]
body:
  - type: markdown
    attributes:
      value: |
        **This will be kept private.**
        Email security@akashic-civics.org for sensitive reports.
  - type: textarea
    id: description
    attributes:
      label: Vulnerability Description
      description: Detailed description of the vulnerability
    validations:
      required: true
  - type: textarea
    id: impact
    attributes:
      label: Impact Assessment
      description: Potential impact if exploited
    validations:
      required: true
  - type: textarea
    id: reproduction
    attributes:
      label: Reproduction Steps
      description: Steps to reproduce (if safe to share)
  - type: textarea
    id: suggested_fix
    attributes:
      label: Suggested Fix
      description: Any ideas for remediation
```

---

### Task 2.2: Create PR template

**Files:**
- Create: `.github/PULL_REQUEST_TEMPLATE.md`

- [ ] **Step 1: Create PR template**

```markdown
# Pull Request

## Description

<!-- Describe your changes -->

## Type of Change

- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update
- [ ] Performance improvement
- [ ] Refactoring
- [ ] Test additions

## Testing

- [ ] All existing tests pass
- [ ] New tests added for changes
- [ ] Mutation tests pass (or threshold maintained)
- [ ] Fuzz tests pass
- [ ] Manual testing completed

## Checklist

- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] CHANGELOG.md entry added (will be automated)
- [ ] No new ESLint warnings
- [ ] TypeScript compiles cleanly

## Related Issues

Closes #<!-- issue number -->

## Screenshots (if applicable)

<!-- Add screenshots for UI changes -->

## Additional Context

<!-- Any other information -->
```

---

## Phase 3: Dependency Management

### Task 3.1: Configure Dependabot and Renovate

**Files:**
- Create: `.github/dependabot.yml`
- Create: `.github/renovate.json`

- [ ] **Step 1: Create dependabot.yml**

```yaml
version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
      day: "monday"
      time: "09:00"
    open-pull-requests-limit: 10
    reviewers:
      - "akashic-civics/maintainers"
    assignees:
      - "akashic-civics/dependabot-bot"
    labels:
      - "dependencies"
      - "npm"
    commit-message:
      prefix: "chore(deps)"
      include: "scope"
    groups:
      dev-dependencies:
        patterns:
          - "@types/*"
          - "typescript*"
          - "jest*"
          - "@stryker-mutator/*"
      test-dependencies:
        patterns:
          - "fast-check*"
          - "@agoodlibrary/fuzzy*"
```

- [ ] **Step 2: Create renovate.json**

```json
{
  "$schema": "https://docs.renovatebot.com/renovate-schema.json",
  "extends": ["config:base"],
  "packageRules": [
    {
      "matchUpdateTypes": ["minor", "patch"],
      "matchPackageNames": ["typescript", "@types/*", "eslint*"],
      "automerge": true,
      "automergeType": "pr"
    },
    {
      "matchPackageNames": ["jest", "@stryker-mutator/*", "fast-check"],
      "groupName": "testing",
      "automerge": false
    }
  ],
  "schedule": ["every weekend"],
  "timezone": "America/New_York",
  "labels": ["dependencies", "renovate"]
}
```

---

## Phase 4: Contribution Verification

### Task 4.1: Create contribution verification script

**Files:**
- Create: `scripts/verify_contribution.sh`
- Modify: `package.json`

- [ ] **Step 1: Create verification script**

```bash
#!/bin/bash
set -e

echo "🔍 Verifying contribution..."

# Check formatting
echo "Checking format..."
npm run format:check

# Check linting
echo "Checking lint..."
npm run lint

# Type check
echo "Type checking..."
npx tsc --noEmit

# Run tests
echo "Running tests..."
npm test -- --coverage=false

# Check mutation threshold
echo "Checking mutation score..."
npm run test:mutation -- --threshold-low=50

echo "✅ All checks passed!"
```

- [ ] **Step 2: Add to package.json**

```json
"scripts": {
  "format:check": "prettier --check src/**/*.ts",
  "format": "prettier --write src/**/*.ts",
  "verify": "bash scripts/verify_contribution.sh"
}
```

---

## Phase 5: Release Process Documentation

### Task 5.1: Document release process

**Files:**
- Create: `docs/governance/release_process.md`

- [ ] **Step 1: Document release process**

```markdown
# Release Process

## Versioning

We follow [Semantic Versioning](https://semver.org/):
- MAJOR: Breaking changes
- MINOR: New features (backward compatible)
- PATCH: Bug fixes (backward compatible)

## Release Types

### Patch Release (1.13.1)

```bash
npm version patch
git push --follow-tags origin main
```

### Minor Release (1.14.0)

```bash
npm version minor
git push --follow-tags origin main
```

### Major Release (2.0.0)

```bash
npm version major
git push --follow-tags origin main
```

## Automated Release (Preferred)

```bash
npm run release
```

This runs:
1. All tests
2. Type checking
3. Build
4. Version bump (interactive)
5. CHANGELOG generation
6. npm publish
7. Git tag push

## Release Checklist

- [ ] All CI checks pass
- [ ] Mutation score >= 50%
- [ ] Security audit clean
- [ ] Documentation updated
- [ ] CHANGELOG.md generated
- [ ] npm package published
- [ ] GitHub release created
- [ ] Discord/Slack announcement

## Post-Release

- Monitor for issues
- Update dependent projects
- Schedule next release planning
```

---

## Completion Tracking

Update ENHANCEMENT_TRACKER.md with governance subtask completion.