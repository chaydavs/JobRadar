/**
 * Recruiter outreach helpers (dashboard side).
 *
 * ATS APIs don't expose recruiter contacts, so we provide:
 *   1. A LinkedIn people-search deep-link (also computed server-side as recruiterSearch)
 *   2. A personalized cold-outreach draft message to copy-paste
 *
 * Future: plug an email-finder API into findRecruiterEmail().
 */

export function linkedinRecruiterSearch(company) {
  const q = `${company} (recruiter OR "talent acquisition" OR "university recruiting")`;
  return `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(q)}&origin=GLOBAL_SEARCH_HEADER`;
}

export function draftMessage(role, company, matches = []) {
  const skills = matches.length ? matches.slice(0, 3).join(", ") : "ML and full-stack engineering";
  return (
    `Hi! I'm Chay, a Computational Modeling & Data Analytics student at Virginia Tech. ` +
    `I just applied to the ${role} role at ${company} and wanted to reach out directly. ` +
    `My background is a strong match — ${skills} — and I'd love to share why I think I'd ` +
    `be a great fit. Would you have a few minutes to connect? Thanks!`
  );
}

// Stub for a future email-finder API (Hunter.io / Apollo). Returns null for now.
export function findRecruiterEmail() {
  return null;
}
