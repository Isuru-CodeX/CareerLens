import {
  User,
  CareerProfile,
  Resume,
  ParsedSection,
  AnalysisRun,
  JobMatch,
  JobDescription,
  Application,
  ApplicationStats,
  DashboardData,
  Reminder,
  AppearanceMode,
  UserActivityPage,
  UserActivityStats,
  ResumeExperience,
  ExperienceSummary,
  ProfileExperience,
  ProfileSkill,
  Preset,
  CoverLetterRecord,
  CoverLetterVersion,
  TextPolishResponse,
  InterviewQuestionItem,
  SpeechMetrics,
  StarEvaluation,
  InterviewScorecard,
  InterviewSessionSummary,
  InterviewTurnRecord,
  SuitableAnswer,
  CareerKnowledgeGraphData,
  CareerBridgeResponse,
  CareerIndustry,
  VerifiedSalaryBenchmark,
  SalaryMetadataResponse,
  SalaryPredictionResponse,
  NegotiationTurnResponse,
  CounterOfferScript,
  JobRoleItem,
  JobPostingItem,
  RoleSalaryResponse,
  NavigatorIndustryItem,
  VectorRagMatchResponse,
  AtsStressTestResponse,
  ExtensionJobClipResponse,
  ResumeTailorResponse,
  ShapAttributionResponse,
  BiasAuditResponse,
  BlindProfileResponse,
  GithubAuditResponse,
  RoleMetaItem,
  CodingChallengeItem,
  CodingEvaluationResponse,
  CohortTelemetryResponse,
  UserSkillEvidence,
  CvReviewData,
  CareerGoalData,
  CareerComparisonItem,
  CareerRoleOption,
  SocialSkillExtractionResponse,
  LearningPlanData,
  LearningQuizResult,
  AdminModelItem,
  AdminTrainingMetrics,
  AdminRagReindexResult,
  AdminTelemetryData,
  AdminStatsData,
  AdminUsersPageResponse,
  AdminCareerRole,
  AdminMultipliersResponse,
  AdminAtsRuleEngine,
  AdminInterviewQuestion,
  AdminAuditLogItem
} from '../types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

class ApiService {
  private token: string | null = null;

  constructor() {
    this.token = localStorage.getItem('careerlens_token');
  }

  setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem('careerlens_token', token);
    } else {
      localStorage.removeItem('careerlens_token');
    }
  }

  getToken(): string | null {
    return this.token;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = {
      Accept: 'application/json',
      ...((options.headers as Record<string, string>) || {})
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    if (!(options.body instanceof FormData) && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers
    });

    if (!response.ok) {
      let errorDetail = 'An error occurred while processing your request.';
      try {
        const errJson = await response.json();
        errorDetail = errJson.detail || errorDetail;
      } catch {
        errorDetail = response.statusText || errorDetail;
      }
      throw new Error(errorDetail);
    }

    if (response.status === 204 || response.status === 205) {
      return undefined as unknown as T;
    }

    const text = await response.text();
    if (!text || !text.trim()) {
      return undefined as unknown as T;
    }

    try {
      return JSON.parse(text);
    } catch {
      return text as unknown as T;
    }
  }

  // Auth
  async register(data: { email: string; password: string; full_name?: string; appearance_preference?: string }) {
    const res = await this.request<{ access_token: string; user: User }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data)
    });
    this.setToken(res.access_token);
    return res;
  }

  async login(creds: { email: string; password: string }) {
    const res = await this.request<{ access_token: string; user: User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(creds)
    });
    this.setToken(res.access_token);
    return res;
  }

  async getMe(): Promise<User> {
    return this.request<User>('/auth/me');
  }

  async updateAppearance(preference: AppearanceMode): Promise<User> {
    return this.request<User>('/auth/appearance', {
      method: 'PATCH',
      body: JSON.stringify({ appearance_preference: preference })
    });
  }

  async forgotPassword(email: string) {
    return this.request<{ message: string; reset_token?: string }>('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email })
    });
  }

  async resetPassword(token: string, newPassword: string) {
    return this.request<{ message: string }>('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, new_password: newPassword })
    });
  }

  // User Profile
  async getProfile(): Promise<CareerProfile> {
    return this.request<CareerProfile>('/users/profile');
  }

  async updateProfile(data: Partial<CareerProfile>): Promise<CareerProfile> {
    return this.request<CareerProfile>('/users/profile', {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  async exportData(): Promise<any> {
    return this.request<any>('/users/export');
  }

  async deleteAccount(): Promise<any> {
    const res = await this.request<any>('/users/account', {
      method: 'DELETE'
    });
    this.setToken(null);
    return res;
  }

  // Profile Avatar
  async uploadAvatar(file: File): Promise<{ avatar_url: string; message: string }> {
    const formData = new FormData();
    formData.append('file', file);
    return this.request<{ avatar_url: string; message: string }>('/users/me/avatar', {
      method: 'POST',
      body: formData
    });
  }

  async deleteAvatar(): Promise<{ message: string }> {
    return this.request<{ message: string }>('/users/me/avatar', {
      method: 'DELETE'
    });
  }

  getAvatarImageUrl(): string {
    return `${API_BASE_URL}/users/me/avatar/image`;
  }

  // Activity Feed & Model Usage Analytics
  async getActivity(
    limit: number = 10,
    page: number = 1,
    eventType?: string,
    search?: string
  ): Promise<UserActivityPage> {
    let url = `/activity?limit=${limit}&page=${page}`;
    if (eventType && eventType !== 'all') {
      url += `&event_type=${encodeURIComponent(eventType)}`;
    }
    if (search && search.trim()) {
      url += `&search=${encodeURIComponent(search.trim())}`;
    }
    return this.request<UserActivityPage>(url);
  }

  async getActivityStats(): Promise<UserActivityStats> {
    return this.request<UserActivityStats>('/activity/stats');
  }

  // Experience Intelligence Engine
  async getExperiences(
    resumeId: string,
    includeInternships: boolean = true
  ): Promise<{ experiences: ResumeExperience[]; summary: ExperienceSummary }> {
    return this.request<{ experiences: ResumeExperience[]; summary: ExperienceSummary }>(
      `/resumes/${resumeId}/experiences?include_internships=${includeInternships}`
    );
  }

  async addExperience(resumeId: string, data: Partial<ResumeExperience>): Promise<ResumeExperience> {
    return this.request<ResumeExperience>(`/resumes/${resumeId}/experiences`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async updateExperience(
    resumeId: string,
    expId: string,
    data: Partial<ResumeExperience>
  ): Promise<ResumeExperience> {
    return this.request<ResumeExperience>(`/resumes/${resumeId}/experiences/${expId}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  async deleteExperience(resumeId: string, expId: string): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/resumes/${resumeId}/experiences/${expId}`, {
      method: 'DELETE'
    });
  }

  async verifyExperience(resumeId: string, expId: string): Promise<ResumeExperience> {
    return this.request<ResumeExperience>(`/resumes/${resumeId}/experiences/${expId}/verify`, {
      method: 'POST'
    });
  }

  async reparseExperiences(
    resumeId: string
  ): Promise<{ experiences: ResumeExperience[]; summary: ExperienceSummary }> {
    return this.request<{ experiences: ResumeExperience[]; summary: ExperienceSummary }>(
      `/resumes/${resumeId}/experiences/reparse`,
      { method: 'POST' }
    );
  }

  // Resumes
  async uploadResume(file: File, title?: string, target_role?: string): Promise<Resume> {
    const formData = new FormData();
    formData.append('file', file);
    if (title) formData.append('title', title);
    if (target_role) formData.append('target_role', target_role);

    return this.request<Resume>('/resumes/upload', {
      method: 'POST',
      body: formData
    });
  }

  async getResumes(): Promise<Resume[]> {
    return this.request<Resume[]>('/resumes');
  }

  async getResume(id: string): Promise<Resume> {
    return this.request<Resume>(`/resumes/${id}`);
  }

  async reparseResume(id: string): Promise<Resume> {
    return this.request<Resume>(`/resumes/${id}/parse`, {
      method: 'POST'
    });
  }

  async updateSection(resumeId: string, sectionId: string, data: { raw_content?: string; structured_data?: any }): Promise<ParsedSection> {
    return this.request<ParsedSection>(`/resumes/${resumeId}/sections/${sectionId}`, {
      method: 'PATCH',
      body: JSON.stringify(data)
    });
  }

  async analyseResume(id: string): Promise<AnalysisRun> {
    return this.request<AnalysisRun>(`/resumes/${id}/analyse`, {
      method: 'POST'
    });
  }

  async getResumeAnalyses(id: string): Promise<AnalysisRun[]> {
    return this.request<AnalysisRun[]>(`/resumes/${id}/analyses`);
  }

  async deleteResume(id: string): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/resumes/${id}`, {
      method: 'DELETE'
    });
  }

  async syncResumeToProfile(id: string): Promise<{
    status: string;
    message: string;
    summary: {
      photo_extracted: boolean;
      phone_updated: boolean;
      address_enriched: boolean;
      industry_suggested: string | null;
      education_added: number;
      experiences_added: number;
      skills_added: number;
    };
  }> {
    return this.request(`/resumes/${id}/sync-to-profile`, {
      method: 'POST'
    });
  }

  async syncProfileToResume(
    id: string,
    sections?: string[]
  ): Promise<{
    status: string;
    message: string;
    summary: {
      target_role_updated: boolean;
      contact_updated: boolean;
      summary_updated: boolean;
      skills_applied: number;
      experiences_applied: number;
      education_applied: number;
    };
    resume: Resume;
  }> {
    return this.request(`/resumes/${id}/sync-from-profile`, {
      method: 'POST',
      body: JSON.stringify(sections ? { sections } : {})
    });
  }

  async createResumeFromProfile(payload?: {
    title?: string;
    target_role?: string;
  }): Promise<Resume> {
    return this.request<Resume>('/resumes/create-from-profile', {
      method: 'POST',
      body: JSON.stringify(payload || {})
    });
  }

  getResumeDownloadUrl(id: string): string {
    const token = this.getToken();
    const tokenParam = token ? `?token=${encodeURIComponent(token)}` : '';
    return `${API_BASE_URL}/resumes/${id}/download${tokenParam}`;
  }

  getAnalysisPdfUrl(resumeId: string, analysisId: string): string {
    const token = this.getToken();
    const tokenParam = token ? `?token=${encodeURIComponent(token)}` : '';
    return `${API_BASE_URL}/resumes/${resumeId}/analyses/${analysisId}/pdf${tokenParam}`;
  }

  // Job Matching
  async extractJobFromUrl(url: string): Promise<{
    job_title: string;
    company_name: string;
    location?: string;
    job_description: string;
    required_skills: string[];
    source_url: string;
    source_domain?: string;
  }> {
    return this.request('/job-descriptions/extract-url', {
      method: 'POST',
      body: JSON.stringify({ url })
    });
  }

  async parseJobDescription(data: { title: string; company?: string; source_url?: string; raw_text: string }): Promise<JobDescription> {
    return this.request<JobDescription>('/job-descriptions/analyse', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async getJobDescriptions(): Promise<JobDescription[]> {
    return this.request<JobDescription[]>('/job-descriptions');
  }

  async matchResume(req: { resume_id: string; job_description_id?: string; job_text?: string; job_title?: string; company?: string }): Promise<JobMatch> {
    return this.request<JobMatch>('/matches', {
      method: 'POST',
      body: JSON.stringify(req)
    });
  }

  async getMatches(): Promise<JobMatch[]> {
    return this.request<JobMatch[]>('/matches');
  }

  async getMatch(id: string): Promise<JobMatch> {
    return this.request<JobMatch>(`/matches/${id}`);
  }

  // AI Assistant
  async rewriteContent(data: { text: string; rewrite_type?: string; target_role?: string; job_description?: string }) {
    return this.request<{
      original: string;
      improved: string;
      changes: string[];
      formula_used: string;
      disclaimer: string;
    }>('/ai/rewrite', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async generateCoverLetter(data: {
    resume_id: string;
    job_description: string;
    company_name?: string;
    job_title?: string;
    tone?: string;
    candidate_name?: string;
    email?: string;
    phone?: string;
    linkedin_url?: string;
    github_url?: string;
    portfolio_url?: string;
    other_links?: { label: string; url: string }[];
    include_project_links_body?: boolean;
    include_contact_header?: boolean;
    include_name?: boolean;
    include_email?: boolean;
    include_phone?: boolean;
    include_linkedin?: boolean;
    include_github?: boolean;
    include_portfolio?: boolean;
  }) {
    return this.request<{
      cover_letter: string;
      grounded_facts_used: string[];
      disclaimer: string;
    }>('/ai/cover-letter', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async generateInterviewPrep(data: { resume_id?: string; job_description: string; target_role?: string }) {
    return this.request<{
      questions: {
        question: string;
        type: string;
        suggested_focus: string;
        star_hints: string;
      }[];
    }>('/ai/interview-prep', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  // Applications
  async getApplications(params?: { stage?: string; q?: string; sort_by?: string }): Promise<Application[]> {
    const query = new URLSearchParams();
    if (params?.stage) query.append('stage', params.stage);
    if (params?.q) query.append('q', params.q);
    if (params?.sort_by) query.append('sort_by', params.sort_by);
    const qs = query.toString() ? `?${query.toString()}` : '';
    return this.request<Application[]>(`/applications${qs}`);
  }

  async createApplication(data: Partial<Application>): Promise<Application> {
    return this.request<Application>('/applications', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async updateApplication(id: string, data: Partial<Application>): Promise<Application> {
    return this.request<Application>(`/applications/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data)
    });
  }

  async deleteApplication(id: string): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/applications/${id}`, {
      method: 'DELETE'
    });
  }

  async getApplicationStats(): Promise<ApplicationStats> {
    return this.request<ApplicationStats>('/applications/stats');
  }

  async addReminder(appId: string, data: { title: string; due_date: string }): Promise<Reminder> {
    return this.request<Reminder>(`/applications/${appId}/reminders`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async toggleReminder(reminderId: string): Promise<Reminder> {
    return this.request<Reminder>(`/applications/reminders/${reminderId}/toggle`, {
      method: 'PATCH'
    });
  }

  // Dashboard
  async getDashboard(): Promise<DashboardData> {
    return this.request<DashboardData>('/dashboard');
  }

  // ==========================================
  // Feature 1, 2, 7: CV Import & Live SSE
  // ==========================================
  async importCv(file: File): Promise<{ job_id: string; message: string }> {
    const formData = new FormData();
    formData.append('cv', file);

    const headers: Record<string, string> = {};
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const res = await fetch(`${API_BASE_URL}/cv/import`, {
      method: 'POST',
      headers,
      body: formData
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to start CV import.');
    }
    return res.json();
  }

  async importExistingResume(resumeId: string): Promise<{ job_id: string; message: string }> {
    return this.request<{ job_id: string; message: string }>(`/cv/import/resume/${resumeId}`, {
      method: 'POST'
    });
  }

  getImportEventsUrl(jobId: string): string {
    return `${API_BASE_URL}/cv/import/${jobId}/events`;
  }

  async getImportStatus(jobId: string): Promise<{ jobId: string; done: boolean; events: any[] }> {
    return this.request<{ jobId: string; done: boolean; events: any[] }>(`/cv/import/${jobId}/status`);
  }

  // ==========================================
  // Feature 3: Profile Experiences & Skills
  // ==========================================
  async getProfileExperiences(): Promise<ProfileExperience[]> {
    return this.request<ProfileExperience[]>('/profile/experiences');
  }

  async createProfileExperience(data: {
    job_title: string;
    company: string;
    industry?: string;
    start_year: number;
    start_month?: number | null;
    end_year?: number | null;
    end_month?: number | null;
    is_current?: boolean;
    description?: string;
    highlights?: string[];
  }): Promise<ProfileExperience> {
    return this.request<ProfileExperience>('/profile/experiences', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async updateProfileExperience(id: string, data: Partial<ProfileExperience>): Promise<ProfileExperience> {
    return this.request<ProfileExperience>(`/profile/experiences/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data)
    });
  }

  async deleteProfileExperience(id: string): Promise<void> {
    await this.request<void>(`/profile/experiences/${id}`, {
      method: 'DELETE'
    });
  }

  async getProfileSkills(): Promise<ProfileSkill[]> {
    return this.request<ProfileSkill[]>('/profile/skills');
  }

  async addProfileSkills(names: string[]): Promise<ProfileSkill[]> {
    return this.request<ProfileSkill[]>('/profile/skills', {
      method: 'POST',
      body: JSON.stringify({ names })
    });
  }

  async deleteProfileSkill(id: string): Promise<void> {
    await this.request<void>(`/profile/skills/${id}`, {
      method: 'DELETE'
    });
  }

  async enrichAddress(address: {
    line1?: string;
    city?: string;
    region?: string;
    postalCode?: string;
    country?: string;
  }): Promise<{
    line1?: string;
    city?: string;
    region?: string;
    postalCode?: string;
    country?: string;
    address_line1?: string;
    postal_code?: string;
  }> {
    return this.request<{
      line1?: string;
      city?: string;
      region?: string;
      postalCode?: string;
      country?: string;
      address_line1?: string;
      postal_code?: string;
    }>('/profile/enrich-address', {
      method: 'POST',
      body: JSON.stringify(address)
    });
  }

  async suggestIndustry(role?: string, skills?: string[]): Promise<{ suggested_industry: string }> {
    const params = new URLSearchParams();
    if (role) params.set('role', role);
    if (skills && skills.length > 0) params.set('skills', skills.join(','));
    const qs = params.toString() ? `?${params.toString()}` : '';
    return this.request<{ suggested_industry: string }>(`/profile/suggest-industry${qs}`);
  }

  // ==========================================
  // Feature 4: Multi-CV Memory & Presets
  // ==========================================
  async getPresets(): Promise<Preset[]> {
    return this.request<Preset[]>('/presets');
  }

  async createPreset(data: {
    name: string;
    target_role?: string | null;
    include_manual?: boolean;
    resume_ids?: string[];
  }): Promise<Preset> {
    return this.request<Preset>('/presets', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async updatePreset(id: string, data: Partial<Preset>): Promise<Preset> {
    return this.request<Preset>(`/presets/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  async deletePreset(id: string): Promise<void> {
    await this.request<void>(`/presets/${id}`, {
      method: 'DELETE'
    });
  }

  async getPresetContext(presetId: string): Promise<any> {
    return this.request<any>(`/presets/${presetId}/context`);
  }

  // ==========================================
  // Feature 5: Resume File View & Download
  // ==========================================
  getResumeFileUrl(id: string, disposition: 'inline' | 'attachment' = 'inline'): string {
    const token = this.getToken();
    const tokenParam = token ? `&token=${encodeURIComponent(token)}` : '';
    return `${API_BASE_URL}/resumes/${id}/file?disposition=${disposition}${tokenParam}`;
  }

  // ==========================================
  // Feature 6: Cover Letters & Regeneration
  // ==========================================
  async createCoverLetterRecord(data: {
    preset_id?: string | null;
    job_title?: string;
    company?: string;
    job_description: string;
    style?: string;
    variant?: string;
  }): Promise<CoverLetterRecord> {
    return this.request<CoverLetterRecord>('/cover-letters', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async regenerateCoverLetter(
    letterId: string,
    data: {
      current_text: string;
      change_request: string;
      style?: string;
      variant?: string;
    }
  ): Promise<CoverLetterRecord> {
    return this.request<CoverLetterRecord>(`/cover-letters/${letterId}/regenerate`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async getCoverLetterVersions(letterId: string): Promise<CoverLetterVersion[]> {
    return this.request<CoverLetterVersion[]>(`/cover-letters/${letterId}/versions`);
  }

  // ==========================================
  // Feature 8: Text Polish & Human Style
  // ==========================================
  async polishText(data: {
    text: string;
    style?: 'professional' | 'human';
    variant?: 'en-GB' | 'en-US';
    mode?: 'fix' | 'restyle';
  }): Promise<TextPolishResponse> {
    return this.request<TextPolishResponse>('/text/polish', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  // ==========================================
  // Real-Time Voice AI Mock Interview Simulator
  // ==========================================
  async startInterviewSession(data: {
    role_title: string;
    company?: string;
    format?: string;
    job_description?: string;
    resume_id?: string;
    total_questions?: number;
  }): Promise<{
    session_id: string;
    role_title: string;
    company: string;
    format_type: string;
    status: string;
    total_questions: number;
    current_turn: number;
    first_question: InterviewQuestionItem;
  }> {
    return this.request('/interviews/session/start', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async submitInterviewAnswer(
    sessionId: string,
    data: {
      turn_index: number;
      answer_text: string;
      duration_seconds: number;
      question?: string;
    }
  ): Promise<{
    session_id: string;
    turn_index: number;
    duration_seconds: number;
    speech_metrics: SpeechMetrics;
    star_evaluation: StarEvaluation;
    suitable_answers?: SuitableAnswer[];
    follow_up_prompt?: string | null;
    next_question?: InterviewQuestionItem | null;
    is_last_turn: boolean;
  }> {
    return this.request(`/interviews/session/${sessionId}/answer`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async completeInterviewSession(sessionId: string): Promise<{
    session_id: string;
    scorecard: InterviewScorecard;
    status: string;
  }> {
    return this.request(`/interviews/session/${sessionId}/complete`, {
      method: 'POST'
    });
  }

  async getInterviewSessions(): Promise<InterviewSessionSummary[]> {
    return this.request<InterviewSessionSummary[]>('/interviews/sessions');
  }

  async transcribeAudio(
    audioBlob: Blob,
    context?: { question?: string; role_title?: string; company?: string }
  ): Promise<{ transcript: string; words_count: number; status: string }> {
    const formData = new FormData();
    formData.append('file', audioBlob, 'interview_answer.wav');
    if (context?.question) formData.append('question', context.question);
    if (context?.role_title) formData.append('role_title', context.role_title);
    if (context?.company) formData.append('company', context.company);
    return this.request('/interviews/transcribe', {
      method: 'POST',
      body: formData
    });
  }

  async getInterviewSession(sessionId: string): Promise<{
    id: string;
    role_title: string;
    company: string;
    format_type: string;
    status: string;
    overall_score: number;
    turns: InterviewTurnRecord[];
    scorecard: InterviewScorecard;
    questions: InterviewQuestionItem[];
  }> {
    return this.request(`/interviews/session/${sessionId}`);
  }

  // -------------------------------------------------------------------------
  // Pillar 3 & 5: Career Path Knowledge Graph & Salary Negotiation Coach
  // -------------------------------------------------------------------------
  async getCareerIndustries(): Promise<CareerIndustry[]> {
    return this.request<CareerIndustry[]>('/career/industries');
  }

  async getCareerKnowledgeGraph(industryId?: string, country?: string): Promise<CareerKnowledgeGraphData> {
    const params = new URLSearchParams();
    if (industryId && industryId !== 'all') params.set('industry_id', industryId);
    if (country) params.set('country', country);
    const qs = params.toString() ? `?${params.toString()}` : '';
    return this.request<CareerKnowledgeGraphData>(`/career/graph${qs}`);
  }

  async computeCareerBridge(data: {
    current_role_id: string;
    target_role_id: string;
    candidate_skills?: string[];
    resume_id?: string;
    country?: string;
  }): Promise<CareerBridgeResponse> {
    return this.request<CareerBridgeResponse>('/career/bridge', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async getSalaryMetadata(roleTitle?: string, industryId?: string): Promise<SalaryMetadataResponse> {
    const params = new URLSearchParams();
    if (roleTitle) params.set('role_title', roleTitle);
    if (industryId && industryId !== 'all') params.set('industry_id', industryId);
    const qs = params.toString() ? `?${params.toString()}` : '';
    return this.request<SalaryMetadataResponse>(`/career/salary/metadata${qs}`);
  }

  async getVerifiedSalaryBenchmark(
    roleOrParams: string | { role_title: string; industry_id?: string; industry?: string; country?: string; currency?: string; years_experience?: number },
    industry?: string,
    country?: string,
    currency?: string,
    yearsExperience?: number
  ): Promise<VerifiedSalaryBenchmark> {
    const params = new URLSearchParams();
    if (typeof roleOrParams === 'object') {
      params.set('role_title', roleOrParams.role_title);
      if (roleOrParams.industry_id || roleOrParams.industry) {
        params.set('industry', (roleOrParams.industry_id || roleOrParams.industry)!);
      }
      if (roleOrParams.country) params.set('country', roleOrParams.country);
      if (roleOrParams.currency) params.set('currency', roleOrParams.currency);
      if (roleOrParams.years_experience) params.set('years_experience', String(roleOrParams.years_experience));
    } else {
      params.set('role_title', roleOrParams);
      if (industry) params.set('industry', industry);
      if (country) params.set('country', country);
      if (currency) params.set('currency', currency);
      if (yearsExperience) params.set('years_experience', String(yearsExperience));
    }
    return this.request<VerifiedSalaryBenchmark>(`/career/salary/benchmark?${params.toString()}`);
  }

  async verifySalaryOnline(data: {
    role_title: string;
    industry?: string;
    country?: string;
    currency?: string;
    years_experience?: number;
  }): Promise<VerifiedSalaryBenchmark> {
    return this.request<VerifiedSalaryBenchmark>('/career/salary/verify-online', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async predictSalary(data: {
    role_title: string;
    experience_years: number;
    skills?: string[];
    location_tier?: string;
    company_tier?: string;
    country?: string;
  }): Promise<SalaryPredictionResponse> {
    return this.request<SalaryPredictionResponse>('/career/salary/predict', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async evaluateNegotiationTurn(data: {
    role_title: string;
    current_offer: number;
    target_salary: number;
    candidate_pitch: string;
    turn_no: number;
    history?: any[];
    difficulty?: 'standard' | 'hard';
  }): Promise<NegotiationTurnResponse> {
    return this.request<NegotiationTurnResponse>('/career/negotiate/turn', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async getNegotiationScripts(data: {
    role_title: string;
    company?: string;
    current_offer: number;
    target_salary: number;
    highlight_skill?: string;
  }): Promise<CounterOfferScript[]> {
    return this.request<CounterOfferScript[]>('/career/negotiate/scripts', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  // -------------------------------------------------------------------------
  // Career Navigator Live Market & Auto-Refreshing Salaries
  // -------------------------------------------------------------------------
  async getNavigatorIndustries(): Promise<NavigatorIndustryItem[]> {
    return this.request<NavigatorIndustryItem[]>('/navigator/industries');
  }

  async getNavigatorCountries(): Promise<{ code: string; name: string; currency: string; symbol: string; flag: string }[]> {
    return this.request<{ code: string; name: string; currency: string; symbol: string; flag: string }[]>('/navigator/countries');
  }

  async getNavigatorRoles(params?: {
    industry_id?: number;
    work_mode?: string;
    q?: string;
    country?: string;
    experience_level?: string;
  }): Promise<JobRoleItem[]> {
    const qp = new URLSearchParams();
    if (params?.industry_id) qp.set('industry_id', String(params.industry_id));
    if (params?.work_mode && params.work_mode !== 'all') qp.set('work_mode', params.work_mode);
    if (params?.q) qp.set('q', params.q);
    if (params?.country) qp.set('country', params.country);
    if (params?.experience_level) qp.set('experience_level', params.experience_level);
    const qs = qp.toString();
    return this.request<JobRoleItem[]>(`/navigator/roles${qs ? `?${qs}` : ''}`);
  }

  async getNavigatorRoleSalary(
    roleId: number,
    params?: { country?: string; experience_level?: string; timeframe?: string; work_mode?: string; days?: number }
  ): Promise<RoleSalaryResponse> {
    const qp = new URLSearchParams();
    if (params?.country) qp.set('country', params.country);
    if (params?.experience_level) qp.set('experience_level', params.experience_level);
    if (params?.timeframe) qp.set('timeframe', params.timeframe);
    if (params?.work_mode && params.work_mode !== 'all') qp.set('work_mode', params.work_mode);
    if (params?.days) qp.set('days', String(params.days));
    const qs = qp.toString();
    return this.request<RoleSalaryResponse>(`/navigator/roles/${roleId}/salary${qs ? `?${qs}` : ''}`);
  }

  async getNavigatorRoleJobs(
    roleId: number,
    params?: { work_mode?: string; limit?: number }
  ): Promise<{ role_id: number; role_title: string; total_returned: number; postings: JobPostingItem[] }> {
    const qp = new URLSearchParams();
    if (params?.work_mode && params.work_mode !== 'all') qp.set('work_mode', params.work_mode);
    if (params?.limit) qp.set('limit', String(params.limit));
    const qs = qp.toString();
    return this.request(`/navigator/roles/${roleId}/jobs${qs ? `?${qs}` : ''}`);
  }

  async triggerNavigatorRefresh(): Promise<{ status: string; message: string; retry_after_seconds?: number }> {
    return this.request('/navigator/refresh', {
      method: 'POST'
    });
  }

  // ==========================================
  // PILLAR 1: HYBRID VECTOR RAG & ATS STRESS-TEST API
  // ==========================================

  async performVectorRagMatch(data: {
    resume_id?: string;
    resume_text?: string;
    job_description_id?: string;
    job_text?: string;
    job_title?: string;
    company?: string;
  }): Promise<VectorRagMatchResponse> {
    return this.request<VectorRagMatchResponse>('/jobs/vector-rag/match', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async runAtsStressTestRaw(text: string, fileName?: string): Promise<AtsStressTestResponse> {
    return this.request<AtsStressTestResponse>('/jobs/ats-stress-test/raw', {
      method: 'POST',
      body: JSON.stringify({ text, file_name: fileName || 'Uploaded Resume' })
    });
  }

  async runAtsStressTestResume(resumeId: string): Promise<AtsStressTestResponse> {
    return this.request<AtsStressTestResponse>(`/jobs/ats-stress-test/resume/${resumeId}`, {
      method: 'POST'
    });
  }

  // ==========================================
  // PILLAR 4 & 6: EXTENSION CLIP & RESUME TAILOR API
  // ==========================================

  async clipJobFromExtension(data: {
    title: string;
    company: string;
    location?: string;
    salary_range?: string;
    raw_text: string;
    source_url?: string;
    platform?: string;
    stage?: string;
  }): Promise<ExtensionJobClipResponse> {
    return this.request<ExtensionJobClipResponse>('/applications/extension/clip', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async tailorResumeForJob(
    resumeId: string,
    data: {
      job_description_id?: string;
      job_text?: string;
      target_role?: string;
    }
  ): Promise<ResumeTailorResponse> {
    return this.request<ResumeTailorResponse>(`/resumes/${resumeId}/tailor`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  // ==========================================
  // MODULE 7: EXPLAINABLE AI & BIAS AUDITOR
  // ==========================================

  async getXaiAttributions(data: {
    resume_text?: string;
    resume_id?: string;
    job_text?: string;
    baseline_score?: number;
  }): Promise<ShapAttributionResponse> {
    return this.request<ShapAttributionResponse>('/xai/attributions', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async runBiasAudit(data: { text: string }): Promise<BiasAuditResponse> {
    return this.request<BiasAuditResponse>('/xai/bias-audit', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async generateBlindProfile(data: {
    resume_text?: string;
    resume_id?: string;
    candidate_name?: string;
    email?: string;
    phone?: string;
  }): Promise<BlindProfileResponse> {
    return this.request<BlindProfileResponse>('/xai/blind-profile', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  // ==========================================
  // MODULE 10: GITHUB PROOF OF WORK VERIFIER
  // ==========================================

  async auditGithubProofOfWork(data: {
    username: string;
    claimed_skills?: string[];
  }): Promise<GithubAuditResponse> {
    return this.request<GithubAuditResponse>('/verification/github-audit', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  // ==========================================
  // MODULE 11: IN-BROWSER LIVE CODING SANDBOX
  // ==========================================

  async getCodingRoles(): Promise<RoleMetaItem[]> {
    return this.request<RoleMetaItem[]>('/coding/roles');
  }

  async getCodingChallenges(params?: {
    role?: string;
    track?: string;
    difficulty?: string;
  }): Promise<CodingChallengeItem[]> {
    const query = new URLSearchParams();
    if (params?.role && params.role !== 'all') query.set('role', params.role);
    if (params?.track && params.track !== 'all') query.set('track', params.track);
    if (params?.difficulty && params.difficulty !== 'all') query.set('difficulty', params.difficulty);
    const qs = query.toString();
    return this.request<CodingChallengeItem[]>(`/coding/challenges${qs ? `?${qs}` : ''}`);
  }

  async getCodingChallengeDetail(challengeId: string): Promise<CodingChallengeItem> {
    return this.request<CodingChallengeItem>(`/coding/challenges/${challengeId}`);
  }

  async getModelAnswer(challengeId: string): Promise<{
    challenge_id: string;
    title: string;
    model_answer: any;
    optimal_big_o: string;
  }> {
    return this.request(`/coding/challenges/${challengeId}/model-answer`);
  }

  async evaluateCodeSubmission(data: {
    challenge_id: string;
    code: string;
    language?: string;
    role?: string;
  }): Promise<CodingEvaluationResponse> {
    return this.request<CodingEvaluationResponse>('/coding/evaluate', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  // ==========================================
  // MODULE 12: UNIVERSITY PLACEMENT CELL PORTAL
  // ==========================================

  async getPlacementTelemetry(batch?: string): Promise<CohortTelemetryResponse> {
    const query = batch ? `?batch=${encodeURIComponent(batch)}` : '';
    return this.request<CohortTelemetryResponse>(`/placement/telemetry${query}`);
  }

  getPlacementExportUrl(batch?: string): string {
    const query = batch ? `?batch=${encodeURIComponent(batch)}` : '';
    return `${API_BASE_URL}/placement/export${query}`;
  }

  // ==========================================
  // SECTION 4.1: CV REVIEW & CONFIRM IMPORT
  // ==========================================

  async getCvReview(resumeId: string): Promise<CvReviewData> {
    return this.request<CvReviewData>(`/cv/review/${resumeId}`);
  }

  async confirmCvImport(
    resumeId: string,
    decisions: {
      fields: Record<string, { action: string; value?: any }>;
      experiences: Array<{
        action: string;
        job_title: string;
        company: string;
        industry?: string;
        start_year: number;
        start_month?: number;
        end_year?: number;
        end_month?: number;
        is_current?: boolean;
        description?: string;
        highlights?: string[];
      }>;
      skills: Array<{
        action: string;
        name: string;
        proficiency?: string;
      }>;
      education: Array<{
        action: string;
        institution: string;
        degree: string;
        field_of_study?: string;
        start_year?: number;
        end_year?: number;
      }>;
    }
  ): Promise<{ status: string; message: string; summary: any }> {
    return this.request(`/cv/confirm-import/${resumeId}`, {
      method: 'POST',
      body: JSON.stringify(decisions)
    });
  }

  // ==========================================
  // SECTION 4.2: MULTI-SOURCE SKILL EVIDENCE
  // ==========================================

  async getSkillEvidence(skillId: string): Promise<UserSkillEvidence[]> {
    return this.request<UserSkillEvidence[]>(`/profile/skills/${skillId}/evidence`);
  }

  async addSkillEvidence(
    skillId: string,
    data: {
      source_type: string;
      source_reference?: string;
      evidence_text: string;
      proficiency_estimate: string;
    }
  ): Promise<UserSkillEvidence> {
    return this.request<UserSkillEvidence>(`/profile/skills/${skillId}/evidence`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async disputeSkillEvidence(
    evidenceId: string,
    data: {
      action: 'dispute' | 'remove' | 'correct';
      reason?: string;
      new_proficiency?: string;
    }
  ): Promise<{ status: string; message: string }> {
    return this.request(`/profile/skills/evidence/${evidenceId}/dispute`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async getSkillEvidenceSummary(): Promise<{
    total_skills: number;
    demonstrated_skills: number;
    mentioned_skills: number;
    unverified_skills: number;
    sources_breakdown: Record<string, number>;
    total_evidences: number;
  }> {
    return this.request('/profile/skills/evidence-summary');
  }

  // ==========================================
  // SECTION 4.4: CAREER GOALS & PATH COMPARISON
  // ==========================================

  async getCareerGoals(): Promise<{ active_goal: CareerGoalData | null; has_goal: boolean }> {
    return this.request('/career/goals');
  }

  async saveCareerGoal(data: {
    target_role_id: string;
    target_title: string;
    target_date?: string;
    preferences?: Record<string, any>;
    milestones?: Array<{ id: string; title: string; completed: boolean }>;
  }): Promise<{ status: string; goal: CareerGoalData }> {
    return this.request('/career/goals', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async toggleGoalMilestone(
    goalId: string,
    milestoneId: string
  ): Promise<{ status: string; milestones: Array<{ id: string; title: string; completed: boolean }> }> {
    return this.request(`/career/goals/${goalId}/milestones/${milestoneId}`, {
      method: 'PATCH'
    });
  }

  async getCareerRoles(industry?: string): Promise<{ roles: CareerRoleOption[] }> {
    const url = industry && industry !== 'all' ? `/career/roles?industry=${encodeURIComponent(industry)}` : '/career/roles';
    return this.request<{ roles: CareerRoleOption[] }>(url);
  }

  async compareCareerPaths(
    targetRoleIds: string[],
    country: string = 'us',
    includeCurrentProfile: boolean = false
  ): Promise<{ comparisons: CareerComparisonItem[] }> {
    return this.request('/career/compare', {
      method: 'POST',
      body: JSON.stringify({
        target_role_ids: targetRoleIds,
        country,
        include_current_profile: includeCurrentProfile
      })
    });
  }

  // Social Profile Skills Extraction & Import (GitHub & LinkedIn)
  async extractSocialSkills(payload?: {
    github_url?: string;
    linkedin_url?: string;
  }): Promise<SocialSkillExtractionResponse> {
    return this.request<SocialSkillExtractionResponse>('/profile/extract-social-skills', {
      method: 'POST',
      body: JSON.stringify(payload || {})
    });
  }

  async importSocialSkills(skills: string[]): Promise<{
    status: string;
    imported_count: number;
    skills: string[];
  }> {
    return this.request('/profile/import-social-skills', {
      method: 'POST',
      body: JSON.stringify({ skills })
    });
  }

  // ==========================================
  // SECTION 4.5: ADAPTIVE LEARNING PLAN
  // ==========================================

  async getLearningPlan(): Promise<LearningPlanData> {
    return this.request<LearningPlanData>('/learning/plan');
  }

  async generateLearningPlan(data: {
    target_role: string;
    target_role_id?: string;
    weekly_hours?: number;
    preferred_days?: string[];
    industry?: string;
    focus_skills?: string[];
  }): Promise<LearningPlanData> {
    return this.request<LearningPlanData>('/learning/generate', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async updateLearningTaskStatus(
    taskId: string,
    status: 'planned' | 'in_progress' | 'completed' | 'assessed'
  ): Promise<{ status: string; task_id: string; new_status: string }> {
    return this.request(`/learning/tasks/${taskId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status })
    });
  }

  async getTaskQuiz(taskId: string): Promise<{
    task_id: string;
    skill_name: string;
    title: string;
    questions: Array<{ id: string; question: string; options: string[] }>;
  }> {
    return this.request(`/learning/tasks/${taskId}/quiz`);
  }

  async submitTaskQuiz(
    taskId: string,
    answers: Record<string, number>
  ): Promise<LearningQuizResult> {
    return this.request<LearningQuizResult>(`/learning/tasks/${taskId}/quiz`, {
      method: 'POST',
      body: JSON.stringify({ answers })
    });
  }

  async updateLearningSchedule(data: {
    weekly_hours: number;
    preferred_days: string[];
  }): Promise<{ status: string; weekly_hours: number; preferred_days: string[] }> {
    return this.request('/learning/schedule', {
      method: 'PATCH',
      body: JSON.stringify(data)
    });
  }

  // =========================================================================
  // Admin Command Center & Model Training API Methods
  // =========================================================================
  async getAdminStats(): Promise<AdminStatsData> {
    return this.request<AdminStatsData>('/admin/stats');
  }

  async getAdminModels(): Promise<AdminModelItem[]> {
    return this.request<AdminModelItem[]>('/admin/ai/models');
  }

  async trainSalaryModel(): Promise<{ message: string; metrics: AdminTrainingMetrics }> {
    return this.request<{ message: string; metrics: AdminTrainingMetrics }>('/admin/ai/train-salary', {
      method: 'POST'
    });
  }

  async reindexRag(conceptWeights?: Record<string, string[]>): Promise<{ message: string; results: AdminRagReindexResult }> {
    return this.request<{ message: string; results: AdminRagReindexResult }>('/admin/ai/reindex-rag', {
      method: 'POST',
      body: conceptWeights ? JSON.stringify(conceptWeights) : undefined
    });
  }

  async getAdminTelemetry(days: number = 30): Promise<AdminTelemetryData> {
    return this.request<AdminTelemetryData>(`/admin/ai/telemetry?days=${days}`);
  }

  async getAdminUsers(
    page: number = 1,
    limit: number = 20,
    search?: string,
    role?: string
  ): Promise<AdminUsersPageResponse> {
    const params = new URLSearchParams({ page: page.toString(), limit: limit.toString() });
    if (search) params.append('search', search);
    if (role && role !== 'all') params.append('role', role);
    return this.request<AdminUsersPageResponse>(`/admin/users?${params.toString()}`);
  }

  async updateUserRole(userId: string, role: string): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/admin/users/${userId}/role`, {
      method: 'PATCH',
      body: JSON.stringify({ role })
    });
  }

  async toggleUserStatus(userId: string, isActive: boolean): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/admin/users/${userId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ is_active: isActive })
    });
  }

  async exportUserData(userId: string): Promise<Record<string, any>> {
    return this.request<Record<string, any>>(`/admin/users/${userId}/export`);
  }

  async deleteUserGdpr(userId: string): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/admin/users/${userId}`, {
      method: 'DELETE'
    });
  }

  async getAdminRoles(industry?: string): Promise<{ total_roles: number; industries: any[]; roles: AdminCareerRole[] }> {
    const q = industry ? `?industry=${encodeURIComponent(industry)}` : '';
    return this.request<{ total_roles: number; industries: any[]; roles: AdminCareerRole[] }>(`/admin/taxonomy/roles${q}`);
  }

  async updateAdminRole(roleId: string, data: Partial<AdminCareerRole>): Promise<{ message: string; role: any }> {
    return this.request<{ message: string; role: any }>(`/admin/taxonomy/roles/${roleId}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  async getAdminMultipliers(): Promise<AdminMultipliersResponse> {
    return this.request<AdminMultipliersResponse>('/admin/taxonomy/multipliers');
  }

  async updateAdminMultiplier(tierId: string, multiplier: number, description?: string): Promise<{ message: string; tier: any }> {
    return this.request<{ message: string; tier: any }>('/admin/taxonomy/multipliers', {
      method: 'PUT',
      body: JSON.stringify({ tier_id: tierId, multiplier, description })
    });
  }

  async getSkillClusters(): Promise<{ clusters: Record<string, string[]> }> {
    return this.request<{ clusters: Record<string, string[]> }>('/admin/taxonomy/skill-clusters');
  }

  async updateSkillCluster(clusterName: string, keywords: string[]): Promise<{ message: string; clusters: any }> {
    return this.request<{ message: string; clusters: any }>('/admin/taxonomy/skill-clusters', {
      method: 'PUT',
      body: JSON.stringify({ cluster_name: clusterName, keywords })
    });
  }

  async getAtsRules(): Promise<{ rules: Record<string, AdminAtsRuleEngine> }> {
    return this.request<{ rules: Record<string, AdminAtsRuleEngine> }>('/admin/ats/rules');
  }

  async updateAtsRules(engineKey: string, passThreshold?: number, tablePenaltyPts?: number): Promise<{ message: string; engine: any }> {
    const params = new URLSearchParams({ engine_key: engineKey });
    if (passThreshold !== undefined) params.append('pass_threshold', passThreshold.toString());
    if (tablePenaltyPts !== undefined) params.append('table_penalty_pts', tablePenaltyPts.toString());
    return this.request<{ message: string; engine: any }>(`/admin/ats/rules?${params.toString()}`, {
      method: 'PUT'
    });
  }

  async getInterviewQuestions(role?: string): Promise<{ questions: AdminInterviewQuestion[] }> {
    const q = role ? `?role=${encodeURIComponent(role)}` : '';
    return this.request<{ questions: AdminInterviewQuestion[] }>(`/admin/interviews/questions${q}`);
  }

  async createInterviewQuestion(data: {
    role: string;
    category: string;
    question: string;
    difficulty: string;
    star_benchmark?: Record<string, string>;
  }): Promise<{ message: string; question: AdminInterviewQuestion }> {
    return this.request<{ message: string; question: AdminInterviewQuestion }>('/admin/interviews/questions', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async deleteInterviewQuestion(qId: string): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/admin/interviews/questions/${qId}`, {
      method: 'DELETE'
    });
  }

  async triggerSalaryRefresh(maxRoles: number = 10): Promise<{ message: string; status: string }> {
    return this.request<{ message: string; status: string }>(`/admin/scheduler/trigger-salary-refresh?max_roles=${maxRoles}`, {
      method: 'POST'
    });
  }

  async getAdminAuditLogs(limit: number = 30, action?: string): Promise<{ items: AdminAuditLogItem[] }> {
    const q = action ? `?limit=${limit}&action=${encodeURIComponent(action)}` : `?limit=${limit}`;
    return this.request<{ items: AdminAuditLogItem[] }>(`/admin/audit-logs${q}`);
  }

  // --- 14-Tab Admin Panel & AI Training Center API Extensions ---
  async getAdminMe(): Promise<{ id: string; email: string; full_name: string | null; role: string; is_admin: boolean; permissions: Record<string, boolean> }> {
    return this.request('/admin/me');
  }

  async getDashboardSummary(): Promise<any> {
    return this.request('/admin/dashboard/summary');
  }

  async getDashboardTimeseries(days: number = 30): Promise<{ timeseries: Array<{ date: string; signups: number; analyses: number; avg_score: number }> }> {
    return this.request(`/admin/dashboard/timeseries?days=${days}`);
  }

  async getAdminResumes(page: number = 1, limit: number = 20, search?: string, fileType?: string): Promise<{ total: number; page: number; limit: number; items: any[] }> {
    const params = new URLSearchParams({ page: page.toString(), limit: limit.toString() });
    if (search) params.append('search', search);
    if (fileType) params.append('file_type', fileType);
    return this.request(`/admin/resumes?${params.toString()}`);
  }

  async getAdminResumeDetail(id: string): Promise<any> {
    return this.request(`/admin/resumes/${id}`);
  }

  async getAnalysisStats(): Promise<any> {
    return this.request('/admin/analysis/stats');
  }

  async simulateScoring(weights: { structure_weight: number; readability_weight: number; impact_weight: number; skills_weight: number; sample_size?: number }): Promise<any> {
    return this.request('/admin/analysis/simulate', {
      method: 'POST',
      body: JSON.stringify(weights)
    });
  }

  async getApplicationsFunnel(): Promise<any> {
    return this.request('/admin/activity/funnel');
  }

  async getTrainingOverview(): Promise<any> {
    return this.request('/admin/training/overview');
  }

  async getTrainingDatasets(): Promise<{ datasets: any[] }> {
    return this.request('/admin/training/datasets');
  }

  async createTrainingDataset(data: { name: string; description?: string; source_type?: string; license?: string }): Promise<any> {
    return this.request('/admin/training/datasets', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async startOnlineImport(data: { dataset_id: string; source_mode: string; license_declared: string; confirm_right_to_use: boolean; urls?: string[]; target_roles?: string[]; count_per_role?: number }): Promise<any> {
    return this.request('/admin/training/imports', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async getNextAnnotation(datasetId?: string): Promise<{ document: any; pre_annotations: any }> {
    const q = datasetId ? `?dataset_id=${encodeURIComponent(datasetId)}` : '';
    return this.request(`/admin/training/annotation/next${q}`);
  }

  async saveAnnotation(data: { document_id: string; task_type?: string; label_data: any; status: string; is_gold?: boolean }): Promise<any> {
    return this.request('/admin/training/annotations', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async getMistakesQueue(status?: string, component?: string): Promise<{ mistakes: any[] }> {
    const params = new URLSearchParams();
    if (status) params.append('status_filter', status);
    if (component) params.append('component', component);
    return this.request(`/admin/training/mistakes?${params.toString()}`);
  }

  async resolveMistake(id: string, data: { resolution_type: string; resolution_note: string; create_regression_test?: boolean }): Promise<any> {
    return this.request(`/admin/training/mistakes/${id}/resolve`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async getRegressionTests(): Promise<{ summary: any; tests: any[] }> {
    return this.request('/admin/training/regression-tests');
  }

  async createTrainingJob(data: { model_type: string; dataset_ids?: string[]; preset?: string; epochs?: number }): Promise<any> {
    return this.request('/admin/training/jobs', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async getTrainingJobs(): Promise<{ jobs: any[] }> {
    return this.request('/admin/training/jobs');
  }

  async getEvaluationMetrics(modelType: string = 'section'): Promise<any> {
    return this.request(`/admin/training/evaluation?model_type=${encodeURIComponent(modelType)}`);
  }

  async getModelRegistry(): Promise<{ models: any[] }> {
    return this.request('/admin/models');
  }

  async promoteModel(id: string, overrideReason?: string): Promise<any> {
    return this.request(`/admin/models/${id}/promote`, {
      method: 'POST',
      body: JSON.stringify({ override_reason: overrideReason })
    });
  }

  async rollbackModel(modelType: string): Promise<any> {
    return this.request(`/admin/models/${modelType}/rollback`, {
      method: 'POST'
    });
  }

  async getAutoLearningSettings(): Promise<any> {
    return this.request('/admin/training/auto-learning');
  }

  async updateAutoLearningSettings(data: any): Promise<any> {
    return this.request('/admin/training/auto-learning', {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  async getSkillsTaxonomy(): Promise<{ skills: any[] }> {
    return this.request('/admin/skills');
  }

  async createSkillTaxonomy(data: { canonical_name: string; category?: string; aliases?: string[] }): Promise<any> {
    return this.request('/admin/skills', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async getLanguageRules(): Promise<{ rules: any[] }> {
    return this.request('/admin/language-rules');
  }

  async createLanguageRule(data: { rule_type: string; phrase: string; severity?: string; suggested_replacements?: string[] }): Promise<any> {
    return this.request('/admin/language-rules', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async getScoringConfigs(): Promise<{ configs: any[] }> {
    return this.request('/admin/scoring-configs');
  }

  async createScoringConfig(data: { version: string; name: string; structure_weight: number; readability_weight: number; impact_weight: number; skills_weight: number }): Promise<any> {
    return this.request('/admin/scoring-configs', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async activateScoringConfig(id: string): Promise<any> {
    return this.request(`/admin/scoring-configs/${id}/activate`, {
      method: 'POST'
    });
  }

  async getPromptTemplates(): Promise<{ prompts: any[] }> {
    return this.request('/admin/prompts');
  }

  async testPrompt(id: string, data: { template_text: string; sample_resume_text: string }): Promise<any> {
    return this.request(`/admin/prompts/${id}/test`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async getFeedbackInbox(status?: string): Promise<{ feedback: any[] }> {
    const q = status ? `?status_filter=${encodeURIComponent(status)}` : '';
    return this.request(`/admin/feedback${q}`);
  }

  async convertFeedbackToMistake(id: string): Promise<any> {
    return this.request(`/admin/feedback/${id}/to-mistake`, {
      method: 'POST'
    });
  }

  async getTrainingConsents(): Promise<any> {
    return this.request('/admin/privacy/consents');
  }

  async getSystemSettings(): Promise<any> {
    return this.request('/admin/system/settings');
  }

  async getFeatureFlags(): Promise<{ flags: any[] }> {
    return this.request('/admin/system/feature-flags');
  }

  async updateFeatureFlag(key: string, enabled: boolean): Promise<any> {
    return this.request('/admin/system/feature-flags', {
      method: 'PUT',
      body: JSON.stringify({ key, enabled })
    });
  }

  async updateUserTrainingConsent(consent: boolean): Promise<{ message: string; training_consent: boolean }> {
    return this.request('/users/training-consent', {
      method: 'PUT',
      body: JSON.stringify({ consent })
    });
  }

  async submitFeedback(data: { category: string; description: string; resume_id?: string }): Promise<{ message: string; feedback_id: string }> {
    return this.request('/users/feedback', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

}

export const api = new ApiService();

