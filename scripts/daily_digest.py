#!/usr/bin/env python3
"""
Job Radar — Daily email digest of new internship matches.
Runs via GitHub Actions cron. Pulls Simplify repo, scores against resume profiles,
emails top matches to Chay.
"""

import re
import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from urllib.request import urlopen
from datetime import datetime

REPO_URL = "https://raw.githubusercontent.com/SimplifyJobs/Summer2026-Internships/dev/README.md"

RESUME_PROFILES = {
    "AI/ML": {
        "color": "#8B5CF6",
        "keywords": [
            "machine learning", "ml", "ai", "artificial intelligence", "deep learning",
            "neural network", "nlp", "natural language", "tensorflow", "pytorch",
            "scikit-learn", "computer vision", "llm", "large language model",
            "reinforcement learning", "generative ai", "agentic", "claude",
            "openai", "model", "inference", "training", "fine-tune", "prompt",
            "python", "classification", "transformer", "embedding",
            "spacy", "research", "perception", "robotics", "autonomous", "agent",
        ]
    },
    "BI/Ops": {
        "color": "#F59E0B",
        "keywords": [
            "data analyst", "analytics", "business intelligence", "power bi",
            "tableau", "sql", "dashboard", "reporting", "crm", "salesforce",
            "operations", "etl", "pipeline", "data engineer", "database",
            "postgresql", "bi", "visualization", "metrics", "automation",
            "api", "webhook", "supabase", "data governance", "workflow",
        ]
    },
    "Data Science": {
        "color": "#10B981",
        "keywords": [
            "data science", "data scientist", "research", "statistical",
            "statistics", "optimization", "regression", "scipy", "numpy", "pandas",
            "geospatial", "satellite", "computational", "modeling",
            "simulation", "numerical", "analysis", "quantitative",
            "inference", "prediction", "forecasting", "time series",
        ]
    }
}

CITIZENSHIP_FLAGS = [
    "us citizen", "u.s. citizen", "citizenship required", "clearance",
    "permanent resident only", "no cpt", "no sponsorship"
]

SKIP_LOCATIONS = [
    "UK", "Canada", "France", "Germany", "Japan", "China",
    "India", "Brazil", "Netherlands", "Ireland", "Singapore", "Australia"
]


def fetch_readme():
    with urlopen(REPO_URL) as resp:
        return resp.read().decode("utf-8")


def parse_data_science_section(md):
    ds_start = md.find("## 🤖 Data Science, AI & Machine Learning")
    if ds_start == -1:
        return []

    ends = []
    for marker in ["## 📈", "## 🔧", "## 🛠"]:
        idx = md.find(marker, ds_start + 1)
        if idx > 0:
            ends.append(idx)
    ds_end = min(ends) if ends else len(md)
    ds_content = md[ds_start:ds_end]

    jobs = []
    last_company = ""

    for row_match in re.finditer(r"<tr>(.*?)</tr>", ds_content, re.DOTALL):
        row = row_match.group(1)
        if "🔒" in row:
            continue

        tds = re.findall(r"<td>(.*?)</td>", row, re.DOTALL)
        if len(tds) < 5:
            continue

        company_m = re.search(r'<strong><a[^>]*>([^<]+)</a></strong>', tds[0])
        if company_m:
            last_company = company_m.group(1).strip()
        elif "↳" not in tds[0]:
            continue

        role = re.sub(r"<[^>]+>", "", tds[1]).strip()
        location = re.sub(r"<[^>]+>", "", tds[2]).strip()
        age = re.sub(r"<[^>]+>", "", tds[4]).strip()

        if any(loc in location for loc in SKIP_LOCATIONS):
            continue

        apply_m = re.search(r'href="(https://(?!simplify\.jobs|i\.imgur)[^"]+?)"', row)
        link = apply_m.group(1).split("?utm_source")[0] if apply_m else ""

        jobs.append({
            "company": last_company,
            "role": role,
            "location": location,
            "age": age,
            "link": link,
        })

    return jobs


def score_job(job, profile_name, keywords):
    text = f"{job['role']} {job['company']} {job['location']}".lower()
    score = 0
    matches = []
    for kw in keywords:
        if kw in text:
            score += 10
            matches.append(kw)
    if "remote" in text:
        score += 8
    if "intern" in text:
        score += 5
    return score, matches


def is_new(age_str, max_days=2):
    m = re.match(r"(\d+)", age_str)
    if m:
        return int(m.group(1)) <= max_days
    return False


def has_citizenship_flag(job):
    text = f"{job['role']} {job['company']}".lower()
    return any(flag in text for flag in CITIZENSHIP_FLAGS)


def build_email_html(top_jobs, total_new, date_str):
    rows = ""
    for j in top_jobs:
        flag = " ⚠️" if j["flag"] else ""
        rows += f"""
        <tr style="border-bottom:1px solid #2a2a4a;">
            <td style="padding:12px 8px;">
                <div style="font-weight:700;color:#e8e8f0;font-size:14px;">{j['role']}{flag}</div>
                <div style="color:#a0a0b8;font-size:13px;">{j['company']} · {j['location']}</div>
                <div style="margin-top:4px;">
                    <span style="background:{j['profile_color']}22;color:{j['profile_color']};padding:2px 8px;border-radius:4px;font-size:11px;font-weight:600;">{j['profile']}</span>
                    <span style="color:#8B5CF6;font-size:11px;margin-left:8px;">{j['score']}pts</span>
                    <span style="color:#606078;font-size:11px;margin-left:8px;">{j['age']}</span>
                </div>
            </td>
            <td style="padding:12px 8px;text-align:right;">
                <a href="{j['link']}" style="background:#8B5CF6;color:#fff;padding:6px 14px;border-radius:6px;text-decoration:none;font-size:12px;font-weight:700;">APPLY</a>
            </td>
        </tr>
        """

    return f"""
    <div style="font-family:'Segoe UI',Arial,sans-serif;background:#0f0f1a;color:#e8e8f0;padding:24px;max-width:700px;margin:0 auto;">
        <h1 style="font-size:22px;margin-bottom:4px;">🎯 Job Radar — {date_str}</h1>
        <p style="color:#a0a0b8;font-size:13px;margin-bottom:20px;">{total_new} new roles today · Top {len(top_jobs)} matches shown</p>
        <table style="width:100%;border-collapse:collapse;">
            {rows}
        </table>
        <p style="color:#606078;font-size:11px;margin-top:20px;text-align:center;">
            Pulled from SimplifyJobs/Summer2026-Internships · Matched against your 3 resume profiles
        </p>
    </div>
    """


def send_email(html_content, recipient, subject):
    sender = os.environ.get("GMAIL_ADDRESS")
    password = os.environ.get("GMAIL_APP_PASSWORD")

    if not sender or not password:
        print("ERROR: GMAIL_ADDRESS or GMAIL_APP_PASSWORD not set")
        print("Printing results to stdout instead:\n")
        print(html_content)
        return False

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = sender
    msg["To"] = recipient
    msg.attach(MIMEText(html_content, "html"))

    try:
        with smtplib.SMTP_SSL("smtp.gmail.com", 465) as server:
            server.login(sender, password)
            server.sendmail(sender, recipient, msg.as_string())
        print(f"Email sent to {recipient}")
        return True
    except Exception as e:
        print(f"Email failed: {e}")
        return False


def main():
    max_age_days = int(os.environ.get("MAX_AGE_DAYS", "2"))
    recipient = os.environ.get("RECIPIENT_EMAIL", "chay@vt.edu")
    min_score = int(os.environ.get("MIN_SCORE", "15"))

    print(f"Job Radar — {datetime.now().strftime('%Y-%m-%d %H:%M')}")
    print(f"Config: max_age={max_age_days}d, min_score={min_score}, recipient={recipient}")
    print("Fetching repo...")

    md = fetch_readme()
    jobs = parse_data_science_section(md)
    print(f"Parsed {len(jobs)} open data science/AI/ML roles")

    new_jobs = [j for j in jobs if is_new(j["age"], max_age_days)]
    print(f"Found {len(new_jobs)} roles posted in last {max_age_days} days")

    scored = []
    for job in new_jobs:
        best_profile = ""
        best_score = 0
        best_matches = []
        best_color = "#888"

        for name, profile in RESUME_PROFILES.items():
            score, matches = score_job(job, name, profile["keywords"])
            if score > best_score:
                best_score = score
                best_profile = name
                best_matches = matches
                best_color = profile["color"]

        if best_score >= min_score:
            scored.append({
                **job,
                "profile": best_profile,
                "profile_color": best_color,
                "score": best_score,
                "matches": best_matches,
                "flag": has_citizenship_flag(job),
            })

    scored.sort(key=lambda x: x["score"], reverse=True)
    top = scored[:20]

    print(f"Top matches (score >= {min_score}): {len(scored)}")
    print(f"Sending top {len(top)} in email\n")

    for j in top:
        flag = " ⚠️" if j["flag"] else ""
        print(f"  [{j['score']}pts] [{j['profile']}] {j['role']} @ {j['company']} — {j['location']}{flag}")
        print(f"    → {j['link']}")

    if top:
        date_str = datetime.now().strftime("%b %d, %Y")
        subject = f"🎯 Job Radar — {len(scored)} matches ({date_str})"
        html = build_email_html(top, len(new_jobs), date_str)
        send_email(html, recipient, subject)
    else:
        print("\nNo matches above threshold. No email sent.")


if __name__ == "__main__":
    main()
