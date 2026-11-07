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
  }
};

const MainLayout: React.FC = () => {
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
      <div className="flex-1 flex max-w-[1720px] w-full mx-auto px-2 sm:px-4 lg:px-6 xl:px-8">
        <Sidebar
          currentView={currentView}
          onNavigate={handleNavigate}
          mobileOpen={mobileMenuOpen}
          onCloseMobile={() => setMobileMenuOpen(false)}
          resumesCount={1}
          applicationsCount={7}
          onQuickUpload={handleQuickUpload}
        />

        <main className="flex-1 w-full min-w-0 pb-16">
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
            <ProfileView />
          )}

          {currentView === 'activity' && (
            <UserActivityView onNavigate={handleNavigate} />
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
