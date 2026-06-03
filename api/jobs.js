/**
 * GET /api/jobs
 * Aggregates early-career listings (intern + new-grad/entry, no senior roles)
 * from Greenhouse, Ashby, and Lever public job board APIs.
 * All return real posting timestamps — no stale date issues. No API keys required.
 *
 * To add more companies: find their ATS slug in their careers URL and append to the list.
 *   Greenhouse: boards.greenhouse.io/{slug}  →  add { slug, name } to GREENHOUSE
 *   Ashby:      jobs.ashbyhq.com/{slug}      →  add { slug, name } to ASHBY
 *   Lever:      jobs.lever.co/{slug}         →  add { slug, name } to LEVER
 */

const GREENHOUSE = [
  // Big tech / scale-ups
  { slug: "openai",       name: "OpenAI" },
  { slug: "anthropic",    name: "Anthropic" },
  { slug: "discord",      name: "Discord" },
  { slug: "airbnb",       name: "Airbnb" },
  { slug: "coinbase",     name: "Coinbase" },
  { slug: "databricks",   name: "Databricks" },
  { slug: "doordash",     name: "DoorDash" },
  { slug: "cloudflare",   name: "Cloudflare" },
  { slug: "mongodb",      name: "MongoDB" },
  { slug: "datadog",      name: "Datadog" },
  { slug: "robinhood",    name: "Robinhood" },
  { slug: "hashicorp",    name: "HashiCorp" },
  { slug: "hubspot",      name: "HubSpot" },
  { slug: "twilio",       name: "Twilio" },
  { slug: "elastic",      name: "Elastic" },
  { slug: "stripe",       name: "Stripe" },
  { slug: "instacart",    name: "Instacart" },
  { slug: "asana",        name: "Asana" },
  { slug: "gitlab",       name: "GitLab" },
  { slug: "samsara",      name: "Samsara" },
  { slug: "airtable",     name: "Airtable" },
  // Startups
  { slug: "brex",         name: "Brex" },
  { slug: "plaid",        name: "Plaid" },
  { slug: "chime",        name: "Chime" },
  { slug: "scaleai",      name: "Scale AI" },
  { slug: "affirm",       name: "Affirm" },
  { slug: "flexport",     name: "Flexport" },
  { slug: "faire",        name: "Faire" },
  { slug: "webflow",      name: "Webflow" },
  { slug: "figma",        name: "Figma" },
  { slug: "temporal",     name: "Temporal" },
  { slug: "cockroachlabs", name: "CockroachDB" },
  { slug: "starburst",    name: "Starburst" },
  { slug: "miro",         name: "Miro" },
  { slug: "gusto",        name: "Gusto" },
  { slug: "pagerduty",    name: "PagerDuty" },
  { slug: "zendesk",      name: "Zendesk" },
  { slug: "verkada",      name: "Verkada" },
  { slug: "hightouch",    name: "Hightouch" },
];

const ASHBY = [
  // AI startups
  { slug: "perplexity",   name: "Perplexity" },
  { slug: "cognition",    name: "Cognition" },
  { slug: "baseten",      name: "Baseten" },
  { slug: "sierra",       name: "Sierra" },
  { slug: "decagon",      name: "Decagon" },
  { slug: "elevenlabs",   name: "ElevenLabs" },
  { slug: "writer",       name: "Writer" },
  { slug: "harvey",       name: "Harvey" },
  { slug: "modal",        name: "Modal" },
  { slug: "langchain",    name: "LangChain" },
  { slug: "unstructured", name: "Unstructured" },
  { slug: "vapi",         name: "Vapi" },
  // Dev tools / infra startups
  { slug: "vercel",       name: "Vercel" },
  { slug: "linear",       name: "Linear" },
  { slug: "retool",       name: "Retool" },
  { slug: "replit",       name: "Replit" },
  { slug: "mintlify",     name: "Mintlify" },
  { slug: "browserbase",  name: "Browserbase" },
  { slug: "supabase",     name: "Supabase" },
  { slug: "posthog",      name: "PostHog" },
  { slug: "resend",       name: "Resend" },
  { slug: "dbtlabs",      name: "dbt Labs" },
  { slug: "cal",          name: "Cal.com" },
  // Fintech / other startups
  { slug: "ramp",         name: "Ramp" },
  { slug: "mercury",      name: "Mercury" },
  { slug: "notion",       name: "Notion" },
  // More AI startups (rotate interns seasonally)
  { slug: "cohere",       name: "Cohere" },
  { slug: "character",    name: "Character.AI" },
  { slug: "pinecone",     name: "Pinecone" },
  { slug: "weaviate",     name: "Weaviate" },
  { slug: "suno",         name: "Suno" },
  { slug: "abridge",      name: "Abridge" },
  { slug: "openevidence", name: "OpenEvidence" },
  { slug: "contextual",   name: "Contextual AI" },
];

const LEVER = [
  { slug: "plaid",        name: "Plaid" },   // most companies migrated off Lever; kept for resilience
];

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
const DEFENSE_COMPANIES = [
  "bigbear", "big bear", "teledyne", "flir", "saic", "leidos", "booz allen",
  "raytheon", "rtx", "lockheed", "northrop", "general dynamics", "l3harris",
  "l3 harris", "caci", "peraton", "mantech", "scientific research corporation",
  "anduril", "palantir", "parsons", "sierra nevada", "bae systems", "draper",
  "mitre", "aerospace corporation", "ball aerospace", "maxar", "boeing",
  "huntington ingalls", "kbr", "jacobs", "battelle", "in-q-tel", "two six",
  "shield ai", "epirus", "vannevar", "rebellion defense", "govini",
  "second front", "darpa", "air force", "space force", "homeland security",
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
