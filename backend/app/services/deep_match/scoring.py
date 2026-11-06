"""app/services/deep_match/scoring.py - deterministic, explainable scoring. The LLM never picks the number."""
import re
from typing import Dict, List, Optional
from .schemas import Assessment, JobProfile, Requirement

CREDIT = {"met": 1.0, "partial": 0.6, "transferable": 0.35, "unclear": 0.0, "missing": 0.0}
IMPORTANCE_WEIGHT = {"must": 3.0, "important": 2.0, "nice": 1.0}
DIM_WEIGHTS = {
    "core": 0.40,
    "secondary": 0.10,
    "experience": 0.20,
    "alignment": 0.15,
    "evidence": 0.10,
    "keywords": 0.05,
}
DIM_LABELS = {
    "core": "Must-have requirements",
    "secondary": "Important & nice-to-have",
    "experience": "Experience & seniority",
    "alignment": "Responsibility & domain fit",
    "evidence": "Quality of evidence",
    "keywords": "ATS keyword coverage",
}
KNOCKOUT_CATEGORIES = {"education", "certification", "logistics", "language"}


def infer_job_years(job: JobProfile) -> float:
    if job.min_years_experience is not None and job.min_years_experience > 0:
        return float(job.min_years_experience)
    sen = (job.seniority or "").lower()
    title = (job.title or "").lower()
    if any(w in sen or w in title for w in ("lead", "principal", "staff", "architect", "director", "head")):
        return 7.0
    if any(w in sen or w in title for w in ("senior", "sr")):
        return 5.0
    if any(w in sen or w in title for w in ("junior", "jr", "entry", "associate", "intern")):
        return 1.5
    return 3.0


def _coverage(reqs: List[Requirement], by_id: Dict[str, Assessment], importances=None, categories=None) -> Optional[float]:
    num = den = 0.0
    for r in reqs:
        if importances and r.importance not in importances:
            continue
        if categories and r.category not in categories:
            continue
        w = IMPORTANCE_WEIGHT.get(r.importance, 2.0)
        a = by_id.get(r.id)
        num += w * CREDIT[a.status if a else "unclear"]
        den += w
    return None if den == 0 else 100.0 * num / den


def experience_score(candidate_years: Optional[float], job: JobProfile) -> float:
    if candidate_years is None or candidate_years <= 0:
        return 0.0
    needed = infer_job_years(job)
    score = min(1.0, candidate_years / max(needed, 0.5)) * 100.0
    if job.max_years_experience and candidate_years > job.max_years_experience * 1.5:
        score = min(score, 85.0)  # likely over-qualified
    return round(score, 1)


def evidence_score(assessments: List[Assessment]) -> float:
    positives = [a for a in assessments if a.status in ("met", "partial") and a.verified]
    if not positives:
        return 0.0
    quantified = sum(1 for a in positives if a.evidence_quote and re.search(r"\d", a.evidence_quote))
    ver_ratio = len(positives) / max(1, len(assessments))
    metric_ratio = quantified / len(positives)
    # Balanced blend: 40% verification density + 60% quantified metrics presence
    score = (0.4 * ver_ratio + 0.6 * metric_ratio) * 100.0
    return round(min(100.0, max(20.0, score)), 1)


def keyword_score(job: JobProfile, resume_text: str) -> float:
    if not job.ats_keywords:
        return 0.0
    low = resume_text.lower()
    hit = sum(1 for k in job.ats_keywords if k.lower() in low)
    return round(100.0 * hit / len(job.ats_keywords), 1)


def secondary_score(job: JobProfile, by_id: Dict[str, Assessment], resume_text: str) -> float:
    cov = _coverage(job.requirements, by_id, importances={"important", "nice"})
    if cov is not None:
        return round(cov, 1)
    # Fallback when JD has no explicit nice-to-have section:
    if job.tech_stack:
        low = resume_text.lower()
        hits = sum(1 for tech in job.tech_stack if tech.lower() in low)
        return round(min(100.0, (hits / len(job.tech_stack)) * 100.0), 1)
    core_cov = _coverage(job.requirements, by_id, importances={"must"})
    if core_cov is not None and core_cov > 0:
        return round(core_cov * 0.85, 1)
    return 0.0


def alignment_score(job: JobProfile, assessments: List[Assessment], by_id: Dict[str, Assessment], resume_text: str) -> float:
    cov = _coverage(job.requirements, by_id, categories={"responsibility", "domain"})
    if cov is not None:
        return round(cov, 1)
    low = resume_text.lower()
    actions = ["architect", "develop", "build", "lead", "manage", "collaborate", "deploy", "design", "maintain", "test", "optimize", "deliver"]
    matched_actions = sum(1 for act in actions if act in low)
    if matched_actions == 0:
        return 0.0

    action_score = min(100.0, (matched_actions / 6.0) * 100.0)
    domain_score = 40.0
    if job.domain and job.domain.lower() in low:
        domain_score = 90.0
    elif any(term in low for term in ("full-stack", "frontend", "backend", "cloud", "saas", "api", "mobile", "distributed")):
        domain_score = 75.0

    combined = 0.6 * action_score + 0.4 * domain_score
    return round(min(100.0, max(0.0, combined)), 1)


def _get_status_label(score: float) -> str:
    if score >= 80.0:
        return "exceptional"
    if score >= 65.0:
        return "strong"
    if score >= 45.0:
        return "moderate"
    return "needs_work"


def compute(job: JobProfile, assessments: List[Assessment], candidate_years: Optional[float], resume_text: str) -> dict:
    by_id = {a.requirement_id: a for a in assessments}

    core_cov = _coverage(job.requirements, by_id, importances={"must"})
    if core_cov is None:
        core_cov = _coverage(job.requirements, by_id) or 0.0

    sec_cov = secondary_score(job, by_id, resume_text)
    exp_cov = experience_score(candidate_years, job)
    align_cov = alignment_score(job, assessments, by_id, resume_text)
    evid_cov = evidence_score(assessments)
    kw_cov = keyword_score(job, resume_text)

    dims = {
        "core": round(core_cov, 1),
        "secondary": round(sec_cov, 1),
        "experience": round(exp_cov, 1),
        "alignment": round(align_cov, 1),
        "evidence": round(evid_cov, 1),
        "keywords": round(kw_cov, 1),
    }

    # Deterministic overall weighted score
    overall = sum(DIM_WEIGHTS[k] * dims[k] for k in DIM_WEIGHTS)

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

    verdict = (
        "strong_fit" if overall >= 80
        else "good_fit" if overall >= 65
        else "stretch" if overall >= 45
        else "weak_fit"
    )

    # Detailed diagnostic breakdown
    breakdown = []
    req_by_importance = {"must": [r for r in job.requirements if r.importance == "must"],
                         "sec": [r for r in job.requirements if r.importance in ("important", "nice")]}

    # 1. Core
    core_met = [r.text for r in req_by_importance["must"] if by_id.get(r.id) and by_id[r.id].status == "met"]
    core_miss = [r.text for r in req_by_importance["must"] if not by_id.get(r.id) or by_id[r.id].status in ("missing", "unclear")]
    breakdown.append({
        "key": "core",
        "label": DIM_LABELS["core"],
        "score": dims["core"],
        "weight": DIM_WEIGHTS["core"],
        "earned_points": round(dims["core"] * DIM_WEIGHTS["core"], 1),
        "max_points": round(DIM_WEIGHTS["core"] * 100, 1),
        "status": _get_status_label(dims["core"]),
        "summary": f"{len(core_met)} of {len(req_by_importance['must']) or len(job.requirements)} core requirements evidenced.",
        "positive_factors": core_met[:5],
        "missing_factors": core_miss[:5],
        "recommendation": f"Prioritize adding verified experience for: {', '.join(core_miss[:2])}." if core_miss else "Core requirements are thoroughly evidenced.",
    })

    # 2. Secondary
    sec_met = [r.text for r in req_by_importance["sec"] if by_id.get(r.id) and by_id[r.id].status in ("met", "partial", "transferable")]
    sec_miss = [r.text for r in req_by_importance["sec"] if not by_id.get(r.id) or by_id[r.id].status == "missing"]
    breakdown.append({
        "key": "secondary",
        "label": DIM_LABELS["secondary"],
        "score": dims["secondary"],
        "weight": DIM_WEIGHTS["secondary"],
        "earned_points": round(dims["secondary"] * DIM_WEIGHTS["secondary"], 1),
        "max_points": round(DIM_WEIGHTS["secondary"] * 100, 1),
        "status": _get_status_label(dims["secondary"]),
        "summary": f"Coverage of auxiliary tooling, secondary competencies, and preferred credentials." if not sec_miss else f"Matched {len(sec_met)} secondary items; {len(sec_miss)} missing.",
        "positive_factors": sec_met[:5] or (job.tech_stack[:4] if dims["secondary"] > 50 else []),
        "missing_factors": sec_miss[:5],
        "recommendation": "Highlight related tools or secondary frameworks in your technical skills section." if dims["secondary"] < 70 else "Secondary qualifications are well represented.",
    })

    # 3. Experience
    req_years = infer_job_years(job)
    cand_years = candidate_years or 0.0
    breakdown.append({
        "key": "experience",
        "label": DIM_LABELS["experience"],
        "score": dims["experience"],
        "weight": DIM_WEIGHTS["experience"],
        "earned_points": round(dims["experience"] * DIM_WEIGHTS["experience"], 1),
        "max_points": round(DIM_WEIGHTS["experience"] * 100, 1),
        "status": _get_status_label(dims["experience"]),
        "summary": f"Candidate demonstrates {cand_years} years of experience vs {req_years} years expected for this {job.seniority or 'target'} role.",
        "positive_factors": [f"{cand_years} years professional timeline detected", f"Aligned with {job.seniority or 'target'} seniority tier"] if dims["experience"] >= 70 else [f"{cand_years} years documented"],
        "missing_factors": [f"Gap of {round(req_years - cand_years, 1)} years to meet standard {req_years}-year expectation"] if cand_years < req_years else [],
        "recommendation": "Emphasize leadership and senior-level architectural contributions to offset year requirements." if cand_years < req_years else "Experience tenure meets or exceeds target threshold.",
    })

    # 4. Alignment
    breakdown.append({
        "key": "alignment",
        "label": DIM_LABELS["alignment"],
        "score": dims["alignment"],
        "weight": DIM_WEIGHTS["alignment"],
        "earned_points": round(dims["alignment"] * DIM_WEIGHTS["alignment"], 1),
        "max_points": round(DIM_WEIGHTS["alignment"] * 100, 1),
        "status": _get_status_label(dims["alignment"]),
        "summary": "Measures domain terminology, engineering responsibilities, and system scope alignment.",
        "positive_factors": ["Action verb density", "Core architectural alignment"] if dims["alignment"] >= 50 else ["Basic terminology overlap"],
        "missing_factors": ["Deep domain-specific phrasing", "Scope leadership metrics"] if dims["alignment"] < 75 else [],
        "recommendation": "Adopt industry-standard phrasing for system design, cross-functional collaboration, and delivery.",
    })

    # 5. Evidence
    quant_count = sum(1 for a in assessments if a.status in ("met", "partial") and a.evidence_quote and re.search(r"\d", a.evidence_quote))
    breakdown.append({
        "key": "evidence",
        "label": DIM_LABELS["evidence"],
        "score": dims["evidence"],
        "weight": DIM_WEIGHTS["evidence"],
        "earned_points": round(dims["evidence"] * DIM_WEIGHTS["evidence"], 1),
        "max_points": round(DIM_WEIGHTS["evidence"] * 100, 1),
        "status": _get_status_label(dims["evidence"]),
        "summary": f"Evidence quality based on verbatim grounding and quantified business outcomes ({quant_count} quantified bullets).",
        "positive_factors": [f"{quant_count} metric-backed claims verified in resume text"] if quant_count else ["Verbatim textual citations confirmed"],
        "missing_factors": ["Qualitative bullets lacking %, $, or scale metrics"] if quant_count < 3 else [],
        "recommendation": "Upgrade bullet points using the STAR format: Action + Result with quantified numbers [X%].",
    })

    # 6. Keywords
    kw_hits = [k for k in job.ats_keywords if k.lower() in resume_text.lower()]
    kw_miss = [k for k in job.ats_keywords if k.lower() not in resume_text.lower()]
    breakdown.append({
        "key": "keywords",
        "label": DIM_LABELS["keywords"],
        "score": dims["keywords"],
        "weight": DIM_WEIGHTS["keywords"],
        "earned_points": round(dims["keywords"] * DIM_WEIGHTS["keywords"], 1),
        "max_points": round(DIM_WEIGHTS["keywords"] * 100, 1),
        "status": _get_status_label(dims["keywords"]),
        "summary": f"Detected {len(kw_hits)} of {len(job.ats_keywords)} primary ATS keywords ({dims['keywords']}% coverage).",
        "positive_factors": kw_hits[:6],
        "missing_factors": kw_miss[:6],
        "recommendation": f"Naturally integrate missing keywords: {', '.join(kw_miss[:3])}." if kw_miss else "ATS keyword density is optimal.",
    })

    return {
        "overall": round(overall, 1),
        "verdict": verdict,
        "breakdown": breakdown,
        "caps_applied": caps,
    }


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
