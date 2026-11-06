import React, { useState } from 'react';
import {
  X,
  Award,
  CheckCircle2,
  TrendingUp,
  Mic,
  Activity,
  Download,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Target,
  BarChart3
} from 'lucide-react';
import { InterviewScorecard, InterviewTurnRecord } from '../../types';

interface InterviewScorecardModalProps {
  scorecard: InterviewScorecard;
  roleTitle: string;
  company?: string;
  turns: InterviewTurnRecord[];
  onClose: () => void;
  onRestart: () => void;
}

export const InterviewScorecardModal: React.FC<InterviewScorecardModalProps> = ({
  scorecard,
  roleTitle,
  company,
  turns,
  onClose,
  onRestart
}) => {
  const [expandedTurn, setExpandedTurn] = useState<number | null>(null);

  const getRecommendationBadge = (rec: string) => {
    switch (rec) {
      case 'Strong Hire':
        return {
          bg: 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800',
          dot: 'bg-emerald-500'
        };
      case 'Hire':
        return {
          bg: 'bg-blue-100 dark:bg-blue-950/80 text-blue-800 dark:text-blue-300 border-blue-300 dark:border-blue-800',
          dot: 'bg-blue-500'
        };
      case 'Lean Hire':
        return {
          bg: 'bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-800',
          dot: 'bg-amber-500'
        };
      default:
        return {
          bg: 'bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300 border-rose-300 dark:border-rose-800',
          dot: 'bg-rose-500'
        };
    }
  };

  const badgeStyle = getRecommendationBadge(scorecard.recommendation);

  const downloadReport = () => {
    const lines = [
      `======================================================================`,
      `CAREERLENS AI - MULTIMODAL MOCK INTERVIEW EVALUATION SCORECARD`,
      `======================================================================`,
      `Target Role: ${roleTitle}`,
      `Company: ${company || 'General Practice'}`,
      `Date: ${new Date().toLocaleString()}`,
      `Overall Interview Score: ${scorecard.overall_score}/100`,
      `Recommendation: ${scorecard.recommendation.toUpperCase()}`,
      `Executive Verdict: ${scorecard.verdict}`,
      ``,
      `--- SPEECH & DELIVERY ANALYTICS ---`,
      `Average Speech Pacing: ${scorecard.average_wpm} Words Per Minute`,
      `Speech Clarity Score: ${scorecard.speech_clarity_score}/100`,
      `Total Filler Words Detected: ${scorecard.total_fillers_detected}`,
      `Average Filler Density: ${scorecard.average_filler_density}%`,
      `STAR Adherence Average: ${scorecard.star_average}/100`,
      ``,
      `--- FIVE-DIMENSIONAL PERFORMANCE RUBRIC ---`,
      ...Object.entries(scorecard.radar).map(([dim, val]) => `• ${dim}: ${val}/100`),
      ``,
      `--- TOP DEMONSTRATED STRENGTHS ---`,
      ...scorecard.top_strengths.map((s) => `[✓] ${s}`),
      ``,
      `--- PRIORITY GROWTH AREAS & COACHING ---`,
      ...scorecard.growth_areas.map((g) => `[!] ${g}`),
      ``,
      `--- TURN-BY-TURN TRANSCRIPT & STAR BREAKDOWN ---`
    ];

    turns.forEach((t) => {
      lines.push(
        `\n[Turn ${t.turn}] Question: ${t.question}`,
        `Candidate Response: "${t.transcript}"`,
        `Duration: ${t.duration_seconds}s | WPM: ${t.speech_metrics?.wpm || 0} (${t.speech_metrics?.pacing_status || 'N/A'})`,
        `Fillers Detected: ${t.speech_metrics?.filler_count || 0}`,
        `STAR Breakdown: Situation: ${t.star_evaluation?.situation_score || 0} | Task: ${t.star_evaluation?.task_score || 0} | Action: ${t.star_evaluation?.action_score || 0} | Result: ${t.star_evaluation?.result_score || 0}`
      );
    });

    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Interview_Scorecard_${roleTitle.replace(/\s+/g, '_')}_${Date.now()}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-4 bg-slate-50/50 dark:bg-slate-800/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600/10 dark:bg-indigo-400/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>Interview Performance Scorecard</span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Evaluation for <strong className="text-slate-700 dark:text-slate-300">{roleTitle}</strong>
                {company ? ` at ${company}` : ''}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-7 space-y-6">
          {/* Hero Overall Score Banner */}
          <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-r from-indigo-50/80 via-blue-50/80 to-purple-50/80 dark:from-indigo-950/40 dark:via-blue-950/40 dark:to-purple-950/40 border border-indigo-200/80 dark:border-indigo-900/60 flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-5">
              <div className="relative w-20 h-20 rounded-full bg-white dark:bg-slate-900 border-4 border-indigo-500 shadow-md flex flex-col items-center justify-center shrink-0">
                <span className="text-2xl font-black text-indigo-600 dark:text-indigo-400 leading-none">
                  {scorecard.overall_score}
                </span>
                <span className="text-[10px] font-bold text-slate-400 uppercase mt-0.5">/ 100</span>
              </div>

              <div className="space-y-1.5 text-center sm:text-left">
                <div className="flex items-center justify-center sm:justify-start gap-2">
                  <span
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-wide border ${badgeStyle.bg}`}
                  >
                    <span className={`w-2 h-2 rounded-full ${badgeStyle.dot} animate-pulse`} />
                    {scorecard.recommendation}
                  </span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    ({scorecard.total_questions_answered} questions evaluated)
                  </span>
                </div>
                <p className="text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300 leading-relaxed max-w-xl">
                  {scorecard.verdict}
                </p>
              </div>
            </div>
          </div>

          {/* Core Analytics 4-Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-1">
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                <span className="text-[11px] font-semibold">Speech Pacing</span>
                <Activity className="w-3.5 h-3.5 text-blue-500" />
              </div>
              <div className="text-lg font-bold text-slate-900 dark:text-white">
                {scorecard.average_wpm} <span className="text-xs font-normal text-slate-500">WPM</span>
              </div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400">
                Target: 110-160 WPM
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-1">
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                <span className="text-[11px] font-semibold">Filler Count</span>
                <Mic className="w-3.5 h-3.5 text-amber-500" />
              </div>
              <div className="text-lg font-bold text-slate-900 dark:text-white">
                {scorecard.total_fillers_detected} <span className="text-xs font-normal text-slate-500">detected</span>
              </div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400">
                Density: {scorecard.average_filler_density}%
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-1">
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                <span className="text-[11px] font-semibold">STAR Adherence</span>
                <Target className="w-3.5 h-3.5 text-purple-500" />
              </div>
              <div className="text-lg font-bold text-slate-900 dark:text-white">
                {scorecard.star_average} <span className="text-xs font-normal text-slate-500">/ 100</span>
              </div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400">
                Situation, Task, Action, Result
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-1">
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                <span className="text-[11px] font-semibold">Clarity & Confidence</span>
                <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
              </div>
              <div className="text-lg font-bold text-slate-900 dark:text-white">
                {scorecard.speech_clarity_score} <span className="text-xs font-normal text-slate-500">/ 100</span>
              </div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400">
                Diction and fluency
              </p>
            </div>
          </div>

          {/* 5-Dimensional Performance Breakdown */}
          <div className="p-5 rounded-2xl bg-slate-50/60 dark:bg-slate-800/30 border border-slate-200 dark:border-slate-800 space-y-3.5">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <h3 className="font-bold text-xs uppercase tracking-wider text-slate-700 dark:text-slate-300">
                5-Dimensional Competency Rubric
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
              {Object.entries(scorecard.radar).map(([dimension, score]) => (
                <div key={dimension} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                      {dimension}
                    </span>
                    <span className="font-bold text-indigo-600 dark:text-indigo-400">
                      {score}%
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        score >= 80
                          ? 'bg-emerald-500'
                          : score >= 65
                          ? 'bg-blue-500'
                          : score >= 50
                          ? 'bg-amber-500'
                          : 'bg-rose-500'
                      }`}
                      style={{ width: `${Math.min(100, Math.max(5, score))}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Two Columns: Strengths & Growth Areas */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Strengths */}
            <div className="p-5 rounded-2xl bg-emerald-50/40 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-900/50 space-y-3">
              <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <h4 className="font-bold text-xs uppercase tracking-wider">
                  Top Demonstrated Strengths
                </h4>
              </div>
              <ul className="space-y-2 text-xs text-slate-700 dark:text-slate-300">
                {scorecard.top_strengths.map((str, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-emerald-500 font-bold shrink-0">✓</span>
                    <span>{str}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Growth Areas */}
            <div className="p-5 rounded-2xl bg-indigo-50/40 dark:bg-indigo-950/20 border border-indigo-200/60 dark:border-indigo-900/50 space-y-3">
              <div className="flex items-center gap-2 text-indigo-800 dark:text-indigo-300">
                <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <h4 className="font-bold text-xs uppercase tracking-wider">
                  Priority Actionable Coaching Notes
                </h4>
              </div>
              <ul className="space-y-2 text-xs text-slate-700 dark:text-slate-300">
                {scorecard.growth_areas.map((ga, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-indigo-500 font-bold shrink-0">→</span>
                    <span>{ga}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Turn-by-Turn Drill Down */}
          {turns.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-bold text-xs uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Turn-by-Turn Response Analysis ({turns.length} Questions)
              </h3>

              <div className="space-y-2">
                {turns.map((t) => {
                  const isExpanded = expandedTurn === t.turn;
                  return (
                    <div
                      key={t.turn}
                      className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden"
                    >
                      <button
                        type="button"
                        onClick={() => setExpandedTurn(isExpanded ? null : t.turn)}
                        className="w-full p-4 text-left flex items-center justify-between gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors cursor-pointer"
                      >
                        <div className="flex items-center gap-3">
                          <span className="w-6 h-6 rounded-lg bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-bold text-xs flex items-center justify-center shrink-0">
                            Q{t.turn}
                          </span>
                          <span className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-white line-clamp-1">
                            {t.question}
                          </span>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
                            STAR: {t.star_evaluation?.overall_star_score || 0}%
                          </span>
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4 text-slate-400" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-slate-400" />
                          )}
                        </div>
                      </button>

                      {isExpanded && (
                        <div className="p-4 pt-0 border-t border-slate-100 dark:border-slate-800 space-y-3 text-xs">
                          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 leading-relaxed italic">
                            &quot;{t.transcript}&quot;
                          </div>

                          <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                            <span>Duration: {t.duration_seconds}s</span>
                            <span>•</span>
                            <span>Pacing: {t.speech_metrics?.wpm} WPM ({t.speech_metrics?.pacing_status})</span>
                            <span>•</span>
                            <span>Fillers: {t.speech_metrics?.filler_count || 0}</span>
                          </div>

                          {/* STAR Details */}
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center pt-1">
                            <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800">
                              <span className="text-[10px] text-slate-400 block font-bold">Situation</span>
                              <span className="font-extrabold text-slate-800 dark:text-slate-200">
                                {t.star_evaluation?.situation_score}%
                              </span>
                            </div>
                            <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800">
                              <span className="text-[10px] text-slate-400 block font-bold">Task</span>
                              <span className="font-extrabold text-slate-800 dark:text-slate-200">
                                {t.star_evaluation?.task_score}%
                              </span>
                            </div>
                            <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800">
                              <span className="text-[10px] text-slate-400 block font-bold">Action</span>
                              <span className="font-extrabold text-slate-800 dark:text-slate-200">
                                {t.star_evaluation?.action_score}%
                              </span>
                            </div>
                            <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800">
                              <span className="text-[10px] text-slate-400 block font-bold">Result</span>
                              <span className="font-extrabold text-slate-800 dark:text-slate-200">
                                {t.star_evaluation?.result_score}%
                              </span>
                            </div>
                          </div>

                          {/* Benchmark Model Answer Preview */}
                          {t.suitable_answers && t.suitable_answers.length > 0 && (
                            <div className="p-3 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40 space-y-1.5">
                              <span className="font-bold text-[11px] text-indigo-900 dark:text-indigo-300 flex items-center gap-1">
                                <Sparkles className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                                <span>Benchmark Model Answer ({t.suitable_answers[0].label}):</span>
                              </span>
                              <p className="text-[11px] text-slate-700 dark:text-slate-300 italic leading-relaxed">
                                &quot;{t.suitable_answers[0].spoken_script}&quot;
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-800/40">
          <button
            type="button"
            onClick={downloadReport}
            className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-xs flex items-center gap-1.5 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download Report (.txt)</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onRestart}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Start New Interview</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 text-xs font-semibold cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
