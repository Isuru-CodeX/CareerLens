import React, { useState, useRef, useEffect } from 'react';
import {
  Sun,
  Moon,
  Laptop,
  Check,
  User as UserIcon,
  LogOut,
  Sparkles,
  FileText,
  Menu,
  ChevronDown
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { AppearanceMode } from '../types';

interface NavbarProps {
  onOpenAuth: () => void;
  onToggleMobileMenu: () => void;
  currentView: string;
  onNavigate: (view: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenAuth,
  onToggleMobileMenu,
  onNavigate
}) => {
  const { mode, resolvedTheme, setMode } = useTheme();
  const { user, logout, updateUserAppearance, loginDemo } = useAuth();
  
  const [themeDropdownOpen, setThemeDropdownOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const themeRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (themeRef.current && !themeRef.current.contains(e.target as Node)) {
        setThemeDropdownOpen(false);
      }
      if (userRef.current && !userRef.current.contains(e.target as Node)) {
        setUserDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const handleSelectTheme = (newMode: AppearanceMode) => {
    updateUserAppearance(newMode);
    setThemeDropdownOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200/80 dark:border-slate-800/80 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        
        {/* Left: Mobile hamburger & Brand */}
        <div className="flex items-center gap-3">
          <button
            onClick={onToggleMobileMenu}
            className="md:hidden p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            aria-label="Toggle navigation menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          <button
            onClick={() => onNavigate('dashboard')}
            className="flex items-center gap-2.5 text-left focus:outline-hidden"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-700 via-blue-600 to-emerald-500 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-base tracking-tight text-slate-900 dark:text-white">
                  CareerLens
                </span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
                  AI
                </span>
              </div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 hidden sm:block -mt-0.5 font-medium">
                Resume Intelligence & Job Matching
              </p>
            </div>
          </button>
        </div>

        {/* Right: Quick actions, Theme switcher, Auth */}
        <div className="flex items-center gap-2 sm:gap-3">
          
          {/* Theme Dropdown (System / Light / Dark) */}
          <div className="relative" ref={themeRef}>
            <button
              onClick={() => setThemeDropdownOpen(!themeDropdownOpen)}
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-1.5"
              title={`Appearance: ${mode} (${resolvedTheme})`}
              aria-label="Toggle appearance mode"
            >
              {resolvedTheme === 'dark' ? (
                <Moon className="w-4 h-4 text-blue-400" />
              ) : (
                <Sun className="w-4 h-4 text-amber-500" />
              )}
              <ChevronDown className="w-3 h-3 opacity-60" />
            </button>

            {themeDropdownOpen && (
              <div className="absolute right-0 mt-2 w-44 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-1.5 shadow-xl z-50 text-xs">
                <div className="px-2.5 py-1.5 font-semibold text-slate-400 uppercase tracking-wider text-[10px]">
                  Appearance Mode
                </div>
                
                <button
                  onClick={() => handleSelectTheme('system')}
                  className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl transition-colors ${
                    mode === 'system'
                      ? 'bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 font-semibold'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Laptop className="w-4 h-4" />
                    <span>System Sync</span>
                  </div>
                  {mode === 'system' && <Check className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />}
                </button>

                <button
                  onClick={() => handleSelectTheme('light')}
                  className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl transition-colors ${
                    mode === 'light'
                      ? 'bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 font-semibold'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Sun className="w-4 h-4 text-amber-500" />
                    <span>Light Mode</span>
                  </div>
                  {mode === 'light' && <Check className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />}
                </button>

                <button
                  onClick={() => handleSelectTheme('dark')}
                  className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl transition-colors ${
                    mode === 'dark'
                      ? 'bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 font-semibold'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Moon className="w-4 h-4 text-blue-400" />
                    <span>Dark Mode</span>
                  </div>
                  {mode === 'dark' && <Check className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />}
                </button>
              </div>
            )}
          </div>

          {/* User Account / Sign In */}
          {user ? (
            <div className="relative" ref={userRef}>
              <button
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                className="flex items-center gap-2 p-1.5 sm:px-3 sm:py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <div className="w-7 h-7 rounded-lg bg-blue-600 text-white font-bold text-xs flex items-center justify-center">
                  {user.full_name ? user.full_name.charAt(0).toUpperCase() : 'U'}
                </div>
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 hidden md:block max-w-[120px] truncate">
                  {user.full_name || user.email}
                </span>
                <ChevronDown className="w-3 h-3 text-slate-400 hidden sm:block" />
              </button>

              {userDropdownOpen && (
                <div className="absolute right-0 mt-2 w-52 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-1.5 shadow-xl z-50 text-xs">
                  <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800">
                    <p className="font-semibold text-slate-900 dark:text-white truncate">
                      {user.full_name || 'Candidate User'}
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                      {user.email}
                    </p>
                  </div>

                  <button
                    onClick={() => { onNavigate('profile'); setUserDropdownOpen(false); }}
                    className="w-full flex items-center gap-2 px-2.5 py-2 rounded-xl text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors mt-1"
                  >
                    <UserIcon className="w-4 h-4" />
                    <span>Career Profile & Privacy</span>
                  </button>

                  <button
                    onClick={() => { logout(); setUserDropdownOpen(false); }}
                    className="w-full flex items-center gap-2 px-2.5 py-2 rounded-xl text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={loginDemo}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-blue-200 dark:border-blue-900 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 text-xs font-semibold hover:bg-blue-100 dark:hover:bg-blue-900/60 transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                <span>Demo Account</span>
              </button>

              <button
                onClick={onOpenAuth}
                className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition-colors"
              >
                Sign In
              </button>
            </div>
          )}

        </div>
      </div>
    </header>
  );
};
