"""
jobspy multi-board scraper — LinkedIn, Indeed.
Requires: pip install jobspy
Skipped gracefully if jobspy is not installed.
"""

import re
import math
from datetime import datetime, date, timezone
from typing import List

from .base import Job, is_foreign_location, is_us_only


# Search terms tuned to Chay's target profiles
SEARCH_TERMS = [
    "machine learning engineer intern",
    "data engineer intern",
    "software engineer intern",
    "data scientist intern",
    "AI research intern",
    "NLP engineer intern",
    "full stack engineer intern",
]

SITES = ["linkedin", "indeed"]


def _age_days(date_posted) -> float:
    if date_posted is None or (isinstance(date_posted, float) and math.isnan(date_posted)):
        return 9999.0
    try:
        # jobspy returns datetime.date (not datetime) — convert to datetime first
        if isinstance(date_posted, date) and not isinstance(date_posted, datetime):
            date_posted = datetime(date_posted.year, date_posted.month, date_posted.day, tzinfo=timezone.utc)
        elif hasattr(date_posted, "tzinfo") and date_posted.tzinfo is None:
            date_posted = date_posted.replace(tzinfo=timezone.utc)
        now = datetime.now(timezone.utc)
        delta = now - date_posted
        return max(0.0, delta.total_seconds() / 86400)
    except Exception:
        return 9999.0


def fetch(max_age_days: int = 1) -> List[Job]:
    try:
        from jobspy import scrape_jobs
    except ImportError:
        print("  [jobspy] not installed — skipping (pip install jobspy to enable)")
        return []

    seen = set()
    all_jobs = []
    hours_old = int(max_age_days * 25)  # slight buffer over 24h

    for term in SEARCH_TERMS:
        try:
            df = scrape_jobs(
                site_name=SITES,
                search_term=term,
                location="United States",
                results_wanted=20,
                hours_old=hours_old,
                country_indeed="USA",
                linkedin_fetch_description=False,
                verbose=0,
            )

            count = 0
            for _, row in df.iterrows():
                company = str(row.get("company") or "").strip()
                role = str(row.get("title") or "").strip()
                location = str(row.get("location") or "").strip()
                link = str(row.get("job_url") or row.get("job_url_direct") or "").strip()
                date_posted = row.get("date_posted")

                if not company or not role:
                    continue
                # LinkedIn returns full-time roles too — only keep intern/internship titles
                role_lower = role.lower()
                if "intern" not in role_lower and "internship" not in role_lower:
                    continue
                if is_foreign_location(location):
                    continue

                age = _age_days(date_posted)
                if age > max_age_days:
                    continue

                c_key = re.sub(r'\W+', '', company.lower())
                r_key = re.sub(r'\W+', '', role.lower())[:50]
                key = f"{c_key}::{r_key}"
                if key in seen:
                    continue
                seen.add(key)

                all_jobs.append(Job(
                    company=company,
                    role=role,
                    location=location,
                    link=link,
                    age_days=age,
                    source="jobspy",
                    us_citizen_only=is_us_only(role, company),
                ))
                count += 1

            print(f"  [jobspy] '{term}' → {count} fresh unique results")

        except Exception as e:
            print(f"  [jobspy] '{term}' failed: {e}")

    return all_jobs
