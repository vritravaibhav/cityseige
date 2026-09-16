/**
 * config.js — Central configuration for Patent Analyst Lead & Outreach Automation
 */
require('dotenv').config();
const path = require('path');

module.exports = {
  // Flag to strictly prioritize or filter clients looking for individual freelancers
  INDIVIDUAL_ONLY_MODE: true,

  CANDIDATE: {
    name: 'Divyanshu Vaibhav',
    title: 'Independent Patent Analyst & IP Research Consultant',
    email: process.env.FROM_EMAIL || 'divaibhavyanshu@gmail.com',
    phone: '+91-9576671336',
    education: 'B.E. Electronics & Communication Engineering, Panjab University',
    location: 'India (Serving Global Clients: US, EU, UK, APAC)',
    linkedin: 'https://www.linkedin.com/in/divyanshu-vaibhav',
    portfolio: 'https://vritravaibhav.github.io/portfolio',

    rates: {
      hourlyUSD: 50,
      noveltySearchUSD: 350,
      invalidityChartUSD: 850,
      ftoClearanceUSD: 1100,
      landscapeUSD: 1500,
    },

    coreDomains: [
      'Electronics & Telecommunications (Wireless, 5G/LTE, Signal Processing)',
      'Semiconductors & Storage Controllers (NVMe, NAND Flash, Memory Architecture, SSDs)',
      'Software Architectures & AI/ML (Agentic workflows, cloud services, distributed systems)',
      'Embedded Systems, IoT & Hardware-software co-design',
      'Computer Networking, Protocols, and Data Security',
    ],

    evidence: [
      {
        discipline: 'invalidity',
        tags: ['claim chart', 'invalidity', '102', '103', 'prior art', 'litigation', 'nvme', 'ssd', 'controller'],
        proof: 'Authored end-to-end claim charts mapping US patents (e.g. US11495299B2) against enterprise SSD controller platforms (e.g. FADU Gen6 FC6161/FD3234) and standard specifications (NVMe Base Spec 2.3), maintaining strict fact-vs-inference separation and locator-traceable evidence citations.',
      },
      {
        discipline: 'prior_art',
        tags: ['patentability', 'novelty', 'prior art', 'search', 'inventor', 'uspto', 'epo'],
        proof: 'Structured patentability workflows across USPTO, EPO Espacenet, WIPO PATENTSCOPE, and Lens.org utilizing multi-tier CPC/IPC classification indexing combined with Boolean proximity constraints (NEAR, ADJ) and citation tree forward/backward mining.',
      },
      {
        discipline: 'fto',
        tags: ['fto', 'freedom to operate', 'clearance', 'infringement risk', 'commercialization'],
        proof: 'Delivered freedom-to-operate clearance matrices with independent claim breakdown, identifying potential blocking patents and drafting technical design-around recommendations for commercial tech releases.',
      },
      {
        discipline: 'landscape',
        tags: ['landscape', 'white space', 'portfolio', 'competitor', 'trends', 'ip intelligence'],
        proof: 'Constructed comprehensive patent landscaping maps categorizing patent families across key assignees, filing trends, and unoccupied white-spaces for strategic R&D alignment.',
      },
      {
        discipline: 'npl',
        tags: ['non-patent literature', 'npl', 'ieee', 'research papers', 'standards'],
        proof: 'Expert in non-patent literature (NPL) mining across IEEE Xplore, ACM Digital Library, ArXiv, standards bodies (NVMe, 3GPP, IEEE 802), and open-source code repositories for prior art that patent-only searches miss.',
      },
    ],
  },

  SEARCH_TERMS: [
    'patent search',
    'prior art',
    'patent analyst',
    'claim chart',
    'patent invalidity',
    'freedom to operate',
    'patent landscape',
    'patent drafting',
    'inventor patent',
    'patent individual',
    'patent freelancer',
    'prior art individual',
  ],

  PATHS: {
    root: __dirname,
    dataDir: path.join(__dirname, 'data'),
    outputDir: path.join(__dirname, 'output'),
    rawResults: path.join(__dirname, 'results.json'),
    historyFile: path.join(__dirname, 'data', 'history.json'),
    firmsFile: path.join(__dirname, 'data', 'firms.json'),
  },

  SMTP: {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '465', 10),
    secure: process.env.SMTP_SECURE === 'true' || process.env.SMTP_PORT === '465',
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    fromName: process.env.FROM_NAME || 'Divyanshu Vaibhav | Patent & IP Analyst',
    fromEmail: process.env.FROM_EMAIL || 'divaibhavyanshu@gmail.com',
    replyTo: process.env.REPLY_TO || process.env.FROM_EMAIL || 'divaibhavyanshu@gmail.com',
    dailyLimit: parseInt(process.env.DAILY_SEND_LIMIT || '20', 10),
    delayMs: parseInt(process.env.SEND_DELAY_MS || '8000', 10),
  },
};
