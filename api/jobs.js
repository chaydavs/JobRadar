/**
 * GET /api/jobs
 * Aggregates early-career listings (intern + new-grad/entry, no senior roles)
 * from Greenhouse, Ashby, and Lever public job board APIs.
 * All return real posting timestamps — no stale date issues. No API keys required.
 *
 * Company lists live in data/companies.json (shared with the Python email pipeline).
 * To add companies: add { name, ats, slug } there, or run scripts/discover_companies.py.
 */
import companiesRegistry from "../data/companies.json" with { type: "json" };

// Company lists come from the shared registry (data/companies.json) so the dashboard
// and the Python email pipeline stay in sync from ONE source. Grow it by running
// `python scripts/discover_companies.py` (harvests YC + VC directories, probes live boards).
const byAts = (ats) =>
  companiesRegistry.filter(c => c.ats === ats).map(({ slug, name }) => ({ slug, name }));
const GREENHOUSE = byAts("greenhouse");
const ASHBY = byAts("ashby");
const LEVER = byAts("lever");

const SKIP_LOCATIONS = [
  "UK", "United Kingdom", "Canada", "France", "Germany", "Japan", "China",
  "India", "Brazil", "Netherlands", "Ireland", "Singapore", "Australia",
  "Spain", "Italy", "Poland", "Sweden", "Switzerland", "Israel", "Mexico",
  "EMEA", "APAC", "LATAM",
  "London", "Toronto", "Vancouver", "Sydney", "Melbourne", "Bangalore",
  "Bengaluru", "Hyderabad", "Pune", "Dublin", "Berlin", "Munich", "Paris",
  "Amsterdam", "Tel Aviv", "Tokyo", "Sao Paulo", "Stockholm", "Zurich",
  "Barcelona", "Madrid", "Warsaw",
];

// Seniority filter — intern + new-grad/entry only (Chay is a college student)
const SENIOR_RE = /\b(senior|sr|staff|principal|lead|manager|mgr|director|head|vp|architect|distinguished|expert|ii|iii|iv|v)\b/i;
const EARLY_CAREER_RE = /\b(intern|internship|new\s+grad|new\s+graduate|university\s+grad|campus|early\s+career|early[- ]in[- ]career|entry\s+level|entry-level|associate|junior|jr|co-?op|apprentice|rotational|graduate\s+program)\b/i;

function isEarlyCareer(title) {
  if (SENIOR_RE.test(title)) return false;
  return EARLY_CAREER_RE.test(title);
}

// Non-technical functions Chay isn't targeting (filtered even if "AI" is in title)
const NON_TECH_RE = /\b(marketing|sales|go-to-market|gtm|people\s+(team|operations|ops)|human\s+resources|recruit(ing|er)|talent\s+acquisition|trade\s+compliance|legal|paralegal|accounting|graphic\s+design|social\s+media|public\s+relations|partnerships|business\s+development|customer\s+(success|support|experience)|account\s+(executive|manager)|communications|public\s+policy|grc|procurement)\b/i;

function isTechnical(title) {
  return !NON_TECH_RE.test(title);
}

function isRelevant(title) {
  return isEarlyCareer(title) && isTechnical(title);
}

function isForeignLocation(loc) {
  return SKIP_LOCATIONS.some(l => loc.includes(l));
}

// Work-authorization filter — Chay needs sponsorship, so block citizenship /
// clearance / green-card / no-sponsorship roles (govt & defense almost always require these)
const BLOCKED_AUTH_RE = /(u\.?s\.?\s*citizen|citizenship\s+(is\s+)?required|must\s+be\s+a\s+citizen|u\.?s\.?\s*person|green\s*card|permanent\s+resident|lawful\s+permanent|security\s+clearance|active\s+(secret|top\s+secret|clearance)|ts\/sci|top\s+secret|secret\s+clearance|polygraph|\bdod\b|department\s+of\s+defense|active\s+duty|skillbridge|\bitar\b|export\s+control|federal\s+government|public\s+trust\s+clearance|no\s+sponsorship|not\s+(able|provide|offer)[\s\S]{0,20}sponsor|unable\s+to[\s\S]{0,20}sponsor|cannot\s+sponsor|without\s+(visa\s+)?sponsorship|do(es)?\s+not\s+(provide|offer)\s+(visa\s+)?sponsorship|not\s+require\s+sponsorship|without\s+the\s+need\s+for\s+sponsorship)/i;

function stripHtml(html) {
  return (html || "").replace(/<[^>]+>/g, " ");
}

function requiresBlockedAuth(title, description = "") {
  return BLOCKED_AUTH_RE.test(`${title} ${description}`);
}

// Defense / government contractors — roles almost always require clearance/citizenship
// Keep in sync with scripts/sources/base.py _DEFENSE_COMPANIES
const DEFENSE_COMPANIES = [
  "bigbear", "big bear", "teledyne", "flir", "saic", "leidos", "booz allen",
  "raytheon", "rtx", "lockheed", "northrop", "general dynamics", "l3harris",
  "l3 harris", "caci", "peraton", "mantech", "scientific research corporation",
  "anduril", "palantir", "parsons", "sierra nevada", "bae systems", "draper",
  "mitre", "aerospace corporation", "ball aerospace", "maxar", "boeing",
  "northrop grumman", "huntington ingalls", "kbr", "jacobs", "battelle",
  "in-q-tel", "two six", "shield ai", "epirus", "vannevar", "rebellion defense",
  "govini", "second front", "darpa", "orbis operations", "saronic",
  "national security agency", "department of defense", "u.s. navy", "u.s. army",
  "air force", "space force", "homeland security",
];

function isBlockedCompany(company) {
  const c = company.toLowerCase();
  return DEFENSE_COMPANIES.some(d => c.includes(d));
}

async function fetchGreenhouse({ slug, name }) {
  try {
    const res = await fetch(
      `https://boards-api.greenhouse.io/v1/boards/${slug}/jobs?content=true`,
      { headers: { "User-Agent": "job-radar/2.0" }, signal: AbortSignal.timeout(10000) }
    );
    if (!res.ok) return [];
    const { jobs = [] } = await res.json();
    return jobs
      .filter(j => isRelevant(j.title) && !isForeignLocation(j.location?.name || "")
        && !requiresBlockedAuth(j.title, stripHtml(j.content)))
      .map(j => ({
        company: name,
        role: j.title,
        location: j.location?.name || "Unknown",
        link: j.absolute_url,
        postedAt: j.updated_at,
        source: "greenhouse",
        id: `gh-${j.id}`,
      }));
  } catch {
    return [];
  }
}

async function fetchAshby({ slug, name }) {
  try {
    const res = await fetch(
      `https://api.ashbyhq.com/posting-api/job-board/${slug}`,
      { headers: { "User-Agent": "job-radar/2.0" }, signal: AbortSignal.timeout(8000) }
    );
    if (!res.ok) return [];
    const data = await res.json();
    const jobs = data.jobs || [];
    return jobs
      .filter(j => isRelevant(j.title) && !isForeignLocation(j.location || "")
        && !requiresBlockedAuth(j.title, j.descriptionPlain || ""))
      .map(j => ({
        company: name,
        role: j.title.trim(),
        location: j.location || (j.isRemote ? "Remote" : "Unknown"),
        link: j.jobUrl || j.applyUrl || `https://jobs.ashbyhq.com/${slug}/${j.id}`,
        postedAt: j.publishedAt || null,
        source: "ashby",
        id: `ashby-${j.id}`,
      }));
  } catch {
    return [];
  }
}

async function fetchLever({ slug, name }) {
  try {
    const res = await fetch(
      `https://api.lever.co/v0/postings/${slug}?mode=json`,
      { headers: { "User-Agent": "job-radar/2.0" }, signal: AbortSignal.timeout(8000) }
    );
    if (!res.ok) return [];
    const jobs = await res.json();
    return (Array.isArray(jobs) ? jobs : [])
      .filter(j => isRelevant(j.text) && !isForeignLocation(j.categories?.location || "")
        && !requiresBlockedAuth(j.text, stripHtml(j.descriptionPlain || j.description || "")))
      .map(j => ({
        company: name,
        role: j.text,
        location: j.categories?.location || j.workplaceType || "Unknown",
        link: j.hostedUrl,
        postedAt: j.createdAt ? new Date(j.createdAt).toISOString() : null,
        source: "lever",
        id: `lever-${j.id}`,
      }));
  } catch {
    return [];
  }
}

// --- SimplifyJobs GitHub README (high volume; relative dates → synthetic postedAt) ---
const SIMPLIFY_URL = "https://raw.githubusercontent.com/SimplifyJobs/Summer2026-Internships/dev/README.md";
const SIMPLIFY_SECTIONS = [
  { start: "## 💻 Software Engineering", stop: "## 📱 Product Management" },
  { start: "## 🤖 Data Science, AI & Machine Learning", stop: "## 📈 Quantitative Finance" },
];

function simplifyAgeToPostedAt(ageStr) {
  const s = (ageStr || "").toLowerCase().trim();
  const m = s.match(/(\d+)/);
  if (!m) return null;
  let days = parseInt(m[1]);
  if (s.includes("mo") || s.includes("month")) days *= 30;
  else if (s.includes("w")) days *= 7;
  else if (s.includes("yr") || s.includes("year")) days *= 365;
  // "h"/"d"/"today" → days as-is (today/0 → 0)
  return new Date(Date.now() - days * 86400000).toISOString();
}

function parseSimplifySection(content) {
  const rows = [];
  let lastCompany = "";
  const rowRegex = /<tr>([\s\S]*?)<\/tr>/g;
  let rm;
  while ((rm = rowRegex.exec(content)) !== null) {
    const row = rm[1];
    if (row.includes("🔒")) continue; // 🔒 closed
    const tds = [];
    const tdRegex = /<td>([\s\S]*?)<\/td>/g;
    let tm;
    while ((tm = tdRegex.exec(row)) !== null) tds.push(tm[1]);
    if (tds.length < 5) continue;

    const companyMatch = tds[0].match(/<strong><a[^>]*>([^<]+)<\/a><\/strong>/);
    const company = companyMatch ? companyMatch[1].trim() : (tds[0].includes("↳") ? lastCompany : "");
    if (companyMatch) lastCompany = company;
    if (!company) continue;

    const role = tds[1].replace(/<[^>]+>/g, "").trim();
    const location = tds[2].replace(/<[^>]+>/g, "").trim();
    const age = tds[4].replace(/<[^>]+>/g, "").trim();
    const applyMatch = row.match(/href="(https:\/\/(?!simplify\.jobs|i\.imgur)[^"]+?)"/);
    const link = applyMatch ? applyMatch[1].split("?utm_source")[0] : "";

    const noSponsorship = row.includes("🛂");   // 🛂
    const usCitizenOnly = row.includes("🇺🇸"); // 🇺🇸
    const advancedDegree = row.includes("🎓");  // 🎓

    if (isForeignLocation(location)) continue;
    if (!isTechnical(role)) continue;
    if (isBlockedCompany(company) || requiresBlockedAuth(role)) continue;

    rows.push({
      company, role, location, link,
      postedAt: simplifyAgeToPostedAt(age),
      source: "simplify",
      noSponsorship, usCitizenOnly, advancedDegree,
      eduLevel: advancedDegree ? "phd" : undefined, // parser fills the rest
      id: `simplify-${company}-${role}`.replace(/\W/g, "").slice(0, 60),
    });
  }
  return rows;
}

async function fetchSimplify() {
  try {
    const res = await fetch(SIMPLIFY_URL, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) return [];
    const md = await res.text();
    const out = [];
    for (const { start, stop } of SIMPLIFY_SECTIONS) {
      const from = md.indexOf(start);
      if (from === -1) continue;
      const to = md.indexOf(stop, from + 1);
      out.push(...parseSimplifySection(md.substring(from, to > 0 ? to : md.length)));
    }
    return out;
  } catch {
    return [];
  }
}

export default async function handler(req, res) {
  // Aggregate all sources (ATS = real dates, SimplifyJobs = volume)
  const [ghResults, ashbyResults, leverResults, simplifyResults] = await Promise.all([
    Promise.all(GREENHOUSE.map(fetchGreenhouse)),
    Promise.all(ASHBY.map(fetchAshby)),
    Promise.all(LEVER.map(fetchLever)),
    fetchSimplify(),
  ]);

  const all = [
    ...ghResults.flat(),
    ...ashbyResults.flat(),
    ...leverResults.flat(),
    ...simplifyResults,
  ];

  // Hard age cap — never surface stale (month-old) postings to the dashboard
  const MAX_AGE_DAYS = 21;
  const now = Date.now();

  // Drop stale + defense/govt companies, dedup by company::role, attach recruiter link
  const seen = new Set();
  const jobs = all.filter(j => {
    if (isBlockedCompany(j.company)) return false;
    const ageDays = j.postedAt ? (now - new Date(j.postedAt).getTime()) / 86400000 : 9999;
    if (ageDays > MAX_AGE_DAYS) return false;
    const key = `${j.company.toLowerCase().replace(/\W/g, "")}::${j.role.toLowerCase().replace(/\W/g, "").slice(0, 50)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).map(j => ({
    ...j,
    recruiterSearch: linkedinRecruiterSearch(j.company),
  }));

  res.setHeader("Cache-Control", "s-maxage=1800, stale-while-revalidate=3600");
  res.json({ jobs, fetchedAt: new Date().toISOString(), count: jobs.length });
}

// LinkedIn people-search deep-link for recruiters at a company.
// ATS APIs don't expose recruiter contacts, so we link the search instead.
function linkedinRecruiterSearch(company) {
  const q = `${company} (recruiter OR "talent acquisition" OR "university recruiting")`;
  return `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(q)}&origin=GLOBAL_SEARCH_HEADER`;
}
