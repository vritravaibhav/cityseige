/**
 * src/sources/remote_boards.js — Multi-board adapter for patent and IP contracts
 */

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

async function safeFetchJson(url, timeoutMs = 15000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': UA, 'Accept': 'application/json' },
      signal: controller.signal,
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function matchesPatentCriteria(title, text) {
  const content = `${title} ${text}`.toLowerCase();
  return (
    /\b(patent|patents|prior art|freedom to operate|claim chart|intellectual property|ip research|patentability|patent analyst|patent engineer)\b/i.test(content) &&
    !/\b(patent leather|shoe|apparel)\b/i.test(content)
  );
}

async function fetchRemoteBoards() {
  const results = [];

  // 1. Remotive API
  try {
    const remotiveData = await safeFetchJson('https://remotive.com/api/remote-jobs?search=patent&limit=25');
    if (remotiveData && Array.isArray(remotiveData.jobs)) {
      for (const j of remotiveData.jobs) {
        if (matchesPatentCriteria(j.title, j.description)) {
          results.push({
            id: `remotive-${j.id}`,
            title: j.title || '',
            company: j.company_name || 'Direct Client',
            description: (j.description || '').replace(/<[^>]+>/g, ' ').slice(0, 4000),
            url: j.url || '',
            budget: j.salary || 'Negotiable contract',
            currency: 'USD',
            skills: j.tags || ['patent', 'research'],
            type: /contract|freelance/i.test(j.job_type || '') ? 'contract' : 'freelance/remote',
            source: 'remotive.com',
            posted: j.publication_date || new Date().toISOString(),
          });
        }
      }
    }
  } catch (e) {
    // continue
  }

  // 2. Jobicy API
  try {
    const jobicyData = await safeFetchJson('https://jobicy.com/api/v2/remote-jobs?count=20&tag=legal');
    if (jobicyData && Array.isArray(jobicyData.jobs)) {
      for (const j of jobicyData.jobs) {
        if (matchesPatentCriteria(j.jobTitle, j.jobDescription)) {
          results.push({
            id: `jobicy-${j.id}`,
            title: j.jobTitle || '',
            company: j.companyName || 'Confidential',
            description: (j.jobDescription || j.jobExcerpt || '').replace(/<[^>]+>/g, ' ').slice(0, 4000),
            url: j.url || '',
            budget: j.annualSalaryMin ? `${j.annualSalaryMin}-${j.annualSalaryMax || ''} ${j.salaryCurrency || 'USD'}` : 'Market rate',
            currency: j.salaryCurrency || 'USD',
            skills: ['patent', 'intellectual-property'],
            type: 'contract',
            source: 'jobicy.com',
            posted: j.pubDate || new Date().toISOString(),
          });
        }
      }
    }
  } catch (e) {
    // continue
  }

  return results;
}

module.exports = {
  name: 'remote_boards',
  fetchRemoteBoards,
};
