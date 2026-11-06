"""app/services/deep_match/service.py - orchestrates: JD profile -> assessment -> grounding -> scoring."""
import re
from typing import Any, Dict, List, Optional

from app.core.config import settings
from app.services.llm_client import LLMClient, LLMError
from .grounding import ground_assessments
from .heuristics_v2 import estimate_years, quick_match
from .prompts import ASSESS_PROMPT, JOB_PROFILE_PROMPT, SYSTEM
from .schemas import Assessment, DeepAnalysis, ExperienceFit, JobProfile, Requirement
from . import scoring

MAX_RESUME_CHARS, MAX_JOB_CHARS = 20_000, 12_000


def _clean(text: str, limit: int) -> str:
    text = re.sub(r"[\x00-\x08\x0b-\x1f]", " ", text)[:limit]
    return re.sub(r"</?(resume|job_post)>", "", text, flags=re.I)      # stop tag-injection / prompt-injection


class DeepMatchService:
    def __init__(self, fast: Optional[LLMClient] = None, deep: Optional[LLMClient] = None):
        self.fast = fast or LLMClient(model=settings.LLM_MODEL_FAST)     # cheap model: extraction
        self.deep = deep or LLMClient(model=settings.LLM_MODEL_DEEP)     # strong model: judgement

    # ------------------------------------------------------------------ public
    def analyze(self, resume_text: str, job_text: str) -> Dict[str, Any]:
        resume_text, job_text = _clean(resume_text, MAX_RESUME_CHARS), _clean(job_text, MAX_JOB_CHARS)
        years = estimate_years(resume_text)
        warnings: List[str] = []
        if self.deep.available:
            try:
                return self._llm_report(resume_text, job_text, years)
            except LLMError as e:
                warnings.append(f"AI analysis unavailable ({str(e)[:120]}); showing the basic engine instead.")
        else:
            warnings.append("No AI key configured; showing the basic engine. Add a key to unlock deep analysis.")
        report = self._heuristic_report(resume_text, job_text, years)
        report["warnings"] = warnings
        return report

    # ------------------------------------------------------------------ LLM path
    def _llm_report(self, resume_text: str, job_text: str, years: float) -> Dict[str, Any]:
        job = self.fast.generate_json(SYSTEM, JOB_PROFILE_PROMPT.format(job_text=job_text), JobProfile, max_tokens=4000)
        analysis = self.deep.generate_json(
            SYSTEM,
            ASSESS_PROMPT.format(job_profile_json=job.model_dump_json(), years=years, resume_text=resume_text),
            DeepAnalysis, max_tokens=8000)

        by_id = {a.requirement_id: a for a in analysis.assessments}
        for r in job.requirements:                                      # model skipped one? mark unclear, never silently drop
            by_id.setdefault(r.id, Assessment(requirement_id=r.id, status="unclear", confidence=0.0,
                                              reasoning="Not assessed by the model.", how_to_improve=""))
        analysis.assessments = [by_id[r.id] for r in job.requirements]
        ground_assessments(analysis.assessments, resume_text)           # reject unverifiable evidence

        rel_years = analysis.experience_fit.candidate_relevant_years
        if rel_years is not None:
            rel_years = min(rel_years, years or rel_years)              # relevant years can never exceed total years
        score = scoring.compute(job, analysis.assessments, rel_years if rel_years is not None else years, resume_text)
        analysis.verdict = score["verdict"]                             # the score band decides, not the model
        unverified = sum(1 for a in analysis.assessments if not a.verified)
        return {
            "engine": "llm", "model": self.deep.model, "candidate_years": years,
            "job_profile": job.model_dump(), "analysis": analysis.model_dump(),
            "score": score, "what_if": scoring.what_if(job, analysis.assessments, years, resume_text),
            "warnings": ([f"{unverified} claim(s) were downgraded because their evidence was not found in the resume."]
                         if unverified else []),
        }

    # ------------------------------------------------------------------ fallback path (no key / API down)
    def _heuristic_report(self, resume_text: str, job_text: str, years: float) -> Dict[str, Any]:
        qm = quick_match(resume_text, job_text)
        reqs, asm = [], []
        for i, (name, imp, status, evidence) in enumerate(qm["rows"], 1):
            rid = f"r{i}"
            reqs.append(Requirement(id=rid, text=name, category="hard_skill", importance=imp, jd_quote=name))
            asm.append(Assessment(requirement_id=rid, status=status, confidence=0.6 if status != "missing" else 0.5,
                                  evidence_quote=evidence or None, reasoning="Keyword/alias match (basic engine).",
                                  how_to_improve="" if status == "met" else f"Add truthful evidence of {name} if you have it."))
        from .heuristics_v2 import jd_years
        job = JobProfile(title="Target role", seniority="unspecified", min_years_experience=jd_years(job_text),
                         requirements=reqs, ats_keywords=[r.text for r in reqs])
        score = scoring.compute(job, asm, years, resume_text)
        analysis = DeepAnalysis(assessments=asm, verdict=score["verdict"], strengths=[], risks=[], keyword_gaps=[],
                                bullet_rewrites=[], skill_roadmap=[], interview_prep=[],
                                executive_summary="Basic keyword analysis only. Enable an AI key for evidence-based deep analysis.",
                                experience_fit=ExperienceFit(candidate_relevant_years=years, reasoning="Computed from resume dates."))
        return {"engine": "heuristic", "model": None, "candidate_years": years, "job_profile": job.model_dump(),
                "analysis": analysis.model_dump(), "score": score,
                "what_if": scoring.what_if(job, asm, years, resume_text), "warnings": []}


def to_legacy(report: Dict[str, Any]) -> Dict[str, Any]:
    """Map the new report onto the OLD job_matches columns so the existing UI/dashboard keep working."""
    reqs = {r["id"]: r for r in report["job_profile"]["requirements"]}
    matched, missing, partial = [], [], []
    for a in report["analysis"]["assessments"]:
        r = reqs.get(a["requirement_id"])
        if not r:
            continue
        req = r["importance"] == "must"
        if a["status"] == "met":
            matched.append({"name": r["text"], "is_required": req, "evidence": a["evidence_quote"] or "", "match_type": "Verified"})
        elif a["status"] in ("partial", "transferable"):
            partial.append({"name": r["text"], "related_found": (a["evidence_quote"] or "related experience")[:60], "is_required": req})
        else:
            missing.append({"name": r["text"], "is_required": req, "recommendation": a["how_to_improve"]})
    bd = {b["key"]: b["score"] or 0.0 for b in report["score"]["breakdown"]}
    return {"overall_score": report["score"]["overall"], "skills_coverage_score": bd.get("core", 0.0),
            "relevance_score": bd.get("alignment", 0.0), "structure_score": bd.get("evidence", 0.0),
            "readability_score": bd.get("keywords", 0.0), "matched_skills": matched, "missing_skills": missing,
            "partial_skills": partial,
            "match_explanations": [report["analysis"]["executive_summary"]] + report["score"]["caps_applied"],
            "recommendations": [g["requirement"] + f" (+{g['gain']} pts if shown)" for g in report["what_if"]]}
