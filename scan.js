#!/usr/bin/env node
/**
 * scan.js — CLI entry to sweep freelance platforms, remote boards, and patent firms
 *
 * Usage:
 *   node scan.js               # Standard sweep
 *   node scan.js --verbose     # Verbose logging
 *   node scan.js --no-firms    # Exclude law firms, scan gigs only
 */

const fs = require('fs');
const config = require('./config');
const { runDiscovery } = require('./src/sources');

const ARGS = process.argv.slice(2);
const VERBOSE = ARGS.includes('--verbose');
const NO_FIRMS = ARGS.includes('--no-firms');

async function main() {
  const startTime = Date.now();
  console.log('='.repeat(70));
  console.log('?? PATENT ANALYST FREELANCE DISCOVERY SWEEP');
  console.log(`Target: Patentability, Invalidity, Claim Charts, FTO & Landscaping`);
  console.log('='.repeat(70));

  try {
    const items = await runDiscovery({
      includeFirms: !NO_FIRMS,
      verbose: VERBOSE,
    });

    // Save raw results to results.json
    fs.writeFileSync(config.PATHS.rawResults, JSON.stringify(items, null, 2), 'utf8');

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log('\n' + '='.repeat(70));
    console.log(`?? Sweep completed in ${duration}s!`);
    console.log(`Saved ${items.length} records to: ${config.PATHS.rawResults}`);
    console.log(`Next step: Run "node build.js" (or "npm run build") to rank & generate proposals.`);
    console.log('='.repeat(70) + '\n');
  } catch (err) {
    console.error('? Error during sweep:', err);
    process.exit(1);
  }
}

main();
