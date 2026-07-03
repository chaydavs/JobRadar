#!/usr/bin/env python3
"""
Company discovery — grow data/companies.json toward broad daily coverage.

Strategy:
  1. Harvest candidate companies from the YC public directory (api.ycombinator.com,
     ~240 pages, no key). Filter to active, tech, US-leaning, real team size.
  2. Derive candidate ATS slugs from each company's name + website domain.
  3. Probe Greenhouse + Ashby public APIs live — keep only boards that actually
     resolve AND currently list at least one technical role.
  4. Merge newly found boards into data/companies.json (skips defense + existing).

Daily fetching (api/jobs.js, scripts/daily_digest.py) then checks every board for
fresh early-career roles — so discovery only needs to find that a board EXISTS.

Usage:
  python scripts/discover_companies.py                 # harvest + merge
  python scripts/discover_companies.py --dry-run       # show finds, don't write
  python scripts/discover_companies.py --max-pages 40  # limit YC crawl
  python scripts/discover_companies.py --min-team-size 25

Stdlib only — no pip deps (matches the email pipeline convention).

--- Extending to VC portfolio boards ---
Many VC job boards (a16z, Sequoia, Bessemer) are Getro-powered. Their JSON API needs
a numeric network id embedded in the board's __NEXT_DATA__ blob. Add a harvester that
extracts that id and pages https://api.getro.com/... then feeds names into probe_all().
"""

import argparse
import json
import re
import sys
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
from urllib.request import urlopen, Request
from urllib.error import URLError

sys.path.insert(0, str(Path(__file__).resolve().parent))
from sources.base import (
    is_blocked_company, is_early_career, is_technical, is_foreign_location,
)

REGISTRY_PATH = Path(__file__).resolve().parents[1] / "data" / "companies.json"
UA = {"User-Agent": "job-radar/2.0 (company-discovery)"}

# YC tags/industries that map to Chay's target roles
TECH_TAGS = {
    "artificial intelligence", "machine learning", "developer tools", "data engineering",
    "saas", "b2b", "fintech", "infrastructure", "analytics", "data science", "nlp",
    "generative ai", "aiops", "devsecops", "security", "cybersecurity", "robotics",
    "cloud", "database", "api", "big data", "open source", "computer vision",
}


# ---------------------------------------------------------------- YC harvest ---
def yc_companies(max_pages: int):
    """Yield company dicts from the YC public directory."""
    page = 1
    while page <= max_pages:
        url = f"https://api.ycombinator.com/v0.1/companies?page={page}"
        try:
            with urlopen(Request(url, headers=UA), timeout=20) as r:
                data = json.loads(r.read().decode("utf-8"))
        except (URLError, json.JSONDecodeError, TimeoutError) as e:
            print(f"  [yc] page {page} failed: {e}")
            break
        companies = data.get("companies", [])
        if not companies:
            break
        yield from companies
        total = data.get("totalPages") or max_pages
        print(f"  [yc] page {page}/{min(max_pages, total)} — {len(companies)} companies")
        if not data.get("nextPage") or page >= total:
            break
        page += 1


def is_relevant_company(c: dict, min_team_size: int) -> bool:
    if c.get("status") != "Active":
        return False
    if (c.get("teamSize") or 0) < min_team_size:
        return False
    tags = {t.lower() for t in (c.get("tags") or [])} | {t.lower() for t in (c.get("industries") or [])}
    if not (tags & TECH_TAGS):
        return False
    # Prefer US-based; drop clearly foreign-only companies
    regions = " ".join(c.get("regions") or []) + " " + " ".join(c.get("locations") or [])
    if regions.strip() and "United States" not in regions and "America" not in regions and "Remote" not in regions:
        return False
    if is_blocked_company(c.get("name", "")):
        return False
    return True


# Generic slugs that collide with unrelated boards (false positives) — never probe these.
_GENERIC_SLUGS = {
    "general", "get", "go", "my", "the", "app", "labs", "team", "hq", "io", "ai",
    "data", "cloud", "tech", "group", "global", "first", "one", "open", "new", "now",
    "up", "co", "inc", "corp", "web", "api", "dev", "world", "core", "next", "base",
}


def slug_candidates(company: dict):
    """Derive high-precision ATS slug guesses (full normalized name + website domain only).

    We deliberately DON'T guess first-word / suffix-stripped variants — those match
    unrelated boards (e.g. "General Legal" for a company whose first word is "general").
    """
    name = (company.get("name") or "").lower()
    out = [re.sub(r"[^a-z0-9]", "", name)]           # "Scale AI" -> "scaleai"
    site = company.get("website") or ""
    m = re.search(r"https?://(?:www\.)?([a-z0-9\-]+)\.", site.lower())
    if m:
        out.append(m.group(1))                        # website domain -> "scale"
    seen, res = set(), []
    for s in out:
        if len(s) >= 4 and s not in seen and s not in _GENERIC_SLUGS:
            seen.add(s)
            res.append(s)
    return res


# ------------------------------------------------------------------- probing ---
def _probe(endpoint: str, slug: str):
    url = (f"https://boards-api.greenhouse.io/v1/boards/{slug}/jobs" if endpoint == "greenhouse"
           else f"https://api.ashbyhq.com/posting-api/job-board/{slug}")
    try:
        with urlopen(Request(url, headers=UA), timeout=10) as r:
            jobs = json.loads(r.read().decode("utf-8")).get("jobs", [])
    except Exception:
        return None
    if not jobs:
        return None
    def loc(j):
        return (j.get("location") or {}).get("name", "") if endpoint == "greenhouse" else (j.get("location") or "")
    tech = [j for j in jobs if is_technical(j.get("title", "")) and not is_foreign_location(loc(j))]
    ec = [j for j in tech if is_early_career(j.get("title", ""))]
    if not tech:                       # pure non-tech board — skip
        return None
    return {"ats": endpoint, "slug": slug, "jobs": len(jobs), "tech": len(tech), "early_career": len(ec)}


def probe_all(candidates, workers=16):
    """candidates: list of (name, slug). Returns best live board per company name."""
    tasks = []
    for name, slug in candidates:
        tasks.append((name, "greenhouse", slug))
        tasks.append((name, "ashby", slug))
    results = {}
    with ThreadPoolExecutor(max_workers=workers) as ex:
        for (name, _, _), res in zip(tasks, ex.map(lambda t: _probe(t[1], t[2]), tasks)):
            if res and (name not in results or res["tech"] > results[name]["tech"]):
                res = {**res, "name": name}
                results[name] = res
    return list(results.values())


# --------------------------------------------------------------------- merge ---
def load_registry():
    try:
        return json.loads(REGISTRY_PATH.read_text())
    except (OSError, json.JSONDecodeError):
        return []


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--max-pages", type=int, default=60, help="YC directory pages to crawl (~40 cos/page)")
    ap.add_argument("--min-team-size", type=int, default=15)
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    registry = load_registry()
    existing = {(c["ats"], c["slug"]) for c in registry}
    existing_names = {c["name"].lower() for c in registry}

    print(f"Registry: {len(registry)} companies. Harvesting YC (≤{args.max_pages} pages)...")
    candidates, seen_slugs = [], set()
    kept = 0
    for c in yc_companies(args.max_pages):
        if not is_relevant_company(c, args.min_team_size):
            continue
        if c["name"].lower() in existing_names:
            continue
        kept += 1
        for slug in slug_candidates(c):
            if slug not in seen_slugs:
                seen_slugs.add(slug)
                candidates.append((c["name"], slug))

    print(f"  {kept} relevant new YC companies → {len(candidates)} slug candidates to probe")
    print("Probing live boards (Greenhouse + Ashby)...")
    found = probe_all(candidates)
    # drop defense + already-present (name or ats/slug)
    fresh = [f for f in found
             if (f["ats"], f["slug"]) not in existing
             and not is_blocked_company(f["name"]) and not is_blocked_company(f["slug"])]
    fresh.sort(key=lambda f: -f["tech"])

    print(f"\n✅ {len(fresh)} new live boards discovered:")
    for f in fresh:
        print(f"  [{f['ats']:10}] {f['slug']:24} {f['name']:28} "
              f"{f['jobs']:4} jobs, {f['tech']:3} tech, {f['early_career']:3} early-career")

    if args.dry_run:
        print("\n(--dry-run: registry not modified)")
        return

    for f in fresh:
        registry.append({"name": f["name"], "ats": f["ats"], "slug": f["slug"]})
    registry.sort(key=lambda r: (r["ats"], r["name"].lower()))
    REGISTRY_PATH.write_text(json.dumps(registry, indent=2) + "\n")
    print(f"\nWrote {len(registry)} companies → {REGISTRY_PATH} (+{len(fresh)})")


if __name__ == "__main__":
    main()
