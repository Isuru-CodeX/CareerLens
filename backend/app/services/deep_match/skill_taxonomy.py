"""Canonical skill taxonomy: alias -> canonical name, plus implied skills."""
import re
from typing import Dict, List, Set

# canonical -> aliases (all lowercase). Extend freely, or load ESCO/O*NET into this shape.
ALIASES: Dict[str, List[str]] = {
    "Python": ["python", "python3", "py"],
    "JavaScript": ["javascript", "js", "ecmascript", "es6"],
    "TypeScript": ["typescript", "ts"],
    "React": ["react.js", "reactjs", "react native"],
    "Node.js": ["node.js", "nodejs", "node"],
    "FastAPI": ["fastapi"],
    "Django": ["django", "drf", "django rest framework"],
    "Flask": ["flask"],
    "PostgreSQL": ["postgresql", "postgres", "psql", "pg"],
    "SQL": ["sql", "t-sql", "pl/sql"],
    "Redis": ["redis"],
    "Docker": ["docker", "containers", "containerization", "containerisation"],
    "Kubernetes": ["kubernetes", "k8s", "eks", "gke", "aks"],
    "AWS": ["aws", "amazon web services", "ec2", "s3", "lambda"],
    "CI/CD": ["ci/cd", "cicd", "ci cd", "continuous integration", "continuous delivery",
              "continuous deployment", "github actions", "gitlab ci", "jenkins"],
    "Kafka": ["kafka", "apache kafka"],
    "GraphQL": ["graphql"],
    "Go": ["golang", "go language"],           # bare "go" handled separately (ambiguous)
    "Mentorship": ["mentorship", "mentoring", "mentored", "mentor", "coaching juniors"],
    "Automated Testing": ["automated testing", "unit testing", "pytest", "jest",
                          "test automation", "tdd", "integration testing"],
    "Leadership": ["leadership", "led a team", "team lead", "led team", "managed a team"],
    "Machine Learning": ["machine learning", "ml", "scikit-learn", "sklearn"],
}

# requirement -> skills that give PARTIAL ("transferable") credit when the exact skill is absent
RELATED: Dict[str, List[str]] = {
    "TypeScript": ["JavaScript"], "React": ["JavaScript", "TypeScript"], "Node.js": ["JavaScript"],
    "FastAPI": ["Flask", "Django", "Python"], "Django": ["Flask", "FastAPI"], "Flask": ["Django", "FastAPI"],
    "PostgreSQL": ["SQL"], "SQL": ["PostgreSQL"],
    "Docker": ["Kubernetes"], "Kubernetes": ["Docker"],
    "CI/CD": [], "Kafka": [], "GraphQL": [], "AWS": [],
}

# Words that are also ordinary English: only count them in a tech-looking context.
AMBIGUOUS = {"Go": ["go"], "React": ["react"], "Express": ["express"]}

_ALIAS_TO_CANON: Dict[str, str] = {}
for canon, al in ALIASES.items():
    for a in al:
        _ALIAS_TO_CANON[a.lower()] = canon

# unambiguous aliases only (the short/ambiguous ones are guarded below)
_SHORT_GUARDED = {"py", "js", "ts", "pg", "ml", "node", "ec2", "s3", "lambda", "mentor"}

def _pattern(alias: str) -> re.Pattern:
    return re.compile(r'(?<![\w.+#-])' + re.escape(alias) + r'(?![\w+#-])', re.I)

_PATTERNS = {a: _pattern(a) for a in _ALIAS_TO_CANON if a not in _SHORT_GUARDED}

def find_skills(text: str) -> Dict[str, str]:
    """Return {canonical_skill: first line that evidences it}. Alias-aware, context-safe."""
    found: Dict[str, str] = {}
    for line in text.split("\n"):
        low = line.lower()
        for alias, pat in _PATTERNS.items():
            if pat.search(low):
                found.setdefault(_ALIAS_TO_CANON[alias], line.strip()[:160])
        # short aliases only inside a list-like / skills line ("Python, JS, TS")
        if "," in line or "/" in line or "|" in line:
            for alias in _SHORT_GUARDED:
                if alias in ("mentor",):
                    continue
                if re.search(r'(?<![\w.])' + re.escape(alias) + r'(?![\w.])', low) and len(low.split(",")) >= 2:
                    found.setdefault(_ALIAS_TO_CANON[alias], line.strip()[:160])
    # ambiguous English words: accept only capitalised form AND a tech-looking line
    for line in text.split("\n"):
        if re.search(r'\bReact\b', line) and (found.keys() & {"JavaScript","TypeScript","Node.js"} or
                re.search(r'[,/|]|framework|library|hooks|component|frontend|front-end', line, re.I)):
            found.setdefault("React", line.strip()[:160])
    return found

def related_credit(required: str, have: Set[str]) -> str:
    """Return the candidate skill that earns partial credit for `required`, else ''."""
    for r in RELATED.get(required, []):
        if r in have:
            return r
    return ""
