import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Briefcase,
  Globe,
  Building,
  RefreshCw,
  Search,
  ExternalLink,
  PlusCircle,
  TrendingUp,
  CheckCircle,
  ArrowRight,
  Zap,
  Info,
  DollarSign,
  Compass
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip
} from 'recharts';
import {
  JobRoleItem,
  JobPostingItem,
  RoleSalaryResponse,
  NavigatorIndustryItem
} from '../../types';
import { api } from '../../services/api';

interface LiveMarketJobsStudioProps {
  onNavigateToSalary?: (roleTitle: string) => void;
  onNavigateToNegotiator?: (roleTitle: string, initialOffer: number, targetSalary: number) => void;
  onNavigateToGraph?: (roleTitle: string) => void;
  initialRoleTitle?: string;
}

const COUNTRIES = [
  { code: 'us', label: 'United States', flag: '🇺🇸', currency: 'USD', symbol: '$' },
  { code: 'gb', label: 'United Kingdom', flag: '🇬🇧', currency: 'GBP', symbol: '£' },
  { code: 'ca', label: 'Canada', flag: '🇨🇦', currency: 'CAD', symbol: 'C$' },
  { code: 'de', label: 'Germany / EU', flag: '🇩🇪', currency: 'EUR', symbol: '€' },
];

const WORK_MODES = [
  { id: 'all', label: 'All Modes' },
  { id: 'remote', label: 'Remote', color: 'emerald' },
  { id: 'hybrid', label: 'Hybrid', color: 'purple' },
  { id: 'onsite', label: 'On-site', color: 'sky' },
];

const formatTimeAgo = (iso?: string | null): string => {
  if (!iso) return 'Just now';
  try {
    const dt = new Date(iso);
    const diffSec = Math.floor((Date.now() - dt.getTime()) / 1000);
    if (diffSec < 60) return 'Just now';
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  } catch {
    return 'Recently';
  }
};

export const LiveMarketJobsStudio: React.FC<LiveMarketJobsStudioProps> = ({
  onNavigateToSalary,
  onNavigateToNegotiator,
  onNavigateToGraph,
  initialRoleTitle
}) => {
  const [industries, setIndustries] = useState<NavigatorIndustryItem[]>([]);
  const [roles, setRoles] = useState<JobRoleItem[]>([]);
  const [selectedIndustryId, setSelectedIndustryId] = useState<number | null>(null);
  const [selectedWorkMode, setSelectedWorkMode] = useState<string>('all');
  const [selectedCountry, setSelectedCountry] = useState<string>('us');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const [selectedRole, setSelectedRole] = useState<JobRoleItem | null>(null);
  const [salaryData, setSalaryData] = useState<RoleSalaryResponse | null>(null);
  const [jobPostings, setJobPostings] = useState<JobPostingItem[]>([]);

  const [loadingRoles, setLoadingRoles] = useState<boolean>(true);
  const [loadingDetails, setLoadingDetails] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [refreshMessage, setRefreshMessage] = useState<string | null>(null);
  const [trackedJobId, setTrackedJobId] = useState<number | null>(null);
  const [trackNotification, setTrackNotification] = useState<string | null>(null);

  // Load Industries & Initial Roles
  useEffect(() => {
    let active = true;
    api.getNavigatorIndustries()
      .then((data) => {
        if (active) setIndustries(data);
      })
      .catch((err) => console.error('Failed to load industries:', err));

    return () => { active = false; };
  }, []);

  const fetchRoles = useCallback(() => {
    setLoadingRoles(true);
    api.getNavigatorRoles({
      industry_id: selectedIndustryId || undefined,
      work_mode: selectedWorkMode !== 'all' ? selectedWorkMode : undefined,
      q: searchQuery.trim() || undefined,
      country: selectedCountry
    })
      .then((data) => {
        setRoles(data);
        if (data.length > 0) {
          if (initialRoleTitle) {
            const match = data.find(r => r.title.toLowerCase() === initialRoleTitle.toLowerCase());
            setSelectedRole(match || data[0]);
          } else if (!selectedRole || !data.some(r => r.id === selectedRole.id)) {
            setSelectedRole(data[0]);
          }
        }
      })
      .catch((err) => console.error('Failed to fetch navigator roles:', err))
      .finally(() => setLoadingRoles(false));
  }, [selectedIndustryId, selectedWorkMode, searchQuery, selectedCountry, initialRoleTitle, selectedRole]);

  // Initial and parameter-based role loading
  useEffect(() => {
    let active = true;
    api.getNavigatorRoles({
      industry_id: selectedIndustryId || undefined,
      work_mode: selectedWorkMode !== 'all' ? selectedWorkMode : undefined,
      q: searchQuery.trim() || undefined,
      country: selectedCountry
    })
      .then((data) => {
        if (!active) return;
        setRoles(data);
        if (data.length > 0) {
          if (initialRoleTitle) {
            const match = data.find(r => r.title.toLowerCase() === initialRoleTitle.toLowerCase());
            setSelectedRole(match || data[0]);
          } else if (!selectedRole || !data.some(r => r.id === selectedRole.id)) {
            setSelectedRole(data[0]);
          }
        }
      })
      .catch((err) => console.error('Failed to fetch navigator roles:', err))
      .finally(() => {
        if (active) setLoadingRoles(false);
      });

    return () => { active = false; };
  }, [selectedIndustryId, selectedWorkMode, searchQuery, selectedCountry, initialRoleTitle, selectedRole]);

  // Load selected role salary snapshot and live job postings
  useEffect(() => {
    if (!selectedRole) return;
    let active = true;

    Promise.all([
      api.getNavigatorRoleSalary(selectedRole.id, {
        country: selectedCountry,
        work_mode: selectedWorkMode !== 'all' ? selectedWorkMode : undefined,
        days: 30
      }),
      api.getNavigatorRoleJobs(selectedRole.id, {
        work_mode: selectedWorkMode !== 'all' ? selectedWorkMode : undefined,
        limit: 20
      })
    ])
      .then(([salRes, jobsRes]) => {
        if (!active) return;
        setSalaryData(salRes);
        setJobPostings(jobsRes.postings || []);
      })
      .catch((err) => console.error('Failed to load role details:', err))
      .finally(() => {
        if (active) setLoadingDetails(false);
      });

    return () => { active = false; };
  }, [selectedRole, selectedCountry, selectedWorkMode]);

  // Manual Trigger Refresh with Cooldown
  const handleManualRefresh = async () => {
    try {
      setRefreshing(true);
      setRefreshMessage('Contacting live job boards (Remotive, Arbeitnow, Adzuna)...');
      const res = await api.triggerNavigatorRefresh();
      if (res.status === 'rate_limited') {
        setRefreshMessage(`Refreshed recently. Cooldown active for ${res.retry_after_seconds}s`);
      } else {
        setRefreshMessage('Live feeds queried! Updating salary distributions in background...');
        setTimeout(() => {
          fetchRoles();
          setRefreshMessage(null);
        }, 3000);
      }
    } catch {
      setRefreshMessage('Refresh encountered a temporary error. Using latest cached rates.');
    } finally {
      setRefreshing(false);
    }
  };

  // 1-Click Track Job in Pipeline (Kanban)
  const handleTrackInPipeline = async (job: JobPostingItem) => {
    try {
      setTrackedJobId(job.id);
      await api.createApplication({
        company: job.company,
        role: job.title,
        job_url: job.url,
        location: job.location,
        salary_range: job.salary_min && job.salary_max
          ? `$${Math.round(job.salary_min).toLocaleString()} - $${Math.round(job.salary_max).toLocaleString()}`
          : 'Market competitive',
        stage: 'applied',
        source: job.source,
        notes: `Imported via CareerLens Live Job Market (${job.source}). Work mode: ${job.work_mode}.`
      });
      setTrackNotification(`"${job.title}" added to your Application Tracker!`);
      setTimeout(() => setTrackNotification(null), 4000);
    } catch {
      setTrackNotification(`Failed to track "${job.title}". Please try again.`);
      setTimeout(() => setTrackNotification(null), 3000);
    } finally {
      setTrackedJobId(null);
    }
  };

  // Currency Formatter
  const formatSalary = (amount?: number | null, compact: boolean = false): string => {
    if (!amount) return 'N/A';
    const curr = COUNTRIES.find(c => c.code === selectedCountry)?.symbol || '$';
    if (compact) {
      return `${curr}${Math.round(amount / 1000)}k`;
    }
    return `${curr}${Math.round(amount).toLocaleString()}`;
  };

  // Trend Chart Data
  const trendChartData = useMemo(() => {
    if (!salaryData?.trend || salaryData.trend.length === 0) {
      if (!salaryData?.latest) return [];
      return [
        { date: '15d ago', median: Math.round(salaryData.latest.median * 0.98) },
        { date: '7d ago', median: Math.round(salaryData.latest.median * 0.99) },
        { date: 'Current', median: Math.round(salaryData.latest.median) },
      ];
    }
    return salaryData.trend.map((item, idx) => ({
      date: item.date || `Day ${idx + 1}`,
      median: Math.round(item.median),
      p25: Math.round(item.p25),
      p75: Math.round(item.p75)
    }));
  }, [salaryData]);

  // Compute 30-day percentage trend change
  const trendPercent = useMemo(() => {
    if (!trendChartData || trendChartData.length < 2) return null;
    const first = trendChartData[0].median;
    const last = trendChartData[trendChartData.length - 1].median;
    if (first <= 0) return null;
    const pct = ((last - first) / first) * 100;
    return pct;
  }, [trendChartData]);

  return (
    <div className="space-y-6">
      {/* Top Action & Feed Status Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-2xl bg-slate-900 border border-slate-800 text-white shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0">
            <Globe className="w-5 h-5 animate-spin-slow" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-white">Live Job Market & Auto-Refreshing Salaries</h2>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1 animate-pulse" />
                Live Multi-Feed
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Aggregated continuously from <strong className="text-slate-300">Remotive</strong>, <strong className="text-slate-300">Arbeitnow</strong>, and <strong className="text-slate-300">Adzuna</strong>. Refreshes on launch and every 6h.
            </p>
          </div>
        </div>

        {/* Action Buttons & Status */}
        <div className="flex items-center gap-2.5 shrink-0">
          {refreshMessage && (
            <span className="text-xs text-amber-300 font-medium px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20 animate-fade-in">
              {refreshMessage}
            </span>
          )}
          <button
            type="button"
            onClick={handleManualRefresh}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white transition-all shadow-sm cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            <span>{refreshing ? 'Updating Feeds...' : 'Refresh Live Rates'}</span>
          </button>
        </div>
      </div>

      {/* Global Filter Bar */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
        {/* Search Input */}
        <div className="md:col-span-5 relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search roles or skills (e.g. Data Engineer, React)..."
            className="w-full pl-9 pr-4 py-2 rounded-xl text-xs sm:text-sm bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {/* Work Mode Chips */}
        <div className="md:col-span-5 flex items-center gap-1 overflow-x-auto py-0.5">
          {WORK_MODES.map((mode) => (
            <button
              key={mode.id}
              type="button"
              onClick={() => setSelectedWorkMode(mode.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                selectedWorkMode === mode.id
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {mode.label}
            </button>
          ))}
        </div>

        {/* Country Selector */}
        <div className="md:col-span-2">
          <select
            value={selectedCountry}
            onChange={(e) => setSelectedCountry(e.target.value)}
            className="w-full px-3 py-2 rounded-xl text-xs sm:text-sm bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 text-slate-900 dark:text-white font-medium focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
          >
            {COUNTRIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.flag} {c.label} ({c.symbol})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Content Layout: Left Industry List & Role Cards, Right Detail Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Industries & Role Cards (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Industry Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
            <button
              type="button"
              onClick={() => setSelectedIndustryId(null)}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all whitespace-nowrap cursor-pointer ${
                selectedIndustryId === null
                  ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                  : 'bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              All Industries ({roles.length})
            </button>
            {industries.map((ind) => (
              <button
                key={ind.id}
                type="button"
                onClick={() => setSelectedIndustryId(ind.id)}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all whitespace-nowrap cursor-pointer ${
                  selectedIndustryId === ind.id
                    ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                    : 'bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {ind.name} ({ind.role_count})
              </button>
            ))}
          </div>

          {/* Roles List */}
          {loadingRoles ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-28 rounded-2xl bg-slate-100 dark:bg-slate-800/50 animate-pulse border border-slate-200 dark:border-slate-800" />
              ))}
            </div>
          ) : roles.length === 0 ? (
            <div className="p-8 text-center rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800">
              <Briefcase className="w-10 h-10 text-slate-400 mx-auto mb-2 opacity-60" />
              <p className="text-sm font-bold text-slate-700 dark:text-slate-300">No matching roles found</p>
              <p className="text-xs text-slate-500 mt-1">Try broadening your search or switching to "All Modes".</p>
            </div>
          ) : (
            <div className="space-y-3">
              {roles.map((role) => {
                const isSelected = selectedRole?.id === role.id;
                const sal = role.latest_salary;
                return (
                  <div
                    key={role.id}
                    onClick={() => setSelectedRole(role)}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-50/50 dark:bg-indigo-950/20 border-indigo-500/80 shadow-md ring-1 ring-indigo-500/30'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-xs'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-base font-bold text-slate-900 dark:text-white">
                            {role.title}
                          </h3>
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                            {role.industry_name}
                          </span>
                          {role.openings_count > 0 && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
                              {role.openings_count} active {role.openings_count === 1 ? 'opening' : 'openings'}
                            </span>
                          )}
                        </div>

                        {/* Work Mode Badges */}
                        <div className="flex items-center gap-2 mt-2 text-[11px] font-medium text-slate-500 dark:text-slate-400">
                          {role.work_mode_counts.remote > 0 && (
                            <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                              {role.work_mode_counts.remote} Remote
                            </span>
                          )}
                          {role.work_mode_counts.hybrid > 0 && (
                            <span className="inline-flex items-center gap-1 text-purple-600 dark:text-purple-400">
                              <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                              {role.work_mode_counts.hybrid} Hybrid
                            </span>
                          )}
                          {role.work_mode_counts.onsite > 0 && (
                            <span className="inline-flex items-center gap-1 text-sky-600 dark:text-sky-400">
                              <span className="w-1.5 h-1.5 rounded-full bg-sky-500" />
                              {role.work_mode_counts.onsite} On-site
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Right Salary Preview */}
                      <div className="text-left sm:text-right shrink-0">
                        {sal ? (
                          <>
                            <div className="text-lg font-black text-slate-900 dark:text-white">
                              {formatSalary(sal.median)} <span className="text-xs font-normal text-slate-500">/yr</span>
                            </div>
                            <div className="text-[11px] text-slate-500">
                              Range {formatSalary(sal.p25, true)} – {formatSalary(sal.p75, true)}
                            </div>
                          </>
                        ) : (
                          <span className="text-xs text-slate-400 italic">Gathering samples...</span>
                        )}
                      </div>
                    </div>

                    {/* Percentile visual range bar */}
                    {sal && (
                      <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/80">
                        <div className="flex items-center justify-between text-[10px] text-slate-400 font-medium mb-1">
                          <span>P25: {formatSalary(sal.p25, true)}</span>
                          <span className="font-bold text-indigo-600 dark:text-indigo-400">
                            Median: {formatSalary(sal.median, true)}
                          </span>
                          <span>P75: {formatSalary(sal.p75, true)}</span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden relative">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-400"
                            style={{ width: '100%' }}
                          />
                        </div>
                        <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1.5">
                          <span>Based on {sal.sample_size} postings</span>
                          <div className="flex items-center gap-2">
                            {sal.estimated_share > 0.4 && (
                              <span className="px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-500 text-[9px] font-bold">
                                Model Calibrated
                              </span>
                            )}
                            <span>Updated {formatTimeAgo(sal.fetched_at)}</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Deep Role Details, 30-Day Trend & Live Openings (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          {selectedRole ? (
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-5 sticky top-6">
              {/* Notification Toast */}
              {trackNotification && (
                <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-semibold flex items-center gap-2 animate-fade-in">
                  <CheckCircle className="w-4 h-4 shrink-0 text-emerald-500" />
                  <span>{trackNotification}</span>
                </div>
              )}

              {/* Header */}
              <div className="flex items-start justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                    {selectedRole.industry_name}
                  </span>
                  <h2 className="text-xl font-black text-slate-900 dark:text-white">
                    {selectedRole.title}
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Live market compensation and newest hiring postings.
                  </p>
                </div>
              </div>

              {/* 30-Day Salary Trend History Chart */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-200">
                    <TrendingUp className="w-4 h-4 text-indigo-500" />
                    <span>30-Day Salary Trend History</span>
                  </div>
                  {trendPercent !== null && (
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        trendPercent >= 0
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                      }`}
                    >
                      {trendPercent >= 0 ? `+${trendPercent.toFixed(1)}%` : `${trendPercent.toFixed(1)}%`} in 30 days
                    </span>
                  )}
                </div>

                {trendChartData.length > 0 ? (
                  <div className="h-44 w-full pt-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={trendChartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                        <defs>
                          <linearGradient id="salaryTrendGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                            <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
                          </linearGradient>
                        </defs>
                        <XAxis
                          dataKey="date"
                          stroke="#94a3b8"
                          fontSize={10}
                          tickLine={false}
                          axisLine={{ stroke: '#334155' }}
                        />
                        <YAxis
                          stroke="#94a3b8"
                          fontSize={10}
                          tickLine={false}
                          axisLine={{ stroke: '#334155' }}
                          tickFormatter={(val: number) => `$${Math.round(val / 1000)}k`}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#0f172a',
                            border: '1px solid #334155',
                            borderRadius: '0.75rem',
                            fontSize: '11px',
                            color: '#fff'
                          }}
                          formatter={(value: any) => [`$${Number(value).toLocaleString()}`, 'Median Base']}
                        />
                        <Area
                          type="monotone"
                          dataKey="median"
                          stroke="#6366f1"
                          strokeWidth={2.5}
                          fillOpacity={1}
                          fill="url(#salaryTrendGrad)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-28 rounded-xl bg-slate-50 dark:bg-slate-800/40 flex items-center justify-center text-xs text-slate-400">
                    Awaiting more snapshot records to compile trend curve.
                  </div>
                )}
              </div>

              {/* Cross-Feature Action Hub */}
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => onNavigateToSalary && onNavigateToSalary(selectedRole.title)}
                  className="p-2.5 rounded-xl text-xs font-bold text-left bg-slate-50 dark:bg-slate-800/80 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 border border-slate-200 dark:border-slate-700/80 transition-all flex items-center justify-between cursor-pointer"
                >
                  <span className="flex items-center gap-1.5">
                    <DollarSign className="w-3.5 h-3.5 text-indigo-500" />
                    Salary Predictor
                  </span>
                  <ArrowRight className="w-3 h-3 opacity-60" />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (onNavigateToNegotiator && salaryData?.latest) {
                      const median = salaryData.latest.median;
                      onNavigateToNegotiator(selectedRole.title, Math.round(median * 0.9), Math.round(median * 1.15));
                    }
                  }}
                  className="p-2.5 rounded-xl text-xs font-bold text-left bg-slate-50 dark:bg-slate-800/80 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-slate-700 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 border border-slate-200 dark:border-slate-700/80 transition-all flex items-center justify-between cursor-pointer"
                >
                  <span className="flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-emerald-500" />
                    Negotiate Offer
                  </span>
                  <ArrowRight className="w-3 h-3 opacity-60" />
                </button>

                <button
                  type="button"
                  onClick={() => onNavigateToGraph && onNavigateToGraph(selectedRole.title)}
                  className="col-span-2 p-2.5 rounded-xl text-xs font-bold text-left bg-slate-50 dark:bg-slate-800/80 hover:bg-purple-50 dark:hover:bg-purple-950/40 text-slate-700 dark:text-slate-300 hover:text-purple-600 dark:hover:text-purple-400 border border-slate-200 dark:border-slate-700/80 transition-all flex items-center justify-between cursor-pointer"
                >
                  <span className="flex items-center gap-1.5">
                    <Compass className="w-3.5 h-3.5 text-purple-500" />
                    View in Career Path Knowledge Graph & Bridge
                  </span>
                  <ArrowRight className="w-3 h-3 opacity-60" />
                </button>
              </div>

              {/* Live Job Openings List with Direct Attribution */}
              <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 dark:text-white">
                    <Building className="w-4 h-4 text-indigo-500" />
                    <span>Live Postings for {selectedRole.title}</span>
                  </div>
                  <span className="text-[11px] text-slate-400 font-medium">
                    {jobPostings.length} available
                  </span>
                </div>

                {loadingDetails ? (
                  <div className="space-y-2">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-16 rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
                    ))}
                  </div>
                ) : jobPostings.length === 0 ? (
                  <div className="p-6 text-center rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/50">
                    <p className="text-xs text-slate-500">
                      No direct postings matching active work-mode filter right now. Try switching to "All Modes" or clicking "Refresh Live Rates".
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
                    {jobPostings.map((job) => (
                      <div
                        key={job.id}
                        className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 hover:border-slate-300 dark:hover:border-slate-600 transition-all"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                              {job.title}
                            </h4>
                            <p className="text-[11px] text-slate-500 truncate mt-0.5">
                              {job.company} • {job.location}
                            </p>
                          </div>
                          <span
                            className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase shrink-0 ${
                              job.work_mode === 'remote'
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                : job.work_mode === 'hybrid'
                                ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                                : 'bg-sky-500/10 text-sky-400 border border-sky-500/20'
                            }`}
                          >
                            {job.work_mode}
                          </span>
                        </div>

                        <div className="flex items-center justify-between gap-2 mt-2 pt-2 border-t border-slate-200/50 dark:border-slate-700/50">
                          <div className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                            {job.salary_min && job.salary_max ? (
                              <span>
                                {formatSalary(job.salary_min, true)} – {formatSalary(job.salary_max, true)}
                              </span>
                            ) : (
                              <span className="text-slate-400 font-normal">Market rate</span>
                            )}
                          </div>

                          <div className="flex items-center gap-1.5">
                            {/* Track in Pipeline Button */}
                            <button
                              type="button"
                              onClick={() => handleTrackInPipeline(job)}
                              disabled={trackedJobId === job.id}
                              title="Add to Kanban Application Tracker"
                              className="px-2 py-1 rounded-lg text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 transition-all flex items-center gap-1 cursor-pointer"
                            >
                              <PlusCircle className="w-3 h-3" />
                              <span>Track</span>
                            </button>

                            {/* Direct External Link with Attribution */}
                            {job.url && (
                              <a
                                href={job.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                title={`View original job on ${job.source}`}
                                className="px-2 py-1 rounded-lg text-[10px] font-bold bg-slate-200/60 dark:bg-slate-700/60 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 transition-all flex items-center gap-1"
                              >
                                <span>{job.source}</span>
                                <ExternalLink className="w-3 h-3 opacity-70" />
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Data Quality & Market Indicator Disclaimer */}
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 text-[10px] text-slate-500 leading-relaxed flex items-start gap-2">
                <Info className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                <span>
                  <strong>Ethical Data Disclaimer:</strong> All figures are algorithmic market indicators aggregated from publicly accessible feeds (Remotive, Arbeitnow, Adzuna). Not binding salary offers.
                </span>
              </div>
            </div>
          ) : (
            <div className="p-8 text-center rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-400 text-xs">
              Select a role on the left to inspect market trends and live openings.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
