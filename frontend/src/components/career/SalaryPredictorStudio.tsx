import React, { useState, useEffect } from 'react';
import {
  DollarSign,
  TrendingUp,
  Award,
  Sparkles,
  MapPin,
  Building2,
  RefreshCw,
  Sliders,
  ShieldCheck,
  CheckCircle2,
  Globe2,
  Layers,
  ArrowRight
} from 'lucide-react';
import {
  SalaryPredictionResponse,
  SalaryMetadataResponse,
  Resume,
  VerifiedSalaryBenchmark
} from '../../types';
import { api } from '../../services/api';
import { useLoader } from '../../context/useLoader';

interface SalaryPredictorStudioProps {
  initialIndustry?: string;
  initialRole?: string;
  resumes?: Resume[];
  onLaunchNegotiation?: (role: string, offer: number, target: number) => void;
}

const INDUSTRY_OPTIONS = [
  { id: 'tech', label: 'Technology & Software Engineering' },
  { id: 'healthcare', label: 'Healthcare & Clinical Medicine' },
  { id: 'finance', label: 'Finance, Banking & Accounting' },
  { id: 'education', label: 'Education & Academic Instruction' },
  { id: 'legal', label: 'Legal & Corporate Compliance' },
  { id: 'marketing', label: 'Marketing, Growth & Design' },
];

const INDUSTRY_ROLES_MAP: Record<string, string[]> = {
  tech: [
    'Senior Full Stack Engineer',
    'Frontend Software Engineer',
    'Backend Distributed Systems Engineer',
    'DevOps & Cloud Architect',
    'Machine Learning & AI Engineer',
    'Data Platform Engineer',
    'Cybersecurity Engineer',
    'Engineering Manager'
  ],
  healthcare: [
    'Staff Registered Nurse (RN)',
    'Clinical Nurse Specialist (CNS)',
    'Nurse Practitioner (NP)',
    'Certified Nursing Assistant (CNA)',
    'Medical Laboratory Scientist',
    'Hospital Clinical Administrator'
  ],
  finance: [
    'Senior Financial Analyst',
    'Junior Financial Analyst',
    'Investment Portfolio Analyst',
    'Financial Risk Manager',
    'Corporate Controller / Accounting Manager',
    'Chief Financial Officer (CFO)'
  ],
  education: [
    'Secondary Education Teacher',
    'Primary Education Teacher',
    'Instructional Systems Designer',
    'Curriculum & Learning Specialist',
    'Academic Dean / Department Chair'
  ],
  legal: [
    'Corporate Paralegal Specialist',
    'Legal Assistant / Paralegal',
    'Senior Litigation Associate',
    'Corporate Compliance Officer',
    'General Counsel / Legal Director'
  ],
  marketing: [
    'Senior Growth & Performance Marketer',
    'Digital Marketing Specialist',
    'Product Marketing Manager',
    'Brand & Communications Lead',
    'Chief Marketing Officer (CMO)'
  ]
};

const CURRENCIES = [
  { code: 'USD', symbol: '$', label: 'USD ($)' },
  { code: 'EUR', symbol: '€', label: 'EUR (€)' },
  { code: 'GBP', symbol: '£', label: 'GBP (£)' },
  { code: 'CAD', symbol: 'CA$', label: 'CAD (CA$)' },
  { code: 'AUD', symbol: 'A$', label: 'AUD (A$)' }
];

export const SalaryPredictorStudio: React.FC<SalaryPredictorStudioProps> = ({
  initialIndustry = 'tech',
  initialRole,
  resumes = [],
  onLaunchNegotiation
}) => {
  const { triggerTransition } = useLoader();
  const [selectedIndustry, setSelectedIndustry] = useState<string>(initialIndustry || 'tech');
  const [roleTitle, setRoleTitle] = useState<string>(initialRole || 'Senior Full Stack Engineer');
  const [currency, setCurrency] = useState<string>('USD');
  const [experienceYears, setExperienceYears] = useState<number>(4.5);
  const [locationTier, setLocationTier] = useState<string>('us_tier1');
  const [companyTier, setCompanyTier] = useState<string>('growth_scaleup');
  const [selectedSkills, setSelectedSkills] = useState<string[]>([
    'Kubernetes',
    'Distributed Systems',
    'TypeScript',
    'PostgreSQL'
  ]);

  const [metadata, setMetadata] = useState<SalaryMetadataResponse | null>(null);
  const [prediction, setPrediction] = useState<SalaryPredictionResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  // Verified Official Market Benchmark State (BLS OEWS, O*NET, Mercer)
  const [verifiedBenchmark, setVerifiedBenchmark] = useState<VerifiedSalaryBenchmark | null>(null);
  const [verifyingBenchmark, setVerifyingBenchmark] = useState<boolean>(false);

  // Sync external props
  useEffect(() => {
    if (initialIndustry && initialIndustry !== selectedIndustry) {
      setSelectedIndustry(initialIndustry);
      const roles = INDUSTRY_ROLES_MAP[initialIndustry] || INDUSTRY_ROLES_MAP.tech;
      if (!initialRole) {
        setRoleTitle(roles[0]);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialIndustry]);

  useEffect(() => {
    if (initialRole) {
      setRoleTitle(initialRole);
    }
  }, [initialRole]);

  // Handle Industry change
  const handleIndustryChange = (ind: string) => {
    setSelectedIndustry(ind);
    const availableRoles = INDUSTRY_ROLES_MAP[ind] || INDUSTRY_ROLES_MAP.tech;
    setRoleTitle(availableRoles[0]);
  };

  // Format currency helper
  const currencySymbol = CURRENCIES.find((c) => c.code === currency)?.symbol || '$';
  const formatMoney = (val: number) => `${currencySymbol}${Math.round(val).toLocaleString()}`;

  // Load Metadata
  useEffect(() => {
    let active = true;
    api.getSalaryMetadata()
      .then((data) => {
        if (active) setMetadata(data);
      })
      .catch((err) => console.error('Failed to load salary metadata:', err));
    return () => { active = false; };
  }, []);

  // Fetch Verified Government & Industry Official Benchmark
  const fetchVerifiedBenchmark = async () => {
    setVerifyingBenchmark(true);
    try {
      const countryCode = locationTier.includes('uk') ? 'UK' : 'US';
      const data = await api.getVerifiedSalaryBenchmark({
        industry_id: selectedIndustry,
        role_title: roleTitle.trim(),
        country: countryCode,
        currency
      });
      setVerifiedBenchmark(data);
    } catch (err: any) {
      console.warn('Failed to load verified salary benchmark:', err);
    } finally {
      setVerifyingBenchmark(false);
    }
  };

  // Run Prediction
  const runPrediction = async () => {
    if (!roleTitle.trim()) return;
    setLoading(true);
    triggerTransition({
      title: 'Calibrating ML Regression Model...',
      subtitle: `Computing compensation bands & skill ROI multipliers for ${roleTitle}...`,
      badge: 'ML Compensation Predictor',
      icon: 'chart',
      accentColor: 'purple'
    }, 450);
    try {
      const data = await api.predictSalary({
        role_title: roleTitle.trim(),
        experience_years: experienceYears,
        skills: selectedSkills,
        location_tier: locationTier,
        company_tier: companyTier
      });
      setPrediction(data);
    } catch (err: any) {
      console.error('Salary prediction failed:', err);
    } finally {
      setLoading(false);
    }
  };

  // Run on parameters change
  useEffect(() => {
    runPrediction();
    fetchVerifiedBenchmark();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roleTitle, selectedIndustry, currency, experienceYears, locationTier, companyTier, selectedSkills]);

  // Toggle skill selection
  const toggleSkill = (skillName: string) => {
    setSelectedSkills((prev) =>
      prev.includes(skillName) ? prev.filter((s) => s !== skillName) : [...prev, skillName]
    );
  };

  // Auto-import skills from candidate resume
  const handleImportResumeSkills = (resumeId: string) => {
    const resume = resumes.find((r) => r.id === resumeId);
    if (!resume || !resume.skills) return;

    const extracted = resume.skills.map((s: any) => (typeof s === 'string' ? s : s.name));
    const merged = Array.from(new Set([...selectedSkills, ...extracted])).slice(0, 8);
    setSelectedSkills(merged);
  };

  return (
    <div className="space-y-6 sm:space-y-8 min-w-0">
      {/* Top Banner / Heading */}
      <div className="p-4 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 overflow-hidden min-w-0">
        <div className="min-w-0 space-y-1">
          <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-bold text-xs uppercase tracking-wider">
            <DollarSign className="w-4 h-4 shrink-0" />
            <span>Supervised ML Compensation Engine</span>
          </div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white mt-1">
              Market Salary Predictor & Compensation Benchmarks
            </h2>
            {loading && <RefreshCw className="w-4 h-4 animate-spin text-indigo-600 shrink-0" />}
          </div>
          <p className="text-xs text-slate-500 font-medium max-w-2xl leading-relaxed">
            Calibrated against verified engineering compensation data with location cost multipliers and high-ROI technical skill bonuses.
          </p>
        </div>

        {/* Resume Quick Sync */}
        {resumes.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <span className="text-xs font-semibold text-slate-500">Sync Candidate Skills:</span>
            <select
              onChange={(e) => handleImportResumeSkills(e.target.value)}
              defaultValue=""
              className="max-w-xs px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 truncate"
            >
              <option value="" disabled>Select Resume...</option>
              {resumes.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.title || r.file_name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Main Grid: Inputs vs Prediction Scorecard */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 items-start min-w-0">
        {/* Left Inputs Column (5 Cols) */}
        <div className="lg:col-span-5 space-y-6 min-w-0">
          <div className="p-4 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-5 overflow-hidden">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
              <Sliders className="w-4 h-4 text-indigo-600" />
              <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
                Profile & Compensation Parameters
              </h3>
            </div>

            {/* Industry & Currency Selectors */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-indigo-600" />
                  Industry Domain
                </label>
                <select
                  value={selectedIndustry}
                  onChange={(e) => handleIndustryChange(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-bold focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                >
                  {INDUSTRY_OPTIONS.map((ind) => (
                    <option key={ind.id} value={ind.id}>
                      {ind.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Globe2 className="w-3.5 h-3.5 text-indigo-600" />
                  Benchmark Currency
                </label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-bold focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                >
                  {CURRENCIES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Target Role Input & Cascade Role Presets */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Target Role / Title
                </label>
                <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold uppercase">
                  Filtered by {selectedIndustry}
                </span>
              </div>
              <input
                type="text"
                value={roleTitle}
                onChange={(e) => setRoleTitle(e.target.value)}
                placeholder="e.g. Senior Full Stack Engineer"
                className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs sm:text-sm font-semibold focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              />

              {/* Cascade Role Suggestions based on selected industry */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {(INDUSTRY_ROLES_MAP[selectedIndustry] || INDUSTRY_ROLES_MAP.tech).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRoleTitle(r)}
                    className={`px-2 py-0.5 rounded-lg text-[10px] font-semibold transition-colors cursor-pointer ${
                      roleTitle === r
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            {/* Experience Slider */}
            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-slate-700 dark:text-slate-300">Relevant Experience</span>
                <span className="text-indigo-600 font-black">{experienceYears} Years</span>
              </div>
              <input
                type="range"
                min="0"
                max="15"
                step="0.5"
                value={experienceYears}
                onChange={(e) => setExperienceYears(parseFloat(e.target.value))}
                className="w-full accent-indigo-600 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-400 font-semibold">
                <span>Entry (0y)</span>
                <span>Mid (3-5y)</span>
                <span>Senior (6-8y)</span>
                <span>Staff/Lead (10y+)</span>
              </div>
            </div>

            {/* Location Tier */}
            <div className="space-y-1.5 pt-2">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-indigo-600" />
                Geographic Market Tier
              </label>
              <select
                value={locationTier}
                onChange={(e) => setLocationTier(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs sm:text-sm font-semibold focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              >
                {(metadata?.location_tiers || [
                  { id: 'us_tier1', label: 'US Tier 1 (SF Bay Area, NYC, Seattle)', multiplier: 1.0 },
                  { id: 'us_tier2', label: 'US Tier 2 (Austin, Boston, Denver, Chicago)', multiplier: 0.88 },
                  { id: 'uk_europe', label: 'UK & Western Europe (London, Berlin, Amsterdam)', multiplier: 0.76 },
                  { id: 'canada_aus', label: 'Canada & Australia (Toronto, Sydney)', multiplier: 0.80 },
                  { id: 'remote_global', label: 'Global Remote / APAC / LatAm', multiplier: 0.65 }
                ]).map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.label} ({(loc.multiplier * 100).toFixed(0)}% base)
                  </option>
                ))}
              </select>
            </div>

            {/* Company Stage */}
            <div className="space-y-1.5 pt-2">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-indigo-600" />
                Company Sizing & Equity Structure
              </label>
              <select
                value={companyTier}
                onChange={(e) => setCompanyTier(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs sm:text-sm font-semibold focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              >
                {(metadata?.company_tiers || [
                  { id: 'early_startup', label: 'Early Stage Startup (Seed - Series A)', description: 'High equity, lower cash' },
                  { id: 'growth_scaleup', label: 'Growth Stage (Series B - Pre-IPO)', description: 'Balanced market comp' },
                  { id: 'enterprise_faang', label: 'Public Enterprise / Big Tech / FAANG', description: 'Top liquid cash and RSUs' }
                ]).map((comp) => (
                  <option key={comp.id} value={comp.id}>
                    {comp.label}
                  </option>
                ))}
              </select>
            </div>

            {/* High-ROI Technical Skill Boosters */}
            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  Mastered High-ROI Skills
                </span>
                <span className="text-emerald-600 font-bold text-[11px]">
                  +{prediction?.total_skill_premium_pct || 0}% Value Added
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Click skills to toggle them on/off and see live compensation adjustments:
              </p>

              <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto pt-1">
                {(metadata?.high_roi_skills || [
                  { key: 'kubernetes', name: 'Kubernetes', bonus_pct: 8 },
                  { key: 'distributed systems', name: 'Distributed Systems', bonus_pct: 10 },
                  { key: 'pytorch', name: 'PyTorch / Deep Learning', bonus_pct: 12 },
                  { key: 'llm', name: 'LLMs & GenAI', bonus_pct: 14 },
                  { key: 'kafka', name: 'Apache Kafka', bonus_pct: 7 },
                  { key: 'aws', name: 'AWS Cloud Architecture', bonus_pct: 7 },
                  { key: 'go', name: 'Golang', bonus_pct: 8 },
                  { key: 'rust', name: 'Rust Systems Programming', bonus_pct: 11 },
                  { key: 'security', name: 'Cybersecurity / DevSecOps', bonus_pct: 10 },
                  { key: 'typescript', name: 'TypeScript', bonus_pct: 6 },
                  { key: 'react', name: 'React & Modern UI', bonus_pct: 4 },
                  { key: 'postgresql', name: 'PostgreSQL Optimization', bonus_pct: 5 },
                  { key: 'redis', name: 'Redis In-Memory Caching', bonus_pct: 5 }
                ]).map((s) => {
                  const isSelected = selectedSkills.some((sk) => sk.toLowerCase().includes(s.key));
                  return (
                    <button
                      key={s.key}
                      type="button"
                      onClick={() => toggleSkill(s.name)}
                      className={`px-2.5 py-1 rounded-xl text-xs font-semibold transition-all cursor-pointer border ${
                        isSelected
                          ? 'bg-emerald-50 dark:bg-emerald-950/80 border-emerald-400 text-emerald-800 dark:text-emerald-300 font-bold'
                          : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                      }`}
                    >
                      {s.name} <span className="opacity-70 text-[10px]">+{s.bonus_pct}%</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Right Scorecard Column (7 Cols) */}
        <div className="lg:col-span-7 space-y-6 min-w-0">
          {prediction ? (
            <div className="space-y-6 min-w-0">
              {/* Main Total Compensation Spotlight Card */}
              <div className="p-5 sm:p-8 rounded-3xl bg-linear-to-br from-indigo-900 via-slate-900 to-indigo-950 text-white shadow-lg space-y-6 border border-indigo-800/60 overflow-hidden min-w-0">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/10">
                  <div>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-indigo-500/30 text-indigo-300 border border-indigo-400/30">
                      {prediction.market_tag}
                    </span>
                    <h3 className="text-xl sm:text-2xl font-black mt-2 leading-tight">
                      {prediction.role_title}
                    </h3>
                    <p className="text-xs text-indigo-200 font-medium">
                      {prediction.location_tier} • {prediction.company_tier}
                    </p>
                  </div>

                  <div className="text-left sm:text-right">
                    <p className="text-[10px] uppercase font-bold text-indigo-300">Target Total Comp (TC)</p>
                    <p className="text-2xl sm:text-3xl font-black text-emerald-400">
                      ${(prediction.compensation_breakdown.total_target_compensation).toLocaleString()}
                    </p>
                  </div>
                </div>

                {/* Compensation Package Breakdown Trio */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 space-y-1">
                    <p className="text-[10px] uppercase font-bold text-slate-300">Base Salary (Median)</p>
                    <p className="text-lg font-black text-white">
                      ${(prediction.compensation_breakdown.base_salary).toLocaleString()}
                    </p>
                    <p className="text-[10px] text-slate-400 font-medium">Guaranteed annual cash</p>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 space-y-1">
                    <p className="text-[10px] uppercase font-bold text-slate-300">Annual Bonus</p>
                    <p className="text-lg font-black text-amber-300">
                      ${(prediction.compensation_breakdown.annual_bonus).toLocaleString()}
                    </p>
                    <p className="text-[10px] text-slate-400 font-medium">
                      {prediction.compensation_breakdown.bonus_percentage}% performance target
                    </p>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 space-y-1">
                    <p className="text-[10px] uppercase font-bold text-slate-300">Equity Grant / RSUs</p>
                    <p className="text-lg font-black text-purple-300">
                      ${(prediction.compensation_breakdown.annual_equity).toLocaleString()}
                    </p>
                    <p className="text-[10px] text-slate-400 font-medium">Est. annual vesting value</p>
                  </div>
                </div>

                {/* Market Leverage Sentiment Note */}
                <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 flex items-center gap-3 text-xs">
                  <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
                  <div>
                    <span className="font-bold text-white">Market Sentiment: </span>
                    <span className="text-indigo-200">{prediction.market_sentiment}</span>
                  </div>
                </div>
              </div>

              {/* Verified Official Market-Pay Benchmark (Task 4) */}
              <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-emerald-600" />
                    <div>
                      <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">
                        Verified Official Market-Pay Benchmark
                      </h4>
                      <p className="text-[11px] text-slate-500 font-medium">
                        Grounded in BLS OEWS, O*NET, and international labor statistics
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      {verifiedBenchmark?.confidence ? `${verifiedBenchmark.confidence.toUpperCase()} CONFIDENCE` : 'HIGH CONFIDENCE'}
                    </span>
                    <button
                      type="button"
                      onClick={fetchVerifiedBenchmark}
                      disabled={verifyingBenchmark}
                      className="px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-[10px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <RefreshCw className={`w-3 h-3 ${verifyingBenchmark ? 'animate-spin' : ''}`} />
                      <span>Refresh</span>
                    </button>
                  </div>
                </div>

                {verifiedBenchmark ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
                      <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                        <span className="text-[10px] font-bold text-slate-400 block uppercase">Base Minimum</span>
                        <span className="text-sm font-black text-slate-800 dark:text-slate-200">
                          {formatMoney(verifiedBenchmark.base)}
                        </span>
                      </div>
                      <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                        <span className="text-[10px] font-bold text-slate-400 block uppercase">25th Percentile</span>
                        <span className="text-sm font-black text-slate-800 dark:text-slate-200">
                          {formatMoney(verifiedBenchmark.p25)}
                        </span>
                      </div>
                      <div className="p-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 ring-1 ring-indigo-500/20">
                        <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 block uppercase">Official Median</span>
                        <span className="text-sm font-black text-indigo-700 dark:text-indigo-300">
                          {formatMoney(verifiedBenchmark.median)}
                        </span>
                      </div>
                      <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800">
                        <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 block uppercase">75th Percentile</span>
                        <span className="text-sm font-black text-emerald-700 dark:text-emerald-300">
                          {formatMoney(verifiedBenchmark.p75)}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[11px] text-slate-500">
                      <div>
                        <span className="font-bold text-slate-700 dark:text-slate-300">Source: </span>
                        <span>{verifiedBenchmark.sources?.[0]?.name || 'BLS OEWS / O*NET Official Statistics'}</span>
                        {verifiedBenchmark.sample_size ? (
                          <span> (n = {verifiedBenchmark.sample_size.toLocaleString()})</span>
                        ) : null}
                      </div>
                      <div>
                        <span className="font-bold text-slate-700 dark:text-slate-300">Last Verified: </span>
                        <span>{new Date(verifiedBenchmark.retrieved_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic">Loading verified official salary statistics...</p>
                )}
              </div>

              {/* 4 Percentile Market Distribution Bar */}
              <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-5">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-indigo-600" />
                    <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">
                      Market Base Salary Distribution Bands
                    </h4>
                  </div>
                  <span className="text-[11px] font-semibold text-slate-400">{currency} Annual</span>
                </div>

                {/* Percentile Cards Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-center space-y-1">
                    <p className="text-[10px] font-bold uppercase text-slate-400">25th Percentile</p>
                    <p className="text-base font-black text-slate-800 dark:text-slate-200">
                      {formatMoney(prediction.percentiles.p25)}
                    </p>
                    <p className="text-[10px] text-slate-400">Conservative / Entry</p>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-indigo-50/80 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-center space-y-1 ring-1 ring-indigo-500/30">
                    <p className="text-[10px] font-bold uppercase text-indigo-600 dark:text-indigo-400">50th (Median)</p>
                    <p className="text-base font-black text-indigo-700 dark:text-indigo-300">
                      {formatMoney(prediction.percentiles.p50)}
                    </p>
                    <p className="text-[10px] text-indigo-600/70 dark:text-indigo-400/70">Fair Market Baseline</p>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-center space-y-1">
                    <p className="text-[10px] font-bold uppercase text-slate-400">75th Percentile</p>
                    <p className="text-base font-black text-slate-800 dark:text-slate-200">
                      {formatMoney(prediction.percentiles.p75)}
                    </p>
                    <p className="text-[10px] text-slate-400">Strong Candidate</p>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-purple-50/60 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 text-center space-y-1">
                    <p className="text-[10px] font-bold uppercase text-purple-600 dark:text-purple-400">90th Percentile</p>
                    <p className="text-base font-black text-purple-700 dark:text-purple-300">
                      {formatMoney(prediction.percentiles.p90)}
                    </p>
                    <p className="text-[10px] text-purple-600/70 dark:text-purple-400/70">Principal / Staff Tier</p>
                  </div>
                </div>

                {/* Offer Context & Anchors (Task 9) */}
                <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-2">
                    <div className="flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-emerald-600" />
                      <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                        Offer Context & Negotiation Anchors
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400">Data-Backed Strategy</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 space-y-1">
                      <span className="text-[10px] uppercase font-bold text-slate-400">Walk-Away Floor</span>
                      <p className="text-sm font-black text-slate-700 dark:text-slate-300">
                        {formatMoney(prediction.percentiles.p25)}
                      </p>
                      <p className="text-[10px] text-slate-500">Minimum acceptable base below which you decline.</p>
                    </div>

                    <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-800 space-y-1">
                      <span className="text-[10px] uppercase font-bold text-indigo-600 dark:text-indigo-400">Target Outcome</span>
                      <p className="text-sm font-black text-indigo-600 dark:text-indigo-400">
                        {formatMoney(prediction.percentiles.p50)}
                      </p>
                      <p className="text-[10px] text-slate-500">Market median baseline for your verified experience.</p>
                    </div>

                    <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-800 space-y-1">
                      <span className="text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400">Opening Ask (Anchor)</span>
                      <p className="text-sm font-black text-emerald-600 dark:text-emerald-400">
                        {formatMoney(prediction.suggested_negotiation_anchor)}
                      </p>
                      <p className="text-[10px] text-slate-500">Positioned near 75th percentile with room to compromise.</p>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
                    <div className="text-[11px] text-slate-500 font-medium space-y-0.5">
                      <p className="font-bold text-slate-700 dark:text-slate-300">Non-Salary Bargaining Levers:</p>
                      <p>Accelerated 6-Month Review • Sign-on Bonus • Flexible Remote Schedule • Learning Stipend</p>
                    </div>

                    {onLaunchNegotiation && (
                      <button
                        type="button"
                        onClick={() =>
                          onLaunchNegotiation(
                            prediction.role_title,
                            prediction.percentiles.p50,
                            prediction.suggested_negotiation_anchor
                          )
                        }
                        className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition-colors shrink-0 cursor-pointer"
                      >
                        <span>Simulate in Negotiation Coach</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Detected Skill ROI Boosters Breakdown */}
              {prediction.skill_roi_boosters.length > 0 && (
                <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                      <Award className="w-4 h-4 text-amber-500" />
                      <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">
                        Mastered Skill Value Multipliers ({prediction.skill_roi_boosters.length})
                      </h4>
                    </div>
                    <span className="text-xs font-bold text-emerald-600">
                      Total Premium: +{prediction.total_skill_premium_pct}%
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {prediction.skill_roi_boosters.map((booster) => (
                      <div
                        key={booster.skill}
                        className="p-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 flex items-center justify-between"
                      >
                        <div>
                          <p className="text-xs font-bold text-slate-800 dark:text-slate-200">{booster.skill}</p>
                          <p className="text-[10px] text-slate-400 font-medium">{booster.category}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-black text-emerald-600 dark:text-emerald-400">
                            +${(booster.estimated_annual_lift).toLocaleString()}
                          </p>
                          <p className="text-[10px] font-bold text-slate-500">+{booster.bonus_pct}% boost</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="p-12 text-center space-y-3 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <RefreshCw className="w-8 h-8 animate-spin text-indigo-600 mx-auto" />
              <p className="text-xs font-semibold text-slate-500">Estimating compensation regression models...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
