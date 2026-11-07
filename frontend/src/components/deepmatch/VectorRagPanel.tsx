import React, { useState } from 'react';
import {
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Layers,
  ArrowRight,
  TrendingUp,
  Cpu,
  Zap,
  Info
} from 'lucide-react';
import { VectorRagMatchResponse } from '../../types';

interface VectorRagPanelProps {
  data: VectorRagMatchResponse;
  onTailorAction?: () => void;
}

export const VectorRagPanel: React.FC<VectorRagPanelProps> = ({
  data,
  onTailorAction
}) => {
  const [filterMode, setFilterMode] = useState<'all' | 'high' | 'gaps'>('all');

  const displayedChunks = data.aligned_chunks.filter((c) => {
    if (filterMode === 'high') return c.cosine_similarity >= 70;
    return true;
  });

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Mathematical Vector RAG Model Banner */}
      <div className="p-5 rounded-3xl bg-gradient-to-r from-indigo-900 via-slate-900 to-purple-950 border border-indigo-800/80 text-white shadow-xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 text-[10px] font-black uppercase tracking-wider border border-indigo-400/30">
              <Cpu className="w-3.5 h-3.5" />
              <span>Pillar 1 • 256-D Semantic Vector RAG</span>
            </div>
            <h3 className="text-xl sm:text-2xl font-black tracking-tight">
              Dense Vector Embeddings &amp; Cross-Encoder Alignment
            </h3>
            <p className="text-xs text-indigo-200/80 max-w-2xl leading-relaxed">
              Evaluating semantic alignment between candidate accomplishment chunks and job requirement vectors using normalized cosine similarity:
            </p>
            {/* KaTeX / Math Formula Representation */}
            <div className="inline-block mt-1 px-3 py-1.5 rounded-xl bg-black/40 border border-white/10 font-mono text-xs text-indigo-300">
              SemanticMatch(R, J) = (v_R · v_J) / (||v_R|| · ||v_J||)
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0 self-start md:self-auto">
            {onTailorAction && (
              <button
                type="button"
                onClick={onTailorAction}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white transition-all shadow-md cursor-pointer active:scale-95"
              >
                <Zap className="w-4 h-4 text-amber-300" />
                <span>Auto-Tailor Resume</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 3 Metric Scorecards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Card 1: Overall Hybrid */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400">
            <span>Overall Hybrid Score</span>
            <Sparkles className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-indigo-600 dark:text-indigo-400">
              {data.overall_hybrid_score}
            </span>
            <span className="text-xs text-slate-400 font-bold">/100 Composite</span>
          </div>
          <p className="text-[11px] text-slate-500 leading-tight">
            50% Vector Cosine + 30% Keyword Overlap + 20% Requirement Coverage
          </p>
        </div>

        {/* Card 2: Semantic Vector Score */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400">
            <span>Dense Vector Cosine Match</span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-emerald-600 dark:text-emerald-400">
              {data.semantic_vector_score}%
            </span>
            <span className="text-xs text-slate-400 font-bold">Cosine Angle</span>
          </div>
          <p className="text-[11px] text-slate-500 leading-tight">
            Matches technical meaning even when wording or acronyms differ
          </p>
        </div>

        {/* Card 3: Keyword BM25 Overlap */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400">
            <span>Lexical Keyword Overlap</span>
            <Layers className="w-4 h-4 text-purple-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-purple-600 dark:text-purple-400">
              {data.keyword_overlap_score}%
            </span>
            <span className="text-xs text-slate-400 font-bold">Exact Terminology</span>
          </div>
          <p className="text-[11px] text-slate-500 leading-tight">
            Explicit unigram overlap with required technical terminology
          </p>
        </div>
      </div>

      {/* Semantic Insights Callouts */}
      {data.concept_alignment_insights.length > 0 && (
        <div className="p-4 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-indigo-900 dark:text-indigo-300">
            <Info className="w-4 h-4 text-indigo-600" />
            <span>Algorithmic Synergy &amp; Alignment Insights</span>
          </div>
          <div className="space-y-1.5 text-xs text-indigo-950 dark:text-indigo-200 pl-6">
            {data.concept_alignment_insights.map((insight, idx) => (
              <p key={idx}>{insight}</p>
            ))}
          </div>
        </div>
      )}

      {/* Chunk Alignment Table Controls */}
      <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <Cpu className="w-4 h-4 text-indigo-600" />
              <span>Semantic Chunk Alignment Matrix</span>
            </h4>
            <p className="text-xs text-slate-500 mt-0.5">
              Side-by-side verification showing how each job requirement maps to candidate accomplishments
            </p>
          </div>

          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs">
            <button
              type="button"
              onClick={() => setFilterMode('all')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                filterMode === 'all'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              All Matches ({data.aligned_chunks.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterMode('high')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                filterMode === 'high'
                  ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              High Alignment (&ge;70%)
            </button>
            <button
              type="button"
              onClick={() => setFilterMode('gaps')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                filterMode === 'gaps'
                  ? 'bg-white dark:bg-slate-900 text-rose-600 dark:text-rose-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Identified Gaps ({data.semantic_gaps.length})
            </button>
          </div>
        </div>

        {/* Chunks List */}
        {filterMode !== 'gaps' ? (
          <div className="space-y-3">
            {displayedChunks.map((chunk, i) => (
              <div
                key={i}
                className="p-4 rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/60 space-y-2.5"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-indigo-500 shrink-0" />
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      Target Requirement #{i + 1}
                    </span>
                    {chunk.is_required && (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900">
                        Must Have
                      </span>
                    )}
                  </div>

                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-black ${
                      chunk.cosine_similarity >= 75
                        ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                        : 'bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300'
                    }`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>{chunk.cosine_similarity}% Cosine Similarity</span>
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs pt-1">
                  {/* Left: Job posting requirement */}
                  <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1">
                    <p className="text-[10px] uppercase font-bold text-slate-400">Job Requirement Chunk</p>
                    <p className="text-slate-800 dark:text-slate-200 font-medium leading-relaxed">
                      {chunk.requirement}
                    </p>
                  </div>

                  {/* Right: Candidate accomplishment match */}
                  <div className="p-3 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-800/60 space-y-1">
                    <div className="flex items-center justify-between text-[10px] font-bold text-emerald-800 dark:text-emerald-300">
                      <span>Verified Resume Accomplishment</span>
                      <span className="uppercase text-[9px] px-1.5 py-0.2 rounded bg-emerald-100 dark:bg-emerald-900">
                        {chunk.section}
                      </span>
                    </div>
                    <p className="text-slate-800 dark:text-slate-200 font-medium leading-relaxed">
                      {chunk.matching_accomplishment}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Semantic Gaps View */
          <div className="space-y-3">
            {data.semantic_gaps.map((gap, i) => (
              <div
                key={i}
                className="p-4 rounded-2xl bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200/80 dark:border-rose-900/60 space-y-2.5"
              >
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
                    <span className="font-bold text-rose-900 dark:text-rose-300">
                      Unaddressed Requirement
                    </span>
                  </div>
                  <span className="text-[11px] font-bold text-slate-400">
                    Closest: {gap.closest_similarity}% Similarity
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-rose-100 dark:border-rose-950/80 text-xs">
                  <p className="text-[10px] uppercase font-bold text-slate-400">Target Requirement</p>
                  <p className="text-slate-800 dark:text-slate-200 font-medium mt-0.5">
                    {gap.requirement}
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800 text-xs flex items-start gap-2">
                  <ArrowRight className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-indigo-900 dark:text-indigo-200">Recommended Rewrite Action: </span>
                    <span className="text-indigo-800 dark:text-indigo-300">{gap.actionable_bridge}</span>
                  </div>
                </div>
              </div>
            ))}

            {data.semantic_gaps.length === 0 && (
              <div className="p-8 text-center rounded-2xl bg-emerald-50 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-200 text-xs font-semibold">
                🎉 No semantic concept gaps found! 100% of stated job requirements have corroborating accomplishment vectors.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
