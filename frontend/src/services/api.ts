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
  AppearanceMode
} from '../types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

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

    return response.json();
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

  getResumeDownloadUrl(id: string): string {
    return `${API_BASE_URL}/resumes/${id}/download`;
  }

  getAnalysisPdfUrl(resumeId: string, analysisId: string): string {
    return `${API_BASE_URL}/resumes/${resumeId}/analyses/${analysisId}/pdf`;
  }

  // Job Matching
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

  async generateCoverLetter(data: { resume_id: string; job_description: string; company_name?: string; job_title?: string; tone?: string }) {
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
}

export const api = new ApiService();

