import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Compass,
  CheckCircle2,
  AlertCircle,
  Clock,
  DollarSign,
  Layers,
  Sparkles,
  BookOpen,
  Plus,
  X
} from 'lucide-react';
import { api } from '../../services/api';
import { CareerComparisonItem } from '../../types';

interface CareerPathComparatorProps {
  initialRoles?: string[];
  onSelectRoleForLearning?: (roleTitle: string) => void;
  onSetRoleAsGoal?: (roleTitle: string) => void;
}

const POPULAR_ROLES = [
  'Senior Full Stack Engineer',
  'Cloud Solutions Architect',
  'DevOps & Platform Engineer',
  'Machine Learning Engineer',
  'Frontend Specialist',
  'Backend Distributed Systems Engineer',
  'Data Engineer',
  'Cybersecurity Analyst',
  'Product Manager (Technical)'
];

export const CareerPathComparator: React.FC<CareerPathComparatorProps> = ({
  initialRoles = ['Senior Full Stack Engineer', 'Cloud Solutions Architect'],
  onSelectRoleForLearning,
  onSetRoleAsGoal
}) => {
  const [selectedRoles, setSelectedRoles] = useState<string[]>(initialRoles);
  const [customInput, setCustomInput] = useState('');
  const [comparisons, setComparisons] = useState<CareerComparisonItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasCompared, setHasCompared] = useState(false);

  const handleAddRole = (role: string) => {
    const trimmed = role.trim();
    if (!trimmed || selectedRoles.includes(trimmed)) return;
    if (selectedRoles.length >= 3) {
      alert('You can compare up to 3 career paths simultaneously.');
      return;
    }
    setSelectedRoles([...selectedRoles, trimmed]);
    setCustomInput('');
  };

  const handleRemoveRole = (role: string) => {
    setSelectedRoles(selectedRoles.filter((r) => r !== role));
  };

  const handleRunComparison = async () => {
    if (selectedRoles.length === 0) return;
    try {
      setLoading(true);
      setError(null);
      const res = await api.compareCareerPaths(selectedRoles);
      setComparisons(res.comparisons || []);
      setHasCompared(true);
    } catch (err: any) {
      setError(err?.message || 'Failed to compare career paths.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Comparator Header / Role Picker */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-bold text-xs uppercase tracking-wider">
              <Layers className="w-3.5 h-3.5" />
              <span>Multi-Role Career Path Matrix</span>
            </div>
            <h2 className="text-xl font-extrabold text-slate-900 dark:text-white mt-1">
              Compare Career Trajectories Side-by-Side
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Evaluate verified skill alignment, missing competency gaps, transition effort, and compensation percentiles.
            </p>
          </div>

          <button
            onClick={handleRunComparison}
            disabled={loading || selectedRoles.length === 0}
            className="px-5 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-500/20 disabled:opacity-50 transition-all flex items-center justify-center gap-2 cursor-pointer shrink-0"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Comparing Trajectories...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Evaluate & Compare Paths</span>
              </>
            )}
          </button>
        </div>

        {/* Selected Roles Badges */}
        <div className="flex flex-wrap items-center gap-2 pt-2">
          <span className="text-xs font-semibold text-slate-400">Selected Roles (up to 3):</span>
          {selectedRoles.map((role) => (
            <span
              key={role}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 text-xs font-bold"
            >
              <span>{role}</span>
              <button
                onClick={() => handleRemoveRole(role)}
                className="hover:text-rose-500 transition-colors cursor-pointer"
                title="Remove role"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </span>
          ))}

          {selectedRoles.length < 3 && (
            <div className="flex items-center gap-1.5">
              <input
                type="text"
                value={customInput}
                onChange={(e) => setCustomInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddRole(customInput);
                  }
                }}
                placeholder="Type another role..."
                className="px-3 py-1 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
              <button
                onClick={() => handleAddRole(customInput)}
                className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
                title="Add role"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Suggested Quick Add Chips */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] text-slate-400 font-medium">Suggestions:</span>
            {POPULAR_ROLES.filter((r) => !selectedRoles.includes(r)).slice(0, 5).map((role) => (
              <button
                key={role}
                onClick={() => handleAddRole(role)}
                className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800/60 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 hover:text-indigo-600 dark:hover:text-indigo-400 text-slate-600 dark:text-slate-300 text-[11px] font-medium transition-colors cursor-pointer"
              >
                + {role}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Side-by-Side Comparison Grid */}
      {hasCompared && comparisons.length > 0 && (
        <div className={`grid grid-cols-1 md:grid-cols-${Math.min(comparisons.length, 3)} gap-6`}>
          {comparisons.map((item, index) => {
            const matchScore = item.match_percent;
            const scoreColor =
              matchScore >= 70
                ? 'emerald'
                : matchScore >= 45
                ? 'indigo'
                : 'amber';

            return (
              <motion.div
                key={item.role_id || index}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
                className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between space-y-6"
              >
                <div className="space-y-4">
                  {/* Card Title & Match Pill */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                        Candidate Trajectory
                      </span>
                      <h3 className="text-lg font-extrabold text-slate-900 dark:text-white leading-snug">
                        {item.title}
                      </h3>
                    </div>
                    <div
                      className={`px-3 py-1.5 rounded-full text-xs font-black shrink-0 ${
                        scoreColor === 'emerald'
                          ? 'bg-emerald-50 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                          : scoreColor === 'indigo'
                          ? 'bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800'
                          : 'bg-amber-50 dark:bg-amber-950/70 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                      }`}
                    >
                      {item.match_percent}% Alignment
                    </div>
                  </div>

                  {/* Transition Effort & Salary Band Highlight */}
                  <div className="grid grid-cols-2 gap-2 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                    <div className="space-y-0.5">
                      <span className="text-[10px] text-slate-400 font-medium flex items-center gap-1">
                        <Clock className="w-3 h-3 text-indigo-500" />
                        <span>Est. Transition</span>
                      </span>
                      <span className="text-sm font-bold text-slate-800 dark:text-slate-100">
                        {item.estimated_transition_months} Months
                      </span>
                    </div>

                    <div className="space-y-0.5">
                      <span className="text-[10px] text-slate-400 font-medium flex items-center gap-1">
                        <DollarSign className="w-3 h-3 text-emerald-500" />
                        <span>Median Salary</span>
                      </span>
                      <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                        ${(item.salary_bands?.p50 || item.salary_bands?.median || 120000).toLocaleString()}/yr
                      </span>
                    </div>
                  </div>

                  {/* Verified Skills */}
                  <div className="space-y-1.5">
                    <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Verified Skills ({item.verified_skills.length})</span>
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {item.verified_skills.length > 0 ? (
                        item.verified_skills.map((skill) => (
                          <span
                            key={skill}
                            className="px-2.5 py-0.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800 text-[11px] font-semibold"
                          >
                            {skill}
                          </span>
                        ))
                      ) : (
                        <span className="text-[11px] text-slate-400 italic">No verified skills matching this role</span>
                      )}
                    </div>
                  </div>

                  {/* Missing Skills Gap */}
                  <div className="space-y-1.5">
                    <span className="text-xs font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" />
                      <span>Missing Skill Gaps ({item.missing_skills.length})</span>
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {item.missing_skills.length > 0 ? (
                        item.missing_skills.map((skill) => (
                          <span
                            key={skill}
                            className="px-2.5 py-0.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200/80 dark:border-rose-800 text-[11px] font-semibold"
                          >
                            {skill}
                          </span>
                        ))
                      ) : (
                        <span className="text-[11px] text-emerald-600 font-medium">All prerequisite skills verified!</span>
                      )}
                    </div>
                  </div>

                  {/* Salary Percentile Progression */}
                  {item.salary_bands && (
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1">
                      <span className="text-[11px] font-bold text-slate-400">Market Percentiles:</span>
                      <div className="grid grid-cols-3 gap-1 text-center text-[10px]">
                        <div className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800">
                          <span className="text-slate-400 block">25th</span>
                          <span className="font-bold text-slate-700 dark:text-slate-300">
                            ${(item.salary_bands.p25 || 0).toLocaleString()}
                          </span>
                        </div>
                        <div className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/50">
                          <span className="text-indigo-400 block">Median</span>
                          <span className="font-bold text-indigo-700 dark:text-indigo-300">
                            ${(item.salary_bands.p50 || item.salary_bands.median || 0).toLocaleString()}
                          </span>
                        </div>
                        <div className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/50">
                          <span className="text-emerald-400 block">75th</span>
                          <span className="font-bold text-emerald-700 dark:text-emerald-300">
                            ${(item.salary_bands.p75 || 0).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Card Action Buttons */}
                <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2">
                  {onSelectRoleForLearning && (
                    <button
                      onClick={() => onSelectRoleForLearning(item.title)}
                      className="w-full py-2 px-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 font-bold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <BookOpen className="w-3.5 h-3.5" />
                      <span>Generate Adaptive Learning Plan</span>
                    </button>
                  )}

                  {onSetRoleAsGoal && (
                    <button
                      onClick={() => onSetRoleAsGoal(item.title)}
                      className="w-full py-2 px-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Compass className="w-3.5 h-3.5" />
                      <span>Set as Active Career Goal</span>
                    </button>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Initial Callout if not compared yet */}
      {!hasCompared && !loading && (
        <div className="p-10 text-center rounded-3xl bg-slate-50 dark:bg-slate-800/40 border border-dashed border-slate-200 dark:border-slate-700 space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto">
            <Layers className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
            Select 2 or 3 Roles to Begin Multi-Path Analysis
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            Click "Evaluate & Compare Paths" above to analyze transferrable skills, required time-to-learn, and calibrated salary expectations for each trajectory.
          </p>
        </div>
      )}
    </div>
  );
};
