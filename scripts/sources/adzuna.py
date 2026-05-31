"""
Adzuna API — free tier (250 req/day).
Register at https://developer.adzuna.com to get APP_ID and APP_KEY.
Set ADZUNA_APP_ID and ADZUNA_APP_KEY as GitHub secrets.
Skipped gracefully if env vars not set.
"""

import os
import re
import json
from datetime import datetime, timezone
from typing import List
from urllib.request import urlopen, Request
from urllib.parse import urlencode
from urllib.error import URLError

from .base import Job, is_foreign_location, is_us_only


BASE_URL = "https://api.adzuna.com/v1/api/jobs/us/search"

SEARCH_TERMS = [
    "machine learning intern",
    "data engineer intern",
    "software engineer intern",
    "data science intern",
    "AI intern",
]

RESULTS_PER_PAGE = 20


def _parse_age_days(created_str: str) -> float:
    try:
        dt = datetime.fromisoformat(created_str.replace("Z", "+00:00"))
        delta = datetime.now(timezone.utc) - dt
        return max(0.0, delta.total_seconds() / 86400)
    except Exception:
        return 9999.0


def fetch(max_age_days: int = 1) -> List[Job]:
    app_id = os.environ.get("ADZUNA_APP_ID")
    app_key = os.environ.get("ADZUNA_APP_KEY")

    if not app_id or not app_key:
        print("  [adzuna] ADZUNA_APP_ID/KEY not set — skipping")
        return []

    seen = set()
    all_jobs = []

    for term in SEARCH_TERMS:
        params = urlencode({
            "app_id": app_id,
            "app_key": app_key,
            "what": term,
            "where": "united states",
            "results_per_page": RESULTS_PER_PAGE,
            "days_old": max(1, max_age_days),
            "content-type": "application/json",
        })
        url = f"{BASE_URL}/1?{params}"
        req = Request(url, headers={"User-Agent": "job-radar/1.0"})

        try:
            with urlopen(req, timeout=10) as resp:
                data = json.loads(resp.read().decode("utf-8"))
        except (URLError, json.JSONDecodeError) as e:
            print(f"  [adzuna] '{term}' failed: {e}")
            continue

        count = 0
        for item in data.get("results", []):
            role = (item.get("title") or "").strip()
            company = ((item.get("company") or {}).get("display_name") or "").strip()
            location = ((item.get("location") or {}).get("display_name") or "").strip()
            link = (item.get("redirect_url") or "").strip()
            created = item.get("created", "")

            if not role or not company:
                continue
            if is_foreign_location(location):
                continue

            age = _parse_age_days(created)
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
                source="adzuna",
                us_citizen_only=is_us_only(role, company),
            ))
            count += 1

        print(f"  [adzuna] '{term}' → {count} fresh results")

    return all_jobs
