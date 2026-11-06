from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.dependencies import get_current_user, log_audit
from app.models.models import User, Resume, AIUsageRecord, GeneratedDraft, CareerProfile
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
    resume = db.query(Resume).filter(
        Resume.id == req.resume_id,
        Resume.user_id == current_user.id
    ).first()
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found.")

    # Extract resume parts
    candidate_name = current_user.full_name or "Candidate"
    skills = []
    summary = ""
    experience_highlight = ""

    for s in resume.sections:
        if s.section_type == "contact" and s.structured_data:
            if s.structured_data.get("name"):
                candidate_name = s.structured_data["name"]
        elif s.section_type == "summary" and s.structured_data:
            summary = s.structured_data.get("text", "")
        elif s.section_type == "skills" and s.structured_data:
            skills = [item.get("name") for item in s.structured_data.get("items", []) if isinstance(item, dict) and "name" in item]
        elif s.section_type == "experience" and s.structured_data:
            items = s.structured_data.get("items", [])
            if items and isinstance(items[0], dict):
                bullets = items[0].get("bullets", [])
                experience_highlight = bullets[0] if bullets else items[0].get("title", "")

    # Retrieve user career profile for contact & professional links
    profile = db.query(CareerProfile).filter(CareerProfile.user_id == current_user.id).first()

    final_name = req.candidate_name if req.candidate_name is not None else (current_user.full_name or candidate_name)
    final_email = req.email if req.email is not None else current_user.email
    final_phone = req.phone
    final_linkedin = req.linkedin_url
    final_github = req.github_url
    final_portfolio = req.portfolio_url
    final_other_links = req.other_links

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
        include_project_links_body=(req.include_project_links_body is not False)
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

    usage = AIUsageRecord(
        user_id=current_user.id,
        action_type="cover_letter_generation",
        tokens_used=len(result["cover_letter"].split())
    )
    db.add(usage)
    db.commit()

    log_audit(db, current_user.id, "COVER_LETTER_GENERATED", {"resume_id": resume.id})

    record_user_activity(
        db, current_user.id, "cover_letter_generated",
        f"Generated targeted cover letter for '{req.job_title or 'Target Role'}' at '{req.company_name or 'Hiring Team'}'",
        entity_type="cover_letter", entity_id=draft.id
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

