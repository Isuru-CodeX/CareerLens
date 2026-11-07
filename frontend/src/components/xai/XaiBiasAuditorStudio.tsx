import React, { useState, useEffect, useCallback } from 'react';
import {
  Sparkles,
  ShieldCheck,
  EyeOff,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Copy,
  Check,
  Scale,
  TrendingUp
} from 'lucide-react';
import { api } from '../../services/api';
import {
  ShapAttributionResponse,
  BiasAuditResponse,
  BlindProfileResponse,
  Resume
} from '../../types';

interface XaiBiasAuditorStudioProps {
  resumes?: Resume[];
  initialResumeId?: string;
  defaultJobText?: string;
}

export const XaiBiasAuditorStudio: React.FC<XaiBiasAuditorStudioProps> = ({
  resumes = [],
  initialResumeId = '',
  defaultJobText = ''
}) => {
  const [activeTab, setActiveTab] = useState<'shap' | 'bias' | 'blind'>('shap');
  const [selectedResumeId, setSelectedResumeId] = useState<string>(initialResumeId || (resumes[0]?.id || ''));

  // SHAP State
  const [shapJobText, setShapJobText] = useState(defaultJobText || `We are seeking a Senior Backend Engineer with Python, FastAPI, Docker, and PostgreSQL experience. Must have demonstrated history scaling distributed systems.`);
  const [shapResult, setShapResult] = useState<ShapAttributionResponse | null>(null);
  const [isComputingShap, setIsComputingShap] = useState(false);
  const [attributionFilter, setAttributionFilter] = useState<'all' | 'positive' | 'negative'>('all');

  // Bias State
  const [biasInputText, setBiasInputText] = useState(`We are an aggressive, powerhouse engineering team looking for a rockstar ninja developer who is a young and energetic digital native. Recent graduates only from top-tier universities. Must be ready to crush deadlines and dominate the competitive landscape.`);
  const [biasResult, setBiasResult] = useState<BiasAuditResponse | null>(null);
  const [isScanningBias, setIsScanningBias] = useState(false);

  // Blind State
  const [blindResult, setBlindResult] = useState<BlindProfileResponse | null>(null);
  const [isRedacting, setIsRedacting] = useState(false);
  const [copiedMasked, setCopiedMasked] = useState(false);

  // Run initial SHAP if resume selected
  const handleRunShap = useCallback(async () => {
    setIsComputingShap(true);
    try {
      const selectedResume = resumes.find(r => r.id === selectedResumeId);
      const res = await api.getXaiAttributions({
        resume_id: selectedResumeId || undefined,
        resume_text: selectedResume?.raw_text || undefined,
        job_text: shapJobText,
        baseline_score: 75.0
      });
      setShapResult(res);
    } catch (err) {
      console.error('SHAP error:', err);
    } finally {
      setIsComputingShap(false);
    }
  }, [resumes, selectedResumeId, shapJobText]);

  // Run Bias Scanner
  const handleRunBiasScan = useCallback(async () => {
    setIsScanningBias(true);
    try {
      const res = await api.runBiasAudit({ text: biasInputText });
      setBiasResult(res);
    } catch (err) {
      console.error('Bias audit error:', err);
    } finally {
      setIsScanningBias(false);
    }
  }, [biasInputText]);

  // Run Blind Redaction
  const handleRunBlindMask = async () => {
    setIsRedacting(true);
    try {
      const selectedResume = resumes.find(r => r.id === selectedResumeId);
      const res = await api.generateBlindProfile({
        resume_id: selectedResumeId || undefined,
        resume_text: selectedResume?.raw_text || undefined
      });
      setBlindResult(res);
    } catch (err) {
      console.error('Blind redaction error:', err);
    } finally {
      setIsRedacting(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      handleRunShap();
      handleRunBiasScan();
    }, 50);
    return () => clearTimeout(timer);
  }, [handleRunShap, handleRunBiasScan]);

  return (
    <div className="space-y-6">
      {/* Studio Header & Sub-Tab Switcher */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400">
                <Scale className="w-5 h-5" />
              </span>
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  Explainable AI & Algorithmic Bias Auditor
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                    Module 7 (XAI & DEI)
                  </span>
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  SHAP token-level attribution heatmaps, unconscious bias scanning, and blind recruitment masking
                </p>
              </div>
            </div>
          </div>

          {/* Sub-tab Pills */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl">
            <button
              onClick={() => setActiveTab('shap')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                activeTab === 'shap'
                  ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-sm font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5" />
              SHAP Heatmap
            </button>
            <button
              onClick={() => setActiveTab('bias')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                activeTab === 'bias'
                  ? 'bg-white dark:bg-slate-700 text-amber-600 dark:text-amber-300 shadow-sm font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              DEI Bias Scanner
            </button>
            <button
              onClick={() => setActiveTab('blind')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                activeTab === 'blind'
                  ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-300 shadow-sm font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <EyeOff className="w-3.5 h-3.5" />
              Blind Recruitment Mask
            </button>
          </div>
        </div>

        {/* Tab 1: SHAP Explainability Heatmap */}
        {activeTab === 'shap' && (
          <div className="pt-5 space-y-5">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
              <div className="lg:col-span-1 space-y-4">
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 space-y-3">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    Target Resume
                  </label>
                  <select
                    value={selectedResumeId}
                    onChange={(e) => setSelectedResumeId(e.target.value)}
                    className="w-full text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-slate-900 dark:text-slate-100"
                  >
                    {resumes.map(r => (
                      <option key={r.id} value={r.id}>{r.file_name} ({r.target_role || 'General'})</option>
                    ))}
                  </select>

                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider block pt-2">
                    Job Requirements Anchor
                  </label>
                  <textarea
                    rows={4}
                    value={shapJobText}
                    onChange={(e) => setShapJobText(e.target.value)}
                    className="w-full text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2 text-slate-900 dark:text-slate-100"
                  />

                  <button
                    onClick={handleRunShap}
                    disabled={isComputingShap}
                    className="w-full py-2 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs flex items-center justify-center gap-2 transition-all shadow-sm"
                  >
                    {isComputingShap ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                    Compute Shapley Weights
                  </button>
                </div>

                {/* Score Calibration Card */}
                {shapResult && (
                  <div className="p-4 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60">
                    <div className="text-xs text-indigo-700 dark:text-indigo-300 font-medium">Shapley Calibrated Score</div>
                    <div className="text-3xl font-black text-indigo-950 dark:text-indigo-100 mt-1">
                      {shapResult.calibrated_score}%
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-2 flex items-center justify-between">
                      <span>Baseline: {shapResult.baseline_score}%</span>
                      <span>Analyzed: {shapResult.total_segments_analyzed} blocks</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Attributions Heatmap Panel */}
              <div className="lg:col-span-3 space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Filter By Impact:</span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setAttributionFilter('all')}
                        className={`px-2.5 py-1 rounded-md text-xs font-medium ${
                          attributionFilter === 'all'
                            ? 'bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        All ({shapResult?.attributions.length || 0})
                      </button>
                      <button
                        onClick={() => setAttributionFilter('positive')}
                        className={`px-2.5 py-1 rounded-md text-xs font-medium ${
                          attributionFilter === 'positive'
                            ? 'bg-emerald-600 text-white'
                            : 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300'
                        }`}
                      >
                        Positive (+{shapResult?.positive_impact_count || 0})
                      </button>
                      <button
                        onClick={() => setAttributionFilter('negative')}
                        className={`px-2.5 py-1 rounded-md text-xs font-medium ${
                          attributionFilter === 'negative'
                            ? 'bg-rose-600 text-white'
                            : 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300'
                        }`}
                      >
                        Improvement Areas ({shapResult?.negative_impact_count || 0})
                      </button>
                    </div>
                  </div>

                  <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                    Token Attribution Math: &phi;<sub>i</sub> = Score(S &cup; &#123;i&#125;) - Score(S)
                  </span>
                </div>

                {/* Heatmap List */}
                <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
                  {shapResult?.attributions
                    .filter(a => attributionFilter === 'all' || a.category === attributionFilter)
                    .map((item, idx) => {
                      const isPos = item.category === 'positive';
                      const isNeg = item.category === 'negative';
                      return (
                        <div
                          key={idx}
                          className={`p-3.5 rounded-xl border transition-all text-xs ${
                            isPos
                              ? 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/60'
                              : isNeg
                              ? 'bg-rose-50/40 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800/60'
                              : 'bg-slate-50/40 dark:bg-slate-800/30 border-slate-200 dark:border-slate-800'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <p className="font-mono text-slate-800 dark:text-slate-200 flex-1 leading-relaxed">
                              {item.text}
                            </p>
                            <span
                              className={`px-2.5 py-1 rounded-lg font-bold font-mono text-xs whitespace-nowrap ${
                                isPos
                                  ? 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200'
                                  : isNeg
                                  ? 'bg-rose-100 dark:bg-rose-900/60 text-rose-800 dark:text-rose-200'
                                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                              }`}
                            >
                              {item.shap_delta > 0 ? `+${item.shap_delta}%` : `${item.shap_delta}%`}
                            </span>
                          </div>

                          <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-200/60 dark:border-slate-800/60">
                            <span>{item.attribution_explanation}</span>
                            {item.matched_terms.length > 0 && (
                              <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                                Keywords: {item.matched_terms.join(', ')}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: DEI Bias Scanner */}
        {activeTab === 'bias' && (
          <div className="pt-5 space-y-5">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              <div className="lg:col-span-1 space-y-4">
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 space-y-3">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider block">
                    Job Description / Content to Audit
                  </label>
                  <textarea
                    rows={8}
                    value={biasInputText}
                    onChange={(e) => setBiasInputText(e.target.value)}
                    className="w-full text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2.5 text-slate-900 dark:text-slate-100 font-mono"
                    placeholder="Paste job posting text or resume content to test for unconscious bias..."
                  />

                  <button
                    onClick={handleRunBiasScan}
                    disabled={isScanningBias}
                    className="w-full py-2.5 px-4 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-medium text-xs flex items-center justify-center gap-2 transition-all shadow-sm"
                  >
                    {isScanningBias ? <Loader2 className="w-4 h-4 animate-spin" /> : <AlertTriangle className="w-4 h-4" />}
                    Scan for Biases & DEI Score
                  </button>
                </div>

                {biasResult && (
                  <div className="p-4 rounded-xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 space-y-2">
                    <div className="text-xs text-amber-800 dark:text-amber-300 font-medium">DEI Inclusion & Fairness Score</div>
                    <div className="text-3xl font-black text-amber-950 dark:text-amber-100">
                      {biasResult.fairness_score}/100
                    </div>
                    <div className="flex items-center justify-between text-[11px] pt-1">
                      <span className="font-semibold">Risk: {biasResult.bias_risk_level}</span>
                      <span>Gender Ratio: {biasResult.gender_balance.ratio}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Findings & Remediation */}
              <div className="lg:col-span-2 space-y-4">
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  Audit Findings & Inclusive Replacements ({biasResult?.findings.length || 0})
                </h3>

                <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                  {biasResult?.findings.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/60 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                            item.severity === 'HIGH' ? 'bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-200' :
                            item.severity === 'MEDIUM' ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-200' :
                            'bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-200'
                          }`}>
                            {item.severity} SEVERITY
                          </span>
                          <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                            {item.category}
                          </span>
                        </div>
                        <span className="text-xs font-mono font-bold text-rose-600 dark:text-rose-400">
                          "{item.term}"
                        </span>
                      </div>

                      <p className="text-xs text-slate-600 dark:text-slate-300">
                        {item.message}
                      </p>

                      <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-300 flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-semibold">Remediation: </span>
                          {item.recommended_fix}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Blind Recruitment Masking */}
        {activeTab === 'blind' && (
          <div className="pt-5 space-y-5">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 space-y-3">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <EyeOff className="w-4 h-4 text-indigo-600" />
                    Automated Candidate Anonymizer
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Redacts names, emails, phone numbers, gender pronouns (he/him/she/her to they/them), graduation years, and postal addresses to support blind first-round hiring evaluations.
                  </p>

                  <select
                    value={selectedResumeId}
                    onChange={(e) => setSelectedResumeId(e.target.value)}
                    className="w-full text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-slate-900 dark:text-slate-100"
                  >
                    {resumes.map(r => (
                      <option key={r.id} value={r.id}>{r.file_name} ({r.target_role || 'General'})</option>
                    ))}
                  </select>

                  <button
                    onClick={handleRunBlindMask}
                    disabled={isRedacting}
                    className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs flex items-center justify-center gap-2 transition-all shadow-sm"
                  >
                    {isRedacting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                    Generate Blind Dossier
                  </button>
                </div>

                {blindResult && (
                  <div className="p-4 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 space-y-2">
                    <div className="text-xs font-semibold text-emerald-800 dark:text-emerald-300 flex items-center justify-between">
                      <span>Assigned Alias: {blindResult.candidate_alias}</span>
                      <span className="px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200 text-[10px] font-bold">
                        {blindResult.compliance_status}
                      </span>
                    </div>
                    <div className="text-xs text-slate-600 dark:text-slate-400 pt-1">
                      {blindResult.redactions_count} de-identification redactions applied to protect fairness.
                    </div>
                  </div>
                )}
              </div>

              {/* Masked Output Preview */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    Redacted Blind Resume Dossier
                  </h3>
                  {blindResult?.masked_text && (
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(blindResult.masked_text);
                        setCopiedMasked(true);
                        setTimeout(() => setCopiedMasked(false), 2000);
                      }}
                      className="px-2.5 py-1 rounded bg-slate-100 dark:bg-slate-800 text-xs font-medium flex items-center gap-1.5 text-slate-700 dark:text-slate-300 hover:bg-slate-200"
                    >
                      {copiedMasked ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      {copiedMasked ? 'Copied' : 'Copy Blind Text'}
                    </button>
                  )}
                </div>

                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 font-mono text-xs text-slate-800 dark:text-slate-200 h-[380px] overflow-y-auto whitespace-pre-wrap leading-relaxed">
                  {blindResult?.masked_text || (
                    <span className="text-slate-400 italic">
                      Click "Generate Blind Dossier" to preview the anonymized candidate resume without demographic biases.
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
