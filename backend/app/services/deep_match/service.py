"""app/services/deep_match/service.py - orchestrates: JD profile -> assessment -> grounding -> scoring."""
import re
from typing import Any, Dict, List, Optional

from app.core.config import settings
from app.services.llm_client import LLMClient, LLMError
from .grounding import ground_assessments
from .heuristics_v2 import estimate_years, quick_match, split_jd, jd_years
from .prompts import ASSESS_PROMPT, JOB_PROFILE_PROMPT, SYSTEM
from .schemas import (
    Assessment,
    BulletRewrite,
    DeepAnalysis,
    ExperienceFit,
    InterviewItem,
    JobProfile,
    KeywordGap,
    Requirement,
    Risk,
    RoadmapItem,
    Strength,
)
from . import scoring

MAX_RESUME_CHARS, MAX_JOB_CHARS = 20_000, 12_000


def _clean(text: str, limit: int) -> str:
    text = re.sub(r"[\x00-\x08\x0b-\x1f]", " ", text)[:limit]
    return re.sub(r"</?(resume|job_post)>", "", text, flags=re.I)      # stop tag-injection / prompt-injection


def _detect_meta(job_text: str) -> dict:
    low = job_text.lower()
    seniority = "mid"
    if any(w in low for w in ("lead", "principal", "staff", "architect", "director", "head")):
        seniority = "lead"
    elif any(w in low for w in ("senior", "sr.", "sr ")):
        seniority = "senior"
    elif any(w in low for w in ("junior", "jr.", "entry", "associate")):
        seniority = "junior"
    elif "intern" in low:
        seniority = "intern"

    work_mode = "unspecified"
    if "remote" in low:
        work_mode = "remote"
    elif "hybrid" in low:
        work_mode = "hybrid"
    elif "on-site" in low or "onsite" in low:
        work_mode = "onsite"

    domain = "Modern Software Engineering & Distributed Systems"
    if any(w in low for w in ("fintech", "financial", "payment", "banking")):
        domain = "Fintech & Financial Platforms"
    elif any(w in low for w in ("health", "medical", "biotech")):
        domain = "Healthcare & Life Sciences"
    elif any(w in low for w in ("ecommerce", "e-commerce", "retail", "marketplace")):
        domain = "E-Commerce & Digital Marketplace"
    elif any(w in low for w in ("ai", "machine learning", "data platform", "analytics")):
        domain = "Artificial Intelligence & Data Systems"
    elif any(w in low for w in ("saas", "cloud", "devops", "infrastructure")):
        domain = "Enterprise SaaS & Cloud Infrastructure"

    # Responsibilities extraction
    resp_lines = []
    for line in job_text.splitlines():
        s = line.strip()
        if len(s) > 20 and re.match(r"^(?:[-*•]|\d+\.)\s*(?:design|develop|architect|lead|build|maintain|collaborate|deploy|scale|optimize|work)\b", s, re.I):
            resp_lines.append(re.sub(r"^(?:[-*•]|\d+\.)\s*", "", s))
    if not resp_lines:
        resp_lines = [
            "Architect and develop scalable, high-throughput software components",
            "Collaborate cross-functionally with product managers, designers, and engineers",
            "Participate in code reviews, automated testing, and CI/CD deployment pipelines",
            "Optimize application reliability, latency, and operational performance",
        ]

    # Culture signals
    culture = []
    for signal, label in [
        ("agile", "Agile / Scrum workflow"),
        ("cross-functional", "Cross-functional collaboration"),
        ("ownership", "High ownership & autonomy"),
        ("fast-paced", "Fast-paced execution"),
        ("mentorship", "Mentorship & knowledge sharing"),
    ]:
        if signal in low:
            culture.append(label)
    if not culture:
        culture = ["Collaborative engineering team", "Continuous delivery culture"]

    return {
        "seniority": seniority,
        "work_mode": work_mode,
        "domain": domain,
        "responsibilities": resp_lines[:5],
        "culture": culture,
    }


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
                warnings.append(f"AI analysis unavailable ({str(e)[:120]}); showing the advanced analytical engine instead.")
        else:
            warnings.append("No AI key configured; showing the advanced analytical engine. Add an API key to unlock LLM deep mode.")
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

    # ------------------------------------------------------------------ fallback / advanced analytical path
    def _heuristic_report(self, resume_text: str, job_text: str, years: float) -> Dict[str, Any]:
        qm = quick_match(resume_text, job_text)
        meta = _detect_meta(job_text)
        req_years = qm["jd_years"] or (5.0 if meta["seniority"] == "senior" else 7.0 if meta["seniority"] == "lead" else 3.0)

        reqs: List[Requirement] = []
        asm: List[Assessment] = []

        total_rows = len(qm["rows"])
        # Split skills between must and important/nice
        for i, (name, imp, status, evidence) in enumerate(qm["rows"], 1):
            rid = f"r{i}"
            # Ensure balanced split if job description did not specify preferred section
            assigned_imp = imp
            if imp == "must" and total_rows > 3 and i > max(3, int(total_rows * 0.6)):
                assigned_imp = "important"

            category = "hard_skill"
            if name.lower() in ("communication", "leadership", "mentoring", "agile", "scrum", "collaboration", "problem solving"):
                category = "soft_skill"

            reqs.append(Requirement(id=rid, text=name, category=category, importance=assigned_imp, jd_quote=name))
            asm.append(Assessment(
                requirement_id=rid,
                status=status,
                confidence=0.85 if status == "met" else 0.6 if status != "missing" else 0.5,
                evidence_quote=evidence or None,
                reasoning=f"Verified match in candidate resume for {name}." if status == "met" else (
                    f"Related background identified: {evidence}." if status == "transferable" else f"No direct evidence found for {name}."
                ),
                how_to_improve="" if status == "met" else f"Add truthful evidence of {name} if you have practical experience with it.",
            ))

        # Add an experience & seniority requirement
        exp_rid = f"r{len(reqs) + 1}"
        exp_status = "met" if years >= req_years else ("partial" if years >= req_years * 0.6 else "missing")
        reqs.append(Requirement(
            id=exp_rid,
            text=f"{int(req_years)}+ years of software engineering experience ({meta['seniority']} level)",
            category="experience",
            importance="must",
            jd_quote=f"Requires {req_years} years for {meta['seniority']} role",
        ))
        asm.append(Assessment(
            requirement_id=exp_rid,
            status=exp_status,
            confidence=0.9,
            evidence_quote=f"{years} years detected from resume timeline" if years > 0 else None,
            reasoning=f"Candidate has {years} years documented experience vs {req_years} years expected for {meta['seniority']} tier.",
            how_to_improve="" if exp_status == "met" else f"Highlight senior contributions and technical leadership to compensate for the {round(req_years - years, 1)} year gap.",
        ))

        # Add a responsibility requirement
        resp_rid = f"r{len(reqs) + 1}"
        resp_sample = meta["responsibilities"][0] if meta["responsibilities"] else "Architecting and scaling backend services"
        resp_matched = any(w in resume_text.lower() for w in ("architect", "develop", "lead", "build", "scale", "optimize"))
        reqs.append(Requirement(
            id=resp_rid,
            text=f"Core Responsibility: {resp_sample}",
            category="responsibility",
            importance="important",
            jd_quote=resp_sample,
        ))
        asm.append(Assessment(
            requirement_id=resp_rid,
            status="met" if resp_matched else "partial",
            confidence=0.8,
            evidence_quote="Demonstrated technical delivery in career timeline" if resp_matched else None,
            reasoning="Evidence of technical execution and collaborative delivery found in resume." if resp_matched else "Partially demonstrated in project descriptions.",
            how_to_improve="Showcase end-to-end feature ownership and architectural decision-making.",
        ))

        # Add a domain requirement
        dom_rid = f"r{len(reqs) + 1}"
        dom_sample = meta["domain"]
        dom_matched = any(w in resume_text.lower() for w in ("saas", "cloud", "api", "fintech", "web", "distributed"))
        reqs.append(Requirement(
            id=dom_rid,
            text=f"Domain Alignment: {dom_sample}",
            category="domain",
            importance="nice",
            jd_quote=f"Target domain: {dom_sample}",
        ))
        asm.append(Assessment(
            requirement_id=dom_rid,
            status="met" if dom_matched else "partial",
            confidence=0.75,
            evidence_quote="Experience in modern software systems" if dom_matched else None,
            reasoning="Candidate projects align with the architectural demands of this domain.",
            how_to_improve=f"Incorporate domain-specific terminology for {dom_sample}.",
        ))

        job = JobProfile(
            title=meta.get("title", "Target Role"),
            seniority=meta["seniority"],
            min_years_experience=req_years,
            work_mode=meta["work_mode"],
            domain=meta["domain"],
            tech_stack=[r.text for r in reqs if r.category == "hard_skill"],
            requirements=reqs,
            responsibilities=meta["responsibilities"],
            ats_keywords=[r.text for r in reqs if r.category == "hard_skill"],
            culture_signals=meta["culture"],
            jd_red_flags=[],
            ambiguities=[],
        )

        score = scoring.compute(job, asm, years, resume_text)

        # Generate rich strengths
        strengths: List[Strength] = []
        met_items = [a for a in asm if a.status == "met" and a.evidence_quote]
        for a in met_items[:4]:
            matching_req = next((r for r in reqs if r.id == a.requirement_id), None)
            req_text = matching_req.text if matching_req else "Core Skill"
            strengths.append(Strength(
                title=f"Verified Mastery: {req_text}",
                detail=f"Directly substantiated in your resume: \"{a.evidence_quote[:120]}\".",
                evidence_quote=a.evidence_quote,
            ))
        if years >= 3.0:
            strengths.append(Strength(
                title="Established Career Progression",
                detail=f"Candidate possesses {years} years of accumulated industry experience aligned with {meta['seniority']} expectations.",
                evidence_quote=None,
            ))
        if not strengths:
            strengths.append(Strength(
                title="Transferable Technical Foundation",
                detail="Resume exhibits foundational software engineering principles applicable to this role.",
                evidence_quote=None,
            ))

        # Generate rich risks
        risks: List[Risk] = []
        missing_musts = [r for r in reqs if r.importance == "must" and any(a.requirement_id == r.id and a.status in ("missing", "unclear") for a in asm)]
        for r in missing_musts[:3]:
            risks.append(Risk(
                title=f"Missing Must-Have: {r.text}",
                severity="high",
                detail=f"The job posting explicitly emphasizes '{r.text}', but no direct evidence was located in your resume text.",
                mitigation=f"Add projects, production achievements, or specific technical accomplishments demonstrating {r.text}.",
            ))
        if years < req_years:
            risks.append(Risk(
                title=f"Seniority Gap ({years} vs {req_years} yrs)",
                severity="medium",
                detail=f"The position targets {req_years} years of experience; your resume records {years} years.",
                mitigation="Emphasize system scale, high-impact deliverables, and rapid promotions to offset tenure expectations.",
            ))
        if not re.search(r"\d+%", resume_text):
            risks.append(Risk(
                title="Qualitative Impact Bullets",
                severity="low",
                detail="Work history primarily describes duties rather than quantifiable business impact.",
                mitigation="Include specific metrics, percentage improvements, and throughput scale (e.g. 'Improved efficiency by 30%').",
            ))

        # Generate keyword gaps
        keyword_gaps: List[KeywordGap] = []
        for kw in job.ats_keywords:
            if kw.lower() not in resume_text.lower():
                keyword_gaps.append(KeywordGap(
                    keyword=kw,
                    where_to_add="Technical Skills summary or Project Accomplishments",
                    truthful_note=f"Incorporate '{kw}' into your bullet points where you have used this technology.",
                ))

        # Generate bullet rewrites
        bullet_rewrites: List[BulletRewrite] = []
        resume_lines = [l.strip() for l in resume_text.splitlines() if len(l.strip()) > 30 and re.match(r"^[-*•]\s*", l.strip())]
        if not resume_lines:
            resume_lines = [l.strip() for l in resume_text.splitlines() if len(l.strip()) > 40][:3]
        for raw in resume_lines[:3]:
            clean_b = re.sub(r"^[-*•]\s*", "", raw)
            bullet_rewrites.append(BulletRewrite(
                original=clean_b,
                improved=f"Architected and deployed {clean_b.lower().rstrip('.')}, resulting in a [X%] improvement in operational performance across [X] users.",
                why="Transforms task description into a high-impact STAR accomplishment with measurable metrics.",
                needs_user_input=["Metric percentage increase [X%]", "System scale / user base [X]"],
            ))

        # Generate skill roadmap
        skill_roadmap: List[RoadmapItem] = []
        missing_skills = [r.text for r in reqs if any(a.requirement_id == r.id and a.status == "missing" for a in asm)]
        for s in missing_skills[:4]:
            skill_roadmap.append(RoadmapItem(
                skill=s,
                priority="high" if any(r.text == s and r.importance == "must" for r in reqs) else "medium",
                est_weeks=2,
                resources=[f"Official {s} Documentation & Quickstart", f"{s} Production Best Practices & Architectural Guides"],
                proof_project=f"Build and ship an open-source module demonstrating end-to-end integration of {s} with unit tests.",
            ))

        # Generate interview prep
        interview_prep: List[InterviewItem] = []
        top_met = [r.text for r in reqs if any(a.requirement_id == r.id and a.status == "met" for a in asm)]
        if top_met:
            interview_prep.append(InterviewItem(
                question=f"Can you walk us through how you designed and deployed production systems using {top_met[0]}?",
                why_asked=f"Assesses depth of engineering experience and architecture decisions with {top_met[0]}.",
                talking_points=[
                    f"Explain architecture design and modular structure used with {top_met[0]}",
                    "Highlight trade-offs considered and performance optimization steps taken",
                    "Share concrete business results and reliability metrics achieved",
                ],
                linked_requirement_id=None,
            ))
        if missing_skills:
            interview_prep.append(InterviewItem(
                question=f"This role relies on {missing_skills[0]}. How would you leverage your background to ramp up rapidly?",
                why_asked="Probes technical adaptability, mental models, and transferable problem-solving capabilities.",
                talking_points=[
                    f"Map related architectural principles from your existing tech stack to {missing_skills[0]}",
                    "Outline your structured onboarding methodology for adopting new technologies",
                    "Cite past instances where you mastered unfamiliar frameworks in production",
                ],
                linked_requirement_id=None,
            ))
        interview_prep.append(InterviewItem(
            question="Describe a high-stakes production incident or engineering bottleneck you resolved under pressure.",
            why_asked="Evaluates debugging methodology, incident triage, and communication during critical outages.",
            talking_points=[
                "Use the STAR method: Situation, Task, Action, Result",
                "Detail observability tools used (logs, metrics, APM) to isolate root cause",
                "Explain blameless post-mortem and preventative safeguards put in place",
            ],
            linked_requirement_id=None,
        ))

        # Summary suggestion
        top_skills_str = ", ".join(top_met[:3]) if top_met else "modern software engineering"
        summary_suggestion = (
            f"Results-driven {meta['seniority'].capitalize()} Engineer with {years} years of experience specializing in {top_skills_str}. "
            f"Demonstrated history of building reliable systems and collaborating across agile teams to deliver business-critical products."
        )

        analysis = DeepAnalysis(
            assessments=asm,
            verdict=score["verdict"],
            strengths=strengths,
            risks=risks,
            keyword_gaps=keyword_gaps,
            bullet_rewrites=bullet_rewrites,
            skill_roadmap=skill_roadmap,
            interview_prep=interview_prep,
            executive_summary=(
                f"Candidate exhibits a {score['verdict'].replace('_', ' ')} alignment for this {meta['seniority']} role. "
                f"Core strengths include verified competence in {top_skills_str or 'foundational engineering'}. "
                f"Primary areas for optimization involve addressing key missing competencies ({', '.join(missing_skills[:2]) if missing_skills else 'tenure depth'}) "
                f"and quantifying bullet achievements to maximize ATS and recruiter engagement."
            ),
            experience_fit=ExperienceFit(
                candidate_relevant_years=years,
                seniority_signal="aligned" if years >= req_years * 0.8 else ("below" if years < req_years * 0.6 else "moderate"),
                reasoning=f"Calculated {years} years from resume timeline against target requirement of {req_years} years for {meta['seniority']} tier.",
                career_gaps=[],
            ),
            summary_suggestion=summary_suggestion,
        )

        return {
            "engine": "heuristic",
            "model": None,
            "candidate_years": years,
            "job_profile": job.model_dump(),
            "analysis": analysis.model_dump(),
            "score": score,
            "what_if": scoring.what_if(job, asm, years, resume_text),
            "warnings": [],
        }


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
    return {
        "overall_score": report["score"]["overall"],
        "skills_coverage_score": bd.get("core", 0.0),
        "relevance_score": bd.get("alignment", 0.0),
        "structure_score": bd.get("evidence", 0.0),
        "readability_score": bd.get("keywords", 0.0),
        "matched_skills": matched,
        "missing_skills": missing,
        "partial_skills": partial,
        "match_explanations": [report["analysis"]["executive_summary"]] + report["score"]["caps_applied"],
        "recommendations": [g["requirement"] + f" (+{g['gain']} pts if shown)" for g in report["what_if"]],
    }
