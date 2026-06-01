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
  { slug: "vannevarlabs", name: "Vannevar Labs" },
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

async function fetchGreenhouse({ slug, name }) {
  try {
    const res = await fetch(
      `https://boards-api.greenhouse.io/v1/boards/${slug}/jobs`,
      { headers: { "User-Agent": "job-radar/2.0" }, signal: AbortSignal.timeout(8000) }
    );
    if (!res.ok) return [];
    const { jobs = [] } = await res.json();
    return jobs
      .filter(j => isRelevant(j.title) && !isForeignLocation(j.location?.name || ""))
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
      .filter(j => isRelevant(j.title) && !isForeignLocation(j.location || ""))
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
      .filter(j => isRelevant(j.text) && !isForeignLocation(j.categories?.location || ""))
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

export default async function handler(req, res) {
  // Deduplicate by company+role after aggregating all sources
  const [ghResults, ashbyResults, leverResults] = await Promise.all([
    Promise.all(GREENHOUSE.map(fetchGreenhouse)),
    Promise.all(ASHBY.map(fetchAshby)),
    Promise.all(LEVER.map(fetchLever)),
  ]);

  const all = [
    ...ghResults.flat(),
    ...ashbyResults.flat(),
    ...leverResults.flat(),
  ];

  // Dedup by normalized company::role, attach recruiter search link
  const seen = new Set();
  const jobs = all.filter(j => {
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
