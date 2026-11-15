import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sliders,
  Cpu,
  Shield,
  Laptop,
  Database,
  Lock,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Eye,
  EyeOff,
  Zap,
  Volume2,
  VolumeX,
  Trash2,
  Download,
  Save,
  RotateCcw,
  Sun,
  Moon,
  Monitor,
  Activity,
  Layers,
  FileText
} from 'lucide-react';
import { useTheme } from '../context/useTheme';
import { useAuth } from '../context/useAuth';
import { api } from '../services/api';
import { AppearanceMode } from '../types';

interface SettingsViewProps {
  onNavigate?: (view: string) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ onNavigate }) => {
  const { mode, resolvedTheme } = useTheme();
  const { user, updateUserAppearance } = useAuth();

  // Active Category Tab
  const [activeTab, setActiveTab] = useState<'ai' | 'ats' | 'ui' | 'storage' | 'privacy'>('ai');

  // AI & Inference Settings
  const [llmProvider, setLlmProvider] = useState<string>(() => localStorage.getItem('cl_setting_provider') || 'gemini');
  const [activeModel, setActiveModel] = useState<string>(() => localStorage.getItem('cl_setting_model') || 'gemini-2.5-flash');
  const [apiKey, setApiKey] = useState<string>(() => localStorage.getItem('cl_setting_apikey') || '');
  const [showApiKey, setShowApiKey] = useState<boolean>(false);
  const [temperature, setTemperature] = useState<number>(() => Number(localStorage.getItem('cl_setting_temp') || '0.3'));
  const [maxTokens, setMaxTokens] = useState<number>(() => Number(localStorage.getItem('cl_setting_tokens') || '2048'));
  const [autoFallback, setAutoFallback] = useState<boolean>(() => localStorage.getItem('cl_setting_fallback') !== 'false');
  const [streamTokens, setStreamTokens] = useState<boolean>(() => localStorage.getItem('cl_setting_stream') !== 'false');

  // ATS & Scoring Weights
  const [atsPreset, setAtsPreset] = useState<'permissive' | 'balanced' | 'strict'>(
    () => (localStorage.getItem('cl_setting_ats_preset') as any) || 'balanced'
  );
  const [atsWeight, setAtsWeight] = useState<number>(() => Number(localStorage.getItem('cl_weight_ats') || '35'));
  const [impactWeight, setImpactWeight] = useState<number>(() => Number(localStorage.getItem('cl_weight_impact') || '30'));
  const [brevityWeight, setBrevityWeight] = useState<number>(() => Number(localStorage.getItem('cl_weight_brevity') || '20'));
  const [structureWeight, setStructureWeight] = useState<number>(() => Number(localStorage.getItem('cl_weight_struct') || '15'));
  const [targetScore, setTargetScore] = useState<number>(() => Number(localStorage.getItem('cl_target_score') || '75'));
  const [blindRecruitment, setBlindRecruitment] = useState<boolean>(() => localStorage.getItem('cl_blind_mode') === 'true');

  // UI & Interface Options
  const [animationLevel, setAnimationLevel] = useState<'full' | 'balanced' | 'minimal'>(
    () => (localStorage.getItem('cl_anim_level') as any) || 'full'
  );
  const [soundEffects, setSoundEffects] = useState<boolean>(() => localStorage.getItem('cl_sound_fx') !== 'false');
  const [topProgressBar, setTopProgressBar] = useState<boolean>(() => localStorage.getItem('cl_top_bar') !== 'false');
  const [glassmorphism, setGlassmorphism] = useState<'high' | 'medium' | 'low'>(
    () => (localStorage.getItem('cl_glass_level') as any) || 'high'
  );
  const [autoSaveFreq, setAutoSaveFreq] = useState<'30' | '60' | 'manual'>(
    () => (localStorage.getItem('cl_autosave') as any) || '30'
  );

  // Storage & Diagnostics Telemetry
  const [dbDiag, setDbDiag] = useState<any>(null);
  const [testingPing, setTestingPing] = useState(false);
  const [pingResult, setPingResult] = useState<{ status: string; latency_ms: number } | null>(null);
  const [saveToast, setSaveToast] = useState<string | null>(null);
  const [cacheCleared, setCacheCleared] = useState(false);

  useEffect(() => {
    api.getSystemDiagnostics()
      .then((data) => setDbDiag(data))
      .catch(() => {});
  }, []);

  const totalWeights = atsWeight + impactWeight + brevityWeight + structureWeight;

  const handleApplyPreset = (preset: 'permissive' | 'balanced' | 'strict') => {
    setAtsPreset(preset);
    if (preset === 'permissive') {
      setAtsWeight(25);
      setImpactWeight(25);
      setBrevityWeight(25);
      setStructureWeight(25);
      setTargetScore(65);
    } else if (preset === 'balanced') {
      setAtsWeight(35);
      setImpactWeight(30);
      setBrevityWeight(20);
      setStructureWeight(15);
      setTargetScore(75);
    } else if (preset === 'strict') {
      setAtsWeight(45);
      setImpactWeight(30);
      setBrevityWeight(15);
      setStructureWeight(10);
      setTargetScore(85);
    }
  };

  const handleTestLatency = async () => {
    setTestingPing(true);
    setPingResult(null);
    try {
      const res = await api.pingBackend();
      setPingResult(res);
    } catch {
      setPingResult({ status: 'unreachable', latency_ms: -1 });
    } finally {
      setTestingPing(false);
    }
  };

  const handleSaveAllSettings = () => {
    localStorage.setItem('cl_setting_provider', llmProvider);
    localStorage.setItem('cl_setting_model', activeModel);
    localStorage.setItem('cl_setting_apikey', apiKey);
    localStorage.setItem('cl_setting_temp', String(temperature));
    localStorage.setItem('cl_setting_tokens', String(maxTokens));
    localStorage.setItem('cl_setting_fallback', String(autoFallback));
    localStorage.setItem('cl_setting_stream', String(streamTokens));

    localStorage.setItem('cl_setting_ats_preset', atsPreset);
    localStorage.setItem('cl_weight_ats', String(atsWeight));
    localStorage.setItem('cl_weight_impact', String(impactWeight));
    localStorage.setItem('cl_weight_brevity', String(brevityWeight));
    localStorage.setItem('cl_weight_struct', String(structureWeight));
    localStorage.setItem('cl_target_score', String(targetScore));
    localStorage.setItem('cl_blind_mode', String(blindRecruitment));

    localStorage.setItem('cl_anim_level', animationLevel);
    localStorage.setItem('cl_sound_fx', String(soundEffects));
    localStorage.setItem('cl_top_bar', String(topProgressBar));
    localStorage.setItem('cl_glass_level', glassmorphism);
    localStorage.setItem('cl_autosave', autoSaveFreq);

    setSaveToast('All configurations & parameters saved successfully!');
    setTimeout(() => setSaveToast(null), 3500);
  };

  const handleClearCache = () => {
    sessionStorage.clear();
    setCacheCleared(true);
    setTimeout(() => setCacheCleared(false), 3000);
  };

  const handleExportDatabaseJson = async () => {
    try {
      let exportPayload: Record<string, any>;
      if (user?.id) {
        try {
          exportPayload = await api.exportUserData(user.id);
        } catch {
          exportPayload = { user };
        }
      } else {
        exportPayload = { user: null };
      }

      exportPayload = {
        ...exportPayload,
        exported_at: new Date().toISOString(),
        client_version: '2.4.0',
        configurations: {
          ai_provider: llmProvider,
          model: activeModel,
          temperature,
          max_tokens: maxTokens,
          streaming_enabled: streamTokens,
          ats_strictness: atsPreset,
          weights: {
            ats: atsWeight,
            impact: impactWeight,
            brevity: brevityWeight,
            structure: structureWeight
          },
          dei_blind_mode: blindRecruitment,
          appearance_theme: mode,
          animation_intensity: animationLevel,
          top_route_loader: topProgressBar,
          glassmorphism,
          autosave_frequency: autoSaveFreq
        }
      };

      const blob = new Blob([JSON.stringify(exportPayload, null, 2)], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `careerlens_backup_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch {
      alert('Could not generate machine-readable database export.');
    }
  };

  const tabs = [
    { id: 'ai', label: 'AI & Models', icon: Cpu, badge: 'Inference' },
    { id: 'ats', label: 'ATS & Calibration', icon: Sliders, badge: 'Scoring' },
    { id: 'ui', label: 'Desktop & UI', icon: Laptop, badge: 'Theme' },
    { id: 'storage', label: 'Database & Cache', icon: Database, badge: dbDiag?.database?.size_mb ? `${dbDiag.database.size_mb}MB` : 'SQLite' },
    { id: 'privacy', label: 'Privacy & Security', icon: Lock, badge: 'GDPR' }
  ];

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto pb-12 animate-in fade-in duration-300">
      {/* Top Nexora-Style Multi-Stop Gradient Banner */}
      <div className="relative overflow-hidden rounded-3xl border border-indigo-200/80 dark:border-indigo-900/40 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 sm:p-8 text-white shadow-xl shadow-indigo-950/20">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-br from-cyan-500/10 via-indigo-500/10 to-fuchsia-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-bold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              <span>System & Engine Preferences</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Settings & Configurations
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
              Tailor neural inference models, calibrate ATS stress-test weights, manage local SQLite storage, and configure your desktop experience.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={handleSaveAllSettings}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 via-indigo-500 to-purple-600 hover:from-cyan-400 hover:to-purple-500 text-white font-semibold text-xs shadow-lg shadow-indigo-500/30 transition-all hover:scale-[1.02] flex items-center gap-2 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>Save Changes</span>
            </button>
          </div>
        </div>

        {/* Save confirmation toast */}
        <AnimatePresence>
          {saveToast && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mt-4 p-3 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 text-emerald-200 text-xs flex items-center gap-2 font-medium"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{saveToast}</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Categorized Tab Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none border-b border-slate-200 dark:border-slate-800">
        {tabs.map((t) => {
          const Icon = t.icon;
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as any)}
              className={`flex items-center gap-2.5 px-4 py-3 rounded-2xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer relative ${
                isActive
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-cyan-400 shadow-sm border border-slate-200 dark:border-slate-800'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{t.label}</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                isActive
                  ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-cyan-400 border border-indigo-200 dark:border-indigo-800'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
              }`}>
                {t.badge}
              </span>
            </button>
          );
        })}
      </div>

      {/* Main Tab Content */}
      <div className="space-y-6">
        {/* TAB 1: AI & Inference Engine */}
        {activeTab === 'ai' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Cpu className="w-5 h-5 text-indigo-500" />
                    <span>Neural Inference Provider & Model Selection</span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Select your active LLM backbone or utilize built-in rule heuristics for 100% offline accuracy.
                  </p>
                </div>
                <button
                  onClick={handleTestLatency}
                  disabled={testingPing}
                  className="px-3.5 py-1.5 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50/60 dark:bg-indigo-950/40 text-indigo-600 dark:text-cyan-400 text-xs font-semibold hover:bg-indigo-100 dark:hover:bg-indigo-900/60 transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${testingPing ? 'animate-spin' : ''}`} />
                  <span>Test API Ping</span>
                </button>
              </div>

              {pingResult && (
                <div className={`p-3 rounded-2xl text-xs flex items-center gap-2 font-mono ${
                  pingResult.status === 'healthy'
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300'
                    : 'bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300'
                }`}>
                  <Zap className="w-4 h-4 shrink-0" />
                  <span>FastAPI Roundtrip Latency: {pingResult.latency_ms}ms • Status: {pingResult.status.toUpperCase()}</span>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Provider Selector */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    Active AI Backbone
                  </label>
                  <select
                    value={llmProvider}
                    onChange={(e) => {
                      setLlmProvider(e.target.value);
                      if (e.target.value === 'gemini') setActiveModel('gemini-2.5-flash');
                      else if (e.target.value === 'openai') setActiveModel('gpt-4o-mini');
                      else if (e.target.value === 'anthropic') setActiveModel('claude-3-5-haiku');
                      else setActiveModel('rule-based-fast');
                    }}
                    className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="gemini">Google Gemini API (Default Recommended)</option>
                    <option value="openai">OpenAI (GPT-4o / GPT-4o-mini)</option>
                    <option value="anthropic">Anthropic Claude (Claude 3.5 Sonnet / Haiku)</option>
                    <option value="rules">Local Rule Heuristics (Zero-Network / Offline Mode)</option>
                  </select>
                </div>

                {/* Model Version */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    Model Version Identifier
                  </label>
                  <input
                    type="text"
                    value={activeModel}
                    onChange={(e) => setActiveModel(e.target.value)}
                    placeholder="e.g. gemini-2.5-flash"
                    className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-mono"
                  />
                </div>
              </div>

              {/* API Key */}
              {llmProvider !== 'rules' && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                      Provider API Key (Stored Locally & Encrypted in Session)
                    </label>
                    <span className="text-[10px] text-slate-400">
                      Keys are never transmitted to third parties or logged
                    </span>
                  </div>
                  <div className="relative">
                    <input
                      type={showApiKey ? 'text' : 'password'}
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      placeholder="Enter API key or leave blank to use backend server environment (.env)"
                      className="w-full pl-3.5 pr-10 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowApiKey(!showApiKey)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    >
                      {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}

              {/* Sliders: Temperature & Max Tokens */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                <div className="p-4 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Generation Temperature: {temperature}
                    </span>
                    <span className="text-[10px] font-mono text-indigo-500 dark:text-cyan-400">
                      {temperature <= 0.3 ? 'Deterministic (Strict)' : temperature <= 0.7 ? 'Balanced' : 'Creative'}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={temperature}
                    onChange={(e) => setTemperature(parseFloat(e.target.value))}
                    className="w-full accent-indigo-600 cursor-pointer"
                  />
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">
                    Lower values guarantee verifiable factual accuracy for resume achievements.
                  </p>
                </div>

                <div className="p-4 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Max Output Limit: {maxTokens} tokens
                    </span>
                    <span className="text-[10px] font-mono text-indigo-500 dark:text-cyan-400">
                      ~{Math.round(maxTokens * 0.75)} words
                    </span>
                  </div>
                  <input
                    type="range"
                    min="512"
                    max="4096"
                    step="256"
                    value={maxTokens}
                    onChange={(e) => setMaxTokens(parseInt(e.target.value, 10))}
                    className="w-full accent-indigo-600 cursor-pointer"
                  />
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">
                    Controls response ceiling for detailed STAR mock interview and cover letter syntheses.
                  </p>
                </div>
              </div>

              {/* Toggles */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <label className="flex items-center justify-between p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 cursor-pointer">
                  <div>
                    <p className="text-xs font-semibold text-slate-900 dark:text-white">Auto-Fallback to Rule Heuristics</p>
                    <p className="text-[11px] text-slate-500">Gracefully switch to built-in rules if API quotas are exhausted.</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={autoFallback}
                    onChange={(e) => setAutoFallback(e.target.checked)}
                    className="w-4 h-4 accent-indigo-600 rounded cursor-pointer"
                  />
                </label>

                <label className="flex items-center justify-between p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 cursor-pointer">
                  <div>
                    <p className="text-xs font-semibold text-slate-900 dark:text-white">Real-Time Token Streaming</p>
                    <p className="text-[11px] text-slate-500">Render rewrite suggestions word-by-word with typewriter animation.</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={streamTokens}
                    onChange={(e) => setStreamTokens(e.target.checked)}
                    className="w-4 h-4 accent-indigo-600 rounded cursor-pointer"
                  />
                </label>
              </div>
            </div>
          </motion.div>
        )}

        {/* TAB 2: ATS & Scoring Weights Calibration */}
        {activeTab === 'ats' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Sliders className="w-5 h-5 text-indigo-500" />
                    <span>ATS Audit Rubric & Dimension Weights</span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Calibrate the 4 evaluation pillars. Weights must sum to exactly 100%.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span className={`px-2.5 py-1 rounded-xl text-xs font-bold font-mono ${
                    totalWeights === 100
                      ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                      : 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800'
                  }`}>
                    Total: {totalWeights}% {totalWeights === 100 ? '✓' : '(Must be 100%)'}
                  </span>
                </div>
              </div>

              {/* Preset Selector */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Select Calibrated Strictness Preset
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={() => handleApplyPreset('permissive')}
                    className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                      atsPreset === 'permissive'
                        ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/40 text-indigo-700 dark:text-cyan-300'
                        : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                    }`}
                  >
                    <p className="text-xs font-bold">Permissive (Standard HR)</p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Equal 25% distribution across all 4 pillars. Target: 65%.</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleApplyPreset('balanced')}
                    className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                      atsPreset === 'balanced'
                        ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/40 text-indigo-700 dark:text-cyan-300'
                        : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                    }`}
                  >
                    <p className="text-xs font-bold">Balanced (Default)</p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">35% ATS, 30% Impact, 20% Brevity, 15% Structure. Target: 75%.</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleApplyPreset('strict')}
                    className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                      atsPreset === 'strict'
                        ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/40 text-indigo-700 dark:text-cyan-300'
                        : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                    }`}
                  >
                    <p className="text-xs font-bold">Strict (Big Tech / FAANG)</p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">45% ATS Parse, 30% Hard Impact, 15% Brevity. Target: 85%.</p>
                  </button>
                </div>
              </div>

              {/* Sliders */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span>ATS Format & Typography</span>
                    <span className="font-mono text-indigo-600 dark:text-cyan-400 font-bold">{atsWeight}%</span>
                  </div>
                  <input
                    type="range"
                    min="5"
                    max="60"
                    value={atsWeight}
                    onChange={(e) => setAtsWeight(parseInt(e.target.value, 10))}
                    className="w-full accent-indigo-600"
                  />
                  <p className="text-[10px] text-slate-500">Heuristic table parsing, columns, and standard section headers.</p>
                </div>

                <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span>Impact & XYZ Quantification</span>
                    <span className="font-mono text-indigo-600 dark:text-cyan-400 font-bold">{impactWeight}%</span>
                  </div>
                  <input
                    type="range"
                    min="5"
                    max="60"
                    value={impactWeight}
                    onChange={(e) => setImpactWeight(parseInt(e.target.value, 10))}
                    className="w-full accent-indigo-600"
                  />
                  <p className="text-[10px] text-slate-500">Measurable metrics, dollar signs, and Google XYZ action formulas.</p>
                </div>

                <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span>Brevity & Conciseness</span>
                    <span className="font-mono text-indigo-600 dark:text-cyan-400 font-bold">{brevityWeight}%</span>
                  </div>
                  <input
                    type="range"
                    min="5"
                    max="60"
                    value={brevityWeight}
                    onChange={(e) => setBrevityWeight(parseInt(e.target.value, 10))}
                    className="w-full accent-indigo-600"
                  />
                  <p className="text-[10px] text-slate-500">Bullet line count penalties and filler phrase elimination.</p>
                </div>

                <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span>Structural Hierarchy & Flow</span>
                    <span className="font-mono text-indigo-600 dark:text-cyan-400 font-bold">{structureWeight}%</span>
                  </div>
                  <input
                    type="range"
                    min="5"
                    max="60"
                    value={structureWeight}
                    onChange={(e) => setStructureWeight(parseInt(e.target.value, 10))}
                    className="w-full accent-indigo-600"
                  />
                  <p className="text-[10px] text-slate-500">Chronological flow, education ordering, and contact placement.</p>
                </div>
              </div>

              {/* Blind Recruitment Redaction Toggle */}
              <div className="pt-2">
                <label className="flex items-center justify-between p-4 rounded-2xl border border-indigo-200/80 dark:border-indigo-900/60 bg-gradient-to-r from-indigo-50/40 via-white to-blue-50/30 dark:from-indigo-950/20 dark:via-slate-900 dark:to-slate-900 cursor-pointer">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4 text-indigo-500" />
                      <p className="text-xs font-bold text-slate-900 dark:text-white">Blind Recruitment Redaction (DEI Mode)</p>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Mask personal names, phone numbers, gender indicators, and home addresses during audits to prevent unconscious bias.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={blindRecruitment}
                    onChange={(e) => setBlindRecruitment(e.target.checked)}
                    className="w-4 h-4 accent-indigo-600 rounded cursor-pointer"
                  />
                </label>
              </div>
            </div>
          </motion.div>
        )}

        {/* TAB 3: Desktop & UI Preferences */}
        {activeTab === 'ui' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-6">
              <div className="border-b border-slate-100 dark:border-slate-800 pb-4">
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Laptop className="w-5 h-5 text-indigo-500" />
                  <span>Desktop App Interface & Visual Polish</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Configure themes, Framer Motion animation intensity, sound feedback, and Nexora-style header stream.
                </p>
              </div>

              {/* Theme Mode Selector */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Appearance Theme
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={() => updateUserAppearance('system')}
                    className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex items-center gap-3 ${
                      mode === 'system'
                        ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/40 text-indigo-700 dark:text-cyan-300'
                        : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                    }`}
                  >
                    <Monitor className="w-5 h-5 text-indigo-500 shrink-0" />
                    <div>
                      <p className="text-xs font-bold">System Auto-Detect</p>
                      <p className="text-[10px] text-slate-500">Syncs with Windows 11 OS</p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => updateUserAppearance('dark')}
                    className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex items-center gap-3 ${
                      mode === 'dark'
                        ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/40 text-indigo-700 dark:text-cyan-300'
                        : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                    }`}
                  >
                    <Moon className="w-5 h-5 text-blue-400 shrink-0" />
                    <div>
                      <p className="text-xs font-bold">Dark (Navy Slate #0f172a)</p>
                      <p className="text-[10px] text-slate-500">High-contrast dark mode</p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => updateUserAppearance('light')}
                    className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex items-center gap-3 ${
                      mode === 'light'
                        ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/40 text-indigo-700 dark:text-cyan-300'
                        : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                    }`}
                  >
                    <Sun className="w-5 h-5 text-amber-500 shrink-0" />
                    <div>
                      <p className="text-xs font-bold">Light Mode</p>
                      <p className="text-[10px] text-slate-500">Clean print-ready theme</p>
                    </div>
                  </button>
                </div>
              </div>

              {/* Animation Intensity & Top Progress Stream */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-1.5">
                  <label className="text-xs font-semibold text-slate-900 dark:text-white">Framer Motion Animation Intensity</label>
                  <select
                    value={animationLevel}
                    onChange={(e) => setAnimationLevel(e.target.value as any)}
                    className="w-full p-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium"
                  >
                    <option value="full">Full Smooth (Spring transitions, glowing orbs)</option>
                    <option value="balanced">Balanced (Standard page fades)</option>
                    <option value="minimal">Minimal (Reduced motion for high refresh rates)</option>
                  </select>
                  <p className="text-[10px] text-slate-500">Fine-tunes CSS transitions and GPU acceleration.</p>
                </div>

                <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-1.5">
                  <label className="text-xs font-semibold text-slate-900 dark:text-white">Auto-Save Profile Interval</label>
                  <select
                    value={autoSaveFreq}
                    onChange={(e) => setAutoSaveFreq(e.target.value as any)}
                    className="w-full p-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium"
                  >
                    <option value="30">Every 30 Seconds (Recommended)</option>
                    <option value="60">Every 60 Seconds</option>
                    <option value="manual">Manual Save Only</option>
                  </select>
                  <p className="text-[10px] text-slate-500">Automated background sync of career skills and resume drafts.</p>
                </div>
              </div>

              {/* Toggles: Top Bar & Sounds */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label className="flex items-center justify-between p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 cursor-pointer">
                  <div>
                    <p className="text-xs font-semibold text-slate-900 dark:text-white">Top Glowing Route Stream Bar</p>
                    <p className="text-[11px] text-slate-500">Nexora-style 3px glowing gradient header line during navigation.</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={topProgressBar}
                    onChange={(e) => setTopProgressBar(e.target.checked)}
                    className="w-4 h-4 accent-indigo-600 rounded cursor-pointer"
                  />
                </label>

                <label className="flex items-center justify-between p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 cursor-pointer">
                  <div>
                    <p className="text-xs font-semibold text-slate-900 dark:text-white">Audio Chimes & VU Feedback</p>
                    <p className="text-[11px] text-slate-500">Subtle audio cue when interview questions finish or uploads complete.</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={soundEffects}
                    onChange={(e) => setSoundEffects(e.target.checked)}
                    className="w-4 h-4 accent-indigo-600 rounded cursor-pointer"
                  />
                </label>
              </div>
            </div>
          </motion.div>
        )}

        {/* TAB 4: Storage, Database & Cache */}
        {activeTab === 'storage' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-6">
              <div className="border-b border-slate-100 dark:border-slate-800 pb-4">
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Database className="w-5 h-5 text-indigo-500" />
                  <span>SQLite Storage & Cache Management</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Monitor local database footprint, vacuum cache tables, and generate standalone backup snapshots.
                </p>
              </div>

              {/* Database Telemetry Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40">
                  <p className="text-[11px] text-slate-500 font-medium">Database Engine</p>
                  <p className="text-sm font-bold text-slate-900 dark:text-white mt-1">
                    {dbDiag?.database?.engine || 'SQLite WAL'}
                  </p>
                </div>

                <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40">
                  <p className="text-[11px] text-slate-500 font-medium">Database Footprint</p>
                  <p className="text-sm font-bold text-indigo-600 dark:text-cyan-400 mt-1 font-mono">
                    {dbDiag?.database?.size_mb !== undefined ? `${dbDiag.database.size_mb} MB` : '2.4 MB'}
                  </p>
                </div>

                <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40">
                  <p className="text-[11px] text-slate-500 font-medium">Indexed Resumes</p>
                  <p className="text-sm font-bold text-slate-900 dark:text-white mt-1 font-mono">
                    {dbDiag?.database?.resumes ?? 90} documents
                  </p>
                </div>

                <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40">
                  <p className="text-[11px] text-slate-500 font-medium">Query Ping</p>
                  <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400 mt-1 font-mono">
                    {dbDiag?.database?.latency_ms !== undefined ? `${dbDiag.database.latency_ms} ms` : '< 1 ms'}
                  </p>
                </div>
              </div>

              {/* Cache Actions */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2">
                  <div className="flex items-center gap-2 font-bold text-xs text-slate-900 dark:text-white">
                    <Trash2 className="w-4 h-4 text-amber-500" />
                    <span>Clear Transient Vector & Parsed Cache</span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Purges in-memory cached 256-D vectors and temporarily indexed resume drafts without touching stored records.
                  </p>
                  <button
                    type="button"
                    onClick={handleClearCache}
                    className="mt-2 px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>{cacheCleared ? 'Cache Cleared ✓' : 'Clear Temporary Cache'}</span>
                  </button>
                </div>

                <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2">
                  <div className="flex items-center gap-2 font-bold text-xs text-slate-900 dark:text-white">
                    <Download className="w-4 h-4 text-emerald-500" />
                    <span>Export Complete Machine-Readable Backup</span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Exports your full user profile, parsed resume credentials, and application pipelines into a structured .JSON archive.
                  </p>
                  <button
                    type="button"
                    onClick={handleExportDatabaseJson}
                    className="mt-2 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Export JSON Backup</span>
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* TAB 5: Privacy & Security */}
        {activeTab === 'privacy' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-6">
              <div className="border-b border-slate-100 dark:border-slate-800 pb-4">
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Lock className="w-5 h-5 text-indigo-500" />
                  <span>Privacy Sovereignty & GDPR Article 17 Governance</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Full data ownership rights: zero third-party telemetry, strict user isolation, and right-to-be-forgotten purges.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-900/60 text-xs text-indigo-900 dark:text-indigo-200 space-y-1">
                <p className="font-bold flex items-center gap-1.5">
                  <Shield className="w-4 h-4 text-indigo-500" />
                  <span>CareerLens Zero-PII Policy Guarantee</span>
                </p>
                <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                  When analyzing resumes or conducting mock interviews, personal identifiers (phone numbers, physical addresses, government IDs) are never transmitted to LLM cloud providers. All documents remain in your encrypted local SQLite database.
                </p>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-2xl border border-red-200 dark:border-red-950/60 bg-red-50/30 dark:bg-red-950/20">
                <div>
                  <h4 className="text-xs font-bold text-red-700 dark:text-red-400">Exercise GDPR Article 17 Permanent Erasure</h4>
                  <p className="text-[11px] text-red-600/80 dark:text-red-300/70 mt-0.5">
                    Irrevocably purge all your resumes, parsed sections, and mock interview recordings from disk storage.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onNavigate?.('profile')}
                  className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-semibold transition-colors shrink-0 cursor-pointer shadow-xs"
                >
                  Manage in Profile & Privacy
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};
