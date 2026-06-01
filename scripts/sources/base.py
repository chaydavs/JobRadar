import re
from dataclasses import dataclass, field


@dataclass
class Job:
    company: str
    role: str
    location: str
    link: str
    age_days: float       # normalized float — 1.0 = posted ~1 day ago
    source: str           # "greenhouse" | "ashby" | "jobspy" | "muse"
    no_sponsorship: bool = False
    us_citizen_only: bool = False


_CITIZENSHIP_KEYWORDS = [
    "us citizen", "u.s. citizen", "citizenship required", "security clearance",
    "permanent resident only", "no cpt", "no sponsorship",
]

_SKIP_LOCATIONS = [
    # Countries / regions
    "UK", "United Kingdom", "Canada", "France", "Germany", "Japan", "China",
    "India", "Brazil", "Netherlands", "Ireland", "Singapore", "Australia",
    "Spain", "Italy", "Poland", "Sweden", "Switzerland", "Israel", "Mexico",
    "EMEA", "APAC", "LATAM", "Remote - E", "Remote, E",
    # Major foreign tech-hub cities (ATS often lists city only)
    "London", "Toronto", "Vancouver", "Sydney", "Melbourne", "Bangalore",
    "Bengaluru", "Hyderabad", "Pune", "Dublin", "Berlin", "Munich", "Paris",
    "Amsterdam", "Tel Aviv", "Tokyo", "Singapore", "Sao Paulo", "Stockholm",
    "Zurich", "Barcelona", "Madrid", "Warsaw", "Mexico City",
]


def is_us_only(role: str, company: str = "") -> bool:
    text = f"{role} {company}".lower()
    return any(kw in text for kw in _CITIZENSHIP_KEYWORDS)


def is_foreign_location(location: str) -> bool:
    return any(loc in location for loc in _SKIP_LOCATIONS)


# --- Seniority filter ---
# Chay is a college student: intern + new-grad/entry roles only.
# Exclude senior/staff/principal/lead/manager/etc even if skills match.
_SENIOR_RE = re.compile(
    r"\b(senior|sr|staff|principal|lead|manager|mgr|director|head|"
    r"vp|architect|distinguished|expert|ii|iii|iv|v)\b",
    re.IGNORECASE,
)
_EARLY_CAREER_RE = re.compile(
    r"\b(intern|internship|new\s+grad|new\s+graduate|university\s+grad|"
    r"campus|early\s+career|early[- ]in[- ]career|entry\s+level|entry-level|"
    r"associate|junior|jr|co-?op|apprentice|rotational|graduate\s+program)\b",
    re.IGNORECASE,
)


def is_early_career(title: str) -> bool:
    """True for intern / new-grad / entry-level roles a college student can apply to."""
    if _SENIOR_RE.search(title):
        return False
    return bool(_EARLY_CAREER_RE.search(title))


# Non-technical functions Chay isn't targeting — filtered out even if "AI" is in
# the title (e.g. "Marketing: AI Discoverability Intern" or "Developer GTM Intern").
_NON_TECH_RE = re.compile(
    r"\b(marketing|sales|go-to-market|gtm|people\s+(team|operations|ops)|"
    r"human\s+resources|recruit(ing|er)|talent\s+acquisition|trade\s+compliance|"
    r"legal|paralegal|accounting|graphic\s+design|social\s+media|"
    r"public\s+relations|partnerships|business\s+development|"
    r"customer\s+(success|support|experience)|account\s+(executive|manager)|"
    r"communications|public\s+policy|grc|procurement)\b",
    re.IGNORECASE,
)


def is_technical(title: str) -> bool:
    """False for clearly non-engineering / non-data functions."""
    return not bool(_NON_TECH_RE.search(title))


def is_intern(title: str) -> bool:
    return bool(re.search(r"\bintern(ship)?\b", title, re.IGNORECASE))
