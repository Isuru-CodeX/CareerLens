import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Activity,
  Cpu,
  Clock,
  Layers,
  Sparkles,
  Target,
  FileText,
  UserCheck,
  Briefcase,
  Search,
  Filter,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Zap,
  TrendingUp,
  CheckCircle2
} from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from 'recharts';
import { UserActivity, UserActivityStats } from '../types';
import { api } from '../services/api';
import { ActivityDetailsModal } from '../components/ActivityDetailsModal';
import { DisclaimerBanner } from '../components/DisclaimerBanner';

interface UserActivityViewProps {
  onNavigate?: (view: string, params?: any) => void;
}

const getRelativeTime = (dateStr: string) => {
  try {
    const date = new Date(dateStr);
    const now = new Date();
    const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);
    if (diffSec < 60) return 'Just now';
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 30) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  } catch {
    return dateStr;
  }
};

const getActivityIcon = (eventType: string) => {
  const ev = eventType.toLowerCase();
  if (ev.includes('cover') || ev.includes('rewrite') || ev.includes('interview')) {
    return <Sparkles className="w-4 h-4 text-purple-500" />;
  }
  if (ev.includes('match') || ev.includes('job')) {
    return <Target className="w-4 h-4 text-emerald-500" />;
  }
  if (ev.includes('resume') || ev.includes('experience')) {
    return <FileText className="w-4 h-4 text-blue-500" />;
  }
  if (ev.includes('profile') || ev.includes('avatar') || ev.includes('auth')) {
    return <UserCheck className="w-4 h-4 text-pink-500" />;
  }
  return <Briefcase className="w-4 h-4 text-amber-500" />;
};

export const UserActivityView: React.FC<UserActivityViewProps> = ({ onNavigate }) => {
  const [stats, setStats] = useState<UserActivityStats | null>(null);
  const [activities, setActivities] = useState<UserActivity[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [limit] = useState<number>(10);
  const [eventTypeFilter, setEventTypeFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [selectedActivity, setSelectedActivity] = useState<UserActivity | null>(null);

  useEffect(() => {
    let isMounted = true;
    Promise.all([
      api.getActivityStats().catch((err) => {
        console.error('Failed to load activity stats:', err);
        return null;
      }),
      api.getActivity(limit, page, eventTypeFilter, searchTerm).catch((err) => {
        console.error('Failed to load activity feed:', err);
        return { items: [], total: 0 };
      })
    ]).then(([statsRes, actRes]) => {
      if (isMounted) {
        if (statsRes) setStats(statsRes);
        if (actRes) {
          setActivities(actRes.items);
          setTotalCount(actRes.total);
        }
        setLoading(false);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [limit, page, eventTypeFilter, searchTerm]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const [statsRes, actRes] = await Promise.all([
        api.getActivityStats(),
        api.getActivity(limit, page, eventTypeFilter, searchTerm)
      ]);
      setStats(statsRes);
      setActivities(actRes.items);
      setTotalCount(actRes.total);
    } catch (e) {
      console.error('Failed to refresh activities:', e);
    } finally {
      setRefreshing(false);
    }
  };

  const totalPages = Math.ceil(totalCount / limit) || 1;

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      <DisclaimerBanner compact />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
              <Activity className="w-5 h-5" />
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              User Activity & Model Analytics
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Real-time audit log of your career operations, model engagement time, token metrics, and productivity savings.
          </p>
        </div>

        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="self-start sm:self-auto px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 text-xs font-semibold shadow-xs hover:bg-slate-50 dark:hover:bg-slate-800 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-indigo-600' : ''}`} />
          <span>{refreshing ? 'Updating Stats...' : 'Refresh Activity'}</span>
        </button>
      </div>

      {/* 1. Hero KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Time in Models */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Time in AI Models
            </span>
            <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white font-mono">
              {stats ? Math.round(stats.total_time_spent_minutes) : 0}
            </span>
            <span className="text-xs font-semibold text-slate-500">minutes active</span>
          </div>
          <p className="text-[11px] text-slate-400 flex items-center gap-1">
            <Zap className="w-3 h-3 text-amber-500" />
            <span>Interactive generation & scoring sessions</span>
          </p>
        </motion.div>

        {/* Estimated Hours Saved */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, delay: 0.05 }}
          className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Productivity Saved
            </span>
            <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 font-mono">
              ~{stats ? stats.time_saved_hours : 0}
            </span>
            <span className="text-xs font-semibold text-slate-500">hours saved</span>
          </div>
          <p className="text-[11px] text-slate-400">
            Automated drafting, ATS scans & matching
          </p>
        </motion.div>

        {/* Total Actions Logged */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, delay: 0.1 }}
          className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Total Logged Actions
            </span>
            <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white font-mono">
              {stats ? stats.total_activities : 0}
            </span>
            <span className="text-xs font-semibold text-slate-500">recorded events</span>
          </div>
          <p className="text-[11px] text-slate-400">
            All user operations across all modules
          </p>
        </motion.div>

        {/* AI Tokens Processed */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, delay: 0.15 }}
          className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Tokens Processed
            </span>
            <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-purple-600 dark:text-purple-400 font-mono">
              {stats ? stats.total_tokens_used.toLocaleString() : 0}
            </span>
            <span className="text-xs font-semibold text-slate-500">tokens</span>
          </div>
          <p className="text-[11px] text-slate-400">
            Across writer, parser & deep match models
          </p>
        </motion.div>
      </div>

      {/* 2. Model Breakdown & Engagement Times */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Cpu className="w-4 h-4 text-indigo-500" />
              <span>Time Spent Across AI Engines & Models</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Detailed tracking of processing duration, call count, and token usage per engine
            </p>
          </div>
          <span className="text-[11px] font-mono text-indigo-600 dark:text-indigo-400 font-semibold px-2.5 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/50">
            5 Active Engines
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {stats?.models.map((mod) => (
            <div
              key={mod.model_id}
              className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/60 space-y-3 flex flex-col justify-between"
            >
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] font-bold text-slate-400 uppercase">
                    {mod.model_id}
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
                    Ready
                  </span>
                </div>
                <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white leading-tight">
                  {mod.model_name}
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2">
                  {mod.description}
                </p>
              </div>

              <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/50 space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="text-slate-500">Time Spent:</span>
                  <span className="font-mono text-indigo-600 dark:text-indigo-400 font-bold">
                    {mod.estimated_time_minutes} mins
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">Total Invocations:</span>
                  <span className="font-mono text-slate-800 dark:text-slate-200 font-semibold">
                    {mod.call_count} runs
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">Tokens Processed:</span>
                  <span className="font-mono text-slate-800 dark:text-slate-200">
                    {mod.tokens_used.toLocaleString()}
                  </span>
                </div>

                {/* Relative usage progress bar */}
                <div className="w-full h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full transition-all"
                    style={{
                      width: `${Math.min(100, Math.max(12, (mod.estimated_time_minutes / (stats.total_time_spent_minutes || 1)) * 100))}%`
                    }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 3. 14-Day Velocity & Category Distribution Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Daily Velocity Chart */}
        <div className="lg:col-span-2 p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                14-Day Activity Velocity
              </h3>
              <p className="text-xs text-slate-400">
                Daily frequency of resume scans, matches, and generated drafts
              </p>
            </div>
            <span className="text-[11px] font-mono text-slate-400">Last 14 days</span>
          </div>

          <div className="h-56 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats?.daily_activity || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis
                  dataKey="date"
                  tickFormatter={(val) => val.substring(5)}
                  stroke="#94a3b8"
                  fontSize={10}
                  tickLine={false}
                />
                <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} allowDecimals={false} />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="bg-slate-900 text-white text-xs p-2 rounded-xl shadow-lg border border-slate-700">
                          <p className="font-bold">{label}</p>
                          <p className="text-indigo-400">{payload[0].value} operations logged</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                  {(stats?.daily_activity || []).map((_, index) => (
                    <Cell key={`cell-${index}`} fill={index === (stats?.daily_activity?.length ?? 0) - 1 ? '#4f46e5' : '#818cf8'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Category Breakdown */}
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4 flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">
              Category Distribution
            </h3>
            <p className="text-xs text-slate-400">
              Breakdown of actions by feature domain
            </p>
          </div>

          <div className="space-y-3">
            {stats && Object.entries(stats.category_distribution).map(([category, count]) => {
              const pct = stats.total_activities ? Math.round((count / stats.total_activities) * 100) : 0;
              return (
                <div key={category} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-700 dark:text-slate-300">{category}</span>
                    <span className="font-mono text-slate-500 font-semibold">{count} ({pct}%)</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div
                      className="h-full bg-indigo-600 rounded-full transition-all"
                      style={{ width: `${Math.max(4, pct)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="p-3 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/40 text-[11px] text-indigo-900 dark:text-indigo-300 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0" />
            <span>Audit trail complies with GDPR data privacy logging standards.</span>
          </div>
        </div>
      </div>

      {/* 4. Searchable & Filterable Activity Audit Feed */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Activity History & Audit Log
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Browse, search, and inspect the details of all operations executed on your account
            </p>
          </div>

          {/* Search bar */}
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search activity description..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPage(1);
              }}
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        {/* Category Filter Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 border-b border-slate-100 dark:border-slate-800 pb-3">
          <span className="text-xs text-slate-400 flex items-center gap-1 mr-2">
            <Filter className="w-3.5 h-3.5" />
            <span>Filter:</span>
          </span>
          {[
            { id: 'all', label: 'All Activities' },
            { id: 'ai', label: 'AI Writing & Generation' },
            { id: 'jobs', label: 'Job Matching' },
            { id: 'resumes', label: 'Resumes & Experiences' },
            { id: 'profile', label: 'Profile & Identity' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setEventTypeFilter(tab.id);
                setPage(1);
              }}
              className={`px-3 py-1 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                eventTypeFilter === tab.id
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Activities List */}
        {loading ? (
          <div className="py-12 text-center text-xs text-slate-400">
            <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <span>Loading user activity records...</span>
          </div>
        ) : activities.length === 0 ? (
          <div className="py-12 text-center rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-dashed border-slate-200 dark:border-slate-700 text-xs text-slate-400 space-y-1">
            <p className="font-semibold text-slate-600 dark:text-slate-300">No matching activities found.</p>
            <p>Try modifying your search filter or perform actions across CareerLens to generate logs.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {activities.map((act) => (
              <div
                key={act.id}
                onClick={() => setSelectedActivity(act)}
                className="py-3.5 px-3 -mx-3 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors cursor-pointer group"
                title="Click to view detailed execution parameters and metadata"
              >
                <div className="flex items-start gap-3 min-w-0">
                  <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shrink-0 mt-0.5">
                    {getActivityIcon(act.event_type)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                      {act.description}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-400 font-mono">
                      <span>{getRelativeTime(act.created_at)}</span>
                      <span>&bull;</span>
                      <span className="uppercase">{act.event_type.replace(/_/g, ' ')}</span>
                      {act.entity_type && (
                        <>
                          <span>&bull;</span>
                          <span className="text-indigo-500 font-semibold">{act.entity_type}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedActivity(act);
                    }}
                    className="px-2.5 py-1 rounded-lg text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 transition-colors cursor-pointer"
                  >
                    View Details &rarr;
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800 text-xs">
            <span className="text-slate-500">
              Showing page <strong className="text-slate-800 dark:text-slate-200">{page}</strong> of <strong className="text-slate-800 dark:text-slate-200">{totalPages}</strong> ({totalCount} total)
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                title="Previous page"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                title="Next page"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Activity Details Modal */}
      <ActivityDetailsModal
        activity={selectedActivity}
        onClose={() => setSelectedActivity(null)}
        onNavigate={onNavigate}
      />
    </div>
  );
};
