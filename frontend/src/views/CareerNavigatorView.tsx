import React, { useState, useEffect } from 'react';
import {
  Compass,
  DollarSign,
  MessageSquare,
  Globe
} from 'lucide-react';
import { CareerKnowledgeGraph } from '../components/career/CareerKnowledgeGraph';
import { SalaryPredictorStudio } from '../components/career/SalaryPredictorStudio';
import { NegotiationCoachStudio } from '../components/career/NegotiationCoachStudio';
import { LiveMarketJobsStudio } from '../components/career/LiveMarketJobsStudio';
import { Resume, CareerProfile } from '../types';
import { api } from '../services/api';
import { useLoader } from '../context/useLoader';

interface CareerNavigatorViewProps {
  resumes?: Resume[];
}

export const CareerNavigatorView: React.FC<CareerNavigatorViewProps> = ({
  resumes = []
}) => {
  const { triggerTransition } = useLoader();
  const [activeTab, setActiveTab] = useState<'market' | 'graph' | 'salary' | 'coach'>('market');
  const [_userProfile, setUserProfile] = useState<CareerProfile | null>(null);
  const [activeIndustry, setActiveIndustry] = useState<string>('all');
  const [focusedRole, setFocusedRole] = useState<string>('Senior Full Stack Engineer');
  const [negotiationOffer, setNegotiationOffer] = useState<number>(140000);
  const [negotiationTarget, setNegotiationTarget] = useState<number>(165000);

  const handleTabSelect = (tab: 'market' | 'graph' | 'salary' | 'coach') => {
    if (tab === activeTab) return;
    const configMap = {
      market: {
        title: 'Connecting Global Telemetry...',
        subtitle: 'Querying 2026 Remote.com-grade salary explorer & exchange rates...',
        badge: 'Live Market Explorer',
        icon: 'globe' as const,
        accentColor: 'emerald'
      },
      graph: {
        title: 'Mapping Directed Knowledge Graph...',
        subtitle: 'Synchronizing 46 roles, 5 progression tiers & skill trees...',
        badge: 'Dijkstra Career Graph',
        icon: 'compass' as const,
        accentColor: 'indigo'
      },
      salary: {
        title: 'Calibrating ML Compensation Model...',
        subtitle: 'Evaluating regression percentiles & localized cost-of-living tiers...',
        badge: 'Salary Predictor ML',
        icon: 'chart' as const,
        accentColor: 'purple'
      },
      coach: {
        title: 'Initializing AI Recruiter Persona...',
        subtitle: 'Preparing game-theory leverage scoring & counter-offer scripts...',
        badge: 'Negotiation Coach',
        icon: 'briefcase' as const,
        accentColor: 'amber'
      }
    };
    triggerTransition(configMap[tab], 450);
    setActiveTab(tab);
  };

  // Load User Career Profile to initialize default industry
  useEffect(() => {
    let active = true;
    api.getProfile()
      .then((profile: CareerProfile) => {
        if (!active || !profile) return;
        setUserProfile(profile);
        if (profile.target_industry) {
          const norm = profile.target_industry.toLowerCase();
          if (norm.includes('health') || norm.includes('nurs') || norm.includes('medic')) {
            setActiveIndustry('healthcare');
          } else if (norm.includes('finan') || norm.includes('account') || norm.includes('bank')) {
            setActiveIndustry('finance');
          } else if (norm.includes('educat') || norm.includes('teach') || norm.includes('academ')) {
            setActiveIndustry('education');
          } else if (norm.includes('legal') || norm.includes('law') || norm.includes('complian')) {
            setActiveIndustry('legal');
          } else if (norm.includes('market') || norm.includes('design') || norm.includes('creat')) {
            setActiveIndustry('marketing');
          } else if (norm.includes('tech') || norm.includes('softw') || norm.includes('engineer')) {
            setActiveIndustry('tech');
          }
        }
        if (profile.target_title) {
          setFocusedRole(profile.target_title);
        }
      })
      .catch((err: unknown) => console.error('Failed to load profile for career defaults:', err));
    return () => { active = false; };
  }, []);

  // Transition from Graph / Market -> Salary Predictor
  const handleNavigateToSalary = (roleTitle: string) => {
    setFocusedRole(roleTitle);
    triggerTransition({
      title: 'Opening Salary Predictor...',
      subtitle: `Pre-populating machine learning model for ${roleTitle}...`,
      badge: 'ML Compensation Model',
      icon: 'chart',
      accentColor: 'purple'
    }, 450);
    setActiveTab('salary');
  };

  const handleNavigateToGraph = (roleTitle: string) => {
    setFocusedRole(roleTitle);
    triggerTransition({
      title: 'Opening Career Knowledge Graph...',
      subtitle: `Locating progression bridges for ${roleTitle}...`,
      badge: 'Knowledge Graph',
      icon: 'compass',
      accentColor: 'indigo'
    }, 450);
    setActiveTab('graph');
  };

  // Transition from Salary Predictor -> Negotiation Coach
  const handleLaunchNegotiation = (role: string, offer: number, target: number) => {
    setFocusedRole(role);
    setNegotiationOffer(offer);
    setNegotiationTarget(target);
    triggerTransition({
      title: 'Starting Negotiation Simulator...',
      subtitle: `Simulating high-leverage compensation counter-offers for ${role}...`,
      badge: 'Game Theory Coach',
      icon: 'briefcase',
      accentColor: 'amber'
    }, 450);
    setActiveTab('coach');
  };

  return (
    <div className="w-full max-w-[1720px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 pt-6 sm:pt-8 lg:pt-10 pb-16 space-y-6 sm:space-y-8">
      {/* View Header with Sub-tab Switcher */}
      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-6 pb-6 border-b border-slate-200 dark:border-slate-800">
        <div className="space-y-2 min-w-0 flex-1">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 font-bold text-xs uppercase tracking-wider border border-indigo-200/60 dark:border-indigo-800/60">
            <Compass className="w-4 h-4 shrink-0" />
            <span>Pillars 3 & 5 • Algorithmic Career Engine</span>
          </div>
          <h1 className="text-2xl sm:text-3xl xl:text-4xl font-black text-slate-900 dark:text-white tracking-tight leading-snug">
            Career Navigator & Salary Intelligence
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium max-w-3xl leading-relaxed">
            Explore live market salary benchmarks, directed Dijkstra career path bridging, ML compensation predictions, and HR counter-offer simulations.
          </p>
        </div>

        {/* Tab Pill Switcher */}
        <div className="flex items-center p-1.5 rounded-2xl bg-slate-100 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/80 shrink-0 gap-1 overflow-x-auto self-start xl:self-end">
          <button
            type="button"
            onClick={() => handleTabSelect('market')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'market'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Globe className="w-4 h-4" />
            <span>Live Salary Explorer</span>
          </button>

          <button
            type="button"
            onClick={() => handleTabSelect('graph')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'graph'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Compass className="w-4 h-4" />
            <span>Career Graph & Bridge</span>
          </button>

          <button
            type="button"
            onClick={() => handleTabSelect('salary')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'salary'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <DollarSign className="w-4 h-4" />
            <span>Salary Predictor</span>
          </button>

          <button
            type="button"
            onClick={() => handleTabSelect('coach')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'coach'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            <span>Negotiation Coach</span>
          </button>
        </div>
      </div>

      {/* Active Tab View Rendering */}
      {activeTab === 'market' && (
        <LiveMarketJobsStudio
          initialRoleTitle={focusedRole}
          onNavigateToSalary={handleNavigateToSalary}
          onNavigateToNegotiator={handleLaunchNegotiation}
          onNavigateToGraph={handleNavigateToGraph}
        />
      )}

      {activeTab === 'graph' && (
        <CareerKnowledgeGraph
          initialIndustry={activeIndustry}
          initialRole={focusedRole}
          resumes={resumes}
          onNavigateToSalary={handleNavigateToSalary}
        />
      )}

      {activeTab === 'salary' && (
        <SalaryPredictorStudio
          initialIndustry={activeIndustry}
          initialRole={focusedRole}
          resumes={resumes}
          onLaunchNegotiation={handleLaunchNegotiation}
        />
      )}

      {activeTab === 'coach' && (
        <NegotiationCoachStudio
          initialIndustry={activeIndustry}
          initialRole={focusedRole}
          initialOffer={negotiationOffer}
          initialTarget={negotiationTarget}
        />
      )}
    </div>
  );
};
