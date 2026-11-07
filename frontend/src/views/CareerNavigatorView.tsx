import React, { useState, useEffect } from 'react';
import {
  Compass,
  DollarSign,
  MessageSquare,
  Globe,
  Layers,
  BookOpen,
  Target,
  CheckCircle2,
  X,
  Edit2
} from 'lucide-react';
import { CareerKnowledgeGraph } from '../components/career/CareerKnowledgeGraph';
import { SalaryPredictorStudio } from '../components/career/SalaryPredictorStudio';
import { NegotiationCoachStudio } from '../components/career/NegotiationCoachStudio';
import { LiveMarketJobsStudio } from '../components/career/LiveMarketJobsStudio';
import { CareerPathComparator } from '../components/career/CareerPathComparator';
import { AdaptiveLearningStudio } from '../components/career/AdaptiveLearningStudio';
import { DisclaimerBanner } from '../components/DisclaimerBanner';
import { Resume, CareerProfile, CareerGoalData } from '../types';
import { api } from '../services/api';
import { useLoader } from '../context/useLoader';

interface CareerNavigatorViewProps {
  resumes?: Resume[];
}

export const CareerNavigatorView: React.FC<CareerNavigatorViewProps> = ({
  resumes = []
}) => {
  const { triggerTransition } = useLoader();
  const [activeTab, setActiveTab] = useState<'market' | 'graph' | 'compare' | 'learning' | 'salary' | 'coach'>('market');
  const [_userProfile, setUserProfile] = useState<CareerProfile | null>(null);
  const [activeIndustry, setActiveIndustry] = useState<string>('all');
  const [focusedRole, setFocusedRole] = useState<string>('Senior Full Stack Engineer');
  const [negotiationOffer, setNegotiationOffer] = useState<number>(140000);
  const [negotiationTarget, setNegotiationTarget] = useState<number>(165000);

  // Active Career Goal state
  const [activeGoal, setActiveGoal] = useState<CareerGoalData | null>(null);
  const [showGoalModal, setShowGoalModal] = useState<boolean>(false);
  const [goalRoleInput, setGoalRoleInput] = useState<string>('');
  const [goalDateInput, setGoalDateInput] = useState<string>('');
  const [savingGoal, setSavingGoal] = useState<boolean>(false);

  const handleTabSelect = (tab: 'market' | 'graph' | 'compare' | 'learning' | 'salary' | 'coach') => {
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
      compare: {
        title: 'Comparing Career Trajectories...',
        subtitle: 'Evaluating multi-role skill overlap, time-to-learn, & compensation bands...',
        badge: 'Path Matrix Comparator',
        icon: 'target' as const,
        accentColor: 'blue'
      },
      learning: {
        title: 'Loading Adaptive Curriculum...',
        subtitle: 'Preparing personalized study schedule & skill verification quizzes...',
        badge: 'Adaptive Learning Plan',
        icon: 'brain' as const,
        accentColor: 'teal'
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

  // Load User Career Profile to initialize default industry & goals
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
          setGoalRoleInput(profile.target_title);
        }
      })
      .catch((err: unknown) => console.error('Failed to load profile for career defaults:', err));

    // Load active career goal
    api.getCareerGoals()
      .then((res) => {
        if (!active) return;
        if (res.active_goal) {
          setActiveGoal(res.active_goal);
          if (res.active_goal.target_title) {
            setFocusedRole(res.active_goal.target_title);
            setGoalRoleInput(res.active_goal.target_title);
          }
        }
      })
      .catch((err) => console.error('Failed to load career goals:', err));

    return () => { active = false; };
  }, []);

  const handleToggleMilestone = async (goalId: string, milestoneId: string) => {
    try {
      const res = await api.toggleGoalMilestone(goalId, milestoneId);
      if (activeGoal && res.milestones) {
        setActiveGoal({ ...activeGoal, milestones: res.milestones });
      }
    } catch (err) {
      console.error('Failed to toggle milestone:', err);
    }
  };

  const handleSaveGoal = async () => {
    if (!goalRoleInput.trim()) return;
    try {
      setSavingGoal(true);
      const res = await api.saveCareerGoal({
        target_role_id: goalRoleInput.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_'),
        target_title: goalRoleInput.trim(),
        target_date: goalDateInput || undefined
      });
      if (res?.goal) {
        setActiveGoal(res.goal);
        setFocusedRole(res.goal.target_title);
        setShowGoalModal(false);
      }
    } catch (err) {
      console.error('Failed to save career goal:', err);
    } finally {
      setSavingGoal(false);
    }
  };

  const handleQuickSetGoal = async (roleTitle: string) => {
    try {
      const res = await api.saveCareerGoal({
        target_role_id: roleTitle.toLowerCase().replace(/[^a-z0-9]+/g, '_'),
        target_title: roleTitle
      });
      if (res?.goal) {
        setActiveGoal(res.goal);
        setFocusedRole(res.goal.target_title);
      }
    } catch (err) {
      console.error('Failed to quick set goal:', err);
    }
  };

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

  const completedMilestones = activeGoal?.milestones?.filter((m) => m.completed).length || 0;
  const totalMilestones = activeGoal?.milestones?.length || 0;
  const milestoneProgress = totalMilestones > 0 ? Math.round((completedMilestones / totalMilestones) * 100) : 0;

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
              <span>Global Career Intelligence & Personalized Development</span>
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight leading-tight">
              Career Navigator & Adaptive Development
            </h1>
            <p className="text-xs sm:text-sm text-indigo-200/80 font-medium max-w-3xl leading-relaxed">
              Explore global salary benchmarks, navigate Dijkstra career bridge paths, compare multi-role trajectories, pursue adaptive learning milestones, and master offer negotiations.
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
                onClick={() => handleTabSelect('compare')}
                className={`px-4 sm:px-5 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2.5 shrink-0 cursor-pointer ${
                  activeTab === 'compare'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/30 ring-1 ring-indigo-400'
                    : 'bg-slate-800/80 text-slate-300 hover:text-white hover:bg-slate-800 border border-slate-700/60'
                }`}
              >
                <Layers className="w-4 h-4 shrink-0" />
                <span>Compare Paths</span>
              </button>

              <button
                type="button"
                onClick={() => handleTabSelect('learning')}
                className={`px-4 sm:px-5 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2.5 shrink-0 cursor-pointer ${
                  activeTab === 'learning'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/30 ring-1 ring-indigo-400'
                    : 'bg-slate-800/80 text-slate-300 hover:text-white hover:bg-slate-800 border border-slate-700/60'
                }`}
              >
                <BookOpen className="w-4 h-4 shrink-0" />
                <span>Adaptive Learning Plan</span>
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

      {/* Active Goal & Milestone Progress Banner */}
      <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
              <Target className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Target Career Objective
                </span>
                {activeGoal && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                    Active
                  </span>
                )}
              </div>
              <h2 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <span>{activeGoal ? activeGoal.target_title : 'No Active Target Role Defined'}</span>
                {activeGoal?.target_date && (
                  <span className="text-xs font-medium text-slate-400">
                    (Target: {activeGoal.target_date})
                  </span>
                )}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setGoalRoleInput(activeGoal ? activeGoal.target_title : focusedRole);
                setShowGoalModal(true);
              }}
              className="px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Edit2 className="w-3.5 h-3.5" />
              <span>{activeGoal ? 'Update Goal' : 'Set Target Goal'}</span>
            </button>
          </div>
        </div>

        {/* Milestone Tracker Bar & Checklist */}
        {activeGoal && (
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-600 dark:text-slate-400">
                Milestone Completion: {completedMilestones} of {totalMilestones} ({milestoneProgress}%)
              </span>
              <span className="text-[11px] text-indigo-600 dark:text-indigo-400 font-medium">
                Click any milestone to mark complete
              </span>
            </div>

            <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-indigo-500 to-emerald-500 rounded-full transition-all duration-500"
                style={{ width: `${milestoneProgress}%` }}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 pt-1">
              {activeGoal.milestones?.map((milestone) => (
                <button
                  key={milestone.id}
                  onClick={() => handleToggleMilestone(activeGoal.id, milestone.id)}
                  className={`p-2.5 rounded-xl border text-left transition-all flex items-start gap-2 cursor-pointer ${
                    milestone.completed
                      ? 'bg-emerald-50/60 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/60 text-emerald-800 dark:text-emerald-200'
                      : 'bg-slate-50/60 dark:bg-slate-800/30 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-indigo-300'
                  }`}
                >
                  <CheckCircle2
                    className={`w-4 h-4 shrink-0 mt-0.5 ${
                      milestone.completed ? 'text-emerald-500' : 'text-slate-300 dark:text-slate-600'
                    }`}
                  />
                  <span className={`text-xs ${milestone.completed ? 'line-through opacity-80' : 'font-medium'}`}>
                    {milestone.title}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
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

      {activeTab === 'compare' && (
        <CareerPathComparator
          initialRoles={['MY_PROFILE', focusedRole, 'Cloud Solutions Architect']}
          onSelectRoleForLearning={(roleTitle) => {
            setFocusedRole(roleTitle);
            handleTabSelect('learning');
          }}
          onSetRoleAsGoal={handleQuickSetGoal}
        />
      )}

      {activeTab === 'learning' && (
        <AdaptiveLearningStudio
          initialRole={focusedRole}
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

      {/* Goal Creation/Edit Modal */}
      {showGoalModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Target className="w-5 h-5 text-indigo-600" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {activeGoal ? 'Update Target Career Goal' : 'Set New Target Goal'}
                </h3>
              </div>
              <button
                onClick={() => setShowGoalModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Target Role Title
                </label>
                <input
                  type="text"
                  value={goalRoleInput}
                  onChange={(e) => setGoalRoleInput(e.target.value)}
                  placeholder="e.g. Senior Full Stack Engineer, Cloud Architect..."
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Target Achievement Timeline (Optional)
                </label>
                <input
                  type="text"
                  value={goalDateInput}
                  onChange={(e) => setGoalDateInput(e.target.value)}
                  placeholder="e.g. Q4 2026 or Within 6 Months"
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                Saving this target role will automatically generate customized milestones, link with your adaptive learning plan, and track verified skills against industry benchmarks.
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowGoalModal(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveGoal}
                disabled={savingGoal || !goalRoleInput.trim()}
                className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-500/20 disabled:opacity-50 transition-all cursor-pointer"
              >
                {savingGoal ? 'Saving...' : 'Save Career Goal'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
