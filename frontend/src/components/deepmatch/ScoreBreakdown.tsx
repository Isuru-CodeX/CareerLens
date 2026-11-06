// src/components/deepmatch/ScoreBreakdown.tsx
import React, { useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  AlertCircle,
  Lightbulb,
  ShieldAlert,
  Info
} from 'lucide-react';
import type { DeepReport, ScoreDimension } from '../../types/deepMatch';

export const ScoreBreakdown: React.FC<{ report: DeepReport }> = ({ report }) => {
  const [expandedKey, setExpandedKey] = useState<string | null>(null);

  const toggleExpand = (key: string) => {
    setExpandedKey((prev) => (prev === key ? null : key));
  };

  const getScoreColor = (score: number | null) => {
    if (score === null) return 'text-slate-400';
    if (score >= 80) return 'text-emerald-600 dark:text-emerald-400';
    if (score >= 65) return 'text-blue-600 dark:text-blue-400';
    if (score >= 45) return 'text-amber-600 dark:text-amber-400';
    return 'text-rose-600 dark:text-rose-400';
  };

  const getBarGradient = (score: number | null) => {
    if (score === null || score === 0) return 'bg-slate-300 dark:bg-slate-700';
    if (score >= 80) return 'bg-gradient-to-r from-emerald-500 to-teal-400';
    if (score >= 65) return 'bg-gradient-to-r from-blue-500 to-indigo-500';
    if (score >= 45) return 'bg-gradient-to-r from-amber-500 to-yellow-400';
    return 'bg-gradient-to-r from-rose-500 to-red-400';
  };

  const getStatusBadge = (status?: string, score?: number | null) => {
    const s = score ?? 0;
    if (status === 'exceptional' || s >= 80) {
      return (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
          Strong Fit
        </span>
      );
    }
    if (status === 'strong' || s >= 65) {
      return (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
          Solid Fit
        </span>
      );
    }
    if (status === 'moderate' || s >= 45) {
      return (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
          Partial Fit
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
        Needs Work
      </span>
    );
  };

  return (
    <div className="space-y-3.5">
      <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
          <Info className="w-3.5 h-3.5" />
          Click any dimension to inspect granular diagnostics &amp; advice
        </span>
        <button
          onClick={() => setExpandedKey(expandedKey ? null : 'all')}
          className="text-[11px] font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400"
        >
          {expandedKey ? 'Collapse' : 'Expand All'}
        </button>
      </div>

      {report.score.breakdown.map((d: ScoreDimension) => {
        const isExpanded = expandedKey === 'all' || expandedKey === d.key;
        const earned = d.earned_points ?? (d.score !== null ? Math.round(d.score * d.weight * 10) / 10 : 0);
        const maxPts = d.max_points ?? Math.round(d.weight * 100);

        return (
          <div
            key={d.key}
            className={`rounded-2xl border transition-all duration-200 ${
              isExpanded
                ? 'bg-slate-50/90 dark:bg-slate-800/60 border-blue-200 dark:border-blue-800 shadow-xs'
                : 'bg-white dark:bg-slate-900/60 border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
            }`}
          >
            {/* Header row */}
            <button
              onClick={() => toggleExpand(d.key)}
              className="w-full text-left p-3.5 focus:outline-hidden flex flex-col gap-2"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-xs text-slate-900 dark:text-white">
                    {d.label}
                  </span>
                  {getStatusBadge(d.status, d.score)}
                </div>

                <div className="flex items-center gap-2.5">
                  <div className="text-right">
                    <span className={`text-xs font-extrabold ${getScoreColor(d.score)}`}>
                      {d.score === null ? 'No Data' : `${d.score}/100`}
                    </span>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 block">
                      {earned} / {maxPts} pts (weight {Math.round(d.weight * 100)}%)
                    </span>
                  </div>
                  {isExpanded ? (
                    <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                  )}
                </div>
              </div>

              {/* Progress bar */}
              <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                <div
                  className={`h-full transition-all duration-500 rounded-full ${getBarGradient(d.score)}`}
                  style={{ width: `${Math.max(2, Math.min(100, d.score ?? 0))}%` }}
                />
              </div>
            </button>

            {/* Granular Details Accordion */}
            {isExpanded && (
              <div className="px-3.5 pb-3.5 pt-1 text-xs border-t border-slate-200/60 dark:border-slate-700/60 space-y-3">
                {d.summary && (
                  <p className="text-slate-700 dark:text-slate-300 text-xs leading-relaxed">
                    {d.summary}
                  </p>
                )}

                {/* Factors grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  {/* Positive factors */}
                  {d.positive_factors && d.positive_factors.length > 0 && (
                    <div className="p-2.5 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40">
                      <div className="flex items-center gap-1.5 font-bold text-[11px] text-emerald-800 dark:text-emerald-300 mb-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>Evidence Detected ({d.positive_factors.length})</span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {d.positive_factors.map((factor, idx) => (
                          <span
                            key={idx}
                            className="text-[10px] px-2 py-0.5 rounded-md bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-800 text-slate-800 dark:text-slate-200"
                          >
                            {factor}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Missing factors */}
                  {d.missing_factors && d.missing_factors.length > 0 && (
                    <div className="p-2.5 rounded-xl bg-rose-50/60 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/40">
                      <div className="flex items-center gap-1.5 font-bold text-[11px] text-rose-800 dark:text-rose-300 mb-1.5">
                        <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                        <span>Gaps or Unverified ({d.missing_factors.length})</span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {d.missing_factors.map((factor, idx) => (
                          <span
                            key={idx}
                            className="text-[10px] px-2 py-0.5 rounded-md bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-800 text-slate-800 dark:text-slate-200"
                          >
                            {factor}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Tactical Recommendation */}
                {d.recommendation && (
                  <div className="p-2.5 rounded-xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/40 flex items-start gap-2">
                    <Lightbulb className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                    <div className="text-[11px] text-slate-700 dark:text-slate-300 leading-snug">
                      <span className="font-bold text-blue-900 dark:text-blue-200">How to improve: </span>
                      {d.recommendation}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}

      {/* Applied Caps Warnings */}
      {report.score.caps_applied.map((c) => (
        <div
          key={c}
          className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 flex items-start gap-2 text-xs text-amber-900 dark:text-amber-200"
        >
          <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <span>{c}</span>
        </div>
      ))}
    </div>
  );
};
