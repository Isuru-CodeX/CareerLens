import type { DeepReport } from './deepMatch';
export type AppearanceMode = 'system' | 'light' | 'dark';

export interface User {
  id: string;
  email: string;
  full_name: string | null;
  appearance_preference: AppearanceMode;
  avatar_url?: string | null;
  is_active: boolean;
  is_admin?: boolean;
  role?: string;
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
  career_readiness?: CareerReadinessScorecard;
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
  source: 'cv' | 'manual' | string;
  proficiency_estimate?: string;
  confidence?: number;
  verification_status?: 'demonstrated' | 'mentioned' | 'unverified';
  evidence_count?: number;
  user_confirmed?: boolean;
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
    currency?: string;
    currency_symbol?: string;
    monthly_median?: number;
    monthly_p25?: number;
    monthly_p75?: number;
  };
  currency?: string;
  currency_symbol?: string;
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
  country?: string;
  currency?: string;
  currency_symbol?: string;
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
  currency?: string;
  currency_symbol?: string;
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
  countries?: Array<{
    code: string;
    name: string;
    currency: string;
    symbol: string;
    flag: string;
  }>;
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

// ==========================================
// PILLAR 1: VECTOR RAG & ATS STRESS TEST TYPES
// ==========================================

export interface AlignedChunkPair {
  requirement: string;
  is_required: boolean;
  matching_accomplishment: string;
  section: string;
  cosine_similarity: number;
  confidence_tier: string;
}

export interface SemanticGapItem {
  requirement: string;
  is_required: boolean;
  closest_resume_text: string;
  closest_similarity: number;
  actionable_bridge: string;
}

export interface VectorRagMatchResponse {
  overall_hybrid_score: number;
  semantic_vector_score: number;
  keyword_overlap_score: number;
  chunks_evaluated: {
    resume_chunks_count: number;
    job_requirements_count: number;
    aligned_count: number;
    gap_count: number;
  };
  aligned_chunks: AlignedChunkPair[];
  semantic_gaps: SemanticGapItem[];
  concept_alignment_insights: string[];
}

export interface AtsSystemScore {
  ats_name: string;
  score: number;
  status: 'PASSED' | 'WARNING' | 'FAILED' | string;
  issues: Array<{
    severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | string;
    code: string;
    message: string;
  }>;
  passed_checks: string[];
}

export interface AtsStressTestResponse {
  overall_ats_score: number;
  overall_risk_rating: string;
  summary: string;
  file_name?: string | null;
  systems: {
    workday: AtsSystemScore;
    greenhouse: AtsSystemScore;
    taleo: AtsSystemScore;
    lever: AtsSystemScore;
  };
  all_issues: Array<{
    system: string;
    severity: string;
    code: string;
    message: string;
  }>;
  actionable_mitigation_checklist: string[];
}

// ==========================================
// PILLAR 4 & 6: EXTENSION CLIP & RESUME TAILOR TYPES
// ==========================================

export interface ExtensionJobClipResponse {
  success: boolean;
  application_id: string;
  job_description_id: string;
  title: string;
  company: string;
  stage: string;
  match_score?: number | null;
  message: string;
}

export interface ResumeTailorResponse {
  tailored_title: string;
  tailored_summary: string;
  reordered_accomplishments: Array<{
    id: string;
    section: string;
    text: string;
    similarity_score: number;
    aligned_requirement: string;
    is_top_priority: boolean;
  }>;
  elevated_keywords: string[];
  tailored_match_score_delta: number;
  factuality_guarantee: string;
}

// ==========================================
// MODULES 7, 10, 11, 12: XAI, GITHUB, CODING & PLACEMENT TYPES
// ==========================================

export interface ShapAttributionItem {
  text: string;
  shap_delta: number;
  category: 'positive' | 'negative' | 'neutral';
  matched_terms: string[];
  has_quantifiable_metric: boolean;
  has_passive_phrasing: boolean;
  attribution_explanation: string;
}

export interface ShapAttributionResponse {
  baseline_score: number;
  calibrated_score: number;
  total_segments_analyzed: number;
  positive_impact_count: number;
  negative_impact_count: number;
  neutral_count: number;
  attributions: ShapAttributionItem[];
  summary: string;
}

export interface BiasFinding {
  category: string;
  type: string;
  term: string;
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  message: string;
  recommended_fix: string;
}

export interface BiasAuditResponse {
  fairness_score: number;
  bias_risk_level: 'LOW' | 'MODERATE' | 'HIGH';
  total_findings: number;
  findings: BiasFinding[];
  gender_balance: {
    masculine_terms: number;
    feminine_terms: number;
    ratio: string;
  };
  summary: string;
}

export interface BlindProfileResponse {
  masked_text: string;
  candidate_alias: string;
  redactions_count: number;
  audit_log: string[];
  compliance_status: string;
}

export interface VerifiedSkillItem {
  skill: string;
  status: string;
  evidence_level: string;
  supporting_repos: string[];
  confidence: number;
}

export interface GithubAuditResponse {
  success: boolean;
  github_username: string;
  profile_url: string;
  repositories_analyzed: number;
  total_commits: number;
  total_stars: number;
  integrity_score: number;
  verification_rating: string;
  verified_skills: VerifiedSkillItem[];
  unverified_skills: string[];
  sample_repositories: Array<{
    name: string;
    language: string;
    stars: number;
    detected_tech: string[];
    has_tests: boolean;
    lines_of_code: number;
  }>;
  proof_of_work_badge: {
    badge_id: string;
    cryptographic_hash: string;
    verified_at: string;
    issuer: string;
    verification_status: string;
  };
}

export interface RoleMetaItem {
  id: string;
  name: string;
  icon: string;
  description: string;
  challenge_count: number;
  target_keywords: string[];
}

export interface CodingChallengeItem {
  id: string;
  title: string;
  track: 'coding' | 'system_design';
  category: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  target_role: string;
  role_id?: string;
  time_limit_minutes: number;
  language?: string;
  skills?: string[];
  description: string;
  starter_code: string;
  optimal_big_o: string;
  hints?: string[];
  is_recommended?: boolean;
  has_model_answer?: boolean;
  test_cases: Array<{
    input: any;
    expected: any;
    description?: string;
  }>;
  model_answer?: {
    solution_code?: string;
    architecture_doc?: string;
    design_principles?: string[];
    trade_off_analysis?: string;
  };
}

export interface CodingEvaluationResponse {
  success: boolean;
  challenge_id: string;
  title: string;
  track?: 'coding' | 'system_design';
  target_role?: string;
  overall_score: number;
  grade: string;
  rubric_breakdown?: {
    correctness: number;
    scalability_complexity: number;
    code_quality_architecture: number;
    reliability_security: number;
  };
  errors_found?: Array<{
    severity: 'critical' | 'warning' | 'info';
    error: string;
    explanation: string;
    line_or_component?: string;
  }>;
  corrections?: Array<{
    issue: string;
    fix: string;
    code_snippet?: string;
  }>;
  missed_important_things?: Array<{
    item: string;
    why_important: string;
    recommendation: string;
  }>;
  model_answer?: {
    solution_code?: string;
    architecture_doc?: string;
    design_principles?: string[];
    trade_off_analysis?: string;
  };
  tests_total: number;
  tests_passed: number;
  test_results?: Array<{
    test_id: number;
    description: string;
    input_repr: string;
    expected_repr: string;
    actual_repr: string;
    passed: boolean;
  }>;
  execution_time_ms: number;
  memory_usage_mb: number;
  estimated_complexity: string;
  target_complexity: string;
  code_quality_score?: number;
  review_feedback?: string[];
  ai_critique: string;
  verified_skill_awarded?: {
    skill_name: string;
    level: string;
    score: number;
  } | null;
}

export interface CohortStudent {
  id: string;
  name: string;
  email: string;
  degree: string;
  batch: string;
  target_role: string;
  readiness_score: number;
  interview_score: number;
  verified_skills: string[];
  status: string;
  offers: number;
}

export interface SkillDeficitAlert {
  skill: string;
  demand_percentage: number;
  cohort_proficiency: number;
  deficit_gap: number;
  severity: 'CRITICAL' | 'HIGH' | 'MODERATE';
  recommendation: string;
}

export interface CohortTelemetryResponse {
  batch_name: string;
  total_students: number;
  average_ats_readiness: number;
  average_interview_score: number;
  placed_students_count: number;
  placement_rate_percentage: number;
  active_interviews_ongoing: number;
  skill_deficit_alerts: SkillDeficitAlert[];
  top_recruiter_partners: string[];
  students: CohortStudent[];
}

// ---------------------------------------------------------------------------
// Specification P0 & P1 Types: CV Review, Multi-Source Skills, Goals, Learning & Readiness
// ---------------------------------------------------------------------------

export interface UserSkillEvidence {
  id: string;
  skill_id?: string;
  skill_name: string;
  source_type: 'cv' | 'work_experience' | 'project' | 'github' | 'coding_assessment' | 'interview' | 'self_declaration' | string;
  source_reference?: string;
  evidence_text?: string;
  confidence: number;
  proficiency_estimate: 'Beginner' | 'Developing' | 'Intermediate' | 'Advanced' | 'Expert' | string;
  verification_status: 'demonstrated' | 'mentioned' | 'unverified';
  user_confirmed: boolean;
  is_disputed: boolean;
  dispute_reason?: string;
  created_at: string;
}

export interface CvReviewField {
  key: string;
  label: string;
  section: string;
  current_value: any;
  extracted_value: any;
  confidence: number;
  is_low_confidence: boolean;
  is_diff: boolean;
  has_manual_edit: boolean;
  recommendation: 'accept' | 'review' | 'keep_current';
}

export interface CvReviewExperience {
  temp_id: string;
  job_title: string;
  company: string;
  industry: string;
  start_year: number;
  start_month?: number;
  end_year?: number;
  end_month?: number;
  is_current: boolean;
  description: string;
  highlights: string[];
  confidence: number;
  is_low_confidence: boolean;
  is_duplicate: boolean;
  recommendation: 'accept' | 'skip';
}

export interface CvReviewSkill {
  name: string;
  normalized: string;
  proficiency: string;
  confidence: number;
  is_duplicate: boolean;
  recommendation: 'accept' | 'skip';
}

export interface CvReviewEducation {
  temp_id: string;
  institution: string;
  degree: string;
  field_of_study?: string;
  start_year?: number;
  end_year?: number;
  confidence: number;
  is_low_confidence: boolean;
  recommendation: 'accept' | 'skip';
}

export interface CvReviewData {
  resume_id: string;
  resume_title: string;
  file_name: string;
  raw_text_snippet: string;
  fields: CvReviewField[];
  experiences: CvReviewExperience[];
  skills: CvReviewSkill[];
  education: CvReviewEducation[];
}

export interface CareerMilestone {
  id: string;
  title: string;
  completed: boolean;
}

export interface CareerGoalData {
  id: string;
  target_role_id?: string;
  target_title: string;
  target_date?: string;
  preferences: Record<string, any>;
  milestones: CareerMilestone[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CareerComparisonItem {
  role_id: string;
  title: string;
  domain: string;
  seniority_tier: string;
  match_percent: number;
  required_skills: string[];
  verified_skills: string[];
  partial_skills?: Array<{ skill: string; matched_with?: string; reason?: string }>;
  missing_skills: string[];
  estimated_transition_months: number;
  salary_bands: Record<string, number>;
  currency: string;
  is_current_profile?: boolean;
  salary_delta?: number;
  transition_roadmap?: string[];
  experience_years_min?: number;
  experience_years?: number;
  total_verified_count?: number;
}

export interface CareerRoleOption {
  id: string;
  title: string;
  domain: string;
  industry: string;
  seniority_tier: string;
  experience_years_min: number;
  required_skills: string[];
}

export interface ExtractedSocialSkill {
  name: string;
  category: string;
  source: string;
  confidence: number;
  already_in_profile?: boolean;
  platform?: 'github' | 'linkedin';
}

export interface SocialSkillExtractionResponse {
  total_extracted: number;
  new_skills_count: number;
  github_scanned: boolean;
  linkedin_scanned: boolean;
  skills: ExtractedSocialSkill[];
}

export interface LearningStudyGuide {
  key_concepts: string[];
  code_example?: string;
  code_language?: string;
  common_pitfalls: string[];
  practice_exercise: string;
}

export interface LearningCurvePhase {
  phase_number: number;
  phase_name: string;
  focus: string;
  milestone_count: number;
  completed_count: number;
  estimated_weeks: number;
  status: 'completed' | 'in_progress' | 'upcoming';
}

export interface LearningCurveData {
  role_title: string;
  industry_id: string;
  category: string;
  level: number;
  curve_type: string;
  curve_shape: string;
  difficulty_level: string;
  difficulty_score: number;
  estimated_weeks: number;
  estimated_months: number;
  total_curriculum_hours: number;
  weekly_hours: number;
  trajectory_description: string;
  phases: LearningCurvePhase[];
  curve_points: Array<{ x: number; y: number; label: string }>;
  core_competencies?: string[];
  advanced_competencies?: string[];
}

export interface LearningTaskData {
  id: string;
  skill_name: string;
  title: string;
  learning_objective: string;
  estimated_effort_hours: number;
  difficulty_tier?: string;
  prerequisites: string[];
  resources: Array<{ title: string; url: string; type: string }>;
  mini_project?: string;
  study_guide?: LearningStudyGuide;
  status: 'planned' | 'in_progress' | 'completed' | 'assessed';
  assessment_score?: number;
  has_quiz: boolean;
  completed_at?: string;
}

export interface LearningPlanData {
  has_plan: boolean;
  plan: {
    id: string;
    target_role: string;
    weekly_hours: number;
    preferred_days: string[];
    progress_percent: number;
    created_at: string;
    learning_curve?: LearningCurveData;
  } | null;
  tasks: LearningTaskData[];
}

export interface LearningQuizQuestion {
  id: string;
  question: string;
  options: string[];
}

export interface LearningQuizResult {
  passed: boolean;
  score_percent: number;
  correct_answers: number;
  total_questions: number;
  feedback: Array<{
    question_id: string;
    question: string;
    is_correct: boolean;
    chosen_option?: string;
    correct_option?: string;
    explanation?: string;
  }>;
  skill_verified: boolean;
  message: string;
}

export interface ReadinessCategoryItem {
  key: string;
  name: string;
  weight_percent: number;
  score: number;
  status: 'Strong' | 'Satisfactory' | 'Needs Work';
  explanation: string;
  actionable_next_step: string;
}

export interface CareerReadinessScorecard {
  overall_score: number;
  readiness_tier: 'Developing' | 'Competitive' | 'High Readiness' | 'Exceptional';
  disclaimer: string;
  calculation_method: string;
  categories: ReadinessCategoryItem[];
}

// ============================================================================
// Admin Command Center & Model Training Types
// ============================================================================
export interface AdminModelItem {
  id: string;
  name: string;
  type: string;
  status: 'ready' | 'training' | 'pretrained_baseline' | string;
  version: string;
  accuracy_metric: string;
  accuracy_value: number;
  mae: number | null;
  samples_trained: number;
  last_trained: string;
  can_train: boolean;
  description: string;
}

export interface AdminTrainingMetrics {
  model_id: string;
  model_name: string;
  version: string;
  engine: string;
  status: string;
  samples_trained: number;
  r2_score: number;
  mae_usd: number;
  rmse_usd: number;
  training_duration_ms: number;
  artifact_path: string;
  feature_count: number;
  top_features: Array<{ name: string; importance: number }>;
  trained_at: string;
}

export interface AdminRagBenchmarkResults {
  hybrid_ndcg_at_3: number;
  hybrid_ndcg_at_5: number;
  hybrid_recall_at_5: number;
  hybrid_precision_at_3: number;
  keyword_baseline_ndcg_at_3: number;
  relative_lift_pct: string;
  meets_spec: boolean;
}

export interface AdminRagReindexResult {
  status: string;
  total_chunks_indexed: number;
  dimensions: number;
  concept_clusters: number;
  duration_ms: number;
  benchmark_results: AdminRagBenchmarkResults;
  timestamp: string;
}

export interface AdminTelemetryDailyItem {
  date: string;
  tokens: number;
  calls: number;
  cost_usd: number;
}

export interface AdminTelemetryData {
  total_tokens: number;
  total_calls: number;
  estimated_cost_usd: number;
  by_model: Record<string, { calls: number; tokens: number; estimated_cost_usd: number }>;
  by_action: Record<string, number>;
  daily_series: AdminTelemetryDailyItem[];
}

export interface AdminStatsData {
  kpis: {
    total_users: number;
    total_resumes: number;
    total_matches: number;
    total_applications: number;
    total_tokens_used: number;
    estimated_ai_cost_usd: number;
  };
  system: {
    status: string;
    uptime_seconds: number;
    database: {
      engine: string;
      size_kb: number;
      tables: Record<string, number>;
    };
    storage: {
      upload_dir: string;
      total_size_kb: number;
      parsed_resumes_on_disk: number;
    };
    scheduler: {
      status: string;
      jobs: Array<{
        id: string;
        interval: string;
        next_run: string;
        last_status: string;
      }>;
    };
  };
  ai_summary: AdminTelemetryData;
}

export interface AdminUserItem {
  id: string;
  email: string;
  full_name: string | null;
  role: 'superadmin' | 'admin' | 'placement_officer' | 'candidate' | string;
  is_admin: boolean;
  is_active: boolean;
  avatar_url?: string | null;
  created_at: string | null;
  resumes_count: number;
  applications_count: number;
}

export interface AdminUsersPageResponse {
  items: AdminUserItem[];
  total: number;
  page: number;
  limit: number;
}

export interface AdminCareerRole {
  id: string;
  title: string;
  industry_id: string;
  industry_name: string;
  category: string;
  level: number;
  level_label: string;
  salary_range: { min: number; median: number; max: number };
  core_skills: string[];
  advanced_skills: string[];
  bridges_to: Array<{ target: string; difficulty: number; time_months: number; transition_label: string }>;
}

export interface AdminLocationTier {
  id: string;
  label: string;
  multiplier: number;
  currency: string;
  symbol: string;
  description: string;
}

export interface AdminCompanyTier {
  id: string;
  label: string;
  base_mult: number;
  bonus_pct: number;
  equity_mult: number;
  description: string;
}

export interface AdminMultipliersResponse {
  location_tiers: Record<string, AdminLocationTier>;
  company_tiers: Record<string, AdminCompanyTier>;
}

export interface AdminAtsRuleEngine {
  engine_name: string;
  pass_threshold: number;
  strict_date_parsing: boolean;
  table_penalty_pts?: number;
  missing_header_penalty_pts?: number;
  multi_column_penalty_pts?: number;
  missing_email_penalty_pts?: number;
  token_truncation_limit?: number;
  ligature_glyph_penalty_pts?: number;
  complex_graphics_penalty_pts?: number;
  contact_link_bonus_pts?: number;
  broken_link_penalty_pts?: number;
}

export interface AdminInterviewQuestion {
  id: string;
  role: string;
  category: string;
  question: string;
  difficulty: 'Easy' | 'Medium' | 'Hard' | string;
  star_benchmark: {
    situation: string;
    task: string;
    action: string;
    result: string;
  };
}

export interface AdminAuditLogItem {
  id: string;
  action: string;
  user_id: string | null;
  user_email: string;
  actor_role?: string | null;
  target_type?: string | null;
  target_id?: string | null;
  ip_address: string | null;
  details: Record<string, any>;
  timestamp: string | null;
}

export interface TrainingDatasetItem {
  id: string;
  name: string;
  description: string | null;
  source_type: string;
  license: string;
  document_count: number;
  status: string;
  is_locked: boolean;
  created_at: string | null;
}

export interface TrainingDocumentItem {
  id: string;
  dataset_id: string;
  original_filename: string;
  file_type: string;
  file_size: number;
  source_type: string;
  source_url?: string | null;
  source_license?: string | null;
  raw_text?: string | null;
  anonymized_text?: string | null;
  quality_score: number;
  split: string;
  status: string;
  target_role?: string | null;
  created_at: string | null;
}

export interface AnnotationItem {
  id: string;
  document_id: string;
  task_type: string;
  label_data: {
    sections?: Array<{ label: string; start: number; end: number }>;
    skills?: Array<{ text: string; canonical: string; level: string }>;
    human_scores?: { structure: number; readability: number; impact: number; skills: number; overall: number };
    notes?: string;
  };
  status: 'draft' | 'submitted' | 'approved' | 'rejected' | string;
  is_gold: boolean;
  created_at: string | null;
}

export interface MistakeReportItem {
  id: string;
  source: string;
  component: string;
  error_type: string;
  severity: 'low' | 'medium' | 'high' | string;
  status: 'open' | 'in_review' | 'resolved' | 'wont_fix' | string;
  predicted: Record<string, any>;
  corrected: Record<string, any>;
  resolution_type?: string | null;
  resolution_note?: string | null;
  regression_test_id?: string | null;
  created_at: string | null;
}

export interface RegressionTestItem {
  id: string;
  name: string;
  component: string;
  strictness: string;
  created_at: string | null;
}

export interface TrainingJobItem {
  id: string;
  model_type: string;
  status: 'queued' | 'running' | 'succeeded' | 'failed' | 'cancelled' | string;
  progress: number;
  metrics: Record<string, any>;
  started_at: string | null;
  finished_at: string | null;
}

export interface ModelVersionItem {
  id: string;
  model_type: string;
  version: string;
  status: 'candidate' | 'shadow' | 'active' | 'archived' | string;
  metrics: Record<string, any>;
  promoted_at: string | null;
  created_at: string | null;
}

export interface ScoringConfigItem {
  id: string;
  version: string;
  name: string;
  structure_weight: number;
  readability_weight: number;
  impact_weight: number;
  skills_weight: number;
  is_active: boolean;
  created_at: string | null;
}

export interface SkillTaxonomyItem {
  id: string;
  canonical_name: string;
  category: string;
  aliases: string[];
  is_active: boolean;
}

export interface LanguageRuleItem {
  id: string;
  rule_type: string;
  phrase: string;
  severity: string;
  suggested_replacements: string[];
  is_active: boolean;
}

export interface PromptTemplateItem {
  id: string;
  module: string;
  version: string;
  template_text: string;
  is_active: boolean;
  is_locked: boolean;
}

export interface UserFeedbackItem {
  id: string;
  user_id: string | null;
  category: string;
  description: string;
  status: string;
  mistake_id: string | null;
  created_at: string | null;
}

export interface FeatureFlagItem {
  id: string;
  key: string;
  enabled: boolean;
  description: string | null;
}



