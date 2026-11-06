// src/components/deepmatch/RequirementsTable.tsx
import React, { useMemo, useState } from 'react';
import type { DeepReport, Status } from '../../types/deepMatch';

const STATUS_STYLE: Record<Status, string> = {
  met: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
  partial: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
  transferable: 'bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300',
  missing: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
  unclear: 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300',
};

export const RequirementsTable: React.FC<{ report: DeepReport }> = ({ report }) => {
  const [filter, setFilter] = useState<Status | 'all'>('all');
  const reqById = useMemo(
    () => new Map(report.job_profile.requirements.map((r) => [r.id, r])),
    [report],
  );
  const rows = report.analysis.assessments.filter((a) => filter === 'all' || a.status === filter);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {(['all', 'met', 'partial', 'transferable', 'missing', 'unclear'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1 rounded-full text-[11px] font-semibold border ${
              filter === f ? 'bg-blue-600 text-white border-blue-600' : 'border-slate-300 dark:border-slate-700'
            }`}
          >
            {f}
          </button>
        ))}
      </div>
      <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
        <table className="w-full text-xs">
          <thead className="bg-slate-50 dark:bg-slate-800/60 text-left">
            <tr>
              <th className="p-3">Requirement</th><th className="p-3">Status</th>
              <th className="p-3">Evidence from your resume</th><th className="p-3">How to improve</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((a) => {
              const r = reqById.get(a.requirement_id);
              return (
                <tr key={a.requirement_id} className="border-t border-slate-100 dark:border-slate-800 align-top">
                  <td className="p-3">
                    <div className="font-semibold">{r?.text}</div>
                    <div className="text-[10px] text-slate-400 uppercase">{r?.importance} · {r?.category.replace('_', ' ')}</div>
                  </td>
                  <td className="p-3">
                    <span className={`px-2 py-0.5 rounded-full font-semibold ${STATUS_STYLE[a.status]}`}>{a.status}</span>
                    <div className="text-[10px] text-slate-400 mt-1">{Math.round(a.confidence * 100)}% confident</div>
                  </td>
                  <td className="p-3 italic text-slate-600 dark:text-slate-400">
                    {a.evidence_quote ? `“${a.evidence_quote}”` : '—'}
                    {!a.verified && <div className="not-italic text-[10px] text-red-500">Evidence could not be verified</div>}
                  </td>
                  <td className="p-3">{a.how_to_improve || '—'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
