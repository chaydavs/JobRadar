import { RESUME_PROFILES, BONUS_KEYWORDS } from "../config/profiles.js";

const SKIP_LOCATIONS = [
  "UK", "Canada", "France", "Germany", "Japan", "China",
  "India", "Brazil", "Netherlands", "Ireland", "Singapore", "Australia"
];

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
    if (text.includes(kw.toLowerCase())) {
      score += 3;
    }
  }

  if (location.toLowerCase().includes("remote")) score += 8;
  if (role.toLowerCase().includes("intern")) score += 5;

  score *= profile.weight;
  return { score: Math.round(score), matches };
}

export function scoreAllJobs(jobs) {
  return jobs.map(job => {
    let bestProfile = "";
    let bestScore = 0;
    let bestMatches = [];

    for (const [name, profile] of Object.entries(RESUME_PROFILES)) {
      const { score, matches } = scoreJob(job.role, job.company, job.location, profile);
      if (score > bestScore) {
        bestScore = score;
        bestProfile = name;
        bestMatches = matches;
      }
    }

    return { ...job, bestProfile, score: bestScore, matches: bestMatches };
  }).sort((a, b) => b.score - a.score);
}

function detectEduLevel(role, advancedDegree) {
  const roleLower = role.toLowerCase();
  if (advancedDegree || /\bph\.?d\b/.test(roleLower) || /\bdoctoral\b/.test(roleLower)) {
    return "phd";
  }
  if (/\bmaster'?s?\b/.test(roleLower) || /\bgraduate\b/.test(roleLower) || /\bm\.?s\.?\b/.test(roleLower)) {
    return "masters";
  }
  return "undergrad";
}

export function parseJobs(markdown) {
  const sectionHeader = "## \uD83E\uDD16 Data Science, AI & Machine Learning";
  const dsStart = markdown.indexOf(sectionHeader);
  if (dsStart === -1) return [];

  const ends = ["## \uD83D\uDCC8", "## \uD83D\uDD27", "## \uD83D\uDEE0"]
    .map(m => markdown.indexOf(m, dsStart + 1))
    .filter(i => i > 0);
  const dsEnd = ends.length > 0 ? Math.min(...ends) : markdown.length;
  const dsContent = markdown.substring(dsStart, dsEnd);

  const rowRegex = /<tr>([\s\S]*?)<\/tr>/g;
  const jobs = [];
  let lastCompany = "";
  let rowMatch;

  while ((rowMatch = rowRegex.exec(dsContent)) !== null) {
    const row = rowMatch[1];
    if (row.includes("\uD83D\uDD12")) continue;

    const tdRegex = /<td>([\s\S]*?)<\/td>/g;
    const tds = [];
    let tdMatch;
    while ((tdMatch = tdRegex.exec(row)) !== null) {
      tds.push(tdMatch[1]);
    }
    if (tds.length < 5) continue;

    const companyMatch = tds[0].match(/<strong><a[^>]*>([^<]+)<\/a><\/strong>/);
    const company = companyMatch
      ? companyMatch[1].trim()
      : (tds[0].includes("\u21B3") ? lastCompany : "");
    if (companyMatch) lastCompany = company;
    if (!company) continue;

    const role = tds[1].replace(/<[^>]+>/g, "").trim();
    const location = tds[2].replace(/<[^>]+>/g, "").trim();
    const age = tds[4].replace(/<[^>]+>/g, "").trim();

    const applyMatch = row.match(/href="(https:\/\/(?!simplify\.jobs|i\.imgur)[^"]+?)"/);
    const link = applyMatch ? applyMatch[1].split("?utm_source")[0] : "";

    const noSponsorship = row.includes("\uD83D\uDEC2");
    const usCitizenOnly = row.includes("\uD83C\uDDFA\uD83C\uDDF8");
    const advancedDegree = row.includes("\uD83C\uDF93");
    const eduLevel = detectEduLevel(role, advancedDegree);

    if (SKIP_LOCATIONS.some(loc => location.includes(loc))) continue;

    jobs.push({ company, role, location, link, age, noSponsorship, usCitizenOnly, advancedDegree, eduLevel });
  }

  return jobs;
}
