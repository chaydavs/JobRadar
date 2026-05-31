"""Email HTML builder for the Job Radar digest."""

from typing import List


_SOURCE_LABELS = {
    "simplify": "SimplifyJobs",
    "jobspy": "LinkedIn/Indeed",
    "muse": "The Muse",
    "adzuna": "Adzuna",
}


def _format_age(age_days: float) -> str:
    if age_days < 1:
        hours = int(age_days * 24)
        return f"{hours}h ago" if hours > 0 else "just now"
    days = int(age_days)
    return f"{days}d ago"


def build_html(scored_jobs: List[dict], total_new: int, date_str: str) -> str:
    rows = ""
    for j in scored_jobs:
        flag = " ⚠️" if j["flag"] else ""
        matches_str = ", ".join(j["matches"][:5])
        source_label = _SOURCE_LABELS.get(j["source"], j["source"])
        age_label = _format_age(j["age_days"])

        rows += f"""
        <tr style="border-bottom:1px solid #2a2a4a;">
            <td style="padding:12px 8px;">
                <div style="font-weight:700;color:#e8e8f0;font-size:14px;">{j['role']}{flag}</div>
                <div style="color:#a0a0b8;font-size:13px;">{j['company']} · {j['location']}</div>
                <div style="margin-top:4px;display:flex;gap:6px;flex-wrap:wrap;align-items:center;">
                    <span style="background:{j['profile_color']}22;color:{j['profile_color']};padding:2px 8px;border-radius:4px;font-size:11px;font-weight:600;">{j['profile']}</span>
                    <span style="color:#8B5CF6;font-size:11px;">{j['score']}pts</span>
                    <span style="color:#606078;font-size:11px;">{age_label}</span>
                    <span style="color:#404060;font-size:10px;">{source_label}</span>
                </div>
                {f'<div style="color:#606078;font-size:10px;margin-top:3px;">{matches_str}</div>' if matches_str else ''}
            </td>
            <td style="padding:12px 8px;text-align:right;vertical-align:top;">
                {"" if not j['link'] else f'<a href="{j["link"]}" style="background:#8B5CF6;color:#fff;padding:6px 14px;border-radius:6px;text-decoration:none;font-size:12px;font-weight:700;">APPLY</a>'}
            </td>
        </tr>
        """

    return f"""
    <div style="font-family:'Segoe UI',Arial,sans-serif;background:#0f0f1a;color:#e8e8f0;padding:24px;max-width:700px;margin:0 auto;">
        <h1 style="font-size:22px;margin-bottom:4px;">🎯 Job Radar — {date_str}</h1>
        <p style="color:#a0a0b8;font-size:13px;margin-bottom:20px;">{total_new} new roles across all sources · Top {len(scored_jobs)} matches shown</p>
        <table style="width:100%;border-collapse:collapse;">
            {rows}
        </table>
        <p style="color:#606078;font-size:11px;margin-top:20px;text-align:center;">
            Sources: SimplifyJobs · LinkedIn/Indeed (jobspy) · The Muse · Adzuna
        </p>
    </div>
    """
