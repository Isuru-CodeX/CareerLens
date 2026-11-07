import React, { useState, useEffect } from 'react';
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
  RefreshCw
} from 'lucide-react';
import { api } from '../../services/api';
import { LearningPlanData, LearningTaskData, LearningQuizQuestion, LearningQuizResult } from '../../types';

interface AdaptiveLearningStudioProps {
  initialRole?: string;
}

export const AdaptiveLearningStudio: React.FC<AdaptiveLearningStudioProps> = ({ initialRole }) => {
  const [loading, setLoading] = useState(true);
  const [planData, setPlanData] = useState<LearningPlanData | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Generate Plan state
  const [targetRole, setTargetRole] = useState(initialRole || 'Full Stack Engineer');
  const [weeklyHours, setWeeklyHours] = useState(6);
  const [preferredDays, setPreferredDays] = useState<string[]>(['Monday', 'Wednesday', 'Saturday']);
  const [generating, setGenerating] = useState(false);

  // Quiz Modal State
  const [activeQuizTask, setActiveQuizTask] = useState<LearningTaskData | null>(null);
  const [quizQuestions, setQuizQuestions] = useState<LearningQuizQuestion[]>([]);
  const [quizAnswers, setQuizAnswers] = useState<Record<string, number>>({});
  const [quizLoading, setQuizLoading] = useState(false);
  const [quizSubmitting, setQuizSubmitting] = useState(false);
  const [quizResult, setQuizResult] = useState<LearningQuizResult | null>(null);

  useEffect(() => {
    let active = true;
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

    return () => { active = false; };
  }, []);

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
        weekly_hours: weeklyHours,
        preferred_days: preferredDays
      });
      setPlanData(data);
    } catch (err: any) {
      setError(err?.message || 'Failed to generate tailored learning plan.');
    } finally {
      setGenerating(false);
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

  const toggleDay = (day: string) => {
    if (preferredDays.includes(day)) {
      if (preferredDays.length > 1) {
        setPreferredDays(preferredDays.filter((d) => d !== day));
      }
    } else {
      setPreferredDays([...preferredDays, day]);
    }
  };

  const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  return (
    <div className="space-y-6 text-slate-900 dark:text-white">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-3xl bg-gradient-to-r from-blue-900/20 via-indigo-900/20 to-purple-900/20 border border-blue-200/50 dark:border-blue-900/40">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-blue-600 text-white shadow-md">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold">Adaptive Skill-Gap Learning Plan</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Personalized learning milestones derived from your verified skill gaps against real industry roles.
            </p>
          </div>
        </div>

        {planData?.has_plan && (
          <button
            type="button"
            onClick={handleGeneratePlan}
            disabled={generating}
            className="px-4 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-xs hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${generating ? 'animate-spin' : ''}`} />
            <span>Regenerate Plan</span>
          </button>
        )}
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 text-xs text-red-700 dark:text-red-300 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Plan Progress & Schedule Bar */}
      {planData?.has_plan && planData.plan && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500">Target Career Goal</span>
              <span className="font-bold text-blue-600 dark:text-blue-400">{planData.plan.target_role}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500">Plan Completion</span>
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
              <span>Available Study Cadence</span>
            </div>
            <p className="text-base font-bold text-slate-900 dark:text-white">
              {planData.plan.weekly_hours} Hours / Week
            </p>
            <p className="text-[11px] text-slate-400">
              Estimated effort calibrated to your target transition timeframe.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1.5">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
              <Calendar className="w-4 h-4 text-purple-500" />
              <span>Preferred Learning Days</span>
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
            <h3 className="text-base font-bold">Configure Your Learning Roadmap</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Specify your target role and study capacity to synthesize a structured, milestone-driven curriculum.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Target Role</label>
              <input
                type="text"
                value={targetRole}
                onChange={(e) => setTargetRole(e.target.value)}
                placeholder="e.g. Cloud Solutions Architect, Full Stack Engineer"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Weekly Study Commitment (Hours)</label>
              <input
                type="number"
                min={1}
                max={40}
                value={weeklyHours}
                onChange={(e) => setWeeklyHours(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Preferred Study Days</label>
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
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
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
            className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            {generating ? (
              <>
                <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                <span>Synthesizing Curriculum...</span>
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

      {/* Task List */}
      {planData?.has_plan && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Curriculum Milestones ({planData.tasks.length})
            </h3>
            <span className="text-[11px] text-slate-500">
              Passing a verification quiz elevates the skill to &quot;Demonstrated&quot;
            </span>
          </div>

          <div className="grid grid-cols-1 gap-3.5">
            {planData.tasks.map((task, idx) => {
              const isAssessed = task.status === 'assessed';
              const isCompleted = task.status === 'completed';
              const isInProgress = task.status === 'in_progress';

              return (
                <div
                  key={task.id}
                  className={`p-4 sm:p-5 rounded-3xl border transition-all space-y-3 ${
                    isAssessed
                      ? 'bg-emerald-50/30 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800/80'
                      : isCompleted
                      ? 'bg-blue-50/30 dark:bg-blue-950/20 border-blue-300 dark:border-blue-800/80'
                      : isInProgress
                      ? 'bg-white dark:bg-slate-900 border-indigo-400 dark:border-indigo-600 shadow-sm'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs flex items-center justify-center shrink-0">
                        {idx + 1}
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                          <span>{task.title}</span>
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                            {task.skill_name}
                          </span>
                        </h4>
                        <p className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                          <span>Est. {task.estimated_effort_hours} Hours</span>
                          {task.prerequisites.length > 0 && (
                            <span>&bull; Prereqs: {task.prerequisites.join(', ')}</span>
                          )}
                        </p>
                      </div>
                    </div>

                    {/* Status & Action Buttons */}
                    <div className="flex items-center gap-2 shrink-0">
                      {isAssessed ? (
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-200 font-bold text-xs border border-emerald-300 dark:border-emerald-800">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Assessed ({task.assessment_score}%)</span>
                        </span>
                      ) : (
                        <>
                          <select
                            value={task.status}
                            onChange={(e) => handleStatusChange(task.id, e.target.value as any)}
                            className="text-xs px-2.5 py-1 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-medium cursor-pointer"
                          >
                            <option value="planned">Planned</option>
                            <option value="in_progress">In Progress</option>
                            <option value="completed">Completed Study</option>
                          </select>

                          {task.has_quiz && (
                            <button
                              type="button"
                              onClick={() => handleOpenQuiz(task)}
                              className="px-3 py-1 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs transition-colors flex items-center gap-1 cursor-pointer"
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
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed pl-8">
                    {task.learning_objective}
                  </p>

                  {/* Mini-Project & Resources */}
                  <div className="pl-8 pt-1 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs border-t border-slate-100 dark:border-slate-800/80">
                    {task.mini_project && (
                      <div className="text-[11px] text-slate-500">
                        <span className="font-semibold text-slate-700 dark:text-slate-300">Mini-Project:</span> {task.mini_project}
                      </div>
                    )}
                    {task.resources.length > 0 && (
                      <div className="flex items-center gap-2 shrink-0">
                        {task.resources.map((res, rIdx) => (
                          <a
                            key={rIdx}
                            href={res.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
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

      {/* Quiz Modal */}
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
                    <h3 className="font-bold text-sm sm:text-base">Skill Assessment: {activeQuizTask.skill_name}</h3>
                    <p className="text-[11px] text-slate-500">Score &ge; 66% to verify this competency as &quot;Demonstrated&quot;.</p>
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
                    className={`p-4 rounded-2xl border space-y-2 text-xs ${
                      quizResult.passed
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
                        : 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200'
                    }`}
                  >
                    <div className="flex items-center gap-2 font-bold">
                      {quizResult.passed ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertCircle className="w-4 h-4 text-amber-600" />}
                      <span>{quizResult.message}</span>
                    </div>
                    <p className="text-[11px]">
                      Score: {quizResult.score_percent}% ({quizResult.correct_answers}/{quizResult.total_questions} correct).
                    </p>
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
                  className="px-4 py-2 rounded-xl text-xs font-semibold border border-slate-300 dark:border-slate-700"
                >
                  Close
                </button>
                {!quizResult && (
                  <button
                    type="button"
                    onClick={handleSubmitQuiz}
                    disabled={quizSubmitting || Object.keys(quizAnswers).length < quizQuestions.length}
                    className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold text-xs shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    {quizSubmitting ? 'Evaluating...' : 'Submit Answers'}
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
