import type { DeepReport } from './deepMatch';
export type AppearanceMode = 'system' | 'light' | 'dark';

export interface User {
  id: string;
  email: string;
  full_name: string | null;
  appearance_preference: AppearanceMode;
  avatar_url?: string | null;
  is_active: boolean;
  created_at: string;
}

export interface ProfileLink {
  label: string;
  url: string;
}

export type EducationPreset = 'university' | 'school' | 'diploma' | 'course';

export interface EducationItem {
  id?: string;
  presetType: EducationPreset;
  institution: string;
  degree: string;
  fieldOfStudy?: string;
  startYear?: number | null;
  endYear?: number | null;
  grade?: string;
  highlights?: string;
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
  education_history: EducationItem[];
  work_history: any[];
  phone?: string | null;
  address_line1?: string | null;
  city?: string | null;
  region?: string | null;
  postal_code?: string | null;
  country?: string | null;
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
  role_category?: string | null;
  file_name: string;
  file_size: number;
  file_type: string;
  sha256?: string | null;
  can_preview?: boolean;
  raw_text?: string;
  created_at: string;
  updated_at: string;
  sections?: ParsedSection[];
  versions?: ResumeVersion[];
  skills?: any[];
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
  analysis?: DeepReport | null;
  engine?: string | null;
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

export interface UserActivity {
  id: string;
  user_id: string;
  event_type: string;
  description: string;
  entity_type?: string | null;
  entity_id?: string | null;
  metadata?: Record<string, any>;
  activity_metadata?: Record<string, any>;
  created_at: string;
}

export interface UserActivityPage {
  items: UserActivity[];
  total: number;
  page: number;
  limit: number;
}

export interface ModelUsageStat {
  model_id: string;
  model_name: string;
  action_type: string;
  call_count: number;
  tokens_used: number;
  estimated_time_minutes: number;
  description: string;
}

export interface DailyActivityStat {
  date: string;
  count: number;
}

export interface UserActivityStats {
  total_activities: number;
  total_ai_actions: number;
  total_tokens_used: number;
  total_time_spent_minutes: number;
  time_saved_hours: number;
  models: ModelUsageStat[];
  daily_activity: DailyActivityStat[];
  category_distribution: Record<string, number>;
}

export interface ResumeExperience {
  id: string;
  resume_id: string;
  job_title: string;
  company: string;
  employment_type: string;
  experience_category: string;
  start_date_str?: string | null;
  end_date_str?: string | null;
  start_year?: number | null;
  start_month?: number | null;
  end_year?: number | null;
  end_month?: number | null;
  is_current: boolean;
  duration_months: number;
  responsibilities?: string[];
  location?: string | null;
  source_evidence?: string | null;
  extraction_confidence: number;
  needs_user_verification: boolean;
  verified_by_user: boolean;
  created_at: string;
  updated_at?: string;
}

export interface ExperienceSummary {
  professional_duration_months: number;
  professional_duration_formatted: string;
  internship_duration_months: number;
  internship_duration_formatted: string;
  freelance_duration_months: number;
  freelance_duration_formatted: string;
  academic_projects_count: number;
  personal_projects_count: number;
  overlap_months_adjusted: number;
  non_overlapping_roles_count: number;
  calculation_basis: string;
  relevant_experience_duration_months: number;
  relevant_experience_formatted: string;
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
  recent_activities?: UserActivity[];
  experience_summary?: ExperienceSummary | null;
}

// ==========================================
// CV Auto-Fill & Upgrade Types
// ==========================================

export interface ProfileExperience {
  id: string;
  job_title: string;
  company: string;
  industry: string;
  start_year: number;
  start_month?: number | null;
  end_year?: number | null;
  end_month?: number | null;
  is_current: boolean;
  description?: string;
  highlights: string[];
  source: 'cv' | 'manual';
  years_count: number;
  created_at: string;
}

export interface ProfileSkill {
  id: string;
  name: string;
  source: 'cv' | 'manual';
  created_at: string;
}

export interface Preset {
  id: string;
  name: string;
  target_role?: string | null;
  include_manual: boolean;
  resume_count: number;
  resume_ids: string[];
  created_at: string;
}

export interface CoverLetterVersion {
  id: string;
  version_no: number;
  body: string;
  change_request?: string | null;
  notes: string[];
  style: 'professional' | 'human';
  variant: 'en-GB' | 'en-US';
  created_at: string;
}

export interface CoverLetterRecord {
  id: string;
  preset_id?: string | null;
  job_title?: string | null;
  company?: string | null;
  job_description: string;
  current_version: CoverLetterVersion;
  versions: CoverLetterVersion[];
  created_at: string;
}

export interface TextPolishChange {
  before: string;
  after: string;
  reason: string;
}

export interface TextPolishResponse {
  text: string;
  changes: TextPolishChange[];
  skipped?: string | null;
}

export type CvImportStepId = 'upload' | 'read' | 'analyze' | 'verify' | 'photo' | 'save';

export type CvImportProgressEvent =
  | { type: 'step'; step: CvImportStepId; status: 'active' | 'done'; detail?: string }
  | { type: 'done'; summary: { resumeId: string; fieldsFilled: number; experiencesAdded: number; skillsAdded: number; photoAdded: boolean } }
  | { type: 'error'; code: string; message: string; extra?: { cvEmail: string; accountEmail: string } };

export interface SpeechMetrics {
  word_count: number;
  duration_seconds: number;
  wpm: number;
  pacing_status: string;
  pacing_badge: 'success' | 'warning' | 'neutral';
  filler_count: number;
  filler_density_pct: number;
  filler_breakdown: Record<string, number>;
}

export interface RubricCriterion {
  score: number;
  weight: number;
  label: string;
  feedback: string;
}

export interface MissingChecklistItem {
  id: string;
  label: string;
  passed: boolean;
  tip: string;
}

export interface StarEvaluation {
  situation_score: number;
  task_score: number;
  action_score: number;
  result_score: number;
  overall_star_score: number;
  relevance_score?: number;
  structure_score?: number;
  specific_evidence_score?: number;
  industry_knowledge_score?: number;
  communication_score?: number;
  rubric_breakdown?: {
    relevance?: RubricCriterion;
    structure?: RubricCriterion;
    specific_evidence?: RubricCriterion;
    industry_knowledge?: RubricCriterion;
    communication?: RubricCriterion;
  };
  missing_checklist?: MissingChecklistItem[];
  is_star_compliant: boolean;
  strengths: string[];
  growth_areas: string[];
  follow_up_prompt?: string | null;
}

export interface InterviewQuestionItem {
  question_id: string;
  turn: number;
  question: string;
  category?: string;
  why_asked?: string;
  star_guidance?: string;
}

export interface InterviewScorecard {
  overall_score: number;
  recommendation: 'Strong Hire' | 'Hire' | 'Lean Hire' | 'Needs Coaching' | 'Incomplete';
  verdict: string;
  star_average: number;
  speech_clarity_score: number;
  average_wpm: number;
  total_fillers_detected: number;
  average_filler_density: number;
  radar: {
    'STAR Adherence': number;
    'Speech Pacing': number;
    'Conciseness': number;
    'Action Ownership': number;
    'Metric Results': number;
  };
  top_strengths: string[];
  growth_areas: string[];
  total_questions_answered: number;
}

export interface SuitableAnswer {
  id: string;
  label: string;
  tag: string;
  summary: string;
  star_breakdown: {
    situation: string;
    task: string;
    action: string;
    result: string;
  };
  spoken_script: string;
  pro_tips: string[];
}

export interface InterviewTurnRecord {
  turn: number;
  question: string;
  transcript: string;
  duration_seconds: number;
  speech_metrics: SpeechMetrics;
  star_evaluation: StarEvaluation;
  suitable_answers?: SuitableAnswer[];
}

export interface InterviewSessionSummary {
  id: string;
  role_title: string;
  company: string;
  format_type: string;
  status: 'in_progress' | 'completed';
  overall_score: number;
  turns_count: number;
  created_at?: string;
  recommendation?: string;
}

// -------------------------------------------------------------------------
// Pillar 3: Career Path Knowledge Graph Types
// -------------------------------------------------------------------------
export interface CareerNode {
  id: string;
  title: string;
  label: string;
  type: string;
  industry_id?: string;
  industry_name?: string;
  category: string;
  level: number;
  level_label: string;
  salary_median: number;
  salary_range: {
    min: number;
    median: number;
    max: number;
  };
  description: string;
  core_skills: string[];
  advanced_skills: string[];
  certifications: string[];
}

export interface CareerEdge {
  id: string;
  source: string;
  target: string;
  type: string;
  difficulty: number;
  time_months: number;
  label: string;
}

export interface CareerIndustry {
  id: string;
  name: string;
  slug: string;
  icon: string;
}

export interface CareerKnowledgeGraphData {
  nodes: CareerNode[];
  edges: CareerEdge[];
  categories: string[];
  industries?: CareerIndustry[];
  active_industry?: string;
}

export interface CareerSkillItem {
  name: string;
  category: string;
  status: 'verified' | 'transferrable' | 'missing';
  importance: 'core' | 'advanced';
  transferrable_reason?: string;
  prerequisites?: string[];
}

export interface CareerLearningPhase {
  phase: string;
  duration_weeks: string;
  focus: string;
  skills: string[];
  recommended_project: string;
}

export interface CareerBridgeResponse {
  path_found: boolean;
  path: string[];
  path_role_ids: string[];
  current_role: CareerNode;
  target_role: CareerNode;
  milestones: CareerNode[];
  total_estimated_months: number;
  total_transition_months: number;
  feasibility_score: number;
  has_candidate_skills?: boolean;
  verified_skills: CareerSkillItem[];
  transferrable_skills: CareerSkillItem[];
  missing_skills: CareerSkillItem[];
  skill_gap_analysis: {
    verified_skills: string[];
    transferrable_skills: string[];
    missing_skills: string[];
  };
  recommended_certifications: string[];
  learning_roadmap: CareerLearningPhase[];
  salary_delta: number;
}

// -------------------------------------------------------------------------
// Pillar 5: Market Salary Predictor & Offer Negotiation Coach Types
// -------------------------------------------------------------------------
export interface SalaryPercentiles {
  p25: number;
  p50: number;
  p75: number;
  p90: number;
}

export interface SkillRoiBooster {
  skill: string;
  category: string;
  bonus_pct: number;
  estimated_annual_lift: number;
}

export interface CompensationBreakdown {
  base_salary: number;
  annual_bonus: number;
  bonus_percentage: number;
  annual_equity: number;
  total_target_compensation: number;
}

export interface SalaryPredictionResponse {
  role_title: string;
  role_category: string;
  experience_years: number;
  location_tier: string;
  company_tier: string;
  currency: string;
  symbol: string;
  percentiles: SalaryPercentiles;
  compensation_breakdown: CompensationBreakdown;
  skill_roi_boosters: SkillRoiBooster[];
  total_skill_premium_pct: number;
  market_sentiment: string;
  market_tag: string;
  suggested_negotiation_anchor: number;
}

export interface SalaryMetadataResponse {
  location_tiers: Array<{
    id: string;
    label: string;
    multiplier: number;
    currency: string;
    symbol: string;
    description: string;
  }>;
  company_tiers: Array<{
    id: string;
    label: string;
    base_mult: number;
    bonus_pct: number;
    equity_mult: number;
    description: string;
  }>;
  high_roi_skills: Array<{
    key: string;
    name: string;
    bonus_pct: number;
    category: string;
  }>;
}

export interface OfferClause {
  id: string;
  name?: string;
  title?: string;
  status?: 'initial' | 'unlocked' | 'pending' | 'locked' | 'standard' | string;
  type?: string;
  value?: string;
  condition: string;
}

export interface NegotiationTurnResponse {
  turn_no: number;
  candidate_pitch: string;
  difficulty?: 'standard' | 'hard';
  metrics: {
    leverage_score: number;
    acceptance_probability: number;
    firmness_index: number;
    politeness_index: number;
    tactical_balance: string;
  };
  signals_detected: {
    competing_offer: boolean;
    market_data_anchor: boolean;
    value_framing: boolean;
    total_comp_flexibility: boolean;
  };
  financial_outcome: {
    initial_offer: number;
    new_offer: number;
    concession_amount: number;
    gap_remaining: number;
  };
  clauses_unlocked?: OfferClause[];
  recruiter_reply: string;
  coach_critique: string;
  suggested_next_move: string;
}

export interface VerifiedSalaryBenchmark {
  role: string;
  industry: string;
  country: string;
  currency: string;
  currency_symbol: string;
  period: string;
  base: number;
  p25: number;
  median: number;
  p75: number;
  top: number;
  confidence: 'high' | 'medium' | 'low';
  sample_size: number;
  sources: Array<{ name: string; url: string; retrieved_at: string }>;
  notes: string;
  retrieved_at: string;
}

export interface CounterOfferScript {
  id: string;
  title: string;
  tag: string;
  badge: string;
  description: string;
  script: string;
}

export interface SalarySnapshotItem {
  id?: number;
  role_id?: number;
  country?: string;
  work_mode?: string | null;
  currency?: string;
  currency_symbol?: string;
  p10?: number;
  p25: number;
  median: number;
  p75: number;
  p90?: number;
  monthly_median?: number;
  monthly_p25?: number;
  monthly_p75?: number;
  sample_size: number;
  estimated_share: number;
  source?: string;
  fetched_at: string;
  date?: string;
}

export interface JobRoleItem {
  id: number;
  title: string;
  industry_id: number;
  industry_name: string;
  search_terms: string[];
  last_refreshed?: string | null;
  currency?: string;
  currency_symbol?: string;
  openings_count?: number;
  work_mode_counts?: {
    remote: number;
    hybrid: number;
    onsite: number;
    unknown: number;
  };
  latest_salary: SalarySnapshotItem | null;
  is_stale: boolean;
}

export interface JobPostingItem {
  id: number;
  source: string;
  external_id: string;
  title: string;
  company: string;
  location: string;
  work_mode: string;
  salary_min: number | null;
  salary_max: number | null;
  currency: string;
  salary_is_estimated: boolean;
  url: string;
  posted_at: string | null;
  last_seen: string | null;
}

export interface RoleSalaryResponse {
  role_id: number;
  role_title: string;
  country?: {
    name: string;
    currency: string;
    symbol: string;
    rate: number;
    ppp: number;
    flag: string;
  };
  experience_level?: {
    label: string;
    factor: number;
    exp_years: string;
  };
  currency?: string;
  currency_symbol?: string;
  latest: SalarySnapshotItem | null;
  skills_premium?: Array<{ skill: string; boost: string }>;
  market_demand?: string;
  timeframe?: string;
  trend: Array<{
    date: string;
    median: number;
    p25: number;
    p75: number;
  }>;
  is_stale: boolean;
  sample_size?: number;
  disclaimer: string;
}

export interface NavigatorIndustryItem {
  id: number;
  name: string;
  role_count: number;
  openings_count?: number;
}





