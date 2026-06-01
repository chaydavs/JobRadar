import { RESUME_PROFILES, BONUS_KEYWORDS } from "../config/profiles.js";

export function scoreJob(role, company, location, profile) {
  const text = `${role} ${company} ${location}`.toLowerCase();
  let score = 0;
  const matches = [];

  for (const kw of profile.keywords) {
    if (text.includes(kw.toLowerCase())) {
      score += 10;
      matches.push(kw);
    }
  }

  for (const kw of BONUS_KEYWORDS) {
    if (text.includes(kw.toLowerCase())) score += 3;
  }

  if (location.toLowerCase().includes("remote")) score += 8;
  if (role.toLowerCase().includes("intern")) score += 5;

  return { score: Math.round(score * profile.weight), matches };
}

export function scoreAllJobs(jobs) {
  return jobs.map(job => {
    let bestProfile = "", bestScore = 0, bestMatches = [];
    for (const [name, profile] of Object.entries(RESUME_PROFILES)) {
      const { score, matches } = scoreJob(job.role, job.company, job.location, profile);
      if (score > bestScore) { bestScore = score; bestProfile = name; bestMatches = matches; }
    }
    return { ...job, bestProfile, score: bestScore, matches: bestMatches };
  }).sort((a, b) => b.score - a.score);
}

function detectEduLevel(role) {
  const r = role.toLowerCase();
  if (/\bph\.?d\b|\bdoctoral\b/.test(r)) return "phd";
  if (/\bmaster'?s?\b|\bgraduate\b|\bm\.?s\.?\b/.test(r)) return "masters";
  return "undergrad";
}

function formatAge(postedAt) {
  if (!postedAt) return "unknown";
  const days = Math.floor((Date.now() - new Date(postedAt).getTime()) / 86400000);
  if (days === 0) return "today";
  if (days === 1) return "1 day";
  if (days < 7) return `${days} days`;
  if (days < 14) return "1 week";
  if (days < 30) return `${Math.floor(days / 7)} weeks`;
  return `${Math.floor(days / 30)} months`;
}

// Convert /api/jobs response into the internal job format used by the app
export function normalizeAtsJobs(rawJobs) {
  return rawJobs.map(j => ({
    company: j.company,
    role: j.role,
    location: j.location,
    link: j.link,
    source: j.source,
    recruiterSearch: j.recruiterSearch,
    postedAt: j.postedAt,
    age: formatAge(j.postedAt),
    ageDays: j.postedAt
      ? Math.floor((Date.now() - new Date(j.postedAt).getTime()) / 86400000)
      : 9999,
    noSponsorship: false,
    usCitizenOnly: false,
    advancedDegree: /\bph\.?d\b|\bdoctoral\b/i.test(j.role),
    eduLevel: detectEduLevel(j.role),
  }));
}
