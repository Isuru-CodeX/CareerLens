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
  NavigatorIndustryItem
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

  async transcribeAudio(audioBlob: Blob): Promise<{ transcript: string; words_count: number; status: string }> {
    const formData = new FormData();
    formData.append('file', audioBlob, 'interview_answer.wav');
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

  async getCareerKnowledgeGraph(industryId?: string): Promise<CareerKnowledgeGraphData> {
    const q = industryId && industryId !== 'all' ? `?industry_id=${encodeURIComponent(industryId)}` : '';
    return this.request<CareerKnowledgeGraphData>(`/career/graph${q}`);
  }

  async computeCareerBridge(data: {
    current_role_id: string;
    target_role_id: string;
    candidate_skills?: string[];
    resume_id?: string;
  }): Promise<CareerBridgeResponse> {
    return this.request<CareerBridgeResponse>('/career/bridge', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async getSalaryMetadata(): Promise<SalaryMetadataResponse> {
    return this.request<SalaryMetadataResponse>('/career/salary/metadata');
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

  async getNavigatorRoles(params?: {
    industry_id?: number;
    work_mode?: string;
    q?: string;
    country?: string;
  }): Promise<JobRoleItem[]> {
    const qp = new URLSearchParams();
    if (params?.industry_id) qp.set('industry_id', String(params.industry_id));
    if (params?.work_mode && params.work_mode !== 'all') qp.set('work_mode', params.work_mode);
    if (params?.q) qp.set('q', params.q);
    if (params?.country) qp.set('country', params.country);
    const qs = qp.toString();
    return this.request<JobRoleItem[]>(`/navigator/roles${qs ? `?${qs}` : ''}`);
  }

  async getNavigatorRoleSalary(
    roleId: number,
    params?: { country?: string; work_mode?: string; days?: number }
  ): Promise<RoleSalaryResponse> {
    const qp = new URLSearchParams();
    if (params?.country) qp.set('country', params.country);
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
}

export const api = new ApiService();

