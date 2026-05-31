"""
SimplifyJobs Summer2026-Internships GitHub README parser.
Parses the SWE and DS/AI sections; skips PM, Quant, Hardware.
"""

import re
from typing import List
from urllib.request import urlopen

from .base import Job, is_foreign_location


REPO_URL = "https://raw.githubusercontent.com/SimplifyJobs/Summer2026-Internships/dev/README.md"

# (start marker, stop-before marker) — non-contiguous sections we want
SECTIONS = [
    ("## 💻 Software Engineering", "## 📱 Product Management"),
    ("## 🤖 Data Science, AI & Machine Learning", "## 📈 Quantitative Finance"),
]


def _parse_age_days(age_str: str) -> float:
    s = age_str.lower().strip()
    m = re.search(r"(\d+)", s)
    if not m:
        return 9999.0
    n = int(m.group(1))
    if "week" in s:
        return float(n * 7)
    if "month" in s:
        return float(n * 30)
    return float(n)


def _extract_section(md: str, start: str, stop: str) -> str:
    from_idx = md.find(start)
    if from_idx == -1:
        return ""
    to_idx = md.find(stop, from_idx + 1)
    return md[from_idx: to_idx if to_idx > 0 else len(md)]


def _parse_rows(content: str) -> List[Job]:
    jobs = []
    last_company = ""

    for row_match in re.finditer(r"<tr>(.*?)</tr>", content, re.DOTALL):
        row = row_match.group(1)
        if "🔒" in row:
            continue

        tds = re.findall(r"<td>(.*?)</td>", row, re.DOTALL)
        if len(tds) < 5:
            continue

        company_m = re.search(r"<strong><a[^>]*>([^<]+)</a></strong>", tds[0])
        if company_m:
            last_company = company_m.group(1).strip()
        elif "↳" not in tds[0]:
            continue

        role = re.sub(r"<[^>]+>", "", tds[1]).strip()
        location = re.sub(r"<[^>]+>", "", tds[2]).strip()
        age_str = re.sub(r"<[^>]+>", "", tds[4]).strip()

        if is_foreign_location(location):
            continue

        apply_m = re.search(r'href="(https://(?!simplify\.jobs|i\.imgur)[^"]+?)"', row)
        link = apply_m.group(1).split("?utm_source")[0] if apply_m else ""

        jobs.append(Job(
            company=last_company,
            role=role,
            location=location,
            link=link,
            age_days=_parse_age_days(age_str),
            source="simplify",
            no_sponsorship="🛂" in row,
            us_citizen_only="🇺🇸" in row,
        ))

    return jobs


def fetch(max_age_days: int = 1) -> List[Job]:
    try:
        with urlopen(REPO_URL) as resp:
            md = resp.read().decode("utf-8")
    except Exception as e:
        print(f"  [simplify] fetch failed: {e}")
        return []

    seen = set()
    all_jobs = []

    for start, stop in SECTIONS:
        content = _extract_section(md, start, stop)
        if not content:
            print(f"  [simplify] WARNING: section '{start[:30]}' not found")
            continue

        section_jobs = _parse_rows(content)
        fresh = [j for j in section_jobs if j.age_days <= max_age_days]

        for job in fresh:
            key = f"{job.company.lower()}::{job.role.lower()}"
            if key not in seen:
                seen.add(key)
                all_jobs.append(job)

        print(f"  [simplify] {start[:40]}... → {len(section_jobs)} total, {len(fresh)} fresh")

    return all_jobs
