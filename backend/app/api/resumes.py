import os
import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status, Response
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from app.core.config import settings
from app.core.database import get_db
from app.core.dependencies import get_current_user, log_audit
from app.models.models import (
    User, Resume, ResumeVersion, ParsedResumeSection, ResumeSkill, AnalysisRun, Recommendation
)
from app.schemas.schemas import (
    ResumeOut, ParsedSectionOut, ParsedSectionUpdate, AnalysisRunOut
)
from app.services.parsing_service import ParsingService
from app.services.analysis_service import AnalysisService
from app.services.pdf_service import PDFService
from app.services.activity_service import record_user_activity
from app.services.experience_intelligence_service import ExperienceIntelligenceService

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

@router.get("", response_model=List[ResumeOut])
def list_resumes(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    resumes = db.query(Resume).filter(
        Resume.user_id == current_user.id,
        Resume.is_archived == False
    ).order_by(Resume.created_at.desc()).all()
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

@router.get("/{resume_id}/download")
def download_resume_file(
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
        else:
            raise HTTPException(status_code=404, detail="File not found on storage.")

    return FileResponse(
        path=file_path,
        filename=resume.file_name,
        media_type="application/octet-stream"
    )

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

