// src/components/deepmatch/ScoreBreakdown.tsx
import React from 'react';
import type { DeepReport } from '../../types/deepMatch';

export const ScoreBreakdown: React.FC<{ report: DeepReport }> = ({ report }) => (
  <div className="space-y-3">
    {report.score.breakdown.map((d) => (
      <div key={d.key}>
        <div className="flex justify-between text-xs">
          <span className="font-semibold">{d.label}</span>
          <span className="text-slate-500">
            {d.score === null ? 'no data' : `${d.score}/100`} · weight {Math.round(d.weight * 100)}%
          </span>
        </div>
        <div className="h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
          <div
            className={`h-full ${(d.score ?? 0) >= 70 ? 'bg-emerald-500' : (d.score ?? 0) >= 45 ? 'bg-amber-500' : 'bg-red-500'}`}
            style={{ width: `${d.score ?? 0}%` }}
          />
        </div>
      </div>
    ))}
    {report.score.caps_applied.map((c) => (
      <p key={c} className="text-[11px] text-amber-700 dark:text-amber-300">⚠ {c}</p>
    ))}
  </div>
);
