"""
app/services/context_builder.py - Builds candidate context from multi-CV memory and presets.
Used identically by Job Matcher and Cover Letter Generator.
"""
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from app.models.models import (
    User, Resume, ProfileExperience, ExperienceSource, ProfileSkill, SkillSource, Preset, PresetResume, CareerProfile
)
from app.services.years_service import total_years, years_count

class CandidateContext:
    def __init__(
        self,
        target_role: Optional[str],
        total_years_val: int,
        skills: List[str],
        experiences: List[Dict[str, Any]],
        resumes: List[Dict[str, Any]],
        candidate_name: Optional[str] = None,
        email: Optional[str] = None,
        phone: Optional[str] = None,
        linkedin_url: Optional[str] = None,
        github_url: Optional[str] = None,
        portfolio_url: Optional[str] = None,
        other_links: Optional[List[Dict[str, str]]] = None
    ):
        self.target_role = target_role
        self.total_years = total_years_val
        self.skills = skills
        self.experiences = experiences
        self.resumes = resumes
        self.candidate_name = candidate_name
        self.email = email
        self.phone = phone
        self.linkedin_url = linkedin_url
        self.github_url = github_url
        self.portfolio_url = portfolio_url
        self.other_links = other_links or []

    def to_dict(self) -> Dict[str, Any]:
        return {
            "targetRole": self.target_role,
            "totalYears": self.total_years,
            "skills": self.skills,
            "experiences": self.experiences,
            "resumes": self.resumes,
            "candidateName": self.candidate_name,
            "email": self.email,
            "phone": self.phone,
            "linkedinUrl": self.linkedin_url,
            "githubUrl": self.github_url,
            "portfolioUrl": self.portfolio_url,
            "otherLinks": self.other_links
        }

def build_candidate_context(db: Session, user_id: str, preset_id: Optional[str] = None) -> CandidateContext:
    """
    Assembles candidate experiences, skills, and resume metadata filtered by preset or combined across all CVs.
    """
    resume_ids: List[str] = []
    include_manual: bool = True
    target_role: Optional[str] = None

    if preset_id and preset_id != "all":
        preset = db.query(Preset).filter(Preset.id == preset_id, Preset.user_id == user_id).first()
        if preset:
            include_manual = preset.include_manual
            target_role = preset.target_role
            links = db.query(PresetResume).filter(PresetResume.preset_id == preset.id).all()
            resume_ids = [l.resume_id for l in links]

    if not resume_ids:
        all_resumes = db.query(Resume).filter(Resume.user_id == user_id, Resume.is_archived == False).all()
        resume_ids = [r.id for r in all_resumes]

    # Query Resume metadata
    resumes_query = db.query(Resume).filter(Resume.user_id == user_id, Resume.id.in_(resume_ids)).all() if resume_ids else []
    resume_list = [
        {
            "id": r.id,
            "title": r.title,
            "roleCategory": r.role_category or r.target_role,
            "fileName": r.file_name
        }
        for r in resumes_query
    ]

    # Query Skills
    skills_query = db.query(ProfileSkill).filter(ProfileSkill.user_id == user_id)
    if resume_ids:
        skill_ids_from_resumes = [
            row[0] for row in db.query(SkillSource.skill_id).filter(SkillSource.resume_id.in_(resume_ids)).distinct().all()
        ]
        if include_manual:
            skills = skills_query.filter(
                (ProfileSkill.id.in_(skill_ids_from_resumes)) | (ProfileSkill.source == "manual")
            ).all()
        else:
            skills = skills_query.filter(ProfileSkill.id.in_(skill_ids_from_resumes)).all()
    else:
        skills = skills_query.all() if include_manual else []

    skill_names = [s.name for s in skills]

    # Fallback to CareerProfile skills if user has no ProfileSkill rows yet
    if not skill_names:
        prof = db.query(CareerProfile).filter(CareerProfile.user_id == user_id).first()
        if prof and prof.skills_list:
            skill_names = [str(x) for x in prof.skills_list if str(x)]

    # Query Experiences
    exp_query = db.query(ProfileExperience).filter(ProfileExperience.user_id == user_id)
    if resume_ids:
        exp_ids_from_resumes = [
            row[0] for row in db.query(ExperienceSource.experience_id).filter(ExperienceSource.resume_id.in_(resume_ids)).distinct().all()
        ]
        if include_manual:
            exps = exp_query.filter(
                (ProfileExperience.id.in_(exp_ids_from_resumes)) | (ProfileExperience.source == "manual")
            ).order_by(ProfileExperience.start_year.desc()).all()
        else:
            exps = exp_query.filter(ProfileExperience.id.in_(exp_ids_from_resumes)).order_by(ProfileExperience.start_year.desc()).all()
    else:
        exps = exp_query.order_by(ProfileExperience.start_year.desc()).all() if include_manual else []

    exp_list = [
        {
            "id": e.id,
            "jobTitle": e.job_title,
            "company": e.company,
            "industry": e.industry,
            "startYear": e.start_year,
            "startMonth": e.start_month,
            "endYear": e.end_year,
            "endMonth": e.end_month,
            "isCurrent": e.is_current,
            "description": e.description,
            "highlights": e.highlights or [],
            "source": e.source,
            "yearsCount": years_count(e.start_year, e.end_year, e.is_current)
        }
        for e in exps
    ]

    # Periods for total years calculation (with overlap merge)
    periods = [(e.start_year, e.end_year, e.is_current) for e in exps]
    tot_years = total_years(periods)

    prof = db.query(CareerProfile).filter(CareerProfile.user_id == user_id).first()
    user_rec = db.query(User).filter(User.id == user_id).first()

    if not target_role and prof and prof.target_title:
        target_role = prof.target_title

    candidate_name = user_rec.full_name if user_rec else None
    email = user_rec.email if user_rec else None
    phone = prof.phone if prof else None
    linkedin_url = prof.linkedin_url if prof else None
    github_url = prof.github_url if prof else None
    portfolio_url = prof.portfolio_url if prof else None
    other_links = prof.other_links if prof else []

    return CandidateContext(
        target_role=target_role,
        total_years_val=tot_years,
        skills=skill_names,
        experiences=exp_list,
        resumes=resume_list,
        candidate_name=candidate_name,
        email=email,
        phone=phone,
        linkedin_url=linkedin_url,
        github_url=github_url,
        portfolio_url=portfolio_url,
        other_links=other_links
    )

def context_to_prompt_text(ctx: CandidateContext) -> str:
    lines = []
    if ctx.candidate_name:
        lines.append(f"Candidate Name: {ctx.candidate_name}")
    if ctx.email:
        lines.append(f"Email: {ctx.email}")
    if ctx.phone:
        lines.append(f"Phone: {ctx.phone}")
    if ctx.github_url:
        lines.append(f"GitHub: {ctx.github_url}")
    if ctx.portfolio_url:
        lines.append(f"Portfolio: {ctx.portfolio_url}")
    if ctx.linkedin_url:
        lines.append(f"LinkedIn: {ctx.linkedin_url}")
    if ctx.target_role:
        lines.append(f"Target role: {ctx.target_role}")
    lines.append(f"Total experience: {ctx.total_years} years (overlapping jobs counted once)")
    lines.append(f"Skills: {', '.join(ctx.skills) if ctx.skills else 'None listed'}")
    lines.append("Work Experience:")
    for e in ctx.experiences:
        end_str = "Present" if e["isCurrent"] else str(e["endYear"] or e["startYear"])
        industry_str = f", {e['industry']}" if e.get("industry") else ""
        lines.append(f"- {e['jobTitle']} at {e['company']} ({e['startYear']} to {end_str}){industry_str}")
        if e.get("description"):
            lines.append(f"  Summary: {e['description']}")
        for h in e.get("highlights", []):
            lines.append(f"  * {h}")
    if ctx.resumes:
        lines.append("Included CVs: " + "; ".join(f"{r['title']} ({r['roleCategory'] or 'General'})" for r in ctx.resumes))
    return "\n".join(lines)
