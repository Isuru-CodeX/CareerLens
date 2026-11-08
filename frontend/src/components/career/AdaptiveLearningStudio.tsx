import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BookOpen,
  CheckCircle2,
  Clock,
  Sparkles,
  ExternalLink,
  Award,
  Calendar,
  AlertCircle,
  X,
  RefreshCw,
  TrendingUp,
  Search,
  Filter,
  Code,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  Zap,
  Info,
  Lightbulb,
  GraduationCap,
  Layers,
  ArrowRight
} from 'lucide-react';
import { api } from '../../services/api';
import {
  LearningPlanData,
  LearningTaskData,
  LearningQuizQuestion,
  LearningQuizResult,
  CareerRoleOption,
  LearningStudyGuide
} from '../../types';

interface AdaptiveLearningStudioProps {
  initialRole?: string;
}

const INDUSTRIES = [
  { id: 'all', name: 'All Industries' },
  { id: 'tech', name: 'Technology & Software' },
  { id: 'data', name: 'Data Science & AI' },
  { id: 'product', name: 'Product & Design' },
  { id: 'finance', name: 'Finance & Banking' },
  { id: 'healthcare', name: 'Healthcare & Life Sciences' },
  { id: 'marketing', name: 'Marketing & Growth' },
  { id: 'operations', name: 'Operations & Management' },
  { id: 'engineering', name: 'Engineering & Hardware' },
  { id: 'legal', name: 'Legal & Compliance' }
];

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export const AdaptiveLearningStudio: React.FC<AdaptiveLearningStudioProps> = ({ initialRole }) => {
  const [loading, setLoading] = useState(true);
  const [planData, setPlanData] = useState<LearningPlanData | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Available Roles & Industry Filter
  const [availableRoles, setAvailableRoles] = useState<CareerRoleOption[]>([]);
  const [selectedIndustry, setSelectedIndustry] = useState<string>('all');
  const [roleSearchQuery, setRoleSearchQuery] = useState<string>('');
  const [showRoleSelectorModal, setShowRoleSelectorModal] = useState<boolean>(false);

  // Plan Generator configuration state
  const [targetRole, setTargetRole] = useState(initialRole || 'Full Stack Engineer');
  const [targetRoleId, setTargetRoleId] = useState<string>('');
  const [weeklyHours, setWeeklyHours] = useState(6);
  const [preferredDays, setPreferredDays] = useState<string[]>(['Monday', 'Wednesday', 'Saturday']);
  const [generating, setGenerating] = useState(false);

  // Study Guide Modal / Drawer State
  const [activeStudyTask, setActiveStudyTask] = useState<LearningTaskData | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);

  // Quiz Modal State
  const [activeQuizTask, setActiveQuizTask] = useState<LearningTaskData | null>(null);
  const [quizQuestions, setQuizQuestions] = useState<LearningQuizQuestion[]>([]);
  const [quizAnswers, setQuizAnswers] = useState<Record<string, number>>({});
  const [quizLoading, setQuizLoading] = useState(false);
  const [quizSubmitting, setQuizSubmitting] = useState(false);
  const [quizResult, setQuizResult] = useState<LearningQuizResult | null>(null);

  // Load Active Plan & Career Roles on Mount
  useEffect(() => {
    let active = true;

    // Fetch active learning plan
    api.getLearningPlan()
      .then((data) => {
        if (!active) return;
        setPlanData(data);
        if (data.plan?.target_role) {
          setTargetRole(data.plan.target_role);
        }
        if (data.plan?.weekly_hours) {
          setWeeklyHours(data.plan.weekly_hours);
        }
        if (data.plan?.preferred_days) {
          setPreferredDays(data.plan.preferred_days);
        }
        setError(null);
      })
      .catch((err: any) => {
        if (!active) return;
        setError(err?.message || 'Failed to load learning plan.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    // Fetch all roles for the selector
    api.getCareerRoles()
      .then((res) => {
        if (!active || !res?.roles) return;
        setAvailableRoles(res.roles);
      })
      .catch((err) => console.error('Failed to load career roles for learning filter:', err));

    return () => { active = false; };
  }, []);

  // Filtered Roles based on Industry & Search
  const filteredRoles = useMemo(() => {
    return availableRoles.filter((r) => {
      const matchesIndustry = selectedIndustry === 'all' || r.industry === selectedIndustry;
      const q = roleSearchQuery.toLowerCase().trim();
      const matchesSearch = !q || r.title.toLowerCase().includes(q) || (r.required_skills && r.required_skills.some(s => s.toLowerCase().includes(q)));
      return matchesIndustry && matchesSearch;
    });
  }, [availableRoles, selectedIndustry, roleSearchQuery]);

  const loadPlan = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getLearningPlan();
      setPlanData(data);
      if (data.plan?.target_role) {
        setTargetRole(data.plan.target_role);
      }
      if (data.plan?.weekly_hours) {
        setWeeklyHours(data.plan.weekly_hours);
      }
      if (data.plan?.preferred_days) {
        setPreferredDays(data.plan.preferred_days);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load learning plan.');
    } finally {
      setLoading(false);
    }
  };

  const handleGeneratePlan = async () => {
    try {
      setGenerating(true);
      setError(null);
      const data = await api.generateLearningPlan({
        target_role: targetRole,
        target_role_id: targetRoleId || undefined,
        weekly_hours: weeklyHours,
        preferred_days: preferredDays,
        industry: selectedIndustry !== 'all' ? selectedIndustry : undefined
      });
      setPlanData(data);
      setShowRoleSelectorModal(false);
    } catch (err: any) {
      setError(err?.message || 'Failed to generate tailored learning plan.');
    } finally {
      setGenerating(false);
    }
  };

  const handleSelectRoleFromList = (role: CareerRoleOption) => {
    setTargetRole(role.title);
    setTargetRoleId(role.id);
    if (role.industry && role.industry !== 'all') {
      setSelectedIndustry(role.industry);
    }
  };

  const handleStatusChange = async (taskId: string, newStatus: 'planned' | 'in_progress' | 'completed') => {
    try {
      await api.updateLearningTaskStatus(taskId, newStatus);
      await loadPlan();
    } catch (err: any) {
      setError(err?.message || 'Failed to update task status.');
    }
  };

  const handleOpenQuiz = async (task: LearningTaskData) => {
    try {
      setActiveQuizTask(task);
      setQuizLoading(true);
      setQuizResult(null);
      setQuizAnswers({});
      const data = await api.getTaskQuiz(task.id);
      setQuizQuestions(data.questions);
    } catch (err: any) {
      setError(err?.message || 'Failed to load quiz.');
      setActiveQuizTask(null);
    } finally {
      setQuizLoading(false);
    }
  };

  const handleSubmitQuiz = async () => {
    if (!activeQuizTask) return;
    try {
      setQuizSubmitting(true);
      const result = await api.submitTaskQuiz(activeQuizTask.id, quizAnswers);
      setQuizResult(result);
      if (result.passed) {
        await loadPlan();
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to submit quiz.');
    } finally {
      setQuizSubmitting(false);
    }
  };

  const handleCopyCode = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const toggleDay = (day: string) => {
    if (preferredDays.includes(day)) {
      if (preferredDays.length > 1) {
        setPreferredDays(preferredDays.filter((d) => d !== day));
      }
    } else {
      setPreferredDays([...preferredDays, day]);
    }
  };

  const learningCurve = planData?.plan?.learning_curve;

  return (
    <div className="space-y-6 text-slate-900 dark:text-white">
      {/* Header Banner */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-5 sm:p-6 rounded-3xl bg-gradient-to-r from-blue-900/20 via-indigo-900/20 to-purple-900/20 border border-blue-200/50 dark:border-blue-900/40">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-blue-600 text-white shadow-md">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 mb-1">
              <Zap className="w-3 h-3 text-blue-500" />
              <span>Adaptive Skill-Gap Engine</span>
            </div>
            <h2 className="text-base sm:text-xl font-bold">Adaptive Skill-Gap Learning Plan</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Personalized learning milestones derived from your verified skill gaps, complete with unique role learning curves and verification quizzes.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-stretch sm:self-auto shrink-0">
          <button
            type="button"
            onClick={() => setShowRoleSelectorModal(true)}
            className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <Filter className="w-3.5 h-3.5" />
            <span>Select Role & Industry</span>
          </button>

          {planData?.has_plan && (
            <button
              type="button"
              onClick={handleGeneratePlan}
              disabled={generating}
              className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 shadow-md shadow-blue-500/20 cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${generating ? 'animate-spin' : ''}`} />
              <span>{generating ? 'Regenerating...' : 'Regenerate Plan'}</span>
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 text-xs text-red-700 dark:text-red-300 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Unique Role Learning Curve Card */}
      {planData?.has_plan && learningCurve && (
        <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 flex items-center gap-1">
                  <TrendingUp className="w-3 h-3 text-indigo-500" />
                  <span>Unique Learning Curve</span>
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                  {learningCurve.difficulty_level}
                </span>
              </div>
              <h3 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <span>{learningCurve.curve_type}</span>
                <span className="text-xs font-medium text-slate-400">({learningCurve.role_title})</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-3xl leading-relaxed">
                {learningCurve.trajectory_description}
              </p>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-center">
                <div className="text-xs text-slate-400">Est. Timeline</div>
                <div className="text-base font-extrabold text-indigo-600 dark:text-indigo-400">
                  {learningCurve.estimated_months} Months
                </div>
                <div className="text-[10px] text-slate-400">@{learningCurve.weekly_hours}h / week</div>
              </div>

              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-center">
                <div className="text-xs text-slate-400">Total Curriculum</div>
                <div className="text-base font-extrabold text-emerald-600 dark:text-emerald-400">
                  {learningCurve.total_curriculum_hours}h
                </div>
                <div className="text-[10px] text-slate-400">{learningCurve.phases.length} Structured Phases</div>
              </div>
            </div>
          </div>

          {/* 4-Phase Pathway Progression */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Role Milestone Pathway Phases
              </span>
              <span className="text-[11px] text-slate-400">
                Calibrated to {learningCurve.role_title} mastery
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {learningCurve.phases.map((phase) => {
                const isDone = phase.status === 'completed';
                const isInProg = phase.status === 'in_progress';

                return (
                  <div
                    key={phase.phase_number}
                    className={`p-3.5 rounded-2xl border transition-all space-y-2 ${
                      isDone
                        ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/60'
                        : isInProg
                        ? 'bg-indigo-50/50 dark:bg-indigo-950/20 border-indigo-300 dark:border-indigo-700 shadow-xs'
                        : 'bg-slate-50/50 dark:bg-slate-800/30 border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                        {isDone ? 'Completed' : isInProg ? 'Active' : 'Upcoming'}
                      </span>
                      <span className="text-[11px] font-semibold text-slate-500">
                        ~{phase.estimated_weeks}w
                      </span>
                    </div>

                    <h4 className="text-xs font-bold text-slate-900 dark:text-white leading-tight">
                      {phase.phase_name}
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                      {phase.focus}
                    </p>

                    <div className="pt-1 flex items-center justify-between text-[10px] font-semibold text-slate-500">
                      <span>Milestones: {phase.completed_count}/{phase.milestone_count}</span>
                      <span>{Math.round((phase.completed_count / Math.max(phase.milestone_count, 1)) * 100)}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Plan Progress & Schedule Overview Bar */}
      {planData?.has_plan && planData.plan && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500">Target Role</span>
              <span className="font-bold text-blue-600 dark:text-blue-400">{planData.plan.target_role}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500">Curriculum Progress</span>
              <span className="font-bold text-emerald-600">{planData.plan.progress_percent}%</span>
            </div>
            <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
              <div
                className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${planData.plan.progress_percent}%` }}
              />
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1.5">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
              <Clock className="w-4 h-4 text-indigo-500" />
              <span>Study Commitment</span>
            </div>
            <p className="text-base font-bold text-slate-900 dark:text-white">
              {planData.plan.weekly_hours} Hours / Week
            </p>
            <p className="text-[11px] text-slate-400">
              Calibrated to complete all milestones within target timeline.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1.5">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
              <Calendar className="w-4 h-4 text-purple-500" />
              <span>Preferred Study Days</span>
            </div>
            <div className="flex flex-wrap gap-1">
              {planData.plan.preferred_days.map((d) => (
                <span
                  key={d}
                  className="px-2 py-0.5 rounded-md bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 text-[10px] font-semibold"
                >
                  {d.slice(0, 3)}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* When No Plan Exists: Generator Setup Card */}
      {!loading && !planData?.has_plan && (
        <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
          <div className="space-y-1">
            <h3 className="text-base font-bold">Configure Your Adaptive Roadmap</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Filter by industry, pick your target role to inspect its unique learning curve, and synthesize a structured curriculum.
            </p>
          </div>

          {/* Industry Filter Pills */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
              Filter by Industry Domain
            </label>
            <div className="flex flex-wrap gap-1.5">
              {INDUSTRIES.map((ind) => (
                <button
                  key={ind.id}
                  type="button"
                  onClick={() => setSelectedIndustry(ind.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    selectedIndustry === ind.id
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {ind.name}
                </button>
              ))}
            </div>
          </div>

          {/* Quick Role Selection Pills for Selected Industry */}
          <div className="space-y-1.5 bg-slate-50 dark:bg-slate-800/40 p-3 rounded-2xl border border-slate-200/80 dark:border-slate-800">
            <div className="flex items-center justify-between text-[11px] text-slate-500">
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                Roles in {INDUSTRIES.find(i => i.id === selectedIndustry)?.name || 'Selected Domain'}:
              </span>
              <button
                type="button"
                onClick={() => setShowRoleSelectorModal(true)}
                className="text-indigo-600 dark:text-indigo-400 font-bold hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>View Full Catalog ({filteredRoles.length})</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {filteredRoles.slice(0, 8).map((r) => {
                const isSelected = targetRole.toLowerCase() === r.title.toLowerCase();
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => handleSelectRoleFromList(r)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-600 text-white font-bold shadow-xs'
                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-indigo-400 dark:hover:border-indigo-500'
                    }`}
                  >
                    <span>{r.title}</span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded font-semibold ${
                      isSelected ? 'bg-indigo-700 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                    }`}>
                      {r.domain}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="font-semibold text-slate-700 dark:text-slate-300">Target Career Role</label>
                <button
                  type="button"
                  onClick={() => setShowRoleSelectorModal(true)}
                  className="text-[11px] text-indigo-600 dark:text-indigo-400 font-bold hover:underline cursor-pointer flex items-center gap-1"
                >
                  <span>Browse Roles</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
              <input
                type="text"
                value={targetRole}
                onChange={(e) => setTargetRole(e.target.value)}
                placeholder="e.g. Cloud Solutions Architect, Full Stack Engineer"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-white font-medium"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Weekly Study Commitment (Hours)
              </label>
              <input
                type="number"
                min={1}
                max={40}
                value={weeklyHours}
                onChange={(e) => setWeeklyHours(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-white font-medium"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Preferred Study Days
            </label>
            <div className="flex flex-wrap gap-2">
              {DAYS.map((day) => {
                const selected = preferredDays.includes(day);
                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => toggleDay(day)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                      selected
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    {day}
                  </button>
                );
              })}
            </div>
          </div>

          <button
            type="button"
            onClick={handleGeneratePlan}
            disabled={generating || !targetRole.trim()}
            className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {generating ? (
              <>
                <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                <span>Synthesizing Adaptive Curriculum...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Generate Adaptive Learning Plan</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* Task List / Curriculum Milestones */}
      {planData?.has_plan && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
              <GraduationCap className="w-4 h-4 text-indigo-500" />
              <span>Curriculum Milestones ({planData.tasks.length})</span>
            </h3>
            <span className="text-[11px] text-slate-500">
              Each milestone includes an interactive Study Guide, Code Pattern &amp; Verification Quiz
            </span>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {planData.tasks.map((task, idx) => {
              const isAssessed = task.status === 'assessed';
              const isCompleted = task.status === 'completed';
              const isInProgress = task.status === 'in_progress';

              return (
                <div
                  key={task.id}
                  className={`p-5 rounded-3xl border transition-all space-y-4 ${
                    isAssessed
                      ? 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800/80 shadow-xs'
                      : isCompleted
                      ? 'bg-blue-50/40 dark:bg-blue-950/20 border-blue-300 dark:border-blue-800/80'
                      : isInProgress
                      ? 'bg-white dark:bg-slate-900 border-indigo-400 dark:border-indigo-600 shadow-sm ring-1 ring-indigo-500/10'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-start sm:items-center gap-3">
                      <div className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-black text-xs flex items-center justify-center shrink-0 mt-0.5 sm:mt-0">
                        #{idx + 1}
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                            {task.title}
                          </h4>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                            {task.skill_name}
                          </span>
                          {task.difficulty_tier && (
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                              {task.difficulty_tier}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 flex items-center gap-2 mt-1">
                          <span>Est. {task.estimated_effort_hours} Hours</span>
                          {task.prerequisites && task.prerequisites.length > 0 && (
                            <span>&bull; Prereqs: {task.prerequisites.join(', ')}</span>
                          )}
                        </p>
                      </div>
                    </div>

                    {/* Status & Action Buttons */}
                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                      {/* Study Guide & Lab Button */}
                      <button
                        type="button"
                        onClick={() => setActiveStudyTask(task)}
                        className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                        title="View interactive concepts, code patterns & study lab"
                      >
                        <BookOpen className="w-3.5 h-3.5 text-blue-500" />
                        <span>Study Guide &amp; Lab</span>
                      </button>

                      {isAssessed ? (
                        <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-200 font-bold text-xs border border-emerald-300 dark:border-emerald-800">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Demonstrated ({task.assessment_score}%)</span>
                        </span>
                      ) : (
                        <>
                          <select
                            value={task.status}
                            onChange={(e) => handleStatusChange(task.id, e.target.value as any)}
                            className="text-xs px-2.5 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-medium cursor-pointer"
                          >
                            <option value="planned">Planned</option>
                            <option value="in_progress">In Progress</option>
                            <option value="completed">Completed Study</option>
                          </select>

                          {(task.has_quiz !== false) && (
                            <button
                              type="button"
                              onClick={() => handleOpenQuiz(task)}
                              className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs transition-colors flex items-center gap-1.5 shadow-sm cursor-pointer"
                            >
                              <Award className="w-3.5 h-3.5" />
                              <span>Take Quiz</span>
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  {/* Objective */}
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed pl-10">
                    {task.learning_objective}
                  </p>

                  {/* Mini-Project & Resources Bar */}
                  <div className="pl-10 pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs border-t border-slate-100 dark:border-slate-800/80">
                    {task.mini_project && (
                      <div className="text-[11px] text-slate-600 dark:text-slate-400">
                        <span className="font-bold text-slate-800 dark:text-slate-200">Mini-Project:</span> {task.mini_project}
                      </div>
                    )}
                    {task.resources && task.resources.length > 0 && (
                      <div className="flex flex-wrap items-center gap-2 shrink-0">
                        {task.resources.map((res, rIdx) => (
                          <a
                            key={rIdx}
                            href={res.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
                          >
                            <span>{res.title}</span>
                            <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Role Selection & Industry Filter Modal */}
      <AnimatePresence>
        {showRoleSelectorModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-3xl max-w-2xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col max-h-[85vh] overflow-hidden"
            >
              <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-base flex items-center gap-2">
                    <Filter className="w-4 h-4 text-indigo-500" />
                    <span>Select Target Role with Industry Filter</span>
                  </h3>
                  <p className="text-xs text-slate-500">
                    Filter by industry domain to discover specialized career roles and customized learning curves.
                  </p>
                </div>
                <button
                  onClick={() => setShowRoleSelectorModal(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Industry Filter Pills in Modal */}
              <div className="p-4 bg-slate-50/50 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-800 space-y-3">
                <div className="flex flex-wrap gap-1.5">
                  {INDUSTRIES.map((ind) => (
                    <button
                      key={ind.id}
                      type="button"
                      onClick={() => setSelectedIndustry(ind.id)}
                      className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                        selectedIndustry === ind.id
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {ind.name}
                    </button>
                  ))}
                </div>

                {/* Role Search Input */}
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={roleSearchQuery}
                    onChange={(e) => setRoleSearchQuery(e.target.value)}
                    placeholder="Search roles or skills (e.g. Cloud, Architect, React, Python)..."
                    className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Roles List */}
              <div className="p-4 overflow-y-auto space-y-2 flex-1">
                {filteredRoles.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-400">
                    No roles found matching the selected industry and search term.
                  </div>
                ) : (
                  filteredRoles.map((r) => {
                    const isSelected = targetRole.toLowerCase() === r.title.toLowerCase();

                    return (
                      <div
                        key={r.id}
                        onClick={() => handleSelectRoleFromList(r)}
                        className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                          isSelected
                            ? 'bg-indigo-50 dark:bg-indigo-950/50 border-indigo-500 shadow-xs'
                            : 'bg-white dark:bg-slate-800/40 border-slate-200 dark:border-slate-700/80 hover:border-slate-300 dark:hover:border-slate-600'
                        }`}
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-xs text-slate-900 dark:text-white">
                              {r.title}
                            </span>
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                              {r.seniority_tier}
                            </span>
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                              {r.domain}
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-1 text-[10px] text-slate-400">
                            {r.required_skills?.slice(0, 4).map((s, idx) => (
                              <span key={idx} className="bg-slate-50 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                                {s}
                              </span>
                            ))}
                          </div>
                        </div>

                        <div className="shrink-0">
                          {isSelected ? (
                            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-xl bg-indigo-600 text-white text-xs font-bold shadow-xs">
                              <Check className="w-3.5 h-3.5" />
                              <span>Selected</span>
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSelectRoleFromList(r);
                              }}
                              className="px-3 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-indigo-600 hover:text-white text-slate-700 dark:text-slate-300 text-xs font-semibold transition-colors cursor-pointer"
                            >
                              Choose Role
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex items-center justify-between">
                <div className="text-xs">
                  <span className="text-slate-400">Current Target:</span>{' '}
                  <span className="font-bold text-indigo-600 dark:text-indigo-400">{targetRole}</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowRoleSelectorModal(false)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold border border-slate-300 dark:border-slate-700"
                  >
                    Done
                  </button>
                  <button
                    type="button"
                    onClick={handleGeneratePlan}
                    disabled={generating}
                    className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-500/20 disabled:opacity-50 transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Apply &amp; Generate</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Interactive Study Guide & Learning Lab Drawer/Modal */}
      <AnimatePresence>
        {activeStudyTask && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-3xl max-w-2xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col max-h-[88vh] overflow-hidden"
            >
              <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400">
                    <BookOpen className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base">{activeStudyTask.title}</h3>
                    <p className="text-xs text-slate-500">Interactive Study Guide &amp; Technical Reference Lab</p>
                  </div>
                </div>
                <button
                  onClick={() => setActiveStudyTask(null)}
                  className="p-1 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 overflow-y-auto space-y-5 flex-1 text-xs">
                {/* Core Objective */}
                <div className="p-3.5 rounded-2xl bg-blue-50/50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50 space-y-1">
                  <span className="font-bold text-[11px] uppercase tracking-wider text-blue-700 dark:text-blue-300 flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-blue-500" />
                    <span>Learning Objective</span>
                  </span>
                  <p className="text-slate-800 dark:text-slate-200 leading-relaxed font-medium">
                    {activeStudyTask.learning_objective}
                  </p>
                </div>

                {/* Key Architectural Concepts */}
                {activeStudyTask.study_guide?.key_concepts && (
                  <div className="space-y-2.5">
                    <h4 className="font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <Lightbulb className="w-4 h-4 text-amber-500" />
                      <span>Core Architectural Concepts</span>
                    </h4>
                    <div className="space-y-2">
                      {activeStudyTask.study_guide.key_concepts.map((concept, idx) => (
                        <div
                          key={idx}
                          className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 flex items-start gap-2.5"
                        >
                          <span className="w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                            {idx + 1}
                          </span>
                          <span className="leading-relaxed text-slate-800 dark:text-slate-200 font-medium">
                            {concept}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Practical Code Example / Pattern */}
                {activeStudyTask.study_guide?.code_example && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                        <Code className="w-4 h-4 text-emerald-500" />
                        <span>Production Pattern / Code Snippet</span>
                      </h4>
                      <button
                        type="button"
                        onClick={() => handleCopyCode(activeStudyTask.study_guide!.code_example!)}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-600 dark:text-slate-300 hover:text-indigo-600 cursor-pointer"
                      >
                        {copiedCode ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedCode ? 'Copied!' : 'Copy Code'}</span>
                      </button>
                    </div>
                    <pre className="p-4 rounded-2xl bg-slate-900 text-slate-100 font-mono text-[11px] leading-relaxed overflow-x-auto border border-slate-800">
                      <code>{activeStudyTask.study_guide.code_example}</code>
                    </pre>
                  </div>
                )}

                {/* Common Pitfalls & Interview Traps */}
                {activeStudyTask.study_guide?.common_pitfalls && (
                  <div className="space-y-2">
                    <h4 className="font-bold uppercase tracking-wider text-red-600 dark:text-red-400 flex items-center gap-1.5">
                      <AlertCircle className="w-4 h-4" />
                      <span>Common Pitfalls &amp; Interview Traps</span>
                    </h4>
                    <div className="space-y-1.5">
                      {activeStudyTask.study_guide.common_pitfalls.map((pitfall, pIdx) => (
                        <div
                          key={pIdx}
                          className="p-3 rounded-xl bg-red-50/50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 text-red-900 dark:text-red-200 font-medium leading-relaxed"
                        >
                          &bull; {pitfall}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Practical Mini-Project */}
                {activeStudyTask.mini_project && (
                  <div className="p-3.5 rounded-2xl bg-purple-50/50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-900/50 space-y-1">
                    <span className="font-bold text-[11px] uppercase tracking-wider text-purple-700 dark:text-purple-300 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-purple-500" />
                      <span>Hands-on Mini Project</span>
                    </span>
                    <p className="text-slate-800 dark:text-slate-200 leading-relaxed font-medium">
                      {activeStudyTask.mini_project}
                    </p>
                  </div>
                )}
              </div>

              <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setActiveStudyTask(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold border border-slate-300 dark:border-slate-700 cursor-pointer"
                >
                  Close
                </button>
                {(activeStudyTask.has_quiz !== false) && (
                  <button
                    type="button"
                    onClick={() => {
                      const task = activeStudyTask;
                      setActiveStudyTask(null);
                      handleOpenQuiz(task);
                    }}
                    className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-500/20 transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <Award className="w-3.5 h-3.5" />
                    <span>Proceed to Verification Quiz</span>
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Enhanced Quiz Assessment Modal */}
      <AnimatePresence>
        {activeQuizTask && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm"
            role="dialog"
            aria-modal="true"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-3xl max-w-xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
                <div className="flex items-center gap-2.5">
                  <Award className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  <div>
                    <h3 className="font-bold text-sm sm:text-base">Technical Assessment: {activeQuizTask.skill_name}</h3>
                    <p className="text-[11px] text-slate-500">
                      Score &ge; 66% to elevate this competency to &quot;Demonstrated&quot; in your profile.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setActiveQuizTask(null)}
                  className="p-1 rounded-xl text-slate-400 hover:text-slate-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1">
                {quizLoading && (
                  <div className="py-12 text-center text-xs text-slate-400">Loading quiz questions...</div>
                )}

                {quizResult && (
                  <div
                    className={`p-4 rounded-2xl border space-y-3 text-xs ${
                      quizResult.passed
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
                        : 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200'
                    }`}
                  >
                    <div className="flex items-center gap-2 font-bold text-sm">
                      {quizResult.passed ? <CheckCircle2 className="w-5 h-5 text-emerald-600" /> : <AlertCircle className="w-5 h-5 text-amber-600" />}
                      <span>{quizResult.message}</span>
                    </div>
                    <p className="text-xs font-semibold">
                      Final Score: {quizResult.score_percent}% ({quizResult.correct_answers} of {quizResult.total_questions} correct).
                    </p>

                    {/* Explanations Breakdown */}
                    <div className="pt-2 space-y-2 border-t border-emerald-200 dark:border-emerald-800/60">
                      <span className="font-bold text-[11px] uppercase tracking-wider block">Question Explanations:</span>
                      {quizResult.feedback?.map((item, idx) => (
                        <div key={idx} className="p-2.5 rounded-xl bg-white/70 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 space-y-1">
                          <div className="flex items-center justify-between font-bold">
                            <span>Q{idx + 1}: {item.is_correct ? 'Correct' : 'Needs Review'}</span>
                            <span className={item.is_correct ? 'text-emerald-600' : 'text-amber-600'}>
                              {item.is_correct ? 'Pass' : 'Review'}
                            </span>
                          </div>
                          {item.explanation && (
                            <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                              {item.explanation}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {!quizLoading && !quizResult && quizQuestions.map((q, qIdx) => (
                  <div key={q.id} className="space-y-2.5 text-xs">
                    <p className="font-bold text-slate-800 dark:text-slate-200">
                      {qIdx + 1}. {q.question}
                    </p>
                    <div className="space-y-1.5 pl-2">
                      {q.options.map((opt, optIdx) => (
                        <label
                          key={optIdx}
                          className={`flex items-start gap-2.5 p-2.5 rounded-xl border transition-all cursor-pointer ${
                            quizAnswers[q.id] === optIdx
                              ? 'bg-indigo-50/70 dark:bg-indigo-950/50 border-indigo-400 text-indigo-900 dark:text-indigo-200 font-semibold'
                              : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 hover:bg-slate-100'
                          }`}
                        >
                          <input
                            type="radio"
                            name={`quiz_${q.id}`}
                            checked={quizAnswers[q.id] === optIdx}
                            onChange={() => setQuizAnswers({ ...quizAnswers, [q.id]: optIdx })}
                            className="mt-0.5 text-indigo-600"
                          />
                          <span className="leading-relaxed">{opt}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setActiveQuizTask(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold border border-slate-300 dark:border-slate-700 cursor-pointer"
                >
                  Close
                </button>
                {!quizResult ? (
                  <button
                    type="button"
                    onClick={handleSubmitQuiz}
                    disabled={quizSubmitting || Object.keys(quizAnswers).length < quizQuestions.length}
                    className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold text-xs shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    {quizSubmitting ? 'Evaluating...' : 'Submit Answers'}
                  </button>
                ) : (
                  !quizResult.passed && (
                    <button
                      type="button"
                      onClick={() => handleOpenQuiz(activeQuizTask)}
                      className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Retake Quiz</span>
                    </button>
                  )
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
