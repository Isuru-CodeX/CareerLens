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
  Target,
  Briefcase,
  Globe
} from 'lucide-react';
import {
  CareerNode,
  CareerKnowledgeGraphData,
  CareerBridgeResponse,
  Resume
} from '../../types';
import { api } from '../../services/api';
import { useLoader } from '../../context/useLoader';

interface CareerKnowledgeGraphProps {
  initialIndustry?: string;
  resumes?: Resume[];
  onNavigateToSalary?: (roleTitle: string) => void;
  initialRole?: string;
}

interface CountryMeta {
  code: string;
  name: string;
  currency: string;
  symbol: string;
  flag: string;
}

const DEFAULT_COUNTRIES: CountryMeta[] = [
  { code: 'us', name: 'United States', flag: '🇺🇸', currency: 'USD', symbol: '$' },
  { code: 'gb', name: 'United Kingdom', flag: '🇬🇧', currency: 'GBP', symbol: '£' },
  { code: 'de', name: 'Germany', flag: '🇩🇪', currency: 'EUR', symbol: '€' },
  { code: 'ca', name: 'Canada', flag: '🇨🇦', currency: 'CAD', symbol: 'C$' },
  { code: 'au', name: 'Australia', flag: '🇦🇺', currency: 'AUD', symbol: 'A$' },
  { code: 'nl', name: 'Netherlands', flag: '🇳🇱', currency: 'EUR', symbol: '€' },
  { code: 'ch', name: 'Switzerland', flag: '🇨🇭', currency: 'CHF', symbol: 'CHF' },
  { code: 'fr', name: 'France', flag: '🇫🇷', currency: 'EUR', symbol: '€' },
  { code: 'ie', name: 'Ireland', flag: '🇮🇪', currency: 'EUR', symbol: '€' },
  { code: 'sg', name: 'Singapore', flag: '🇸🇬', currency: 'SGD', symbol: 'S$' },
  { code: 'jp', name: 'Japan', flag: '🇯🇵', currency: 'JPY', symbol: '¥' },
  { code: 'in', name: 'India', flag: '🇮🇳', currency: 'INR', symbol: '₹' },
  { code: 'lk', name: 'Sri Lanka', flag: '🇱🇰', currency: 'LKR', symbol: 'Rs. ' },
  { code: 'ae', name: 'United Arab Emirates', flag: '🇦🇪', currency: 'AED', symbol: 'AED' },
  { code: 'es', name: 'Spain', flag: '🇪🇸', currency: 'EUR', symbol: '€' },
  { code: 'se', name: 'Sweden', flag: '🇸🇪', currency: 'SEK', symbol: 'kr' },
  { code: 'br', name: 'Brazil', flag: '🇧🇷', currency: 'BRL', symbol: 'R$' },
  { code: 'pl', name: 'Poland', flag: '🇵🇱', currency: 'PLN', symbol: 'zł' },
  { code: 'nz', name: 'New Zealand', flag: '🇳🇿', currency: 'NZD', symbol: 'NZ$' },
];

const CATEGORY_COLORS: Record<string, { bg: string; border: string; text: string; fill: string; dot: string }> = {
  // Technology & Software
  Frontend: { bg: 'bg-sky-50 dark:bg-sky-950/60', border: 'border-sky-300 dark:border-sky-800', text: 'text-sky-700 dark:text-sky-300', fill: '#0284c7', dot: 'bg-sky-500' },
  'Full Stack': { bg: 'bg-indigo-50 dark:bg-indigo-950/60', border: 'border-indigo-300 dark:border-indigo-800', text: 'text-indigo-700 dark:text-indigo-300', fill: '#4f46e5', dot: 'bg-indigo-500' },
  Backend: { bg: 'bg-emerald-50 dark:bg-emerald-950/60', border: 'border-emerald-300 dark:border-emerald-800', text: 'text-emerald-700 dark:text-emerald-300', fill: '#059669', dot: 'bg-emerald-500' },
  'DevOps & Cloud': { bg: 'bg-amber-50 dark:bg-amber-950/60', border: 'border-amber-300 dark:border-amber-800', text: 'text-amber-700 dark:text-amber-300', fill: '#d97706', dot: 'bg-amber-500' },
  'Data & AI': { bg: 'bg-purple-50 dark:bg-purple-950/60', border: 'border-purple-300 dark:border-purple-800', text: 'text-purple-700 dark:text-purple-300', fill: '#9333ea', dot: 'bg-purple-500' },
  Security: { bg: 'bg-rose-50 dark:bg-rose-950/60', border: 'border-rose-300 dark:border-rose-800', text: 'text-rose-700 dark:text-rose-300', fill: '#e11d48', dot: 'bg-rose-500' },
  Mobile: { bg: 'bg-cyan-50 dark:bg-cyan-950/60', border: 'border-cyan-300 dark:border-cyan-800', text: 'text-cyan-700 dark:text-cyan-300', fill: '#0891b2', dot: 'bg-cyan-500' },
  QA: { bg: 'bg-teal-50 dark:bg-teal-950/60', border: 'border-teal-300 dark:border-teal-800', text: 'text-teal-700 dark:text-teal-300', fill: '#0d9488', dot: 'bg-teal-500' },
  Systems: { bg: 'bg-orange-50 dark:bg-orange-950/60', border: 'border-orange-300 dark:border-orange-800', text: 'text-orange-700 dark:text-orange-300', fill: '#ea580c', dot: 'bg-orange-500' },
  Leadership: { bg: 'bg-purple-50 dark:bg-purple-950/60', border: 'border-purple-300 dark:border-purple-800', text: 'text-purple-700 dark:text-purple-300', fill: '#9333ea', dot: 'bg-purple-500' },

  // Data Science & Analytics
  Analytics: { bg: 'bg-purple-50 dark:bg-purple-950/60', border: 'border-purple-300 dark:border-purple-800', text: 'text-purple-700 dark:text-purple-300', fill: '#9333ea', dot: 'bg-purple-500' },
  'Data Engineering': { bg: 'bg-violet-50 dark:bg-violet-950/60', border: 'border-violet-300 dark:border-violet-800', text: 'text-violet-700 dark:text-violet-300', fill: '#7c3aed', dot: 'bg-violet-500' },
  'Data Science': { bg: 'bg-fuchsia-50 dark:bg-fuchsia-950/60', border: 'border-fuchsia-300 dark:border-fuchsia-800', text: 'text-fuchsia-700 dark:text-fuchsia-300', fill: '#c026d3', dot: 'bg-fuchsia-500' },
  'AI / ML': { bg: 'bg-pink-50 dark:bg-pink-950/60', border: 'border-pink-300 dark:border-pink-800', text: 'text-pink-700 dark:text-pink-300', fill: '#db2777', dot: 'bg-pink-500' },
  Quantitative: { bg: 'bg-yellow-50 dark:bg-yellow-950/60', border: 'border-yellow-300 dark:border-yellow-800', text: 'text-yellow-700 dark:text-yellow-300', fill: '#ca8a04', dot: 'bg-yellow-500' },

  // Product & Design
  'Design & UX': { bg: 'bg-violet-50 dark:bg-violet-950/60', border: 'border-violet-300 dark:border-violet-800', text: 'text-violet-700 dark:text-violet-300', fill: '#7c3aed', dot: 'bg-violet-500' },
  'Product Strategy': { bg: 'bg-blue-50 dark:bg-blue-950/60', border: 'border-blue-300 dark:border-blue-800', text: 'text-blue-700 dark:text-blue-300', fill: '#2563eb', dot: 'bg-blue-500' },

  // Finance, Banking & FinTech
  'Corporate Finance': { bg: 'bg-emerald-50 dark:bg-emerald-950/60', border: 'border-emerald-300 dark:border-emerald-800', text: 'text-emerald-700 dark:text-emerald-300', fill: '#059669', dot: 'bg-emerald-500' },
  Accounting: { bg: 'bg-lime-50 dark:bg-lime-950/60', border: 'border-lime-300 dark:border-lime-800', text: 'text-lime-700 dark:text-lime-300', fill: '#65a30d', dot: 'bg-lime-500' },
  'Risk & Controls': { bg: 'bg-red-50 dark:bg-red-950/60', border: 'border-red-300 dark:border-red-800', text: 'text-red-700 dark:text-red-300', fill: '#dc2626', dot: 'bg-red-500' },
  'Investment Banking': { bg: 'bg-amber-50 dark:bg-amber-950/60', border: 'border-amber-300 dark:border-amber-800', text: 'text-amber-700 dark:text-amber-300', fill: '#d97706', dot: 'bg-amber-500' },
  'Trading & Markets': { bg: 'bg-yellow-50 dark:bg-yellow-950/60', border: 'border-yellow-300 dark:border-yellow-800', text: 'text-yellow-700 dark:text-yellow-300', fill: '#ca8a04', dot: 'bg-yellow-500' },

  // Healthcare & Life Sciences
  'Health Tech': { bg: 'bg-cyan-50 dark:bg-cyan-950/60', border: 'border-cyan-300 dark:border-cyan-800', text: 'text-cyan-700 dark:text-cyan-300', fill: '#0891b2', dot: 'bg-cyan-500' },
  'Clinical Research': { bg: 'bg-teal-50 dark:bg-teal-950/60', border: 'border-teal-300 dark:border-teal-800', text: 'text-teal-700 dark:text-teal-300', fill: '#0d9488', dot: 'bg-teal-500' },
  'Computational Biology': { bg: 'bg-fuchsia-50 dark:bg-fuchsia-950/60', border: 'border-fuchsia-300 dark:border-fuchsia-800', text: 'text-fuchsia-700 dark:text-fuchsia-300', fill: '#c026d3', dot: 'bg-fuchsia-500' },
  'Clinical Practice': { bg: 'bg-pink-50 dark:bg-pink-950/60', border: 'border-pink-300 dark:border-pink-800', text: 'text-pink-700 dark:text-pink-300', fill: '#db2777', dot: 'bg-pink-500' },

  // Marketing & Growth
  'Brand & Content': { bg: 'bg-pink-50 dark:bg-pink-950/60', border: 'border-pink-300 dark:border-pink-800', text: 'text-pink-700 dark:text-pink-300', fill: '#db2777', dot: 'bg-pink-500' },
  'Performance Marketing': { bg: 'bg-emerald-50 dark:bg-emerald-950/60', border: 'border-emerald-300 dark:border-emerald-800', text: 'text-emerald-700 dark:text-emerald-300', fill: '#059669', dot: 'bg-emerald-500' },
  'Product Marketing': { bg: 'bg-violet-50 dark:bg-violet-950/60', border: 'border-violet-300 dark:border-violet-800', text: 'text-violet-700 dark:text-violet-300', fill: '#7c3aed', dot: 'bg-violet-500' },

  // Operations & Management
  'Talent & People': { bg: 'bg-blue-50 dark:bg-blue-950/60', border: 'border-blue-300 dark:border-blue-800', text: 'text-blue-700 dark:text-blue-300', fill: '#2563eb', dot: 'bg-blue-500' },
  'Agile Operations': { bg: 'bg-amber-50 dark:bg-amber-950/60', border: 'border-amber-300 dark:border-amber-800', text: 'text-amber-700 dark:text-amber-300', fill: '#d97706', dot: 'bg-amber-500' },
  'Business Operations': { bg: 'bg-slate-50 dark:bg-slate-800/80', border: 'border-slate-300 dark:border-slate-700', text: 'text-slate-700 dark:text-slate-300', fill: '#475569', dot: 'bg-slate-500' },

  // Engineering & Hardware
  'Hardware & Systems': { bg: 'bg-orange-50 dark:bg-orange-950/60', border: 'border-orange-300 dark:border-orange-800', text: 'text-orange-700 dark:text-orange-300', fill: '#ea580c', dot: 'bg-orange-500' },
  'Robotics & Automation': { bg: 'bg-red-50 dark:bg-red-950/60', border: 'border-red-300 dark:border-red-800', text: 'text-red-700 dark:text-red-300', fill: '#dc2626', dot: 'bg-red-500' },

  // Legal & Compliance
  'Legal Operations': { bg: 'bg-slate-50 dark:bg-slate-800/80', border: 'border-slate-300 dark:border-slate-700', text: 'text-slate-700 dark:text-slate-300', fill: '#475569', dot: 'bg-slate-500' },
  Compliance: { bg: 'bg-red-50 dark:bg-red-950/60', border: 'border-red-300 dark:border-red-800', text: 'text-red-700 dark:text-red-300', fill: '#dc2626', dot: 'bg-red-500' },
  'Privacy & Regulatory': { bg: 'bg-indigo-50 dark:bg-indigo-950/60', border: 'border-indigo-300 dark:border-indigo-800', text: 'text-indigo-700 dark:text-indigo-300', fill: '#4f46e5', dot: 'bg-indigo-500' }
};

export const CareerKnowledgeGraph: React.FC<CareerKnowledgeGraphProps> = ({
  initialIndustry = 'all',
  resumes = [],
  onNavigateToSalary,
  initialRole
}) => {
  const { triggerTransition } = useLoader();
  const [graphData, setGraphData] = useState<CareerKnowledgeGraphData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedNode, setSelectedNode] = useState<CareerNode | null>(null);
  const [selectedIndustry, setSelectedIndustry] = useState<string>(initialIndustry);
  const [selectedCountry, setSelectedCountry] = useState<string>('us');

  // Pathfinding Bridge State
  const [currentRoleId, setCurrentRoleId] = useState<string>('');
  const [targetRoleId, setTargetRoleId] = useState<string>('');
  const [selectedResumeId, setSelectedResumeId] = useState<string>(() => resumes?.[0]?.id || '');
  const [bridgeResult, setBridgeResult] = useState<CareerBridgeResponse | null>(null);
  const [computingBridge, setComputingBridge] = useState<boolean>(false);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedLevel, setSelectedLevel] = useState<number | 'all'>('all');

  // Country Change with futuristic transition loader
  const handleCountryChange = (newCountryCode: string) => {
    if (newCountryCode === selectedCountry) return;
    const targetCountry = DEFAULT_COUNTRIES.find(c => c.code === newCountryCode);
    const countryName = targetCountry ? targetCountry.name : newCountryCode.toUpperCase();
    triggerTransition({
      title: `Calibrating ${countryName} Career Graph...`,
      subtitle: `Harmonizing local purchasing power, salary percentiles & market levels for ${countryName}...`,
      badge: 'Local Career Calibration',
      icon: 'globe',
      accentColor: 'emerald'
    }, 450);
    setSelectedCountry(newCountryCode);
  };

  // Load Graph Data for Active Industry & Country
  useEffect(() => {
    let active = true;
    api.getCareerKnowledgeGraph(selectedIndustry, selectedCountry)
      .then((data) => {
        if (!active) return;
        setGraphData(data);
        if (data.nodes.length > 0) {
          // If initialRole was requested, search for it
          let targetNode = data.nodes[0];
          if (initialRole) {
            const norm = initialRole.toLowerCase().trim();
            const matched = data.nodes.find(n =>
              n.title.toLowerCase().trim() === norm ||
              n.title.toLowerCase().includes(norm) ||
              norm.includes(n.title.toLowerCase())
            );
            if (matched) targetNode = matched;
          }
          const secondNode = data.nodes.length > 1 ? data.nodes[data.nodes.length - 1] : targetNode;
          setSelectedNode(targetNode);
          setCurrentRoleId(targetNode.id);
          setTargetRoleId(secondNode.id);
        }
      })
      .catch((err) => console.error('Failed to load career knowledge graph:', err))
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [selectedIndustry, selectedCountry, initialRole]);

  // When initialRole changes, dynamically select and focus it
  useEffect(() => {
    if (!graphData || !initialRole) return;
    const norm = initialRole.toLowerCase().trim();
    const matched = graphData.nodes.find(n =>
      n.title.toLowerCase().trim() === norm ||
      n.title.toLowerCase().includes(norm) ||
      norm.includes(n.title.toLowerCase())
    );
    if (matched && selectedNode?.id !== matched.id) {
      queueMicrotask(() => {
        setSelectedNode(matched);
        setCurrentRoleId(matched.id);
      });
    }
  }, [graphData, initialRole, selectedNode]);

  // Handle Dijkstra Bridge calculation
  const handleComputeBridge = async () => {
    if (!currentRoleId || !targetRoleId) return;
    setComputingBridge(true);
    const currTitle = graphData?.nodes.find((n) => n.id === currentRoleId)?.title || 'Current Role';
    const tgtTitle = graphData?.nodes.find((n) => n.id === targetRoleId)?.title || 'Target Role';
    triggerTransition({
      title: 'Calculating Dijkstra Shortest Path...',
      subtitle: `Mapping optimal bridge from ${currTitle} to ${tgtTitle}...`,
      badge: 'Dijkstra Career Bridge',
      icon: 'compass',
      accentColor: 'indigo'
    }, 450);

    try {
      const resume = resumes.find((r) => r.id === selectedResumeId);
      const skills = (resume?.skills || []).map((s: any) => (typeof s === 'string' ? s : s.name));

      const res = await api.computeCareerBridge({
        current_role_id: currentRoleId,
        target_role_id: targetRoleId,
        candidate_skills: skills,
        resume_id: selectedResumeId || undefined,
        country: selectedCountry
      });
      setBridgeResult(res);
    } catch (err: any) {
      console.error('Failed to compute career bridge:', err);
    } finally {
      setComputingBridge(false);
    }
  };

  // Active Country Meta & Currency Formatter
  const currentCountry = useMemo(() => {
    return DEFAULT_COUNTRIES.find(c => c.code === selectedCountry) || DEFAULT_COUNTRIES[0];
  }, [selectedCountry]);

  const activeCurrencySymbol = graphData?.currency_symbol || currentCountry.symbol || '$';

  const formatSalary = (amount?: number | null, compact: boolean = false): string => {
    if (amount === undefined || amount === null || isNaN(amount)) return 'N/A';
    const sym = activeCurrencySymbol;
    const finalVal = Math.round(amount);

    if (compact) {
      if (finalVal >= 1000000) {
        return `${sym}${(finalVal / 1000000).toFixed(1)}M`;
      }
      return `${sym}${Math.round(finalVal / 1000)}k`;
    }
    return `${sym}${finalVal.toLocaleString()}`;
  };

  // Filter nodes by query, category, and level
  const filteredNodes = useMemo(() => {
    if (!graphData?.nodes) return [];
    return graphData.nodes.filter((node) => {
      const matchesSearch =
        searchQuery === '' ||
        node.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        node.core_skills.some((s) => s.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (node.industry_name && node.industry_name.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesCategory =
        selectedCategory === 'all' || node.category === selectedCategory;

      const matchesLevel =
        selectedLevel === 'all' || node.level === selectedLevel;

      return matchesSearch && matchesCategory && matchesLevel;
    });
  }, [graphData, searchQuery, selectedCategory, selectedLevel]);

  // Group nodes by seniority level (1: Entry, 2: Mid, 3: Senior, 4: Staff/Lead, 5: Director/Principal)
  const nodesByLevel = useMemo(() => {
    const map: Record<number, CareerNode[]> = { 1: [], 2: [], 3: [], 4: [], 5: [] };
    filteredNodes.forEach((node) => {
      if (!map[node.level]) {
        map[node.level] = [];
      }
      map[node.level].push(node);
    });
    return map;
  }, [filteredNodes]);

  // Path helper
  const isNodeInPath = (nodeId: string) => {
    return bridgeResult?.path?.includes(nodeId) || false;
  };

  const getPathIndex = (nodeId: string) => {
    if (!bridgeResult?.path) return -1;
    return bridgeResult.path.indexOf(nodeId);
  };

  // Active industry label
  const activeIndustryObj = (graphData?.industries || []).find((i) => i.id === selectedIndustry);
  const activeIndustryLabel = activeIndustryObj ? activeIndustryObj.name : 'All Professional Domains';

  if (loading && !graphData) {
    return (
      <div className="p-16 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center space-y-4">
        <RefreshCw className="w-8 h-8 animate-spin text-indigo-600 mx-auto" />
        <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">
          Compiling Career Knowledge Graph taxonomy & directed transitions across industries...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8 min-w-0">
      {/* Top Controls: Pathfinding Engine Toolbar & Industry Selector */}
      <div className="p-4 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-5 overflow-hidden">
        {/* Header row with Industry Selector & Resume Sync */}
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

          <div className="flex flex-wrap items-center gap-3">
            {/* Country Selector Dropdown */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-indigo-600" />
                <span>Country:</span>
              </span>
              <select
                value={selectedCountry}
                onChange={(e) => handleCountryChange(e.target.value)}
                className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 cursor-pointer"
              >
                {DEFAULT_COUNTRIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.flag} {c.name} ({c.currency} {c.symbol})
                  </option>
                ))}
              </select>
            </div>

            {/* Industry Selector Dropdown (9 Canonical Modern Industries) */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Briefcase className="w-3.5 h-3.5 text-indigo-600" />
                <span>Industry:</span>
              </span>
              <select
                value={selectedIndustry}
                onChange={(e) => setSelectedIndustry(e.target.value)}
                className="px-3 py-1.5 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50/70 dark:bg-indigo-950/70 text-xs font-bold text-indigo-700 dark:text-indigo-300 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 cursor-pointer"
              >
                <option value="all">🌐 All Professions</option>
                <option value="tech">💻 Technology & Software</option>
                <option value="data">📊 Data Science & Analytics</option>
                <option value="product">🎨 Product & Design</option>
                <option value="finance">🏛️ Finance & Banking</option>
                <option value="healthcare">🩺 Healthcare & Life Sciences</option>
                <option value="marketing">📣 Marketing & Growth</option>
                <option value="operations">⚡ Operations & Management</option>
                <option value="engineering">⚙️ Engineering & Hardware</option>
                <option value="legal">⚖️ Legal & Compliance</option>
              </select>
            </div>

            {/* Resume Sync Selector */}
            {resumes.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-500">Sync Candidate:</span>
                <select
                  value={selectedResumeId}
                  onChange={(e) => setSelectedResumeId(e.target.value)}
                  className="max-w-[180px] px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 truncate"
                >
                  {resumes.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.title || r.file_name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Bridge Role Selectors with Bulletproof Responsive Grid Layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-12 gap-3.5 items-end w-full min-w-0">
          {/* Baseline Role */}
          <div className="md:col-span-1 xl:col-span-5 space-y-1.5 min-w-0">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
              <span>Current / Baseline Role</span>
            </label>
            <div className="relative min-w-0 w-full overflow-hidden">
              <select
                value={currentRoleId}
                onChange={(e) => setCurrentRoleId(e.target.value)}
                style={{ maxWidth: '100%', minWidth: 0 }}
                className="w-full min-w-0 max-w-full px-3.5 py-2.5 rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs sm:text-sm font-semibold focus:outline-hidden focus:ring-2 focus:ring-indigo-500 truncate cursor-pointer block"
              >
                {(graphData?.nodes || []).map((n) => (
                  <option key={`curr_${n.id}`} value={n.id}>
                    {n.title} • {n.level_label} ({formatSalary(n.salary_median, true)})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Target Role */}
          <div className="md:col-span-1 xl:col-span-5 space-y-1.5 min-w-0">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-indigo-500 shrink-0" />
              <span>Target / Dream Role</span>
            </label>
            <div className="relative min-w-0 w-full overflow-hidden">
              <select
                value={targetRoleId}
                onChange={(e) => setTargetRoleId(e.target.value)}
                style={{ maxWidth: '100%', minWidth: 0 }}
                className="w-full min-w-0 max-w-full px-3.5 py-2.5 rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs sm:text-sm font-semibold focus:outline-hidden focus:ring-2 focus:ring-indigo-500 truncate cursor-pointer block"
              >
                {(graphData?.nodes || []).map((n) => (
                  <option key={`tgt_${n.id}`} value={n.id}>
                    {n.title} • {n.level_label} ({formatSalary(n.salary_median, true)})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Calculate Path Button (Guaranteed never to wrap or truncate to Calculate P...) */}
          <div className="md:col-span-2 xl:col-span-2 min-w-0">
            <button
              type="button"
              onClick={handleComputeBridge}
              disabled={computingBridge}
              className="w-full h-[42px] min-w-[155px] px-4 rounded-2xl bg-indigo-600 hover:bg-indigo-700 active:scale-98 disabled:opacity-50 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer whitespace-nowrap shrink-0"
            >
              {computingBridge ? <RefreshCw className="w-4 h-4 animate-spin shrink-0" /> : <Zap className="w-4 h-4 shrink-0" />}
              <span className="whitespace-nowrap">Calculate Path</span>
            </button>
          </div>
        </div>

        {/* Filters and Search row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
          <div className="relative flex-1 min-w-0 sm:max-w-sm xl:max-w-md">
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"
            />
            <input
              type="search"
              placeholder="Search roles or skills..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-10 w-full pl-10 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs sm:text-sm font-semibold focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-bold text-slate-400">Category:</span>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 max-w-[140px] truncate"
              >
                <option value="all">All Domains</option>
                {(graphData?.categories || []).map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-bold text-slate-400">Level:</span>
              <select
                value={selectedLevel}
                onChange={(e) => setSelectedLevel(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300"
              >
                <option value="all">All Tiers (1-5)</option>
                <option value={1}>Tier 1: Entry (0-2y)</option>
                <option value={2}>Tier 2: Mid Level (2-5y)</option>
                <option value={3}>Tier 3: Senior (5-8y)</option>
                <option value={4}>Tier 4: Staff / Lead (8-10y)</option>
                <option value={5}>Tier 5: Director / Exec (10y+)</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Main Graph Grid / Stage */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 items-start min-w-0">
        {/* Left: 5-Tier Interactive Knowledge Matrix (8 Cols) */}
        <div className="lg:col-span-8 space-y-6 min-w-0">
          <div className="p-4 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-6 overflow-hidden">
            {/* Header: Renamed to Career Progression Hierarchy (Task 6) */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-600 shrink-0" />
                <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
                  Career Progression Hierarchy
                </h3>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-800/60">
                  {activeIndustryLabel}
                </span>
              </div>
              <span className="text-xs text-slate-500 font-semibold">
                Showing {filteredNodes.length} roles across 5 tiers
              </span>
            </div>

            {/* 5 Seniority Levels Rendered as Structured Visual Progression Columns */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3.5">
              {[
                { level: 1, title: 'Tier 1: Entry', subtitle: '0-2 Yrs Experience' },
                { level: 2, title: 'Tier 2: Mid Level', subtitle: '2-5 Yrs Experience' },
                { level: 3, title: 'Tier 3: Senior', subtitle: '5-8 Yrs Experience' },
                { level: 4, title: 'Tier 4: Staff / Lead', subtitle: '8-10 Yrs Experience' },
                { level: 5, title: 'Tier 5: Director / Exec', subtitle: '10+ Yrs Experience' }
              ].map((tier) => (
                <div key={tier.level} className="space-y-3 min-w-0">
                  <div className="pb-2 border-b-2 border-indigo-500/20">
                    <h4 className="text-xs font-black text-slate-800 dark:text-slate-200">{tier.title}</h4>
                    <p className="text-[10px] text-slate-400 font-medium">{tier.subtitle}</p>
                  </div>

                  <div className="space-y-2.5">
                    {(nodesByLevel[tier.level] || []).map((node) => {
                      const inPath = isNodeInPath(node.id);
                      const pathIdx = getPathIndex(node.id);
                      const isSelected = selectedNode?.id === node.id;
                      const catStyle = CATEGORY_COLORS[node.category] || CATEGORY_COLORS['Full Stack'] || {
                        bg: 'bg-slate-50 dark:bg-slate-800',
                        border: 'border-slate-200 dark:border-slate-700',
                        text: 'text-slate-700 dark:text-slate-300',
                        fill: '#64748b',
                        dot: 'bg-slate-500'
                      };

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

                          <div className="flex items-center gap-1.5 mb-1 min-w-0">
                            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${catStyle.dot}`} />
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider truncate">
                              {node.category}
                            </span>
                          </div>

                          <h5 className="text-xs font-bold text-slate-900 dark:text-white line-clamp-2 leading-snug">
                            {node.title}
                          </h5>

                          <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 dark:border-slate-800/60 text-[11px]">
                            <span className="font-bold text-indigo-600 dark:text-indigo-400 truncate">
                              {formatSalary(node.salary_median, true)}/yr
                            </span>
                            <span className="text-[10px] font-semibold text-slate-400 shrink-0">
                              {node.core_skills.length} skills
                            </span>
                          </div>
                        </div>
                      );
                    })}

                    {(nodesByLevel[tier.level] || []).length === 0 && (
                      <div className="p-4 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-center text-[11px] text-slate-400">
                        No roles in tier
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Path Bridge Feasibility Scorecard & Roadmap (Task 7) */}
          {bridgeResult && (
            <div className="p-4 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-6 overflow-hidden min-w-0">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-indigo-600 shrink-0" />
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
                      {bridgeResult.salary_delta >= 0 ? '+' : ''}{formatSalary(bridgeResult.salary_delta, true)} / yr
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

              {/* Notice when candidate has no skills on file */}
              {bridgeResult.has_candidate_skills === false && (
                <div className="p-3.5 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800 flex items-center gap-3 text-xs">
                  <Sparkles className="w-4 h-4 text-indigo-600 shrink-0" />
                  <p className="text-indigo-900 dark:text-indigo-200">
                    <strong>Tip:</strong> Upload a resume or select your active profile above to calculate exact verified skills vs. missing gaps based on your personal background.
                  </p>
                </div>
              )}

              {/* Milestones Sequencer */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Progression Sequence ({bridgeResult.total_estimated_months} Months Est.)
                </h4>
                <div className="flex flex-wrap items-center gap-2">
                  {bridgeResult.milestones.map((milestone, idx) => (
                    <React.Fragment key={milestone.id}>
                      <div className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-indigo-600 text-white font-black text-[10px] flex items-center justify-center shrink-0">
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
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
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
                      <span className="text-[11px] text-slate-400 italic">No verified skills on file yet</span>
                    )}
                  </div>
                </div>

                {/* Transferrable Skills */}
                <div className="p-4 rounded-2xl bg-amber-50/60 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/80 space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-amber-800 dark:text-amber-300">
                    <Sparkles className="w-4 h-4 shrink-0" />
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
                    <AlertCircle className="w-4 h-4 shrink-0" />
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
                      <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold">
                        🎉 You meet 100% of required competencies!
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* 3-Phase Structured Learning Roadmap (Task 7) */}
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
                          <strong>Milestone:</strong> {phase.recommended_project}
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
        <div className="lg:col-span-4 space-y-6 min-w-0">
          {selectedNode ? (
            <div className="p-4 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-5 lg:sticky lg:top-24 min-w-0">
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

              {/* Task 2: Industry Compensation Range Progress Bar with Proportional Median Pin */}
              {(() => {
                const minSalary = selectedNode.salary_range?.min || 60000;
                const maxSalary = selectedNode.salary_range?.max || 120000;
                const medianSalary = selectedNode.salary_median || minSalary;
                const posPercent = maxSalary > minSalary
                  ? Math.min(100, Math.max(0, ((medianSalary - minSalary) / (maxSalary - minSalary)) * 100))
                  : 50;

                return (
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-2.5">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="text-slate-500">Industry Compensation Range</span>
                      <span className="text-emerald-600 dark:text-emerald-400 font-black">
                        {formatSalary(medianSalary, true)} Median
                      </span>
                    </div>

                    {/* Proportional Range Track with Pin Marker */}
                    <div className="relative h-2.5 w-full rounded-full bg-slate-200 dark:bg-slate-700 my-1.5">
                      <div
                        className="absolute inset-y-0 left-0 rounded-full bg-emerald-500 transition-all duration-300"
                        style={{ width: `${posPercent}%` }}
                      />
                      <div
                        className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 border-emerald-500 bg-white dark:bg-slate-900 shadow-md transition-all duration-300"
                        style={{ left: `${posPercent}%` }}
                        title={`Median: ${formatSalary(medianSalary)} (${posPercent.toFixed(0)}% position)`}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 font-semibold">
                      <span>Base {formatSalary(minSalary, true)}</span>
                      <span className="text-slate-700 dark:text-slate-300 font-bold">
                        Median {formatSalary(medianSalary, true)}
                      </span>
                      <span>Top Band {formatSalary(maxSalary, true)}</span>
                    </div>
                  </div>
                );
              })()}

              {/* Core Competencies */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  Core Requirements & Skills
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
                    Advanced High-ROI Competencies
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
