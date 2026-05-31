from dataclasses import dataclass, field


@dataclass
class Job:
    company: str
    role: str
    location: str
    link: str
    age_days: float       # normalized float — 1.0 = posted ~1 day ago
    source: str           # "simplify" | "jobspy" | "muse" | "adzuna"
    no_sponsorship: bool = False
    us_citizen_only: bool = False


_CITIZENSHIP_KEYWORDS = [
    "us citizen", "u.s. citizen", "citizenship required", "security clearance",
    "permanent resident only", "no cpt", "no sponsorship",
]

_SKIP_LOCATIONS = [
    "UK", "Canada", "France", "Germany", "Japan", "China",
    "India", "Brazil", "Netherlands", "Ireland", "Singapore", "Australia",
]


def is_us_only(role: str, company: str = "") -> bool:
    text = f"{role} {company}".lower()
    return any(kw in text for kw in _CITIZENSHIP_KEYWORDS)


def is_foreign_location(location: str) -> bool:
    return any(loc in location for loc in _SKIP_LOCATIONS)
