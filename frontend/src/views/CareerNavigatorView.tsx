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

interface CareerNavigatorViewProps {
  resumes?: Resume[];
}

export const CareerNavigatorView: React.FC<CareerNavigatorViewProps> = ({
  resumes = []
}) => {
  const [activeTab, setActiveTab] = useState<'market' | 'graph' | 'salary' | 'coach'>('market');
  const [_userProfile, setUserProfile] = useState<CareerProfile | null>(null);
  const [activeIndustry, setActiveIndustry] = useState<string>('all');
  const [focusedRole, setFocusedRole] = useState<string>('Senior Full Stack Engineer');
  const [negotiationOffer, setNegotiationOffer] = useState<number>(140000);
  const [negotiationTarget, setNegotiationTarget] = useState<number>(165000);

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
    setActiveTab('salary');
  };

  const handleNavigateToGraph = (roleTitle: string) => {
    setFocusedRole(roleTitle);
    setActiveTab('graph');
  };

  // Transition from Salary Predictor -> Negotiation Coach
  const handleLaunchNegotiation = (role: string, offer: number, target: number) => {
    setFocusedRole(role);
    setNegotiationOffer(offer);
    setNegotiationTarget(target);
    setActiveTab('coach');
  };

  return (
    <div className="space-y-6 sm:space-y-8 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto pb-16">
      {/* View Header with Sub-tab Switcher */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div className="space-y-1.5 min-w-0">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 font-bold text-xs uppercase tracking-wider border border-indigo-200/60 dark:border-indigo-800/60">
            <Compass className="w-4 h-4 shrink-0" />
            <span>Pillars 3 & 5 • Algorithmic Career Engine</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            Career Navigator & Salary Negotiation Coach
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium max-w-2xl leading-relaxed">
            Explore live job openings with auto-refreshing market salaries, directed Dijkstra career bridging, ML compensation predictions, and HR counter-offer simulations.
          </p>
        </div>

        {/* Tab Pill Switcher */}
        <div className="flex flex-wrap sm:flex-nowrap items-center p-1.5 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 shrink-0 gap-1 self-start lg:self-center">
          <button
            type="button"
            onClick={() => setActiveTab('market')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'market'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Globe className="w-4 h-4" />
            <span>Live Market & Rates</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('graph')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
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
            onClick={() => setActiveTab('salary')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
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
            onClick={() => setActiveTab('coach')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
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
