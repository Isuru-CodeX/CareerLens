import React, { useState, useEffect } from 'react';
import {
  CheckCircle2,
  XCircle,
  HelpCircle,
  Sparkles,
  Zap
} from 'lucide-react';
import { Resume, JobMatch } from '../types';
import { api } from '../services/api';
import { ScoreGauge } from '../components/ScoreGauge';
import { DisclaimerBanner } from '../components/DisclaimerBanner';

interface JobMatchViewProps {
  initialResumeId?: string;
  onNavigate: (view: string, extra?: any) => void;
}

export const JobMatchView: React.FC<JobMatchViewProps> = ({
  initialResumeId,
  onNavigate
}) => {
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [selectedResumeId, setSelectedResumeId] = useState<string>(initialResumeId || '');
  const [jobTitle, setJobTitle] = useState('Senior Full-Stack Engineer');
  const [company, setCompany] = useState('TechFlow Labs');
  const [jobText, setJobText] = useState(`TechFlow is seeking a Senior Full-Stack Engineer to scale our real-time collaboration suite.
Requirements:
- 5+ years of software engineering experience.
- Deep expertise in Python (FastAPI/Django) and modern TypeScript / React.
- Solid understanding of PostgreSQL and Redis.
- Hands-on experience with Docker, CI/CD, and AWS infrastructure.
- Passion for clean code, automated testing, and mentorship.
Preferred:
- Kubernetes and Kafka experience.
- Experience with GraphQL APIs.`);

  const [matchResult, setMatchResult] = useState<JobMatch | null>(null);
  const [isMatching, setIsMatching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialResumeId) {
      setSelectedResumeId(initialResumeId);
    }
  }, [initialResumeId]);

  useEffect(() => {
    let isMounted = true;
    const init = async () => {
      try {
        const list = await api.getResumes();
        if (!isMounted) return;
        setResumes(list);
        setSelectedResumeId(prev => prev || (list.length > 0 ? list[0].id : ''));
        const matches = await api.getMatches();
        if (!isMounted) return;
        if (matches.length > 0) {
          setMatchResult(matches[0]);
        }
      } catch (err) {
        console.error(err);
      }
    };
    init();
    return () => { isMounted = false; };
  }, []);

  const handleRunMatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedResumeId) {
      setError('Please select a resume to match.');
      return;
    }
    if (!jobText.trim()) {
      setError('Please provide a job description.');
      return;
    }

    setIsMatching(true);
    setError(null);

    try {
      const match = await api.matchResume({
        resume_id: selectedResumeId,
        job_text: jobText,
        job_title: jobTitle,
        company: company
      });
      setMatchResult(match);
    } catch (err: any) {
      setError(err.message || 'Job match failed.');
    } finally {
      setIsMatching(false);
    }
  };

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      <DisclaimerBanner />

      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          Job Description Matcher & Skill Gap Analysis
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
          Evaluate keyword overlap, identify missing competencies, and surface quote evidence from your resume.
        </p>
      </div>

      {/* Input Form & Setup */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        <form onSubmit={handleRunMatch} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Select Resume
              </label>
              <select
                value={selectedResumeId}
                onChange={(e) => setSelectedResumeId(e.target.value)}
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              >
                {resumes.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.title} ({r.target_role || 'General'})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Target Job Title
              </label>
              <input
                type="text"
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                placeholder="e.g. Senior Full-Stack Engineer"
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Company Name
              </label>
              <input
                type="text"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="e.g. Stripe, TechFlow"
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Job Description (Paste raw job posting text)
            </label>
            <textarea
              rows={6}
              value={jobText}
              onChange={(e) => setJobText(e.target.value)}
              placeholder="Paste requirements, responsibilities, and qualifications..."
              className="w-full p-3.5 text-xs rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono leading-relaxed"
            />
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 text-red-700 dark:text-red-300 text-xs">
              {error}
            </div>
          )}

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isMatching}
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-md transition-all flex items-center gap-2 disabled:opacity-50"
            >
              <Zap className="w-4 h-4" />
              <span>{isMatching ? 'Calculating Alignment...' : 'Run Deep Match Analysis'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Match Results */}
      {matchResult && (
        <div className="space-y-6">
          {/* Top Score Spotlight */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col items-center justify-center">
              <ScoreGauge
                score={matchResult.overall_score}
                size={160}
                label="Role Alignment Index"
                sublabel="Keyword & Evidence Match"
              />
            </div>

            <div className="md:col-span-2 p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between space-y-4">
              <div>
                <h3 className="font-bold text-base text-slate-900 dark:text-white">
                  Match Methodology & Transparency
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Algorithmic breakdown of required skills coverage and domain terminology
                </p>
              </div>

              <div className="space-y-2">
                {matchResult.match_explanations.map((exp, i) => (
                  <div
                    key={i}
                    className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/50 text-xs text-slate-700 dark:text-slate-300 flex items-center gap-2"
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{exp}</span>
                  </div>
                ))}
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <span className="text-xs text-slate-500">
                  Ready to tailor your resume bullets?
                </span>
                <button
                  onClick={() =>
                    onNavigate('ai', {
                      tab: 'rewrite',
                      jobDescription: jobText,
                      targetRole: jobTitle
                    })
                  }
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold text-xs shadow-xs flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Tailor Resume With AI</span>
                </button>
              </div>
            </div>
          </div>

          {/* 3-Column Skills Breakdown: Matched vs Missing vs Partial */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Matched Skills */}
            <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                      Matched Skills
                    </h3>
                    <span className="text-[10px] text-slate-400">
                      {matchResult.matched_skills.length} verified in resume
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
                {matchResult.matched_skills.map((s, i) => (
                  <div
                    key={i}
                    className="p-3 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40 text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between font-bold text-emerald-900 dark:text-emerald-200">
                      <span>{s.name}</span>
                      {s.is_required && (
                        <span className="text-[10px] bg-emerald-200 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-300 px-1.5 py-0.5 rounded-sm">
                          Core Required
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400 italic line-clamp-2">
                      "{s.evidence}"
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Missing Skills */}
            <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-red-50 dark:bg-red-950/60 text-red-600">
                    <XCircle className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                      Missing Skills
                    </h3>
                    <span className="text-[10px] text-slate-400">
                      {matchResult.missing_skills.length} mentioned in JD
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
                {matchResult.missing_skills.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-400">
                    No critical missing skills detected.
                  </div>
                ) : (
                  matchResult.missing_skills.map((s, i) => (
                    <div
                      key={i}
                      className="p-3 rounded-2xl bg-red-50/50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/40 text-xs space-y-1"
                    >
                      <div className="flex items-center justify-between font-bold text-red-900 dark:text-red-200">
                        <span>{s.name}</span>
                        {s.is_required && (
                          <span className="text-[10px] bg-red-200 dark:bg-red-900 text-red-800 dark:text-red-300 px-1.5 py-0.5 rounded-sm">
                            Required Gap
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-600 dark:text-slate-400">
                        {s.recommendation}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Partial / Transferable Skills */}
            <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600">
                    <HelpCircle className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                      Partial & Transferable
                    </h3>
                    <span className="text-[10px] text-slate-400">
                      Related skills found in candidate profile
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
                {matchResult.partial_skills.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-400">
                    No related bridge skills recorded.
                  </div>
                ) : (
                  matchResult.partial_skills.map((s, i) => (
                    <div
                      key={i}
                      className="p-3 rounded-2xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/40 text-xs space-y-1"
                    >
                      <div className="flex items-center justify-between font-bold text-amber-900 dark:text-amber-200">
                        <span>{s.name}</span>
                        <span className="text-[10px] text-amber-600">
                          Transferable
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600 dark:text-slate-400">
                        Candidate has experience with <span className="font-semibold text-slate-900 dark:text-white">{s.related_found}</span>. Mention if it applies to {s.name}.
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
