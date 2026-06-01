#!/usr/bin/env python3
"""
Job Radar — Daily email digest of new internship matches.
Runs via GitHub Actions cron at 8am ET.

Sources (all return real posting timestamps):
  - Greenhouse — public job board API (curated company list, no key)
  - Ashby      — public job board API (curated company list, no key)
  - jobspy     — scrapes Indeed + ZipRecruiter (requires: pip install python-jobspy)
  - The Muse   — free API, no key needed
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

from sources import greenhouse, ashby, muse
from sources.jobspy_source import fetch as fetch_jobspy
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


def main():
    max_age_days = int(os.environ.get("MAX_AGE_DAYS", "1"))
    recipient = os.environ.get("RECIPIENT_EMAIL", "chay@vt.edu")
    min_score = int(os.environ.get("MIN_SCORE", "15"))

    print(f"Job Radar — {datetime.now().strftime('%Y-%m-%d %H:%M')}")
    print(f"Config: max_age={max_age_days}d  min_score={min_score}  recipient={recipient}\n")

    # --- Fetch from all sources ---
    print("Fetching sources...")
    all_jobs = []

    print("[1/4] Greenhouse")
    all_jobs += greenhouse.fetch(max_age_days)

    print("[2/4] Ashby")
    all_jobs += ashby.fetch(max_age_days)

    print("[3/4] jobspy (Indeed + ZipRecruiter)")
    all_jobs += fetch_jobspy(max_age_days)

    print("[4/4] The Muse")
    all_jobs += muse.fetch(max_age_days)

    print(f"\nTotal new roles: {len(all_jobs)}")

    # --- Score + filter ---
    scored = []
    for job in all_jobs:
        # Skip jobs with sponsorship/citizenship blocks
        if job.no_sponsorship or job.us_citizen_only:
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

    # Curated: just the 10 best matches per day
    top = deduped[:10]

    print(f"Matches above {min_score}pts (after dedup): {len(deduped)}")
    print(f"Sending top {len(top)}\n")

    for j in top:
        print(f"  [{j['score']}pts] [{j['profile']}] [{j['source']}] {j['role']} @ {j['company']} — {j['location']}")

    if top:
        date_str = datetime.now().strftime("%b %d, %Y")
        subject = f"🎯 Job Radar — {len(top)} curated picks ({date_str})"
        html = build_html(top, len(deduped), date_str)
        send_email(html, recipient, subject)
    else:
        print("\nNo matches above threshold. No email sent.")


if __name__ == "__main__":
    main()
