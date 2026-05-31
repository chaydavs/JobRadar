/**
 * GET /api/jobs
 * Aggregates intern listings from Greenhouse, Ashby, and Lever public job board APIs.
 * All three APIs return real posting timestamps — no stale date issues.
 * No API keys required.
 *
 * To add more companies: find their ATS slug in their careers URL and append to the list.
 *   Greenhouse: boards.greenhouse.io/{slug}  →  add { slug, name } to GREENHOUSE
 *   Ashby:      jobs.ashbyhq.com/{slug}      →  add { slug, name } to ASHBY
 *   Lever:      jobs.lever.co/{slug}         →  add { slug, name } to LEVER
 */

const GREENHOUSE = [
  { slug: "openai",       name: "OpenAI" },
  { slug: "anthropic",    name: "Anthropic" },
  { slug: "discord",      name: "Discord" },
  { slug: "airbnb",       name: "Airbnb" },
  { slug: "coinbase",     name: "Coinbase" },
  { slug: "databricks",   name: "Databricks" },
  { slug: "brex",         name: "Brex" },
  { slug: "doordash",     name: "DoorDash" },
  { slug: "cloudflare",   name: "Cloudflare" },
  { slug: "mongodb",      name: "MongoDB" },
  { slug: "datadog",      name: "Datadog" },
  { slug: "miro",         name: "Miro" },
  { slug: "gusto",        name: "Gusto" },
  { slug: "robinhood",    name: "Robinhood" },
  { slug: "plaid",        name: "Plaid" },
  { slug: "chime",        name: "Chime" },
  { slug: "scaleai",      name: "Scale AI" },
  { slug: "pagerduty",    name: "PagerDuty" },
  { slug: "hashicorp",    name: "HashiCorp" },
  { slug: "hubspot",      name: "HubSpot" },
  { slug: "zendesk",      name: "Zendesk" },
  { slug: "twilio",       name: "Twilio" },
  { slug: "elastic",      name: "Elastic" },
  { slug: "sendgrid",     name: "SendGrid" },
];

const ASHBY = [
  { slug: "vercel",       name: "Vercel" },
  { slug: "linear",       name: "Linear" },
  { slug: "ramp",         name: "Ramp" },
  { slug: "mercury",      name: "Mercury" },
  { slug: "retool",       name: "Retool" },
  { slug: "dbtlabs",      name: "dbt Labs" },
  { slug: "figma",        name: "Figma" },
  { slug: "notion",       name: "Notion" },
  { slug: "posthog",      name: "PostHog" },
  { slug: "resend",       name: "Resend" },
  { slug: "cal",          name: "Cal.com" },
];

const LEVER = [
  { slug: "netlify",      name: "Netlify" },
  { slug: "amplitude",    name: "Amplitude" },
  { slug: "webflow",      name: "Webflow" },
  { slug: "figma",        name: "Figma" },   // Figma also posts on Lever sometimes
];

const SKIP_LOCATIONS = ["UK", "Canada", "France", "Germany", "Japan", "China",
  "India", "Brazil", "Netherlands", "Ireland", "Singapore", "Australia"];

function isIntern(title) {
  // Word boundary so "International" / "Internal" don't match
  return /\bintern(ship)?\b/i.test(title);
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
      .filter(j => isIntern(j.title) && !isForeignLocation(j.location?.name || ""))
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
      .filter(j => isIntern(j.title) && !isForeignLocation(j.location || ""))
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
      .filter(j => isIntern(j.text) && !isForeignLocation(j.categories?.location || ""))
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

  // Dedup by normalized company::role
  const seen = new Set();
  const jobs = all.filter(j => {
    const key = `${j.company.toLowerCase().replace(/\W/g, "")}::${j.role.toLowerCase().replace(/\W/g, "").slice(0, 50)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  res.setHeader("Cache-Control", "s-maxage=1800, stale-while-revalidate=3600");
  res.json({ jobs, fetchedAt: new Date().toISOString(), count: jobs.length });
}
