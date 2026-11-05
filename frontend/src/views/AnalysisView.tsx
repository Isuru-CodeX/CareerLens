import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Sparkles,
  Download,
  AlertTriangle,
  CheckCircle,
  HelpCircle,
  TrendingUp,
  FileText,
  Target,
  ArrowRight,
  ShieldCheck,
  Zap,
  Info
} from 'lucide-react';
import { Resume, AnalysisRun } from '../types';
import { api } from '../services/api';
import { ScoreGauge } from '../components/ScoreGauge';
import { DisclaimerBanner } from '../components/DisclaimerBanner';

interface AnalysisViewProps {
  resumeId?: string;
  onNavigate: (view: string, extra?: any) => void;
}

export const AnalysisView: React.FC<AnalysisViewProps> = ({
  resumeId,
  onNavigate
}) => {
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [selectedResumeId, setSelectedResumeId] = useState<string>(resumeId || '');
  const [analysis, setAnalysis] = useState<AnalysisRun | null>(null);
  const [loading, setLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      try {
        const list = await api.getResumes();
        setResumes(list);
        if (!selectedResumeId && list.length > 0) {
          setSelectedResumeId(list[0].id);
        }
      } catch (err) {
        console.error(err);
      }
    };
    init();
  }, []);

  useEffect(() => {
    if (selectedResumeId) {
      loadAnalysis(selectedResumeId);
    }
  }, [selectedResumeId]);

  const loadAnalysis = async (id: string) => {
    try {
      setLoading(true);
      setError(null);
      const analyses = await api.getResumeAnalyses(id);
      if (analyses.length > 0) {
        setAnalysis(analyses[0]);
      } else {
        // Run analysis automatically if none exists yet
        runNewAnalysis(id);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load analysis.');
    } finally {
      setLoading(false);
    }
  };

  const runNewAnalysis = async (id: string) => {
    try {
      setIsGenerating(true);
      const res = await api.analyseResume(id);
      setAnalysis(res);
    } catch (err: any) {
      setError(err.message || 'Failed to execute resume analysis.');
    } finally {
      setIsGenerating(false);
    }
  };

  const selectedResume = resumes.find((r) => r.id === selectedResumeId);

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      <DisclaimerBanner />

      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Resume Quality Audit & Analysis
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Heuristic scoring, passive phrase detection, and impact metric quantification.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {resumes.length > 1 && (
            <select
              value={selectedResumeId}
              onChange={(e) => setSelectedResumeId(e.target.value)}
              className="px-3 py-2 text-xs font-semibold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            >
              {resumes.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.title}
                </option>
              ))}
            </select>
          )}

          <button
            onClick={() => selectedResumeId && runNewAnalysis(selectedResumeId)}
            disabled={isGenerating || !selectedResumeId}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-xs transition-colors flex items-center gap-1.5 disabled:opacity-50"
          >
            <Zap className="w-3.5 h-3.5" />
            <span>{isGenerating ? 'Analyzing...' : 'Re-run Audit'}</span>
          </button>

          {analysis && selectedResumeId && (
            <a
              href={api.getAnalysisPdfUrl(selectedResumeId, analysis.id)}
              target="_blank"
              rel="noreferrer"
              className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-xs transition-colors flex items-center gap-1.5 shadow-xs"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download PDF Report</span>
            </a>
          )}
        </div>
      </div>

      {loading || isGenerating ? (
        <div className="p-12 text-center rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
          <div className="w-12 h-12 rounded-full border-4 border-blue-600 border-t-transparent animate-spin mx-auto" />
          <h3 className="font-bold text-sm text-slate-900 dark:text-white">
            Running In-Depth Resume Audit...
          </h3>
          <p className="text-xs text-slate-400">
            Checking section structure, active voice ratio, quantifiable metrics, and tech stack breadth.
          </p>
        </div>
      ) : !analysis ? (
        <div className="p-12 text-center rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
          <FileText className="w-10 h-10 text-slate-400 mx-auto" />
          <h3 className="font-bold text-sm text-slate-900 dark:text-white">
            No resume selected for analysis
          </h3>
          <button
            onClick={() => onNavigate('resumes')}
            className="px-4 py-2 text-xs font-semibold rounded-xl bg-blue-600 text-white"
          >
            Choose from Library
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Top Score Matrix */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-1 p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col items-center justify-center">
              <ScoreGauge
                score={analysis.overall_score}
                size={160}
                label="Overall Quality Index"
                sublabel="Composite Heuristic Score"
              />
            </div>

            <div className="md:col-span-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Structure */}
              <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-2 flex flex-col justify-between">
                <div>
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    Structure & Layout
                  </span>
                  <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                    {Math.round(analysis.structure_score)}%
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Headers, contact details, dates, and bullet formats.
                  </p>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-blue-600 h-full rounded-full"
                    style={{ width: `${analysis.structure_score}%` }}
                  />
                </div>
              </div>

              {/* Readability */}
              <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-2 flex flex-col justify-between">
                <div>
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    Readability & Voice
                  </span>
                  <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                    {Math.round(analysis.readability_score)}%
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Sentence cadence, active voice, and clear typography.
                  </p>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-emerald-500 h-full rounded-full"
                    style={{ width: `${analysis.readability_score}%` }}
                  />
                </div>
              </div>

              {/* Impact */}
              <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-2 flex flex-col justify-between">
                <div>
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    Measurable Impact
                  </span>
                  <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                    {Math.round(analysis.impact_score)}%
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Numbers, metrics, percentages, and KPIs documented.
                  </p>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-indigo-500 h-full rounded-full"
                    style={{ width: `${analysis.impact_score}%` }}
                  />
                </div>
              </div>

              {/* Skills Breadth */}
              <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-2 flex flex-col justify-between">
                <div>
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    Skills Breadth
                  </span>
                  <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                    {Math.round(analysis.skills_score)}%
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Coverage of recognized tech and domain keywords.
                  </p>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-purple-500 h-full rounded-full"
                    style={{ width: `${analysis.skills_score}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Strengths & Weaknesses Split */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Strengths */}
            <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600">
                  <CheckCircle className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                  Identified Document Strengths
                </h3>
              </div>

              <div className="space-y-2">
                {analysis.strengths.map((str, i) => (
                  <div
                    key={i}
                    className="p-3 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40 text-xs text-emerald-900 dark:text-emerald-200 flex items-start gap-2.5"
                  >
                    <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>{str}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Focus Areas */}
            <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                  High-Priority Improvement Areas
                </h3>
              </div>

              <div className="space-y-2">
                {analysis.weaknesses.map((w, i) => (
                  <div
                    key={i}
                    className="p-3 rounded-2xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/40 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2.5"
                  >
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <span>{w}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Vague Phrase Inspector */}
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-red-50 dark:bg-red-950/60 text-red-600">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900 dark:text-white">
                    Vague Phrase Detector & Stronger Action Alternatives
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Replace passive responsibility statements with high-impact, truthful action verbs
                  </p>
                </div>
              </div>
              <button
                onClick={() => onNavigate('ai', { tab: 'rewrite' })}
                className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
              >
                <span>AI Rewriter Tool</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {analysis.vague_phrases.length === 0 ? (
              <div className="p-6 rounded-2xl bg-emerald-50/40 dark:bg-emerald-950/20 border border-emerald-200 text-center text-xs text-emerald-700 dark:text-emerald-300">
                Excellent! No passive or overused cliches detected. Your phrasing demonstrates active ownership.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {analysis.vague_phrases.map((vp, i) => (
                  <div
                    key={i}
                    className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 space-y-2.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="px-2 py-0.5 rounded-md bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300 font-bold text-xs font-mono">
                        "{vp.phrase}"
                      </span>
                      <span className="text-[10px] text-slate-400">Context detected</span>
                    </div>

                    <p className="text-xs text-slate-600 dark:text-slate-300 italic bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200/60 dark:border-slate-800">
                      {vp.context}
                    </p>

                    <div className="text-xs space-y-1">
                      <div className="flex items-start gap-1.5 text-emerald-700 dark:text-emerald-300 font-semibold">
                        <span>High-impact alternative:</span>
                        <span className="underline">{vp.suggestion}</span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        {vp.reason}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Targeted Action Plan */}
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            <h3 className="font-bold text-base text-slate-900 dark:text-white">
              Targeted Action Checklist
            </h3>

            <div className="space-y-3">
              {analysis.recommendations.map((rec, i) => (
                <div
                  key={i}
                  className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60 flex items-start justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-slate-900 dark:text-white">{rec.title}</span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          rec.priority === 'high'
                            ? 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300'
                            : 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                        }`}
                      >
                        {rec.priority} Priority
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                      {rec.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
