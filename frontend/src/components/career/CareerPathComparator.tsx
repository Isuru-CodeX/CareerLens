import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
  X,
  ChevronDown,
  Search,
  UserCheck,
  TrendingUp,
  ShieldCheck,
  Check
} from 'lucide-react';
import { api } from '../../services/api';
import { CareerComparisonItem, CareerRoleOption } from '../../types';

interface CareerPathComparatorProps {
  initialRoles?: string[];
  onSelectRoleForLearning?: (roleTitle: string) => void;
  onSetRoleAsGoal?: (roleTitle: string) => void;
}

export const CareerPathComparator: React.FC<CareerPathComparatorProps> = ({
  initialRoles = ['MY_PROFILE', 'Cloud Solutions Architect', 'Lead Full Stack Architect / Staff Engineer'],
  onSelectRoleForLearning,
  onSetRoleAsGoal
}) => {
  const [availableRoles, setAvailableRoles] = useState<CareerRoleOption[]>([]);
  const [selectedRoles, setSelectedRoles] = useState<string[]>(initialRoles);
  const [includeMyProfile, setIncludeMyProfile] = useState<boolean>(true);
  const [comparisons, setComparisons] = useState<CareerComparisonItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasCompared, setHasCompared] = useState(false);

  // Dropdown & Search state
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDomainFilter, setSelectedDomainFilter] = useState<string>('all');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch all 54 specialized roles
  useEffect(() => {
    let isMounted = true;
    api.getCareerRoles()
      .then((res) => {
        if (!isMounted) return;
        setAvailableRoles(res.roles || []);
      })
      .catch((err) => {
        console.error('Failed to fetch career roles:', err);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  // Distinct domains for filtering
  const domains = useMemo(() => {
    const list = Array.from(new Set(availableRoles.map((r) => r.domain).filter(Boolean)));
    return ['all', ...list];
  }, [availableRoles]);

  // Filtered roles based on query & domain
  const filteredRoles = useMemo(() => {
    return availableRoles.filter((r) => {
      const matchesDomain = selectedDomainFilter === 'all' || r.domain === selectedDomainFilter;
      const matchesSearch =
        r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.domain.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.required_skills.some((s) => s.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesDomain && matchesSearch;
    });
  }, [availableRoles, searchQuery, selectedDomainFilter]);

  const handleToggleProfileBaseline = () => {
    if (includeMyProfile) {
      setIncludeMyProfile(false);
      setSelectedRoles(selectedRoles.filter((r) => r !== 'MY_PROFILE'));
    } else {
      if (selectedRoles.length >= 3 && !selectedRoles.includes('MY_PROFILE')) {
        // remove last one to make room
        setSelectedRoles(['MY_PROFILE', ...selectedRoles.slice(0, 2)]);
      } else {
        setSelectedRoles(['MY_PROFILE', ...selectedRoles]);
      }
      setIncludeMyProfile(true);
    }
  };

  const handleAddRole = (roleTitle: string) => {
    if (!roleTitle || selectedRoles.includes(roleTitle)) return;
    if (selectedRoles.length >= 3) {
      alert('You can compare up to 3 career paths simultaneously.');
      return;
    }
    setSelectedRoles([...selectedRoles, roleTitle]);
    setIsDropdownOpen(false);
    setSearchQuery('');
  };

  const handleRemoveRole = (roleTitle: string) => {
    if (roleTitle === 'MY_PROFILE') {
      setIncludeMyProfile(false);
    }
    setSelectedRoles(selectedRoles.filter((r) => r !== roleTitle));
  };

  const handleRunComparison = useCallback(async () => {
    if (selectedRoles.length === 0) return;
    try {
      setLoading(true);
      setError(null);
      const res = await api.compareCareerPaths(selectedRoles, 'us', includeMyProfile || selectedRoles.includes('MY_PROFILE'));
      setComparisons(res.comparisons || []);
      setHasCompared(true);
    } catch (err: any) {
      setError(err?.message || 'Failed to compare career paths.');
    } finally {
      setLoading(false);
    }
  }, [selectedRoles, includeMyProfile]);

  // Run initial comparison on mount if roles are present
  const initialCompareRef = useRef(false);
  useEffect(() => {
    if (!initialCompareRef.current && selectedRoles.length > 0) {
      initialCompareRef.current = true;
      handleRunComparison();
    }
  }, [handleRunComparison, selectedRoles.length]);

  return (
    <div className="space-y-6">
      {/* Comparator Header / Role Picker */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-bold text-xs uppercase tracking-wider">
              <Layers className="w-3.5 h-3.5" />
              <span>Multi-Role Career Path Matrix (54 Specialized Trajectories)</span>
            </div>
            <h2 className="text-xl font-extrabold text-slate-900 dark:text-white mt-1">
              Compare Career Trajectories Side-by-Side
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Select roles from the entire platform knowledge graph or compare directly against your active profile baseline.
            </p>
          </div>

          <button
            onClick={handleRunComparison}
            disabled={loading || selectedRoles.length === 0}
            className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold text-xs shadow-md shadow-indigo-500/20 disabled:opacity-50 transition-all flex items-center justify-center gap-2 cursor-pointer shrink-0"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Evaluating Alignment...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-amber-300" />
                <span>Evaluate &amp; Compare Paths</span>
              </>
            )}
          </button>
        </div>

        {/* Action Controls & Active Badges */}
        <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Toggle: Compare Against My Profile */}
            <button
              type="button"
              onClick={handleToggleProfileBaseline}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border cursor-pointer ${
                includeMyProfile || selectedRoles.includes('MY_PROFILE')
                  ? 'bg-purple-50 dark:bg-purple-950/70 border-purple-300 dark:border-purple-700 text-purple-700 dark:text-purple-300 shadow-xs'
                  : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <UserCheck className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
              <span>{includeMyProfile || selectedRoles.includes('MY_PROFILE') ? 'Profile Baseline: ACTIVE' : '+ Include My Current Profile'}</span>
            </button>

            {/* Selected Trajectories Badges */}
            {selectedRoles.map((role) => (
              <span
                key={role}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold ${
                  role === 'MY_PROFILE'
                    ? 'bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-950/70 dark:to-indigo-950/70 text-purple-800 dark:text-purple-200 border-purple-300 dark:border-purple-700'
                    : 'bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800'
                }`}
              >
                <span>{role === 'MY_PROFILE' ? '👤 My Current Profile' : role}</span>
                <button
                  onClick={() => handleRemoveRole(role)}
                  className="hover:text-rose-500 transition-colors cursor-pointer ml-1"
                  title="Remove trajectory"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </span>
            ))}

            {/* Comprehensive Searchable Dropdown Trigger (54 Roles) */}
            {selectedRoles.length < 3 && (
              <div className="relative" ref={dropdownRef}>
                <button
                  type="button"
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="px-3.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-xs font-bold flex items-center gap-2 cursor-pointer transition-colors"
                >
                  <Plus className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Add Role from Dropdown ({availableRoles.length || 54})</span>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                </button>

                {/* Dropdown Menu */}
                <AnimatePresence>
                  {isDropdownOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 8 }}
                      className="absolute left-0 mt-2 w-80 sm:w-96 max-h-[380px] rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl z-50 overflow-hidden flex flex-col"
                    >
                      {/* Search & Domain Filter Header */}
                      <div className="p-3 border-b border-slate-100 dark:border-slate-800 space-y-2 bg-slate-50 dark:bg-slate-800/50">
                        <div className="relative">
                          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                          <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search by role or skill (e.g. Architect, ML, React)..."
                            className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                            autoFocus
                          />
                        </div>

                        {/* Domain Filter Pills */}
                        <div className="flex items-center gap-1 overflow-x-auto pb-1 text-[10px]">
                          {domains.map((dom) => (
                            <button
                              key={dom}
                              type="button"
                              onClick={() => setSelectedDomainFilter(dom)}
                              className={`px-2 py-0.5 rounded-lg font-bold capitalize whitespace-nowrap cursor-pointer transition-colors ${
                                selectedDomainFilter === dom
                                  ? 'bg-indigo-600 text-white'
                                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900'
                              }`}
                            >
                              {dom}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Roles List */}
                      <div className="overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60 flex-1">
                        {filteredRoles.length === 0 ? (
                          <div className="p-4 text-center text-xs text-slate-400">
                            No roles matching "{searchQuery}"
                          </div>
                        ) : (
                          filteredRoles.map((r) => {
                            const isSelected = selectedRoles.includes(r.title);
                            return (
                              <button
                                key={r.id}
                                type="button"
                                disabled={isSelected}
                                onClick={() => handleAddRole(r.title)}
                                className="w-full text-left p-3 hover:bg-indigo-50/70 dark:hover:bg-indigo-950/40 transition-colors flex items-center justify-between cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                              >
                                <div className="space-y-0.5 pr-2">
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-xs font-bold text-slate-900 dark:text-white">
                                      {r.title}
                                    </span>
                                    {isSelected && (
                                      <Check className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2 text-[10px] text-slate-400">
                                    <span className="font-semibold text-indigo-600 dark:text-indigo-400">{r.domain}</span>
                                    <span>•</span>
                                    <span>{r.seniority_tier}</span>
                                    <span>•</span>
                                    <span>Min {r.experience_years_min} yrs</span>
                                  </div>
                                </div>
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 shrink-0">
                                  {r.required_skills?.length || 4} skills
                                </span>
                              </button>
                            );
                          })
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
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
        <div className={`grid grid-cols-1 md:grid-cols-${Math.min(comparisons.length, 3)} gap-6 items-start`}>
          {comparisons.map((item, index) => {
            const isBaseline = Boolean(item.is_current_profile);
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
                className={`p-6 rounded-3xl border shadow-sm flex flex-col justify-between space-y-6 ${
                  isBaseline
                    ? 'bg-gradient-to-b from-purple-50/70 via-white to-white dark:from-purple-950/30 dark:via-slate-900 dark:to-slate-900 border-purple-300 dark:border-purple-800 ring-2 ring-purple-500/20'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                }`}
              >
                <div className="space-y-4">
                  {/* Card Title & Match Pill */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className={`text-[11px] font-bold uppercase tracking-wider flex items-center gap-1 ${isBaseline ? 'text-purple-600 dark:text-purple-400' : 'text-slate-400'}`}>
                        {isBaseline ? (
                          <>
                            <UserCheck className="w-3.5 h-3.5" />
                            <span>Your Current Verified Baseline</span>
                          </>
                        ) : (
                          'Target Career Trajectory'
                        )}
                      </span>
                      <h3 className="text-lg font-extrabold text-slate-900 dark:text-white leading-snug">
                        {item.title}
                      </h3>
                      <span className="text-xs font-semibold text-slate-400">
                        {item.domain} • {item.seniority_tier}
                      </span>
                    </div>

                    <div
                      className={`px-3 py-1.5 rounded-full text-xs font-black shrink-0 ${
                        isBaseline
                          ? 'bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border border-purple-300 dark:border-purple-700'
                          : scoreColor === 'emerald'
                          ? 'bg-emerald-50 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                          : scoreColor === 'indigo'
                          ? 'bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800'
                          : 'bg-amber-50 dark:bg-amber-950/70 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                      }`}
                    >
                      {isBaseline ? '100% Baseline' : `${item.match_percent}% AI Alignment`}
                    </div>
                  </div>

                  {/* Transition Effort & Salary Band Highlight */}
                  <div className="grid grid-cols-2 gap-2 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                    <div className="space-y-0.5">
                      <span className="text-[10px] text-slate-400 font-medium flex items-center gap-1">
                        <Clock className="w-3 h-3 text-indigo-500" />
                        <span>{isBaseline ? 'Verified Tenure' : 'Est. Transition'}</span>
                      </span>
                      <span className="text-sm font-bold text-slate-800 dark:text-slate-100">
                        {isBaseline ? `${item.experience_years || 3.0} Years` : `${item.estimated_transition_months} Months`}
                      </span>
                    </div>

                    <div className="space-y-0.5">
                      <span className="text-[10px] text-slate-400 font-medium flex items-center gap-1">
                        <DollarSign className="w-3 h-3 text-emerald-500" />
                        <span>Median Compensation</span>
                      </span>
                      <div className="flex items-baseline gap-1 flex-wrap">
                        <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                          ${(item.salary_bands?.p50 || item.salary_bands?.median || 120000).toLocaleString()}/yr
                        </span>
                        {!isBaseline && item.salary_delta !== undefined && (
                          <span
                            className={`text-[10px] font-black px-1.5 py-0.2 rounded-md ${
                              item.salary_delta >= 0
                                ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                            }`}
                          >
                            {item.salary_delta >= 0 ? `+${(item.salary_delta / 1000).toFixed(0)}k` : `${(item.salary_delta / 1000).toFixed(0)}k`}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Verified Skills */}
                  <div className="space-y-1.5">
                    <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{isBaseline ? `Profile Skills (${item.verified_skills.length})` : `Verified Competencies (${item.verified_skills.length})`}</span>
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {item.verified_skills.length > 0 ? (
                        item.verified_skills.map((skill) => (
                          <span
                            key={skill}
                            className="px-2.5 py-0.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800 text-[11px] font-semibold flex items-center gap-1"
                          >
                            <span>{skill}</span>
                          </span>
                        ))
                      ) : (
                        <span className="text-[11px] text-slate-400 italic">No verified skills matching this role yet</span>
                      )}
                    </div>
                  </div>

                  {/* Partial / Transferrable Skills (AI Check) */}
                  {!isBaseline && item.partial_skills && item.partial_skills.length > 0 && (
                    <div className="space-y-1.5">
                      <span className="text-xs font-bold text-purple-600 dark:text-purple-400 flex items-center gap-1">
                        <Sparkles className="w-3.5 h-3.5 text-purple-500" />
                        <span>Transferrable Foundations ({item.partial_skills.length})</span>
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {item.partial_skills.map((p) => (
                          <span
                            key={p.skill}
                            title={p.reason || 'Semantic foundation transferrable from current profile'}
                            className="px-2.5 py-0.5 rounded-lg bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200/80 dark:border-purple-800 text-[11px] font-semibold flex items-center gap-1 cursor-help"
                          >
                            <span>{p.skill}</span>
                            <span className="text-[9px] text-purple-400 opacity-80">(~75%)</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Missing Skills Gap */}
                  {!isBaseline && (
                    <div className="space-y-1.5">
                      <span className="text-xs font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5" />
                        <span>Prerequisite Gaps ({item.missing_skills.length})</span>
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
                          <span className="text-[11px] text-emerald-600 font-bold flex items-center gap-1">
                            <ShieldCheck className="w-3.5 h-3.5" />
                            <span>All prerequisite skills verified! Complete alignment.</span>
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Transition Roadmap Preview */}
                  {item.transition_roadmap && item.transition_roadmap.length > 0 && (
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1.5">
                      <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                        <TrendingUp className="w-3 h-3 text-indigo-500" />
                        <span>Structured Trajectory Bridge:</span>
                      </span>
                      <div className="space-y-1 text-[11px] text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/40 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800/80">
                        {item.transition_roadmap.map((step, sIdx) => (
                          <div key={sIdx} className="flex items-start gap-1.5">
                            <span className="text-indigo-500 font-bold shrink-0">{sIdx + 1}.</span>
                            <span className="leading-snug">{step}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Market Percentiles */}
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
                  {!isBaseline && onSelectRoleForLearning && (
                    <button
                      onClick={() => onSelectRoleForLearning(item.title)}
                      className="w-full py-2 px-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 font-bold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <BookOpen className="w-3.5 h-3.5" />
                      <span>Generate Adaptive Learning Plan</span>
                    </button>
                  )}

                  {!isBaseline && onSetRoleAsGoal && (
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
            Select Roles from Knowledge Graph to Begin Analysis
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            Click "Evaluate &amp; Compare Paths" above to analyze transferrable skills, required time-to-learn, and calibrated salary expectations for each trajectory.
          </p>
        </div>
      )}
    </div>
  );
};
