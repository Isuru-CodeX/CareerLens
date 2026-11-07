import React, { useState } from 'react';
import {
  ShieldAlert,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  FileCheck,
  Building2,
  ArrowRight
} from 'lucide-react';
import { AtsStressTestResponse, AtsSystemScore } from '../../types';

interface AtsStressTestPanelProps {
  data: AtsStressTestResponse;
  onRefresh?: () => void;
}

export const AtsStressTestPanel: React.FC<AtsStressTestPanelProps> = ({
  data
}) => {
  const [activeSystem, setActiveSystem] = useState<'workday' | 'greenhouse' | 'taleo' | 'lever'>('workday');

  const systemData: AtsSystemScore = data.systems[activeSystem];

  const getRiskBadgeColor = (risk: string) => {
    if (risk.includes('PASS') || risk.includes('LOW')) {
      return 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800';
    }
    if (risk.includes('MODERATE')) {
      return 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800';
    }
    return 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-800';
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Composite Scorecard */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/80 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-lg font-black text-slate-900 dark:text-white">
                  4-Tier ATS Parser Stress-Test Matrix
                </h3>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${getRiskBadgeColor(data.overall_risk_rating)}`}>
                  {data.overall_risk_rating}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Stress-tested against real enterprise document parsers: Workday, Greenhouse, Taleo (Oracle), and Lever
              </p>
            </div>
          </div>

          <div className="flex items-baseline gap-2 self-start sm:self-auto">
            <span className="text-4xl font-black text-indigo-600 dark:text-indigo-400">
              {data.overall_ats_score}
            </span>
            <span className="text-xs text-slate-400 font-bold">/100 Parseability</span>
          </div>
        </div>

        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
          {data.summary}
        </p>

        {/* 4 Systems Tab Buttons */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2">
          {(['workday', 'greenhouse', 'taleo', 'lever'] as const).map((sysKey) => {
            const sys = data.systems[sysKey];
            const isSelected = activeSystem === sysKey;
            return (
              <button
                key={sysKey}
                type="button"
                onClick={() => setActiveSystem(sysKey)}
                className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? 'bg-indigo-50/80 dark:bg-indigo-950/80 border-indigo-500 shadow-sm'
                    : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-bold text-slate-900 dark:text-white capitalize">
                    {sys.ats_name}
                  </span>
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                      sys.score >= 80
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                        : sys.score >= 60
                        ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                        : 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                    }`}
                  >
                    {sys.status}
                  </span>
                </div>
                <div className="text-xl font-black text-slate-800 dark:text-slate-100">
                  {sys.score}<span className="text-xs text-slate-400 font-normal">/100</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected ATS Detail Card */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-indigo-600" />
            <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
              {systemData.ats_name} Parser Diagnostics
            </h4>
          </div>
          <span className="text-xs font-bold text-slate-500">
            {systemData.issues.length} Issues Flagged • {systemData.passed_checks.length} Passed
          </span>
        </div>

        {/* Flagged Issues */}
        {systemData.issues.length > 0 && (
          <div className="space-y-2.5">
            <h5 className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <span>Potential Parseability Dropouts &amp; Formatting Vulnerabilities</span>
            </h5>
            <div className="space-y-2">
              {systemData.issues.map((issue, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-2xl bg-rose-50/60 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/60 flex items-start gap-3 text-xs"
                >
                  <XCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    <span className="font-bold text-rose-900 dark:text-rose-200 uppercase text-[10px] tracking-wider">
                      [{issue.severity}] {issue.code}
                    </span>
                    <p className="text-rose-900 dark:text-rose-300 font-medium">
                      {issue.message}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Passed Checks */}
        {systemData.passed_checks.length > 0 && (
          <div className="space-y-2.5 pt-2">
            <h5 className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span>Verified System Compliance Specifications</span>
            </h5>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              {systemData.passed_checks.map((chk, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/60 flex items-center gap-2 text-slate-700 dark:text-slate-300"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>{chk}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Actionable Mitigation Checklist */}
      <div className="p-6 rounded-3xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800/80 shadow-xs space-y-4">
        <div className="flex items-center gap-2 text-indigo-900 dark:text-indigo-200 font-black text-sm uppercase tracking-wider">
          <FileCheck className="w-5 h-5 text-indigo-600" />
          <span>Priority ATS Mitigation Checklist (Action Steps)</span>
        </div>
        <p className="text-xs text-indigo-800 dark:text-indigo-300">
          Apply these structural optimizations to ensure maximum parsing fidelity when submitting to automated job portals:
        </p>

        <div className="space-y-2 text-xs text-slate-800 dark:text-slate-200">
          {data.actionable_mitigation_checklist.map((rec, i) => (
            <div
              key={i}
              className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-indigo-100 dark:border-indigo-900/60 flex items-start gap-2.5 shadow-xs"
            >
              <ArrowRight className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
              <span className="font-medium leading-relaxed">{rec}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
