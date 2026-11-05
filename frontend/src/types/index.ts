export type AppearanceMode = 'system' | 'light' | 'dark';

export interface User {
  id: string;
  email: string;
  full_name: string | null;
  appearance_preference: AppearanceMode;
  is_active: boolean;
  created_at: string;
}

export interface ProfileLink {
  label: string;
  url: string;
}

export interface CareerProfile {
  id: string;
  user_id: string;
  target_title: string | null;
  target_industry: string | null;
  years_of_experience: number;
  preferred_locations: string[];
  desired_salary_min: number | null;
  desired_salary_max: number | null;
  summary: string | null;
  skills_list: any[];
  education_history: any[];
  work_history: any[];
  phone?: string | null;
  linkedin_url?: string | null;
  github_url?: string | null;
  portfolio_url?: string | null;
  other_links?: ProfileLink[];
  updated_at: string;
}

export interface ParsedSection {
  id: string;
  section_type: 'contact' | 'summary' | 'experience' | 'education' | 'skills' | 'projects' | 'certifications';
  raw_content: string | null;
  structured_data: any;
  is_user_verified: boolean;
  updated_at: string;
}

export interface ResumeVersion {
  id: string;
  version_number: number;
  label: string | null;
  created_at: string;
  structured_snapshot: any;
}

export interface Resume {
  id: string;
  user_id: string;
  title: string;
  target_role: string | null;
  file_name: string;
  file_size: number;
  file_type: string;
  raw_text?: string;
  created_at: string;
  updated_at: string;
  sections?: ParsedSection[];
  versions?: ResumeVersion[];
}

export interface VaguePhraseItem {
  phrase: string;
  context: string;
  suggestion: string;
  reason: string;
}

export interface RecommendationItem {
  category: string;
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  is_resolved?: boolean;
}

export interface AnalysisRun {
  id: string;
  resume_id: string;
  overall_score: number;
  structure_score: number;
  readability_score: number;
  impact_score: number;
  skills_score: number;
  findings: string[];
  vague_phrases: VaguePhraseItem[];
  strengths: string[];
  weaknesses: string[];
  recommendations: RecommendationItem[];
  section_breakdown: Record<string, any>;
  created_at: string;
  disclaimer: string;
}

export interface MatchedSkill {
  name: string;
  is_required: boolean;
  evidence: string;
  match_type: string;
}

export interface MissingSkill {
  name: string;
  is_required: boolean;
  recommendation: string;
}

export interface PartialSkill {
  name: string;
  related_found: string;
  is_required: boolean;
}

export interface JobMatch {
  id: string;
  resume_id: string;
  job_description_id?: string;
  overall_score: number;
  structure_score: number;
  readability_score: number;
  skills_coverage_score: number;
  relevance_score: number;
  matched_skills: MatchedSkill[];
  missing_skills: MissingSkill[];
  partial_skills: PartialSkill[];
  match_explanations: string[];
  recommendations: string[];
  created_at: string;
  disclaimer: string;
}

export interface JobDescription {
  id: string;
  user_id: string;
  title: string;
  company: string | null;
  source_url: string | null;
  raw_text: string;
  required_skills: string[];
  preferred_skills: string[];
  experience_level?: string;
  salary_range?: string;
  created_at: string;
}

export type ApplicationStage =
  | 'interested'
  | 'applied'
  | 'assessment'
  | 'interview'
  | 'offer'
  | 'rejected'
  | 'withdrawn';

export interface ApplicationEvent {
  id: string;
  event_type: string;
  event_date: string;
  notes: string | null;
}

export interface Reminder {
  id: string;
  application_id?: string;
  title: string;
  due_date: string;
  is_completed: boolean;
  created_at: string;
}

export interface Application {
  id: string;
  user_id: string;
  company: string;
  role: string;
  stage: ApplicationStage;
  job_url: string | null;
  location: string | null;
  source: string | null;
  salary_range: string | null;
  application_date: string | null;
  notes: string | null;
  contact_name: string | null;
  contact_email: string | null;
  interview_date: string | null;
  created_at: string;
  updated_at: string;
  events?: ApplicationEvent[];
  reminders?: Reminder[];
}

export interface ApplicationStats {
  total_applications: number;
  by_stage: Record<string, number>;
  active_interviews: number;
  offers: number;
  rejections: number;
  response_rate_percent: number;
}

export interface DashboardData {
  user: User;
  resumes_count: number;
  recent_resumes: Resume[];
  recent_analyses: AnalysisRun[];
  recent_matches: JobMatch[];
  application_stats: ApplicationStats;
  upcoming_reminders: Reminder[];
  skill_recommendations: {
    skill: string;
    reason: string;
    learning_resource: string;
    priority: string;
  }[];
}

