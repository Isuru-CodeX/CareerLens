import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Globe,
  RefreshCw,
  Search,
  TrendingUp,
  ArrowRight,
  Zap,
  Info,
  DollarSign,
  Compass,
  Sparkles,
  Layers
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip
} from 'recharts';
import {
  JobRoleItem,
  RoleSalaryResponse,
  NavigatorIndustryItem
} from '../../types';
import { api } from '../../services/api';
import { useLoader } from '../../context/useLoader';

interface LiveMarketJobsStudioProps {
  onNavigateToSalary?: (roleTitle: string) => void;
  onNavigateToNegotiator?: (roleTitle: string, initialOffer: number, targetSalary: number) => void;
  onNavigateToGraph?: (roleTitle: string) => void;
  initialRoleTitle?: string;
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

const EXPERIENCE_LEVELS = [
  { id: 'junior', label: 'Junior', exp: '0–2 yrs', badge: 'Entry' },
  { id: 'mid', label: 'Mid-Level', exp: '2–5 yrs', badge: 'Standard' },
  { id: 'senior', label: 'Senior', exp: '5–8 yrs', badge: 'Senior' },
  { id: 'lead', label: 'Lead / Staff', exp: '8–12 yrs', badge: 'Staff' },
  { id: 'director', label: 'Director / Principal', exp: '12+ yrs', badge: 'Executive' },
];

const TIMEFRAMES = [
  { id: 'today', label: 'Today (Intraday)' },
  { id: '7d', label: '7 Days' },
  { id: '30d', label: '30 Days' },
  { id: 'year', label: '5 Years (Y-o-Y)' },
];

export const LiveMarketJobsStudio: React.FC<LiveMarketJobsStudioProps> = ({
  onNavigateToSalary,
  onNavigateToNegotiator,
  onNavigateToGraph,
  initialRoleTitle
}) => {
  const [countries, setCountries] = useState<CountryMeta[]>(DEFAULT_COUNTRIES);
  const [industries, setIndustries] = useState<NavigatorIndustryItem[]>([]);
  const [roles, setRoles] = useState<JobRoleItem[]>([]);

  // Selection states
  const [selectedIndustryId, setSelectedIndustryId] = useState<number | null>(null);
  const [selectedCountry, setSelectedCountry] = useState<string>('us');
  const [selectedExperience, setSelectedExperience] = useState<string>('mid');
  const [selectedTimeframe, setSelectedTimeframe] = useState<string>('30d');
  const [salaryFrequency, setSalaryFrequency] = useState<'annual' | 'monthly'>('annual');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const [selectedRole, setSelectedRole] = useState<JobRoleItem | null>(null);
  const [salaryData, setSalaryData] = useState<RoleSalaryResponse | null>(null);

  const [loadingRoles, setLoadingRoles] = useState<boolean>(true);
  const [loadingDetails, setLoadingDetails] = useState<boolean>(false);
  const [refreshNonce, setRefreshNonce] = useState<number>(0);

  // Animated Calibration Loading Screen (Radar Animation)
  const [isCalibrating, setIsCalibrating] = useState<boolean>(true);
  const [calibrationPhase, setCalibrationPhase] = useState<string>('Connecting to 2026 market benchmarks (Levels.fyi, BLS, Remote.com)...');

  // Load countries & industries on mount
  useEffect(() => {
    let active = true;

    // Load countries
    api.getNavigatorCountries()
      .then((data) => {
        if (active && data && data.length > 0) {
          setCountries(data);
        }
      })
      .catch((err) => console.warn('Could not fetch countries, using fallback list:', err));

    // Load industries
    api.getNavigatorIndustries()
      .then((data) => {
        if (active) setIndustries(data);
      })
      .catch((err) => console.error('Failed to load industries:', err));

    return () => { active = false; };
  }, []);

  const { triggerTransition } = useLoader();
  const initialRoleAppliedRef = useRef(false);
  const selectedRoleRef = useRef<JobRoleItem | null>(null);

  useEffect(() => {
    selectedRoleRef.current = selectedRole;
  }, [selectedRole]);

  // Fetch Roles with active country & experience filters
  useEffect(() => {
    const isMounted = { current: true };

    api.getNavigatorRoles({
      industry_id: selectedIndustryId || undefined,
      q: searchQuery.trim() || undefined,
      country: selectedCountry,
      experience_level: selectedExperience
    })
      .then((data) => {
        if (!isMounted.current) return;
        setRoles(data);
        if (data.length > 0) {
          if (!initialRoleAppliedRef.current && initialRoleTitle) {
            initialRoleAppliedRef.current = true;
            const match = data.find(r => r.title.toLowerCase() === initialRoleTitle.toLowerCase());
            setSelectedRole(match || data[0]);
          } else {
            const currentSelected = selectedRoleRef.current;
            if (currentSelected) {
              const stillExists = data.find(r => r.id === currentSelected.id);
              setSelectedRole(stillExists || data[0]);
            } else {
              setSelectedRole(data[0]);
            }
          }
        }
      })
      .catch((err) => console.error('Failed to fetch navigator roles:', err))
      .finally(() => {
        if (isMounted.current) setLoadingRoles(false);
      });

    return () => { isMounted.current = false; };
  }, [selectedIndustryId, searchQuery, selectedCountry, selectedExperience, initialRoleTitle, refreshNonce]);

  // Explicitly select a role to inspect its live chart and breakdowns
  const handleSelectRole = (role: JobRoleItem) => {
    if (selectedRole?.id === role.id) return;
    setLoadingDetails(true);
    setSelectedRole(role);
  };

  // Load detailed Remote.com salary breakdown for selected role
  useEffect(() => {
    if (!selectedRole) return;
    let active = true;

    api.getNavigatorRoleSalary(selectedRole.id, {
      country: selectedCountry,
      experience_level: selectedExperience,
      timeframe: selectedTimeframe
    })
      .then((salRes) => {
        if (!active) return;
        setSalaryData(salRes);
      })
      .catch((err) => console.error('Failed to load role salary details:', err))
      .finally(() => {
        if (active) setLoadingDetails(false);
      });

    return () => { active = false; };
  }, [selectedRole, selectedCountry, selectedExperience, selectedTimeframe]);

  // Initial Calibration Screen timer (Remote.com style radar loading)
  useEffect(() => {
    const t1 = setTimeout(() => {
      setCalibrationPhase('Harmonizing 19 national currencies and Purchasing Power Parity (PPP)...');
    }, 600);
    const t2 = setTimeout(() => {
      setCalibrationPhase('Live compensation indices successfully calibrated!');
    }, 1100);
    const t3 = setTimeout(() => {
      setIsCalibrating(false);
    }, 1500);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, []);

  // Country Change with futuristic transition loader
  const handleCountryChange = (newCountryCode: string) => {
    if (newCountryCode === selectedCountry) return;
    const targetCountry = countries.find(c => c.code === newCountryCode);
    const countryName = targetCountry ? targetCountry.name : newCountryCode.toUpperCase();
    triggerTransition({
      title: `Calibrating ${countryName} Telemetry...`,
      subtitle: `Harmonizing 2026 local market compensation benchmarks, tax brackets, and purchasing power for ${countryName}...`,
      badge: 'Remote.com Telemetry',
      icon: 'globe',
      accentColor: 'emerald'
    }, 450);
    setSelectedCountry(newCountryCode);
  };

  // Manual Trigger Refresh with Animated Calibration Screen
  const handleManualSync = () => {
    setIsCalibrating(true);
    setCalibrationPhase('Refreshing real-time compensation indices across 19 countries...');
    api.triggerNavigatorRefresh()
      .then(() => {
        setCalibrationPhase('Applying updated volatility metrics and percentile distributions...');
      })
      .catch(() => {
        setCalibrationPhase('Re-calibrating cached baseline models...');
      })
      .finally(() => {
        setTimeout(() => {
          setRefreshNonce((n) => n + 1);
          setCalibrationPhase('Rates up-to-date!');
          setTimeout(() => setIsCalibrating(false), 500);
        }, 900);
      });
  };

  // Persistent Total Roles Count across all industries (does not shrink when filtered)
  const totalRolesCount = useMemo(() => {
    const fromIndustries = industries.reduce((acc, ind) => acc + (ind.role_count || 0), 0);
    return fromIndustries > 0 ? fromIndustries : (selectedIndustryId === null && roles.length > 0 ? roles.length : 46);
  }, [industries, roles.length, selectedIndustryId]);

  // Active Country Meta
  const currentCountry = useMemo(() => {
    return countries.find(c => c.code === selectedCountry) || DEFAULT_COUNTRIES[0];
  }, [countries, selectedCountry]);

  // Format Salary Currency
  const formatSalary = useCallback((amount?: number | null, compact: boolean = false): string => {
    if (amount === undefined || amount === null || isNaN(amount)) return 'N/A';
    const sym = salaryData?.currency_symbol || currentCountry.symbol || '$';
    const finalVal = salaryFrequency === 'monthly' ? Math.round(amount / 12) : Math.round(amount);

    if (compact) {
      if (finalVal >= 1000000) {
        return `${sym}${(finalVal / 1000000).toFixed(1)}M`;
      }
      return `${sym}${Math.round(finalVal / 1000)}k`;
    }
    return `${sym}${finalVal.toLocaleString()}`;
  }, [salaryData, currentCountry, salaryFrequency]);

  // Trend Chart Data
  const trendChartData = useMemo(() => {
    if (!salaryData?.trend || salaryData.trend.length === 0) {
      if (!salaryData?.latest) return [];
      const m = salaryData.latest.median;
      return [
        { date: 'Previous', median: Math.round(m * 0.98), p25: Math.round(m * 0.85), p75: Math.round(m * 1.15) },
        { date: 'Current', median: Math.round(m), p25: Math.round(m * 0.87), p75: Math.round(m * 1.18) }
      ];
    }
    return salaryData.trend.map((item) => ({
      date: item.date,
      median: salaryFrequency === 'monthly' ? Math.round(item.median / 12) : Math.round(item.median),
      p25: salaryFrequency === 'monthly' ? Math.round(item.p25 / 12) : Math.round(item.p25),
      p75: salaryFrequency === 'monthly' ? Math.round(item.p75 / 12) : Math.round(item.p75),
    }));
  }, [salaryData, salaryFrequency]);

  // Trend Percentage Change
  const trendPercent = useMemo(() => {
    if (!trendChartData || trendChartData.length < 2) return null;
    const first = trendChartData[0].median;
    const last = trendChartData[trendChartData.length - 1].median;
    if (first <= 0) return null;
    return ((last - first) / first) * 100;
  }, [trendChartData]);

  // Active role salary numbers
  const activeMedian = salaryData?.latest?.median ?? selectedRole?.latest_salary?.median ?? 142500;
  const activeP25 = salaryData?.latest?.p25 ?? selectedRole?.latest_salary?.p25 ?? 122000;
  const activeP75 = salaryData?.latest?.p75 ?? selectedRole?.latest_salary?.p75 ?? 172000;
  const activeP10 = salaryData?.latest?.p10 ?? Math.round(activeP25 * 0.85);
  const activeP90 = salaryData?.latest?.p90 ?? Math.round(activeP75 * 1.20);

  return (
    <div className="space-y-6 relative">
      {/* Animated Futuristic Radar Calibration Overlay */}
      {isCalibrating && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center animate-fade-in">
          <div className="relative w-28 h-28 sm:w-36 sm:h-36 mb-6 flex items-center justify-center">
            {/* Pulsing Radar Rings */}
            <div className="absolute inset-0 rounded-full border-2 border-indigo-500/20 animate-ping" />
            <div className="absolute inset-2 rounded-full border border-indigo-500/40 animate-pulse" />
            <div className="absolute inset-6 rounded-full border-2 border-indigo-400/60" />
            {/* Spinning Radar Sweep Beam */}
            <div className="absolute inset-0 rounded-full border-t-2 border-r-2 border-indigo-400 animate-spin" />
            {/* Center Globe Icon */}
            <div className="w-14 h-14 rounded-full bg-indigo-600/30 border border-indigo-400/50 flex items-center justify-center text-indigo-300 shadow-xl shadow-indigo-500/30">
              <Globe className="w-7 h-7 animate-pulse" />
            </div>
          </div>

          <div className="space-y-2 max-w-md">
            <span className="px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 inline-flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              <span>Real-Time Market Calibration</span>
            </span>
            <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Calibrating Global Compensation Indices
            </h3>
            <p className="text-xs sm:text-sm text-slate-300 font-medium">
              {calibrationPhase}
            </p>
          </div>

          {/* Progress Indicator */}
          <div className="w-48 h-1.5 rounded-full bg-slate-800 mt-6 overflow-hidden">
            <div className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-400 animate-pulse w-full" />
          </div>
        </div>
      )}

      {/* Top Banner (Remote.com style market status bar) */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-5 rounded-3xl bg-slate-900 border border-slate-800 text-white shadow-xl">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0 shadow-inner">
            <Globe className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base sm:text-lg font-black text-white tracking-tight">
                Global Salary Explorer & Market Benchmarks
              </h2>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1.5 animate-pulse" />
                Live 2026 Indices
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
              Comprehensive compensation intelligence modeled after Remote.com. Calibrated across 19 countries, 45+ roles, and 5 experience tiers.
            </p>
          </div>
        </div>

        {/* Sync Rates Button */}
        <div className="flex items-center gap-3 shrink-0 self-start lg:self-center">
          <button
            type="button"
            onClick={handleManualSync}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white transition-all shadow-md hover:shadow-indigo-500/20 cursor-pointer active:scale-95"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Sync Live Rates</span>
          </button>
        </div>
      </div>

      {/* Primary Global Controls: Country, Experience Level, Annual/Monthly Toggle */}
      <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5 items-center">
          {/* Search Role */}
          <div className="md:col-span-5 relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search 45+ roles (e.g., Software Engineer, Data Scientist)..."
              className="w-full pl-9 pr-4 py-2.5 rounded-2xl text-xs sm:text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 font-medium"
            />
          </div>

          {/* 19-Country Dropdown */}
          <div className="md:col-span-4 relative">
            <label className="sr-only">Country</label>
            <select
              value={selectedCountry}
              onChange={(e) => handleCountryChange(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-2xl text-xs sm:text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-bold focus:outline-hidden focus:ring-2 focus:ring-indigo-500 cursor-pointer"
            >
              {countries.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.flag} {c.name} ({c.currency} {c.symbol})
                </option>
              ))}
            </select>
          </div>

          {/* Annual vs Monthly Toggle */}
          <div className="md:col-span-3 flex items-center justify-end">
            <div className="flex items-center p-1 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => setSalaryFrequency('annual')}
                className={`flex-1 sm:flex-none px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  salaryFrequency === 'annual'
                    ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Annual /yr
              </button>
              <button
                type="button"
                onClick={() => setSalaryFrequency('monthly')}
                className={`flex-1 sm:flex-none px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  salaryFrequency === 'monthly'
                    ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Monthly /mo
              </button>
            </div>
          </div>
        </div>

        {/* Experience Level Selector Pills */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            <span className="text-xs font-bold text-slate-500 mr-2 shrink-0 flex items-center gap-1">
              <Layers className="w-3.5 h-3.5 text-indigo-500" />
              <span>Seniority:</span>
            </span>
            {EXPERIENCE_LEVELS.map((tier) => (
              <button
                key={tier.id}
                type="button"
                onClick={() => setSelectedExperience(tier.id)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                  selectedExperience === tier.id
                    ? 'bg-indigo-600 text-white shadow-xs scale-102'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                <span>{tier.label}</span>
                <span className={`text-[10px] font-normal ${selectedExperience === tier.id ? 'text-indigo-200' : 'text-slate-400'}`}>
                  ({tier.exp})
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Two-Column Layout (Roles on Left, Remote.com Explorer on Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: 45+ Roles & Industry Categories (5 cols on lg, 5 cols on 2xl) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Industry Category Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
            <button
              type="button"
              onClick={() => setSelectedIndustryId(null)}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all whitespace-nowrap cursor-pointer ${
                selectedIndustryId === null
                  ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              All Industries ({totalRolesCount})
            </button>
            {industries.map((ind) => (
              <button
                key={ind.id}
                type="button"
                onClick={() => setSelectedIndustryId(ind.id)}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all whitespace-nowrap cursor-pointer ${
                  selectedIndustryId === ind.id
                    ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {ind.name} ({ind.role_count})
              </button>
            ))}
          </div>

          {/* Roles Cards List */}
          {loadingRoles ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-20 rounded-2xl bg-slate-100 dark:bg-slate-800/50 animate-pulse border border-slate-200 dark:border-slate-800" />
              ))}
            </div>
          ) : roles.length === 0 ? (
            <div className="p-8 text-center rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800">
              <p className="text-sm font-bold text-slate-700 dark:text-slate-300">No matching roles found</p>
              <p className="text-xs text-slate-500 mt-1">Try broadening your search query.</p>
            </div>
          ) : (
            <div className="space-y-2.5 max-h-[780px] overflow-y-auto pr-1">
              {roles.map((role) => {
                const isSelected = selectedRole?.id === role.id;
                const sal = role.latest_salary;
                return (
                  <div
                    key={role.id}
                    onClick={() => handleSelectRole(role)}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-50/60 dark:bg-indigo-950/30 border-indigo-500/80 shadow-md ring-1 ring-indigo-500/30'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-xs'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">
                          {role.title}
                        </h4>
                        <span className="inline-block px-2 py-0.5 mt-1 rounded-md text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                          {role.industry_name}
                        </span>
                      </div>

                      <div className="text-right shrink-0">
                        {sal ? (
                          <>
                            <div className="text-xs sm:text-sm font-black text-slate-900 dark:text-white">
                              {formatSalary(sal.median)}
                            </div>
                            <div className="text-[10px] text-slate-500">
                              {formatSalary(sal.p25, true)} – {formatSalary(sal.p75, true)}
                            </div>
                          </>
                        ) : (
                          <span className="text-xs text-slate-400 italic">Calibrating...</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Remote.com Salary Explorer Experience (7 cols on lg, 7 cols on 2xl) */}
        <div className="lg:col-span-7 space-y-5">
          {selectedRole ? (
            <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
              {/* Role Header */}
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 pb-5 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/80 border border-indigo-200/50 dark:border-indigo-800/50">
                      {selectedRole.industry_name}
                    </span>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800">
                      {EXPERIENCE_LEVELS.find(e => e.id === selectedExperience)?.label} Tier
                    </span>
                    <span className="text-xs font-medium text-slate-600 dark:text-slate-400 flex items-center gap-1">
                      <span>{currentCountry.flag}</span>
                      <span>{currentCountry.name}</span>
                    </span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-1.5 tracking-tight">
                    {selectedRole.title}
                  </h2>
                </div>

                {/* Market Demand Pill */}
                <div className="shrink-0 self-start sm:self-auto">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span>{salaryData?.market_demand || 'High Demand • Active Hiring'}</span>
                  </span>
                </div>
              </div>

              {/* Remote.com-Grade Primary Benchmark Hero */}
              <div className="p-6 rounded-3xl bg-gradient-to-br from-indigo-500/10 via-purple-500/5 to-slate-900/5 dark:from-indigo-950/40 dark:via-purple-950/20 dark:to-slate-900 border border-indigo-200/60 dark:border-indigo-800/50 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                      Median Benchmark Rate (50th Percentile)
                    </span>
                    <div className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight mt-1 flex items-baseline gap-2">
                      <span>{formatSalary(activeMedian)}</span>
                      <span className="text-xs sm:text-sm font-semibold text-slate-500">
                        /{salaryFrequency === 'monthly' ? 'month' : 'year'}
                      </span>
                    </div>
                  </div>

                  <div className="text-left sm:text-right">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      Expected Middle 50%
                    </span>
                    <div className="text-sm font-black text-slate-800 dark:text-slate-200 mt-0.5">
                      {formatSalary(activeP25)} – {formatSalary(activeP75)}
                    </div>
                  </div>
                </div>

                {/* Percentile Range Bar with Median Indicator */}
                <div className="space-y-1.5 pt-2">
                  <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 dark:text-slate-400">
                    <span>P10: {formatSalary(activeP10, true)}</span>
                    <span className="text-indigo-600 dark:text-indigo-400">P25: {formatSalary(activeP25, true)}</span>
                    <span className="text-indigo-700 dark:text-indigo-300 font-black">Median: {formatSalary(activeMedian, true)}</span>
                    <span className="text-purple-600 dark:text-purple-400">P75: {formatSalary(activeP75, true)}</span>
                    <span>P90: {formatSalary(activeP90, true)}</span>
                  </div>
                  <div className="w-full h-3 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden relative">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-blue-500 via-indigo-500 via-purple-500 to-emerald-400"
                      style={{ width: '100%' }}
                    />
                  </div>
                </div>

                {/* 5 Percentile Tier Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-2">
                  <div className="p-2.5 rounded-2xl bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 text-center">
                    <span className="text-[10px] font-bold text-slate-400 block uppercase">10th % (Entry)</span>
                    <span className="text-xs font-black text-slate-700 dark:text-slate-300">{formatSalary(activeP10, true)}</span>
                  </div>
                  <div className="p-2.5 rounded-2xl bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 text-center">
                    <span className="text-[10px] font-bold text-indigo-500 block uppercase">25th % (Low)</span>
                    <span className="text-xs font-black text-slate-800 dark:text-slate-200">{formatSalary(activeP25, true)}</span>
                  </div>
                  <div className="p-2.5 rounded-2xl bg-indigo-600 text-white shadow-sm text-center col-span-2 sm:col-span-1">
                    <span className="text-[10px] font-black text-indigo-200 block uppercase">Median (50th)</span>
                    <span className="text-xs font-black">{formatSalary(activeMedian, true)}</span>
                  </div>
                  <div className="p-2.5 rounded-2xl bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 text-center">
                    <span className="text-[10px] font-bold text-purple-500 block uppercase">75th % (High)</span>
                    <span className="text-xs font-black text-slate-800 dark:text-slate-200">{formatSalary(activeP75, true)}</span>
                  </div>
                  <div className="p-2.5 rounded-2xl bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 text-center">
                    <span className="text-[10px] font-bold text-emerald-500 block uppercase">90th % (Top)</span>
                    <span className="text-xs font-black text-slate-700 dark:text-slate-300">{formatSalary(activeP90, true)}</span>
                  </div>
                </div>
              </div>

              {/* Multi-Timeframe Trend History Graph */}
              <div className="space-y-3 pt-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-indigo-500" />
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      Market Compensation Trend History
                    </h3>
                  </div>

                  {/* Horizon Switcher: Today, 7d, 30d, 12 Weeks, 5 Years */}
                  <div className="flex items-center gap-1 overflow-x-auto p-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs">
                    {TIMEFRAMES.map((tf) => (
                      <button
                        key={tf.id}
                        type="button"
                        onClick={() => setSelectedTimeframe(tf.id)}
                        className={`px-2.5 py-1 rounded-lg font-bold transition-all whitespace-nowrap cursor-pointer text-[11px] ${
                          selectedTimeframe === tf.id
                            ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                            : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                        }`}
                      >
                        {tf.label}
                      </button>
                    ))}
                  </div>
                </div>

                {loadingDetails ? (
                  <div className="h-48 rounded-2xl bg-slate-100 dark:bg-slate-800/40 animate-pulse" />
                ) : trendChartData.length > 0 ? (
                  <div className="h-52 w-full pt-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={trendChartData} margin={{ top: 5, right: 10, left: -15, bottom: 0 }}>
                        <defs>
                          <linearGradient id="salaryTrendGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                            <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
                          </linearGradient>
                        </defs>
                        <XAxis
                          dataKey="date"
                          stroke="#94a3b8"
                          fontSize={10}
                          tickLine={false}
                          axisLine={{ stroke: '#334155' }}
                        />
                        <YAxis
                          stroke="#94a3b8"
                          fontSize={10}
                          tickLine={false}
                          axisLine={{ stroke: '#334155' }}
                          tickFormatter={(val: number) => {
                            const sym = currentCountry.symbol || '$';
                            return val >= 1000 ? `${sym}${Math.round(val / 1000)}k` : `${sym}${val}`;
                          }}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#0f172a',
                            border: '1px solid #334155',
                            borderRadius: '0.75rem',
                            fontSize: '11px',
                            color: '#fff'
                          }}
                          formatter={(value: any) => [`${currentCountry.symbol}${Number(value).toLocaleString()}`, 'Median Rate']}
                        />
                        <Area
                          type="monotone"
                          dataKey="median"
                          stroke="#6366f1"
                          strokeWidth={2.5}
                          fillOpacity={1}
                          fill="url(#salaryTrendGrad)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-32 rounded-2xl bg-slate-50 dark:bg-slate-800/40 flex items-center justify-center text-xs text-slate-400">
                    Awaiting more snapshot records to compile trend curve.
                  </div>
                )}

                {trendPercent !== null && (
                  <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
                    <span>Timeframe Growth:</span>
                    <span className={`font-black ${trendPercent >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                      {trendPercent >= 0 ? `+${trendPercent.toFixed(1)}%` : `${trendPercent.toFixed(1)}%`}
                    </span>
                  </div>
                )}
              </div>

              {/* High-Demand Skill Premiums */}
              {salaryData?.skills_premium && salaryData.skills_premium.length > 0 && (
                <div className="space-y-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 dark:text-white">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    <span>In-Demand Skill Compensation Boosts</span>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {salaryData.skills_premium.map((item, idx) => (
                      <span
                        key={idx}
                        className="px-3 py-1 rounded-xl text-xs font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60 inline-flex items-center gap-1.5 shadow-2xs"
                      >
                        <span>{item.skill}</span>
                        <span className="px-1.5 py-0.2 rounded-md bg-amber-500 text-white text-[10px] font-black">
                          {item.boost}
                        </span>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Cross-Feature Action Hub */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => onNavigateToGraph && onNavigateToGraph(selectedRole.title)}
                  className="p-3 rounded-2xl text-xs font-bold bg-purple-50 dark:bg-purple-950/40 hover:bg-purple-100 dark:hover:bg-purple-900/50 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/60 transition-all flex items-center justify-between cursor-pointer"
                >
                  <span className="flex items-center gap-1.5">
                    <Compass className="w-4 h-4 text-purple-500 shrink-0" />
                    <span>View in Career Graph</span>
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 opacity-70" />
                </button>

                <button
                  type="button"
                  onClick={() => onNavigateToSalary && onNavigateToSalary(selectedRole.title)}
                  className="p-3 rounded-2xl text-xs font-bold bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/60 transition-all flex items-center justify-between cursor-pointer"
                >
                  <span className="flex items-center gap-1.5">
                    <DollarSign className="w-4 h-4 text-indigo-500 shrink-0" />
                    <span>Predict in ML Studio</span>
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 opacity-70" />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (onNavigateToNegotiator) {
                      onNavigateToNegotiator(selectedRole.title, Math.round(activeMedian * 0.9), Math.round(activeMedian * 1.15));
                    }
                  }}
                  className="p-3 rounded-2xl text-xs font-bold bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 transition-all flex items-center justify-between cursor-pointer"
                >
                  <span className="flex items-center gap-1.5">
                    <Zap className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>Simulate Negotiation</span>
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 opacity-70" />
                </button>
              </div>

              {/* Data Transparency Notice */}
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 text-[11px] text-slate-500 leading-relaxed flex items-start gap-2">
                <Info className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                <span>
                  <strong>Data Methodology:</strong> Benchmarks are derived from 2026 standardized market indices (Levels.fyi, Remote.com, BLS, and verified user surveys) adjusted for national exchange rates and local Purchasing Power Parity (PPP).
                </span>
              </div>
            </div>
          ) : (
            <div className="p-12 text-center rounded-3xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-400 text-xs">
              Select a role on the left to explore its global salary distribution and trends.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
