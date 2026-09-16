/**
 * src/proposal_generator.js — Evidence-driven proposal and cold pitch author (Individual-focused)
 */

const config = require('../config');

/**
 * Generates a tailored proposal emphasizing individual/solo direct collaboration
 */
function generateGigProposal(item) {
  const me = config.CANDIDATE;
  const primaryDisc = item.primaryDiscipline || 'prior_art';
  const matchedDomains = (item.domains || []).join(', ');

  let disciplineSpecificSection = '';
  let deliverablesSection = '';

  if (primaryDisc === 'invalidity') {
    disciplineSpecificSection = `My approach to invalidity and claim charting:
1. Claim Element Decomposition: Deconstruct independent and dependent claims into discrete, atomic limitations.
2. Multi-Jurisdictional Search: Formulate targeted CPC/IPC class-based Boolean strings across USPTO, EPO, WIPO, and German/Japanese patent offices.
3. Rigorous Fact-vs-Inference Standard: Every claim row in the chart is backed by verbatim source quotations, explicit page/paragraph/line locators, and a clean separation between factual disclosure and technical inference.
4. Non-Patent Literature (NPL): Exhaustive retrieval from IEEE, ACM, standards specifications (e.g. NVMe, 3GPP, JEDEC), and technical product manuals.`;

    deliverablesSection = `Deliverables You Will Receive:
- Professional Claim-by-Claim Mapping Chart (.docx / .pdf) with color-coded support ratings.
- Source Evidence Register with exact page/line locators and high-res schematics/figures.
- Executive Summary highlighting the strongest 102 anticipation and 103 obviousness combinations.`;
  } else if (primaryDisc === 'fto') {
    disciplineSpecificSection = `My approach to Freedom to Operate (FTO) & Clearance:
1. Feature Matrix Extraction: Identify the core inventive and commercial features of your product.
2. Active Patent Family Clearance: Search active, in-force patents across target jurisdictions (US, EP, WIPO).
3. Risk Categorization: Classify relevant patent claims into High, Medium, and Low infringement risk.
4. Design-Around Guidance: Identify patent white spaces and technical workarounds for potential blocking claims.`;

    deliverablesSection = `Deliverables You Will Receive:
- Comprehensive FTO Risk Assessment Matrix with status check of active patent families.
- Detailed Claim Comparison of relevant blocking references.
- Strategic White Space Summary and technical design-around options.`;
  } else if (primaryDisc === 'landscape') {
    disciplineSpecificSection = `My approach to Patent Landscaping & White Space:
1. Deep Taxonomy Building: Segment the technological space by architecture, subsystem, and application.
2. Assignee & Filing Trend Analytics: Profile top patent holders, velocity of recent grants, and geographic filing strategies.
3. White Space Discovery: Identify unoccupied technical domains and cluster gaps for future patent filings.`;

    deliverablesSection = `Deliverables You Will Receive:
- Interactive Landscape Report (.xlsx + .pdf) with assignee breakdown and timeline graphs.
- White Space & Opportunity Matrix.
- Complete exportable dataset of all analyzed patent families.`;
  } else {
    // Default: Prior Art / Novelty Search
    disciplineSpecificSection = `My approach to Novelty & Patentability Search:
1. Comprehensive Search Strings: Develop Boolean strings combining IPC/CPC classifications (hierarchical sub-classes) with tailored proximity operators (ADJ, NEAR).
2. Broad Global Coverage: Screen USPTO Patent Public Search, EPO Espacenet, WIPO PATENTSCOPE, Google Patents, and Lens.org.
3. Non-Patent Literature (NPL): Deep screening across IEEE Xplore, Google Scholar, ArXiv, and technical whitepapers.
4. Citation Forward/Backward Tracking: Uncover second-generation prior art via citation tree expansion.`;

    deliverablesSection = `Deliverables You Will Receive:
- Comprehensive Prior Art Report detailing the closest references.
- Feature-by-Feature Novelty Comparison Matrix showing which aspects are anticipated.
- PDF copies of all cited patents and non-patent literature articles.`;
  }

  const proofLines = (item.relevantEvidence || [])
    .map((e) => `• ${e.proof}`)
    .join('\n');

  return `Hi,

I read your project regarding "${item.title}". I am an independent Patent Analyst & Electronics Engineer (individual freelancer, not an agency). I work directly 1-on-1 with inventors and patent attorneys to deliver meticulous patent search, claim chart mapping, and IP clearance.

Why work with me as an individual:
• Direct 1-on-1 Communication: You interact directly with me—the engineer doing the actual technical analysis—with zero account managers or middleman latency.
• Complete Confidentiality: Direct bilateral NDA execution. Your invention and technical files stay strictly between us.
• Technical Engineering Rigor: Degree in Electronics & Communication Engineering, specialized in ${matchedDomains || 'hardware, semiconductors, and software architectures'}.

${disciplineSpecificSection}

Verifiable Technical Proof:
${proofLines}

${deliverablesSection}

Turnaround & Quality:
I deliver attorney-ready documentation with reproducible search strings and zero guesswork within 3-4 days.

Let's connect directly to review your invention details or target claim scope.

Best regards,
${me.name}
${me.title}
${me.email} | ${me.phone}
Portfolio: ${me.portfolio}
LinkedIn: ${me.linkedin}`;
}

/**
 * Generates an outreach email for law firms emphasizing individual contractor support
 */
function generateFirmEmail(firm) {
  const me = config.CANDIDATE;
  const firstName = (firm.contactName || '').split(' ')[0] || 'Counsel';
  const firmName = firm.name || firm.company || 'your firm';

  return {
    subject: `Individual Patent Analyst Contractor — Overflow Support for ${firm.specialty || 'Technical IP'}`,
    text: `Dear ${firstName},

I hope this message finds you well.

I am reaching out to introduce myself as an independent freelance Patent Analyst (individual contractor, not an agency) specializing in technical prior art searches, 102/103 invalidity claim charting, and freedom-to-operate (FTO) studies for boutique IP law practices.

Given ${firmName}'s focus on ${firm.specialty}, I wanted to offer my services as an on-demand individual research contractor when your practice experiences capacity bottlenecks during litigation deadlines or prosecution surges.

The Solo Contractor Advantage for Your Firm:
1. Direct 1-on-1 Collaboration: You work directly with a technical engineer—no agency overhead, markups, or project manager friction.
2. Rigorous Claim Charting: Element-by-element limitation mapping with verbatim citations, pinpoint locators, and strict fact-versus-inference separation. (Recently mapped US11495299B2 against enterprise NVMe SSD controllers and base specifications).
3. Deep Technical Fluency: Degree in Electronics & Communication Engineering, with strong domain knowledge across semiconductors, memory/storage controllers (NVMe, NAND flash), wireless/telecom protocols, and AI/software algorithms.
4. Flexible On-Demand Billing: Available on hourly or flat-fee project rates, freeing up your associates' billable hours while keeping search costs predictable.

Would you be open to a brief 5-minute introductory call or receiving a sample redacted claim chart to keep on file for your next overflow?

Sincerely,

${me.name}
${me.title}
${me.email} | ${me.phone}
LinkedIn: ${me.linkedin}
Portfolio: ${me.portfolio}`,
  };
}

module.exports = {
  generateGigProposal,
  generateFirmEmail,
};
