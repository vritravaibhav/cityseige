#!/usr/bin/env node
/**
 * build.js — Classify, score, and build bucketed queues with tailored proposals
 *
 * Usage:
 *   node build.js
 */

const fs = require('fs');
const config = require('./config');
const { buildQueues } = require('./src/builder');

function main() {
  console.log('='.repeat(70));
  console.log('??  BUILDING PATENT ANALYST QUEUES & PROPOSALS');
  console.log('='.repeat(70));

  if (!fs.existsSync(config.PATHS.rawResults)) {
    console.error(`? No raw scan data found at ${config.PATHS.rawResults}.`);
    console.error('   Please run "node scan.js" first to fetch active opportunities.');
    process.exit(1);
  }

  try {
    const rawItems = JSON.parse(fs.readFileSync(config.PATHS.rawResults, 'utf8'));
    console.log(`Loaded ${rawItems.length} records from ${config.PATHS.rawResults}...`);

    const stats = buildQueues(rawItems);

    console.log('\n? Bucketed queues successfully built:');
    console.log(`   ?? output/1-pitch-now/       : ${stats.tier1Count} high-fit gigs (Proposals generated)`);
    console.log(`   ?? output/2-worth-a-look/    : ${stats.tier2Count} secondary gigs`);
    console.log(`   ?? output/3-firm-outreach/   : ${stats.firmCount} IP Law Firms / Practices`);
    console.log(`   ?? output/INDEX.txt          : Executive summary`);
    console.log('\n?? Next steps:');
    console.log('   - Review proposals in: output/1-pitch-now/gigs.txt');
    console.log('   - Preview outreach emails: node send-outreach.js --preview');
    console.log('='.repeat(70) + '\n');
  } catch (err) {
    console.error('? Error building queues:', err);
    process.exit(1);
  }
}

main();
