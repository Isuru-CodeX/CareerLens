// src/components/deepmatch/AnalysisProgress.tsx - honest progress while the 15-40 s analysis runs
import React, { useEffect, useState } from 'react';

const STEPS = [
  'Reading the job post', 'Extracting requirements', 'Searching your resume for evidence',
  'Verifying every quote', 'Scoring', 'Writing your tailoring plan',
];

export const AnalysisProgress: React.FC<{ running: boolean }> = ({ running }) => {
  const [i, setI] = useState(0);
  const [prevRunning, setPrevRunning] = useState(running);

  if (running !== prevRunning) {
    setPrevRunning(running);
    if (!running) {
      setI(0);
    }
  }

  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => setI((x) => Math.min(x + 1, STEPS.length - 1)), 5000);
    return () => clearInterval(t);
  }, [running]);

  if (!running) return null;
  return (
    <ol className="space-y-1 text-xs">
      {STEPS.map((s, idx) => (
        <li key={s} className={idx <= i ? 'text-blue-600 font-semibold' : 'text-slate-400'}>
          {idx < i ? '✓' : idx === i ? '…' : '○'} {s}
        </li>
      ))}
    </ol>
  );
};
