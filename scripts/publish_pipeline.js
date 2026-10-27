#!/usr/bin/env node
/**
 * Publishing Pipeline
 *
 * Orchestrates the full release cycle: verification, doc generation,
 * version bump, changelog, artifact building, and multi-platform publish.
 *
 * Usage:
 *   node scripts/publish_pipeline.js [--dry-run] [--skip-tests] [--npm] [--py] [--r]
 */

const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..', '..');

const COLORS = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  dim: '\x1b[2m',
};

function log(msg, color = 'reset') {
  const ts = new Date().toISOString().slice(11, 19);
  console.log(`${COLORS.dim}[${ts}]${COLORS.reset} ${COLORS[color] || ''}${msg}${COLORS.reset}`);
}

function run(cmd, opts = {}) {
  const cwd = opts.cwd || ROOT;
  const dryRun = opts.dryRun || false;
  const label = opts.label || cmd;

  if (dryRun) {
    log(`[dry-run] ${label}`, 'yellow');
    return;
  }

  log(`Running: ${label}`, 'blue');
  try {
    const output = execSync(cmd, {
      cwd,
      stdio: 'pipe',
      encoding: 'utf8',
      maxBuffer: 50 * 1024 * 1024,
      ...opts.execOpts,
    });
    if (output.trim()) {
      console.log(output.trim());
    }
    return output;
  } catch (err) {
    log(`FAILED: ${label}`, 'red');
    if (err.stderr) console.error(err.stderr.trim());
    if (err.stdout) console.error(err.stdout.trim());
    if (opts.required !== false) {
      process.exit(1);
    }
    return null;
  }
}

function readPackageJson() {
  const pkgPath = path.join(ROOT, 'package.json');
  return JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
}

function writePackageJson(pkg) {
  const pkgPath = path.join(ROOT, 'package.json');
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
}

function parseArgs() {
  const args = process.argv.slice(2);
  return {
    dryRun: args.includes('--dry-run'),
    skipTests: args.includes('--skip-tests'),
    npm: args.includes('--npm') || args.length === 0,
    py: args.includes('--py') || args.length === 0,
    r: args.includes('--r') || args.length === 0,
    version: args.find(a => a.startsWith('--version='))?.split('=')[1],
  };
}

function updateChangelog(version, dateStr) {
  const changelogPath = path.join(ROOT, 'CHANGELOG.md');
  let existing = '';
  if (fs.existsSync(changelogPath)) {
    existing = fs.readFileSync(changelogPath, 'utf8');
  }
  const header = `# Changelog\n\n## [${version}] - ${dateStr}\n\n`;
  const placeholder = `### Added\n- \n\n### Changed\n- \n\n### Fixed\n- \n\n`;
  const content = header + placeholder + existing;
  fs.writeFileSync(changelogPath, content);
  log('Updated CHANGELOG.md', 'green');
}

function validateVersion(version) {
  if (!version) return false;
  const parts = version.split('.');
  if (parts.length !== 3) return false;
  return parts.every(p => /^\d+$/.test(p));
}

function bumpNpmVersion(version, dryRun) {
  const pkg = readPackageJson();
  const current = pkg.version;

  if (validateVersion(version)) {
    pkg.version = version;
  } else {
    const bumpType = version;
    if (!['major', 'minor', 'patch'].includes(bumpType)) return;
    const [major, minor, patch] = current.split('.').map(Number);
    if (bumpType === 'major') pkg.version = `${major + 1}.0.0`;
    else if (bumpType === 'minor') pkg.version = `${major}.${minor + 1}.0`;
    else pkg.version = `${major}.${minor}.${patch + 1}`;
  }

  log(`Bumping npm version: ${current} -> ${pkg.version}`, 'yellow');
  if (!dryRun) {
    writePackageJson(pkg);
    run(`npm pkg set version="${pkg.version}"`, { label: 'Set npm version' });
  }
}

function writePackageJson(pkg) {
  const pkgPath = path.join(ROOT, 'package.json');
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
}

async function main() {
  const opts = parseArgs();

  log('=== Akashic Civics Publishing Pipeline ===', 'bold');
  log(`Dry run: ${opts.dryRun}`, 'yellow');
  log(`Target platforms: ${(opts.npm ? 'npm ' : '') + (opts.py ? 'py ' : '') + (opts.r ? 'R ' : '')}`.trim(), 'yellow');

  // Step 1: Run lint
  log('\n--- Step 1: Lint ---', 'blue');
  run('npx eslint src/**/*.ts --max-warnings=0', opts);

  // Step 2: Run type check
  log('\n--- Step 2: Type Check ---', 'blue');
  run('npx tsc --noEmit', { ...opts, required: true });

  // Step 3: Run tests
  if (!opts.skipTests) {
    log('\n--- Step 3: Tests ---', 'blue');
    run('npx jest --coverage=false', { ...opts, required: true });
  } else {
    log('\n--- Step 3: Tests (SKIPPED) ---', 'yellow');
  }

  // Step 4: Build
  log('\n--- Step 4: Build ---', 'blue');
  run('npx tsc', { ...opts, required: true });

  // Step 5: Generate docs
  log('\n--- Step 5: Documentation ---', 'blue');
  run('npx typedoc --options typedoc.json', { ...opts, required: false });

  // Step 6: Version bump
  log('\n--- Step 6: Version Bump ---', 'blue');
  bumpNpmVersion(opts.version || 'patch', opts.dryRun);

  // Step 7: Update changelog
  log('\n--- Step 7: Changelog ---', 'blue');
  const dateStr = new Date().toISOString().split('T')[0];
  const pkg = readPackageJson();
  if (!opts.dryRun) {
    updateChangelog(pkg.version, dateStr);
    run('git add CHANGELOG.md', { label: 'Stage changelog', ...opts });
  } else {
    log(`[dry-run] Would update CHANGELOG.md with ${pkg.version}`, 'yellow');
  }

  // Step 8: Publish npm
  if (opts.npm) {
    log('\n--- Step 8: Publish npm ---', 'blue');
    run('npm publish', { ...opts, required: true });
  }

  // Step 9: Publish PyPI
  if (opts.py) {
    log('\n--- Step 9: Publish Python ---', 'blue');
    const pyDir = path.join(ROOT, 'packages', 'akashic-civics-py');

    // Update version in pyproject.toml
    const pyprojectPath = path.join(pyDir, 'pyproject.toml');
    let pyproject = fs.readFileSync(pyprojectPath, 'utf8');
    pyproject = pyproject.replace(
      /version = "[\d.]+"/,
      `version = "${pkg.version}"`
    );
    if (!opts.dryRun) {
      fs.writeFileSync(pyprojectPath, pyproject);
    }

    run('python3 -m build', { cwd: pyDir, ...opts, required: false });
    run('python3 -m twine upload dist/*', { cwd: pyDir, ...opts, required: true });
  }

  // Step 10: Publish R
  if (opts.r) {
    log('\n--- Step 10: Publish R ---', 'blue');
    const rDir = path.join(ROOT, 'packages', 'akashic-civics-r');

    // Update version in DESCRIPTION
    const descPath = path.join(rDir, 'DESCRIPTION');
    let desc = fs.readFileSync(descPath, 'utf8');
    desc = desc.replace(
      /Version:\s*[\d.]+/,
      `Version: ${pkg.version}`
    );
    if (!opts.dryRun) {
      fs.writeFileSync(descPath, desc);
    }

    run('R CMD build .', { cwd: rDir, ...opts, required: false });
    run('R CMD INSTALL .', { cwd: rDir, ...opts, required: true });
  }

  // Step 11: Git commit and tag
  log('\n--- Step 11: Git Tag & Commit ---', 'blue');
  if (!opts.dryRun) {
    run('git add -A', { label: 'Stage all changes' });
    run(`git commit -m "chore: release v${pkg.version}" || true`, { label: 'Commit release', required: false });
    run(`git tag v${pkg.version}`, { label: 'Tag release' });
    run('git push --tags', { label: 'Push tags' });
  } else {
    log(`[dry-run] Would commit and tag v${pkg.version}`, 'yellow');
  }

  log('\n=== Publishing Pipeline Complete ===', 'green');
  log(`Version: ${pkg.version}`, 'green');
  log(`Artifacts: npm ${opts.npm ? '✓' : '✗'} py ${opts.py ? '✓' : '✗'} R ${opts.r ? '✓' : '✗'}`, 'green');
}

main().catch(err => {
  log(`Pipeline failed: ${err.message}`, 'red');
  process.exit(1);
});
