import uuid
from datetime import datetime, timezone
from sqlalchemy import (
    Column, String, Integer, Float, Boolean, DateTime, ForeignKey, Text, JSON
)
from sqlalchemy.orm import relationship
from app.core.database import Base

def generate_uuid() -> str:
    return str(uuid.uuid4())

def get_utc_now() -> datetime:
    return datetime.now(timezone.utc)

class User(Base):
    __tablename__ = "users"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=True)
    appearance_preference = Column(String(20), default="system")  # "system", "light", "dark"
    avatar_path = Column(String(500), nullable=True)
    avatar_url = Column(String(500), nullable=True)
    avatar_source = Column(String(50), nullable=True, default="manual")  # "cv" or "manual"
    email_verified_at = Column(DateTime, nullable=True, default=get_utc_now)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=get_utc_now)
    updated_at = Column(DateTime, default=get_utc_now, onupdate=get_utc_now)

    # Relationships
    profile = relationship("CareerProfile", back_populates="user", uselist=False, cascade="all, delete-orphan")
    resumes = relationship("Resume", back_populates="user", cascade="all, delete-orphan")
    job_descriptions = relationship("JobDescription", back_populates="user", cascade="all, delete-orphan")
    job_matches = relationship("JobMatch", back_populates="user", cascade="all, delete-orphan")
    analyses = relationship("AnalysisRun", back_populates="user", cascade="all, delete-orphan")
    applications = relationship("Application", back_populates="user", cascade="all, delete-orphan")
    reminders = relationship("Reminder", back_populates="user", cascade="all, delete-orphan")
    audit_logs = relationship("AuditLog", back_populates="user", cascade="all, delete-orphan")
    drafts = relationship("GeneratedDraft", back_populates="user", cascade="all, delete-orphan")
    activities = relationship("UserActivity", back_populates="user", cascade="all, delete-orphan", order_by="desc(UserActivity.created_at)")
    profile_experiences = relationship("ProfileExperience", back_populates="user", cascade="all, delete-orphan", order_by="desc(ProfileExperience.start_year)")
    profile_skills = relationship("ProfileSkill", back_populates="user", cascade="all, delete-orphan", order_by="ProfileSkill.name")
    presets = relationship("Preset", back_populates="user", cascade="all, delete-orphan", order_by="Preset.created_at")
    cover_letters = relationship("CoverLetter", back_populates="user", cascade="all, delete-orphan", order_by="desc(CoverLetter.created_at)")

class CareerProfile(Base):
    __tablename__ = "career_profiles"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    target_title = Column(String(255), nullable=True)
    target_industry = Column(String(255), nullable=True)
    years_of_experience = Column(Integer, default=0)
    preferred_locations = Column(JSON, default=list)  # list of strings
    desired_salary_min = Column(Integer, nullable=True)
    desired_salary_max = Column(Integer, nullable=True)
    summary = Column(Text, nullable=True)
    phone = Column(String(50), nullable=True)
    address_line1 = Column(String(255), nullable=True)
    city = Column(String(100), nullable=True)
    region = Column(String(100), nullable=True)
    postal_code = Column(String(50), nullable=True)
    country = Column(String(100), nullable=True)
    linkedin_url = Column(String(255), nullable=True)
    github_url = Column(String(255), nullable=True)
    portfolio_url = Column(String(255), nullable=True)
    other_links = Column(JSON, default=list)  # list of {"label": str, "url": str}
    skills_list = Column(JSON, default=list)  # list of skill dicts/strings
    education_history = Column(JSON, default=list)  # list of education items
    work_history = Column(JSON, default=list)  # list of work experiences
    updated_at = Column(DateTime, default=get_utc_now, onupdate=get_utc_now)
    
    user = relationship("User", back_populates="profile")

class Resume(Base):
    __tablename__ = "resumes"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    title = Column(String(255), nullable=False)
    target_role = Column(String(255), nullable=True)
    file_name = Column(String(255), nullable=False)
    file_path = Column(String(500), nullable=False)
    file_size = Column(Integer, default=0)
    file_type = Column(String(50), nullable=False)  # "pdf", "docx", "txt"
    sha256 = Column(String(64), nullable=True, index=True)
    role_category = Column(String(100), nullable=True)
    preview_path = Column(String(500), nullable=True)
    parsed_json = Column(JSON, nullable=True)
    raw_text = Column(Text, nullable=True)
    is_archived = Column(Boolean, default=False)
    created_at = Column(DateTime, default=get_utc_now)
    updated_at = Column(DateTime, default=get_utc_now, onupdate=get_utc_now)
    
    user = relationship("User", back_populates="resumes")
    versions = relationship("ResumeVersion", back_populates="resume", cascade="all, delete-orphan")
    sections = relationship("ParsedResumeSection", back_populates="resume", cascade="all, delete-orphan")
    skills = relationship("ResumeSkill", back_populates="resume", cascade="all, delete-orphan")
    matches = relationship("JobMatch", back_populates="resume", cascade="all, delete-orphan")
    analyses = relationship("AnalysisRun", back_populates="resume", cascade="all, delete-orphan")
    experiences = relationship("ResumeExperience", back_populates="resume", cascade="all, delete-orphan", order_by="ResumeExperience.start_year.desc()")

class ResumeVersion(Base):
    __tablename__ = "resume_versions"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    resume_id = Column(String(36), ForeignKey("resumes.id", ondelete="CASCADE"), index=True, nullable=False)
    version_number = Column(Integer, default=1)
    label = Column(String(255), nullable=True)
    raw_text = Column(Text, nullable=True)
    structured_snapshot = Column(JSON, default=dict)
    created_at = Column(DateTime, default=get_utc_now)
    
    resume = relationship("Resume", back_populates="versions")

class ParsedResumeSection(Base):
    __tablename__ = "parsed_resume_sections"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    resume_id = Column(String(36), ForeignKey("resumes.id", ondelete="CASCADE"), index=True, nullable=False)
    section_type = Column(String(50), nullable=False)  # "contact", "summary", "experience", "education", "skills", "projects", "certifications"
    raw_content = Column(Text, nullable=True)
    structured_data = Column(JSON, default=dict)
    is_user_verified = Column(Boolean, default=False)
    updated_at = Column(DateTime, default=get_utc_now, onupdate=get_utc_now)
    
    resume = relationship("Resume", back_populates="sections")

class Skill(Base):
    __tablename__ = "skills"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    name = Column(String(100), unique=True, index=True, nullable=False)
    category = Column(String(50), default="technical")  # "technical", "soft", "tool", "domain"
    created_at = Column(DateTime, default=get_utc_now)

class ResumeSkill(Base):
    __tablename__ = "resume_skills"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    resume_id = Column(String(36), ForeignKey("resumes.id", ondelete="CASCADE"), index=True, nullable=False)
    skill_name = Column(String(100), nullable=False)
    proficiency_level = Column(String(50), default="intermediate")
    evidence_snippet = Column(Text, nullable=True)
    years = Column(Float, nullable=True)
    
    resume = relationship("Resume", back_populates="skills")

class JobDescription(Base):
    __tablename__ = "job_descriptions"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    title = Column(String(255), nullable=False)
    company = Column(String(255), nullable=True)
    source_url = Column(String(500), nullable=True)
    raw_text = Column(Text, nullable=False)
    required_skills = Column(JSON, default=list)
    preferred_skills = Column(JSON, default=list)
    experience_level = Column(String(100), nullable=True)
    salary_range = Column(String(100), nullable=True)
    created_at = Column(DateTime, default=get_utc_now)
    
    user = relationship("User", back_populates="job_descriptions")
    matches = relationship("JobMatch", back_populates="job_description", cascade="all, delete-orphan")

class JobMatch(Base):
    __tablename__ = "job_matches"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    resume_id = Column(String(36), ForeignKey("resumes.id", ondelete="CASCADE"), index=True, nullable=False)
    job_description_id = Column(String(36), ForeignKey("job_descriptions.id", ondelete="CASCADE"), index=True, nullable=False)
    
    overall_score = Column(Float, nullable=False)  # 0 to 100
    structure_score = Column(Float, default=0.0)
    readability_score = Column(Float, default=0.0)
    skills_coverage_score = Column(Float, default=0.0)
    relevance_score = Column(Float, default=0.0)
    
    matched_skills = Column(JSON, default=list)
    missing_skills = Column(JSON, default=list)
    partial_skills = Column(JSON, default=list)
    match_explanations = Column(JSON, default=list)
    recommendations = Column(JSON, default=list)
    analysis = Column(JSON, nullable=True)          # full Deep Match report (new)
    engine = Column(String(20), nullable=True)      # "llm" | "heuristic" (new)
    created_at = Column(DateTime, default=get_utc_now)
    
    user = relationship("User", back_populates="job_matches")
    resume = relationship("Resume", back_populates="matches")
    job_description = relationship("JobDescription", back_populates="matches")

class AnalysisRun(Base):
    __tablename__ = "analysis_runs"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    resume_id = Column(String(36), ForeignKey("resumes.id", ondelete="CASCADE"), index=True, nullable=False)
    
    overall_score = Column(Float, nullable=False)
    structure_score = Column(Float, default=0.0)
    readability_score = Column(Float, default=0.0)
    impact_score = Column(Float, default=0.0)
    skills_score = Column(Float, default=0.0)
    
    findings = Column(JSON, default=list)
    vague_phrases = Column(JSON, default=list)
    strengths = Column(JSON, default=list)
    weaknesses = Column(JSON, default=list)
    recommendations = Column(JSON, default=list)
    section_breakdown = Column(JSON, default=dict)
    
    created_at = Column(DateTime, default=get_utc_now)
    
    user = relationship("User", back_populates="analyses")
    resume = relationship("Resume", back_populates="analyses")
    recommendation_items = relationship("Recommendation", back_populates="analysis_run", cascade="all, delete-orphan")

class Recommendation(Base):
    __tablename__ = "recommendations"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    analysis_run_id = Column(String(36), ForeignKey("analysis_runs.id", ondelete="CASCADE"), index=True, nullable=False)
    category = Column(String(50), nullable=False)  # "impact", "clarity", "skills", "formatting"
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    priority = Column(String(20), default="medium")  # "high", "medium", "low"
    is_resolved = Column(Boolean, default=False)
    
    analysis_run = relationship("AnalysisRun", back_populates="recommendation_items")

class GeneratedDraft(Base):
    __tablename__ = "generated_drafts"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    resume_id = Column(String(36), ForeignKey("resumes.id", ondelete="SET NULL"), nullable=True)
    job_description_id = Column(String(36), ForeignKey("job_descriptions.id", ondelete="SET NULL"), nullable=True)
    draft_type = Column(String(50), nullable=False)  # "summary", "bullet_point", "cover_letter", "interview_prep"
    title = Column(String(255), nullable=True)
    original_content = Column(Text, nullable=True)
    generated_content = Column(Text, nullable=False)
    diff_summary = Column(JSON, default=dict)
    created_at = Column(DateTime, default=get_utc_now)
    
    user = relationship("User", back_populates="drafts")

class Application(Base):
    __tablename__ = "applications"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    company = Column(String(255), nullable=False)
    role = Column(String(255), nullable=False)
    stage = Column(String(50), default="interested")  # "interested", "applied", "assessment", "interview", "offer", "rejected", "withdrawn"
    job_url = Column(String(500), nullable=True)
    location = Column(String(255), nullable=True)
    source = Column(String(100), nullable=True)  # "LinkedIn", "Indeed", "Company Website", "Referral", etc.
    salary_range = Column(String(100), nullable=True)
    application_date = Column(DateTime, nullable=True)
    notes = Column(Text, nullable=True)
    contact_name = Column(String(255), nullable=True)
    contact_email = Column(String(255), nullable=True)
    interview_date = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=get_utc_now)
    updated_at = Column(DateTime, default=get_utc_now, onupdate=get_utc_now)
    
    user = relationship("User", back_populates="applications")
    events = relationship("ApplicationEvent", back_populates="application", cascade="all, delete-orphan")
    reminders = relationship("Reminder", back_populates="application", cascade="all, delete-orphan")

class ApplicationEvent(Base):
    __tablename__ = "application_events"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    application_id = Column(String(36), ForeignKey("applications.id", ondelete="CASCADE"), index=True, nullable=False)
    event_type = Column(String(50), nullable=False)  # "stage_change", "note_added", "interview_scheduled"
    event_date = Column(DateTime, default=get_utc_now)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=get_utc_now)
    
    application = relationship("Application", back_populates="events")

class Reminder(Base):
    __tablename__ = "reminders"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    application_id = Column(String(36), ForeignKey("applications.id", ondelete="CASCADE"), nullable=True)
    title = Column(String(255), nullable=False)
    due_date = Column(DateTime, nullable=False)
    is_completed = Column(Boolean, default=False)
    created_at = Column(DateTime, default=get_utc_now)
    
    user = relationship("User", back_populates="reminders")
    application = relationship("Application", back_populates="reminders")

class AIUsageRecord(Base):
    __tablename__ = "ai_usage_records"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    action_type = Column(String(100), nullable=False)
    tokens_used = Column(Integer, default=0)
    model_name = Column(String(100), default="careerlens-heuristic-ai")
    created_at = Column(DateTime, default=get_utc_now)

class ConsentRecord(Base):
    __tablename__ = "consent_records"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    consent_type = Column(String(100), nullable=False)  # e.g., "ai_resume_processing", "privacy_policy"
    agreed = Column(Boolean, default=True)
    timestamp = Column(DateTime, default=get_utc_now)

class AuditLog(Base):
    __tablename__ = "audit_logs"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), index=True, nullable=True)
    action = Column(String(100), nullable=False)
    ip_address = Column(String(50), nullable=True)
    details = Column(JSON, default=dict)
    timestamp = Column(DateTime, default=get_utc_now)
    
    user = relationship("User", back_populates="audit_logs")

class UserActivity(Base):
    __tablename__ = "user_activities"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    event_type = Column(String(50), nullable=False)
    description = Column(String(255), nullable=False)
    entity_type = Column(String(50), nullable=True)
    entity_id = Column(String(36), nullable=True)
    activity_metadata = Column(JSON, default=dict)
    created_at = Column(DateTime, default=get_utc_now)
    
    user = relationship("User", back_populates="activities")

class ResumeExperience(Base):
    __tablename__ = "resume_experiences"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    resume_id = Column(String(36), ForeignKey("resumes.id", ondelete="CASCADE"), index=True, nullable=False)
    job_title = Column(String(255), nullable=True)
    company = Column(String(255), nullable=False)
    employment_type = Column(String(50), default="full_time")  # full_time, part_time, internship, freelance, contract, self_employment, volunteer, unknown
    experience_category = Column(String(50), default="professional_employment")  # professional_employment, internship, freelance, volunteer, academic_project, personal_project
    start_date_str = Column(String(100), nullable=True)
    end_date_str = Column(String(100), nullable=True)
    start_year = Column(Integer, nullable=True)
    start_month = Column(Integer, nullable=True)
    end_year = Column(Integer, nullable=True)
    end_month = Column(Integer, nullable=True)
    is_current = Column(Boolean, default=False)
    duration_months = Column(Integer, default=0)
    responsibilities = Column(JSON, default=list)  # list of strings
    location = Column(String(255), nullable=True)
    source_evidence = Column(Text, nullable=True)
    extraction_confidence = Column(Float, default=0.85)
    needs_user_verification = Column(Boolean, default=False)
    verified_by_user = Column(Boolean, default=False)
    created_at = Column(DateTime, default=get_utc_now)
    updated_at = Column(DateTime, default=get_utc_now, onupdate=get_utc_now)
    
    resume = relationship("Resume", back_populates="experiences")

class ProfileExperience(Base):
    __tablename__ = "user_experiences"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    job_title = Column(String(255), nullable=False)
    company = Column(String(255), nullable=False)
    industry = Column(String(100), default="Other")
    start_year = Column(Integer, nullable=False)
    start_month = Column(Integer, nullable=True)
    end_year = Column(Integer, nullable=True)
    end_month = Column(Integer, nullable=True)
    is_current = Column(Boolean, default=False)
    description = Column(Text, nullable=True, default="")
    highlights = Column(JSON, default=list)
    source = Column(String(20), default="manual")  # "cv" or "manual"
    created_at = Column(DateTime, default=get_utc_now)

    user = relationship("User", back_populates="profile_experiences")

class ExperienceSource(Base):
    __tablename__ = "experience_sources"

    experience_id = Column(String(36), ForeignKey("user_experiences.id", ondelete="CASCADE"), primary_key=True)
    resume_id = Column(String(36), ForeignKey("resumes.id", ondelete="CASCADE"), primary_key=True)

class ProfileSkill(Base):
    __tablename__ = "user_skills"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    name = Column(String(100), nullable=False)
    name_normalized = Column(String(100), nullable=False, index=True)
    source = Column(String(20), default="manual")  # "cv" or "manual"
    created_at = Column(DateTime, default=get_utc_now)

    user = relationship("User", back_populates="profile_skills")

class SkillSource(Base):
    __tablename__ = "skill_sources"

    skill_id = Column(String(36), ForeignKey("user_skills.id", ondelete="CASCADE"), primary_key=True)
    resume_id = Column(String(36), ForeignKey("resumes.id", ondelete="CASCADE"), primary_key=True)

class Preset(Base):
    __tablename__ = "presets"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    name = Column(String(100), nullable=False)
    target_role = Column(String(150), nullable=True)
    include_manual = Column(Boolean, default=True)
    created_at = Column(DateTime, default=get_utc_now)

    user = relationship("User", back_populates="presets")
    resumes = relationship("PresetResume", back_populates="preset", cascade="all, delete-orphan")

class PresetResume(Base):
    __tablename__ = "preset_resumes"

    preset_id = Column(String(36), ForeignKey("presets.id", ondelete="CASCADE"), primary_key=True)
    resume_id = Column(String(36), ForeignKey("resumes.id", ondelete="CASCADE"), primary_key=True)

    preset = relationship("Preset", back_populates="resumes")

class CoverLetter(Base):
    __tablename__ = "cover_letters"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    preset_id = Column(String(36), ForeignKey("presets.id", ondelete="SET NULL"), nullable=True)
    job_title = Column(String(255), nullable=True)
    company = Column(String(255), nullable=True)
    job_description = Column(Text, nullable=False)
    created_at = Column(DateTime, default=get_utc_now)

    user = relationship("User", back_populates="cover_letters")
    versions = relationship("CoverLetterVersion", back_populates="letter", cascade="all, delete-orphan", order_by="CoverLetterVersion.version_no.asc()")

class CoverLetterVersion(Base):
    __tablename__ = "cover_letter_versions"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    letter_id = Column(String(36), ForeignKey("cover_letters.id", ondelete="CASCADE"), index=True, nullable=False)
    version_no = Column(Integer, nullable=False)
    body = Column(Text, nullable=False)
    change_request = Column(Text, nullable=True)
    notes = Column(JSON, default=list)
    style = Column(String(50), default="professional")
    variant = Column(String(50), default="en-GB")
    created_at = Column(DateTime, default=get_utc_now)

    letter = relationship("CoverLetter", back_populates="versions")



