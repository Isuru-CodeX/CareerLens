import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  FileText,
  Target,
  Sparkles,
  Briefcase,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  TrendingUp,
  AlertCircle,
  Lightbulb,
  Plus
} from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from 'recharts';
import { DashboardData } from '../types';
import { api } from '../services/api';
import { ScoreGauge } from '../components/ScoreGauge';
import { DisclaimerBanner } from '../components/DisclaimerBanner';

interface DashboardViewProps {
  onNavigate: (view: string, extra?: any) => void;
  onOpenUpload: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  onNavigate,
  onOpenUpload
}) => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const res = await api.getDashboard();
      setData(res);
    } catch (err: any) {
      setError(err.message || 'Failed to load dashboard.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  const handleToggleReminder = async (remId: string) => {
    try {
      await api.toggleReminder(remId);
      fetchDashboard();
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse p-4 sm:p-6">
        <div className="h-10 bg-slate-200 dark:bg-slate-800 rounded-xl w-1/3" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
          ))}
        </div>
        <div className="h-64 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6 text-center">
        <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-3" />
        <h3 className="text-lg font-bold text-slate-900 dark:text-white">Sign In to View Your Dashboard</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
          Sign in or explore our instant Demo Account to see real-time resume audits, job matches, and pipeline metrics.
        </p>
        <button
          onClick={() => onNavigate('resumes')}
          className="mt-4 px-4 py-2 rounded-xl bg-blue-600 text-white font-semibold text-xs shadow-md"
        >
          Explore Resumes
        </button>
      </div>
    );
  }

  // Prepare chart data
  const chartData = [
    { stage: 'Interested', count: data.application_stats.by_stage['interested'] || 0, color: '#94a3b8' },
    { stage: 'Applied', count: data.application_stats.by_stage['applied'] || 0, color: '#3b82f6' },
    { stage: 'Assessment', count: data.application_stats.by_stage['assessment'] || 0, color: '#8b5cf6' },
    { stage: 'Interview', count: data.application_stats.by_stage['interview'] || 0, color: '#f59e0b' },
    { stage: 'Offer', count: data.application_stats.by_stage['offer'] || 0, color: '#10b981' }
  ];

  const latestAnalysis = data.recent_analyses[0];
  const overallAvgScore = latestAnalysis ? latestAnalysis.overall_score : 84;

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Disclaimer */}
      <DisclaimerBanner compact />

      {/* Top Welcome Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-3xl bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-700 text-white shadow-xl shadow-blue-500/10 relative overflow-hidden">
        <div className="relative z-10 space-y-1">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/20 text-white text-[11px] font-semibold backdrop-blur-xs">
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI Career Intelligence Hub</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Welcome back, {data.user.full_name || 'Candidate'}
          </h1>
          <p className="text-blue-100 text-xs sm:text-sm max-w-xl">
            Track your career velocity, optimize resume alignment with evidence-preserving AI rewrites, and stay ahead of upcoming interview rounds.
          </p>
        </div>

        <div className="relative z-10 flex flex-wrap items-center gap-2">
          <button
            onClick={onOpenUpload}
            className="px-4 py-2.5 rounded-xl bg-white text-blue-700 font-bold text-xs shadow-md hover:bg-blue-50 transition-all flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>Upload Resume</span>
          </button>
          <button
            onClick={() => onNavigate('matches')}
            className="px-4 py-2.5 rounded-xl bg-blue-800/80 hover:bg-blue-800 text-white font-bold text-xs border border-white/20 transition-all flex items-center gap-2"
          >
            <Target className="w-4 h-4" />
            <span>Match Job Description</span>
          </button>
        </div>

        {/* Decorative background shapes */}
        <div className="absolute -right-10 -bottom-10 w-60 h-60 bg-emerald-400/20 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* 4 Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Resumes */}
        <motion.div
          whileHover={{ y: -2 }}
          className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Resume Versions</span>
            <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-slate-900 dark:text-white">{data.resumes_count}</span>
            <span className="text-[11px] text-slate-400">Target roles labeled</span>
          </div>
          <button
            onClick={() => onNavigate('resumes')}
            className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
          >
            <span>Manage library</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </motion.div>

        {/* Card 2: Health Score */}
        <motion.div
          whileHover={{ y: -2 }}
          className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Resume Health Index</span>
            <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">
              {Math.round(overallAvgScore)}
              <span className="text-sm font-normal text-slate-400">/100</span>
            </span>
            <span className="text-[11px] text-emerald-600 font-medium">Quantified Quality</span>
          </div>
          <button
            onClick={() => onNavigate('resumes')}
            className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
          >
            <span>View audit breakdown</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </motion.div>

        {/* Card 3: Active Pipeline */}
        <motion.div
          whileHover={{ y: -2 }}
          className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Applications Tracked</span>
            <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
              <Briefcase className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-slate-900 dark:text-white">
              {data.application_stats.total_applications}
            </span>
            <span className="text-[11px] text-slate-400">
              {data.application_stats.response_rate_percent}% response rate
            </span>
          </div>
          <button
            onClick={() => onNavigate('applications')}
            className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
          >
            <span>Open pipeline kanban</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </motion.div>

        {/* Card 4: Interviews & Offers */}
        <motion.div
          whileHover={{ y: -2 }}
          className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Active Interviews</span>
            <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-amber-600 dark:text-amber-400">
              {data.application_stats.active_interviews}
            </span>
            <span className="text-[11px] text-slate-400">
              {data.application_stats.offers} written offer{data.application_stats.offers !== 1 ? 's' : ''}
            </span>
          </div>
          <button
            onClick={() => onNavigate('ai', { tab: 'interview' })}
            className="text-xs font-semibold text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1"
          >
            <span>Practice Q&A questions</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </motion.div>
      </div>

      {/* Main Grid: Pipeline Chart + Score Spotlight */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pipeline Chart */}
        <div className="lg:col-span-2 p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Application Pipeline Funnel
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Conversion stages across your active job search
              </p>
            </div>
            <button
              onClick={() => onNavigate('applications')}
              className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
            >
              View Kanban
            </button>
          </div>

          <div className="h-60 w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="stage" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    border: '1px solid #1e293b',
                    borderRadius: '12px',
                    color: '#fff',
                    fontSize: '12px'
                  }}
                  cursor={{ fill: 'rgba(59, 130, 246, 0.05)' }}
                />
                <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Quality Audit Gauge */}
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Primary Resume Audit
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Heuristic quality index for {data.recent_resumes[0]?.title || 'Uploaded Resume'}
            </p>
          </div>

          <div className="my-2">
            <ScoreGauge score={overallAvgScore} size={150} sublabel="Heuristic Quality Score" />
          </div>

          <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400">
            <div className="flex justify-between">
              <span>Measurable Impact:</span>
              <span className="font-semibold text-slate-900 dark:text-white">
                {latestAnalysis ? `${latestAnalysis.impact_score}/100` : '85/100'}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Section Architecture:</span>
              <span className="font-semibold text-slate-900 dark:text-white">
                {latestAnalysis ? `${latestAnalysis.structure_score}/100` : '90/100'}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Readability & Voice:</span>
              <span className="font-semibold text-slate-900 dark:text-white">
                {latestAnalysis ? `${latestAnalysis.readability_score}/100` : '88/100'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Secondary Grid: Skill Roadmap & Reminders */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recommended Skills */}
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600">
              <Lightbulb className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Recommended Skills to Learn
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Identified from missing qualifications across your target role matches
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {data.skill_recommendations.map((rec, i) => (
              <div
                key={i}
                className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60 flex items-start justify-between gap-3"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-slate-900 dark:text-white">{rec.skill}</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                      {rec.priority}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{rec.reason}</p>
                  <p className="text-[11px] text-blue-600 dark:text-blue-400 font-medium">
                    Roadmap: {rec.learning_resource}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Upcoming Reminders */}
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  Interview Reminders & Actions
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Stay on top of upcoming screens and follow-up deadlines
                </p>
              </div>
            </div>
            <button
              onClick={() => onNavigate('applications')}
              className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
            >
              All applications
            </button>
          </div>

          {data.upcoming_reminders.length === 0 ? (
            <div className="p-8 text-center rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-dashed border-slate-200 dark:border-slate-700 text-xs text-slate-400">
              No pending reminders. Great job staying organized!
            </div>
          ) : (
            <div className="space-y-3">
              {data.upcoming_reminders.map((rem) => (
                <div
                  key={rem.id}
                  className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60 flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => handleToggleReminder(rem.id)}
                      className="text-slate-400 hover:text-emerald-600 transition-colors"
                      title="Mark as completed"
                    >
                      <CheckCircle2 className="w-5 h-5" />
                    </button>
                    <div>
                      <p className="font-semibold text-xs text-slate-900 dark:text-white">{rem.title}</p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        Due: {new Date(rem.due_date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
