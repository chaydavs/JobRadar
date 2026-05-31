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

## Data source

SimplifyJobs Summer2026-Internships GitHub repo, two sections:
- `## 💻 Software Engineering` (SWE, FDE, full-stack, data engineering, research SWE)
- `## 🤖 Data Science, AI & Machine Learning` (ML, DS, research)

## Key config decisions

- `MAX_AGE_DAYS = 1` — apply to fresh postings only
- `MIN_SCORE = 15` — floor for email inclusion
- `hideNoSponsorship = true` default in dashboard
- Email sends top 25 matches daily at 8am ET via GitHub Actions

## Tech stack

- **Dashboard:** React 18 + Vite, localStorage + optional Supabase sync
- **Email digest:** Python 3.11, stdlib only (no pip deps for the base script)
- **CI:** GitHub Actions (`daily-radar.yml`)
- **Deploy:** Vercel (vercel.json configured)

## Resume profiles location

`src/config/profiles.js` is the source of truth. `scripts/daily_digest.py` mirrors it manually — keep in sync when editing keywords.

## Phase 2 TODO (multi-source)

Planned architecture for adding more job boards:
```
scripts/sources/
  base.py          — Job dataclass + DataSource ABC
  simplify.py      — current GitHub README parser
  jobspy_source.py — scrapes LinkedIn/Indeed/Glassdoor/ZipRecruiter
  adzuna.py        — Adzuna free API (needs ADZUNA_APP_ID + ADZUNA_APP_KEY secrets)
  muse.py          — The Muse free API
```
Not yet implemented. Phase 1 (expand SimplifyJobs sections + new profiles + age fix) is done.
