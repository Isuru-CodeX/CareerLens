import React, { useState, useEffect, useMemo } from 'react';
import {
  Compass,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Award,
  Layers,
  Search,
  BookOpen,
  DollarSign,
  TrendingUp,
  RefreshCw,
  Zap,
  Target
} from 'lucide-react';
import {
  CareerNode,
  CareerKnowledgeGraphData,
  CareerBridgeResponse,
  Resume
} from '../../types';
import { api } from '../../services/api';

interface CareerKnowledgeGraphProps {
  resumes?: Resume[];
  onNavigateToSalary?: (roleTitle: string) => void;
}

const CATEGORY_COLORS: Record<string, { bg: string; border: string; text: string; fill: string; dot: string }> = {
  Frontend: { bg: 'bg-sky-50 dark:bg-sky-950/60', border: 'border-sky-300 dark:border-sky-800', text: 'text-sky-700 dark:text-sky-300', fill: '#0284c7', dot: 'bg-sky-500' },
  'Full Stack': { bg: 'bg-indigo-50 dark:bg-indigo-950/60', border: 'border-indigo-300 dark:border-indigo-800', text: 'text-indigo-700 dark:text-indigo-300', fill: '#4f46e5', dot: 'bg-indigo-500' },
  Backend: { bg: 'bg-emerald-50 dark:bg-emerald-950/60', border: 'border-emerald-300 dark:border-emerald-800', text: 'text-emerald-700 dark:text-emerald-300', fill: '#059669', dot: 'bg-emerald-500' },
  'DevOps & Cloud': { bg: 'bg-amber-50 dark:bg-amber-950/60', border: 'border-amber-300 dark:border-amber-800', text: 'text-amber-700 dark:text-amber-300', fill: '#d97706', dot: 'bg-amber-500' },
  'Data & AI': { bg: 'bg-purple-50 dark:bg-purple-950/60', border: 'border-purple-300 dark:border-purple-800', text: 'text-purple-700 dark:text-purple-300', fill: '#9333ea', dot: 'bg-purple-500' },
  Security: { bg: 'bg-rose-50 dark:bg-rose-950/60', border: 'border-rose-300 dark:border-rose-800', text: 'text-rose-700 dark:text-rose-300', fill: '#e11d48', dot: 'bg-rose-500' },
  Management: { bg: 'bg-teal-50 dark:bg-teal-950/60', border: 'border-teal-300 dark:border-teal-800', text: 'text-teal-700 dark:text-teal-300', fill: '#0d9488', dot: 'bg-teal-500' }
};

export const CareerKnowledgeGraph: React.FC<CareerKnowledgeGraphProps> = ({
  resumes = [],
  onNavigateToSalary
}) => {
  const [graphData, setGraphData] = useState<CareerKnowledgeGraphData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedNode, setSelectedNode] = useState<CareerNode | null>(null);

  // Pathfinding Bridge State
  const [currentRoleId, setCurrentRoleId] = useState<string>('junior_frontend');
  const [targetRoleId, setTargetRoleId] = useState<string>('senior_fullstack');
  const [selectedResumeId, setSelectedResumeId] = useState<string>('');
  const [bridgeResult, setBridgeResult] = useState<CareerBridgeResponse | null>(null);
  const [computingBridge, setComputingBridge] = useState<boolean>(false);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedLevel, setSelectedLevel] = useState<number | 'all'>('all');

  // Load Graph Data
  useEffect(() => {
    let active = true;
    setLoading(true);
    api.getCareerKnowledgeGraph()
      .then((data) => {
        if (!active) return;
        setGraphData(data);
        if (data.nodes.length > 0) {
          const defaultCurrent = data.nodes.find((n) => n.id === 'junior_frontend') || data.nodes[0];
          const defaultTarget = data.nodes.find((n) => n.id === 'senior_fullstack') || data.nodes[1];
          setSelectedNode(defaultCurrent);
          setCurrentRoleId(defaultCurrent.id);
          setTargetRoleId(defaultTarget.id);
        }
      })
      .catch((err) => console.error('Failed to load career knowledge graph:', err))
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  // Set default resume if available
  useEffect(() => {
    if (resumes && resumes.length > 0 && !selectedResumeId) {
      setSelectedResumeId(resumes[0].id);
    }
  }, [resumes, selectedResumeId]);

  // Handle Dijkstra Bridge calculation
  const handleComputeBridge = async () => {
    if (!currentRoleId || !targetRoleId) return;
    setComputingBridge(true);
    try {
      const resume = resumes.find((r) => r.id === selectedResumeId);
      const skills = (resume?.skills || []).map((s: any) => (typeof s === 'string' ? s : s.name));

      const res = await api.computeCareerBridge({
        current_role_id: currentRoleId,
        target_role_id: targetRoleId,
        candidate_skills: skills,
        resume_id: selectedResumeId || undefined
      });
      setBridgeResult(res);
    } catch (err: any) {
      console.error('Career bridge calculation failed:', err);
    } finally {
      setComputingBridge(false);
    }
  };

  // Run initial bridge calculation when graph loads
  useEffect(() => {
    if (graphData && currentRoleId && targetRoleId && !bridgeResult) {
      handleComputeBridge();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [graphData]);

  // Filtered nodes
  const filteredNodes = useMemo(() => {
    if (!graphData) return [];
    return graphData.nodes.filter((node) => {
      const matchesSearch =
        searchQuery === '' ||
        node.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        node.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        node.core_skills.some((s) => s.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesCat = selectedCategory === 'all' || node.category === selectedCategory;
      const matchesLevel = selectedLevel === 'all' || node.level === selectedLevel;

      return matchesSearch && matchesCat && matchesLevel;
    });
  }, [graphData, searchQuery, selectedCategory, selectedLevel]);

  // Group nodes by Level for layout columns
  const nodesByLevel = useMemo(() => {
    const map: Record<number, CareerNode[]> = { 1: [], 2: [], 3: [], 4: [] };
    filteredNodes.forEach((node) => {
      if (map[node.level]) {
        map[node.level].push(node);
      }
    });
    return map;
  }, [filteredNodes]);

  // Check if role is in active bridge path
  const isNodeInPath = (nodeId: string) => {
    if (!bridgeResult || !bridgeResult.path) return false;
    return bridgeResult.path.includes(nodeId);
  };

  const getPathIndex = (nodeId: string) => {
    if (!bridgeResult || !bridgeResult.path) return -1;
    return bridgeResult.path.indexOf(nodeId);
  };

  if (loading) {
    return (
      <div className="p-12 text-center space-y-4">
        <RefreshCw className="w-8 h-8 animate-spin text-indigo-600 mx-auto" />
        <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">
          Compiling Career Knowledge Graph taxonomy & directed transitions...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Top Controls: Pathfinding Engine Toolbar */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-bold text-xs uppercase tracking-wider">
              <Compass className="w-4 h-4" />
              <span>Dijkstra Shortest-Path Career Bridge</span>
            </div>
            <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white mt-1">
              Career Path Knowledge Graph & Skill Navigator
            </h2>
          </div>

          {/* Resume Sync Selector */}
          {resumes.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-500">Sync with Resume:</span>
              <select
                value={selectedResumeId}
                onChange={(e) => setSelectedResumeId(e.target.value)}
                className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              >
                {resumes.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.title || r.file_name} ({r.role_category || 'General'})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Bridge Role Selectors */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
          <div className="sm:col-span-5 space-y-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              Current / Baseline Role
            </label>
            <select
              value={currentRoleId}
              onChange={(e) => setCurrentRoleId(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs sm:text-sm font-semibold focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            >
              {(graphData?.nodes || []).map((n) => (
                <option key={`curr_${n.id}`} value={n.id}>
                  {n.title} • {n.level_label} (${(n.salary_median / 1000).toFixed(0)}k)
                </option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-2 flex justify-center py-1">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/80 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <ArrowRight className="w-5 h-5" />
            </div>
          </div>

          <div className="sm:col-span-5 space-y-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-indigo-500" />
              Target / Dream Role
            </label>
            <div className="flex gap-2">
              <select
                value={targetRoleId}
                onChange={(e) => setTargetRoleId(e.target.value)}
                className="flex-1 px-3.5 py-2.5 rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs sm:text-sm font-semibold focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              >
                {(graphData?.nodes || []).map((n) => (
                  <option key={`tgt_${n.id}`} value={n.id}>
                    {n.title} • {n.level_label} (${(n.salary_median / 1000).toFixed(0)}k)
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={handleComputeBridge}
                disabled={computingBridge}
                className="px-4 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition-colors shrink-0 cursor-pointer"
              >
                {computingBridge ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                <span>Calculate Path</span>
              </button>
            </div>
          </div>
        </div>

        {/* Filters and Search row */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Search roles or skills..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-slate-400">Category:</span>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300"
            >
              <option value="all">All Domains</option>
              {(graphData?.categories || []).map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>

            <span className="text-[11px] font-bold text-slate-400 ml-2">Level:</span>
            <select
              value={selectedLevel}
              onChange={(e) => setSelectedLevel(e.target.value === 'all' ? 'all' : Number(e.target.value))}
              className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300"
            >
              <option value="all">All Tiers</option>
              <option value={1}>L1 (Entry 0-2y)</option>
              <option value={2}>L2 (Mid 2-5y)</option>
              <option value={3}>L3 (Senior 5-8y)</option>
              <option value={4}>L4 (Staff/Lead 8y+)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Graph Grid / Stage */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left: 4-Tier Interactive Knowledge Matrix (8 Cols) */}
        <div className="lg:col-span-8 space-y-6">
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-6">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-600" />
                <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
                  Technical Progression Hierarchy
                </h3>
              </div>
              <span className="text-xs text-slate-500 font-semibold">
                Showing {filteredNodes.length} nodes across 4 tiers
              </span>
            </div>

            {/* 4 Levels Rendered as Structured Visual Progression Columns */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {[
                { level: 1, title: 'Tier 1: Entry', subtitle: '0-2 Yrs Experience' },
                { level: 2, title: 'Tier 2: Mid Level', subtitle: '2-5 Yrs Experience' },
                { level: 3, title: 'Tier 3: Senior', subtitle: '5-8 Yrs Experience' },
                { level: 4, title: 'Tier 4: Staff / Lead', subtitle: '8+ Yrs Experience' }
              ].map((tier) => (
                <div key={tier.level} className="space-y-3">
                  <div className="pb-2 border-b-2 border-indigo-500/20">
                    <h4 className="text-xs font-black text-slate-800 dark:text-slate-200">{tier.title}</h4>
                    <p className="text-[10px] text-slate-400 font-medium">{tier.subtitle}</p>
                  </div>

                  <div className="space-y-2.5">
                    {(nodesByLevel[tier.level] || []).map((node) => {
                      const inPath = isNodeInPath(node.id);
                      const pathIdx = getPathIndex(node.id);
                      const isSelected = selectedNode?.id === node.id;
                      const catStyle = CATEGORY_COLORS[node.category] || CATEGORY_COLORS['Full Stack'];

                      return (
                        <div
                          key={node.id}
                          onClick={() => setSelectedNode(node)}
                          className={`p-3 rounded-2xl border transition-all cursor-pointer relative ${
                            inPath
                              ? 'bg-indigo-50/90 dark:bg-indigo-950/80 border-indigo-500 ring-2 ring-indigo-500/30 shadow-md scale-102'
                              : isSelected
                              ? 'border-indigo-400 bg-slate-50 dark:bg-slate-800/80'
                              : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700'
                          }`}
                        >
                          {/* Bridge Sequence Pin */}
                          {inPath && (
                            <div className="absolute -top-2.5 -right-2.5 w-6 h-6 rounded-full bg-indigo-600 text-white font-black text-[10px] flex items-center justify-center shadow-md border-2 border-white dark:border-slate-900">
                              {pathIdx + 1}
                            </div>
                          )}

                          <div className="flex items-center gap-1.5 mb-1">
                            <span className={`w-1.5 h-1.5 rounded-full ${catStyle.dot}`} />
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider truncate">
                              {node.category}
                            </span>
                          </div>

                          <h5 className="text-xs font-bold text-slate-900 dark:text-white line-clamp-1 leading-snug">
                            {node.title}
                          </h5>

                          <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 dark:border-slate-800/60 text-[11px]">
                            <span className="font-bold text-indigo-600 dark:text-indigo-400">
                              ${(node.salary_median / 1000).toFixed(0)}k/yr
                            </span>
                            <span className="text-[10px] font-semibold text-slate-400">
                              {node.core_skills.length} skills
                            </span>
                          </div>
                        </div>
                      );
                    })}

                    {(nodesByLevel[tier.level] || []).length === 0 && (
                      <div className="p-4 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-center text-[11px] text-slate-400">
                        No matches in tier
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Path Bridge Feasibility Scorecard */}
          {bridgeResult && (
            <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-indigo-600" />
                  <div>
                    <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
                      Optimal Bridge Roadmap Analysis
                    </h3>
                    <p className="text-xs text-slate-500 font-medium">
                      From {bridgeResult.current_role.title} → {bridgeResult.target_role.title}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-[10px] uppercase font-bold text-slate-400">Salary Uplift</p>
                    <p className="text-sm font-black text-emerald-600 dark:text-emerald-400">
                      +${(bridgeResult.salary_delta / 1000).toFixed(0)}k / year
                    </p>
                  </div>

                  <div className="p-2.5 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 flex items-center gap-2">
                    <div className="text-right">
                      <p className="text-[10px] uppercase font-bold text-slate-400">Feasibility</p>
                      <p className="text-base font-black text-indigo-600 dark:text-indigo-400">
                        {bridgeResult.feasibility_score}%
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Milestones Sequencer */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Progression Sequence ({bridgeResult.total_estimated_months} Months Est.)
                </h4>
                <div className="flex flex-wrap items-center gap-2">
                  {bridgeResult.milestones.map((milestone, idx) => (
                    <React.Fragment key={milestone.id}>
                      <div className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-indigo-600 text-white font-black text-[10px] flex items-center justify-center">
                          {idx + 1}
                        </span>
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{milestone.title}</span>
                      </div>
                      {idx < bridgeResult.milestones.length - 1 && (
                        <ArrowRight className="w-4 h-4 text-slate-400 shrink-0" />
                      )}
                    </React.Fragment>
                  ))}
                </div>
              </div>

              {/* Categorized Skill Gaps: Verified (green), Transferrable (amber), Missing (red) */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                {/* Verified Skills */}
                <div className="p-4 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/80 space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-800 dark:text-emerald-300">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Verified Skills ({bridgeResult.verified_skills.length})</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {bridgeResult.verified_skills.map((s) => (
                      <span
                        key={s.name}
                        className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200"
                      >
                        {s.name}
                      </span>
                    ))}
                    {bridgeResult.verified_skills.length === 0 && (
                      <span className="text-[11px] text-slate-400 italic">No verified skills detected from resume</span>
                    )}
                  </div>
                </div>

                {/* Transferrable Skills */}
                <div className="p-4 rounded-2xl bg-amber-50/60 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/80 space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-amber-800 dark:text-amber-300">
                    <Sparkles className="w-4 h-4" />
                    <span>Transferrable ({bridgeResult.transferrable_skills.length})</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {bridgeResult.transferrable_skills.map((s) => (
                      <span
                        key={s.name}
                        title={s.transferrable_reason}
                        className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200 cursor-help"
                      >
                        {s.name}
                      </span>
                    ))}
                    {bridgeResult.transferrable_skills.length === 0 && (
                      <span className="text-[11px] text-slate-400 italic">No adjacent transferrable skills</span>
                    )}
                  </div>
                </div>

                {/* Missing Prerequisite Gaps */}
                <div className="p-4 rounded-2xl bg-rose-50/60 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/80 space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-rose-800 dark:text-rose-300">
                    <AlertCircle className="w-4 h-4" />
                    <span>Missing Gaps ({bridgeResult.missing_skills.length})</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {bridgeResult.missing_skills.map((s) => (
                      <span
                        key={s.name}
                        className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-rose-100 dark:bg-rose-900/60 text-rose-800 dark:text-rose-200"
                      >
                        {s.name}
                      </span>
                    ))}
                    {bridgeResult.missing_skills.length === 0 && (
                      <span className="text-[11px] text-slate-400 italic">No missing gaps! You meet 100% of criteria</span>
                    )}
                  </div>
                </div>
              </div>

              {/* 3-Phase Structured Learning Roadmap */}
              {bridgeResult.learning_roadmap.length > 0 && (
                <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                    <BookOpen className="w-4 h-4 text-indigo-600" />
                    Targeted Upskilling Execution Roadmap
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {bridgeResult.learning_roadmap.map((phase) => (
                      <div
                        key={phase.phase}
                        className="p-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40 space-y-2"
                      >
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-black text-indigo-600 dark:text-indigo-400">{phase.phase}</span>
                          <span className="font-bold text-slate-400">{phase.duration_weeks}</span>
                        </div>
                        <p className="text-xs font-bold text-slate-800 dark:text-slate-200 leading-snug">{phase.focus}</p>
                        <div className="flex flex-wrap gap-1">
                          {phase.skills.map((sk) => (
                            <span key={sk} className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-600">
                              {sk}
                            </span>
                          ))}
                        </div>
                        <p className="text-[11px] text-slate-500 pt-1 border-t border-slate-200 dark:border-slate-700">
                          <strong>Project:</strong> {phase.recommended_project}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right: Selected Role Deep Inspector (4 Cols) */}
        <div className="lg:col-span-4 space-y-6">
          {selectedNode ? (
            <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-5 sticky top-24">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                  {selectedNode.level_label}
                </span>
                <span className="text-xs font-bold text-slate-400">{selectedNode.category}</span>
              </div>

              <div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white leading-tight">
                  {selectedNode.title}
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed mt-2">
                  {selectedNode.description}
                </p>
              </div>

              {/* Salary Band Indicator */}
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-slate-500">Industry Compensation Range</span>
                  <span className="text-emerald-600 font-black">${(selectedNode.salary_median / 1000).toFixed(0)}k Median</span>
                </div>
                <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden flex">
                  <div className="bg-emerald-500 h-full w-full rounded-full" />
                </div>
                <div className="flex items-center justify-between text-[10px] text-slate-400 font-semibold">
                  <span>${(selectedNode.salary_range.min / 1000).toFixed(0)}k Base</span>
                  <span>${(selectedNode.salary_range.max / 1000).toFixed(0)}k Top Band</span>
                </div>
              </div>

              {/* Core Competencies */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  Core Technical Requirements
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {selectedNode.core_skills.map((skill) => (
                    <span
                      key={skill}
                      className="px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-semibold border border-slate-200 dark:border-slate-700"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>

              {/* Advanced Competencies */}
              {selectedNode.advanced_skills && selectedNode.advanced_skills.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                    Advanced High-ROI Skills
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedNode.advanced_skills.map((skill) => (
                      <span
                        key={skill}
                        className="px-2.5 py-1 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 text-xs font-semibold border border-purple-200 dark:border-purple-800"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Recommended Certifications */}
              {selectedNode.certifications && selectedNode.certifications.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                    <Award className="w-3.5 h-3.5 text-amber-500" />
                    Target Industry Credentials
                  </h4>
                  <ul className="space-y-1">
                    {selectedNode.certifications.map((cert) => (
                      <li key={cert} className="text-xs font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                        {cert}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Action Buttons: Set as Bridge endpoints or Predict Salary */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setCurrentRoleId(selectedNode.id);
                      handleComputeBridge();
                    }}
                    className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold transition-colors cursor-pointer"
                  >
                    Set as Start
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setTargetRoleId(selectedNode.id);
                      handleComputeBridge();
                    }}
                    className="px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-colors cursor-pointer"
                  >
                    Set as Target
                  </button>
                </div>

                {onNavigateToSalary && (
                  <button
                    type="button"
                    onClick={() => onNavigateToSalary(selectedNode.title)}
                    className="w-full px-3 py-2.5 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50/60 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 text-xs font-bold hover:bg-indigo-100 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <DollarSign className="w-4 h-4" />
                    <span>Predict Compensation & Negotiation</span>
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center space-y-3">
              <Target className="w-8 h-8 text-slate-400 mx-auto" />
              <p className="text-xs font-semibold text-slate-500">
                Click any role node in the hierarchy matrix to inspect required competencies, salary percentiles, and transition bridges.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
