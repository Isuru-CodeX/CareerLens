from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.dependencies import get_current_user, log_audit
from app.models.models import User, Resume, AIUsageRecord, GeneratedDraft, CareerProfile, Preset
from app.schemas.schemas import (
    RewriteRequest, RewriteResponse, CoverLetterRequest, CoverLetterResponse,
    InterviewQuestionsRequest, InterviewQuestionsResponse
)
from app.services.ai_service import AIService
from app.services.activity_service import record_user_activity

router = APIRouter(prefix="/ai", tags=["AI Writing Assistant"])

@router.post("/rewrite", response_model=RewriteResponse)
def rewrite_content(
    req: RewriteRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if not req.text.strip():
        raise HTTPException(status_code=400, detail="Text cannot be empty.")

    res = AIService.rewrite_content(
        text=req.text,
        rewrite_type=req.rewrite_type,
        target_role=req.target_role,
        job_description=req.job_description
    )

    # Save draft record
    draft = GeneratedDraft(
        user_id=current_user.id,
        draft_type=req.rewrite_type,
        title=f"Rewrite: {req.rewrite_type}",
        original_content=req.text,
        generated_content=res["improved"],
        diff_summary={"changes": res["changes"]}
    )
    db.add(draft)

    # Record AI Usage
    usage = AIUsageRecord(
        user_id=current_user.id,
        action_type=f"rewrite_{req.rewrite_type}",
        tokens_used=len(req.text.split()) + len(res["improved"].split())
    )
    db.add(usage)
    db.commit()

    log_audit(db, current_user.id, "AI_REWRITE_PERFORMED", {"type": req.rewrite_type})
    return res

@router.post("/cover-letter", response_model=CoverLetterResponse)
def generate_cover_letter(
    req: CoverLetterRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    target_rid = (req.resume_id or "all").strip()
    target_resumes: List[Resume] = []

    if target_rid == "all":
        target_resumes = db.query(Resume).filter(
            Resume.user_id == current_user.id
        ).order_by(Resume.created_at.desc()).all()
        if not target_resumes:
            raise HTTPException(status_code=404, detail="No resumes found in your library. Please upload a resume first.")

    elif target_rid.startswith("preset:"):
        preset_id = target_rid.replace("preset:", "")
        preset = db.query(Preset).filter(
            Preset.id == preset_id,
            Preset.user_id == current_user.id
        ).first()
        r_ids = [pr.resume_id for pr in preset.resumes] if (preset and preset.resumes) else []
        if r_ids:
            target_resumes = db.query(Resume).filter(
                Resume.id.in_(r_ids),
                Resume.user_id == current_user.id
            ).all()
        if not target_resumes:
            target_resumes = db.query(Resume).filter(Resume.user_id == current_user.id).all()
        if not target_resumes:
            raise HTTPException(status_code=404, detail="No resumes found for this preset.")

    elif target_rid.startswith("resume:"):
        actual_id = target_rid.replace("resume:", "")
        single_r = db.query(Resume).filter(
            Resume.id == actual_id,
            Resume.user_id == current_user.id
        ).first()
        if not single_r:
            raise HTTPException(status_code=404, detail="Resume not found.")
        target_resumes = [single_r]

    else:
        single_r = db.query(Resume).filter(
            Resume.id == target_rid,
            Resume.user_id == current_user.id
        ).first()
        if not single_r:
            raise HTTPException(status_code=404, detail="Resume not found.")
        target_resumes = [single_r]

    resume = target_resumes[0]

    # Extract resume parts across targeted resumes
    candidate_name = current_user.full_name or "Candidate"
    skills = []
    summary = ""
    experience_highlight = ""

    seen_skills = set()
    for r in target_resumes:
        for s in r.sections:
            if s.section_type == "contact" and s.structured_data:
                if s.structured_data.get("name") and not candidate_name:
                    candidate_name = s.structured_data["name"]
            elif s.section_type == "summary" and s.structured_data and not summary:
                summary = s.structured_data.get("text", "")
            elif s.section_type == "skills" and s.structured_data:
                for item in s.structured_data.get("items", []):
                    if isinstance(item, dict) and "name" in item:
                        nm = item["name"]
                        if nm and nm.lower() not in seen_skills:
                            seen_skills.add(nm.lower())
                            skills.append(nm)
            elif s.section_type == "experience" and s.structured_data and not experience_highlight:
                items = s.structured_data.get("items", [])
                if items and isinstance(items[0], dict):
                    bullets = items[0].get("bullets", [])
                    experience_highlight = bullets[0] if bullets else items[0].get("title", "")

    # Retrieve user career profile for contact & professional links
    profile = db.query(CareerProfile).filter(CareerProfile.user_id == current_user.id).first()
    if profile and profile.skills_list:
        for sk in profile.skills_list:
            nm = sk.get("name") if isinstance(sk, dict) else str(sk)
            if nm and nm.lower() not in seen_skills:
                seen_skills.add(nm.lower())
                skills.append(nm)
    if profile and profile.summary and not summary:
        summary = profile.summary

    # Check overall contact header toggle
    if req.include_contact_header is False:
        final_name = None
        final_email = None
        final_phone = None
        final_linkedin = None
        final_github = None
        final_portfolio = None
        final_other_links = []
        include_project_links_body = False
    else:
        # Strictly respect explicit inclusion checkboxes - NEVER inject an unchecked field
        if req.include_name is False:
            final_name = None
        else:
            final_name = req.candidate_name.strip() if req.candidate_name and req.candidate_name.strip() else (current_user.full_name or candidate_name)

        if req.include_email is False:
            final_email = None
        else:
            final_email = req.email.strip() if req.email and req.email.strip() else current_user.email

        if req.include_phone is False:
            final_phone = None
        else:
            final_phone = req.phone.strip() if req.phone and req.phone.strip() else (profile.phone if profile else None)

        if req.include_linkedin is False:
            final_linkedin = None
        else:
            final_linkedin = req.linkedin_url.strip() if req.linkedin_url and req.linkedin_url.strip() else (profile.linkedin_url if profile else None)

        if req.include_github is False:
            final_github = None
        else:
            final_github = req.github_url.strip() if req.github_url and req.github_url.strip() else (profile.github_url if profile else None)

        if req.include_portfolio is False:
            final_portfolio = None
        else:
            final_portfolio = req.portfolio_url.strip() if req.portfolio_url and req.portfolio_url.strip() else (profile.portfolio_url if profile else None)

        final_other_links = req.other_links if req.other_links is not None else (profile.other_links if profile else [])
        include_project_links_body = (req.include_project_links_body is not False)

    result = AIService.generate_cover_letter(
        resume_name=final_name or "Candidate",
        resume_summary=summary,
        resume_skills=skills,
        recent_experience=experience_highlight,
        job_description=req.job_description,
        company_name=req.company_name or "Hiring Team",
        job_title=req.job_title or "Target Role",
        candidate_email=final_email,
        candidate_phone=final_phone,
        linkedin_url=final_linkedin,
        github_url=final_github,
        portfolio_url=final_portfolio,
        other_links=final_other_links,
        include_project_links_body=include_project_links_body
    )

    draft = GeneratedDraft(
        user_id=current_user.id,
        resume_id=resume.id,
        draft_type="cover_letter",
        title=f"Cover Letter - {req.company_name}",
        original_content=f"Role: {req.job_title} at {req.company_name}",
        generated_content=result["cover_letter"],
        diff_summary={"facts": result["grounded_facts_used"]}
    )
    db.add(draft)

    tokens_count = len(result["cover_letter"].split())
    usage = AIUsageRecord(
        user_id=current_user.id,
        action_type="cover_letter_generation",
        tokens_used=tokens_count,
        model_name="careerlens-writer-ai"
    )
    db.add(usage)
    db.commit()

    log_audit(db, current_user.id, "COVER_LETTER_GENERATED", {"resume_id": resume.id})

    active_contacts = []
    if final_email: active_contacts.append("Email")
    if final_phone: active_contacts.append("Phone")
    if final_github: active_contacts.append("GitHub")
    if final_portfolio: active_contacts.append("Portfolio")
    if final_linkedin: active_contacts.append("LinkedIn")

    record_user_activity(
        db,
        current_user.id,
        "cover_letter_generated",
        f"Generated targeted cover letter for '{req.job_title or 'Target Role'}' at '{req.company_name or 'Hiring Team'}'",
        entity_type="cover_letter",
        entity_id=draft.id,
        metadata={
            "company_name": req.company_name or "Hiring Team",
            "job_title": req.job_title or "Target Role",
            "tokens_used": tokens_count,
            "model_name": "careerlens-writer-ai",
            "contact_fields_included": active_contacts,
            "include_project_links_body": include_project_links_body,
            "estimated_duration_seconds": 14.5,
            "word_count": tokens_count
        }
    )

    return result

@router.post("/interview-prep", response_model=InterviewQuestionsResponse)
def generate_interview_prep(
    req: InterviewQuestionsRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    skills = []
    if req.resume_id:
        resume = db.query(Resume).filter(
            Resume.id == req.resume_id,
            Resume.user_id == current_user.id
        ).first()
        if resume:
            skills_sec = next((s for s in resume.sections if s.section_type == "skills"), None)
            if skills_sec and skills_sec.structured_data:
                skills = [i.get("name") for i in skills_sec.structured_data.get("items", []) if isinstance(i, dict)]

    questions = AIService.generate_interview_questions(
        job_description=req.job_description,
        target_role=req.target_role,
        candidate_skills=skills
    )

    log_audit(db, current_user.id, "INTERVIEW_PREP_GENERATED")

    record_user_activity(
        db, current_user.id, "interview_practice_completed",
        f"Generated interview prep questions for '{req.target_role or 'Interview Preparation'}'",
        entity_type="interview", entity_id=req.resume_id
    )

    return {"questions": questions}

