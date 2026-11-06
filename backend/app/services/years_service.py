"""
app/services/years_service.py - Standard year calculations, industry taxonomy, and canonical skills.
Shared logic with identical rules between server and web.
"""
from datetime import datetime, timezone
from typing import List, Optional, Tuple, Dict

INDUSTRIES: List[str] = [
    "Information Technology",
    "Software & SaaS",
    "Finance & Banking",
    "Healthcare",
    "Education",
    "Manufacturing",
    "Retail & E-commerce",
    "Telecommunications",
    "Marketing & Advertising",
    "Consulting",
    "Government & Public Sector",
    "Engineering & Construction",
    "Hospitality & Tourism",
    "Logistics & Transport",
    "Media & Entertainment",
    "Non-profit",
    "Other",
]

ALIASES: Dict[str, str] = {
    "js": "JavaScript",
    "javascript": "JavaScript",
    "ts": "TypeScript",
    "typescript": "TypeScript",
    "node": "Node.js",
    "nodejs": "Node.js",
    "node js": "Node.js",
    "reactjs": "React",
    "react.js": "React",
    "react": "React",
    "postgres": "PostgreSQL",
    "postgresql": "PostgreSQL",
    "k8s": "Kubernetes",
    "kubernetes": "Kubernetes",
    "ml": "Machine Learning",
    "ai": "Artificial Intelligence",
    "c sharp": "C#",
    "c#": "C#",
    "golang": "Go",
    "go": "Go",
    "py": "Python",
    "python": "Python",
    "aws": "AWS",
    "gcp": "Google Cloud Platform",
    "azure": "Microsoft Azure",
    "docker": "Docker",
    "tailwind": "Tailwind CSS",
    "tailwindcss": "Tailwind CSS",
    "nextjs": "Next.js",
    "next.js": "Next.js",
    "vue": "Vue.js",
    "vuejs": "Vue.js",
    "vue.js": "Vue.js",
    "fastapi": "FastAPI",
    "django": "Django",
    "flask": "Flask",
    "graphql": "GraphQL",
    "mongodb": "MongoDB",
    "mysql": "MySQL",
    "redis": "Redis",
    "git": "Git",
}

def canonical_skill(raw: str) -> str:
    cleaned = " ".join(raw.strip().split())
    if not cleaned:
        return ""
    return ALIASES.get(cleaned.lower(), cleaned)

def current_year() -> int:
    return datetime.now(timezone.utc).year

def years_count(
    start_year: int,
    end_year: Optional[int],
    is_current: bool,
    today_year: Optional[int] = None
) -> int:
    """
    Rule: 2023 to 2025 is 2 years. 2023 to 2026 is 3 years.
    If currently working here, uses current year.
    Never negative.
    """
    if today_year is None:
        today_year = current_year()
    end_val = today_year if is_current else (end_year if end_year is not None else start_year)
    return max(0, end_val - start_year)

def total_years(periods: List[Tuple[int, Optional[int], bool]], today_year: Optional[int] = None) -> int:
    """
    Calculates total non-overlapping years across all jobs.
    Overlapping or touching intervals are merged so periods are never double counted.
    """
    if not periods:
        return 0
    if today_year is None:
        today_year = current_year()

    intervals: List[Tuple[int, int]] = []
    for s, e, is_curr in periods:
        end_val = today_year if is_curr else (e if e is not None else s)
        if end_val >= s:
            intervals.append((s, end_val))

    if not intervals:
        return 0

    sorted_iv = sorted(intervals, key=lambda x: x[0])
    total = 0
    cur_start, cur_end = sorted_iv[0]

    for s, e in sorted_iv[1:]:
        if s <= cur_end:
            cur_end = max(cur_end, e)
        else:
            total += (cur_end - cur_start)
            cur_start, cur_end = s, e

    total += (cur_end - cur_start)
    return total
