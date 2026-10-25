#!/usr/bin/env node
/**
 * Akashic Civics CLI Launcher
 *
 * Thin wrapper that loads the compiled TypeScript CLI from dist/ and
 * forwards process arguments. Run `npm run build` first.
 *
 * Usage: node scripts/advanced_cli/akashic.js --help
 */

const path = require('path');
const fs = require('fs');

const distEntry = path.join(__dirname, '..', '..', 'dist', 'cli', 'akashic_cli.js');

if (!fs.existsSync(distEntry)) {
  console.error(
    'Compiled CLI not found at ' + distEntry + '\nRun "npm run build" first.'
  );
  process.exit(1);
}

const { runCli } = require(distEntry);

runCli(process.argv).then(code => {
  process.exit(code);
}).catch(err => {
  console.error('Fatal CLI error: ' + (err && err.message ? err.message : err));
  process.exit(1);
});
