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
import { DisclaimerBanner } from '../components/DisclaimerBanner';
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
    <div className="w-full min-w-0 px-4 sm:px-6 lg:px-8 xl:px-10 pt-4 sm:pt-6 pb-16 space-y-6 sm:space-y-8">
      {/* Top Disclaimer Banner */}
      <DisclaimerBanner compact />

      {/* Modern, Elegant Career Intelligence Hero Card */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950/90 to-slate-900 border border-indigo-900/40 p-6 sm:p-8 text-white shadow-xl shadow-indigo-500/10">
        <div className="relative z-10 space-y-5">
          <div className="space-y-2.5">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-indigo-500/20 text-indigo-300 font-bold text-xs uppercase tracking-wider border border-indigo-500/30">
              <Compass className="w-4 h-4 text-indigo-400 animate-pulse" />
              <span>Global Career Intelligence & Market Compensation</span>
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight leading-tight">
              Career Navigator & Salary Intelligence
            </h1>
            <p className="text-xs sm:text-sm text-indigo-200/80 font-medium max-w-3xl leading-relaxed">
              Explore real-time global market salary benchmarks, directed Dijkstra career path bridging, ML compensation predictions, and AI-driven negotiation counter-offer simulations.
            </p>
          </div>

          {/* Clean, Full-Width Responsive Sub-Tab Switcher */}
          <div className="pt-4 border-t border-indigo-900/60">
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
              <button
                type="button"
                onClick={() => handleTabSelect('market')}
                className={`px-4 sm:px-5 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2.5 shrink-0 cursor-pointer ${
                  activeTab === 'market'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/30 ring-1 ring-indigo-400'
                    : 'bg-slate-800/80 text-slate-300 hover:text-white hover:bg-slate-800 border border-slate-700/60'
                }`}
              >
                <Globe className="w-4 h-4 shrink-0" />
                <span>Live Salary Explorer</span>
              </button>

              <button
                type="button"
                onClick={() => handleTabSelect('graph')}
                className={`px-4 sm:px-5 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2.5 shrink-0 cursor-pointer ${
                  activeTab === 'graph'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/30 ring-1 ring-indigo-400'
                    : 'bg-slate-800/80 text-slate-300 hover:text-white hover:bg-slate-800 border border-slate-700/60'
                }`}
              >
                <Compass className="w-4 h-4 shrink-0" />
                <span>Career Graph & Bridge</span>
              </button>

              <button
                type="button"
                onClick={() => handleTabSelect('salary')}
                className={`px-4 sm:px-5 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2.5 shrink-0 cursor-pointer ${
                  activeTab === 'salary'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/30 ring-1 ring-indigo-400'
                    : 'bg-slate-800/80 text-slate-300 hover:text-white hover:bg-slate-800 border border-slate-700/60'
                }`}
              >
                <DollarSign className="w-4 h-4 shrink-0" />
                <span>Salary Predictor</span>
              </button>

              <button
                type="button"
                onClick={() => handleTabSelect('coach')}
                className={`px-4 sm:px-5 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2.5 shrink-0 cursor-pointer ${
                  activeTab === 'coach'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/30 ring-1 ring-indigo-400'
                    : 'bg-slate-800/80 text-slate-300 hover:text-white hover:bg-slate-800 border border-slate-700/60'
                }`}
              >
                <MessageSquare className="w-4 h-4 shrink-0" />
                <span>Negotiation Coach</span>
              </button>
            </div>
          </div>
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
