# Job Radar — Claude Context

Personal internship tracking tool for **Sai Chaitanya Davuluri (Chay)**.

## Who this is for

- Virginia Tech, BS Computational Modeling & Data Analytics, graduating May 2027
- Current roles: Data Engineer @ Projectr Analytics, ML Researcher @ VT DataBridge
- AWS Certified AI Practitioner
- Needs visa sponsorship — filter out "No Sponsorship" / "US Citizen Only" jobs by default

## Target roles (intern only, Summer 2026)

Priority order:
1. **AI/ML Engineer** — strongest fit; PyTorch, TF, spaCy, RAG, MCP, NLP research
2. **Data Engineering** — active role at Projectr Analytics; ETL, geospatial, AWS ECS/Fargate
3. **SWE / Full-Stack** — Flask, Next.js, Supabase, PostgreSQL, REST APIs (Refr.store project)
4. **Data Science / Research** — 3 undergraduate research positions
5. **BI & Operations** — SQL, Power BI, Slate CRM

**Not targeting:** PM, Quant Finance, Hardware

## Data sources

Multi-source aggregation. The two pipelines pull slightly different sets (see below):

- **SimplifyJobs** Summer2026-Internships GitHub README, two sections — `## 💻 Software Engineering` and `## 🤖 Data Science, AI & Machine Learning` (skips PM, Quant, Hardware). High volume; relative "Xd ago" dates.
- **Greenhouse** public job board API — companies from `data/companies.json`. Real posting timestamps, no key.
- **Ashby** public job board API — companies from `data/companies.json`. Real timestamps, no key.
- Company registry (`data/companies.json`, ~180 companies) is shared by both pipelines and grown via `scripts/discover_companies.py` (harvests the YC directory + probes live Greenhouse/Ashby boards).
- **Lever** public API — dashboard only (currently just Plaid, kept for resilience).
- **jobspy** (Indeed) — email only; requires `python-jobspy`. LinkedIn/ZipRecruiter excluded (block CI IPs).
- **The Muse** free API — email only, no key.

Dashboard (`api/jobs.js`): Greenhouse + Ashby + Lever + Simplify.
Email (`scripts/daily_digest.py`): Simplify + Greenhouse + Ashby + jobspy + Muse.

## Key config decisions

- `MAX_AGE_DAYS = 1` — preferred fresh window; email backfills up to 7 days if fewer than 10 fresh picks
- Dashboard hard-caps listings at 21 days (`api/jobs.js`)
- `MIN_SCORE = 15` — floor for email inclusion
- `hideNoSponsorship = true` default in dashboard
- Email sends the top 10 curated picks (`TARGET_PICKS`) daily at 8am ET via GitHub Actions

## Tech stack

- **Dashboard:** React 18 + Vite, localStorage + optional Supabase sync
- **Email digest:** Python 3.11, stdlib only (no pip deps for the base script)
- **CI:** GitHub Actions — `daily-radar.yml` (email) + `build-feed.yml` (dashboard feed)
- **Deploy:** Vercel (vercel.json configured)

## Dashboard feed precompute

To avoid fetching ~180+ boards live on every page load, `build-feed.yml` runs
`node scripts/build_feed.mjs` every 6h → writes `public/jobs.json` (served at `/jobs.json`)
using `api/jobs.js`'s exported `aggregateJobs()` (one implementation). The dashboard
(`src/lib/feed.js`) fetches `/jobs.json` first and falls back to the live `/api/jobs`
only if it's missing, empty, or >24h stale. As the registry grows toward ~500, the
static feed is what keeps loads instant.

## Resume profiles location

`src/config/profiles.js` is the source of truth (dashboard). `scripts/profiles.py` mirrors it manually — keep in sync when editing keywords.

## Sync hazards (two-mirror duplication)

The fetch→filter→score→dedup pipeline is implemented twice (JS for the dashboard, Python for the email). When editing shared logic, change **both**:

| What | JS (dashboard) | Python (email) |
|---|---|---|
| Resume profiles + keywords | `src/config/profiles.js` | `scripts/profiles.py` |
| Filter regexes + defense blocklist | `api/jobs.js` | `scripts/sources/base.py` |

**Company lists are NO LONGER dual-maintained** — both sides read the single registry
`data/companies.json` (`api/jobs.js` via JSON import, `scripts/sources/companies.py` via
`json.load`). Grow it with `python scripts/discover_companies.py`. No automated sync check
exists for the remaining two rows — grep both sides after any change.

## Phase 2 status (multi-source) — DONE

Implemented under `scripts/sources/`:
```
scripts/sources/
  base.py           — Job dataclass + shared filters (seniority, work-auth, defense blocklist)
  companies.py      — curated Greenhouse + Ashby company lists
  simplify.py       — SimplifyJobs GitHub README parser (SWE + DS/AI sections)
  greenhouse.py     — Greenhouse public API
  ashby.py          — Ashby public API
  jobspy_source.py  — scrapes Indeed (LinkedIn/ZipRecruiter excluded — block CI IPs)
  muse.py           — The Muse free API
```
Adzuna was scoped but never built (dropped in favor of Ashby + Greenhouse ATS APIs, which need no keys).
