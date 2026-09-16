#!/usr/bin/env node
/**
 * send-outreach.js — SMTP Outreach Dispatcher CLI
 *
 * Usage:
 *   node send-outreach.js --preview         # Default safe mode: inspect drafts without sending
 *   node send-outreach.js --verify          # Test SMTP connection with credentials in .env
 *   node send-outreach.js --send            # Live send with anti-spam delays & quota caps
 *   node send-outreach.js --send --limit=5  # Send only to the first 5 pending leads
 */

const { verifyConnection, dispatchOutreachBatch } = require('./src/mailer');

const ARGS = process.argv.slice(2);
const DO_VERIFY = ARGS.includes('--verify');
const DO_SEND = ARGS.includes('--send');
const DO_PREVIEW = ARGS.includes('--preview') || (!DO_VERIFY && !DO_SEND);

const limitArg = ARGS.find((a) => a.startsWith('--limit='));
const LIMIT = limitArg ? parseInt(limitArg.split('=')[1], 10) : null;

async function main() {
  if (DO_VERIFY) {
    console.log('Testing SMTP connection credentials in .env...');
    const res = await verifyConnection();
    if (res.ok) {
      console.log('? SUCCESS:', res.message);
    } else {
      console.error('? FAILED:', res.error);
    }
    return;
  }

  if (DO_SEND) {
    await dispatchOutreachBatch({ dryRun: false, limit: LIMIT });
    return;
  }

  // Default: Preview
  await dispatchOutreachBatch({ dryRun: true, limit: LIMIT });
}

main();
