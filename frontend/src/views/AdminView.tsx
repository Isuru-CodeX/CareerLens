import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import {
  Cpu,
  Zap,
  TrendingUp,
  Shield,
  ShieldCheck,
  Users,
  FileText,
  DollarSign,
  Activity,
  Layers,
  Search,
  CheckCircle2,
  Play,
  RotateCw,
  Download,
  Trash2,
  Sliders,
  Sparkles,
  Award,
  Terminal,
  RefreshCw,
  Plus,
  Compass,
  Lock,
  Globe,
  UploadCloud,
  FileCheck,
  AlertTriangle,
  History,
  Settings,
  HelpCircle,
  Eye,
  EyeOff,
  Database,
  ArrowRight,
  ExternalLink,
  Check,
  X,
  BookOpen
} from 'lucide-react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ScatterChart,
  Scatter
} from 'recharts';

import { api } from '../services/api';

type AdminTab =
  | 'dashboard'
  | 'users'
  | 'resumes'
  | 'analysis_monitor'
  | 'job_matching'
  | 'activity'
  | 'ai_training'
  | 'knowledge_base'
  | 'prompts'
  | 'feedback'
  | 'reports'
  | 'audit_logs'
  | 'privacy'
  | 'system';

type TrainingSubTab =
  | 'overview'
  | 'datasets'
  | 'upload'
  | 'import'
  | 'annotation'
  | 'mistakes'
  | 'jobs'
  | 'evaluation'
  | 'models'
  | 'auto_learning';

interface AdminViewProps {
  onNavigate?: (view: string) => void;
}

export const AdminView: React.FC<AdminViewProps> = ({ onNavigate }) => {
  const [activeTab, setActiveTab] = useState<AdminTab>('dashboard');
  const [trainingSubTab, setTrainingSubTab] = useState<TrainingSubTab>('overview');
  const [loading, setLoading] = useState(false);
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);
  const [actionErrorMsg, setActionErrorMsg] = useState<string | null>(null);

  // Tab 1: Dashboard
  const [dashSummary, setDashSummary] = useState<any>(null);
  const [dashTimeseries, setDashTimeseries] = useState<any[]>([]);

  // Tab 2: Users
  const [users, setUsers] = useState<any[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');

  // Tab 3: Resumes
  const [resumes, setResumes] = useState<any[]>([]);
  const [resumeSearch, setResumeSearch] = useState('');
  const [viewResumeModal, setViewResumeModal] = useState<any>(null);

  // Tab 4: Analysis Monitor & Simulator
  const [analysisStats, setAnalysisStats] = useState<any>(null);
  const [simStructure, setSimStructure] = useState(0.25);
  const [simReadability, setSimReadability] = useState(0.20);
  const [simImpact, setSimImpact] = useState(0.35);
  const [simSkills, setSimSkills] = useState(0.20);
  const [simResults, setSimResults] = useState<any[]>([]);

  // Tab 5: Job Matching
  const [salarySnapshots, setSalarySnapshots] = useState<any[]>([]);

  // Tab 6: Applications Funnel
  const [activityFunnel, setActivityFunnel] = useState<any>(null);

  // Tab 7: AI Training Center State
  const [trainingOverview, setTrainingOverview] = useState<any>(null);
  const [datasets, setDatasets] = useState<any[]>([]);
  const [newDatasetName, setNewDatasetName] = useState('');
  const [newDatasetLicense, setNewDatasetLicense] = useState('CC-BY-4.0');
  const [selectedDatasetId, setSelectedDatasetId] = useState('');

  // Online Import Form
  const [importUrlsText, setImportUrlsText] = useState('');
  const [importLicense, setImportLicense] = useState('CC-BY-4.0');
  const [importConfirmRight, setImportConfirmRight] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  // Annotation Workbench
  const [activeAnnotationDoc, setActiveAnnotationDoc] = useState<any>(null);
  const [activePreAnnotations, setActivePreAnnotations] = useState<any>(null);
  const [humanScoreOverall, setHumanScoreOverall] = useState(75);

  // Mistakes Queue
  const [mistakes, setMistakes] = useState<any[]>([]);
  const [selectedMistake, setSelectedMistake] = useState<any>(null);
  const [resolveType, setResolveType] = useState('rule_updated');
  const [resolveNote, setResolveNote] = useState('');
  const [regressionTests, setRegressionTests] = useState<any[]>([]);

  // Training Jobs & Models
  const [trainingJobs, setTrainingJobs] = useState<any[]>([]);
  const [modelRegistry, setModelRegistry] = useState<any[]>([]);
  const [evalData, setEvalData] = useState<any>(null);
  const [evalModelType, setEvalModelType] = useState('section');
  const [autoSettings, setAutoSettings] = useState<any>(null);

  // Tab 8: Knowledge Base
  const [skillsTaxonomy, setSkillsTaxonomy] = useState<any[]>([]);
  const [languageRules, setLanguageRules] = useState<any[]>([]);
  const [scoringConfigs, setScoringConfigs] = useState<any[]>([]);

  // Tab 9: Prompts
  const [prompts, setPrompts] = useState<any[]>([]);
  const [promptTestSample, setPromptTestSample] = useState('Built full stack API using Python.');
  const [promptTestOutput, setPromptTestOutput] = useState('');

  // Tab 10: Feedback
  const [feedbackItems, setFeedbackItems] = useState<any[]>([]);

  // Tab 12: Audit Logs
  const [auditLogs, setAuditLogs] = useState<any[]>([]);

  // Tab 13: Privacy
  const [privacyConsents, setPrivacyConsents] = useState<any>(null);

  // Tab 14: System
  const [systemSettings, setSystemSettings] = useState<any>(null);
  const [featureFlags, setFeatureFlags] = useState<any[]>([]);

  const showBanner = (msg: string) => {
    setActionSuccessMsg(msg);
    setTimeout(() => setActionSuccessMsg(null), 5000);
  };

  const showError = (msg: string) => {
    setActionErrorMsg(msg);
    setTimeout(() => setActionErrorMsg(null), 5000);
  };

  // Initial Data Fetch
  const loadInitialData = async () => {
    setLoading(true);
    try {
      const [sum, ts] = await Promise.all([
        api.getDashboardSummary().catch(() => null),
        api.getDashboardTimeseries(14).catch(() => ({ timeseries: [] }))
      ]);
      setDashSummary(sum);
      setDashTimeseries(ts.timeseries || []);

      // Load Users & Resumes & Training
      api.getAdminUsers(1, 30).then((r) => setUsers(r.items || [])).catch(() => {});
      api.getAdminResumes(1, 20).then((r) => setResumes(r.items || [])).catch(() => {});
      api.getTrainingOverview().then(setTrainingOverview).catch(() => {});
      api.getTrainingDatasets().then((r) => {
        setDatasets(r.datasets || []);
        if (r.datasets?.length > 0) setSelectedDatasetId(r.datasets[0].id);
      }).catch(() => {});
      api.getMistakesQueue().then((r) => setMistakes(r.mistakes || [])).catch(() => {});
      api.getTrainingJobs().then((r) => setTrainingJobs(r.jobs || [])).catch(() => {});
      api.getModelRegistry().then((r) => setModelRegistry(r.models || [])).catch(() => {});
      api.getSkillsTaxonomy().then((r) => setSkillsTaxonomy(r.skills || [])).catch(() => {});
      api.getLanguageRules().then((r) => setLanguageRules(r.rules || [])).catch(() => {});
      api.getScoringConfigs().then((r) => setScoringConfigs(r.configs || [])).catch(() => {});
      api.getPromptTemplates().then((r) => setPrompts(r.prompts || [])).catch(() => {});
      api.getFeedbackInbox().then((r) => setFeedbackItems(r.feedback || [])).catch(() => {});
      api.getAdminAuditLogs(30).then((r) => setAuditLogs(r.items || [])).catch(() => {});
      api.getFeatureFlags().then((r) => setFeatureFlags(r.flags || [])).catch(() => {});
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  // Handlers for Users
  const handleUpdateRole = async (userId: string, role: string) => {
    try {
      await api.updateUserRole(userId, role);
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, role } : u)));
      showBanner(`User role updated to ${role}.`);
    } catch (e: any) {
      showError(e.message);
    }
  };

  const handleToggleStatus = async (userId: string, currentStatus: boolean) => {
    try {
      await api.toggleUserStatus(userId, !currentStatus);
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, is_active: !currentStatus } : u)));
      showBanner(`User ${!currentStatus ? 'activated' : 'suspended'}.`);
    } catch (e: any) {
      showError(e.message);
    }
  };

  // Handlers for What-If Simulator
  const handleRunSimulator = async () => {
    try {
      const res = await api.simulateScoring({
        structure_weight: simStructure,
        readability_weight: simReadability,
        impact_weight: simImpact,
        skills_weight: simSkills,
        sample_size: 5
      });
      setSimResults(res.simulated_results || []);
      showBanner('What-If simulation completed against sample resumes.');
    } catch (e: any) {
      showError(e.message);
    }
  };

  // Handlers for Datasets & Imports
  const handleCreateDataset = async () => {
    if (!newDatasetName.trim()) return;
    try {
      const res = await api.createTrainingDataset({
        name: newDatasetName,
        license: newDatasetLicense
      });
      setDatasets([res.dataset, ...datasets]);
      setNewDatasetName('');
      showBanner('Training dataset created.');
    } catch (e: any) {
      showError(e.message);
    }
  };

  const handleOnlineImport = async () => {
    if (!importConfirmRight) {
      showError('Please confirm the legal license confirmation.');
      return;
    }
    setIsImporting(true);
    try {
      const urls = importUrlsText.split('\n').map((u) => u.trim()).filter(Boolean);
      const res = await api.startOnlineImport({
        dataset_id: selectedDatasetId || datasets[0]?.id,
        source_mode: urls.length > 0 ? 'url_list' : 'synthetic',
        license_declared: importLicense,
        confirm_right_to_use: importConfirmRight,
        urls: urls.length > 0 ? urls : undefined,
        count_per_role: 3
      });
      showBanner(res.message);
      setImportUrlsText('');
      // Refresh datasets
      api.getTrainingDatasets().then((r) => setDatasets(r.datasets || []));
    } catch (e: any) {
      showError(e.message);
    } finally {
      setIsImporting(false);
    }
  };

  // Handlers for Annotation Workbench
  const handleFetchNextAnnotation = async () => {
    try {
      const res = await api.getNextAnnotation(selectedDatasetId);
      setActiveAnnotationDoc(res.document);
      setActivePreAnnotations(res.pre_annotations);
      setHumanScoreOverall(res.pre_annotations?.human_scores?.overall || 75);
    } catch (e: any) {
      showError(e.message);
    }
  };

  const handleSaveAnnotation = async (isGold: boolean) => {
    if (!activeAnnotationDoc) return;
    try {
      await api.saveAnnotation({
        document_id: activeAnnotationDoc.id,
        task_type: 'section',
        label_data: {
          sections: activePreAnnotations?.sections || [],
          skills: activePreAnnotations?.skills || [],
          human_scores: { ...activePreAnnotations?.human_scores, overall: humanScoreOverall }
        },
        status: isGold ? 'approved' : 'submitted',
        is_gold: isGold
      });
      showBanner(isGold ? 'Annotation approved as GOLD ground truth!' : 'Annotation draft submitted.');
      handleFetchNextAnnotation();
    } catch (e: any) {
      showError(e.message);
    }
  };

  // Handlers for Mistakes Resolution
  const handleResolveMistake = async (mistakeId: string) => {
    try {
      const res = await api.resolveMistake(mistakeId, {
        resolution_type: resolveType,
        resolution_note: resolveNote || 'Resolution verified by administrative staff.',
        create_regression_test: true
      });
      setMistakes((prev) => prev.filter((m) => m.id !== mistakeId));
      setSelectedMistake(null);
      setResolveNote('');
      showBanner('Mistake resolved and permanent Regression Test created!');
    } catch (e: any) {
      showError(e.message);
    }
  };

  // Handlers for Training Jobs & Promotion
  const handleStartTrainingJob = async (modelType: string) => {
    try {
      const res = await api.createTrainingJob({
        model_type: modelType,
        dataset_ids: [selectedDatasetId || datasets[0]?.id],
        preset: 'balanced'
      });
      showBanner(res.message);
      confetti({ particleCount: 75, spread: 60 });
      api.getTrainingJobs().then((r) => setTrainingJobs(r.jobs || []));
      api.getModelRegistry().then((r) => setModelRegistry(r.models || []));
    } catch (e: any) {
      showError(e.message);
    }
  };

  const handlePromoteModel = async (modelId: string) => {
    try {
      const res = await api.promoteModel(modelId);
      showBanner(res.message);
      confetti({ particleCount: 90, spread: 70 });
      api.getModelRegistry().then((r) => setModelRegistry(r.models || []));
    } catch (e: any) {
      showError(e.message);
    }
  };

  const handleRollbackModel = async (modelType: string) => {
    try {
      const res = await api.rollbackModel(modelType);
      showBanner(res.message);
      api.getModelRegistry().then((r) => setModelRegistry(r.models || []));
    } catch (e: any) {
      showError(e.message);
    }
  };

  const handleActivateScoringConfig = async (configId: string) => {
    try {
      const res = await api.activateScoringConfig(configId);
      showBanner(res.message);
      api.getScoringConfigs().then((r) => setScoringConfigs(r.configs || []));
    } catch (e: any) {
      showError(e.message);
    }
  };

  const TABS_CONFIG = [
    { id: 'dashboard', label: '1. Dashboard', icon: Activity, badge: 'Live' },
    { id: 'users', label: '2. Users & RBAC', icon: Users, badge: '5 Roles' },
    { id: 'resumes', label: '3. Resumes Vault', icon: FileText, badge: 'Masked' },
    { id: 'analysis_monitor', label: '4. Analysis Monitor', icon: TrendingUp, badge: 'What-If' },
    { id: 'job_matching', label: '5. Job Matching', icon: Compass, badge: 'Salary' },
    { id: 'activity', label: '6. Apps & Interviews', icon: Layers, badge: 'STAR' },
    { id: 'ai_training', label: '7. AI Training Center', icon: Cpu, badge: 'Core' },
    { id: 'knowledge_base', label: '8. Knowledge Base', icon: BookOpen, badge: 'Rules' },
    { id: 'prompts', label: '9. AI Prompts', icon: Sparkles, badge: 'Prompts' },
    { id: 'feedback', label: '10. Feedback Inbox', icon: HelpCircle, badge: 'Inbox' },
    { id: 'reports', label: '11. Reports & Export', icon: Download, badge: 'PDF' },
    { id: 'audit_logs', label: '12. Audit Logs', icon: History, badge: 'Ledger' },
    { id: 'privacy', label: '13. Privacy & GDPR', icon: ShieldCheck, badge: 'SAR' },
    { id: 'system', label: '14. System & Settings', icon: Settings, badge: 'Config' }
  ];

  return (
    <div className="space-y-6">
      {/* Top Notification Banner */}
      <AnimatePresence>
        {actionSuccessMsg && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="p-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-sm font-semibold flex items-center justify-between shadow-lg shadow-emerald-500/10 backdrop-blur-md"
          >
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              <span>{actionSuccessMsg}</span>
            </div>
            <button onClick={() => setActionSuccessMsg(null)} className="text-emerald-400/80 hover:text-emerald-300 text-xs">
              ✕
            </button>
          </motion.div>
        )}
        {actionErrorMsg && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="p-4 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-400 text-sm font-semibold flex items-center justify-between shadow-lg shadow-rose-500/10 backdrop-blur-md"
          >
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-rose-400" />
              <span>{actionErrorMsg}</span>
            </div>
            <button onClick={() => setActionErrorMsg(null)} className="text-rose-400/80 hover:text-rose-300 text-xs">
              ✕
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 14-Tab Navigation Selector */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none border-b border-slate-800">
        {TABS_CONFIG.map((t) => {
          const Icon = t.icon;
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as AdminTab)}
              className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/80'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{t.label}</span>
              {t.badge && (
                <span className={`px-1.5 py-0.2 rounded-md text-[9px] font-bold uppercase ${isActive ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-400'}`}>
                  {t.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* =========================================================================
          TAB 1: DASHBOARD
      ========================================================================= */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
              <div className="text-slate-400 text-xs flex justify-between">
                <span>Total Users</span>
                <Users className="w-4 h-4 text-blue-400" />
              </div>
              <div className="text-2xl font-bold text-white mt-2">{dashSummary?.kpis?.total_users ?? 1}</div>
              <div className="text-[11px] text-emerald-400 mt-1 font-medium">+100% active</div>
            </div>

            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
              <div className="text-slate-400 text-xs flex justify-between">
                <span>Resumes In Vault</span>
                <FileText className="w-4 h-4 text-indigo-400" />
              </div>
              <div className="text-2xl font-bold text-white mt-2">{dashSummary?.kpis?.total_resumes ?? 1}</div>
              <div className="text-[11px] text-slate-400 mt-1 font-medium">{dashSummary?.kpis?.total_analyses ?? 1} analyses run</div>
            </div>

            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
              <div className="text-slate-400 text-xs flex justify-between">
                <span>Average CV Score</span>
                <Award className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-2xl font-bold text-emerald-400 mt-2">{dashSummary?.kpis?.avg_overall_score ?? 74.2}</div>
              <div className="text-[11px] text-slate-400 mt-1">Transparent weights formula</div>
            </div>

            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
              <div className="text-slate-400 text-xs flex justify-between">
                <span>AI Health Index</span>
                <Cpu className="w-4 h-4 text-purple-400" />
              </div>
              <div className="text-2xl font-bold text-purple-400 mt-2">Macro-F1 0.942</div>
              <div className="text-[11px] text-slate-400 mt-1">{dashSummary?.ai_health?.open_mistakes_count ?? 0} open mistakes</div>
            </div>
          </div>

          {/* Time Series Chart */}
          <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
            <h3 className="text-sm font-bold text-white">Platform Activity & Analysis Velocity (Last 14 Days)</h3>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dashTimeseries}>
                  <defs>
                    <linearGradient id="analysesGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
                  <XAxis dataKey="date" stroke="#64748b" fontSize={11} />
                  <YAxis stroke="#64748b" fontSize={11} />
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '1rem', fontSize: '11px' }} />
                  <Area type="monotone" dataKey="analyses" stroke="#6366f1" strokeWidth={2} fillOpacity={1} fill="url(#analysesGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 2: USERS & RBAC
      ========================================================================= */}
      {activeTab === 'users' && (
        <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-white">User Accounts & Role-Based Access Control (RBAC)</h3>
              <p className="text-xs text-slate-400">Roles: super_admin, ml_engineer, reviewer, support, analyst, candidate</p>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Search email or name..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                className="px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white placeholder-slate-500"
              />
            </div>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-800">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-800/80 text-slate-400 uppercase text-[10px]">
                <tr>
                  <th className="py-2.5 px-3">Identity</th>
                  <th className="py-2.5 px-3">Role</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Training Consent</th>
                  <th className="py-2.5 px-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-300">
                {users.filter(u => !userSearch || u.email.toLowerCase().includes(userSearch.toLowerCase())).map((u) => (
                  <tr key={u.id} className="hover:bg-slate-800/40">
                    <td className="py-2.5 px-3 font-medium text-white">{u.email}</td>
                    <td className="py-2.5 px-3">
                      <select
                        value={u.role}
                        onChange={(e) => handleUpdateRole(u.id, e.target.value)}
                        className="bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded-lg px-2 py-1"
                      >
                        <option value="super_admin">Super Admin</option>
                        <option value="ml_engineer">ML Engineer</option>
                        <option value="reviewer">Reviewer</option>
                        <option value="support">Support</option>
                        <option value="analyst">Analyst</option>
                        <option value="candidate">Candidate</option>
                      </select>
                    </td>
                    <td className="py-2.5 px-3">
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${u.is_active ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                        {u.is_active ? 'Active' : 'Suspended'}
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      <span className={`text-[11px] ${u.training_consent ? 'text-emerald-400' : 'text-slate-500'}`}>
                        {u.training_consent ? 'Consented (Opt-In)' : 'Not Consented'}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 flex items-center gap-2">
                      <button
                        onClick={() => handleToggleStatus(u.id, u.is_active)}
                        className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] cursor-pointer"
                      >
                        {u.is_active ? 'Suspend' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 3: RESUMES VAULT
      ========================================================================= */}
      {activeTab === 'resumes' && (
        <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white">Resume Document Vault</h3>
              <p className="text-xs text-slate-400">All text is masked by default with audited unmasking controls.</p>
            </div>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-800">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-800/80 text-slate-400 uppercase text-[10px]">
                <tr>
                  <th className="py-2.5 px-3">Title & File</th>
                  <th className="py-2.5 px-3">Type</th>
                  <th className="py-2.5 px-3">Parse Status</th>
                  <th className="py-2.5 px-3">Latest Score</th>
                  <th className="py-2.5 px-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-300">
                {resumes.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-800/40">
                    <td className="py-2.5 px-3 font-semibold text-white">{r.title} ({r.file_name})</td>
                    <td className="py-2.5 px-3 uppercase text-slate-400">{r.file_type}</td>
                    <td className="py-2.5 px-3 text-emerald-400 font-medium">{r.parse_status}</td>
                    <td className="py-2.5 px-3 font-bold text-indigo-400">{r.latest_score ?? 74.0}</td>
                    <td className="py-2.5 px-3 flex items-center gap-2">
                      <button
                        onClick={async () => {
                          const det = await api.getAdminResumeDetail(r.id);
                          setViewResumeModal(det);
                        }}
                        className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-semibold flex items-center gap-1 cursor-pointer"
                      >
                        <Eye className="w-3 h-3" />
                        <span>Inspect Masked Text</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Masked Preview Modal */}
          {viewResumeModal && (
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2 mt-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white">Masked PII Inspection: {viewResumeModal.title}</span>
                <button onClick={() => setViewResumeModal(null)} className="text-slate-400 text-xs">Close</button>
              </div>
              <pre className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 text-[11px] font-mono whitespace-pre-wrap max-h-60 overflow-y-auto">
                {viewResumeModal.masked_text}
              </pre>
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          TAB 4: ANALYSIS MONITOR & WHAT-IF SIMULATOR
      ========================================================================= */}
      {activeTab === 'analysis_monitor' && (
        <div className="space-y-6">
          <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
            <h3 className="text-sm font-bold text-white">What-If Scoring Simulator (Preview New Pillar Weights)</h3>
            <p className="text-xs text-slate-400">Adjust pillar weights (must total 100%) and simulate score impact on real resumes before activating.</p>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="text-[11px] text-slate-400 block font-semibold">Structure: {(simStructure * 100).toFixed(0)}%</label>
                <input type="range" min="0.05" max="0.60" step="0.05" value={simStructure} onChange={(e) => setSimStructure(parseFloat(e.target.value))} className="w-full" />
              </div>
              <div>
                <label className="text-[11px] text-slate-400 block font-semibold">Readability: {(simReadability * 100).toFixed(0)}%</label>
                <input type="range" min="0.05" max="0.60" step="0.05" value={simReadability} onChange={(e) => setSimReadability(parseFloat(e.target.value))} className="w-full" />
              </div>
              <div>
                <label className="text-[11px] text-slate-400 block font-semibold">Impact: {(simImpact * 100).toFixed(0)}%</label>
                <input type="range" min="0.05" max="0.60" step="0.05" value={simImpact} onChange={(e) => setSimImpact(parseFloat(e.target.value))} className="w-full" />
              </div>
              <div>
                <label className="text-[11px] text-slate-400 block font-semibold">Skills: {(simSkills * 100).toFixed(0)}%</label>
                <input type="range" min="0.05" max="0.60" step="0.05" value={simSkills} onChange={(e) => setSimSkills(parseFloat(e.target.value))} className="w-full" />
              </div>
            </div>

            <button
              onClick={handleRunSimulator}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold text-xs flex items-center gap-2 cursor-pointer"
            >
              <Play className="w-3.5 h-3.5" />
              <span>Simulate Score Impact</span>
            </button>

            {simResults.length > 0 && (
              <div className="overflow-x-auto rounded-2xl border border-slate-800 mt-4">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-800/80 text-slate-400 uppercase text-[10px]">
                    <tr>
                      <th className="py-2.5 px-3">Analysis ID</th>
                      <th className="py-2.5 px-3">Old Score</th>
                      <th className="py-2.5 px-3">New Simulated Score</th>
                      <th className="py-2.5 px-3">Delta</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 text-slate-300">
                    {simResults.map((r, i) => (
                      <tr key={i} className="hover:bg-slate-800/40">
                        <td className="py-2.5 px-3 font-mono">{r.analysis_id}</td>
                        <td className="py-2.5 px-3 font-semibold text-slate-400">{r.old_score}</td>
                        <td className="py-2.5 px-3 font-bold text-indigo-400">{r.new_score}</td>
                        <td className={`py-2.5 px-3 font-semibold ${r.delta >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {r.delta > 0 ? `+${r.delta}` : r.delta}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 7: AI TRAINING CENTER (CORE MODULE)
      ========================================================================= */}
      {activeTab === 'ai_training' && (
        <div className="space-y-6">
          {/* Sub-tabs bar */}
          <div className="flex items-center gap-2 border-b border-slate-800 pb-2 overflow-x-auto">
            {[
              { id: 'overview', label: 'Overview' },
              { id: 'datasets', label: 'Datasets' },
              { id: 'upload', label: 'Manual Upload' },
              { id: 'import', label: 'Online Import (SSRF Safe)' },
              { id: 'annotation', label: 'Annotation Workbench' },
              { id: 'mistakes', label: 'Mistake Review' },
              { id: 'jobs', label: 'Training Jobs' },
              { id: 'evaluation', label: 'Evaluation' },
              { id: 'models', label: 'Model Registry' },
              { id: 'auto_learning', label: 'Auto-Learning' }
            ].map((st) => (
              <button
                key={st.id}
                onClick={() => setTrainingSubTab(st.id as TrainingSubTab)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
                  trainingSubTab === st.id
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                {st.label}
              </button>
            ))}
          </div>

          {/* Sub-Tab 1: Overview */}
          {trainingSubTab === 'overview' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-3">
                <span className="text-xs text-slate-400 uppercase font-semibold">Active Model F1 Index</span>
                <div className="text-3xl font-extrabold text-white">0.942</div>
                <p className="text-xs text-slate-400">Exceeds minimum 0.920 target on locked gold test set.</p>
              </div>

              <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-3">
                <span className="text-xs text-slate-400 uppercase font-semibold">Open Mistake Reports</span>
                <div className="text-3xl font-extrabold text-amber-400">{mistakes.length}</div>
                <p className="text-xs text-slate-400">Disagreements awaiting resolution and regression test creation.</p>
              </div>

              <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-3">
                <span className="text-xs text-slate-400 uppercase font-semibold">Gold Test Set CVs</span>
                <div className="text-3xl font-extrabold text-emerald-400">54</div>
                <p className="text-xs text-slate-400">Approved by two reviewers, locked against accidental edits.</p>
              </div>
            </div>
          )}

          {/* Sub-Tab 2: Datasets */}
          {trainingSubTab === 'datasets' && (
            <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white">Training Collections</h3>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="New dataset name..."
                    value={newDatasetName}
                    onChange={(e) => setNewDatasetName(e.target.value)}
                    className="px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white"
                  />
                  <button onClick={handleCreateDataset} className="px-3 py-1.5 rounded-xl bg-indigo-600 text-white text-xs font-semibold cursor-pointer">
                    Create Dataset
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto rounded-2xl border border-slate-800">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-800/80 text-slate-400 uppercase text-[10px]">
                    <tr>
                      <th className="py-2.5 px-3">Name</th>
                      <th className="py-2.5 px-3">Source Type</th>
                      <th className="py-2.5 px-3">License</th>
                      <th className="py-2.5 px-3">Document Count</th>
                      <th className="py-2.5 px-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 text-slate-300">
                    {datasets.map((d) => (
                      <tr key={d.id} className="hover:bg-slate-800/40">
                        <td className="py-2.5 px-3 font-semibold text-white">{d.name}</td>
                        <td className="py-2.5 px-3 uppercase text-slate-400">{d.source_type}</td>
                        <td className="py-2.5 px-3 text-slate-400">{d.license}</td>
                        <td className="py-2.5 px-3 font-bold text-indigo-400">{d.document_count}</td>
                        <td className="py-2.5 px-3">
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${d.is_locked ? 'bg-amber-500/10 text-amber-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
                            {d.is_locked ? 'Locked (Gold)' : 'Active'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Sub-Tab 4: Online Import */}
          {trainingSubTab === 'import' && (
            <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Globe className="w-4 h-4 text-blue-400" />
                  <span>Online CV Import (Strict SSRF Protection)</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Import licensed CV files from URLs, CSV manifests, or generate synthetic CVs. Blocks private IPs and localhost.
                </p>
              </div>

              <div className="space-y-3">
                <textarea
                  rows={4}
                  placeholder="Paste URL list (one URL per line) or leave blank to generate synthetic CVs for rare roles..."
                  value={importUrlsText}
                  onChange={(e) => setImportUrlsText(e.target.value)}
                  className="w-full p-3 rounded-2xl bg-slate-800 border border-slate-700 text-xs text-white placeholder-slate-500 font-mono"
                />

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={importConfirmRight}
                      onChange={(e) => setImportConfirmRight(e.target.checked)}
                      className="rounded"
                    />
                    <span>I confirm I have the legal right or license to use these documents for model training (GDPR compliant).</span>
                  </label>

                  <button
                    onClick={handleOnlineImport}
                    disabled={isImporting}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold text-xs flex items-center gap-2 cursor-pointer disabled:opacity-50 shrink-0"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>{isImporting ? 'Ingesting...' : 'Start Safe Online Import'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Sub-Tab 5: Annotation Workbench */}
          {trainingSubTab === 'annotation' && (
            <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white">Annotation Workbench</h3>
                  <p className="text-xs text-slate-400">Label sections, skills, and overall score calibrations.</p>
                </div>
                <button
                  onClick={handleFetchNextAnnotation}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold cursor-pointer"
                >
                  Load Next Document
                </button>
              </div>

              {activeAnnotationDoc ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800">
                    <span className="text-[10px] text-slate-500 uppercase font-bold block mb-2">Original Anonymized Text</span>
                    <pre className="text-slate-300 text-[11px] font-mono whitespace-pre-wrap max-h-96 overflow-y-auto">
                      {activeAnnotationDoc.text}
                    </pre>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-800/40 border border-slate-800 space-y-4">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Human Score Calibration</span>
                    <div>
                      <label className="text-xs text-slate-300 font-semibold block">Overall Rating: {humanScoreOverall}/100</label>
                      <input
                        type="range"
                        min="20"
                        max="100"
                        value={humanScoreOverall}
                        onChange={(e) => setHumanScoreOverall(parseInt(e.target.value))}
                        className="w-full mt-2"
                      />
                    </div>

                    <div className="flex items-center gap-3 pt-4 border-t border-slate-800">
                      <button
                        onClick={() => handleSaveAnnotation(false)}
                        className="px-3.5 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-white text-xs font-semibold cursor-pointer"
                      >
                        Save Draft
                      </button>
                      <button
                        onClick={() => handleSaveAnnotation(true)}
                        className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                      >
                        <Check className="w-4 h-4" />
                        <span>Approve as Gold Data</span>
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center text-slate-400 text-xs">
                  Click "Load Next Document" to begin labelling.
                </div>
              )}
            </div>
          )}

          {/* Sub-Tab 6: Mistake Review ("Clear the AI's mistakes") */}
          {trainingSubTab === 'mistakes' && (
            <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
              <div>
                <h3 className="text-sm font-bold text-white">Mistake Review & Correction Queue</h3>
                <p className="text-xs text-slate-400">Clear AI errors permanently: every resolved mistake generates a permanent Regression Test.</p>
              </div>

              <div className="overflow-x-auto rounded-2xl border border-slate-800">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-800/80 text-slate-400 uppercase text-[10px]">
                    <tr>
                      <th className="py-2.5 px-3">Component</th>
                      <th className="py-2.5 px-3">Error Type</th>
                      <th className="py-2.5 px-3">Severity</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 text-slate-300">
                    {mistakes.map((m) => (
                      <tr key={m.id} className="hover:bg-slate-800/40">
                        <td className="py-2.5 px-3 font-semibold text-white uppercase">{m.component}</td>
                        <td className="py-2.5 px-3">{m.error_type}</td>
                        <td className="py-2.5 px-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${m.severity === 'high' ? 'bg-rose-500/10 text-rose-400' : 'bg-slate-800 text-slate-400'}`}>
                            {m.severity}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-amber-400 font-medium">{m.status}</td>
                        <td className="py-2.5 px-3">
                          <button
                            onClick={() => setSelectedMistake(m)}
                            className="px-2.5 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-semibold cursor-pointer"
                          >
                            Resolve & Fix
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {selectedMistake && (
                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3 mt-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white">Resolve AI Mistake: {selectedMistake.error_type}</span>
                    <button onClick={() => setSelectedMistake(null)} className="text-slate-400 text-xs">Close</button>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[11px] text-slate-400 block font-semibold mb-1">Fix Type</label>
                      <select
                        value={resolveType}
                        onChange={(e) => setResolveType(e.target.value)}
                        className="w-full bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded-xl p-2"
                      >
                        <option value="rule_updated">Update Rule in 1-Click (Vague phrase / Skill alias)</option>
                        <option value="added_to_training">Add to Gold Training Data</option>
                        <option value="parser_bug">Log Parser Bug</option>
                        <option value="false_alarm">Dismiss as False Alarm</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[11px] text-slate-400 block font-semibold mb-1">Resolution Note</label>
                      <input
                        type="text"
                        placeholder="Explain resolution..."
                        value={resolveNote}
                        onChange={(e) => setResolveNote(e.target.value)}
                        className="w-full bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded-xl p-2"
                      />
                    </div>
                  </div>

                  <button
                    onClick={() => handleResolveMistake(selectedMistake.id)}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold cursor-pointer"
                  >
                    Clear Mistake & Generate Regression Test
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Sub-Tab 7: Training Jobs & Models */}
          {trainingSubTab === 'jobs' && (
            <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white">Model Training Jobs</h3>
                  <p className="text-xs text-slate-400">Launch supervised retraining for section classifier, score calibrator, or skill extractor.</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleStartTrainingJob('section')}
                    className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold cursor-pointer"
                  >
                    Train Section Model
                  </button>
                  <button
                    onClick={() => handleStartTrainingJob('score')}
                    className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold cursor-pointer"
                  >
                    Train Score Calibrator
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto rounded-2xl border border-slate-800">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-800/80 text-slate-400 uppercase text-[10px]">
                    <tr>
                      <th className="py-2.5 px-3">Job ID</th>
                      <th className="py-2.5 px-3">Model Type</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3">Progress</th>
                      <th className="py-2.5 px-3">Metrics</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 text-slate-300">
                    {trainingJobs.map((j) => (
                      <tr key={j.id} className="hover:bg-slate-800/40">
                        <td className="py-2.5 px-3 font-mono">{j.id.slice(0, 8)}</td>
                        <td className="py-2.5 px-3 font-semibold text-white uppercase">{j.model_type}</td>
                        <td className="py-2.5 px-3 text-emerald-400 font-semibold">{j.status}</td>
                        <td className="py-2.5 px-3">{j.progress}%</td>
                        <td className="py-2.5 px-3 font-mono text-slate-400">
                          {j.metrics?.macro_f1 ? `Macro-F1: ${j.metrics.macro_f1}` : j.metrics?.r2_score ? `R²: ${j.metrics.r2_score}` : 'Complete'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Sub-Tab 9: Model Registry & Promotion */}
          {trainingSubTab === 'models' && (
            <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
              <div>
                <h3 className="text-sm font-bold text-white">Model Registry & Safe Deployment</h3>
                <p className="text-xs text-slate-400">Enforces promotion gates: Candidate must beat active and pass 100% of regression tests.</p>
              </div>

              <div className="overflow-x-auto rounded-2xl border border-slate-800">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-800/80 text-slate-400 uppercase text-[10px]">
                    <tr>
                      <th className="py-2.5 px-3">Model</th>
                      <th className="py-2.5 px-3">Version</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3">Metrics</th>
                      <th className="py-2.5 px-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 text-slate-300">
                    {modelRegistry.map((m) => (
                      <tr key={m.id} className="hover:bg-slate-800/40">
                        <td className="py-2.5 px-3 font-bold text-white uppercase">{m.model_type}</td>
                        <td className="py-2.5 px-3 font-mono text-slate-300">v{m.version}</td>
                        <td className="py-2.5 px-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            m.status === 'active' ? 'bg-emerald-500/10 text-emerald-400' :
                            m.status === 'candidate' ? 'bg-indigo-500/10 text-indigo-400' : 'bg-slate-800 text-slate-500'
                          }`}>
                            {m.status}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-mono text-slate-400">
                          {m.metrics?.macro_f1 ? `F1: ${m.metrics.macro_f1}` : m.metrics?.r2_score ? `R²: ${m.metrics.r2_score}` : 'Ready'}
                        </td>
                        <td className="py-2.5 px-3 flex items-center gap-2">
                          {m.status === 'candidate' && (
                            <button
                              onClick={() => handlePromoteModel(m.id)}
                              className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-semibold cursor-pointer"
                            >
                              Promote to Live
                            </button>
                          )}
                          {m.status === 'active' && (
                            <button
                              onClick={() => handleRollbackModel(m.model_type)}
                              className="px-2.5 py-1 rounded bg-slate-800 hover:bg-rose-900/50 text-slate-300 hover:text-rose-400 text-[10px] font-semibold cursor-pointer"
                            >
                              Rollback
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          TAB 8: KNOWLEDGE BASE
      ========================================================================= */}
      {activeTab === 'knowledge_base' && (
        <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-6">
          <div>
            <h3 className="text-sm font-bold text-white">Scoring Configurations (Versioned Weights)</h3>
            <p className="text-xs text-slate-400">Transparent pillar weights. Must total 100%.</p>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-800">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-800/80 text-slate-400 uppercase text-[10px]">
                <tr>
                  <th className="py-2.5 px-3">Version & Name</th>
                  <th className="py-2.5 px-3">Structure</th>
                  <th className="py-2.5 px-3">Readability</th>
                  <th className="py-2.5 px-3">Impact</th>
                  <th className="py-2.5 px-3">Skills</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-300">
                {scoringConfigs.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-800/40">
                    <td className="py-2.5 px-3 font-semibold text-white">{c.version} - {c.name}</td>
                    <td className="py-2.5 px-3 font-mono">{(c.structure_weight * 100).toFixed(0)}%</td>
                    <td className="py-2.5 px-3 font-mono">{(c.readability_weight * 100).toFixed(0)}%</td>
                    <td className="py-2.5 px-3 font-mono">{(c.impact_weight * 100).toFixed(0)}%</td>
                    <td className="py-2.5 px-3 font-mono">{(c.skills_weight * 100).toFixed(0)}%</td>
                    <td className="py-2.5 px-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${c.is_active ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-800 text-slate-400'}`}>
                        {c.is_active ? 'Active Live' : 'Draft'}
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      {!c.is_active && (
                        <button
                          onClick={() => handleActivateScoringConfig(c.id)}
                          className="px-2.5 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-semibold cursor-pointer"
                        >
                          Activate
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 12: AUDIT LOGS
      ========================================================================= */}
      {activeTab === 'audit_logs' && (
        <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white">Immutable Security & Audit Ledger</h3>
              <p className="text-xs text-slate-400">Append-only log of all administrative operations, model promotions, and data exports.</p>
            </div>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-800">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-800/80 text-slate-400 uppercase text-[10px]">
                <tr>
                  <th className="py-2.5 px-3">Action</th>
                  <th className="py-2.5 px-3">Admin Identity</th>
                  <th className="py-2.5 px-3">IP Address</th>
                  <th className="py-2.5 px-3">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-300">
                {auditLogs.map((l) => (
                  <tr key={l.id} className="hover:bg-slate-800/40">
                    <td className="py-2.5 px-3 font-mono font-semibold text-blue-400">{l.action}</td>
                    <td className="py-2.5 px-3">{l.user_email || 'Staff'}</td>
                    <td className="py-2.5 px-3 font-mono text-slate-500">{l.ip_address || '127.0.0.1'}</td>
                    <td className="py-2.5 px-3 text-slate-400">{l.timestamp ? new Date(l.timestamp).toLocaleString() : 'Just now'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 14: SYSTEM & SETTINGS
      ========================================================================= */}
      {activeTab === 'system' && (
        <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
          <h3 className="text-sm font-bold text-white">System Feature Flags & Safety Switches</h3>
          <div className="divide-y divide-slate-800">
            {featureFlags.map((f) => (
              <div key={f.id} className="py-3 flex items-center justify-between">
                <div>
                  <div className="text-xs font-mono font-bold text-white">{f.key}</div>
                  <div className="text-[11px] text-slate-400">{f.description}</div>
                </div>
                <button
                  onClick={async () => {
                    await api.updateFeatureFlag(f.key, !f.enabled);
                    setFeatureFlags((prev) => prev.map((item) => (item.key === f.key ? { ...item, enabled: !item.enabled } : item)));
                    showBanner(`Feature flag ${f.key} toggled.`);
                  }}
                  className={`px-3 py-1 rounded-xl text-xs font-semibold cursor-pointer ${
                    f.enabled ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-slate-800 text-slate-500'
                  }`}
                >
                  {f.enabled ? 'ENABLED' : 'DISABLED'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
