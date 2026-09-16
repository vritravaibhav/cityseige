/**
 * src/sources/freelancer.js — Freelancer.com live API adapter for patent queries
 */

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

async function fetchProjectsForQuery(q) {
  const url = `https://www.freelancer.com/api/projects/0.1/projects/active/?query=${encodeURIComponent(q)}&limit=100&job_details=true&full_description=true`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20000);

  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': UA,
        'Accept': 'application/json',
      },
      signal: controller.signal,
    });

    if (!res.ok) {
      return { ok: false, status: res.status, error: `HTTP ${res.status}`, items: [] };
    }

    const data = await res.json();
    const projects = data?.result?.projects;
    if (!Array.isArray(projects)) {
      return { ok: true, items: [] };
    }

    const items = projects.map((p) => {
      const min = p.budget?.minimum || 0;
      const max = p.budget?.maximum || 0;
      const cur = p.currency?.code || 'USD';
      const budgetStr = (min || max) ? `${cur} ${min || '?'} - ${max || '?'}` : 'Not specified';
      
      const skills = Array.isArray(p.jobs)
        ? p.jobs.map((j) => (typeof j === 'string' ? j : j.name || j.title || '')).filter(Boolean)
        : [];

      return {
        id: `freelancer-${p.id}`,
        title: (p.title || '').trim(),
        description: (p.description || p.preview_description || '').trim(),
        url: p.seo_url ? `https://www.freelancer.com/projects/${p.seo_url}` : `https://www.freelancer.com/projects/${p.id}`,
        budget: budgetStr,
        currency: cur,
        rawBudget: { min, max, cur },
        skills,
        type: p.type === 'hourly' ? 'hourly' : 'fixed',
        source: 'freelancer.com',
        posted: p.time_submitted ? new Date(p.time_submitted * 1000).toISOString() : new Date().toISOString(),
      };
    });

    return { ok: true, items };
  } catch (err) {
    return { ok: false, error: err.message, items: [] };
  } finally {
    clearTimeout(timer);
  }
}

module.exports = {
  name: 'freelancer.com',
  fetchProjectsForQuery,
};
