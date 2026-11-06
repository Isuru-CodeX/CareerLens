"""app/services/deep_match/scoring.py - deterministic, explainable scoring. The LLM never picks the number."""
import re
from typing import Dict, List, Optional
from .schemas import Assessment, JobProfile, Requirement

CREDIT = {"met": 1.0, "partial": 0.6, "transferable": 0.35, "unclear": 0.0, "missing": 0.0}
IMPORTANCE_WEIGHT = {"must": 3.0, "important": 2.0, "nice": 1.0}
DIM_WEIGHTS = {"core": 0.40, "secondary": 0.10, "experience": 0.20,
               "alignment": 0.15, "evidence": 0.10, "keywords": 0.05}
DIM_LABELS = {"core": "Must-have requirements", "secondary": "Important & nice-to-have",
              "experience": "Experience & seniority", "alignment": "Responsibility & domain fit",
              "evidence": "Quality of evidence", "keywords": "ATS keyword coverage"}
KNOCKOUT_CATEGORIES = {"education", "certification", "logistics", "language"}


def _coverage(reqs: List[Requirement], by_id: Dict[str, Assessment], importances=None, categories=None) -> Optional[float]:
    num = den = 0.0
    for r in reqs:
        if importances and r.importance not in importances:
            continue
        if categories and r.category not in categories:
            continue
        w = IMPORTANCE_WEIGHT[r.importance]
        a = by_id.get(r.id)
        num += w * CREDIT[a.status if a else "unclear"]
        den += w
    return None if den == 0 else 100.0 * num / den


def experience_score(candidate_years: Optional[float], job: JobProfile) -> Optional[float]:
    if candidate_years is None or job.min_years_experience is None:
        return None
    score = min(1.0, candidate_years / max(job.min_years_experience, 0.5)) * 100
    if job.max_years_experience and candidate_years > job.max_years_experience * 1.5:
        score = min(score, 85.0)              # likely over-qualified; flagged separately as a risk
    return score


def evidence_score(assessments: List[Assessment]) -> Optional[float]:
    positives = [a for a in assessments if a.status in ("met", "partial") and a.verified]
    if not positives:
        return None
    quantified = sum(1 for a in positives if a.evidence_quote and re.search(r"\d", a.evidence_quote))
    return 100.0 * quantified / len(positives)


def keyword_score(job: JobProfile, resume_text: str) -> Optional[float]:
    if not job.ats_keywords:
        return None
    low = resume_text.lower()
    hit = sum(1 for k in job.ats_keywords if k.lower() in low)
    return 100.0 * hit / len(job.ats_keywords)


def compute(job: JobProfile, assessments: List[Assessment], candidate_years: Optional[float], resume_text: str) -> dict:
    by_id = {a.requirement_id: a for a in assessments}
    dims = {
        "core": _coverage(job.requirements, by_id, importances={"must"}),
        "secondary": _coverage(job.requirements, by_id, importances={"important", "nice"}),
        "experience": experience_score(candidate_years, job),
        "alignment": _coverage(job.requirements, by_id, categories={"responsibility", "domain"}),
        "evidence": evidence_score(assessments),
        "keywords": keyword_score(job, resume_text),
    }
    active = {k: v for k, v in dims.items() if v is not None}
    total_w = sum(DIM_WEIGHTS[k] for k in active) or 1.0          # re-normalise when a dimension has no data
    overall = sum(DIM_WEIGHTS[k] * v for k, v in active.items()) / total_w

    caps = []
    musts = [r for r in job.requirements if r.importance == "must"]
    missing_musts = [r for r in musts if by_id.get(r.id) is None or by_id[r.id].status in ("missing", "unclear")]
    ko = [r for r in missing_musts if r.category in KNOCKOUT_CATEGORIES]
    if ko:
        overall = min(overall, 55.0)
        caps.append(f"Capped at 55: possible knock-out requirement(s) not shown - {', '.join(r.text for r in ko[:3])}")
    if musts and len(missing_musts) / len(musts) >= 0.5:
        overall = min(overall, 60.0)
        caps.append("Capped at 60: half or more of the must-have requirements are not evidenced")

    verdict = ("strong_fit" if overall >= 80 else "good_fit" if overall >= 65
               else "stretch" if overall >= 45 else "weak_fit")
    breakdown = [{"key": k, "label": DIM_LABELS[k], "score": None if dims[k] is None else round(dims[k], 1),
                  "weight": DIM_WEIGHTS[k]} for k in DIM_WEIGHTS]
    return {"overall": round(overall, 1), "verdict": verdict, "breakdown": breakdown, "caps_applied": caps}


def what_if(job: JobProfile, assessments: List[Assessment], candidate_years, resume_text, top_n: int = 5) -> List[dict]:
    """Score gain if each gap became 'met' - powers the 'fix this first' panel."""
    base = compute(job, assessments, candidate_years, resume_text)["overall"]
    out = []
    for r in job.requirements:
        a = next((x for x in assessments if x.requirement_id == r.id), None)
        if a and a.status == "met":
            continue
        sim = [x.model_copy(deep=True) for x in assessments if x.requirement_id != r.id]
        sim.append(Assessment(requirement_id=r.id, status="met", confidence=1, reasoning="", how_to_improve="",
                              evidence_quote="1"))
        gain = compute(job, sim, candidate_years, resume_text)["overall"] - base
        out.append({"requirement": r.text, "importance": r.importance, "gain": round(gain, 1)})
    return sorted(out, key=lambda x: -x["gain"])[:top_n]
