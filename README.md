# Job Radar 🎯

Daily internship match feed. Pulls from [SimplifyJobs/Summer2026-Internships](https://github.com/SimplifyJobs/Summer2026-Internships), scores against 3 resume profiles, and emails you the top matches every morning.

## Two Parts

### 1. Dashboard (Vercel)
A React app you open in your browser. Fetches live data from GitHub, scores and ranks jobs, shows apply links.

### 2. Daily Email (GitHub Actions)
A Python script that runs every morning at 8am ET, finds new jobs posted in the last 2 days, scores them, and emails you the top 20 matches.

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

The matcher scores jobs against 3 keyword profiles extracted from your resumes:

| Profile | Matches On |
|---------|-----------|
| AI/ML | machine learning, NLP, LLM, TensorFlow, Claude, inference, agents |
| BI/Ops | analytics, Power BI, SQL, dashboards, CRM, ETL, pipeline |
| Data Science | statistics, modeling, geospatial, optimization, research |

Edit `RESUME_PROFILES` in `src/App.jsx` (dashboard) or `scripts/daily_digest.py` (email) to adjust keywords.

## Config

Environment variables for the email script:

| Variable | Default | Description |
|----------|---------|-------------|
| `MAX_AGE_DAYS` | 2 | Only include jobs posted within this many days |
| `MIN_SCORE` | 15 | Minimum match score to include |
| `RECIPIENT_EMAIL` | chay@vt.edu | Where to send the digest |
