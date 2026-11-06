import React, { useState, useEffect, useCallback } from 'react';
import {
  Briefcase,
  Check,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Layers,
  Plus,
  Trash2,
  Edit3,
  RefreshCw,
  Award,
  Info,
  X
} from 'lucide-react';
import { ResumeExperience, ExperienceSummary } from '../types';
import { api } from '../services/api';

interface ExperienceIntelligencePanelProps {
  resumeId: string;
  resumeTitle?: string;
  onExperiencesUpdated?: () => void;
}

const checkExperienceOverlap = (exp: ResumeExperience, allExperiences: ResumeExperience[]): boolean => {
  if (!exp.start_year) return false;
  const now = new Date();
  const currentMonthIdx = now.getFullYear() * 12 + (now.getMonth() + 1);

  const startIdx = exp.start_year * 12 + (exp.start_month || 1);
  const endIdx = exp.is_current
    ? currentMonthIdx
    : (exp.end_year || exp.start_year) * 12 + (exp.end_month || 12);

  for (const other of allExperiences) {
    if (other.id === exp.id || !other.start_year) continue;
    const otherStart = other.start_year * 12 + (other.start_month || 1);
    const otherEnd = other.is_current
      ? currentMonthIdx
      : (other.end_year || other.start_year) * 12 + (other.end_month || 12);

    if (Math.max(startIdx, otherStart) <= Math.min(endIdx, otherEnd)) {
      return true;
    }
  }
  return false;
};

export const ExperienceIntelligencePanel: React.FC<ExperienceIntelligencePanelProps> = ({
  resumeId,
  resumeTitle = 'Resume',
  onExperiencesUpdated
}) => {
  const [experiences, setExperiences] = useState<ResumeExperience[]>([]);
  const [summary, setSummary] = useState<ExperienceSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [includeInternships, setIncludeInternships] = useState(true);

  // Edit / Add modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingExp, setEditingExp] = useState<ResumeExperience | null>(null);
  const [formTitle, setFormTitle] = useState('');
  const [formCompany, setFormCompany] = useState('');
  const [formCategory, setFormCategory] = useState('professional_employment');
  const [formEmpType, setFormEmpType] = useState('full_time');
  const [formStartYear, setFormStartYear] = useState<number | ''>(2023);
  const [formStartMonth, setFormStartMonth] = useState<number | ''>(1);
  const [formEndYear, setFormEndYear] = useState<number | ''>(2024);
  const [formEndMonth, setFormEndMonth] = useState<number | ''>(12);
  const [formIsCurrent, setFormIsCurrent] = useState(false);
  const [formLocation, setFormLocation] = useState('');
  const [formResponsibilities, setFormResponsibilities] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isReparsing, setIsReparsing] = useState(false);

  const fetchExperiences = useCallback(async () => {
    try {
      const res = await api.getExperiences(resumeId, includeInternships);
      setExperiences(res.experiences);
      setSummary(res.summary);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to load experience intelligence.');
    } finally {
      setLoading(false);
    }
  }, [resumeId, includeInternships]);

  useEffect(() => {
    let isMounted = true;
    api.getExperiences(resumeId, includeInternships)
      .then((res) => {
        if (!isMounted) return;
        setExperiences(res.experiences);
        setSummary(res.summary);
        setError(null);
      })
      .catch((err: any) => {
        if (!isMounted) return;
        setError(err.message || 'Failed to load experience intelligence.');
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [resumeId, includeInternships]);

  const handleVerify = async (expId: string) => {
    try {
      const updated = await api.verifyExperience(resumeId, expId);
      setExperiences((prev) => prev.map((e) => (e.id === expId ? updated : e)));
      if (onExperiencesUpdated) onExperiencesUpdated();
    } catch (err: any) {
      alert(err.message || 'Failed to verify experience.');
    }
  };

  const handleDelete = async (expId: string) => {
    if (!confirm('Are you sure you want to remove this experience record?')) return;
    try {
      await api.deleteExperience(resumeId, expId);
      await fetchExperiences();
      if (onExperiencesUpdated) onExperiencesUpdated();
    } catch (err: any) {
      alert(err.message || 'Failed to remove experience.');
    }
  };

  const handleReparse = async () => {
    setIsReparsing(true);
    try {
      const res = await api.reparseExperiences(resumeId);
      setExperiences(res.experiences);
      setSummary(res.summary);
      if (onExperiencesUpdated) onExperiencesUpdated();
    } catch (err: any) {
      alert(err.message || 'Failed to re-analyze experiences.');
    } finally {
      setIsReparsing(false);
    }
  };

  const openAddModal = () => {
    setEditingExp(null);
    setFormTitle('');
    setFormCompany('');
    setFormCategory('professional_employment');
    setFormEmpType('full_time');
    setFormStartYear(new Date().getFullYear());
    setFormStartMonth(1);
    setFormEndYear(new Date().getFullYear());
    setFormEndMonth(12);
    setFormIsCurrent(false);
    setFormLocation('');
    setFormResponsibilities('');
    setIsModalOpen(true);
  };

  const openEditModal = (exp: ResumeExperience) => {
    setEditingExp(exp);
    setFormTitle(exp.job_title);
    setFormCompany(exp.company);
    setFormCategory(exp.experience_category);
    setFormEmpType(exp.employment_type);
    setFormStartYear(exp.start_year || '');
    setFormStartMonth(exp.start_month || '');
    setFormEndYear(exp.end_year || '');
    setFormEndMonth(exp.end_month || '');
    setFormIsCurrent(exp.is_current);
    setFormLocation(exp.location || '');
    setFormResponsibilities((exp.responsibilities || []).join('\n'));
    setIsModalOpen(true);
  };

  const handleModalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim() || !formCompany.trim()) return;

    setIsSaving(true);
    const respBullets = formResponsibilities
      .split('\n')
      .map((b) => b.trim())
      .filter(Boolean);

    const payload = {
      job_title: formTitle.trim(),
      company: formCompany.trim(),
      experience_category: formCategory,
      employment_type: formEmpType,
      start_year: formStartYear ? Number(formStartYear) : null,
      start_month: formStartMonth ? Number(formStartMonth) : null,
      end_year: formIsCurrent ? null : formEndYear ? Number(formEndYear) : null,
      end_month: formIsCurrent ? null : formEndMonth ? Number(formEndMonth) : null,
      is_current: formIsCurrent,
      location: formLocation.trim() || null,
      responsibilities: respBullets
    };

    try {
      if (editingExp) {
        await api.updateExperience(resumeId, editingExp.id, payload);
      } else {
        await api.addExperience(resumeId, payload);
      }
      setIsModalOpen(false);
      await fetchExperiences();
      if (onExperiencesUpdated) onExperiencesUpdated();
    } catch (err: any) {
      alert(err.message || 'Failed to save experience entry.');
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center space-y-3">
        <div className="w-7 h-7 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Extracting Experience Intelligence and checking timeline overlaps...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 text-xs text-red-700 dark:text-red-300 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
        <button
          onClick={fetchExperiences}
          className="underline font-semibold hover:text-red-800"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* 1. Header Metrics & Controls */}
      <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Award className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                Experience Intelligence Engine
              </h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Verified career tenure & non-double-counted calendar duration for {resumeTitle}
            </p>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={handleReparse}
              disabled={isReparsing}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 text-slate-700 dark:text-slate-300 text-xs font-semibold transition-colors disabled:opacity-50"
              title="Re-run regex & heuristic parser on original resume text"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isReparsing ? 'animate-spin' : ''}`} />
              <span>Re-parse CV</span>
            </button>

            <button
              onClick={openAddModal}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition-colors shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Experience</span>
            </button>
          </div>
        </div>

        {summary && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center pt-2 border-t border-slate-100 dark:border-slate-800">
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60">
              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium block">
                Professional Tenure
              </span>
              <span className="text-sm font-extrabold text-blue-600 dark:text-blue-400 mt-0.5 block">
                {summary.professional_duration_formatted}
              </span>
              <span className="text-[10px] text-slate-400">
                {summary.non_overlapping_roles_count} non-overlapping roles
              </span>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60">
              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium block">
                Relevant Total
              </span>
              <span className="text-sm font-extrabold text-indigo-600 dark:text-indigo-400 mt-0.5 block">
                {summary.relevant_experience_formatted}
              </span>
              <div className="mt-1 flex items-center justify-center gap-1.5">
                <input
                  type="checkbox"
                  id="include-intern-toggle"
                  checked={includeInternships}
                  onChange={(e) => setIncludeInternships(e.target.checked)}
                  className="w-3 h-3 text-blue-600 rounded-sm"
                />
                <label htmlFor="include-intern-toggle" className="text-[10px] text-slate-500 cursor-pointer">
                  Internships included
                </label>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60">
              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium block">
                Overlap Deduplicated
              </span>
              <span className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400 mt-0.5 block">
                {summary.overlap_months_adjusted > 0
                  ? `${summary.overlap_months_adjusted} mos`
                  : '0 mos'}
              </span>
              <span className="text-[10px] text-slate-400">
                Parallel periods merged
              </span>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60">
              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium block">
                Projects (Academic/Personal)
              </span>
              <span className="text-sm font-extrabold text-slate-700 dark:text-slate-300 mt-0.5 block">
                {summary.academic_projects_count + summary.personal_projects_count}
              </span>
              <span className="text-[10px] text-slate-400">
                Excluded from tenure
              </span>
            </div>
          </div>
        )}

        <div className="p-3 rounded-xl bg-blue-50/60 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/60 text-[11px] text-blue-800 dark:text-blue-300 flex items-start gap-2">
          <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
          <p>
            {summary?.calculation_basis || 'Calendar months calculated inclusively. Overlapping dates are merged so parallel roles are not double-counted.'}
          </p>
        </div>
      </div>

      {/* 2. Chronological Timeline */}
      {experiences.length === 0 ? (
        <div className="p-8 text-center rounded-2xl bg-white dark:bg-slate-900 border border-dashed border-slate-200 dark:border-slate-800 space-y-2">
          <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            No work experience extracted yet.
          </p>
          <p className="text-[11px] text-slate-400">
            Click &quot;Re-parse CV&quot; to auto-detect roles or &quot;Add Experience&quot; to add them manually.
          </p>
        </div>
      ) : (
        <div className="relative pl-6 sm:pl-8 space-y-4 before:absolute before:left-3 sm:before:left-4 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
          {experiences.map((exp) => {
            const overlapping = checkExperienceOverlap(exp, experiences);
            const incompleteDates = !exp.start_month || (!exp.is_current && !exp.end_month);

            return (
              <div key={exp.id} className="relative group">
                {/* Timeline node icon */}
                <div
                  className={`absolute -left-6 sm:-left-8 top-3.5 w-6 h-6 rounded-full border-2 flex items-center justify-center bg-white dark:bg-slate-900 shadow-xs z-10 ${
                    exp.verified_by_user
                      ? 'border-emerald-500 text-emerald-600'
                      : exp.needs_user_verification
                      ? 'border-amber-500 text-amber-500'
                      : 'border-blue-500 text-blue-500'
                  }`}
                >
                  {exp.verified_by_user ? (
                    <Check className="w-3.5 h-3.5" />
                  ) : (
                    <Briefcase className="w-3 h-3" />
                  )}
                </div>

                {/* Card Container */}
                <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition-colors space-y-3">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                          {exp.job_title}
                        </h4>
                        <span className="text-xs text-slate-400">at</span>
                        <span className="font-semibold text-xs text-blue-600 dark:text-blue-400">
                          {exp.company}
                        </span>
                        {exp.location && (
                          <span className="text-[11px] text-slate-400">
                            • {exp.location}
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-2 mt-1">
                        <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                          {exp.start_date_str || `${exp.start_year}`} – {exp.is_current ? 'Present' : exp.end_date_str || `${exp.end_year}`}
                        </span>
                        <span className="text-[11px] font-semibold text-slate-400">
                          ({Math.floor(exp.duration_months / 12) > 0 ? `${Math.floor(exp.duration_months / 12)}y ` : ''}{exp.duration_months % 12}m)
                        </span>
                      </div>
                    </div>

                    {/* Status Badges */}
                    <div className="flex flex-wrap items-center gap-1.5 self-start sm:self-auto">
                      {exp.verified_by_user ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Verified</span>
                        </span>
                      ) : exp.needs_user_verification ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300">
                          <AlertCircle className="w-3 h-3" />
                          <span>Needs review</span>
                        </span>
                      ) : null}

                      {overlapping && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-100 dark:bg-purple-950/70 text-purple-700 dark:text-purple-300">
                          <Layers className="w-3 h-3" />
                          <span>Overlap detected</span>
                        </span>
                      )}

                      {incompleteDates && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                          <Calendar className="w-3 h-3" />
                          <span>Incomplete dates</span>
                        </span>
                      )}

                      <span className="capitalize px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                        {exp.experience_category.replace('_', ' ')}
                      </span>
                    </div>
                  </div>

                  {/* Responsibilities list */}
                  {exp.responsibilities && exp.responsibilities.length > 0 && (
                    <ul className="space-y-1 pl-4 list-disc text-xs text-slate-600 dark:text-slate-400">
                      {exp.responsibilities.map((r, i) => (
                        <li key={i}>{r}</li>
                      ))}
                    </ul>
                  )}

                  {/* Source Evidence */}
                  {exp.source_evidence && (
                    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                      <span className="font-semibold text-slate-700 dark:text-slate-300">Source Evidence: </span>
                      &quot;{exp.source_evidence}&quot;
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
                    <div>
                      {!exp.verified_by_user && (
                        <button
                          onClick={() => handleVerify(exp.id)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Confirm & Verify</span>
                        </button>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openEditModal(exp)}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-medium transition-colors cursor-pointer"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Edit</span>
                      </button>

                      <button
                        onClick={() => handleDelete(exp.id)}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-red-50 hover:border-red-200 dark:hover:bg-red-950/40 text-slate-700 dark:text-slate-300 hover:text-red-600 dark:hover:text-red-400 text-xs font-medium transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Remove</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 3. Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs"
            onClick={() => setIsModalOpen(false)}
          />
          <div className="relative w-full max-w-lg rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-2xl z-10 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                {editingExp ? 'Edit Experience Record' : 'Add Experience Entry'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleModalSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Job Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Senior Software Engineer"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Company / Organization *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Acme Tech Solutions"
                  value={formCompany}
                  onChange={(e) => setFormCompany(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Category
                  </label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  >
                    <option value="professional_employment">Professional Employment</option>
                    <option value="internship">Internship</option>
                    <option value="freelance">Freelance</option>
                    <option value="volunteer">Volunteer</option>
                    <option value="academic_project">Academic Project</option>
                    <option value="personal_project">Personal Project</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Employment Type
                  </label>
                  <select
                    value={formEmpType}
                    onChange={(e) => setFormEmpType(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  >
                    <option value="full_time">Full-time</option>
                    <option value="part_time">Part-time</option>
                    <option value="contract">Contract</option>
                    <option value="internship">Internship</option>
                  </select>
                </div>
              </div>

              {/* Start Date */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Start Month (1-12)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="12"
                    placeholder="e.g. 1 (Jan)"
                    value={formStartMonth}
                    onChange={(e) => setFormStartMonth(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Start Year *
                  </label>
                  <input
                    type="number"
                    min="1980"
                    max="2035"
                    required
                    placeholder="e.g. 2022"
                    value={formStartYear}
                    onChange={(e) => setFormStartYear(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              {/* End Date */}
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="form-is-current"
                  checked={formIsCurrent}
                  onChange={(e) => setFormIsCurrent(e.target.checked)}
                  className="w-3.5 h-3.5 text-blue-600 rounded-sm"
                />
                <label htmlFor="form-is-current" className="font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
                  I currently work in this role
                </label>
              </div>

              {!formIsCurrent && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      End Month (1-12)
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="12"
                      placeholder="e.g. 12 (Dec)"
                      value={formEndMonth}
                      onChange={(e) => setFormEndMonth(e.target.value === '' ? '' : Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      End Year
                    </label>
                    <input
                      type="number"
                      min="1980"
                      max="2035"
                      placeholder="e.g. 2024"
                      value={formEndYear}
                      onChange={(e) => setFormEndYear(e.target.value === '' ? '' : Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Location (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. San Francisco, CA (Hybrid)"
                  value={formLocation}
                  onChange={(e) => setFormLocation(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Responsibilities / Achievements (One per line)
                </label>
                <textarea
                  rows={4}
                  placeholder="Architected high-throughput microservices&#10;Mentored junior software engineers&#10;Reduced latency by 35%"
                  value={formResponsibilities}
                  onChange={(e) => setFormResponsibilities(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono text-[11px]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold disabled:opacity-50 shadow-xs"
                >
                  {isSaving ? 'Saving...' : editingExp ? 'Update Record' : 'Save Experience'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
