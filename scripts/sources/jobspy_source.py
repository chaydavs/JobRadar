"""
jobspy multi-board scraper — Indeed + ZipRecruiter.
Requires: pip install python-jobspy
LinkedIn blocks GitHub Actions IPs — excluded intentionally.
Skipped gracefully if jobspy is not installed.
"""

import re
import math
from datetime import datetime, date, timedelta, timezone
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

# LinkedIn blocks GitHub Actions (Azure) IPs — use Indeed + ZipRecruiter
SITES = ["indeed", "zip_recruiter"]

# Always fetch a wide window from the API; filter by calendar date below.
# Indeed returns sparse results at <48h windows.
FETCH_HOURS = 72


def _is_recent(date_posted, max_age_days: int) -> bool:
    """Compare by calendar date — jobspy gives date-only, not datetime."""
    if date_posted is None:
        return False
    try:
        if isinstance(date_posted, float) and math.isnan(date_posted):
            return False
        # Normalize to a date object
        if isinstance(date_posted, datetime):
            posted_date = date_posted.date()
        elif isinstance(date_posted, date):
            posted_date = date_posted
        else:
            # pandas Timestamp or similar — try .date()
            posted_date = date_posted.date()
        cutoff = date.today() - timedelta(days=max_age_days)
        return posted_date >= cutoff
    except Exception:
        return False


def _age_from_date(date_posted) -> float:
    """Return float age in days for display purposes."""
    try:
        if isinstance(date_posted, datetime):
            posted_date = date_posted.date()
        elif isinstance(date_posted, date):
            posted_date = date_posted
        else:
            posted_date = date_posted.date()
        return float((date.today() - posted_date).days)
    except Exception:
        return 9999.0


def fetch(max_age_days: int = 1) -> List[Job]:
    try:
        from jobspy import scrape_jobs
    except ImportError:
        print("  [jobspy] not installed — skipping (pip install python-jobspy to enable)")
        return []

    seen = set()
    all_jobs = []

    for term in SEARCH_TERMS:
        try:
            df = scrape_jobs(
                site_name=SITES,
                search_term=term,
                location="United States",
                results_wanted=25,
                hours_old=FETCH_HOURS,
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
                # Indeed returns full-time roles too — filter to intern titles only
                role_lower = role.lower()
                if "intern" not in role_lower and "internship" not in role_lower:
                    continue
                if is_foreign_location(location):
                    continue
                if not _is_recent(date_posted, max_age_days):
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
                    age_days=_age_from_date(date_posted),
                    source="jobspy",
                    us_citizen_only=is_us_only(role, company),
                ))
                count += 1

            print(f"  [jobspy] '{term}' → {count} fresh unique results")

        except Exception as e:
            print(f"  [jobspy] '{term}' failed: {e}")

    return all_jobs
