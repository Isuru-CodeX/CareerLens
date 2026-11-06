// src/types/deepMatch.ts
export type Status = 'met' | 'partial' | 'transferable' | 'missing' | 'unclear';
export type Importance = 'must' | 'important' | 'nice';

export interface Requirement { id: string; text: string; category: string; importance: Importance; jd_quote: string; }
export interface Assessment {
  requirement_id: string; status: Status; confidence: number;
  evidence_quote: string | null; evidence_location: string | null;
  reasoning: string; how_to_improve: string; verified: boolean;
}
export interface ScoreDimension { key: string; label: string; score: number | null; weight: number; }
export interface DeepReport {
  engine: 'llm' | 'heuristic'; model: string | null; candidate_years: number; warnings: string[];
  job_profile: {
    title: string; seniority: string; min_years_experience: number | null; work_mode: string;
    location: string | null; salary_text: string | null; tech_stack: string[];
    requirements: Requirement[]; ats_keywords: string[]; culture_signals: string[];
    jd_red_flags: string[]; ambiguities: string[];
  };
  analysis: {
    assessments: Assessment[]; verdict: string; executive_summary: string;
    strengths: { title: string; detail: string; evidence_quote: string | null }[];
    risks: { title: string; severity: 'low' | 'medium' | 'high'; detail: string; mitigation: string }[];
    experience_fit: { candidate_relevant_years: number | null; seniority_signal: string; reasoning: string; career_gaps: string[] };
    keyword_gaps: { keyword: string; where_to_add: string; truthful_note: string }[];
    bullet_rewrites: { original: string; improved: string; why: string; needs_user_input: string[] }[];
    skill_roadmap: { skill: string; priority: string; est_weeks: number; resources: string[]; proof_project: string }[];
    interview_prep: { question: string; why_asked: string; talking_points: string[]; linked_requirement_id: string | null }[];
    summary_suggestion: string | null;
  };
  score: { overall: number; verdict: string; breakdown: ScoreDimension[]; caps_applied: string[] };
  what_if: { requirement: string; importance: Importance; gain: number }[];
}
