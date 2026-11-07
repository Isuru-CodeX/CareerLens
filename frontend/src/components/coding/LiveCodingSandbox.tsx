import React, { useState, useEffect } from 'react';
import {
  Code2,
  Play,
  RotateCcw,
  CheckCircle2,
  Clock,
  Loader2,
  Terminal,
  Sparkles
} from 'lucide-react';
import { api } from '../../services/api';
import { CodingChallengeItem, CodingEvaluationResponse } from '../../types';

export const LiveCodingSandbox: React.FC = () => {
  const [challenges, setChallenges] = useState<CodingChallengeItem[]>([]);
  const [selectedChallengeId, setSelectedChallengeId] = useState<string>('');
  const [activeChallenge, setActiveChallenge] = useState<CodingChallengeItem | null>(null);
  const [userCode, setUserCode] = useState<string>('');
  const [isEvaluating, setIsEvaluating] = useState<boolean>(false);
  const [evalResult, setEvalResult] = useState<CodingEvaluationResponse | null>(null);

  // Load challenges on mount
  useEffect(() => {
    api.getCodingChallenges().then((data) => {
      setChallenges(data);
      if (data.length > 0) {
        setSelectedChallengeId(data[0].id);
        setActiveChallenge(data[0]);
        setUserCode(data[0].starter_code);
      }
    }).catch(console.error);
  }, []);

  const handleSelectChallenge = (ch: CodingChallengeItem) => {
    setSelectedChallengeId(ch.id);
    setActiveChallenge(ch);
    setUserCode(ch.starter_code);
    setEvalResult(null);
  };

  const handleResetCode = () => {
    if (activeChallenge) {
      setUserCode(activeChallenge.starter_code);
      setEvalResult(null);
    }
  };

  const handleRunCode = async () => {
    if (!activeChallenge) return;
    setIsEvaluating(true);
    try {
      const res = await api.evaluateCodeSubmission({
        challenge_id: activeChallenge.id,
        code: userCode,
        language: 'python'
      });
      setEvalResult(res);
    } catch (err: any) {
      console.error('Code evaluation error:', err);
    } finally {
      setIsEvaluating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Studio Header */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <span className="p-2.5 rounded-xl bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400">
              <Code2 className="w-6 h-6" />
            </span>
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                In-Browser Live Coding & System Design Assessment Sandbox
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                  Module 11
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Execute role-targeted algorithmic challenges, test edge cases, and analyze Big-O time and space complexity
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleResetCode}
              className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1.5 transition-all"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset Boilerplate
            </button>
            <button
              onClick={handleRunCode}
              disabled={isEvaluating}
              className="px-4 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold flex items-center gap-2 shadow-sm transition-all"
            >
              {isEvaluating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 fill-white" />}
              Run Test Suites & Review
            </button>
          </div>
        </div>

        {/* Challenge Selection Row */}
        <div className="pt-4 flex items-center gap-2 overflow-x-auto pb-2">
          {challenges.map((ch) => (
            <button
              key={ch.id}
              onClick={() => handleSelectChallenge(ch)}
              className={`px-3 py-2 rounded-xl text-xs font-medium border text-left shrink-0 transition-all ${
                selectedChallengeId === ch.id
                  ? 'bg-purple-50 dark:bg-purple-950/40 border-purple-300 dark:border-purple-800 text-purple-900 dark:text-purple-200 shadow-sm'
                  : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
              }`}
            >
              <div className="font-semibold">{ch.title}</div>
              <div className="text-[11px] opacity-75 mt-0.5 flex items-center gap-2">
                <span className={`px-1.5 py-0.2 rounded font-mono text-[10px] ${
                  ch.difficulty === 'Easy' ? 'text-emerald-600' : 'text-amber-600'
                }`}>
                  {ch.difficulty}
                </span>
                <span>• {ch.target_role}</span>
              </div>
            </button>
          ))}
        </div>

        {/* Workspace: Problem Statement vs Code Editor vs Test Runner */}
        <div className="mt-5 grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Left: Problem Details */}
          <div className="lg:col-span-5 space-y-4">
            {activeChallenge && (
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    {activeChallenge.category}
                  </span>
                  <div className="flex items-center gap-1.5 text-xs text-slate-500">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{activeChallenge.time_limit_minutes} min SLA</span>
                  </div>
                </div>

                <div className="text-xs text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
                  {activeChallenge.description}
                </div>

                <div className="p-3 rounded-lg bg-purple-50/60 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800/60 text-xs text-purple-900 dark:text-purple-300">
                  <span className="font-semibold">Target Complexity: </span>
                  <span className="font-mono">{activeChallenge.optimal_big_o}</span>
                </div>
              </div>
            )}

            {/* Test Execution Output */}
            {evalResult && (
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/70 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                      Tests: {evalResult.tests_passed} / {evalResult.tests_total} Passed
                    </span>
                  </div>
                  <span className="text-xs font-bold text-purple-600 dark:text-purple-400">
                    Quality: {evalResult.code_quality_score}/100
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800">
                    <span className="text-slate-500 text-[11px] block">Execution Time</span>
                    <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                      {evalResult.execution_time_ms} ms
                    </span>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800">
                    <span className="text-slate-500 text-[11px] block">Estimated Complexity</span>
                    <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                      {evalResult.estimated_complexity}
                    </span>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-slate-100 dark:bg-slate-900 font-mono text-xs text-slate-700 dark:text-slate-300 space-y-1">
                  <div className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-purple-600" /> AI Code Review:
                  </div>
                  <p className="text-[11px]">{evalResult.ai_critique}</p>
                </div>
              </div>
            )}
          </div>

          {/* Right: Code Editor Box */}
          <div className="lg:col-span-7 space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1.5 font-mono">
                <Terminal className="w-3.5 h-3.5 text-purple-600" />
                solution.py (Python 3.12+)
              </span>
              <span>Monaco-grade client runner</span>
            </div>

            <textarea
              rows={18}
              value={userCode}
              onChange={(e) => setUserCode(e.target.value)}
              className="w-full text-xs font-mono rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-900 text-slate-100 p-4 leading-relaxed focus:outline-none focus:ring-2 focus:ring-purple-500"
              spellCheck={false}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
