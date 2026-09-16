/**
 * src/builder.js — Bucketing and queue generation engine (Strictly Freelance Patent Analyst)
 */

const fs = require('fs');
const path = require('path');
const config = require('../config');
const { classifyItem } = require('./classifier');
const { generateGigProposal, generateFirmEmail } = require('./proposal_generator');

function buildQueues(rawItems, options = {}) {
  const individualOnly = options.individualOnly ?? config.INDIVIDUAL_ONLY_MODE ?? true;
  const outDir = config.PATHS.outputDir;
  const folder1 = path.join(outDir, '1-pitch-now');
  const folder2 = path.join(outDir, '2-worth-a-look');
  const folder3 = path.join(outDir, '3-firm-outreach');

  [outDir, folder1, folder2, folder3].forEach((d) => {
    if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
  });

  // Classify all items
  const classified = rawItems.map((item) => classifyItem(item));

  // Separate direct law firms from marketplace gigs
  const directFirmsList = classified.filter((i) => i.isDirectFirm);
  const gigList = classified.filter((i) => !i.isDirectFirm && i.score > 0);

  // Sort gigs by score descending
  gigList.sort((a, b) => (b.score || 0) - (a.score || 0));

  let tier1Gigs = [];
  let tier2Gigs = [];

  if (individualOnly) {
    tier1Gigs = gigList.filter((g) => g.lookingForIndividual && g.score >= 35);
    tier2Gigs = gigList.filter((g) => !tier1Gigs.includes(g) && g.score >= 15);
  } else {
    tier1Gigs = gigList.filter((g) => g.score >= 45);
    tier2Gigs = gigList.filter((g) => g.score >= 15 && g.score < 45);
  }

  // ---------------------------------------------------------------------------
  // 1. Build 1-pitch-now (Strictly Freelance Patent Analyst Gigs)
  // ---------------------------------------------------------------------------
  const tier1Data = tier1Gigs.map((g, idx) => {
    const proposal = generateGigProposal(g);
    return {
      ...g,
      rank: idx + 1,
      preparedProposal: proposal,
    };
  });

  fs.writeFileSync(path.join(folder1, 'gigs.json'), JSON.stringify(tier1Data, null, 2), 'utf8');

  let t1Txt = '='.repeat(80) + '\n';
  t1Txt += `FOLDER 1: PITCH NOW — High-Value Freelance Patent Projects (${tier1Data.length} gigs)\n`;
  t1Txt += `Engagement : STRICTLY FREELANCE (Milestone / Deliverable based, No Employment)\n`;
  t1Txt += `Target     : Solo Inventors & Direct Clients Seeking an Individual Patent Specialist\n`;
  t1Txt += `Generated  : ${new Date().toISOString()}\n`;
  t1Txt += '='.repeat(80) + '\n\n';

  tier1Data.forEach((g) => {
    t1Txt += '-'.repeat(80) + '\n';
    t1Txt += `#${g.rank} [Score: ${g.score}] ${g.title}\n`;
    t1Txt += `Budget      : ${g.budget}\n`;
    t1Txt += `Contract    : ${g.engagementType}\n`;
    t1Txt += `Source      : ${g.source}\n`;
    t1Txt += `URL         : ${g.url}\n`;
    t1Txt += `Disciplines : ${(g.disciplines || []).join(', ')}\n`;
    t1Txt += `Domains     : ${(g.domains || []).join(', ')}\n`;
    t1Txt += `Description :\n${(g.description || '').slice(0, 300)}...\n\n`;
    t1Txt += `>>> TAILORED FREELANCE PROPOSAL <<<\n${g.preparedProposal}\n\n`;
  });
  fs.writeFileSync(path.join(folder1, 'gigs.txt'), t1Txt, 'utf8');

  // ---------------------------------------------------------------------------
  // 2. Build 2-worth-a-look (Secondary Freelance Patent Gigs)
  // ---------------------------------------------------------------------------
  fs.writeFileSync(path.join(folder2, 'gigs.json'), JSON.stringify(tier2Gigs, null, 2), 'utf8');

  let t2Txt = '='.repeat(80) + '\n';
  t2Txt += `FOLDER 2: WORTH A LOOK — Secondary Freelance Patent Opportunities (${tier2Gigs.length} gigs)\n`;
  t2Txt += `Generated: ${new Date().toISOString()}\n`;
  t2Txt += '='.repeat(80) + '\n\n';

  tier2Gigs.forEach((g, idx) => {
    t2Txt += '-'.repeat(80) + '\n';
    t2Txt += `#${idx + 1} [Score: ${g.score}] ${g.title}\n`;
    t2Txt += `Budget   : ${g.budget} | Type: ${g.engagementType}\n`;
    t2Txt += `URL      : ${g.url}\n`;
    t2Txt += `Services : ${(g.disciplines || []).join(', ')}\n\n`;
  });
  fs.writeFileSync(path.join(folder2, 'gigs.txt'), t2Txt, 'utf8');

  // ---------------------------------------------------------------------------
  // 3. Build 3-firm-outreach (Freelance 1099 Overflow Contractor Pitches)
  // ---------------------------------------------------------------------------
  const firmEmails = directFirmsList.map((firm) => {
    const emailObj = generateFirmEmail(firm);
    return {
      firmId: firm.id,
      name: firm.company,
      contactName: firm.contactName,
      contactRole: firm.contactRole,
      recipientEmail: firm.email,
      website: firm.website,
      specialty: firm.specialty,
      contractType: firm.engagementType,
      subject: emailObj.subject,
      body: emailObj.text,
      status: 'ready_to_send',
    };
  });

  fs.writeFileSync(path.join(folder3, 'firms.json'), JSON.stringify(firmEmails, null, 2), 'utf8');

  let t3Txt = '='.repeat(80) + '\n';
  t3Txt += `FOLDER 3: BOUTIQUE IP FIRMS (Freelance 1099 Contractor Overflow) (${firmEmails.length} firms)\n`;
  t3Txt += `Engagement : Freelance 1099 Contractor / Hourly Retainer / Flat Project Fee (No Salary/W2)\n`;
  t3Txt += `Generated  : ${new Date().toISOString()}\n`;
  t3Txt += '='.repeat(80) + '\n\n';

  firmEmails.forEach((f, idx) => {
    t3Txt += '-'.repeat(80) + '\n';
    t3Txt += `#${idx + 1}. Firm: ${f.name} (${f.contactName} - ${f.contactRole})\n`;
    t3Txt += `To          : ${f.recipientEmail}\n`;
    t3Txt += `Contract    : ${f.contractType}\n`;
    t3Txt += `Subject     : ${f.subject}\n`;
    t3Txt += `Specialty   : ${f.specialty}\n\n`;
    t3Txt += `>>> COLD FREELANCE PITCH <<<\n${f.body}\n\n`;
  });
  fs.writeFileSync(path.join(folder3, 'firms.txt'), t3Txt, 'utf8');

  // ---------------------------------------------------------------------------
  // 4. Build Root INDEX.txt
  // ---------------------------------------------------------------------------
  let idxTxt = '='.repeat(80) + '\n';
  idxTxt += 'PATENT ANALYST FREELANCE PIPELINE INDEX\n';
  idxTxt += `Engagement Model : 100% FREELANCE CONTRACTING (No Employment / No Salaried Jobs)\n`;
  idxTxt += `Run Timestamp    : ${new Date().toISOString()}\n`;
  idxTxt += '='.repeat(80) + '\n\n';
  idxTxt += `SUMMARY METRICS:\n`;
  idxTxt += `  Total Swept Records          : ${rawItems.length}\n`;
  idxTxt += `  Folder 1 (Pitch Now Gigs)    : ${tier1Data.length} freelance projects (Solo inventor / Direct gig)\n`;
  idxTxt += `  Folder 2 (Worth a Look Gigs) : ${tier2Gigs.length} freelance projects (Secondary / Overflow)\n`;
  idxTxt += `  Folder 3 (Firm Outreach)     : ${firmEmails.length} IP Law Firms (Freelance 1099 Contractor)\n\n`;

  fs.writeFileSync(path.join(outDir, 'INDEX.txt'), idxTxt, 'utf8');

  return {
    tier1Count: tier1Data.length,
    tier2Count: tier2Gigs.length,
    firmCount: firmEmails.length,
  };
}

module.exports = {
  buildQueues,
};
