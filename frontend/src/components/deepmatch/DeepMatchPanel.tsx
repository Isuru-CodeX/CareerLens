// src/components/deepmatch/DeepMatchPanel.tsx - Enterprise-grade 8-tab Deep Match analytical dashboard
import React, { useState } from 'react';
import {
  Sparkles,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  Copy,
  Check,
  BookOpen,
  Briefcase,
  Clock,
  Target,
  ShieldAlert,
  Building2,
  MapPin,
  DollarSign,
  Award,
  Zap,
  Flame,
  ArrowRight
} from 'lucide-react';
import { ScoreGauge } from '../ScoreGauge';
import { RequirementsTable } from './RequirementsTable';
import { ScoreBreakdown } from './ScoreBreakdown';
import type { DeepReport } from '../../types/deepMatch';

const TABS = [
  'Overview',
  'Requirements',
  'Experience',
  'Keywords',
  'Tailor',
  'Roadmap',
  'Interview',
  'Job intel'
] as const;
type Tab = (typeof TABS)[number];

const card = 'p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs';

export const DeepMatchPanel: React.FC<{ report: DeepReport; onTailor?: () => void }> = ({
  report,
  onTailor
}) => {
  const [tab, setTab] = useState<Tab>('Overview');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedInterview, setExpandedInterview] = useState<number | null>(0);

  const a = report.analysis;
  const jp = report.job_profile;

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // High-level statistics
  const reqTotal = jp.requirements.length;
  const reqMet = a.assessments.filter((x) => x.status === 'met').length;

  const kwTotal = jp.ats_keywords.length;
  const kwGapsCount = a.keyword_gaps.length;
  const kwMatchedCount = Math.max(0, kwTotal - kwGapsCount);

  const getVerdictBadge = (verdict: string) => {
    switch (verdict) {
      case 'strong_fit':
        return { label: 'Strong Fit', color: 'bg-emerald-500 text-white' };
      case 'good_fit':
        return { label: 'Good Fit', color: 'bg-blue-600 text-white' };
      case 'stretch':
        return { label: 'Stretch Role', color: 'bg-amber-500 text-white' };
      default:
        return { label: 'Significant Gap', color: 'bg-rose-500 text-white' };
    }
  };

  const verdictMeta = getVerdictBadge(report.score.verdict);

  return (
    <div className="space-y-6">
      {/* Top Spotlight Banner */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Score Radial Spotlight */}
        <div className={`${card} lg:col-span-4 flex flex-col items-center justify-center relative overflow-hidden`}>
          <div className="absolute top-4 right-4">
            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${verdictMeta.color}`}>
              {verdictMeta.label}
            </span>
          </div>

          <ScoreGauge
            score={report.score.overall}
            size={180}
            label="Deep Alignment Index"
            sublabel="Grounded AI & Heuristic Synthesis"
          />

          <div className="w-full mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 grid grid-cols-3 gap-2 text-center">
            <div>
              <span className="text-[10px] text-slate-400 font-medium block">Must-Haves</span>
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                {reqMet}/{reqTotal}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 font-medium block">Experience</span>
              <span className="text-xs font-bold text-blue-600 dark:text-blue-400">
                {report.candidate_years}y / {jp.min_years_experience ?? 3}y
              </span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 font-medium block">ATS Match</span>
              <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
                {kwTotal > 0 ? `${Math.round((kwMatchedCount / kwTotal) * 100)}%` : '100%'}
              </span>
            </div>
          </div>
        </div>

        {/* Executive Summary & AI Briefing */}
        <div className={`${card} lg:col-span-8 flex flex-col justify-between space-y-4`}>
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                      {jp.title || 'Target Role'}
                    </h3>
                    {jp.company && (
                      <span className="text-xs font-semibold px-2.5 py-0.5 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                        {jp.company}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {jp.location ? `${jp.location} · ` : ''}{jp.work_mode !== 'unspecified' ? `${jp.work_mode} · ` : ''}{jp.domain || 'Software Systems'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[11px] px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 font-semibold text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                  {report.engine === 'llm' ? `AI Powered · ${report.model}` : 'Deep Analytical Engine'}
                </span>
              </div>
            </div>

            <p className="text-xs leading-relaxed text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
              {a.executive_summary}
            </p>

            {/* Quick Warning Alerts */}
            {report.warnings.map((w) => (
              <div
                key={w}
                className="px-3.5 py-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 text-amber-900 dark:text-amber-200 text-xs flex items-center gap-2"
              >
                <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
                <span>{w}</span>
              </div>
            ))}
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>
                <b>Candidate Experience:</b> {report.candidate_years} yrs verified from resume dates
              </span>
            </div>

            {onTailor && (
              <button
                onClick={onTailor}
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold text-xs shadow-md transition-all flex items-center gap-2"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Tailor Resume with AI</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Modern Navigation Tabs with Badges */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
        {TABS.map((t) => {
          const isActive = tab === t;
          let badgeCount: string | number | null = null;
          if (t === 'Requirements') badgeCount = reqTotal;
          if (t === 'Keywords') badgeCount = `${kwMatchedCount}/${kwTotal}`;
          if (t === 'Tailor') badgeCount = a.bullet_rewrites.length;
          if (t === 'Roadmap') badgeCount = a.skill_roadmap.length;
          if (t === 'Interview') badgeCount = a.interview_prep.length;

          return (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
                isActive
                  ? 'bg-blue-600 text-white shadow-sm ring-2 ring-blue-600/20'
                  : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
              }`}
            >
              <span>{t}</span>
              {badgeCount !== null && (
                <span
                  className={`px-1.5 py-0.5 text-[10px] rounded-full font-bold ${
                    isActive
                      ? 'bg-blue-700 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {badgeCount}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab 1: Overview */}
      {tab === 'Overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* 6-Dimension Score Breakdown */}
            <div className={`${card} lg:col-span-7 space-y-4`}>
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                    6-Dimension Transparent Scoring Rubric
                  </h4>
                  <p className="text-xs text-slate-500">
                    Calculated by deterministic code algorithms — LLM only extracts and grounds evidence
                  </p>
                </div>
              </div>
              <ScoreBreakdown report={report} />
            </div>

            {/* Right Column: Fix These First + Quick Stats */}
            <div className="lg:col-span-5 space-y-6">
              {/* What-If Simulator Card */}
              <div className={`${card} space-y-3.5`}>
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600">
                    <Flame className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                      Highest-ROI Upgrades (What-If Simulator)
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      Potential score increase if verified evidence is added
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  {report.what_if.length === 0 ? (
                    <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 text-xs text-slate-400 text-center">
                      No high-priority gaps remaining!
                    </div>
                  ) : (
                    report.what_if.map((w, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/50 flex items-center justify-between text-xs"
                      >
                        <div className="space-y-0.5">
                          <span className="font-semibold text-slate-900 dark:text-white block">
                            {w.requirement}
                          </span>
                          <span className="text-[10px] text-slate-400 uppercase font-medium">
                            {w.importance} · priority gap
                          </span>
                        </div>
                        <div className="flex items-center gap-1 font-bold text-emerald-600 dark:text-emerald-400 text-xs bg-emerald-50 dark:bg-emerald-950/60 px-2 py-1 rounded-lg border border-emerald-200 dark:border-emerald-800">
                          <TrendingUp className="w-3.5 h-3.5" />
                          <span>+{w.gain} pts</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Verified Highlights Card */}
              <div className={`${card} space-y-3`}>
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600">
                    <Award className="w-4 h-4" />
                  </div>
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                    Key Standout Strengths
                  </h4>
                </div>

                <div className="space-y-2">
                  {a.strengths.slice(0, 3).map((s, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-2xl bg-emerald-50/40 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 text-xs space-y-1"
                    >
                      <div className="font-bold text-emerald-900 dark:text-emerald-200 flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>{s.title}</span>
                      </div>
                      <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                        {s.detail}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Risks & Vulnerabilities Matrix */}
          {a.risks.length > 0 && (
            <div className={`${card} space-y-4`}>
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600">
                  <ShieldAlert className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                    Candidate Vulnerabilities &amp; Recruiter Risk Flags
                  </h4>
                  <p className="text-xs text-slate-500">
                    Potential screening concerns with clear mitigation advice
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {a.risks.map((r, idx) => {
                  const isHigh = r.severity === 'high';
                  return (
                    <div
                      key={idx}
                      className={`p-4 rounded-2xl border text-xs space-y-2 ${
                        isHigh
                          ? 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/40'
                          : 'bg-amber-50/50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/40'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className={`font-bold text-xs ${isHigh ? 'text-rose-900 dark:text-rose-200' : 'text-amber-900 dark:text-amber-200'}`}>
                          {r.title}
                        </span>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                            isHigh
                              ? 'bg-rose-200 dark:bg-rose-900 text-rose-800 dark:text-rose-200'
                              : 'bg-amber-200 dark:bg-amber-900 text-amber-800 dark:text-amber-200'
                          }`}
                        >
                          {r.severity}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-700 dark:text-slate-300">
                        {r.detail}
                      </p>
                      <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60 text-[11px]">
                        <span className="font-semibold text-slate-900 dark:text-white">Mitigation: </span>
                        <span className="text-slate-600 dark:text-slate-400">{r.mitigation}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Requirements */}
      {tab === 'Requirements' && <RequirementsTable report={report} />}

      {/* Tab 3: Experience */}
      {tab === 'Experience' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className={`${card} text-center space-y-2`}>
              <span className="text-xs text-slate-500 font-medium">Documented Total Experience</span>
              <div className="text-3xl font-extrabold text-blue-600 dark:text-blue-400">
                {report.candidate_years} <span className="text-sm font-semibold text-slate-400">years</span>
              </div>
              <p className="text-[11px] text-slate-400">Calculated from non-overlapping resume job dates</p>
            </div>

            <div className={`${card} text-center space-y-2`}>
              <span className="text-xs text-slate-500 font-medium">Relevant Domain Experience</span>
              <div className="text-3xl font-extrabold text-indigo-600 dark:text-indigo-400">
                {a.experience_fit.candidate_relevant_years ?? report.candidate_years} <span className="text-sm font-semibold text-slate-400">years</span>
              </div>
              <p className="text-[11px] text-slate-400">Directly applicable to this role architecture</p>
            </div>

            <div className={`${card} text-center space-y-2`}>
              <span className="text-xs text-slate-500 font-medium">Target Role Requirement</span>
              <div className="text-3xl font-extrabold text-slate-900 dark:text-white">
                {jp.min_years_experience ?? 3}+ <span className="text-sm font-semibold text-slate-400">years</span>
              </div>
              <p className="text-[11px] text-slate-400">Expected for {jp.seniority} seniority tier</p>
            </div>
          </div>

          <div className={`${card} space-y-4`}>
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600">
                <Briefcase className="w-4 h-4" />
              </div>
              <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                Seniority Signal &amp; Career Trajectory
              </h4>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 text-xs space-y-2">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-700 dark:text-slate-300">Seniority Alignment:</span>
                <span className="px-2.5 py-0.5 rounded-full font-bold uppercase text-[10px] bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-300">
                  {a.experience_fit.seniority_signal}
                </span>
              </div>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                {a.experience_fit.reasoning}
              </p>
            </div>

            {a.experience_fit.career_gaps.length > 0 && (
              <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 text-xs space-y-1">
                <span className="font-bold text-amber-900 dark:text-amber-200">Timeline Notice:</span>
                {a.experience_fit.career_gaps.map((g, idx) => (
                  <p key={idx} className="text-amber-800 dark:text-amber-300">
                    • {g}
                  </p>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 4: Keywords */}
      {tab === 'Keywords' && (
        <div className="space-y-6">
          <div className={`${card} space-y-4`}>
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                  ATS Keywords Scanner
                </h4>
                <p className="text-xs text-slate-500">
                  Exact keywords extracted from job posting vs detected in your resume
                </p>
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                {kwMatchedCount} of {kwTotal} keywords detected ({Math.round((kwMatchedCount / Math.max(1, kwTotal)) * 100)}%)
              </span>
            </div>

            <div className="flex flex-wrap gap-2 pt-2">
              {jp.ats_keywords.map((kw) => {
                const isMissing = a.keyword_gaps.some((g) => g.keyword.toLowerCase() === kw.toLowerCase());
                return (
                  <span
                    key={kw}
                    className={`px-3 py-1 rounded-xl text-xs font-semibold flex items-center gap-1.5 border ${
                      isMissing
                        ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800'
                        : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                    }`}
                  >
                    {isMissing ? <AlertCircle className="w-3 h-3 text-rose-500" /> : <CheckCircle2 className="w-3 h-3 text-emerald-500" />}
                    <span>{kw}</span>
                  </span>
                );
              })}
            </div>
          </div>

          {/* Missing Keywords Placement Guidance */}
          {a.keyword_gaps.length > 0 && (
            <div className={`${card} space-y-4`}>
              <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                Missing Keyword Placement Blueprint
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {a.keyword_gaps.map((g, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60 text-xs space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-rose-600 dark:text-rose-400 text-xs">
                        {g.keyword}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                        {g.where_to_add}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400">
                      {g.truthful_note}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 5: Tailor */}
      {tab === 'Tailor' && (
        <div className="space-y-6">
          {/* Summary Suggestion */}
          {a.summary_suggestion && (
            <div className={`${card} space-y-3`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600">
                    <Target className="w-4 h-4" />
                  </div>
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                    Tailored Professional Summary
                  </h4>
                </div>
                <button
                  onClick={() => copyToClipboard(a.summary_suggestion!, 'summary')}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold flex items-center gap-1.5 transition-all"
                >
                  {copiedId === 'summary' ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-slate-500" />
                      <span>Copy Summary</span>
                    </>
                  )}
                </button>
              </div>

              <p className="text-xs leading-relaxed text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                {a.summary_suggestion}
              </p>
            </div>
          )}

          {/* Bullet Rewrites */}
          <div className="space-y-4">
            <h4 className="font-bold text-sm text-slate-900 dark:text-white">
              High-Impact Bullet Point Rewrites (STAR Method)
            </h4>

            {a.bullet_rewrites.map((b, idx) => (
              <div key={idx} className={`${card} space-y-3`}>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Bullet Rewrite #{idx + 1}
                  </span>
                  <button
                    onClick={() => copyToClipboard(b.improved, `bullet_${idx}`)}
                    className="px-3 py-1 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold flex items-center gap-1.5 transition-all"
                  >
                    {copiedId === `bullet_${idx}` ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-600" />
                        <span>Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3 text-slate-500" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Before vs After */}
                <div className="space-y-2 text-xs">
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/30 border border-slate-200/50 dark:border-slate-700/50">
                    <span className="text-[10px] font-bold text-slate-400 block mb-0.5">ORIGINAL:</span>
                    <p className="text-slate-500 line-through">{b.original}</p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-blue-50/40 dark:bg-blue-950/20 border border-blue-200/60 dark:border-blue-900/40">
                    <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 block mb-0.5">
                      IMPROVED (STAR FORMAT):
                    </span>
                    <p className="font-semibold text-slate-900 dark:text-white">{b.improved}</p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500">
                  <span className="italic">Why stronger: {b.why}</span>
                  {b.needs_user_input.length > 0 && (
                    <span className="text-amber-600 dark:text-amber-400 font-medium">
                      Fill before using: {b.needs_user_input.join('; ')}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 6: Roadmap */}
      {tab === 'Roadmap' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {a.skill_roadmap.map((r, idx) => (
              <div key={idx} className={`${card} space-y-3.5 flex flex-col justify-between`}>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600">
                        <BookOpen className="w-4 h-4" />
                      </div>
                      <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                        {r.skill}
                      </h4>
                    </div>
                    <span
                      className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase ${
                        r.priority === 'high'
                          ? 'bg-rose-100 dark:bg-rose-900/60 text-rose-700 dark:text-rose-300'
                          : 'bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300'
                      }`}
                    >
                      {r.priority} · ~{r.est_weeks} Wks
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60 text-xs">
                    <span className="font-bold text-slate-900 dark:text-white block mb-1">
                      Proof Project:
                    </span>
                    <p className="text-slate-600 dark:text-slate-400">{r.proof_project}</p>
                  </div>

                  <div className="text-xs space-y-1">
                    <span className="font-bold text-slate-700 dark:text-slate-300 block">
                      Recommended Learning Tracks:
                    </span>
                    <ul className="space-y-1 text-[11px] text-slate-500 list-disc pl-4">
                      {r.resources.map((res, i) => (
                        <li key={i}>{res}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 7: Interview */}
      {tab === 'Interview' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                Predictive Interview Prep &amp; STAR Talking Points
              </h4>
              <p className="text-xs text-slate-500">
                Customized technical and behavioral questions formulated from your match gaps
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {a.interview_prep.map((item, idx) => {
              const isExpanded = expandedInterview === idx;
              return (
                <div
                  key={idx}
                  className={`rounded-2xl border transition-all ${
                    isExpanded
                      ? 'bg-white dark:bg-slate-900 border-blue-200 dark:border-blue-800 shadow-xs'
                      : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800'
                  }`}
                >
                  <button
                    onClick={() => setExpandedInterview(isExpanded ? null : idx)}
                    className="w-full text-left p-4 focus:outline-hidden flex items-start justify-between gap-4"
                  >
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 shrink-0 mt-0.5">
                        <Zap className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider block">
                          Question #{idx + 1}
                        </span>
                        <h5 className="font-bold text-xs text-slate-900 dark:text-white mt-0.5">
                          {item.question}
                        </h5>
                      </div>
                    </div>
                    <span className="text-xs text-blue-600 font-semibold shrink-0">
                      {isExpanded ? 'Hide' : 'Reveal Strategy'}
                    </span>
                  </button>

                  {isExpanded && (
                    <div className="px-4 pb-4 pt-1 border-t border-slate-100 dark:border-slate-800 text-xs space-y-3">
                      <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 text-slate-600 dark:text-slate-400 text-[11px]">
                        <span className="font-bold text-slate-900 dark:text-white">Why Interviewers Ask: </span>
                        {item.why_asked}
                      </div>

                      <div className="space-y-1.5">
                        <span className="font-bold text-slate-900 dark:text-white text-xs block">
                          Key Talking Points to Emphasize:
                        </span>
                        <div className="space-y-1">
                          {item.talking_points.map((tp, i) => (
                            <div
                              key={i}
                              className="p-2.5 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40 text-[11px] text-slate-700 dark:text-slate-300 flex items-start gap-2"
                            >
                              <ArrowRight className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                              <span>{tp}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tab 8: Job Intel */}
      {tab === 'Job intel' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className={`${card} space-y-1`}>
              <span className="text-[10px] text-slate-400 uppercase font-bold flex items-center gap-1">
                <Briefcase className="w-3 h-3" /> Seniority Tier
              </span>
              <p className="font-bold text-sm text-slate-900 dark:text-white capitalize">
                {jp.seniority}
              </p>
            </div>

            <div className={`${card} space-y-1`}>
              <span className="text-[10px] text-slate-400 uppercase font-bold flex items-center gap-1">
                <MapPin className="w-3 h-3" /> Work Mode
              </span>
              <p className="font-bold text-sm text-slate-900 dark:text-white capitalize">
                {jp.work_mode}
              </p>
            </div>

            <div className={`${card} space-y-1`}>
              <span className="text-[10px] text-slate-400 uppercase font-bold flex items-center gap-1">
                <Building2 className="w-3 h-3" /> Industry Domain
              </span>
              <p className="font-bold text-sm text-slate-900 dark:text-white line-clamp-1">
                {jp.domain ?? 'Software Systems'}
              </p>
            </div>

            <div className={`${card} space-y-1`}>
              <span className="text-[10px] text-slate-400 uppercase font-bold flex items-center gap-1">
                <DollarSign className="w-3 h-3" /> Stated Pay
              </span>
              <p className="font-bold text-sm text-slate-900 dark:text-white">
                {jp.salary_text ?? 'Not stated in post'}
              </p>
            </div>
          </div>

          <div className={`${card} space-y-4`}>
            <h4 className="font-bold text-sm text-slate-900 dark:text-white">
              Extracted Tech Stack &amp; Infrastructure
            </h4>
            <div className="flex flex-wrap gap-2">
              {jp.tech_stack.length > 0 ? (
                jp.tech_stack.map((tech) => (
                  <span
                    key={tech}
                    className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-semibold text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700"
                  >
                    {tech}
                  </span>
                ))
              ) : (
                <span className="text-xs text-slate-400">No explicit tech stack declared.</span>
              )}
            </div>
          </div>

          {jp.responsibilities && jp.responsibilities.length > 0 && (
            <div className={`${card} space-y-3`}>
              <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                Core Role Responsibilities
              </h4>
              <div className="space-y-2">
                {jp.responsibilities.map((resp, i) => (
                  <div
                    key={i}
                    className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 text-xs text-slate-700 dark:text-slate-300 flex items-start gap-2"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
                    <span>{resp}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {jp.culture_signals.length > 0 && (
            <div className={`${card} space-y-3`}>
              <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                Team Culture &amp; Workstyle Clues
              </h4>
              <div className="flex flex-wrap gap-2">
                {jp.culture_signals.map((sig, i) => (
                  <span
                    key={i}
                    className="px-3 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 text-xs font-medium border border-blue-100 dark:border-blue-900"
                  >
                    {sig}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
