import os
import uuid
import logging
from typing import List, Optional, Dict, Any
from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status, Response
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from app.core.config import settings
from app.core.database import get_db
from app.core.dependencies import get_current_user, log_audit
from app.models.models import (
    User, Resume, ResumeVersion, ParsedResumeSection, ResumeSkill, ResumeExperience, AnalysisRun, Recommendation,
    CareerProfile, ProfileExperience, ProfileSkill, ExperienceSource, SkillSource
)
from app.schemas.schemas import (
    ResumeOut, ParsedSectionOut, ParsedSectionUpdate, AnalysisRunOut,
    ResumeTailorRequest, ResumeTailorResponse,
    CreateResumeFromProfileRequest, SyncResumeFromProfileRequest
)
from app.services.tailor_service import TailorService
from app.services.parsing_service import ParsingService
from app.services.analysis_service import AnalysisService
from app.services.pdf_service import PDFService
from app.services.activity_service import record_user_activity
from app.services.experience_intelligence_service import ExperienceIntelligenceService
from app.services.cv_extraction_service import (
    find_cv_photo, normalize_phone_number, CvDataSchema, heuristic_extract_cv, ExtractedContent
)
from app.services.location_service import enrich_address_data, suggest_industry_domain
from app.services.years_service import split_compound_skills, canonical_skill

logger = logging.getLogger("careerlens.resumes")

router = APIRouter(prefix="/resumes", tags=["Resumes"])

ALLOWED_EXTENSIONS = {".pdf", ".docx", ".doc", ".txt", ".md"}

@router.post("/upload", response_model=ResumeOut)
async def upload_resume(
    file: UploadFile = File(...),
    title: Optional[str] = Form(None),
    target_role: Optional[str] = Form(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Validate extension
    file_ext = os.path.splitext(file.filename)[1].lower()
    if file_ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file format '{file_ext}'. Allowed formats: PDF, DOCX, TXT."
        )

    # Read content & check size limit
    content = await file.read()
    if len(content) > settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File exceeds maximum allowed size of {settings.MAX_UPLOAD_SIZE_MB}MB."
        )

    # Save to private storage with safe UUID name
    safe_file_name = f"{uuid.uuid4()}{file_ext}"
    saved_path = os.path.join(settings.RESOLVED_UPLOAD_DIR, safe_file_name)
    with open(saved_path, "wb") as f:
        f.write(content)

    # Extract text and parse
    raw_text = ParsingService.extract_text_from_file(saved_path, file_ext)
    parsed_data = ParsingService.parse_resume(raw_text)

    doc_title = title or os.path.splitext(file.filename)[0]
    resume = Resume(
        user_id=current_user.id,
        title=doc_title,
        target_role=target_role or "Software Engineer / Professional",
        file_name=file.filename,
        file_path=saved_path,
        file_size=len(content),
        file_type=file_ext.replace(".", ""),
        raw_text=raw_text
    )
    db.add(resume)
    db.flush()

    # Initial Version
    version = ResumeVersion(
        resume_id=resume.id,
        version_number=1,
        label=f"Uploaded Original - {target_role or 'General'}",
        raw_text=raw_text,
        structured_snapshot=parsed_data
    )
    db.add(version)

    # Create Parsed Sections
    section_map = [
        ("contact", "Contact Information", parsed_data.get("contact")),
        ("summary", "Professional Summary", {"text": parsed_data.get("summary")}),
        ("experience", "Work Experience", {"items": parsed_data.get("experience")}),
        ("education", "Education", {"items": parsed_data.get("education")}),
        ("skills", "Core Competencies", {"items": parsed_data.get("skills")}),
        ("projects", "Projects", {"items": parsed_data.get("projects")}),
        ("certifications", "Certifications & Credentials", {"items": parsed_data.get("certifications")}),
    ]

    for sec_type, label, data in section_map:
        section = ParsedResumeSection(
            resume_id=resume.id,
            section_type=sec_type,
            raw_content=str(data),
            structured_data=data or {},
            is_user_verified=False
        )
        db.add(section)

    # Save skills records
    for skill_info in parsed_data.get("skills", []):
        rs = ResumeSkill(
            resume_id=resume.id,
            skill_name=skill_info.get("name", "Skill"),
            proficiency_level=skill_info.get("proficiency", "Proficient"),
            evidence_snippet=skill_info.get("evidence", "")
        )
        db.add(rs)

    # Immediately perform ATS analysis on uploaded CV
    parsed_representation = {
        "contact": parsed_data.get("contact", {}),
        "summary": parsed_data.get("summary", ""),
        "experience": parsed_data.get("experience", []),
        "education": parsed_data.get("education", []),
        "skills": parsed_data.get("skills", []),
        "projects": parsed_data.get("projects", []),
        "certifications": parsed_data.get("certifications", []),
    }
    analysis_res = AnalysisService.analyze_resume(parsed_representation, raw_text or "")
    analysis = AnalysisRun(
        user_id=current_user.id,
        resume_id=resume.id,
        overall_score=analysis_res["overall_score"],
        structure_score=analysis_res["structure_score"],
        readability_score=analysis_res["readability_score"],
        impact_score=analysis_res["impact_score"],
        skills_score=analysis_res["skills_score"],
        findings=analysis_res["findings"],
        vague_phrases=analysis_res["vague_phrases"],
        strengths=analysis_res["strengths"],
        weaknesses=analysis_res["weaknesses"],
        recommendations=analysis_res["recommendations"],
        section_breakdown=analysis_res["section_breakdown"]
    )
    db.add(analysis)
    db.flush()

    for rec in analysis_res.get("recommendations", []):
        r_item = Recommendation(
            analysis_run_id=analysis.id,
            category=rec.get("category", "general"),
            title=rec.get("title", "Recommendation"),
            description=rec.get("description", ""),
            priority=rec.get("priority", "medium")
        )
        db.add(r_item)

    # Sync detected contact information to user profile if missing
    if current_user.profile and parsed_data.get("contact"):
        c_info = parsed_data["contact"]
        if not current_user.profile.phone and c_info.get("phone"):
            current_user.profile.phone = c_info["phone"]
        if not current_user.profile.linkedin_url and c_info.get("linkedin"):
            current_user.profile.linkedin_url = c_info["linkedin"]
        if not current_user.profile.github_url and c_info.get("github"):
            current_user.profile.github_url = c_info["github"]

    # Automatically extract structured experiences for Experience Intelligence
    try:
        ExperienceIntelligenceService.extract_and_save_experiences(db, resume)
    except Exception:
        pass

    db.commit()
    db.refresh(resume)
    log_audit(db, current_user.id, "RESUME_UPLOADED", {"filename": file.filename, "resume_id": resume.id})

    record_user_activity(
        db, current_user.id, "resume_uploaded",
        f"Uploaded resume '{resume.title}'",
        entity_type="resume", entity_id=resume.id
    )
    record_user_activity(
        db, current_user.id, "resume_analyzed",
        f"Analyzed resume '{resume.title}' (ATS Score: {analysis_res['overall_score']}%)",
        entity_type="resume", entity_id=resume.id
    )

    return resume

def apply_profile_to_resume(
    db: Session,
    user: User,
    resume: Resume,
    sections_to_apply: Optional[List[str]] = None
) -> Dict[str, Any]:
    profile = db.query(CareerProfile).filter(CareerProfile.user_id == user.id).first()
    if not profile:
        profile = CareerProfile(user_id=user.id)
        db.add(profile)
        db.flush()

    if not sections_to_apply:
        sections_to_apply = ["contact", "summary", "skills", "experience", "education", "target_role"]

    summary_info = {
        "target_role_updated": False,
        "contact_updated": False,
        "summary_updated": False,
        "skills_applied": 0,
        "experiences_applied": 0,
        "education_applied": 0
    }

    # 1. Target Role
    if "target_role" in sections_to_apply and profile.target_title:
        resume.target_role = profile.target_title
        summary_info["target_role_updated"] = True

    # 2. Contact Section
    if "contact" in sections_to_apply:
        contact_sec = db.query(ParsedResumeSection).filter(
            ParsedResumeSection.resume_id == resume.id,
            ParsedResumeSection.section_type == "contact"
        ).first()
        if not contact_sec:
            contact_sec = ParsedResumeSection(resume_id=resume.id, section_type="contact")
            db.add(contact_sec)

        loc_parts = [p for p in [profile.city, profile.region, profile.country] if p]
        loc_str = ", ".join(loc_parts)
        contact_dict = {
            "name": user.full_name or "Candidate",
            "email": user.email,
            "phone": profile.phone or "",
            "location": loc_str,
            "linkedin": profile.linkedin_url or "",
            "github": profile.github_url or "",
            "portfolio": profile.portfolio_url or ""
        }
        contact_sec.structured_data = contact_dict
        contact_sec.raw_content = (
            f"{contact_dict['name']}\n"
            f"Email: {contact_dict['email']} | Phone: {contact_dict['phone'] or 'N/A'} | Location: {loc_str or 'N/A'}\n"
            f"LinkedIn: {contact_dict['linkedin'] or 'N/A'} | GitHub: {contact_dict['github'] or 'N/A'}"
        )
        contact_sec.is_user_verified = True
        summary_info["contact_updated"] = True

    # 3. Summary Section
    if "summary" in sections_to_apply:
        sum_sec = db.query(ParsedResumeSection).filter(
            ParsedResumeSection.resume_id == resume.id,
            ParsedResumeSection.section_type == "summary"
        ).first()
        if not sum_sec:
            sum_sec = ParsedResumeSection(resume_id=resume.id, section_type="summary")
            db.add(sum_sec)

        sum_text = profile.summary or f"Results-driven {profile.target_title or 'Engineering Professional'} with demonstrated technical acumen, proactive ownership, and cross-functional collaboration skills."
        sum_sec.structured_data = {"text": sum_text}
        sum_sec.raw_content = sum_text
        sum_sec.is_user_verified = True
        summary_info["summary_updated"] = True

    # 4. Skills Section
    if "skills" in sections_to_apply:
        skills_sec = db.query(ParsedResumeSection).filter(
            ParsedResumeSection.resume_id == resume.id,
            ParsedResumeSection.section_type == "skills"
        ).first()
        if not skills_sec:
            skills_sec = ParsedResumeSection(resume_id=resume.id, section_type="skills")
            db.add(skills_sec)

        profile_skills = db.query(ProfileSkill).filter(ProfileSkill.user_id == user.id).all()
        skill_names = [s.name for s in profile_skills]
        if not skill_names and profile.target_title:
            skill_names = ["Problem Solving", "System Design", "Agile Methodologies"]
        skills_sec.structured_data = {
            "skills": skill_names,
            "items": [
                {
                    "name": s.name,
                    "proficiency": s.proficiency_estimate or "Intermediate",
                    "verification_status": s.verification_status or "mentioned"
                }
                for s in profile_skills
            ]
        }
        skills_sec.raw_content = ", ".join(skill_names)
        skills_sec.is_user_verified = True
        summary_info["skills_applied"] = len(skill_names)

        # Sync to resume_skills table
        existing_r_skills = {
            rs.skill_name.lower(): rs
            for rs in db.query(ResumeSkill).filter(ResumeSkill.resume_id == resume.id).all()
        }
        for s in profile_skills:
            if s.name.lower() not in existing_r_skills:
                db.add(ResumeSkill(
                    resume_id=resume.id,
                    skill_name=s.name,
                    proficiency_level=s.proficiency_estimate or "intermediate",
                    evidence_snippet=s.evidence_summary or f"Verified from candidate profile ({s.verification_status or 'mentioned'})"
                ))

    # 5. Experience Section
    if "experience" in sections_to_apply:
        exp_sec = db.query(ParsedResumeSection).filter(
            ParsedResumeSection.resume_id == resume.id,
            ParsedResumeSection.section_type == "experience"
        ).first()
        if not exp_sec:
            exp_sec = ParsedResumeSection(resume_id=resume.id, section_type="experience")
            db.add(exp_sec)

        profile_exps = db.query(ProfileExperience).filter(
            ProfileExperience.user_id == user.id
        ).order_by(ProfileExperience.start_year.desc()).all()

        exp_structured = []
        exp_lines = []
        for p_exp in profile_exps:
            period = f"{p_exp.start_year} - {'Present' if p_exp.is_current else (p_exp.end_year or 'Present')}"
            exp_structured.append({
                "job_title": p_exp.job_title,
                "company": p_exp.company,
                "period": period,
                "description": p_exp.description or "",
                "highlights": p_exp.highlights or []
            })
            exp_lines.append(f"{p_exp.job_title} | {p_exp.company} ({period})")
            if p_exp.description:
                exp_lines.append(p_exp.description)
            for h in (p_exp.highlights or []):
                exp_lines.append(f"• {h}")
            exp_lines.append("")

        exp_sec.structured_data = {"items": exp_structured}
        exp_sec.raw_content = "\n".join(exp_lines) if exp_lines else ""
        exp_sec.is_user_verified = True
        summary_info["experiences_applied"] = len(profile_exps)

        # Sync to resume_experiences table
        existing_r_exps = {
            ((re.job_title or "").lower(), (re.company or "").lower()): re
            for re in db.query(ResumeExperience).filter(ResumeExperience.resume_id == resume.id).all()
        }
        for p_exp in profile_exps:
            key = ((p_exp.job_title or "").lower(), (p_exp.company or "").lower())
            if key not in existing_r_exps:
                db.add(ResumeExperience(
                    resume_id=resume.id,
                    job_title=p_exp.job_title,
                    company=p_exp.company,
                    start_year=p_exp.start_year,
                    end_year=p_exp.end_year,
                    is_current=p_exp.is_current,
                    responsibilities=p_exp.highlights or [],
                    source_evidence=p_exp.description or f"Profile experience in {p_exp.industry}"
                ))

    # 6. Education Section
    if "education" in sections_to_apply:
        edu_sec = db.query(ParsedResumeSection).filter(
            ParsedResumeSection.resume_id == resume.id,
            ParsedResumeSection.section_type == "education"
        ).first()
        if not edu_sec:
            edu_sec = ParsedResumeSection(resume_id=resume.id, section_type="education")
            db.add(edu_sec)

        edus = profile.education_history or []
        edu_lines = []
        for ed in edus:
            if isinstance(ed, dict):
                deg = ed.get("degree", "")
                inst = ed.get("institution", "")
                yr = f"{ed.get('startYear', '')} - {ed.get('endYear', '')}".strip(" -")
                edu_lines.append(f"{deg} | {inst} ({yr})")
                if ed.get("highlights"):
                    edu_lines.append(f"• {ed.get('highlights')}")
        edu_sec.structured_data = {"items": edus}
        edu_sec.raw_content = "\n".join(edu_lines) if edu_lines else ""
        edu_sec.is_user_verified = True
        summary_info["education_applied"] = len(edus)

    db.flush()

    # Reconstruct raw_text
    all_sections = db.query(ParsedResumeSection).filter(
        ParsedResumeSection.resume_id == resume.id
    ).all()
    sec_map = {s.section_type: s.raw_content for s in all_sections if s.raw_content}

    text_parts = [
        sec_map.get("contact", f"{user.full_name}\nEmail: {user.email}"),
        "",
        "PROFESSIONAL SUMMARY",
        sec_map.get("summary", profile.summary or "Professional with software engineering expertise."),
        "",
        "TECHNICAL SKILLS",
        sec_map.get("skills", "Python, React, TypeScript, SQL"),
        "",
        "WORK EXPERIENCE",
        sec_map.get("experience", "Software Engineer"),
        "",
        "EDUCATION",
        sec_map.get("education", "B.S. in Computer Science")
    ]
    resume.raw_text = "\n".join([t for t in text_parts if t is not None])

    # Rewrite text file if file_type is txt
    if resume.file_path and os.path.exists(resume.file_path) and resume.file_type == "txt":
        try:
            with open(resume.file_path, "w", encoding="utf-8") as f:
                f.write(resume.raw_text)
            resume.file_size = len(resume.raw_text.encode("utf-8"))
        except Exception as e:
            logger.warning(f"Failed to rewrite resume text file {resume.id}: {e}")

    # Version tracking
    new_ver_num = len(resume.versions) + 1 if resume.versions else 1
    db.add(ResumeVersion(
        resume_id=resume.id,
        version_number=new_ver_num,
        label="Synced from Profile Details"
    ))

    db.commit()
    db.refresh(resume)
    return summary_info

@router.post("/create-from-profile", response_model=ResumeOut)
def create_resume_from_profile(
    payload: Optional[CreateResumeFromProfileRequest] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Generates a new resume document directly populated from the candidate's verified profile details.
    """
    profile = db.query(CareerProfile).filter(CareerProfile.user_id == current_user.id).first()
    target_role = (payload.target_role if payload and payload.target_role else None) or (profile.target_title if profile and profile.target_title else "Software Professional")
    title = (payload.title if payload and payload.title else None) or f"{current_user.full_name or 'Profile'} - {target_role} Resume"

    file_id = uuid.uuid4().hex[:12]
    filename = f"resume_profile_{file_id}.txt"
    file_path = os.path.join(settings.RESOLVED_UPLOAD_DIR, filename)

    initial_text = f"{current_user.full_name or 'Candidate'}\n{target_role}\nEmail: {current_user.email}\n"
    os.makedirs(settings.RESOLVED_UPLOAD_DIR, exist_ok=True)
    with open(file_path, "w", encoding="utf-8") as f:
        f.write(initial_text)

    resume = Resume(
        user_id=current_user.id,
        title=title,
        target_role=target_role,
        file_name=filename,
        file_path=file_path,
        file_size=len(initial_text.encode("utf-8")),
        file_type="txt",
        raw_text=initial_text
    )
    db.add(resume)
    db.commit()
    db.refresh(resume)

    apply_profile_to_resume(db, current_user, resume)

    # Initial analysis
    try:
        parsed_representation = {
            "contact": {
                "name": current_user.full_name or "Candidate",
                "email": current_user.email,
                "phone": profile.phone if profile else ""
            },
            "summary": profile.summary if profile and profile.summary else (resume.target_role or ""),
            "experience": [e.company for e in resume.experiences],
            "education": profile.education_history if profile and profile.education_history else [],
            "skills": [s.skill_name for s in resume.skills],
            "projects": [],
            "certifications": []
        }
        analysis_res = AnalysisService.analyze_resume(parsed_representation, resume.raw_text or "")
        analysis_run = AnalysisRun(
            resume_id=resume.id,
            user_id=current_user.id,
            structure_score=analysis_res["structure_score"],
            readability_score=analysis_res["readability_score"],
            impact_score=analysis_res["impact_score"],
            skills_score=analysis_res["skills_score"],
            overall_score=analysis_res["overall_score"],
            findings=analysis_res.get("findings", []),
            vague_phrases=analysis_res.get("vague_phrases", []),
            strengths=analysis_res.get("strengths", []),
            weaknesses=analysis_res.get("weaknesses", []),
            recommendations=analysis_res.get("recommendations", []),
            section_breakdown=analysis_res.get("section_breakdown", {})
        )
        db.add(analysis_run)
        db.commit()
    except Exception as e:
        logger.warning(f"Error analyzing created resume: {e}")

    db.refresh(resume)
    record_user_activity(
        db, current_user.id, "resume_uploaded",
        f"Generated resume '{resume.title}' from verified profile details",
        entity_type="resume", entity_id=resume.id
    )
    log_audit(db, current_user.id, "RESUME_CREATED_FROM_PROFILE", {"resume_id": resume.id})

    return resume

@router.get("", response_model=List[ResumeOut])
def list_resumes(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    resumes = db.query(Resume).filter(
        Resume.user_id == current_user.id,
        Resume.is_archived == False
    ).order_by(Resume.created_at.desc()).all()
    for r in resumes:
        r.can_preview = bool(r.file_type.lower() == "pdf" or r.preview_path or (r.file_name or "").lower().endswith(".pdf"))
    return resumes

@router.get("/{resume_id}", response_model=ResumeOut)
def get_resume(
    resume_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    resume = db.query(Resume).filter(
        Resume.id == resume_id,
        Resume.user_id == current_user.id
    ).first()
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found.")
    resume.can_preview = bool(resume.file_type.lower() == "pdf" or resume.preview_path or (resume.file_name or "").lower().endswith(".pdf"))
    return resume

@router.post("/{resume_id}/parse", response_model=ResumeOut)
def reparse_resume(
    resume_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    resume = db.query(Resume).filter(Resume.id == resume_id, Resume.user_id == current_user.id).first()
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found.")

    file_path = resume.file_path
    if not file_path or not os.path.exists(file_path):
        candidate = os.path.join(settings.RESOLVED_UPLOAD_DIR, os.path.basename(file_path or ""))
        if os.path.exists(candidate):
            file_path = candidate

    if file_path and os.path.exists(file_path):
        raw_text = ParsingService.extract_text_from_file(file_path, resume.file_type)
    else:
        raw_text = resume.raw_text or ""
    parsed_data = ParsingService.parse_resume(raw_text)

    # Update sections
    sections = db.query(ParsedResumeSection).filter(ParsedResumeSection.resume_id == resume.id).all()
    for s in sections:
        if s.section_type == "contact":
            s.structured_data = parsed_data.get("contact", {})
        elif s.section_type == "summary":
            s.structured_data = {"text": parsed_data.get("summary", "")}
        elif s.section_type == "experience":
            s.structured_data = {"items": parsed_data.get("experience", [])}
        elif s.section_type == "education":
            s.structured_data = {"items": parsed_data.get("education", [])}
        elif s.section_type == "skills":
            s.structured_data = {"items": parsed_data.get("skills", [])}

    db.commit()
    db.refresh(resume)
    return resume

@router.patch("/{resume_id}/sections/{section_id}", response_model=ParsedSectionOut)
def update_section(
    resume_id: str,
    section_id: str,
    data: ParsedSectionUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    resume = db.query(Resume).filter(Resume.id == resume_id, Resume.user_id == current_user.id).first()
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found.")
        
    section = db.query(ParsedResumeSection).filter(
        ParsedResumeSection.id == section_id,
        ParsedResumeSection.resume_id == resume.id
    ).first()
    if not section:
        raise HTTPException(status_code=404, detail="Section not found.")
        
    if data.structured_data is not None:
        section.structured_data = data.structured_data
    if data.raw_content is not None:
        section.raw_content = data.raw_content
    section.is_user_verified = True
    
    db.commit()
    db.refresh(section)
    return section

@router.post("/{resume_id}/analyse", response_model=AnalysisRunOut)
def analyse_resume(
    resume_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    resume = db.query(Resume).filter(Resume.id == resume_id, Resume.user_id == current_user.id).first()
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found.")

    # Reconstruct parsed representation
    sections = {s.section_type: s.structured_data for s in resume.sections}
    parsed_representation = {
        "contact": sections.get("contact", {}),
        "summary": sections.get("summary", {}).get("text", ""),
        "experience": sections.get("experience", {}).get("items", []),
        "education": sections.get("education", {}).get("items", []),
        "skills": sections.get("skills", {}).get("items", []),
        "projects": sections.get("projects", {}).get("items", []),
        "certifications": sections.get("certifications", {}).get("items", []),
    }

    result = AnalysisService.analyze_resume(parsed_representation, resume.raw_text or "")

    analysis = AnalysisRun(
        user_id=current_user.id,
        resume_id=resume.id,
        overall_score=result["overall_score"],
        structure_score=result["structure_score"],
        readability_score=result["readability_score"],
        impact_score=result["impact_score"],
        skills_score=result["skills_score"],
        findings=result["findings"],
        vague_phrases=result["vague_phrases"],
        strengths=result["strengths"],
        weaknesses=result["weaknesses"],
        recommendations=result["recommendations"],
        section_breakdown=result["section_breakdown"]
    )
    db.add(analysis)
    db.flush()

    # Create individual recommendation records
    for rec in result["recommendations"]:
        r_item = Recommendation(
            analysis_run_id=analysis.id,
            category=rec.get("category", "general"),
            title=rec.get("title", "Recommendation"),
            description=rec.get("description", ""),
            priority=rec.get("priority", "medium")
        )
        db.add(r_item)

    db.commit()
    db.refresh(analysis)
    log_audit(db, current_user.id, "ANALYSIS_RUN_EXECUTED", {"resume_id": resume.id, "score": analysis.overall_score})

    record_user_activity(
        db, current_user.id, "resume_analyzed",
        f"Ran ATS analysis on '{resume.title}' (Score: {result['overall_score']}%)",
        entity_type="resume", entity_id=resume.id
    )

    return analysis

@router.get("/{resume_id}/analyses", response_model=List[AnalysisRunOut])
def get_resume_analyses(
    resume_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    analyses = db.query(AnalysisRun).filter(
        AnalysisRun.resume_id == resume_id,
        AnalysisRun.user_id == current_user.id
    ).order_by(AnalysisRun.created_at.desc()).all()
    return analyses

@router.get("/{resume_id}/analyses/{analysis_id}/pdf")
def download_analysis_pdf(
    resume_id: str,
    analysis_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    analysis = db.query(AnalysisRun).filter(
        AnalysisRun.id == analysis_id,
        AnalysisRun.resume_id == resume_id,
        AnalysisRun.user_id == current_user.id
    ).first()
    if not analysis:
        raise HTTPException(status_code=404, detail="Analysis report not found.")

    resume = db.query(Resume).filter(Resume.id == resume_id).first()

    pdf_bytes = PDFService.generate_analysis_report(
        resume_title=resume.title if resume else "Resume",
        overall_score=analysis.overall_score,
        structure_score=analysis.structure_score,
        readability_score=analysis.readability_score,
        impact_score=analysis.impact_score,
        skills_score=analysis.skills_score,
        strengths=analysis.strengths or [],
        weaknesses=analysis.weaknesses or [],
        recommendations=analysis.recommendations or [],
        vague_phrases=analysis.vague_phrases or []
    )

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=CareerLens_Analysis_{analysis.id[:8]}.pdf"}
    )

@router.get("/{resume_id}/file")
def get_resume_file(
    resume_id: str,
    disposition: str = "inline",
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    from urllib.parse import quote
    resume = db.query(Resume).filter(
        Resume.id == resume_id,
        Resume.user_id == current_user.id
    ).first()
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found.")

    file_path = resume.file_path
    if not file_path or not os.path.exists(file_path):
        candidate = os.path.join(settings.RESOLVED_UPLOAD_DIR, os.path.basename(file_path or ""))
        if os.path.exists(candidate):
            file_path = candidate
        else:
            raise HTTPException(status_code=404, detail="File not found on storage.")

    is_pdf = resume.file_type.lower() == "pdf" or (resume.file_name or "").lower().endswith(".pdf")

    if disposition == "inline" and not is_pdf:
        if resume.preview_path and os.path.exists(resume.preview_path):
            file_path = resume.preview_path
            is_pdf = True
        else:
            disposition = "attachment"

    media_type = "application/pdf" if is_pdf else "application/octet-stream"
    disp_header = "inline" if disposition == "inline" else "attachment"
    safe_name = resume.file_name

    headers = {
        "Content-Disposition": f"{disp_header}; filename*=UTF-8''{quote(safe_name)}",
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "private, no-store",
    }
    if is_pdf and disposition == "inline":
        headers["Content-Security-Policy"] = "sandbox"

    return FileResponse(
        path=file_path,
        media_type=media_type,
        headers=headers
    )


@router.get("/{resume_id}/download")
def download_resume_file(
    resume_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return get_resume_file(resume_id=resume_id, disposition="attachment", current_user=current_user, db=db)

@router.delete("/{resume_id}")
def delete_resume(
    resume_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    resume = db.query(Resume).filter(
        Resume.id == resume_id,
        Resume.user_id == current_user.id
    ).first()
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found.")

    file_path = resume.file_path
    if not file_path or not os.path.exists(file_path):
        candidate = os.path.join(settings.RESOLVED_UPLOAD_DIR, os.path.basename(file_path or ""))
        if os.path.exists(candidate):
            file_path = candidate

    if file_path and os.path.exists(file_path):
        try:
            os.remove(file_path)
        except Exception:
            pass

    db.delete(resume)
    db.commit()
    log_audit(db, current_user.id, "RESUME_DELETED", {"resume_id": resume_id})
    return {"message": "Resume successfully deleted."}

@router.post("/{resume_id}/sync-to-profile")
async def sync_resume_to_profile(
    resume_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    resume = db.query(Resume).filter(
        Resume.id == resume_id,
        Resume.user_id == current_user.id
    ).first()
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found.")

    profile = db.query(CareerProfile).filter(CareerProfile.user_id == current_user.id).first()
    if not profile:
        profile = CareerProfile(user_id=current_user.id)
        db.add(profile)
        db.flush()

    parsed_dict = resume.parsed_json or {}
    cv_data: Optional[CvDataSchema] = None
    if parsed_dict:
        try:
            cv_data = CvDataSchema(**parsed_dict)
        except Exception:
            pass
    if not cv_data and resume.raw_text:
        cv_data = heuristic_extract_cv(ExtractedContent(text=resume.raw_text, links=[]))

    summary_info = {
        "photo_extracted": False,
        "phone_updated": False,
        "address_enriched": False,
        "industry_suggested": None,
        "education_added": 0,
        "experiences_added": 0,
        "skills_added": 0
    }

    # 1. Profile photo extraction (auto-crop, CMYK correct, non-black avatar)
    if resume.file_path and os.path.exists(resume.file_path):
        try:
            photo_bytes = find_cv_photo(resume.file_path, resume.file_type)
            if photo_bytes:
                avatars_dir = os.path.join(settings.RESOLVED_UPLOAD_DIR, "avatars")
                os.makedirs(avatars_dir, exist_ok=True)
                avatar_filename = f"avatar_{current_user.id}_{uuid.uuid4().hex[:8]}.jpg"
                avatar_disk_path = os.path.join(avatars_dir, avatar_filename)
                with open(avatar_disk_path, "wb") as f_av:
                    f_av.write(photo_bytes)
                current_user.avatar_path = avatar_disk_path
                current_user.avatar_url = f"/api/users/me/avatar?v={uuid.uuid4().hex[:6]}"
                current_user.avatar_source = "cv"
                summary_info["photo_extracted"] = True
        except Exception as e:
            logger.warning(f"Error extracting photo from CV {resume.id}: {e}")

    # 2. Contact details: phone & address
    if cv_data:
        if cv_data.phone:
            norm_phone = normalize_phone_number(cv_data.phone)
            if norm_phone:
                profile.phone = norm_phone
                summary_info["phone_updated"] = True

        # Address enrichment
        addr_line = cv_data.address.line1 or ""
        city = cv_data.address.city or ""
        country = cv_data.address.country or ""
        postal = cv_data.address.postalCode or ""
        region = cv_data.address.region or ""

        search_query = ", ".join(filter(bool, [addr_line, city, region, country]))
        if search_query:
            try:
                enr = await enrich_address_data(
                    raw_address_or_line1=addr_line,
                    city=city,
                    region=region,
                    postal_code=postal,
                    country=country
                )
                profile.address_line1 = addr_line or enr.get("address_line1")
                profile.city = enr.get("city") or city
                profile.region = enr.get("region") or region
                profile.postal_code = enr.get("postal_code") or postal
                profile.country = enr.get("country") or country
                summary_info["address_enriched"] = True
            except Exception:
                profile.address_line1 = addr_line
                profile.city = city
                profile.region = region
                profile.postal_code = postal
                profile.country = country

        # 3. Target Role & Industry Domain
        if resume.target_role or cv_data.roleCategory:
            target_role = resume.target_role or cv_data.roleCategory
            profile.target_title = target_role
            suggested_ind = suggest_industry_domain(target_role=target_role, skills=cv_data.skills)
            profile.target_industry = suggested_ind
            summary_info["industry_suggested"] = suggested_ind

        # Links
        if cv_data.links:
            if cv_data.links.linkedin:
                profile.linkedin_url = cv_data.links.linkedin
            if cv_data.links.github:
                profile.github_url = cv_data.links.github
            if cv_data.links.portfolio:
                profile.portfolio_url = cv_data.links.portfolio

        # 4. Education History with preset mapping
        if cv_data.education:
            current_edus = profile.education_history or []
            existing_signatures = {
                f"{e.get('degree', '').lower().strip()}_{e.get('institution', '').lower().strip()}"
                for e in current_edus if isinstance(e, dict)
            }
            new_edus = list(current_edus)
            for item in cv_data.education:
                sig = f"{item.degree.lower().strip()}_{item.institution.lower().strip()}"
                if sig in existing_signatures:
                    continue
                deg_lower = item.degree.lower()
                if any(k in deg_lower for k in ["diploma", "associate", "hnd"]):
                    cat = "diploma"
                elif any(k in deg_lower for k in ["school", "secondary", "high school"]):
                    cat = "school"
                elif any(k in deg_lower for k in ["course", "cert", "bootcamp"]):
                    cat = "course"
                else:
                    cat = "university"

                new_edus.append({
                    "id": f"edu_{uuid.uuid4().hex[:8]}",
                    "presetType": cat,
                    "institution": item.institution,
                    "degree": item.degree,
                    "fieldOfStudy": item.fieldOfStudy or "",
                    "startYear": item.startYear or 2021,
                    "endYear": item.endYear or 2025,
                    "grade": item.grade or "",
                    "highlights": "\n".join(item.highlights) if isinstance(item.highlights, list) else str(item.highlights or "")
                })
                existing_signatures.add(sig)
                summary_info["education_added"] += 1
            profile.education_history = new_edus

        # 5. Work Experience History
        if cv_data.experience:
            for exp in cv_data.experience:
                existing = db.query(ProfileExperience).filter(
                    ProfileExperience.user_id == current_user.id,
                    ProfileExperience.job_title == exp.jobTitle,
                    ProfileExperience.company == exp.company
                ).first()
                if not existing:
                    exp_ind = exp.industry if exp.industry and exp.industry != "Other" else suggest_industry_domain(target_role=exp.jobTitle)
                    new_exp = ProfileExperience(
                        user_id=current_user.id,
                        job_title=exp.jobTitle,
                        company=exp.company,
                        industry=exp_ind,
                        start_year=exp.startYear,
                        end_year=exp.endYear,
                        is_current=exp.isCurrent,
                        description=exp.description,
                        highlights=exp.highlights,
                        source="cv"
                    )
                    db.add(new_exp)
                    db.flush()
                    db.add(ExperienceSource(
                        experience_id=new_exp.id,
                        resume_id=resume.id
                    ))
                    summary_info["experiences_added"] += 1

        # 6. Verified Skills (handling commas, slashes, and aliases)
        all_skill_candidates = list(cv_data.skills)
        expanded_skills = split_compound_skills(all_skill_candidates)
        for sk_name in expanded_skills:
            canon = canonical_skill(sk_name)
            if not canon or len(canon) < 2:
                continue
            existing_sk = db.query(ProfileSkill).filter(
                ProfileSkill.user_id == current_user.id,
                ProfileSkill.name_normalized == canon.lower()
            ).first()
            if not existing_sk:
                new_sk = ProfileSkill(
                    user_id=current_user.id,
                    name=canon,
                    name_normalized=canon.lower(),
                    source="cv"
                )
                db.add(new_sk)
                db.flush()
                db.add(SkillSource(
                    skill_id=new_sk.id,
                    resume_id=resume.id
                ))
                summary_info["skills_added"] += 1

    record_user_activity(
        db, current_user.id, "cv_imported_to_profile",
        f"Imported CV '{resume.file_name}' into candidate profile",
        entity_type="resume", entity_id=resume.id,
        metadata=summary_info
    )
    db.commit()
    return {
        "status": "success",
        "message": f"Successfully imported CV '{resume.file_name}' into your profile!",
        "summary": summary_info
    }

@router.post("/{resume_id}/sync-from-profile")
def sync_from_profile(
    resume_id: str,
    payload: Optional[SyncResumeFromProfileRequest] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Applies and synchronizes candidate's verified profile details (contact, summary, skills, experience, education)
    directly into an existing resume document.
    """
    resume = db.query(Resume).filter(
        Resume.id == resume_id,
        Resume.user_id == current_user.id
    ).first()
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found.")

    sections_to_apply = payload.sections if payload else None
    summary_info = apply_profile_to_resume(db, current_user, resume, sections_to_apply)

    record_user_activity(
        db, current_user.id, "resume_updated",
        f"Applied verified profile details to resume '{resume.title}'",
        entity_type="resume", entity_id=resume.id,
        metadata=summary_info
    )
    log_audit(db, current_user.id, "RESUME_SYNCED_FROM_PROFILE", {"resume_id": resume.id, "summary": summary_info})

    return {
        "status": "success",
        "message": f"Successfully applied user profile details to '{resume.title}'!",
        "summary": summary_info,
        "resume": resume
    }

# =========================================================================
# PILLAR 6: 1-CLICK TARGETED RESUME ADAPTATION API
# =========================================================================

@router.post("/{resume_id}/tailor", response_model=ResumeTailorResponse)
def tailor_resume_for_target_job(
    resume_id: str,
    payload: Dict[str, Any],
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Pillar 6: Auto-tailor this resume for a specific target job posting.
    Re-ranks bullet accomplishments based on vector similarity, elevates matching keywords,
    and produces a focused executive summary while keeping original facts strictly intact.
    """
    resume = db.query(Resume).filter(
        Resume.id == resume_id,
        Resume.user_id == current_user.id
    ).first()
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found.")

    resume_text = resume.raw_text or ""
    if not resume_text.strip():
        raise HTTPException(status_code=400, detail="Resume has no extracted text content.")

    job_text = payload.get("job_text", "")
    target_role = payload.get("target_role")
    jd_id = payload.get("job_description_id")

    if jd_id:
        from app.models.models import JobDescription
        jd = db.query(JobDescription).filter(
            JobDescription.id == jd_id,
            JobDescription.user_id == current_user.id
        ).first()
        if jd:
            job_text = jd.raw_text
            target_role = target_role or jd.title

    if not job_text.strip():
        raise HTTPException(status_code=400, detail="Target job description text is required for targeted adaptation.")

    tailored_result = TailorService.tailor_resume_for_job(
        resume_text=resume_text,
        job_text=job_text,
        target_role=target_role
    )

    record_user_activity(
        db, current_user.id, "resume_auto_tailored",
        f"Auto-tailored resume '{resume.file_name}' for target role '{tailored_result['tailored_title']}'",
        entity_type="resume", entity_id=resume.id
    )

    log_audit(db, current_user.id, "RESUME_TARGET_TAILORED", {
        "resume_id": resume.id,
        "target_role": tailored_result["tailored_title"],
        "elevated_keywords_count": len(tailored_result["elevated_keywords"])
    })

    return tailored_result


