import React, { useState, useEffect } from 'react';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider } from './context/AuthContext';
import { LoadingProvider } from './context/LoadingContext';
import { useLoader } from './context/useLoader';
import { LoaderConfig } from './components/common/FuturisticTransitionLoader';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { AuthModal } from './views/AuthModal';
import { DashboardView } from './views/DashboardView';
import { ResumesView } from './views/ResumesView';
import { AnalysisView } from './views/AnalysisView';
import { JobMatchView } from './views/JobMatchView';
import { AIAssistantView } from './views/AIAssistantView';
import { ApplicationsView } from './views/ApplicationsView';
import { ProfileView } from './views/ProfileView';
import { UserActivityView } from './views/UserActivityView';
import { CareerNavigatorView } from './views/CareerNavigatorView';
import { PlacementPortalView } from './views/PlacementPortalView';
import { AdminView } from './views/AdminView';
import { AdminLoginView } from './views/AdminLoginView';
import { useAuth } from './context/useAuth';
import { ExternalLink, LogOut, Cpu } from 'lucide-react';

const VIEW_LOADER_CONFIG: Record<string, LoaderConfig> = {
  dashboard: {
    title: 'Loading Executive Dashboard...',
    subtitle: 'Aggregating application pipeline, resume audits & telemetry...',
    badge: 'CareerLens Intelligence',
    icon: 'chart',
    accentColor: 'indigo'
  },
  resumes: {
    title: 'Accessing Resume Vault...',
    subtitle: 'Indexing ATS resume versions and semantic parser data...',
    badge: 'Document Intelligence',
    icon: 'file',
    accentColor: 'sky'
  },
  analysis: {
    title: 'Loading Deep Resume Audit...',
    subtitle: 'Computing impact quantification, ATS heuristics & keyword gaps...',
    badge: 'ATS Scoring Engine',
    icon: 'sparkles',
    accentColor: 'purple'
  },
  matches: {
    title: 'Synthesizing Job Matches...',
    subtitle: 'Calculating cosine similarity, skill overlap & requirements...',
    badge: 'Vector Match Engine',
    icon: 'target',
    accentColor: 'emerald'
  },
  career: {
    title: 'Opening Career Navigator...',
    subtitle: 'Loading live salary explorer and career knowledge graph...',
    badge: 'Algorithmic Career Engine',
    icon: 'compass',
    accentColor: 'indigo'
  },
  ai: {
    title: 'Launching AI Assistant & Interview Studio...',
    subtitle: 'Spinning up neural bullet optimizer and audio interviewer...',
    badge: 'Multimodal AI Studio',
    icon: 'mic',
    accentColor: 'purple'
  },
  applications: {
    title: 'Loading Application Kanban...',
    subtitle: 'Retrieving stage pipelines, interview dates & offers...',
    badge: 'Pipeline Tracker',
    icon: 'briefcase',
    accentColor: 'amber'
  },
  profile: {
    title: 'Loading Career Profile...',
    subtitle: 'Fetching candidate preferences, target industries & security settings...',
    badge: 'User Profile',
    icon: 'zap',
    accentColor: 'rose'
  },
  activity: {
    title: 'Streaming Activity Ledger...',
    subtitle: 'Querying audit history, log events and telemetry...',
    badge: 'Security & Audit',
    icon: 'shield',
    accentColor: 'indigo'
  },
  placement: {
    title: 'Loading University Placement Portal...',
    subtitle: 'Aggregating cohort readiness analytics, skill deficits & batch roster...',
    badge: 'Enterprise Placement Cell',
    icon: 'chart',
    accentColor: 'indigo'
  },
  admin: {
    title: 'Accessing Admin Command Center...',
    subtitle: 'Mounting AI Model Workbench, token burn charts & RBAC...',
    badge: 'AI Operations & RBAC',
    icon: 'shield',
    accentColor: 'indigo'
  },
  'admin-login': {
    title: 'Securing Admin Command Center...',
    subtitle: 'Verifying TLS 1.3 handshake & RBAC identity credentials...',
    badge: 'Security Gateway',
    icon: 'shield',
    accentColor: 'indigo'
  }
};

const AdminProjectShell: React.FC<{
  onNavigate: (view: string, params?: any) => void;
  children: React.ReactNode;
}> = ({ onNavigate, children }) => {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-500/30">
      {/* Dedicated Executive Admin Command Bar */}
      <header className="sticky top-0 z-40 w-full border-b border-slate-800 bg-slate-900/95 backdrop-blur-md transition-colors">
        <div className="w-full max-w-[2160px] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          {/* Left: Brand + Staff Mode Pill */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-blue-600 to-indigo-700 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-base tracking-tight text-white">
                  CareerLens AI
                </span>
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 uppercase tracking-wider">
                  Admin Command Center
                </span>
              </div>
              <p className="text-[10px] text-slate-400 hidden sm:block -mt-0.5 font-mono">
                AI Ops • ML Model Workbench • RBAC Governance
              </p>
            </div>
          </div>

          {/* Center: Live System Status Badges */}
          <div className="hidden lg:flex items-center gap-2 text-[11px] font-mono">
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              APScheduler Active
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 text-slate-300">
              Vector Latency: 12ms
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 text-slate-300">
              Storage: SQLite 2.4 MB
            </span>
          </div>

          {/* Right: Switch to Candidate View + Identity + Logout */}
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => onNavigate('dashboard')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors cursor-pointer"
              title="Open the regular Candidate App"
            >
              <ExternalLink className="w-3.5 h-3.5 text-blue-400" />
              <span>Switch to Candidate App</span>
            </button>

            <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-xl bg-slate-900 border border-slate-800 text-xs">
              <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-indigo-600 to-blue-600 text-white font-bold text-[10px] flex items-center justify-center">
                {user?.full_name ? user.full_name.charAt(0).toUpperCase() : 'A'}
              </div>
              <div className="text-left">
                <p className="font-semibold text-slate-200 leading-none truncate max-w-[120px]">
                  {user?.full_name || user?.email || 'Admin User'}
                </p>
                <p className="text-[10px] text-indigo-400 font-mono leading-tight uppercase font-bold tracking-wider">
                  {user?.role ? user.role.replace('_', ' ') : 'Administrator'}
                </p>
              </div>
            </div>

            <button
              onClick={() => {
                logout();
                onNavigate('dashboard');
              }}
              className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 border border-slate-800 transition-colors cursor-pointer"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Admin Workspace Area */}
      <main className="flex-1 w-full max-w-[2160px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {children}
      </main>

      {/* Admin Footer */}
      <footer className="w-full border-t border-slate-900 bg-slate-950 py-4 text-center text-xs text-slate-600">
        <div className="max-w-[2160px] mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>CareerLens AI Command Center • Autonomous Career Intelligence Subsystem</span>
          <span>REST API /v1/admin • Scikit-Learn 1.5.2 • SQLite WAL</span>
        </div>
      </footer>
    </div>
  );
};

const MainLayout: React.FC = () => {
  const { user, logout, loading: authLoading } = useAuth();
  const isAdmin = !!(user && (
    user.is_admin === true || 
    ['admin', 'superadmin', 'super_admin', 'ml_engineer', 'reviewer', 'support', 'analyst'].includes(user.role || '')
  ));

  const { triggerTransition } = useLoader();
  const [currentView, setCurrentView] = useState<string>('dashboard');
  const [viewParams, setViewParams] = useState<any>({});
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const getInitialResetToken = () => {
    try {
      const params = new URLSearchParams(window.location.search);
      return params.get('reset_token') || '';
    } catch {
      return '';
    }
  };
  const [initialResetToken] = useState<string>(getInitialResetToken);
  const [authModalOpen, setAuthModalOpen] = useState(!!initialResetToken);
  const [authModalTab, setAuthModalTab] = useState<'signin' | 'signup' | 'forgot' | 'reset'>(initialResetToken ? 'reset' : 'signin');
  const [authResetToken, setAuthResetToken] = useState<string>(initialResetToken);
  const [quickUploadTrigger, setQuickUploadTrigger] = useState(false);

  useEffect(() => {
    if (initialResetToken) {
      try {
        window.history.replaceState({}, '', window.location.pathname);
      } catch {
        // ignore
      }
    }
  }, [initialResetToken]);

  const handleNavigate = (view: string, params: any = {}) => {
    if (view !== currentView) {
      const config = VIEW_LOADER_CONFIG[view] || {
        title: 'Loading Workspace...',
        subtitle: 'Preparing workspace telemetry & real-time insights...',
        badge: 'Neural Engine',
        icon: 'brain',
        accentColor: 'indigo'
      };
      triggerTransition(config, 400);
    }
    setCurrentView(view);
    setViewParams(params);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleQuickUpload = () => {
    handleNavigate('resumes');
    setQuickUploadTrigger(true);
  };

  useEffect(() => {
    if (currentView === 'admin' && !authLoading && !isAdmin) {
      handleNavigate('admin-login');
    }
  }, [currentView, authLoading, isAdmin]);

  if (currentView === 'admin-login') {
    return (
      <AdminLoginView
        onNavigate={handleNavigate}
        onLoginSuccess={() => handleNavigate('admin')}
      />
    );
  }

  if (currentView === 'admin') {
    if (!isAdmin) {
      return (
        <AdminLoginView
          onNavigate={handleNavigate}
          onLoginSuccess={() => handleNavigate('admin')}
        />
      );
    }
    return (
      <AdminProjectShell onNavigate={handleNavigate}>
        <AdminView onNavigate={handleNavigate} />
      </AdminProjectShell>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors duration-200">
      {/* Top Navbar */}
      <Navbar
        onOpenAuth={() => setAuthModalOpen(true)}
        onToggleMobileMenu={() => setMobileMenuOpen(!mobileMenuOpen)}
        currentView={currentView}
        onNavigate={handleNavigate}
      />

      {/* Main Body Area: Sidebar + Active View with Max Widescreen Real Estate */}
      <div className="flex-1 flex w-full max-w-[2160px] 2xl:max-w-full mx-auto px-2 sm:px-4 lg:px-6 xl:px-8 2xl:px-12">
        <Sidebar
          currentView={currentView}
          onNavigate={handleNavigate}
          mobileOpen={mobileMenuOpen}
          onCloseMobile={() => setMobileMenuOpen(false)}
          resumesCount={1}
          applicationsCount={7}
          onQuickUpload={handleQuickUpload}
        />

        <main className="flex-1 w-full min-w-0 pt-3 sm:pt-5 pb-16">
          {currentView === 'dashboard' && (
            <DashboardView
              onNavigate={handleNavigate}
              onOpenUpload={handleQuickUpload}
            />
          )}

          {currentView === 'resumes' && (
            <ResumesView
              onNavigate={handleNavigate}
              openUploadOnMount={quickUploadTrigger}
            />
          )}

          {currentView === 'analysis' && (
            <AnalysisView
              resumeId={viewParams.resumeId}
              onNavigate={handleNavigate}
            />
          )}

          {currentView === 'matches' && (
            <JobMatchView
              initialResumeId={viewParams.resumeId}
              onNavigate={handleNavigate}
            />
          )}

          {currentView === 'career' && (
            <CareerNavigatorView />
          )}

          {currentView === 'ai' && (
            <AIAssistantView
              initialTab={viewParams.tab || 'rewrite'}
              jobDescription={viewParams.jobDescription}
              targetRole={viewParams.targetRole}
            />
          )}

          {currentView === 'applications' && (
            <ApplicationsView />
          )}

          {currentView === 'profile' && (
            <ProfileView onNavigate={handleNavigate} />
          )}

          {currentView === 'activity' && (
            <UserActivityView onNavigate={handleNavigate} />
          )}

          {currentView === 'placement' && (
            <PlacementPortalView />
          )}
        </main>
      </div>

      {/* Auth Modal */}
      <AuthModal
        isOpen={authModalOpen}
        initialTab={authModalTab}
        initialResetToken={authResetToken}
        onClose={() => {
          setAuthModalOpen(false);
          setAuthModalTab('signin');
          setAuthResetToken('');
        }}
      />

      {/* Footer */}
      <footer className="w-full border-t border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 py-6 text-center text-xs text-slate-500 dark:text-slate-400">
        <div className="max-w-[1720px] mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-800 dark:text-slate-200">CareerLens AI</span>
            <span>—</span>
            <span>Production-Grade Resume Analyzer & Career Platform</span>
          </div>
          <div>
            Heuristic guidance scoring • Private & encrypted storage • Zero ATS guarantee claims
          </div>
        </div>
      </footer>
    </div>
  );
};

export function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <LoadingProvider>
          <MainLayout />
        </LoadingProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
