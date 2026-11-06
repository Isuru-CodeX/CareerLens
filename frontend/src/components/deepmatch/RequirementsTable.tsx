// src/components/deepmatch/RequirementsTable.tsx
import React, { useMemo, useState } from 'react';
import { Search, CheckCircle2, AlertCircle, HelpCircle, XCircle } from 'lucide-react';
import type { DeepReport, Status } from '../../types/deepMatch';

const STATUS_STYLE: Record<Status, string> = {
  met: 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
  partial: 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800',
  transferable: 'bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-800',
  missing: 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800',
  unclear: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700',
};

const STATUS_ICONS: Record<Status, React.ReactNode> = {
  met: <CheckCircle2 className="w-3 h-3 text-emerald-500" />,
  partial: <HelpCircle className="w-3 h-3 text-amber-500" />,
  transferable: <CheckCircle2 className="w-3 h-3 text-sky-500" />,
  missing: <XCircle className="w-3 h-3 text-rose-500" />,
  unclear: <AlertCircle className="w-3 h-3 text-slate-400" />,
};

export const RequirementsTable: React.FC<{ report: DeepReport }> = ({ report }) => {
  const [filter, setFilter] = useState<Status | 'all'>('all');
  const [search, setSearch] = useState('');

  const reqById = useMemo(
    () => new Map(report.job_profile.requirements.map((r) => [r.id, r])),
    [report]
  );

  const rows = report.analysis.assessments.filter((a) => {
    if (filter !== 'all' && a.status !== filter) return false;
    if (search.trim()) {
      const r = reqById.get(a.requirement_id);
      const text = `${r?.text || ''} ${a.evidence_quote || ''} ${a.reasoning || ''}`.toLowerCase();
      if (!text.includes(search.toLowerCase())) return false;
    }
    return true;
  });

  return (
    <div className="space-y-4">
      {/* Controls Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Status Filters */}
        <div className="flex flex-wrap gap-1.5">
          {(['all', 'met', 'partial', 'transferable', 'missing'] as const).map((f) => {
            const count =
              f === 'all'
                ? report.analysis.assessments.length
                : report.analysis.assessments.filter((a) => a.status === f).length;
            const isActive = filter === f;

            return (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold capitalize transition-all flex items-center gap-1.5 border ${
                  isActive
                    ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:border-slate-300'
                }`}
              >
                <span>{f}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    isActive
                      ? 'bg-blue-700 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search Input */}
        <div className="relative min-w-[200px]">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search requirements..."
            className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-hidden"
          />
        </div>
      </div>

      {/* Table Container */}
      <div className="overflow-x-auto rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
        <table className="w-full text-xs">
          <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800 text-left">
            <tr>
              <th className="p-4 min-w-[220px]">Requirement &amp; Category</th>
              <th className="p-4 min-w-[130px]">Match Status</th>
              <th className="p-4 min-w-[260px]">Verbatim Resume Evidence</th>
              <th className="p-4 min-w-[240px]">Improvement Strategy</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={4} className="p-8 text-center text-slate-400 text-xs">
                  No matching requirements found for this filter.
                </td>
              </tr>
            ) : (
              rows.map((a) => {
                const r = reqById.get(a.requirement_id);
                return (
                  <tr
                    key={a.requirement_id}
                    className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors align-top"
                  >
                    <td className="p-4">
                      <div className="font-bold text-slate-900 dark:text-white leading-snug">
                        {r?.text}
                      </div>
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 uppercase font-semibold">
                          {r?.importance}
                        </span>
                        <span className="text-[10px] text-slate-400 capitalize">
                          {r?.category.replace('_', ' ')}
                        </span>
                      </div>
                    </td>

                    <td className="p-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold border capitalize ${STATUS_STYLE[a.status]}`}
                      >
                        {STATUS_ICONS[a.status]}
                        <span>{a.status}</span>
                      </span>
                      <span className="block text-[10px] text-slate-400 mt-1 font-medium">
                        {Math.round(a.confidence * 100)}% verified
                      </span>
                    </td>

                    <td className="p-4">
                      {a.evidence_quote ? (
                        <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/50 dark:border-slate-700/50 text-[11px] italic text-slate-700 dark:text-slate-300">
                          “{a.evidence_quote}”
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">No direct citation located</span>
                      )}
                      {!a.verified && (
                        <div className="text-[10px] text-rose-500 font-semibold mt-1">
                          ⚠ Unverified citation (downgraded)
                        </div>
                      )}
                    </td>

                    <td className="p-4 text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                      {a.how_to_improve || a.reasoning || '—'}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
