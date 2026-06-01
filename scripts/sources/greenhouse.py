"""
Greenhouse public job board API — real posting timestamps, no key required.
https://boards-api.greenhouse.io/v1/boards/{slug}/jobs
"""

import json
from datetime import datetime, timezone
from typing import List
from urllib.request import urlopen, Request
from urllib.error import URLError

from .base import Job, is_foreign_location, is_us_only, is_early_career, is_technical
from .companies import GREENHOUSE


def _age_days(updated_at: str) -> float:
    try:
        dt = datetime.fromisoformat(updated_at.replace("Z", "+00:00"))
        return max(0.0, (datetime.now(timezone.utc) - dt).total_seconds() / 86400)
    except Exception:
        return 9999.0


def _fetch_board(slug: str, name: str, max_age_days: int) -> List[Job]:
    url = f"https://boards-api.greenhouse.io/v1/boards/{slug}/jobs"
    req = Request(url, headers={"User-Agent": "job-radar/2.0"})
    try:
        with urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read().decode("utf-8"))
    except (URLError, json.JSONDecodeError, TimeoutError):
        return []

    jobs = []
    for j in data.get("jobs", []):
        title = (j.get("title") or "").strip()
        location = (j.get("location") or {}).get("name", "") or ""
        if not is_early_career(title) or not is_technical(title) or is_foreign_location(location):
            continue
        age = _age_days(j.get("updated_at", ""))
        if age > max_age_days:
            continue
        jobs.append(Job(
            company=name,
            role=title,
            location=location or "Unknown",
            link=j.get("absolute_url", ""),
            age_days=age,
            source="greenhouse",
            us_citizen_only=is_us_only(title, name),
        ))
    return jobs


def fetch(max_age_days: int = 1) -> List[Job]:
    all_jobs = []
    for slug, name in GREENHOUSE:
        all_jobs += _fetch_board(slug, name, max_age_days)
    print(f"  [greenhouse] {len(all_jobs)} fresh early-career roles across {len(GREENHOUSE)} companies")
    return all_jobs
