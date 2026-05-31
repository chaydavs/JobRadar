"""
The Muse API — free, no key required.
Tech-company focused internship listings.
Docs: https://www.themuse.com/developers/api/v2
"""

import re
import json
from datetime import datetime, timezone
from typing import List
from urllib.request import urlopen, Request
from urllib.parse import urlencode
from urllib.error import URLError

from .base import Job, is_foreign_location, is_us_only


BASE_URL = "https://www.themuse.com/api/public/jobs"

# Job categories on The Muse that match Chay's target roles
CATEGORIES = [
    "Software Engineer",
    "Data Science",
    "Data Engineering",
    "Machine Learning",
]

PAGES_PER_CATEGORY = 3  # 20 results per page


def _parse_age_days(pub_date_str: str) -> float:
    try:
        dt = datetime.fromisoformat(pub_date_str.rstrip("Z")).replace(tzinfo=timezone.utc)
        delta = datetime.now(timezone.utc) - dt
        return max(0.0, delta.total_seconds() / 86400)
    except Exception:
        return 9999.0


def _fetch_page(category: str, page: int) -> list:
    params = urlencode({
        "category": category,
        "level": "Internship",
        "page": page,
    })
    url = f"{BASE_URL}?{params}"
    req = Request(url, headers={"User-Agent": "job-radar/1.0"})
    try:
        with urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            return data.get("results", [])
    except (URLError, json.JSONDecodeError):
        return []


def fetch(max_age_days: int = 1) -> List[Job]:
    seen = set()
    all_jobs = []

    for category in CATEGORIES:
        cat_count = 0
        for page in range(PAGES_PER_CATEGORY):
            results = _fetch_page(category, page)
            if not results:
                break

            for item in results:
                role = (item.get("name") or "").strip()
                company = ((item.get("company") or {}).get("name") or "").strip()
                locations = item.get("locations") or []
                location = locations[0].get("name", "Unknown") if locations else "Unknown"
                pub_date = item.get("publication_date", "")
                link = (item.get("refs") or {}).get("landing_page", "")

                if not role or not company:
                    continue
                if is_foreign_location(location):
                    continue

                age = _parse_age_days(pub_date)
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
                    source="muse",
                    us_citizen_only=is_us_only(role, company),
                ))
                cat_count += 1

        print(f"  [muse] '{category}' → {cat_count} fresh results")

    return all_jobs
