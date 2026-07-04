#!/usr/bin/env python3
"""
Job Radar — Daily email digest of new internship matches.
Runs via GitHub Actions cron at 8am ET.

Sources (all return real posting timestamps):
  - SimplifyJobs — Summer2026-Internships GitHub README (high volume)
  - Greenhouse   — public job board API (curated company list, no key)
  - Ashby        — public job board API (curated company list, no key)
  - Oracle       — Recruiting Cloud CE API for enterprise/finance tenants (no key)
  - jobspy       — scrapes Indeed (requires: pip install python-jobspy)
  - The Muse     — free API, no key needed
"""

import os
import re
import sys
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime

# Ensure scripts/ is on the path for sibling imports
sys.path.insert(0, os.path.dirname(__file__))

from sources import greenhouse, ashby, muse, simplify, oracle
from sources.jobspy_source import fetch as fetch_jobspy
from sources.base import is_blocked_company, requires_blocked_auth
from scorer import score
from digest import build_html
from profiles import RESUME_PROFILES
from outreach import linkedin_recruiter_search, draft_message


def send_email(html_content: str, recipient: str, subject: str) -> bool:
    sender = os.environ.get("GMAIL_ADDRESS")
    password = os.environ.get("GMAIL_APP_PASSWORD")

    if not sender or not password:
        print("No Gmail credentials — printing to stdout:\n")
        print(html_content)
        return False

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = sender
    msg["To"] = recipient
    msg.attach(MIMEText(html_content, "html"))

    try:
        with smtplib.SMTP_SSL("smtp.gmail.com", 465) as server:
            server.login(sender, password)
            server.sendmail(sender, recipient, msg.as_string())
        print(f"Email sent to {recipient}")
        return True
    except Exception as e:
        print(f"Email failed: {e}")
        return False


FRESH_DAYS = 1          # "new in the last 24h" window shown in the email headline
BACKFILL_DAYS = 7       # wider pool counted as "on your dashboard right now"
DEFAULT_DASHBOARD_URL = "https://job-radar-eta.vercel.app"


def main():
    # "New" window (default 1d); we still scan a wider pool to report the dashboard total.
    fresh_days = int(os.environ.get("MAX_AGE_DAYS", str(FRESH_DAYS)))
    recipient = os.environ.get("RECIPIENT_EMAIL", "chay@vt.edu")
    min_score = int(os.environ.get("MIN_SCORE", "15"))
    dashboard_url = os.environ.get("DASHBOARD_URL", DEFAULT_DASHBOARD_URL)

    print(f"Job Radar — {datetime.now().strftime('%Y-%m-%d %H:%M')}")
    print(f"Config: new≤{fresh_days}d  pool≤{BACKFILL_DAYS}d  min_score={min_score}  recipient={recipient}")
    print(f"Dashboard: {dashboard_url}\n")

    # --- Fetch a wide pool (up to BACKFILL_DAYS); we prefer fresh but backfill if sparse ---
    print("Fetching sources...")
    all_jobs = []

    print("[1/6] SimplifyJobs")
    all_jobs += simplify.fetch(BACKFILL_DAYS)

    print("[2/6] Greenhouse")
    all_jobs += greenhouse.fetch(BACKFILL_DAYS)

    print("[3/6] Ashby")
    all_jobs += ashby.fetch(BACKFILL_DAYS)

    print("[4/6] Oracle")
    all_jobs += oracle.fetch(BACKFILL_DAYS)

    print("[5/6] jobspy (Indeed)")
    all_jobs += fetch_jobspy(BACKFILL_DAYS)

    print("[6/6] The Muse")
    all_jobs += muse.fetch(BACKFILL_DAYS)

    print(f"\nTotal roles (≤{BACKFILL_DAYS}d): {len(all_jobs)}")

    # --- Score + filter ---
    scored = []
    for job in all_jobs:
        # Skip sponsorship/citizenship blocks and defense/govt contractors
        if job.no_sponsorship or job.us_citizen_only:
            continue
        if is_blocked_company(job.company) or requires_blocked_auth(job.role):
            continue

        profile_name, job_score, matches = score(job)
        if job_score < min_score:
            continue

        profile = RESUME_PROFILES[profile_name]
        scored.append({
            "role": job.role,
            "company": job.company,
            "location": job.location,
            "link": job.link,
            "age_days": job.age_days,
            "source": job.source,
            "profile": profile_name,
            "profile_color": profile["color"],
            "score": job_score,
            "matches": matches,
            "flag": job.us_citizen_only,
            "recruiter_link": linkedin_recruiter_search(job.company),
            "draft": draft_message(job.role, job.company, matches),
        })

    scored.sort(key=lambda x: x["score"], reverse=True)

    # Deduplicate across sources (same company+role from multiple boards)
    seen_keys = set()
    deduped = []
    for j in scored:
        c_key = re.sub(r'\W+', '', j['company'].lower())
        r_key = re.sub(r'\W+', '', j['role'].lower())[:50]
        key = f"{c_key}::{r_key}"
        if key not in seen_keys:
            seen_keys.add(key)
            deduped.append(j)

    # The email is a nudge to the dashboard, not a curated list. It headlines the
    # genuinely-new (<= fresh_days) roles so nothing is missed, and lets the dashboard
    # hold the full pool. Because only fresh roles are teased, the email changes daily
    # instead of re-sending the same top-scored picks (the old repeat problem).
    fresh = [j for j in deduped if j["age_days"] <= fresh_days]

    print(f"Matches above {min_score}pts: {len(deduped)} ({len(fresh)} new ≤{fresh_days}d)")
    for j in fresh[:5]:
        print(f"  [NEW] [{j['score']}pts] [{j['profile']}] [{j['source']}] {j['role']} @ {j['company']}")

    if not deduped:
        print("\nNo matching roles in the last week. No email sent.")
        return

    date_str = datetime.now().strftime("%b %d, %Y")
    if fresh:
        plural = "es" if len(fresh) != 1 else ""
        subject = f"🎯 Job Radar — {len(fresh)} new match{plural} today ({date_str})"
    else:
        subject = f"🎯 Job Radar — your daily check-in ({date_str})"
    html = build_html(fresh, len(deduped), date_str, dashboard_url)
    send_email(html, recipient, subject)


if __name__ == "__main__":
    main()
