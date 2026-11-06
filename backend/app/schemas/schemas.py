from datetime import datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, EmailStr, Field, ConfigDict

# User Schemas
class UserBase(BaseModel):
    email: EmailStr
    full_name: Optional[str] = None

class UserRegister(UserBase):
    password: str = Field(..., min_length=8)
    appearance_preference: Optional[str] = "system"

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class PasswordResetRequest(BaseModel):
    email: EmailStr

class PasswordResetConfirm(BaseModel):
    token: str
    new_password: str = Field(..., min_length=8)

class AppearanceUpdate(BaseModel):
    appearance_preference: str  # "system", "light", "dark"

class UserOut(UserBase):
    id: str
    appearance_preference: str
    is_active: bool
    created_at: datetime
    avatar_url: Optional[str] = None
    
    model_config = ConfigDict(from_attributes=True)

class AvatarUploadResponse(BaseModel):
    avatar_url: str
    message: str = "Profile image updated successfully."

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut

# Career Profile
class CareerProfileUpdate(BaseModel):
    target_title: Optional[str] = None
    target_industry: Optional[str] = None
    years_of_experience: Optional[int] = 0
    preferred_locations: Optional[List[str]] = []
    desired_salary_min: Optional[int] = None
    desired_salary_max: Optional[int] = None
    summary: Optional[str] = None
    phone: Optional[str] = None
    linkedin_url: Optional[str] = None
    github_url: Optional[str] = None
    portfolio_url: Optional[str] = None
    other_links: Optional[List[Dict[str, str]]] = []
    skills_list: Optional[List[Any]] = []
    education_history: Optional[List[Any]] = []
    work_history: Optional[List[Any]] = []

class CareerProfileOut(CareerProfileUpdate):
    id: str
    user_id: str
    updated_at: datetime
    
    model_config = ConfigDict(from_attributes=True)

# Resume Schemas
class ParsedSectionUpdate(BaseModel):
    raw_content: Optional[str] = None
    structured_data: Optional[Dict[str, Any]] = None
    is_user_verified: Optional[bool] = True

class ParsedSectionOut(BaseModel):
    id: str
    section_type: str
    raw_content: Optional[str] = None
    structured_data: Dict[str, Any] = {}
    is_user_verified: bool
    updated_at: datetime
    
    model_config = ConfigDict(from_attributes=True)

class ResumeVersionOut(BaseModel):
    id: str
    version_number: int
    label: Optional[str] = None
    created_at: datetime
    structured_snapshot: Optional[Dict[str, Any]] = {}
    
    model_config = ConfigDict(from_attributes=True)

class ResumeOut(BaseModel):
    id: str
    user_id: str
    title: str
    target_role: Optional[str] = None
    file_name: str
    file_size: int
    file_type: str
    raw_text: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    sections: List[ParsedSectionOut] = []
    versions: List[ResumeVersionOut] = []
    
    model_config = ConfigDict(from_attributes=True)

# Analysis Schemas
class VaguePhraseItem(BaseModel):
    phrase: str
    context: str
    suggestion: str
    reason: str

class RecommendationItem(BaseModel):
    category: str
    title: str
    description: str
    priority: str
    is_resolved: bool = False

class AnalysisRunOut(BaseModel):
    id: str
    resume_id: str
    overall_score: float
    structure_score: float
    readability_score: float
    impact_score: float
    skills_score: float
    findings: List[str] = []
    vague_phrases: List[Dict[str, Any]] = []
    strengths: List[str] = []
    weaknesses: List[str] = []
    recommendations: List[Dict[str, Any]] = []
    section_breakdown: Dict[str, Any] = {}
    created_at: datetime
    disclaimer: str = (
        "Guidance score only. Not an actual employer ATS guarantee or prediction of hiring outcome."
    )
    
    model_config = ConfigDict(from_attributes=True)

# Job Description & Matching Schemas
class JobUrlExtractRequest(BaseModel):
    url: str

class JobUrlExtractResponse(BaseModel):
    job_title: str
    company_name: str
    location: Optional[str] = None
    job_description: str
    required_skills: List[str] = []
    source_url: str
    source_domain: Optional[str] = None

class JobDescriptionCreate(BaseModel):
    title: str
    company: Optional[str] = None
    source_url: Optional[str] = None
    raw_text: str

class JobDescriptionOut(BaseModel):
    id: str
    user_id: str
    title: str
    company: Optional[str] = None
    source_url: Optional[str] = None
    raw_text: str
    required_skills: List[str] = []
    preferred_skills: List[str] = []
    experience_level: Optional[str] = None
    salary_range: Optional[str] = None
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)

class MatchRequest(BaseModel):
    resume_id: str
    job_description_id: Optional[str] = None
    job_text: Optional[str] = None
    job_title: Optional[str] = None
    company: Optional[str] = None

class JobMatchOut(BaseModel):
    id: str
    resume_id: str
    job_description_id: Optional[str] = None
    overall_score: float
    structure_score: float
    readability_score: float
    skills_coverage_score: float
    relevance_score: float
    matched_skills: List[Dict[str, Any]] = []
    missing_skills: List[Dict[str, Any]] = []
    partial_skills: List[Dict[str, Any]] = []
    match_explanations: List[str] = []
    recommendations: List[str] = []
    analysis: Optional[Dict[str, Any]] = None
    engine: Optional[str] = None
    created_at: datetime
    disclaimer: str = (
        "Match scores represent semantic and keyword alignment heuristic guidance only, not a guaranteed employer ATS result."
    )
    
    model_config = ConfigDict(from_attributes=True)

# AI Writing Assistant Schemas
class RewriteRequest(BaseModel):
    text: str
    rewrite_type: str = "bullet"  # "bullet", "summary", "project"
    target_role: Optional[str] = None
    job_description: Optional[str] = None

class RewriteResponse(BaseModel):
    original: str
    improved: str
    changes: List[str] = []
    formula_used: str = "Action Verb + Task + Measurable Impact (XYZ Formula)"
    disclaimer: str = "Please review and confirm factual accuracy. Never claim unverified experience."

class CoverLetterRequest(BaseModel):
    resume_id: str
    job_description: str
    company_name: Optional[str] = "Hiring Team"
    job_title: Optional[str] = "Target Role"
    tone: Optional[str] = "Professional, Impactful"
    candidate_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    linkedin_url: Optional[str] = None
    github_url: Optional[str] = None
    portfolio_url: Optional[str] = None
    other_links: Optional[List[Dict[str, str]]] = None
    include_project_links_body: Optional[bool] = True

class CoverLetterResponse(BaseModel):
    cover_letter: str
    grounded_facts_used: List[str] = []
    disclaimer: str = "Generated from verified candidate resume details and supplied job requirements. Edit before submitting."

class InterviewQuestionsRequest(BaseModel):
    resume_id: Optional[str] = None
    job_description: str
    target_role: Optional[str] = None

class InterviewQuestion(BaseModel):
    question: str
    type: str  # "behavioral", "technical", "situational"
    suggested_focus: str
    star_hints: str

class InterviewQuestionsResponse(BaseModel):
    questions: List[InterviewQuestion]

# Application Tracker Schemas
class ApplicationCreate(BaseModel):
    company: str
    role: str
    stage: str = "applied"  # "interested", "applied", "assessment", "interview", "offer", "rejected", "withdrawn"
    job_url: Optional[str] = None
    location: Optional[str] = None
    source: Optional[str] = "Direct / Website"
    salary_range: Optional[str] = None
    application_date: Optional[datetime] = None
    notes: Optional[str] = None
    contact_name: Optional[str] = None
    contact_email: Optional[str] = None
    interview_date: Optional[datetime] = None

class ApplicationUpdate(BaseModel):
    company: Optional[str] = None
    role: Optional[str] = None
    stage: Optional[str] = None
    job_url: Optional[str] = None
    location: Optional[str] = None
    source: Optional[str] = None
    salary_range: Optional[str] = None
    application_date: Optional[datetime] = None
    notes: Optional[str] = None
    contact_name: Optional[str] = None
    contact_email: Optional[str] = None
    interview_date: Optional[datetime] = None

class ApplicationEventOut(BaseModel):
    id: str
    event_type: str
    event_date: datetime
    notes: Optional[str] = None
    
    model_config = ConfigDict(from_attributes=True)

class ReminderCreate(BaseModel):
    application_id: Optional[str] = None
    title: str
    due_date: datetime

class ReminderOut(BaseModel):
    id: str
    application_id: Optional[str] = None
    title: str
    due_date: datetime
    is_completed: bool
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)

class ApplicationOut(BaseModel):
    id: str
    user_id: str
    company: str
    role: str
    stage: str
    job_url: Optional[str] = None
    location: Optional[str] = None
    source: Optional[str] = None
    salary_range: Optional[str] = None
    application_date: Optional[datetime] = None
    notes: Optional[str] = None
    contact_name: Optional[str] = None
    contact_email: Optional[str] = None
    interview_date: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    events: List[ApplicationEventOut] = []
    reminders: List[ReminderOut] = []
    
    model_config = ConfigDict(from_attributes=True)

class ApplicationStats(BaseModel):
    total_applications: int
    by_stage: Dict[str, int]
    active_interviews: int
    offers: int
    rejections: int
    response_rate_percent: float

# Activity Schemas
class UserActivityOut(BaseModel):
    id: str
    user_id: str
    event_type: str
    description: str
    entity_type: Optional[str] = None
    entity_id: Optional[str] = None
    activity_metadata: Dict[str, Any] = {}
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)

class UserActivityPageOut(BaseModel):
    items: List[UserActivityOut]
    total: int
    page: int
    limit: int

# Experience Intelligence Schemas
class ResumeExperienceBase(BaseModel):
    job_title: Optional[str] = None
    company: str
    employment_type: str = "full_time"
    experience_category: str = "professional_employment"
    start_date_str: Optional[str] = None
    end_date_str: Optional[str] = None
    start_year: Optional[int] = None
    start_month: Optional[int] = None
    end_year: Optional[int] = None
    end_month: Optional[int] = None
    is_current: bool = False
    responsibilities: List[str] = []
    location: Optional[str] = None
    source_evidence: Optional[str] = None
    extraction_confidence: float = 0.85
    needs_user_verification: bool = False
    verified_by_user: bool = False

class ResumeExperienceCreate(ResumeExperienceBase):
    pass

class ResumeExperienceUpdate(BaseModel):
    job_title: Optional[str] = None
    company: Optional[str] = None
    employment_type: Optional[str] = None
    experience_category: Optional[str] = None
    start_date_str: Optional[str] = None
    end_date_str: Optional[str] = None
    start_year: Optional[int] = None
    start_month: Optional[int] = None
    end_year: Optional[int] = None
    end_month: Optional[int] = None
    is_current: Optional[bool] = None
    responsibilities: Optional[List[str]] = None
    location: Optional[str] = None
    source_evidence: Optional[str] = None
    verified_by_user: Optional[bool] = None

class ResumeExperienceOut(ResumeExperienceBase):
    id: str
    resume_id: str
    duration_months: int
    created_at: datetime
    updated_at: datetime
    
    model_config = ConfigDict(from_attributes=True)

class ExperienceSummaryOut(BaseModel):
    professional_duration_months: int
    professional_duration_formatted: str
    internship_duration_months: int
    internship_duration_formatted: str
    freelance_duration_months: int
    freelance_duration_formatted: str
    academic_projects_count: int
    personal_projects_count: int
    overlap_months_adjusted: int
    non_overlapping_roles_count: int
    calculation_basis: str
    relevant_experience_duration_months: int
    relevant_experience_formatted: str

class ResumeExperienceListOut(BaseModel):
    experiences: List[ResumeExperienceOut]
    summary: ExperienceSummaryOut

# Dashboard Schemas
class DashboardData(BaseModel):
    user: UserOut
    resumes_count: int
    recent_resumes: List[ResumeOut] = []
    recent_analyses: List[AnalysisRunOut] = []
    recent_matches: List[JobMatchOut] = []
    application_stats: ApplicationStats
    upcoming_reminders: List[ReminderOut] = []
    skill_recommendations: List[Dict[str, Any]] = []
    recent_activities: List[UserActivityOut] = []
    experience_summary: Optional[ExperienceSummaryOut] = None

# Data Export
class DataExportOut(BaseModel):
    exported_at: datetime
    user_profile: Dict[str, Any]
    resumes: List[Dict[str, Any]]
    applications: List[Dict[str, Any]]
    analyses: List[Dict[str, Any]]
    job_matches: List[Dict[str, Any]]
