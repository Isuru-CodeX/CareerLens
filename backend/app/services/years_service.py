"""
app/services/years_service.py - Standard year calculations, industry taxonomy, and canonical skills.
Shared logic with identical rules between server and web.
"""
import re
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
    "c++": "C++",
    "cpp": "C++",
    "golang": "Go",
    "go": "Go",
    "py": "Python",
    "python": "Python",
    "java": "Java",
    "php": "PHP",
    "laravel": "Laravel",
    "html": "HTML",
    "html5": "HTML",
    "css": "CSS",
    "css3": "CSS",
    "sass": "Sass",
    "scss": "Sass",
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
    "angular": "Angular",
    "svelte": "Svelte",
    "fastapi": "FastAPI",
    "django": "Django",
    "flask": "Flask",
    "spring": "Spring Boot",
    "spring boot": "Spring Boot",
    "express": "Express.js",
    "express.js": "Express.js",
    "graphql": "GraphQL",
    "mongodb": "MongoDB",
    "mysql": "MySQL",
    "sqlite": "SQLite",
    "redis": "Redis",
    "git": "Git",
    "github": "Git",
    "ci/cd": "CI/CD",
    "cicd": "CI/CD",
    "jenkins": "Jenkins",
    "terraform": "Terraform",
    "linux": "Linux",
    "flutter": "Flutter",
    "dart": "Dart",
    "kotlin": "Kotlin",
    "swift": "Swift",
    "react native": "React Native",
    "figma": "Figma",
    "ui/ux": "UI/UX Design",
    "jira": "Jira",
    "scrum": "Agile/Scrum",
    "agile": "Agile/Scrum",
    "project management": "Project Management",
    "public relations": "Public Relations",
    "seo": "SEO",
    "digital marketing": "Digital Marketing",
}

PROTECTED_SKILL_SLASHES = {"ci/cd", "ui/ux", "tcp/ip", "pl/sql", "os/2", "i/o", "client/server"}

def split_compound_skills(raw_skills: List[str]) -> List[str]:
    """
    Intelligently splits skills combined with commas, slashes, bullets, pipes, or 'and'
    (e.g. 'HTML/CSS', 'Java, PHP, JavaScript and MySQL', 'Docker | Kubernetes', 'Frontend (React, Vue)')
    while preserving protected terms like 'CI/CD' and 'UI/UX'.
    """
    result: List[str] = []
    seen = set()

    for item in raw_skills:
        if not item or not isinstance(item, str):
            continue
        text = item.strip()
        if not text:
            continue

        # Split on commas, newlines, bullets, pipes, semicolons, parentheses, and the word 'and'
        parts = re.split(r"[,;\n•·|&()]|\s+\band\b\s+", text, flags=re.IGNORECASE)
        for part in parts:
            p = part.strip()
            if not p:
                continue

            # Check if slash should be split (e.g. 'HTML/CSS' or 'React / Next.js')
            p_lower = p.lower()
            if "/" in p and p_lower not in PROTECTED_SKILL_SLASHES:
                sub_parts = p.split("/")
                for sp in sub_parts:
                    s_canon = canonical_skill(sp.strip())
                    if s_canon and s_canon.lower() not in seen and len(s_canon) >= 2:
                        seen.add(s_canon.lower())
                        result.append(s_canon)
            else:
                s_canon = canonical_skill(p)
                if s_canon and s_canon.lower() not in seen and len(s_canon) >= 2:
                    seen.add(s_canon.lower())
                    result.append(s_canon)

    return result

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

