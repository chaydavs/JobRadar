"""Email HTML builder for the Job Radar digest.

The email is a daily *nudge to the dashboard*, not a curated list. It leads with
a count of roles newly posted in the last 24h (so nothing gets missed), teases
the freshest few, and points at the dashboard where everything lives. Because the
teaser only shows genuinely fresh (<= fresh-window) roles, it changes daily instead
of repeating the same high-scored picks over and over.
"""

from typing import List


_SOURCE_LABELS = {
    "simplify": "SimplifyJobs",
    "greenhouse": "Greenhouse",
    "ashby": "Ashby",
    "oracle": "Oracle",
    "jobspy": "Indeed",
    "muse": "The Muse",
}


def _plural(n: int, singular: str, plural: str = None) -> str:
    return f"{n} {singular}" if n == 1 else f"{n} {plural or singular + 's'}"


def _teaser_row(j: dict) -> str:
    source_label = _SOURCE_LABELS.get(j["source"], j["source"])
    return f"""
        <tr>
            <td style="padding:10px 8px;border-bottom:1px solid #1e1e34;">
                <div style="font-weight:700;color:#e8e8f0;font-size:14px;">{j['role']}</div>
                <div style="color:#a0a0b8;font-size:13px;">{j['company']} · {j['location']}</div>
                <div style="margin-top:3px;">
                    <span style="background:{j['profile_color']}22;color:{j['profile_color']};padding:2px 8px;border-radius:4px;font-size:11px;font-weight:600;">{j['profile']}</span>
                    <span style="color:#8B5CF6;font-size:11px;margin-left:6px;">{j['score']}pts</span>
                    <span style="color:#404060;font-size:10px;margin-left:6px;">{source_label}</span>
                </div>
            </td>
        </tr>"""


def build_html(fresh_jobs: List[dict], total_matches: int, date_str: str, dashboard_url: str) -> str:
    """Build the daily nudge email.

    fresh_jobs    — matching roles posted in the last fresh window (<=24h), score-sorted
    total_matches — all matching roles from the wider backfill window (~past week)
    dashboard_url — where the "Open Dashboard" button points
    """
    new_count = len(fresh_jobs)

    if new_count:
        headline = f"{_plural(new_count, 'new match', 'new matches')} in the last 24h"
        sub = f"{_plural(total_matches, 'matching role')} on your dashboard right now"
    else:
        headline = "No brand-new matches in the last 24h"
        sub = f"but {_plural(total_matches, 'matching role')} from the past week are on your dashboard"

    teaser = ""
    if fresh_jobs:
        teaser = f"""
        <p style="color:#606078;font-size:11px;text-transform:uppercase;letter-spacing:0.08em;margin:24px 0 6px;">Freshest today</p>
        <table style="width:100%;border-collapse:collapse;">{''.join(_teaser_row(j) for j in fresh_jobs[:5])}</table>"""

    return f"""
    <div style="font-family:'Segoe UI',Arial,sans-serif;background:#0f0f1a;color:#e8e8f0;padding:28px 24px;max-width:600px;margin:0 auto;">
        <h1 style="font-size:22px;margin:0 0 4px;">🎯 Job Radar — {date_str}</h1>
        <p style="color:#8B5CF6;font-size:16px;font-weight:700;margin:12px 0 2px;">{headline}</p>
        <p style="color:#a0a0b8;font-size:13px;margin:0 0 20px;">{sub}</p>

        <a href="{dashboard_url}" style="display:inline-block;background:#8B5CF6;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-size:15px;font-weight:700;">Open Dashboard →</a>
        {teaser}

        <p style="color:#606078;font-size:11px;margin-top:26px;line-height:1.5;">
            Filter by age, profile, and score on the dashboard — it's always current.<br>
            Sources: SimplifyJobs · Greenhouse · Ashby · Oracle · Indeed · The Muse
        </p>
    </div>
    """
