"""
Oracle Recruiting Cloud (Candidate Experience) public API — real posting dates, no key.

Large enterprises + finance firms (Goldman Sachs, Cantor Fitzgerald, ...) host careers on
per-tenant Oracle domains that CAN'T be slug-guessed like Greenhouse. Each needs a
{host, site} pair, stored in data/companies.json as {"ats":"oracle","host":...,"site":...}.

Finding host + site for a new company:
  1. Open the company's Oracle careers page (URL contains .oraclecloud.com/hcmUI/CandidateExperience).
  2. host = the domain (e.g. hdpc.fa.us2.oraclecloud.com).
  3. site = the code in /sites/{code}/ (e.g. CampusHiring, CX_1003).
"""

import json
from datetime import date, datetime
from typing import List
from urllib.request import urlopen, Request
from urllib.error import URLError

from .base import Job, is_foreign_location, is_early_career, is_technical, requires_blocked_auth
from .companies import ORACLE

_LIMIT = 200  # newest N requisitions per site (sorted POSTING_DATES_DESC)


def _age_days(posted: str) -> float:
    try:
        d = datetime.strptime(posted[:10], "%Y-%m-%d").date()
        return max(0.0, float((date.today() - d).days))
    except Exception:
        return 9999.0


def _fetch_site(entry: dict, max_age_days: int) -> List[Job]:
    host, site, name = entry["host"], entry["site"], entry["name"]
    url = (
        f"https://{host}/hcmRestApi/resources/latest/recruitingCEJobRequisitions"
        f"?onlyData=true&expand=requisitionList.secondaryLocations"
        f"&finder=findReqs;siteNumber={site},limit={_LIMIT},sortBy=POSTING_DATES_DESC"
    )
    req = Request(url, headers={"User-Agent": "job-radar/2.0", "Accept": "application/json"})
    try:
        with urlopen(req, timeout=15) as resp:
            data = json.loads(resp.read().decode("utf-8", "replace"))
    except (URLError, json.JSONDecodeError, TimeoutError):
        return []

    items = data.get("items", [])
    reqs = items[0].get("requisitionList", []) if items else []

    jobs = []
    for j in reqs:
        title = (j.get("Title") or "").strip()
        location = (j.get("PrimaryLocation") or "").strip()
        # These are multinationals — require an explicit US location, not just "not foreign"
        if "United States" not in location:
            continue
        if not is_early_career(title) or not is_technical(title) or is_foreign_location(location):
            continue
        if _age_days(j.get("PostedDate", "")) > max_age_days:
            continue
        if requires_blocked_auth(title, j.get("ShortDescriptionStr", "")):
            continue
        rid = j.get("Id", "")
        jobs.append(Job(
            company=name,
            role=title,
            location=location,
            link=f"https://{host}/hcmUI/CandidateExperience/en/sites/{site}/job/{rid}",
            age_days=_age_days(j.get("PostedDate", "")),
            source="oracle",
        ))
    return jobs


def fetch(max_age_days: int = 1) -> List[Job]:
    all_jobs = []
    for entry in ORACLE:
        all_jobs += _fetch_site(entry, max_age_days)
    print(f"  [oracle] {len(all_jobs)} fresh early-career roles across {len(ORACLE)} sites")
    return all_jobs
