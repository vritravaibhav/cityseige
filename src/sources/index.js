/**
 * src/sources/index.js — Unified multi-source discovery coordinator
 */

const config = require('../../config');
const freelancer = require('./freelancer');
const remoteBoards = require('./remote_boards');
const directFirms = require('./direct_firms');

async function runDiscovery({ includeFirms = true, verbose = false } = {}) {
  const allItems = [];
  const seenIds = new Set();
  const seenTitles = new Set();

  function addItem(item) {
    if (!item || !item.title) return;
    const titleKey = `${item.title.toLowerCase().trim()}|${(item.company || '').toLowerCase().trim()}`;
    if (seenIds.has(item.id) || seenTitles.has(titleKey)) {
      return;
    }
    seenIds.add(item.id);
    seenTitles.add(titleKey);
    allItems.push(item);
  }

  console.log('?? Starting discovery sweep across freelance patent sources...');

  // 1. Sweep Freelancer.com across all search queries
  for (const query of config.SEARCH_TERMS) {
    if (verbose) console.log(`   ? Querying Freelancer.com for: "${query}"`);
    const res = await freelancer.fetchProjectsForQuery(query);
    if (res.ok && Array.isArray(res.items)) {
      for (const item of res.items) {
        addItem(item);
      }
    }
    // polite rate limiting delay
    await new Promise((r) => setTimeout(r, 600));
  }
  console.log(`   ? Freelancer.com sweep completed. Total unique items so far: ${allItems.length}`);

  // 2. Sweep Remote Boards for patent contracts
  if (verbose) console.log('   ? Querying remote contract boards...');
  const remoteItems = await remoteBoards.fetchRemoteBoards();
  for (const item of remoteItems) {
    addItem(item);
  }
  console.log(`   ? Remote boards sweep completed. Total unique items so far: ${allItems.length}`);

  // 3. Load Direct IP Law Firms & Patent Practices
  if (includeFirms) {
    const firms = directFirms.loadDirectFirms();
    for (const firm of firms) {
      addItem(firm);
    }
    console.log(`   ? Loaded ${firms.length} prospective IP law firms / practices for cold outreach.`);
  }

  return allItems;
}

module.exports = {
  runDiscovery,
};
