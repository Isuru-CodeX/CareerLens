import React from 'react';
import { Info, ShieldCheck } from 'lucide-react';

interface DisclaimerBannerProps {
  compact?: boolean;
}

export const DisclaimerBanner: React.FC<DisclaimerBannerProps> = ({ compact = false }) => {
  return (
    <div className={`rounded-xl border border-blue-200 dark:border-blue-900/60 bg-blue-50/60 dark:bg-blue-950/20 text-blue-900 dark:text-blue-200 ${compact ? 'p-3 text-xs' : 'p-4 text-sm'} flex items-start gap-3 shadow-xs`}>
      <Info className={`${compact ? 'w-4 h-4 mt-0.5' : 'w-5 h-5 mt-0.5'} text-blue-600 dark:text-blue-400 shrink-0`} />
      <div className="space-y-1">
        <div className="font-semibold flex items-center gap-1.5">
          <span>Ethical AI & Guidance Disclaimer</span>
          <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
        </div>
        <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
          CareerLens AI scores represent heuristic alignment and document quality guidance for self-improvement. 
          We do not claim or guarantee official ATS employer rankings or hiring outcomes. All AI-suggested rewrites 
          should be verified for personal truthfulness before submitting to employers.
        </p>
      </div>
    </div>
  );
};
