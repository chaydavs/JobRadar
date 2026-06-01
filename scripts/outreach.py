"""
Recruiter outreach helpers.

ATS APIs do not expose recruiter contact info, so we generate:
  1. A LinkedIn people-search deep-link for recruiters/talent at the company
  2. A personalized cold-outreach draft message

Future: plug an email-finder API (Hunter.io / Apollo) into find_recruiter_email().
"""

from urllib.parse import quote


def linkedin_recruiter_search(company: str) -> str:
    """Deep-link to LinkedIn people search for recruiters at a company."""
    query = f'{company} (recruiter OR "talent acquisition" OR "university recruiting")'
    return f"https://www.linkedin.com/search/results/people/?keywords={quote(query)}&origin=GLOBAL_SEARCH_HEADER"


def draft_message(role: str, company: str, matches: list) -> str:
    """Short, personalized cold-outreach note Chay can paste into LinkedIn/email."""
    skills = ", ".join(matches[:3]) if matches else "ML and full-stack engineering"
    return (
        f"Hi! I'm Chay, a Computational Modeling & Data Analytics student at Virginia Tech. "
        f"I just applied to the {role} role at {company} and wanted to reach out directly. "
        f"My background is a strong match — {skills} — and I'd love to share why I think "
        f"I'd be a great fit. Would you have a few minutes to connect? Thanks!"
    )


def find_recruiter_email(company: str):
    """Stub for a future email-finder API integration. Returns None for now."""
    return None
