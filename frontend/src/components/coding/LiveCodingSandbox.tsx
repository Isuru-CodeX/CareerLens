import React, { useState, useEffect, useRef } from 'react';
import {
  Code2,
  Play,
  RotateCcw,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  AlertCircle,
  Clock,
  Loader2,
  Terminal,
  Sparkles,
  Copy,
  Check,
  HelpCircle,
  Award,
  Layers,
  Server,
  Cpu,
  ShieldCheck,
  Layout,
  CloudLightning,
  Database,
  FileText,
  ChevronDown,
  ChevronUp,
  Pause,
  RefreshCw,
  Eye,
  CheckCheck
} from 'lucide-react';
import { api } from '../../services/api';
import {
  CodingChallengeItem,
  CodingEvaluationResponse,
  RoleMetaItem
} from '../../types';

export const LiveCodingSandbox: React.FC = () => {
  // Roles and Catalog state
  const [roles, setRoles] = useState<RoleMetaItem[]>([]);
  const [selectedRole, setSelectedRole] = useState<string>('all');
  const [selectedTrack, setSelectedTrack] = useState<string>('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all');
  const [challenges, setChallenges] = useState<CodingChallengeItem[]>([]);
  const [isLoadingChallenges, setIsLoadingChallenges] = useState<boolean>(true);

  // Active Challenge & Editor State
  const [selectedChallengeId, setSelectedChallengeId] = useState<string>('');
  const [activeChallenge, setActiveChallenge] = useState<CodingChallengeItem | null>(null);
  const [userCode, setUserCode] = useState<string>('');
  const [activeLeftTab, setActiveLeftTab] = useState<'problem' | 'tests' | 'hints' | 'model_answer'>('problem');

  // Progressive Hints
  const [revealedHintIndex, setRevealedHintIndex] = useState<number>(0);

  // SLA Interview Timer State
  const [timerSeconds, setTimerSeconds] = useState<number>(1800); // 30 min default
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);
  const timerRef = useRef<any>(null);

  // Evaluation & Results State
  const [isEvaluating, setIsEvaluating] = useState<boolean>(false);
  const [evalResult, setEvalResult] = useState<CodingEvaluationResponse | null>(null);
  const [evalError, setEvalError] = useState<string | null>(null);

  // UI Helpers
  const [copiedCode, setCopiedCode] = useState<boolean>(false);
  const [isCopiedModel, setIsCopiedModel] = useState<boolean>(false);
  const [expandedErrorIdx, setExpandedErrorIdx] = useState<number | null>(0);
  const [expandedCorrectionIdx, setExpandedCorrectionIdx] = useState<number | null>(0);
  const [expandedMissedIdx, setExpandedMissedIdx] = useState<number | null>(0);

  // Load Roles on mount
  useEffect(() => {
    api.getCodingRoles()
      .then((data) => {
        if (data && data.length > 0) {
          setRoles(data);
        }
      })
      .catch((err) => {
        console.warn('Failed to load coding roles metadata:', err);
      });
  }, []);

  // Fetch Challenges when filters change
  useEffect(() => {
    setIsLoadingChallenges(true);
    api.getCodingChallenges({
      role: selectedRole,
      track: selectedTrack,
      difficulty: selectedDifficulty
    })
      .then((data) => {
        setChallenges(data);
        if (data.length > 0) {
          // If current selected challenge is in the new list, keep it; else select first
          const found = data.find((c) => c.id === selectedChallengeId);
          const current = found || data[0];
          setSelectedChallengeId(current.id);
          setActiveChallenge(current);
          setUserCode(current.starter_code);
          setTimerSeconds((current.time_limit_minutes || 25) * 60);
          setIsTimerRunning(false);
          setRevealedHintIndex(0);
        } else {
          setActiveChallenge(null);
          setUserCode('');
        }
      })
      .catch((err) => {
        console.error('Failed to load challenges:', err);
      })
      .finally(() => {
        setIsLoadingChallenges(false);
      });
  }, [selectedRole, selectedTrack, selectedDifficulty]);

  // SLA Countdown Timer effect
  useEffect(() => {
    if (isTimerRunning) {
      timerRef.current = setInterval(() => {
        setTimerSeconds((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isTimerRunning]);

  const handleSelectChallenge = (ch: CodingChallengeItem) => {
    setSelectedChallengeId(ch.id);
    setActiveChallenge(ch);
    setUserCode(ch.starter_code);
    setTimerSeconds((ch.time_limit_minutes || 25) * 60);
    setIsTimerRunning(false);
    setRevealedHintIndex(0);
    setEvalResult(null);
    setEvalError(null);
    setActiveLeftTab('problem');
  };

  const handleResetCode = () => {
    if (activeChallenge) {
      if (window.confirm('Reset code back to the initial starter boilerplate? Any unsaved edits will be replaced.')) {
        setUserCode(activeChallenge.starter_code);
        setEvalResult(null);
      }
    }
  };

  const handleToggleTimer = () => {
    setIsTimerRunning(!isTimerRunning);
  };

  const handleResetTimer = () => {
    if (activeChallenge) {
      setTimerSeconds((activeChallenge.time_limit_minutes || 25) * 60);
      setIsTimerRunning(false);
    }
  };

  const handleRevealNextHint = () => {
    if (activeChallenge?.hints && revealedHintIndex < activeChallenge.hints.length) {
      setRevealedHintIndex(revealedHintIndex + 1);
    }
  };

  // Support Tab key inside the Code Editor textarea
  const handleEditorKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const target = e.currentTarget;
      const start = target.selectionStart;
      const end = target.selectionEnd;
      const newValue = userCode.substring(0, start) + '    ' + userCode.substring(end);
      setUserCode(newValue);
      setTimeout(() => {
        target.selectionStart = target.selectionEnd = start + 4;
      }, 0);
    }
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(userCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleCopyModelAnswer = (text: string) => {
    navigator.clipboard.writeText(text);
    setIsCopiedModel(true);
    setTimeout(() => setIsCopiedModel(false), 2000);
  };

  const handleRunEvaluation = async () => {
    if (!activeChallenge) return;
    setIsEvaluating(true);
    setEvalError(null);

    // Stop timer when submitting
    setIsTimerRunning(false);

    try {
      const res = await api.evaluateCodeSubmission({
        challenge_id: activeChallenge.id,
        code: userCode,
        language: activeChallenge.language || (activeChallenge.track === 'coding' ? 'python' : 'markdown'),
        role: activeChallenge.target_role
      });
      setEvalResult(res);
      // Auto-switch to model_answer tab or keep problem tab
      // Scroll to assessment feedback
      const feedbackElem = document.getElementById('assessment-feedback-section');
      if (feedbackElem) {
        feedbackElem.scrollIntoView({ behavior: 'smooth' });
      }
    } catch (err: any) {
      console.error('Code evaluation error:', err);
      setEvalError(err?.message || 'Assessment evaluation failed. Please check your submission.');
    } finally {
      setIsEvaluating(false);
    }
  };

  // Format seconds to MM:SS
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Helper for role icons
  const renderRoleIcon = (iconName: string) => {
    switch (iconName?.toLowerCase()) {
      case 'layout':
        return <Layout className="w-4 h-4" />;
      case 'server':
        return <Server className="w-4 h-4" />;
      case 'layers':
        return <Layers className="w-4 h-4" />;
      case 'cpu':
        return <Cpu className="w-4 h-4" />;
      case 'cloudlightning':
        return <CloudLightning className="w-4 h-4" />;
      case 'database':
        return <Database className="w-4 h-4" />;
      case 'shieldcheck':
        return <ShieldCheck className="w-4 h-4" />;
      default:
        return <Code2 className="w-4 h-4" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* ============================================================ */}
      {/* 1. STUDIO HERO HEADER & CONTROLS */}
      {/* ============================================================ */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 pb-6 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-start gap-4">
            <span className="p-3.5 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-md shadow-indigo-500/20 shrink-0">
              <Code2 className="w-7 h-7" />
            </span>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                  Live Coding & System Design Assessment Sandbox
                </h1>
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950/70 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                  Module 11
                </span>
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> AI Staff Evaluator Ready
                </span>
              </div>
              <p className="text-xs md:text-sm text-slate-600 dark:text-slate-400 mt-1.5 leading-relaxed max-w-3xl">
                Solve role-calibrated technical assessments under live interview SLAs. Submit to uncover errors, concrete fixes, missed edge cases, multi-criteria rubric scoring, and production-grade benchmark model answers.
              </p>
            </div>
          </div>

          {/* SLA Interview Timer & Action Controls */}
          <div className="flex items-center gap-3 w-full lg:w-auto justify-between lg:justify-end flex-wrap">
            {/* Countdown Clock */}
            <div className={`flex items-center gap-2 px-3.5 py-2 rounded-2xl border transition-all ${
              timerSeconds === 0
                ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300'
                : timerSeconds < 300
                ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800 text-amber-700 dark:text-amber-300'
                : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
            }`}>
              <Clock className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              <div className="flex flex-col">
                <span className="text-[10px] uppercase font-bold tracking-wider opacity-70 leading-none">
                  Interview SLA
                </span>
                <span className="font-mono text-sm font-bold tracking-tight">
                  {formatTime(timerSeconds)}
                </span>
              </div>
              <div className="flex items-center gap-1 ml-1 pl-2 border-l border-slate-200 dark:border-slate-700">
                <button
                  onClick={handleToggleTimer}
                  title={isTimerRunning ? 'Pause Timer' : 'Start Timer'}
                  className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
                >
                  {isTimerRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                </button>
                <button
                  onClick={handleResetTimer}
                  title="Reset Timer"
                  className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleResetCode}
                className="px-3.5 py-2 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1.5 transition-all shadow-sm"
              >
                <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                Reset Boilerplate
              </button>
              <button
                onClick={handleRunEvaluation}
                disabled={isEvaluating || !activeChallenge}
                className="px-5 py-2 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white text-xs font-bold flex items-center gap-2 shadow-md shadow-purple-500/20 disabled:opacity-50 transition-all cursor-pointer"
              >
                {isEvaluating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Evaluating with Staff AI...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-white" />
                    <span>Submit & Deep Assess</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* ============================================================ */}
        {/* 2. ROLE & TRACK SELECTION FILTERS */}
        {/* ============================================================ */}
        <div className="pt-5 space-y-4">
          {/* Target Role Selector */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-purple-600" />
                Filter by Engineering Role:
              </label>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                {challenges.length} active scenario{challenges.length === 1 ? '' : 's'} available
              </span>
            </div>

            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin">
              <button
                onClick={() => setSelectedRole('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold shrink-0 transition-all flex items-center gap-1.5 border ${
                  selectedRole === 'all'
                    ? 'bg-purple-600 border-purple-600 text-white shadow-sm'
                    : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
                }`}
              >
                <span>All Roles</span>
              </button>
              {roles.map((r) => (
                <button
                  key={r.id}
                  onClick={() => setSelectedRole(r.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold shrink-0 transition-all flex items-center gap-1.5 border ${
                    selectedRole === r.id
                      ? 'bg-purple-600 border-purple-600 text-white shadow-sm'
                      : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
                  }`}
                >
                  {renderRoleIcon(r.icon)}
                  <span>{r.name}</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    selectedRole === r.id ? 'bg-purple-800 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                  }`}>
                    {r.challenge_count}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Track & Difficulty Filter Pills */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-slate-800/60">
            {/* Track Switcher */}
            <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
              <button
                onClick={() => setSelectedTrack('all')}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                  selectedTrack === 'all'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-bold shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                All Tracks
              </button>
              <button
                onClick={() => setSelectedTrack('coding')}
                className={`px-3 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all ${
                  selectedTrack === 'coding'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-bold shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                <Terminal className="w-3 h-3 text-purple-600" />
                Live Coding
              </button>
              <button
                onClick={() => setSelectedTrack('system_design')}
                className={`px-3 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all ${
                  selectedTrack === 'system_design'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-bold shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                <Layers className="w-3 h-3 text-indigo-600" />
                System Design
              </button>
            </div>

            {/* Difficulty Filter */}
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-medium text-slate-500">Difficulty:</span>
              {(['all', 'Easy', 'Medium', 'Hard'] as const).map((diff) => (
                <button
                  key={diff}
                  onClick={() => setSelectedDifficulty(diff)}
                  className={`px-2.5 py-0.5 rounded-lg text-[11px] font-semibold transition-all border ${
                    selectedDifficulty === diff
                      ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 border-transparent shadow-sm'
                      : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {diff === 'all' ? 'All' : diff}
                </button>
              ))}
            </div>
          </div>

          {/* Horizontal Challenge Selector Tabs */}
          {isLoadingChallenges ? (
            <div className="py-6 flex items-center justify-center gap-2 text-slate-500 text-xs">
              <Loader2 className="w-4 h-4 animate-spin text-purple-600" />
              Loading calibrated technical assessments...
            </div>
          ) : challenges.length === 0 ? (
            <div className="p-6 text-center rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 text-xs text-slate-500">
              No challenges found matching this role or filter criteria. Try selecting "All Roles" or "All Tracks".
            </div>
          ) : (
            <div className="flex items-stretch gap-3 overflow-x-auto pb-2 scrollbar-thin pt-2">
              {challenges.map((ch) => {
                const isSelected = selectedChallengeId === ch.id;
                const isSystemDesign = ch.track === 'system_design';
                return (
                  <button
                    key={ch.id}
                    onClick={() => handleSelectChallenge(ch)}
                    className={`min-w-[260px] max-w-[320px] p-3.5 rounded-2xl text-left border transition-all shrink-0 relative flex flex-col justify-between gap-2.5 ${
                      isSelected
                        ? 'bg-gradient-to-br from-purple-50 to-indigo-50/60 dark:from-purple-950/40 dark:to-indigo-950/30 border-purple-400 dark:border-purple-600 shadow-sm ring-1 ring-purple-400/30'
                        : 'bg-white dark:bg-slate-800/50 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50/50'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-1 mb-1.5">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider ${
                          isSystemDesign
                            ? 'bg-indigo-100 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800'
                            : 'bg-purple-100 dark:bg-purple-950/70 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800'
                        }`}>
                          {isSystemDesign ? 'System Design' : 'Live Coding'}
                        </span>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                          ch.difficulty === 'Easy'
                            ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40'
                            : ch.difficulty === 'Medium'
                            ? 'text-amber-600 bg-amber-50 dark:bg-amber-950/40'
                            : 'text-rose-600 bg-rose-50 dark:bg-rose-950/40'
                        }`}>
                          {ch.difficulty}
                        </span>
                      </div>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 line-clamp-1">
                        {ch.title}
                      </h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        {ch.target_role}
                      </p>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800/60 pt-2">
                      <span className="flex items-center gap-1 font-mono text-[10px]">
                        <Clock className="w-3 h-3 text-purple-500" />
                        {ch.time_limit_minutes}m SLA
                      </span>
                      {ch.is_recommended && (
                        <span className="text-[10px] font-bold text-purple-600 dark:text-purple-400 flex items-center gap-1">
                          <Award className="w-3 h-3" /> Recommended
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ============================================================ */}
      {/* 3. MAIN WORKSPACE: PROBLEM DETAILS vs INTERACTIVE EDITOR */}
      {/* ============================================================ */}
      {activeChallenge && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* LEFT COLUMN: Problem Context, Tests, Hints & Model Answer Tabs */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
              {/* Navigation Sub-Tabs */}
              <div className="flex items-center border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 px-3 pt-3 gap-1 overflow-x-auto">
                <button
                  onClick={() => setActiveLeftTab('problem')}
                  className={`px-3 py-2 rounded-t-xl text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 shrink-0 ${
                    activeLeftTab === 'problem'
                      ? 'border-purple-600 text-purple-600 dark:text-purple-400 bg-white dark:bg-slate-900'
                      : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  Problem Statement
                </button>
                <button
                  onClick={() => setActiveLeftTab('tests')}
                  className={`px-3 py-2 rounded-t-xl text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 shrink-0 ${
                    activeLeftTab === 'tests'
                      ? 'border-purple-600 text-purple-600 dark:text-purple-400 bg-white dark:bg-slate-900'
                      : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  Acceptance Criteria ({activeChallenge.test_cases?.length || 0})
                </button>
                <button
                  onClick={() => setActiveLeftTab('hints')}
                  className={`px-3 py-2 rounded-t-xl text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 shrink-0 ${
                    activeLeftTab === 'hints'
                      ? 'border-purple-600 text-purple-600 dark:text-purple-400 bg-white dark:bg-slate-900'
                      : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  <HelpCircle className="w-3.5 h-3.5" />
                  Hints ({activeChallenge.hints?.length || 0})
                </button>
                <button
                  onClick={() => setActiveLeftTab('model_answer')}
                  className={`px-3 py-2 rounded-t-xl text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 shrink-0 ${
                    activeLeftTab === 'model_answer'
                      ? 'border-purple-600 text-purple-600 dark:text-purple-400 bg-white dark:bg-slate-900'
                      : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  Model Answer
                </button>
              </div>

              {/* Tab Content Box */}
              <div className="p-5 max-h-[580px] overflow-y-auto scrollbar-thin">
                {/* 1. Problem Statement Tab */}
                {activeLeftTab === 'problem' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                      <div>
                        <span className="text-[11px] font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400">
                          {activeChallenge.category}
                        </span>
                        <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                          {activeChallenge.title}
                        </h3>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 block uppercase font-mono">Target Role</span>
                        <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                          {activeChallenge.target_role}
                        </span>
                      </div>
                    </div>

                    <div className="prose dark:prose-invert prose-xs text-xs text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                      {activeChallenge.description}
                    </div>

                    {/* Target Complexity / SLA Box */}
                    <div className="p-3.5 rounded-2xl bg-purple-50/70 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800/60 space-y-1">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-purple-900 dark:text-purple-200">
                        <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                        Target Complexity / Production SLA:
                      </div>
                      <p className="font-mono text-xs text-purple-800 dark:text-purple-300">
                        {activeChallenge.optimal_big_o}
                      </p>
                    </div>
                  </div>
                )}

                {/* 2. Acceptance Test Criteria Tab */}
                {activeLeftTab === 'tests' && (
                  <div className="space-y-3">
                    <div className="text-xs text-slate-600 dark:text-slate-400 pb-2 border-b border-slate-100 dark:border-slate-800">
                      The automated testing suite verifies your submission against these criteria and hidden stress cases:
                    </div>
                    {activeChallenge.test_cases?.map((tc, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 space-y-1.5 text-xs"
                      >
                        <div className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 text-[10px] font-bold flex items-center justify-center">
                            {idx + 1}
                          </span>
                          <span>{tc.description || `Test Scenario #${idx + 1}`}</span>
                        </div>
                        <div className="font-mono text-[11px] text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-900 p-2 rounded-xl border border-slate-100 dark:border-slate-800 overflow-x-auto">
                          <span className="text-slate-400">Input: </span>
                          {JSON.stringify(tc.input, null, 2)}
                        </div>
                        <div className="font-mono text-[11px] text-emerald-600 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/20 p-2 rounded-xl border border-emerald-100 dark:border-emerald-900/40">
                          <span className="text-emerald-700 dark:text-emerald-300 font-semibold">Expected: </span>
                          {JSON.stringify(tc.expected)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* 3. Progressive Hints Tab */}
                {activeLeftTab === 'hints' && (
                  <div className="space-y-4">
                    <div className="text-xs text-slate-600 dark:text-slate-400">
                      Stuck? Reveal progressive hints one by one. Try to solve the problem before unlocking all hints!
                    </div>

                    {activeChallenge.hints && activeChallenge.hints.length > 0 ? (
                      <div className="space-y-3">
                        {activeChallenge.hints.map((hint, idx) => {
                          const isRevealed = idx < revealedHintIndex;
                          return (
                            <div
                              key={idx}
                              className={`p-3.5 rounded-2xl border transition-all text-xs ${
                                isRevealed
                                  ? 'bg-amber-50/60 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/60 text-amber-900 dark:text-amber-200'
                                  : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 text-slate-400'
                              }`}
                            >
                              <div className="font-bold flex items-center justify-between mb-1">
                                <span className="flex items-center gap-1.5">
                                  <HelpCircle className="w-3.5 h-3.5 text-amber-600" />
                                  Hint {idx + 1}
                                </span>
                                {!isRevealed && (
                                  <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                                    Locked
                                  </span>
                                )}
                              </div>
                              {isRevealed ? (
                                <p className="leading-relaxed mt-1 text-slate-800 dark:text-slate-200">{hint}</p>
                              ) : (
                                <p className="italic text-[11px] text-slate-400">Click below to reveal this hint...</p>
                              )}
                            </div>
                          );
                        })}

                        {revealedHintIndex < (activeChallenge.hints?.length || 0) && (
                          <button
                            onClick={handleRevealNextHint}
                            className="w-full py-2 rounded-xl border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/50 hover:bg-amber-100 text-amber-800 dark:text-amber-300 text-xs font-bold transition-all shadow-sm"
                          >
                            Reveal Hint {revealedHintIndex + 1} of {activeChallenge.hints.length}
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="text-xs text-slate-500 italic">No hints provided for this challenge.</div>
                    )}
                  </div>
                )}

                {/* 4. Benchmark Model Answer Tab */}
                {activeLeftTab === 'model_answer' && (
                  <div className="space-y-4">
                    <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-xs text-amber-900 dark:text-amber-200 space-y-1">
                      <div className="font-bold flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4 text-amber-600" />
                        Official Benchmark Solution & Production Architecture
                      </div>
                      <p className="text-[11px] opacity-90 leading-relaxed">
                        Compare your code and architectural decisions against the staff-level gold standard solution below.
                      </p>
                    </div>

                    {evalResult?.model_answer || activeChallenge.model_answer ? (
                      (() => {
                        const m = evalResult?.model_answer || activeChallenge.model_answer;
                        const codeOrDoc = m?.solution_code || m?.architecture_doc || '';
                        return (
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                {m?.solution_code ? 'Production Solution Code' : 'System Design Blueprint'}
                              </span>
                              <button
                                onClick={() => handleCopyModelAnswer(codeOrDoc)}
                                className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-[11px] font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1 transition-all"
                              >
                                {isCopiedModel ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                                {isCopiedModel ? 'Copied' : 'Copy Solution'}
                              </button>
                            </div>

                            <pre className="p-4 rounded-2xl bg-slate-950 text-slate-100 font-mono text-[11px] leading-relaxed overflow-x-auto max-h-[360px] scrollbar-thin">
                              <code>{codeOrDoc}</code>
                            </pre>

                            {m?.design_principles && m.design_principles.length > 0 && (
                              <div className="space-y-1.5 pt-2">
                                <span className="text-xs font-bold text-slate-900 dark:text-slate-100 block">
                                  Core Design Takeaways:
                                </span>
                                <ul className="space-y-1 text-[11px] text-slate-600 dark:text-slate-400 list-disc list-inside">
                                  {m.design_principles.map((dp: string, i: number) => (
                                    <li key={i}>{dp}</li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {m?.trade_off_analysis && (
                              <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-[11px] text-slate-700 dark:text-slate-300">
                                <span className="font-bold block mb-0.5 text-slate-900 dark:text-slate-100">Trade-Off Analysis:</span>
                                {m.trade_off_analysis}
                              </div>
                            )}
                          </div>
                        );
                      })()
                    ) : (
                      <div className="p-6 text-center text-xs text-slate-500 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                        Submit your solution above to reveal the benchmark model answer and error evaluation!
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Interactive Editor Area */}
          <div className="lg:col-span-7 space-y-3">
            <div className="bg-slate-950 border border-slate-800 rounded-3xl overflow-hidden shadow-lg flex flex-col h-full">
              {/* Editor Header Bar */}
              <div className="px-5 py-3 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between text-xs text-slate-400">
                <div className="flex items-center gap-2 font-mono">
                  <Terminal className="w-4 h-4 text-purple-400" />
                  <span className="font-bold text-slate-200">
                    {activeChallenge.track === 'coding' ? 'solution.py' : 'architecture_design.md'}
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-purple-300 border border-purple-900/50">
                    {activeChallenge.track === 'coding' ? 'Python 3.12 / Standard Lib' : 'Markdown Spec'}
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-[11px] font-mono text-slate-500">
                    {userCode.split('\n').length} lines • {userCode.length} chars
                  </span>
                  <button
                    onClick={handleCopyCode}
                    className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
                    title="Copy Editor Code"
                  >
                    {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* Code Editor Textarea */}
              <div className="relative flex-1 min-h-[460px] p-4 bg-slate-950">
                <textarea
                  rows={22}
                  value={userCode}
                  onChange={(e) => setUserCode(e.target.value)}
                  onKeyDown={handleEditorKeyDown}
                  placeholder={activeChallenge.track === 'coding' ? '# Type your production Python solution here...' : '# Document your system design architecture here...'}
                  className="w-full h-full text-xs font-mono bg-transparent text-slate-100 leading-relaxed focus:outline-none resize-none scrollbar-thin selection:bg-purple-900 selection:text-white"
                  spellCheck={false}
                />
              </div>

              {/* Editor Footer / Submit Bar */}
              <div className="px-5 py-3 bg-slate-900/80 border-t border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2 text-[11px] text-slate-400">
                  <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Sandbox connected • Auto-saving locally</span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleRunEvaluation}
                    disabled={isEvaluating}
                    className="px-4 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all disabled:opacity-50"
                  >
                    {isEvaluating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5 fill-white" />}
                    <span>Submit & Check Errors</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 4. DEEP ASSESSMENT EVALUATION FEEDBACK (AFTER SUBMISSION) */}
      {/* ============================================================ */}
      {evalError && (
        <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-800 dark:text-rose-200 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{evalError}</span>
        </div>
      )}

      {evalResult && (
        <div id="assessment-feedback-section" className="space-y-6 pt-4">
          {/* Executive Scorecard Banner */}
          <div className="bg-gradient-to-br from-slate-900 via-purple-950 to-slate-900 text-white rounded-3xl p-6 shadow-xl border border-purple-800/40">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 pb-6 border-b border-purple-800/30">
              <div className="flex items-center gap-5">
                {/* Score Gauge Circle */}
                <div className="relative flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 shadow-lg shadow-purple-500/30 shrink-0">
                  <div className="text-center">
                    <span className="text-2xl font-black tracking-tight block leading-none">
                      {evalResult.overall_score}
                    </span>
                    <span className="text-[10px] font-bold uppercase opacity-80">/ 100</span>
                  </div>
                </div>

                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-purple-500/30 text-purple-200 border border-purple-400/30">
                      Grade: {evalResult.grade}
                    </span>
                    <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                      Tests: {evalResult.tests_passed} / {evalResult.tests_total} Passed
                    </span>
                  </div>
                  <h3 className="text-xl font-bold mt-1 text-white">
                    {evalResult.title}
                  </h3>
                  <p className="text-xs text-purple-200/80 mt-0.5">
                    Role Evaluated: {evalResult.target_role || activeChallenge?.target_role}
                  </p>
                </div>
              </div>

              {/* Verified Skill Badge Alert */}
              {evalResult.verified_skill_awarded && (
                <div className="p-3.5 rounded-2xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-200 text-xs flex items-center gap-3">
                  <Award className="w-6 h-6 text-emerald-400 shrink-0" />
                  <div>
                    <span className="font-bold block text-white">Verified Skill Evidence Awarded!</span>
                    <span className="text-[11px] text-emerald-300">
                      {evalResult.verified_skill_awarded.skill_name} ({evalResult.verified_skill_awarded.level}) recorded to your profile
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Performance Metrics Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-5 text-xs">
              <div className="p-3 rounded-xl bg-purple-900/30 border border-purple-800/40">
                <span className="text-[11px] text-purple-300 block">Estimated Complexity</span>
                <span className="font-mono font-bold text-white text-sm">
                  {evalResult.estimated_complexity}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-purple-900/30 border border-purple-800/40">
                <span className="text-[11px] text-purple-300 block">Target Complexity SLA</span>
                <span className="font-mono font-bold text-indigo-300 text-sm">
                  {evalResult.target_complexity}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-purple-900/30 border border-purple-800/40">
                <span className="text-[11px] text-purple-300 block">Execution Latency</span>
                <span className="font-mono font-bold text-emerald-300 text-sm">
                  {evalResult.execution_time_ms} ms
                </span>
              </div>
              <div className="p-3 rounded-xl bg-purple-900/30 border border-purple-800/40">
                <span className="text-[11px] text-purple-300 block">Critical Defects Found</span>
                <span className="font-mono font-bold text-rose-300 text-sm">
                  {evalResult.errors_found?.length || 0} flagged
                </span>
              </div>
            </div>

            {/* Staff AI Review Paragraph */}
            {evalResult.ai_critique && (
              <div className="mt-5 p-4 rounded-2xl bg-slate-950/60 border border-purple-800/50 text-xs text-purple-100 leading-relaxed flex items-start gap-3">
                <Sparkles className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-white block mb-1">Senior Staff Engineer Critique:</span>
                  <p className="whitespace-pre-wrap">{evalResult.ai_critique}</p>
                </div>
              </div>
            )}
          </div>

          {/* 4-Dimensional Rubric Progress Breakdown */}
          {evalResult.rubric_breakdown && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
                <Layers className="w-4 h-4 text-purple-600" />
                Comprehensive Rubric Scoring Breakdown
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 1. Correctness */}
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                      Functional Correctness & Logic
                    </span>
                    <span className="font-mono font-bold text-purple-600 dark:text-purple-400">
                      {evalResult.rubric_breakdown.correctness} / 100
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-purple-600 h-2 rounded-full transition-all duration-700"
                      style={{ width: `${evalResult.rubric_breakdown.correctness}%` }}
                    />
                  </div>
                </div>

                {/* 2. Scalability & Big-O */}
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                      Scalability & Algorithmic Complexity
                    </span>
                    <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                      {evalResult.rubric_breakdown.scalability_complexity} / 100
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-indigo-600 h-2 rounded-full transition-all duration-700"
                      style={{ width: `${evalResult.rubric_breakdown.scalability_complexity}%` }}
                    />
                  </div>
                </div>

                {/* 3. Code Quality & Modularity */}
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                      Code Cleanliness & Architectural Abstraction
                    </span>
                    <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      {evalResult.rubric_breakdown.code_quality_architecture} / 100
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-emerald-600 h-2 rounded-full transition-all duration-700"
                      style={{ width: `${evalResult.rubric_breakdown.code_quality_architecture}%` }}
                    />
                  </div>
                </div>

                {/* 4. Reliability & Security */}
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                      Reliability, Concurrency & Security
                    </span>
                    <span className="font-mono font-bold text-amber-600 dark:text-amber-400">
                      {evalResult.rubric_breakdown.reliability_security} / 100
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-amber-600 h-2 rounded-full transition-all duration-700"
                      style={{ width: `${evalResult.rubric_breakdown.reliability_security}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TRI-PANE FINDINGS: Detected Errors, Actionable Corrections, Missed Edge Cases */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* 1. DETECTED ERRORS & FLAWS */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                <h4 className="text-xs font-bold text-rose-700 dark:text-rose-400 flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4" />
                  Detected Errors & Flaws ({evalResult.errors_found?.length || 0})
                </h4>
              </div>

              {evalResult.errors_found && evalResult.errors_found.length > 0 ? (
                <div className="space-y-3 max-h-[420px] overflow-y-auto scrollbar-thin">
                  {evalResult.errors_found.map((err, i) => (
                    <div
                      key={i}
                      className="p-3 rounded-2xl bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/60 text-xs space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-rose-900 dark:text-rose-200">
                          {err.error}
                        </span>
                        <span className="text-[10px] uppercase font-bold px-1.5 py-0.2 rounded bg-rose-200 dark:bg-rose-900/80 text-rose-800 dark:text-rose-300">
                          {err.severity}
                        </span>
                      </div>
                      <p className="text-[11px] text-rose-800 dark:text-rose-300/90 leading-relaxed">
                        {err.explanation}
                      </p>
                      {err.line_or_component && (
                        <div className="text-[10px] font-mono text-rose-600 dark:text-rose-400 pt-1">
                          Component: {err.line_or_component}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-5 text-center text-xs text-emerald-600 dark:text-emerald-400 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40">
                  <CheckCircle2 className="w-6 h-6 mx-auto mb-1 text-emerald-500" />
                  Zero critical logic defects detected! Solution conforms cleanly to requirements.
                </div>
              )}
            </div>

            {/* 2. ACTIONABLE CORRECTIONS & CODE FIXES */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                <h4 className="text-xs font-bold text-indigo-700 dark:text-indigo-400 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4" />
                  Actionable Corrections ({evalResult.corrections?.length || 0})
                </h4>
              </div>

              {evalResult.corrections && evalResult.corrections.length > 0 ? (
                <div className="space-y-3 max-h-[420px] overflow-y-auto scrollbar-thin">
                  {evalResult.corrections.map((cor, i) => (
                    <div
                      key={i}
                      className="p-3 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-900/60 text-xs space-y-1.5"
                    >
                      <div className="font-bold text-indigo-950 dark:text-indigo-200">
                        {cor.issue}
                      </div>
                      <p className="text-[11px] text-indigo-800 dark:text-indigo-300 leading-relaxed">
                        {cor.fix}
                      </p>
                      {cor.code_snippet && (
                        <pre className="p-2 rounded-xl bg-slate-950 text-slate-100 font-mono text-[10px] overflow-x-auto leading-relaxed">
                          <code>{cor.code_snippet}</code>
                        </pre>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-5 text-center text-xs text-slate-500 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
                  No structural corrections needed. Code quality is well structured.
                </div>
              )}
            </div>

            {/* 3. MISSED IMPORTANT THINGS & EDGE CASES */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                <h4 className="text-xs font-bold text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4" />
                  Missed Important Things ({evalResult.missed_important_things?.length || 0})
                </h4>
              </div>

              {evalResult.missed_important_things && evalResult.missed_important_things.length > 0 ? (
                <div className="space-y-3 max-h-[420px] overflow-y-auto scrollbar-thin">
                  {evalResult.missed_important_things.map((m, i) => (
                    <div
                      key={i}
                      className="p-3 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 text-xs space-y-1.5"
                    >
                      <div className="font-bold text-amber-950 dark:text-amber-200">
                        {m.item}
                      </div>
                      <p className="text-[11px] text-amber-800 dark:text-amber-300 leading-relaxed">
                        <span className="font-semibold text-amber-900 dark:text-amber-100">Why Critical: </span>
                        {m.why_important}
                      </p>
                      <div className="p-2 rounded-xl bg-amber-100/60 dark:bg-amber-900/40 text-[10px] text-amber-900 dark:text-amber-200">
                        <span className="font-bold">Recommendation: </span>
                        {m.recommendation}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-5 text-center text-xs text-emerald-600 dark:text-emerald-400 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40">
                  <CheckCheck className="w-6 h-6 mx-auto mb-1 text-emerald-500" />
                  All critical edge cases and production constraints successfully addressed!
                </div>
              )}
            </div>
          </div>

          {/* Acceptance Test Suites Results Table */}
          {evalResult.test_results && evalResult.test_results.length > 0 && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-purple-600" />
                  Acceptance Test Suite Execution Results
                </span>
                <span className="text-xs font-mono font-bold text-slate-500">
                  {evalResult.tests_passed} / {evalResult.test_results.length} PASSED
                </span>
              </h3>

              <div className="space-y-2">
                {evalResult.test_results.map((tr) => (
                  <div
                    key={tr.test_id}
                    className={`p-3 rounded-2xl border text-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-3 ${
                      tr.passed
                        ? 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/40'
                        : 'bg-rose-50/40 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/40'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      {tr.passed ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      ) : (
                        <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
                      )}
                      <div>
                        <span className="font-bold text-slate-900 dark:text-slate-100">
                          {tr.description}
                        </span>
                        <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400 mt-0.5">
                          Input: {tr.input_repr}
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                        tr.passed
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300'
                          : 'bg-rose-100 text-rose-700 dark:bg-rose-900 dark:text-rose-300'
                      }`}>
                        {tr.passed ? 'PASSED' : 'FAILED'}
                      </span>
                      <div className="text-[10px] font-mono text-slate-500 mt-1">
                        Expected: {tr.expected_repr}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* OFFICIAL BENCHMARK MODEL ANSWER & REFERENCE SPECIFICATION */}
          {evalResult.model_answer && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-amber-500" />
                    Official Benchmark Model Answer & Reference Solution
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Production implementation and design specification engineered by Staff Infrastructure Architects
                  </p>
                </div>
                <button
                  onClick={() => handleCopyModelAnswer(
                    evalResult.model_answer?.solution_code || evalResult.model_answer?.architecture_doc || ''
                  )}
                  className="px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1.5 transition-all self-start sm:self-auto"
                >
                  {isCopiedModel ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  {isCopiedModel ? 'Copied Solution' : 'Copy Full Solution'}
                </button>
              </div>

              {/* Code or Architecture Document Box */}
              <div className="space-y-3">
                <pre className="p-4 rounded-2xl bg-slate-950 text-slate-100 font-mono text-xs leading-relaxed overflow-x-auto max-h-[460px] scrollbar-thin border border-slate-800">
                  <code>
                    {evalResult.model_answer.solution_code || evalResult.model_answer.architecture_doc}
                  </code>
                </pre>

                {/* Key Architectural Principles */}
                {evalResult.model_answer.design_principles && (
                  <div className="p-4 rounded-2xl bg-purple-50/50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800/60 space-y-2">
                    <span className="text-xs font-bold text-purple-900 dark:text-purple-200 block">
                      Architectural Design Tenets:
                    </span>
                    <ul className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-purple-800 dark:text-purple-300">
                      {evalResult.model_answer.design_principles.map((dp: string, i: number) => (
                        <li key={i} className="flex items-start gap-2">
                          <CheckCircle2 className="w-3.5 h-3.5 text-purple-600 shrink-0 mt-0.5" />
                          <span>{dp}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Trade-Off Analysis */}
                {evalResult.model_answer.trade_off_analysis && (
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 space-y-1">
                    <span className="font-bold text-slate-900 dark:text-slate-100 block">
                      Production Trade-Off & Alternative Analysis:
                    </span>
                    <p className="leading-relaxed">{evalResult.model_answer.trade_off_analysis}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
