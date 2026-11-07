import React, { useState, useEffect } from 'react';
import {
  Award,
  Sparkles,
  Send,
  MessageSquare,
  Copy,
  Check,
  Zap,
  RefreshCw,
  Sliders,
  ShieldCheck
} from 'lucide-react';
import {
  NegotiationTurnResponse,
  CounterOfferScript
} from '../../types';
import { api } from '../../services/api';

interface NegotiationCoachStudioProps {
  initialIndustry?: string;
  initialRole?: string;
  initialOffer?: number;
  initialTarget?: number;
}

export const NegotiationCoachStudio: React.FC<NegotiationCoachStudioProps> = ({
  initialIndustry: _initialIndustry,
  initialRole,
  initialOffer,
  initialTarget
}) => {
  // Negotiation Parameters
  const [roleTitle, setRoleTitle] = useState<string>(initialRole || 'Senior Full Stack Engineer');
  const [company, setCompany] = useState<string>('TechFlow Labs');
  const [currentOffer, setCurrentOffer] = useState<number>(initialOffer || 140000);
  const [targetSalary, setTargetSalary] = useState<number>(initialTarget || 165000);
  const [highlightSkill, setHighlightSkill] = useState<string>('Distributed Systems & Cloud Architecture');
  const [difficulty, setDifficulty] = useState<'standard' | 'hard'>('standard');

  // Roleplay Conversation State
  const [turnNo, setTurnNo] = useState<number>(1);
  const [candidatePitch, setCandidatePitch] = useState<string>('');
  const [turnsHistory, setTurnsHistory] = useState<NegotiationTurnResponse[]>([]);
  const [isSubmittingTurn, setIsSubmittingTurn] = useState<boolean>(false);
  const [latestEval, setLatestEval] = useState<NegotiationTurnResponse | null>(null);

  // Ready-to-copy Battle-Tested Scripts State
  const [scripts, setScripts] = useState<CounterOfferScript[]>([]);
  const [loadingScripts, setLoadingScripts] = useState<boolean>(false);
  const [activeScriptTab, setActiveScriptTab] = useState<string>('market_anchor');
  const [copiedScriptId, setCopiedScriptId] = useState<string | null>(null);

  // Sync initial props if updated externally
  useEffect(() => {
    if (initialRole) setRoleTitle(initialRole);
    if (initialOffer) setCurrentOffer(initialOffer);
    if (initialTarget) setTargetSalary(initialTarget);
  }, [initialRole, initialOffer, initialTarget]);

  // Load Battle-Tested Scripts
  const loadScripts = async () => {
    setLoadingScripts(true);
    try {
      const data = await api.getNegotiationScripts({
        role_title: roleTitle,
        company,
        current_offer: currentOffer,
        target_salary: targetSalary,
        highlight_skill: highlightSkill
      });
      setScripts(data);
    } catch (err: any) {
      console.error('Failed to generate negotiation scripts:', err);
    } finally {
      setLoadingScripts(false);
    }
  };

  useEffect(() => {
    loadScripts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roleTitle, company, currentOffer, targetSalary, highlightSkill]);

  // Submit candidate negotiation pitch
  const handleSubmitPitch = async () => {
    if (!candidatePitch.trim() || isSubmittingTurn) return;
    setIsSubmittingTurn(true);

    try {
      const result = await api.evaluateNegotiationTurn({
        role_title: roleTitle,
        current_offer: latestEval ? latestEval.financial_outcome.new_offer : currentOffer,
        target_salary: targetSalary,
        candidate_pitch: candidatePitch.trim(),
        turn_no: turnNo,
        difficulty,
        history: turnsHistory.map((t) => ({
          turn: t.turn_no,
          candidate_pitch: t.candidate_pitch,
          recruiter_reply: t.recruiter_reply
        }))
      });

      setLatestEval(result);
      setTurnsHistory((prev) => [...prev, result]);
      setTurnNo((prev) => prev + 1);
      setCandidatePitch('');
    } catch (err: any) {
      console.error('Negotiation turn evaluation failed:', err);
    } finally {
      setIsSubmittingTurn(false);
    }
  };

  // 1-Click Copy script to clipboard
  const handleCopyScript = (scriptText: string, scriptId: string) => {
    navigator.clipboard.writeText(scriptText);
    setCopiedScriptId(scriptId);
    setTimeout(() => setCopiedScriptId(null), 2500);
  };

  // 1-Click Insert script into roleplay input
  const handleInsertScriptToRoleplay = (scriptText: string) => {
    setCandidatePitch(scriptText);
  };

  // Reset conversation session
  const handleResetSession = () => {
    setTurnNo(1);
    setTurnsHistory([]);
    setLatestEval(null);
    setCandidatePitch('');
  };

  // Current compensation state
  const activeOffer = latestEval ? latestEval.financial_outcome.new_offer : currentOffer;
  const totalConcessionAchieved = activeOffer - currentOffer;
  const remainingGap = Math.max(0, targetSalary - activeOffer);

  return (
    <div className="space-y-6 sm:space-y-8 min-w-0">
      {/* Top Banner / Heading */}
      <div className="p-4 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 overflow-hidden min-w-0">
        <div className="min-w-0 space-y-1">
          <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-bold text-xs uppercase tracking-wider">
            <Zap className="w-4 h-4 shrink-0" />
            <span>Game-Theory Compensation Roleplay Simulator</span>
          </div>
          <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white mt-1">
            Offer Negotiation Coach & Counter-Offer Scripts
          </h2>
          <p className="text-xs text-slate-500 font-medium max-w-2xl leading-relaxed">
            Roleplay high-stakes counter-offers with simulated hiring leads, evaluate real-time leverage and politeness vs. firmness metrics, and generate 5 battle-tested negotiation scripts.
          </p>
        </div>

        <button
          type="button"
          onClick={handleResetSession}
          className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors flex items-center gap-1.5 shrink-0 cursor-pointer self-start md:self-center"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Reset Negotiation</span>
        </button>
      </div>

      {/* Main Grid: Parameters & Scripts (Left 5 Cols) vs Live Simulator (Right 7 Cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 items-start min-w-0">
        {/* Left Column: Negotiation Parameters & Ready Scripts (5 Cols) */}
        <div className="lg:col-span-5 space-y-6 min-w-0">
          {/* Offer Scenario Parameters Card */}
          <div className="p-4 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4 overflow-hidden min-w-0">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
              <Sliders className="w-4 h-4 text-indigo-600" />
              <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
                Offer Context & Anchors
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">Target Role</label>
                <input
                  type="text"
                  value={roleTitle}
                  onChange={(e) => setRoleTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-900 dark:text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">Employer / Company</label>
                <input
                  type="text"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-900 dark:text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">Initial Employer Offer ($)</label>
                <input
                  type="number"
                  step="5000"
                  value={currentOffer}
                  onChange={(e) => setCurrentOffer(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-900 dark:text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">Your Target Salary ($)</label>
                <input
                  type="number"
                  step="5000"
                  value={targetSalary}
                  onChange={(e) => setTargetSalary(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-indigo-600 dark:text-indigo-400 font-bold"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">Key Domain Leverage Skill</label>
              <input
                type="text"
                value={highlightSkill}
                onChange={(e) => setHighlightSkill(e.target.value)}
                placeholder="e.g. Distributed Systems & Kafka"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-900 dark:text-white"
              />
            </div>

            {/* Negotiation Difficulty Mode (Task 11) */}
            <div className="space-y-1.5 pt-1">
              <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                <span>Negotiation Difficulty Mode</span>
                <span className={`text-[10px] font-bold uppercase ${difficulty === 'hard' ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                  {difficulty === 'hard' ? 'Hard (Rigorous Recruiter)' : 'Standard (Collaborative)'}
                </span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setDifficulty('standard')}
                  className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                    difficulty === 'standard'
                      ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-400 text-emerald-900 dark:text-emerald-200'
                      : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <span className="font-bold text-xs block">Standard</span>
                  <span className="text-[10px] opacity-80 block">Collaborative HR partner; responds to market anchors.</span>
                </button>

                <button
                  type="button"
                  onClick={() => setDifficulty('hard')}
                  className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                    difficulty === 'hard'
                      ? 'bg-rose-50 dark:bg-rose-950/50 border-rose-400 text-rose-900 dark:text-rose-200'
                      : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <span className="font-bold text-xs block">Hard Mode</span>
                  <span className="text-[10px] opacity-80 block">Strict budget caps; requires trade-offs & hard evidence.</span>
                </button>
              </div>
            </div>
          </div>

          {/* 1-Click Battle-Tested Counter-Offer Scripts */}
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Award className="w-4 h-4 text-amber-500" />
                <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
                  Battle-Tested Script Templates
                </h3>
              </div>
              <div className="flex items-center gap-2">
                {loadingScripts && <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-600" />}
                <span className="text-[10px] font-bold text-indigo-600">5 Strategies</span>
              </div>
            </div>

            {/* Script Tab Switcher */}
            <div className="flex flex-wrap gap-1">
              {scripts.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setActiveScriptTab(s.id)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                    activeScriptTab === s.id
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  {s.tag}
                </button>
              ))}
            </div>

            {/* Active Script Preview */}
            {(() => {
              const active = scripts.find((s) => s.id === activeScriptTab) || scripts[0];
              if (!active) return null;

              return (
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white">{active.title}</h4>
                      <p className="text-[11px] text-slate-500">{active.description}</p>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 shrink-0">
                      {active.badge}
                    </span>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs font-mono leading-relaxed text-slate-800 dark:text-slate-200 whitespace-pre-line max-h-56 overflow-y-auto">
                    {active.script}
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => handleCopyScript(active.script, active.id)}
                      className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      {copiedScriptId === active.id ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-500" />
                          <span className="text-emerald-600">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy Script</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleInsertScriptToRoleplay(active.script)}
                      className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Test in Simulator</span>
                    </button>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>

        {/* Right Column: Live Game-Theory Negotiation Simulator (7 Cols) */}
        <div className="lg:col-span-7 space-y-6 min-w-0">
          {/* Game-Theory HUD Gauges */}
          <div className="p-4 sm:p-5 rounded-3xl bg-linear-to-r from-slate-900 to-indigo-950 text-white border border-indigo-900/60 shadow-lg space-y-4 overflow-hidden min-w-0">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-200">
                  Game-Theory Compensation HUD
                </h4>
              </div>
              <span className="text-xs font-semibold text-indigo-300">
                Turn {turnNo}
              </span>
            </div>

            {/* 4 HUD Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 rounded-2xl bg-white/5 border border-white/10 text-center">
                <p className="text-[10px] font-bold uppercase text-slate-400">Current Offer</p>
                <p className="text-base font-black text-white">${activeOffer.toLocaleString()}</p>
                <p className="text-[10px] text-slate-400">Gap: ${remainingGap.toLocaleString()}</p>
              </div>

              <div className="p-3 rounded-2xl bg-white/5 border border-white/10 text-center">
                <p className="text-[10px] font-bold uppercase text-slate-400">Net Gain Achieved</p>
                <p className="text-base font-black text-emerald-400">+${totalConcessionAchieved.toLocaleString()}</p>
                <p className="text-[10px] text-slate-400">Comp Uplift</p>
              </div>

              <div className="p-3 rounded-2xl bg-white/5 border border-white/10 text-center">
                <p className="text-[10px] font-bold uppercase text-slate-400">Leverage Index</p>
                <p className="text-base font-black text-indigo-300">{latestEval?.metrics.leverage_score || 40}%</p>
                <p className="text-[10px] text-slate-400">Bargaining Power</p>
              </div>

              <div className="p-3 rounded-2xl bg-white/5 border border-white/10 text-center">
                <p className="text-[10px] font-bold uppercase text-slate-400">Acceptance Odds</p>
                <p className="text-base font-black text-amber-300">{latestEval?.metrics.acceptance_probability || 45}%</p>
                <p className="text-[10px] text-slate-400">Recruiter Flexibility</p>
              </div>
            </div>

            {/* Tactical Politeness vs Firmness Balance */}
            {latestEval && (
              <div className="p-3 rounded-2xl bg-white/5 border border-white/10 flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-slate-300 font-bold">Tactical Balance:</span>
                  <span className="text-emerald-300 font-bold">{latestEval.metrics.tactical_balance}</span>
                </div>
                <div className="flex items-center gap-3 text-[11px] text-slate-400">
                  <span>Firmness: {latestEval.metrics.firmness_index}%</span>
                  <span>Politeness: {latestEval.metrics.politeness_index}%</span>
                </div>
              </div>
            )}
          </div>

          {/* Live Offer Sheet Card with Upgradable Clauses (Task 11) */}
          <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
                  Live Contract & Offer Sheet
                </h4>
              </div>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase border ${
                difficulty === 'hard'
                  ? 'bg-rose-50 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800'
                  : 'bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
              }`}>
                {difficulty} Mode
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-0.5">
                <span className="text-[10px] text-slate-400 font-bold uppercase">Active Base Salary</span>
                <p className="text-lg font-black text-emerald-600 dark:text-emerald-400">
                  ${activeOffer.toLocaleString()}
                </p>
                <p className="text-[10px] text-slate-500 font-medium">
                  {totalConcessionAchieved > 0 ? `+$${totalConcessionAchieved.toLocaleString()} net uplift achieved` : 'Original opening offer'}
                </p>
              </div>

              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-0.5">
                <span className="text-[10px] text-slate-400 font-bold uppercase">Target Compensation</span>
                <p className="text-lg font-black text-indigo-600 dark:text-indigo-400">
                  ${targetSalary.toLocaleString()}
                </p>
                <p className="text-[10px] text-slate-500 font-medium">
                  ${remainingGap.toLocaleString()} gap remaining
                </p>
              </div>
            </div>

            {/* Unlocked Contract Clauses */}
            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between text-[10px] font-bold uppercase text-slate-400 tracking-wider">
                <span>Negotiated Contract Clauses & Perks</span>
                <span>{latestEval?.clauses_unlocked?.length || 0} Unlocked</span>
              </div>

              {latestEval?.clauses_unlocked && latestEval.clauses_unlocked.length > 0 ? (
                <div className="space-y-1.5">
                  {latestEval.clauses_unlocked.map((clause, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/80 flex items-start justify-between gap-2"
                    >
                      <div className="space-y-0.5">
                        <span className="font-bold text-xs text-emerald-900 dark:text-emerald-200">
                          {clause.title || clause.name}
                        </span>
                        <p className="text-[11px] text-emerald-800/80 dark:text-emerald-300/80 leading-relaxed">
                          {clause.condition}
                        </p>
                      </div>
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-sm bg-emerald-200 dark:bg-emerald-900 text-emerald-900 dark:text-emerald-200 uppercase shrink-0">
                        {clause.type || clause.status}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-3 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-center text-[11px] text-slate-400">
                  No non-base clauses unlocked yet. Pivot to accelerated 6-month reviews, sign-on bonuses, or remote flexibility in your next pitch!
                </div>
              )}
            </div>
          </div>

          {/* Interactive Chat Stream */}
          <div className="p-4 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-5 overflow-hidden min-w-0">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-indigo-600 shrink-0" />
                <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
                  Interactive Recruiter Roleplay Stream
                </h3>
              </div>
              <span className="text-xs text-slate-400 font-medium">
                Simulating {company} Hiring Team
              </span>
            </div>

            {/* Dialogue History */}
            <div className="space-y-4 max-h-[380px] overflow-y-auto pr-1">
              {/* Initial Recruiter Opening Offer */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-1.5 break-words">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs flex items-center justify-center shrink-0">
                    HR
                  </span>
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Lead Technical Recruiter • {company}
                  </span>
                </div>
                <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                  &quot;Hello! The entire interview panel was thoroughly impressed by your technical depth and problem-solving skills.
                  We are excited to extend an initial offer for the {roleTitle} position with a base salary of ${currentOffer.toLocaleString()}.
                  Please let us know your thoughts on the package so we can finalize your formal onboarding!&quot;
                </p>
              </div>

              {/* Dynamic Conversation Turns */}
              {turnsHistory.map((turn) => (
                <div key={turn.turn_no} className="space-y-3">
                  {/* Candidate Pitch Bubble */}
                  <div className="p-4 rounded-2xl bg-indigo-50/80 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800/80 space-y-1.5 ml-2 sm:ml-6 break-words">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-indigo-700 dark:text-indigo-300">
                        You (Turn {turn.turn_no})
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {turn.signals_detected.competing_offer && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                            Competing Offer (+25)
                          </span>
                        )}
                        {turn.signals_detected.market_data_anchor && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                            Market Anchor (+20)
                          </span>
                        )}
                      </div>
                    </div>
                    <p className="text-xs text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-line">
                      &quot;{turn.candidate_pitch}&quot;
                    </p>
                  </div>

                  {/* Recruiter Reaction Bubble */}
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2 mr-2 sm:mr-6 break-words">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-indigo-600 text-white font-bold text-xs flex items-center justify-center">
                          HR
                        </span>
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                          Recruiter Counter-Offer
                        </span>
                      </div>
                      <span className="text-xs font-black text-emerald-600">
                        New Offer: ${turn.financial_outcome.new_offer.toLocaleString()}
                      </span>
                    </div>
                    <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                      &quot;{turn.recruiter_reply}&quot;
                    </p>

                    {/* Coach Feedback Note */}
                    <div className="p-2.5 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/60 text-[11px] text-indigo-800 dark:text-indigo-300">
                      <strong>💡 Coach Critique:</strong> {turn.coach_critique}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Candidate Response Composer */}
            <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <div className="relative">
                <textarea
                  rows={4}
                  value={candidatePitch}
                  onChange={(e) => setCandidatePitch(e.target.value)}
                  placeholder="Type your counter-offer response, or click one of the Battle-Tested Strategy scripts on the left..."
                  className="w-full p-4 rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs sm:text-sm leading-relaxed focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex items-center justify-between">
                <p className="text-[11px] text-slate-400 font-medium">
                  {latestEval?.suggested_next_move || 'Tip: Frame your counter with specific market percentiles and domain ROI.'}
                </p>

                <button
                  type="button"
                  onClick={handleSubmitPitch}
                  disabled={isSubmittingTurn || !candidatePitch.trim()}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
                >
                  {isSubmittingTurn ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Simulating HR Response...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Deliver Counter-Offer</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* End-of-Session Performance Scorecard (Task 11) */}
          {turnsHistory.length >= 2 && (
            <div className="p-5 sm:p-6 rounded-3xl bg-linear-to-br from-indigo-900 via-slate-900 to-indigo-950 text-white shadow-xl space-y-4 border border-indigo-700/60">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <Award className="w-5 h-5 text-amber-400" />
                  <h4 className="text-sm font-black uppercase tracking-wider">
                    Negotiation Performance Scorecard
                  </h4>
                </div>
                <span className="text-xs text-indigo-200">
                  {turnsHistory.length} Rounds Evaluated ({difficulty} mode)
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 space-y-1">
                  <span className="text-[10px] text-slate-300 font-bold uppercase">Opening vs Final</span>
                  <p className="text-base font-black text-white">
                    ${currentOffer.toLocaleString()} → <span className="text-emerald-400">${activeOffer.toLocaleString()}</span>
                  </p>
                  <p className="text-[10px] text-emerald-300 font-bold">
                    +${totalConcessionAchieved.toLocaleString()} Total Cash Increase
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 space-y-1">
                  <span className="text-[10px] text-slate-300 font-bold uppercase">Tactical Leverage Rating</span>
                  <p className="text-base font-black text-indigo-300">
                    {latestEval?.metrics.leverage_score || 50}%
                  </p>
                  <p className="text-[10px] text-slate-300">
                    {latestEval?.metrics.tactical_balance}
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 space-y-1">
                  <span className="text-[10px] text-slate-300 font-bold uppercase">Contract Upgrades Won</span>
                  <p className="text-base font-black text-amber-300">
                    {latestEval?.clauses_unlocked?.length || 0} Clauses Unlocked
                  </p>
                  <p className="text-[10px] text-slate-300">
                    {latestEval?.clauses_unlocked?.map((c) => c.title || c.name).join(', ') || 'Base compensation only'}
                  </p>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 text-xs space-y-1.5">
                <div className="flex items-center gap-1.5 text-amber-400 font-bold">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Strategic Coaching Takeaway:</span>
                </div>
                <p className="text-slate-200 leading-relaxed text-[11px]">
                  {totalConcessionAchieved > 0
                    ? `Great outcome! You successfully extracted $${totalConcessionAchieved.toLocaleString()} in added compensation by backing your arguments with market data and structured counter-offer framing.`
                    : 'To unlock concessions in Hard Mode, avoid repeating flat numbers—introduce verified O*NET/BLS benchmarks, competing timeline deadlines, or request non-base benefits like accelerated reviews.'}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
