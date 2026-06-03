"""Email HTML builder for the Job Radar digest."""

from typing import List


_SOURCE_LABELS = {
    "simplify": "SimplifyJobs",
    "greenhouse": "Greenhouse",
    "ashby": "Ashby",
    "jobspy": "Indeed",
    "muse": "The Muse",
}


def _format_age(age_days: float) -> str:
    if age_days < 1:
        hours = int(age_days * 24)
        return f"{hours}h ago" if hours > 0 else "just now"
    days = int(age_days)
    return f"{days}d ago"


def build_html(scored_jobs: List[dict], total_new: int, date_str: str) -> str:
    rows = ""
    for i, j in enumerate(scored_jobs):
        flag = " ⚠️" if j["flag"] else ""
        matches_str = ", ".join(j["matches"][:5])
        source_label = _SOURCE_LABELS.get(j["source"], j["source"])
        age_label = _format_age(j["age_days"])

        recruiter_link = j.get("recruiter_link", "")
        rank = i + 1

        rows += f"""
        <tr style="border-bottom:1px solid #2a2a4a;">
            <td style="padding:14px 8px;vertical-align:top;width:28px;">
                <div style="color:#8B5CF6;font-size:18px;font-weight:700;font-family:monospace;">{rank}</div>
            </td>
            <td style="padding:14px 8px;">
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
            <td style="padding:14px 8px;text-align:right;vertical-align:top;white-space:nowrap;">
                {"" if not j['link'] else f'<a href="{j["link"]}" style="background:#8B5CF6;color:#fff;padding:6px 14px;border-radius:6px;text-decoration:none;font-size:12px;font-weight:700;display:inline-block;margin-bottom:6px;">APPLY</a>'}
                <br>
                <a href="{recruiter_link}" style="color:#3B82F6;font-size:11px;text-decoration:none;">✉ Find recruiter</a>
            </td>
        </tr>
        """

    return f"""
    <div style="font-family:'Segoe UI',Arial,sans-serif;background:#0f0f1a;color:#e8e8f0;padding:24px;max-width:700px;margin:0 auto;">
        <h1 style="font-size:22px;margin-bottom:4px;">🎯 Job Radar — {date_str}</h1>
        <p style="color:#a0a0b8;font-size:13px;margin-bottom:20px;">Your {len(scored_jobs)} best matches today · curated from {total_new} fresh early-career roles</p>
        <table style="width:100%;border-collapse:collapse;">
            {rows}
        </table>
        <p style="color:#606078;font-size:11px;margin-top:20px;text-align:center;">
            Sources: Greenhouse · Ashby · Indeed · The Muse · startups + big tech · all dates verified
        </p>
    </div>
    """
