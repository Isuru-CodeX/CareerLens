import React, { useState, useEffect } from 'react';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider } from './context/AuthContext';
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

const MainLayout: React.FC = () => {
  const [currentView, setCurrentView] = useState<string>('dashboard');
  const [viewParams, setViewParams] = useState<any>({});
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalTab, setAuthModalTab] = useState<'signin' | 'signup' | 'forgot' | 'reset'>('signin');
  const [authResetToken, setAuthResetToken] = useState<string>('');
  const [quickUploadTrigger, setQuickUploadTrigger] = useState(false);

  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const token = params.get('reset_token');
      if (token) {
        setAuthResetToken(token);
        setAuthModalTab('reset');
        setAuthModalOpen(true);
        window.history.replaceState({}, '', window.location.pathname);
      }
    } catch (e) {
      console.error('Failed to parse URL reset token', e);
    }
  }, []);

  const handleNavigate = (view: string, params: any = {}) => {
    setCurrentView(view);
    setViewParams(params);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleQuickUpload = () => {
    setCurrentView('resumes');
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

      {/* Main Body Area: Sidebar + Active View */}
      <div className="flex-1 flex max-w-7xl w-full mx-auto">
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
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
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
        <MainLayout />
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
