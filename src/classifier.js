/**
 * src/classifier.js — Patent domain classification & strictly freelance contract filtering
 */

const config = require('../config');

// Hard drop any full-time salaried jobs, corporate counsel, executive roles, software development, or non-patent roles
const NOT_FREELANCE_PATENT_ANALYST = /\b(cto\b|cio\b|cpo\b|vp\s?of|vice\s?president|director\s?of|head\s?of\s?legal|counsel\b|solicitor|in[\s-]house\s?counsel|full[\s-]time\s?job|salaried|equity[\s-]only|co[\s-]founder|founder\b|chief\s?technology|software\s?engineer|web\s?developer|full[\s-]stack|mobile\s?app\s?development|estate\s?masterplan|3d\s?assets)\b/i;

const NON_PATENT_FALSE_POSITIVES = /\b(patent\s?leather|leather\s?shoes?|heels?|brochure|flyer|furniture|drawer|apparel|clothing)\b/i;

const PATENT_SERVICE_REQUIRED = /\b(patent|patents|prior\s?art|claim\s?chart|patentability|freedom\s?to\s?operate|fto|novelty\s?search|patent\s?drafting|provisional\s?patent|patent\s?application|patent\s?landscape|invalidity)\b/i;

const INDIVIDUAL_STRICT = /\b(individual(\s(freelancer|contractor|expert|analyst|person|only))?|no\s?agenc(y|ies)|solo(\s(freelancer|contractor|analyst|practitioner))?|independent\s(contractor|freelancer|analyst|specialist|consultant)|work\s?directly\s?with\s?(me|you)|not\s?an\s?agency|no\s?middlem[ae]n|single\s?person|freelancer\s?only|dedicated\s?freelancer|my\s?invention|i\s?(have|am)\s?an?\s?invention|i\s?am\s?the\s?inventor|i\s?have\s?a\s?patent|my\s?product|i\s?need\s(your\s?expertise|a\s?freelancer|someone)|i[’']m\s?ready)\b/i;

const AGENCY_HARD_DROP = /\b(agenc(y|ies)\s?only|looking\s?for\s?an\s?agency|software\s?house|company\s?only|must\s?be\s?a\s?company|firm[\s-]to[\s-]firm|development\s?firm|agency\s?preferred)\b/i;

const DISCIPLINES = [
  {
    key: 'invalidity',
    label: 'Invalidity Search & Claim Charting',
    weight: 45,
    regex: /\b(invalidity|claim\s?chart|102|103|anticipation|obviousness|prior\s?art\s?search\s?for\s?litigation|infringement\s?analysis|inter\s?partes|ipr)\b/i,
  },
  {
    key: 'fto',
    label: 'Freedom to Operate (FTO) & Clearance',
    weight: 40,
    regex: /\b(freedom\s?to\s?operate|fto|clearance\s?search|non[\s-]infringement|product\s?clearance|blocking\s?patents?)\b/i,
  },
  {
    key: 'prior_art',
    label: 'Patentability & Novelty Prior Art Search',
    weight: 35,
    regex: /\b(novelty|patentability|prior\s?art|patent\s?search|state\s?of\s?the\s?art|provisional\s?patent\s?search)\b/i,
  },
  {
    key: 'landscape',
    label: 'Patent Landscape & White Space Analysis',
    weight: 30,
    regex: /\b(patent\s?landscape|technology\s?landscape|patent\s?white\s?space|white[\s-]space\s?analysis|patent\s?mapping|patent\s?portfolio|competitor\s?patent|ip\s?intelligence)\b/i,
  },
  {
    key: 'drafting',
    label: 'Patent Drafting & Claim Formulation',
    weight: 25,
    regex: /\b(patent\s?drafting|draft\s?a\s?patent|write\s?a\s?patent|claims?\s?drafting|patent\s?application\s?preparation|provisional\s?drafting|office\s?action)\b/i,
  },
];

const DOMAIN_BOOSTS = [
  {
    domain: 'Semiconductor / SSD / NVMe / Memory',
    boost: 35,
    regex: /\b(ssd|solid\s?state|nand|flash\s?memory|controller|nvme|pcie|semiconductor|memory\s?management|wear\s?leveling|dram)\b/i,
  },
  {
    domain: 'Electronics / Telecom / Hardware',
    boost: 30,
    regex: /\b(electronics?|circuit|telecom|wireless|5g|4g|iot|embedded|hardware|signal\s?processing|sensor|rfid)\b/i,
  },
  {
    domain: 'Software / Cloud / AI / Algorithms',
    boost: 25,
    regex: /\b(software|algorithm|machine\s?learning|artificial\s?intelligence|neural\s?network|cloud|database|protocol)\b/i,
  },
  {
    domain: 'Mechanical / Medical / General Engineering',
    boost: 15,
    regex: /\b(mechanical|device|apparatus|medical\s?device|biomedical|consumer\s?product|packaging|automotive)\b/i,
  },
];

function classifyItem(item) {
  const fullText = `${item.title} ${item.description} ${(item.skills || []).join(' ')}`;

  // 1. Direct Firm Outreach (100% Freelance 1099 Overflow Contractor)
  if (item.source === 'direct_firms') {
    return {
      ...item,
      name: item.company || item.name,
      score: 100,
      engagementType: 'Freelance 1099 Contractor (Per Project / Hourly Retainer)',
      disciplines: ['Invalidity & Claim Charting', 'Prior Art Search'],
      primaryDiscipline: 'invalidity',
      domains: ['Electronics', 'Semiconductors', 'Telecom', 'Software'],
      relevantEvidence: config.CANDIDATE.evidence,
      isDirectFirm: true,
      lookingForIndividual: true,
    };
  }

  // 2. HARD FILTER: Drop any salaried jobs, corporate counsel, executive roles, dev gigs, or agency-only postings
  if (NOT_FREELANCE_PATENT_ANALYST.test(item.title) || AGENCY_HARD_DROP.test(fullText)) {
    return {
      ...item,
      score: 0,
      disciplines: ['Non-Freelance / Excluded Role'],
      primaryDiscipline: 'dropped',
      domains: [],
      flags: ['Excluded: Employment job, executive title, dev role, or agency requirement'],
      isDirectFirm: false,
      lookingForIndividual: false,
    };
  }

  // 3. HARD FILTER: Reject apparel false positives
  if (NON_PATENT_FALSE_POSITIVES.test(fullText)) {
    return {
      ...item,
      score: 0,
      disciplines: ['Non-Patent False Positive'],
      primaryDiscipline: 'dropped',
      domains: [],
      flags: ['Excluded: Non-patent false positive (apparel, furniture, etc.)'],
      isDirectFirm: false,
      lookingForIndividual: false,
    };
  }

  // 4. HARD GATE: Must require genuine patent analysis / search / drafting service
  if (!PATENT_SERVICE_REQUIRED.test(fullText)) {
    return {
      ...item,
      score: 0,
      disciplines: ['Non-Patent'],
      primaryDiscipline: 'dropped',
      domains: [],
      flags: ['No patent service required'],
      isDirectFirm: false,
      lookingForIndividual: false,
    };
  }

  let score = 0;
  const matchedDisciplines = [];
  const matchedDomains = [];

  // 5. Strict Individual-seeking detection
  const lookingForIndividual = INDIVIDUAL_STRICT.test(fullText);
  if (lookingForIndividual) {
    score += 50;
  }

  // 6. Score Disciplines
  for (const disc of DISCIPLINES) {
    if (disc.regex.test(fullText)) {
      score += disc.weight;
      matchedDisciplines.push(disc.label);
    }
  }

  // 7. Technical Domain Boost
  for (const dom of DOMAIN_BOOSTS) {
    if (dom.regex.test(fullText)) {
      score += dom.boost;
      matchedDomains.push(dom.domain);
    }
  }

  if (matchedDisciplines.length === 0) {
    score += 20;
    matchedDisciplines.push('General Patent Research');
  }

  let primaryDiscipline = 'prior_art';
  if (matchedDisciplines.some((d) => d.includes('Invalidity'))) primaryDiscipline = 'invalidity';
  else if (matchedDisciplines.some((d) => d.includes('Freedom to Operate'))) primaryDiscipline = 'fto';
  else if (matchedDisciplines.some((d) => d.includes('Landscape'))) primaryDiscipline = 'landscape';
  else if (matchedDisciplines.some((d) => d.includes('Drafting'))) primaryDiscipline = 'drafting';

  const relevantEvidence = config.CANDIDATE.evidence.filter((e) => {
    return e.discipline === primaryDiscipline || e.discipline === 'prior_art';
  });

  const engagementType = item.type === 'hourly'
    ? 'Freelance Hourly Project (No Employment)'
    : 'Freelance Fixed Milestone Gig (Deliverable Based)';

  return {
    ...item,
    name: item.company || item.name,
    score: Math.max(0, score),
    engagementType,
    disciplines: matchedDisciplines.length > 0 ? matchedDisciplines : ['General Patent Analysis'],
    primaryDiscipline,
    domains: matchedDomains.length > 0 ? matchedDomains : ['General Tech'],
    relevantEvidence: relevantEvidence.length > 0 ? relevantEvidence : [config.CANDIDATE.evidence[0]],
    flags: [],
    isDirectFirm: false,
    lookingForIndividual,
  };
}

module.exports = {
  classifyItem,
  DISCIPLINES,
  DOMAIN_BOOSTS,
};
