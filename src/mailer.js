/**
 * src/mailer.js — Production SMTP Dispatcher with anti-spam rate limiting & preview safety
 */

const fs = require('fs');
const nodemailer = require('nodemailer');
const config = require('../config');

function getHistory() {
  const file = config.PATHS.historyFile;
  if (!fs.existsSync(file)) return [];
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return [];
  }
}

function saveHistory(history) {
  fs.writeFileSync(config.PATHS.historyFile, JSON.stringify(history, null, 2), 'utf8');
}

function createTransporter() {
  const { host, port, secure, user, pass } = config.SMTP;
  if (!user || !pass) {
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
    tls: {
      rejectUnauthorized: false, // Prevents self-signed cert issues on custom mail servers
    },
  });
}

async function verifyConnection() {
  const transporter = createTransporter();
  if (!transporter) {
    return {
      ok: false,
      error: 'SMTP credentials missing in .env (Please set SMTP_USER and SMTP_PASS).',
    };
  }

  try {
    await transporter.verify();
    return { ok: true, message: 'SMTP connection verified successfully!' };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

async function dispatchOutreachBatch({ dryRun = true, limit = null } = {}) {
  const firmsPath = `${config.PATHS.outputDir}/3-firm-outreach/firms.json`;
  if (!fs.existsSync(firmsPath)) {
    console.error('? No generated outreach queue found. Please run "node build.js" first.');
    return;
  }

  const firms = JSON.parse(fs.readFileSync(firmsPath, 'utf8'));
  const history = getHistory();
  const alreadyContacted = new Set(history.map((h) => h.recipientEmail.toLowerCase()));

  const pending = firms.filter((f) => !alreadyContacted.has(f.recipientEmail.toLowerCase()));

  console.log('='.repeat(70));
  console.log(`?? SMTP OUTREACH DISPATCHER`);
  console.log(`Mode        : ${dryRun ? 'DRY-RUN / PREVIEW (No emails sent)' : 'LIVE SEND'}`);
  console.log(`Total Leads : ${firms.length}`);
  console.log(`Already Sent: ${history.length}`);
  console.log(`Pending     : ${pending.length}`);
  console.log('='.repeat(70));

  if (pending.length === 0) {
    console.log('? All prospective firms have already been contacted. Nothing pending.');
    return;
  }

  const batchLimit = limit || config.SMTP.dailyLimit;
  const toProcess = pending.slice(0, batchLimit);

  if (dryRun) {
    console.log(`\n?? PREVIEWING ${toProcess.length} EMAILS:\n`);
    toProcess.forEach((mail, idx) => {
      console.log(`--- [Email #${idx + 1}] ---`);
      console.log(`From    : "${config.SMTP.fromName}" <${config.SMTP.fromEmail}>`);
      console.log(`To      : ${mail.recipientEmail} (${mail.contactName} @ ${mail.name})`);
      console.log(`Subject : ${mail.subject}`);
      console.log(`Body Snippet:`);
      console.log(mail.body.slice(0, 250) + '...\n');
    });
    console.log('='.repeat(70));
    console.log('?? To send for real, configure your .env with SMTP credentials and run:');
    console.log('   npm run mail:send (or: node send-outreach.js --send)\n');
    return;
  }

  // Live sending
  const transporter = createTransporter();
  if (!transporter) {
    console.error('? Cannot send: SMTP credentials are not configured in .env.');
    console.error('   Please edit .env with your SMTP_USER, SMTP_PASS, SMTP_HOST, and SMTP_PORT.');
    return;
  }

  console.log(`\n?? Starting live dispatch of ${toProcess.length} emails with ${config.SMTP.delayMs / 1000}s safety pacing...\n`);

  for (let i = 0; i < toProcess.length; i++) {
    const mail = toProcess[i];
    console.log(`[${i + 1}/${toProcess.length}] Sending to ${mail.recipientEmail} (${mail.name})...`);

    try {
      const info = await transporter.sendMail({
        from: `"${config.SMTP.fromName}" <${config.SMTP.fromEmail}>`,
        to: mail.recipientEmail,
        replyTo: config.SMTP.replyTo,
        subject: mail.subject,
        text: mail.body,
      });

      console.log(`   ? Sent successfully! MessageId: ${info.messageId}`);

      history.push({
        firmId: mail.firmId,
        recipientEmail: mail.recipientEmail,
        firmName: mail.name,
        subject: mail.subject,
        sentAt: new Date().toISOString(),
        status: 'sent',
        messageId: info.messageId,
      });
      saveHistory(history);
    } catch (err) {
      console.error(`   ? Failed sending to ${mail.recipientEmail}:`, err.message);
      history.push({
        firmId: mail.firmId,
        recipientEmail: mail.recipientEmail,
        firmName: mail.name,
        subject: mail.subject,
        sentAt: new Date().toISOString(),
        status: 'failed',
        error: err.message,
      });
      saveHistory(history);
    }

    // Safety pacing delay between emails
    if (i < toProcess.length - 1) {
      console.log(`   ? Waiting ${config.SMTP.delayMs / 1000}s to maintain high sender reputation...`);
      await new Promise((r) => setTimeout(r, config.SMTP.delayMs));
    }
  }

  console.log('\n? Batch dispatch completed! Sent records updated in data/history.json.\n');
}

module.exports = {
  verifyConnection,
  dispatchOutreachBatch,
};
