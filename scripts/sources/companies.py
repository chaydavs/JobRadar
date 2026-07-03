"""
Curated company lists for ATS job board scraping.

Single source of truth is data/companies.json at the repo root, shared with the
dashboard (api/jobs.js) so the two pipelines never drift. This module just loads
that registry and groups it by ATS for the fetchers.

Grow the registry with:  python scripts/discover_companies.py
Manually:  add {"name", "ats", "slug"} to data/companies.json.
  Greenhouse: boards.greenhouse.io/{slug}
  Ashby:      jobs.ashbyhq.com/{slug}
  Lever:      jobs.lever.co/{slug}
"""

import json
from pathlib import Path

_REGISTRY_PATH = Path(__file__).resolve().parents[2] / "data" / "companies.json"


def _registry():
    try:
        return json.loads(_REGISTRY_PATH.read_text())
    except (OSError, json.JSONDecodeError) as e:
        print(f"  [companies] failed to load {_REGISTRY_PATH}: {e}")
        return []


def _load(ats: str):
    """Return [(slug, name), ...] for a slug-based ATS from the shared registry."""
    return [(c["slug"], c["name"]) for c in _registry() if c.get("ats") == ats and c.get("slug")]


def _load_oracle():
    """Oracle uses per-tenant {host, site} instead of a slug."""
    return [
        {"name": c["name"], "host": c["host"], "site": c["site"]}
        for c in _registry()
        if c.get("ats") == "oracle" and c.get("host") and c.get("site")
    ]


GREENHOUSE = _load("greenhouse")
ASHBY = _load("ashby")
LEVER = _load("lever")
ORACLE = _load_oracle()
