# Job Radar 🎯

Daily internship match feed. Aggregates multiple job boards, scores against 5 resume profiles, and emails you the top matches every morning.

## Two Parts

### 1. Dashboard (Vercel)
A React app you open in your browser. Fetches live listings from Greenhouse, Ashby, Lever, and SimplifyJobs, scores and ranks jobs, shows apply links.

### 2. Daily Email (GitHub Actions)
A Python script that runs every morning at 8am ET. It pulls from SimplifyJobs, Greenhouse, Ashby, Oracle, jobspy (Indeed), and The Muse, scores them, and emails you a **dashboard nudge**: how many roles are newly posted in the last 24h, a teaser of the freshest few, and a button straight to the dashboard where the full pool lives. (It deliberately does not re-send a curated list — that caused the same picks to repeat day after day.)

---

## Setup

### Deploy Dashboard to Vercel (2 minutes)

1. Push this repo to your GitHub
2. Go to [vercel.com](https://vercel.com), sign in with GitHub
3. Click "New Project" → Import this repo
4. Framework: Vite, Root: `./`
5. Click Deploy

Done. Bookmark the URL.

### Set Up Daily Email (5 minutes)

1. **Create a Gmail App Password:**
   - Go to [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords)
   - Generate a new app password for "Mail"
   - Copy the 16-character password

2. **Add GitHub Secrets:**
   - Go to your repo → Settings → Secrets and variables → Actions
   - Add these secrets:
     - `GMAIL_ADDRESS` — your Gmail (e.g. chaydav4@gmail.com)
     - `GMAIL_APP_PASSWORD` — the 16-char app password from step 1
     - `RECIPIENT_EMAIL` — where you want the digest (e.g. chay@vt.edu)

3. **Test it:**
   - Go to Actions tab → "Daily Job Radar" → "Run workflow"
   - Check your email

The cron runs automatically every day at 8am ET.

### Run Locally

```bash
# Dashboard
npm install
npm run dev

# Email script (prints to terminal if no Gmail secrets set)
python scripts/daily_digest.py
```

---

## Resume Profiles

The matcher scores jobs against 5 keyword profiles extracted from your resumes:

| Profile | Matches On |
|---------|-----------|
| AI/ML Engineer | machine learning, NLP, LLM, PyTorch, Claude, RAG, MCP, agents |
| SWE / Full-Stack | React, Next.js, Flask, Django, TypeScript, REST API, Supabase |
| Data Engineering | ETL, Spark, Airflow, dbt, geospatial, AWS ECS/Fargate, pipelines |
| BI & Operations | analytics, Power BI, SQL, dashboards, CRM, Slate, reporting |
| Data Science Research | statistics, modeling, optimization, Bayesian, forecasting, research |

`src/config/profiles.js` is the **source of truth** (used by the dashboard). `scripts/profiles.py` is a manual mirror used by the email script — edit both to keep them in sync.

## Config

Environment variables for the email script:

| Variable | Default | Description |
|----------|---------|-------------|
| `MAX_AGE_DAYS` | 1 | "New in the last 24h" window shown in the email headline (wider ~7d pool is counted as "on your dashboard") |
| `MIN_SCORE` | 15 | Minimum match score to count |
| `RECIPIENT_EMAIL` | chay@vt.edu | Where to send the digest |
| `DASHBOARD_URL` | job-radar-eta.vercel.app | Where the email's "Open Dashboard" button links |
