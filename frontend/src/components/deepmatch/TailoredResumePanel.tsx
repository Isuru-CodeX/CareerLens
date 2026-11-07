import React, { useState } from 'react';
import {
  Sparkles,
  ShieldCheck,
  Copy,
  Check,
  TrendingUp,
  Tag,
  ArrowRight,
  FileText
} from 'lucide-react';
import { ResumeTailorResponse } from '../../types';

interface TailoredResumePanelProps {
  data: ResumeTailorResponse;
  onOpenBuilder?: () => void;
}

export const TailoredResumePanel: React.FC<TailoredResumePanelProps> = ({
  data,
  onOpenBuilder
}) => {
  const [copiedSummary, setCopiedSummary] = useState(false);
  const [copiedBulletIdx, setCopiedBulletIdx] = useState<number | null>(null);

  const handleCopySummary = () => {
    navigator.clipboard.writeText(data.tailored_summary);
    setCopiedSummary(true);
    setTimeout(() => setCopiedSummary(false), 2000);
  };

  const handleCopyBullet = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedBulletIdx(idx);
    setTimeout(() => setCopiedBulletIdx(null), 2000);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Banner with Strict Zero-Hallucination Policy */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-emerald-900 via-slate-900 to-indigo-950 border border-emerald-700/80 text-white shadow-xl space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Pillar 6 • Evidence-Preserving Adaptation</span>
            </span>
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 font-black text-xs border border-emerald-400/40">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>+{data.tailored_match_score_delta}% Target Match Velocity</span>
          </div>
        </div>

        <h3 className="text-xl sm:text-2xl font-black tracking-tight">
          Targeted Resume Adaptation for {data.tailored_title}
        </h3>
        <p className="text-xs text-emerald-200/90 leading-relaxed font-medium">
          {data.factuality_guarantee}
        </p>
      </div>

      {/* Elevated Job Keywords */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300">
          <Tag className="w-4 h-4 text-indigo-600" />
          <span>Elevated High-Priority Competencies (Evidenced in your background &amp; required by job)</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {data.elevated_keywords.map((kw, i) => (
            <span
              key={i}
              className="px-3 py-1 rounded-xl text-xs font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 flex items-center gap-1.5"
            >
              <Sparkles className="w-3 h-3 text-indigo-500" />
              <span>{kw}</span>
            </span>
          ))}
        </div>
      </div>

      {/* Tailored Executive Summary */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
            <FileText className="w-4 h-4 text-indigo-600" />
            <span>Tailored Executive Summary</span>
          </span>
          <button
            type="button"
            onClick={handleCopySummary}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold transition-all cursor-pointer"
          >
            {copiedSummary ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedSummary ? 'Copied!' : 'Copy Summary'}</span>
          </button>
        </div>
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/60 text-xs sm:text-sm text-slate-800 dark:text-slate-200 font-medium leading-relaxed">
          {data.tailored_summary}
        </div>
      </div>

      {/* Reordered High-Impact Accomplishment Bullets */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
              Re-Ordered Experience Accomplishments (Ranked by Vector Relevance)
            </h4>
            <p className="text-xs text-slate-500 mt-0.5">
              These verified bullets from your resume have been prioritized to match the employer's highest-weighted requirements
            </p>
          </div>
          {onOpenBuilder && (
            <button
              type="button"
              onClick={onOpenBuilder}
              className="hidden sm:inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition-all shadow-sm cursor-pointer"
            >
              <span>Open in Resume Builder</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="space-y-3">
          {data.reordered_accomplishments.map((bullet, idx) => (
            <div
              key={bullet.id || idx}
              className={`p-4 rounded-2xl border transition-all ${
                bullet.is_top_priority
                  ? 'bg-indigo-50/60 dark:bg-indigo-950/30 border-indigo-300 dark:border-indigo-800 shadow-xs'
                  : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs mb-2">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-[10px] font-black flex items-center justify-center shrink-0">
                    #{idx + 1}
                  </span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    {bullet.section} Accomplishment
                  </span>
                  {bullet.is_top_priority && (
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                      High-Priority Alignment
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-black text-indigo-600 dark:text-indigo-400">
                    {bullet.similarity_score}% Vector Sim
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopyBullet(bullet.text, idx)}
                    className="p-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 text-slate-600 dark:text-slate-300 transition-colors"
                    title="Copy bullet"
                  >
                    {copiedBulletIdx === idx ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <p className="text-xs sm:text-sm text-slate-800 dark:text-slate-200 font-medium leading-relaxed pl-7">
                • {bullet.text}
              </p>

              <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800/60 pl-7 text-[11px] text-slate-500 flex items-center gap-1.5">
                <ArrowRight className="w-3 h-3 text-indigo-500 shrink-0" />
                <span>Directly corroborates target requirement: <em>"{bullet.aligned_requirement}..."</em></span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

