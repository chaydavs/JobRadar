import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from typing import Tuple, List
from profiles import RESUME_PROFILES, BONUS_KEYWORDS
from sources.base import Job


def score(job: Job) -> Tuple[str, int, List[str]]:
    """Return (best_profile_name, score, matched_keywords) for a job."""
    text = f"{job.role} {job.company} {job.location}".lower()

    best_profile = ""
    best_score = 0
    best_matches: List[str] = []

    for name, profile in RESUME_PROFILES.items():
        s = 0
        matches = []

        for kw in profile["keywords"]:
            if kw in text:
                s += 10
                matches.append(kw)

        for kw in BONUS_KEYWORDS:
            if kw in text:
                s += 3

        if "remote" in text:
            s += 8
        if "intern" in text:
            s += 5

        s = round(s * profile["weight"])

        if s > best_score:
            best_score = s
            best_profile = name
            best_matches = matches

    return best_profile, best_score, best_matches
