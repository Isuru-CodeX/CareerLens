"""app/services/deep_match/schemas.py - structured contracts between the LLM, the scorer and the UI."""
from typing import List, Literal, Optional
from pydantic import BaseModel, Field

Importance = Literal["must", "important", "nice"]
Status = Literal["met", "partial", "transferable", "missing", "unclear"]
Category = Literal["hard_skill", "soft_skill", "experience", "education", "certification",
                   "domain", "responsibility", "language", "logistics"]


class Requirement(BaseModel):
    id: str = Field(description="Short id: r1, r2, r3 ...")
    text: str = Field(description="One atomic requirement in plain words")
    category: Category
    importance: Importance = Field(description="must = explicitly required; important = strongly implied; nice = preferred/bonus")
    jd_quote: str = Field(description="Exact words copied from the job post that justify this requirement")


class JobProfile(BaseModel):
    title: str
    seniority: Literal["intern", "junior", "mid", "senior", "lead", "principal", "executive", "unspecified"]
    min_years_experience: Optional[float] = None
    max_years_experience: Optional[float] = None
    work_mode: Literal["remote", "hybrid", "onsite", "unspecified"] = "unspecified"
    location: Optional[str] = None
    salary_text: Optional[str] = Field(None, description="Only if the post states pay. Never guess.")
    domain: Optional[str] = None
    tech_stack: List[str] = []
    requirements: List[Requirement]
    responsibilities: List[str] = []
    ats_keywords: List[str] = Field([], description="Exact terms an applicant tracking system would likely search for")
    culture_signals: List[str] = []
    jd_red_flags: List[str] = Field([], description="Vague/unrealistic wording in the post itself")
    ambiguities: List[str] = Field([], description="Things the post leaves unclear")


class Assessment(BaseModel):
    requirement_id: str
    status: Status
    confidence: float = Field(ge=0, le=1)
    evidence_quote: Optional[str] = Field(None, description="Verbatim text from the resume. Null if none.")
    evidence_location: Optional[str] = Field(None, description="e.g. 'Experience > Acme Corp > bullet 2'")
    reasoning: str
    how_to_improve: str = Field(description="Truthful advice only; never suggest inventing experience")
    verified: bool = True          # set by code (grounding check), not by the model


class ExperienceFit(BaseModel):
    candidate_relevant_years: Optional[float] = None
    seniority_signal: Literal["below", "aligned", "above", "unclear"] = "unclear"
    reasoning: str
    career_gaps: List[str] = []


class Strength(BaseModel):
    title: str
    detail: str
    evidence_quote: Optional[str] = None


class Risk(BaseModel):
    title: str
    severity: Literal["low", "medium", "high"]
    detail: str
    mitigation: str


class KeywordGap(BaseModel):
    keyword: str
    where_to_add: str = Field(description="Which resume section, and only if the candidate genuinely has the skill")
    truthful_note: str


class BulletRewrite(BaseModel):
    original: str = Field(description="Verbatim resume bullet")
    improved: str = Field(description="Rewrite using ONLY facts present in the original; use [X] placeholders for unknown numbers")
    why: str
    needs_user_input: List[str] = Field([], description="Facts the user must supply, e.g. 'actual % latency reduction'")


class RoadmapItem(BaseModel):
    skill: str
    priority: Literal["high", "medium", "low"]
    est_weeks: int
    resources: List[str] = []
    proof_project: str = Field(description="A small portfolio project that would prove the skill")


class InterviewItem(BaseModel):
    question: str
    why_asked: str
    talking_points: List[str]
    linked_requirement_id: Optional[str] = None


class DeepAnalysis(BaseModel):
    assessments: List[Assessment]
    verdict: Literal["strong_fit", "good_fit", "stretch", "weak_fit"]
    executive_summary: str = Field(description="3-4 sentences, plain language, no flattery")
    strengths: List[Strength]
    risks: List[Risk]
    experience_fit: ExperienceFit
    keyword_gaps: List[KeywordGap]
    bullet_rewrites: List[BulletRewrite]
    skill_roadmap: List[RoadmapItem]
    interview_prep: List[InterviewItem]
    summary_suggestion: Optional[str] = Field(None, description="A rewritten professional summary using only resume facts")
