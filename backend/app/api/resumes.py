import os
import uuid
import logging
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status, Response
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from app.core.config import settings
from app.core.database import get_db
from app.core.dependencies import get_current_user, log_audit
from app.models.models import (
    User, Resume, ResumeVersion, ParsedResumeSection, ResumeSkill, AnalysisRun, Recommendation,
    CareerProfile, ProfileExperience, ProfileSkill, ExperienceSource, SkillSource
)
from app.schemas.schemas import (
    ResumeOut, ParsedSectionOut, ParsedSectionUpdate, AnalysisRunOut
)
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

