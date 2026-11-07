import React from 'react';
import {
  Brain,
  Globe,
  Target,
  FileText,
  Sparkles,
  Mic,
  Briefcase,
  Shield,
  Compass,
  BarChart3,
  Cpu,
  Zap
} from 'lucide-react';

export type LoaderIconType =
  | 'brain'
  | 'globe'
  | 'target'
  | 'file'
  | 'sparkles'
  | 'mic'
  | 'briefcase'
  | 'shield'
  | 'compass'
  | 'chart'
  | 'cpu'
  | 'zap';

export interface LoaderConfig {
  title?: string;
  subtitle?: string;
  badge?: string;
  icon?: LoaderIconType;
  accentColor?: string; // 'indigo' | 'emerald' | 'purple' | 'amber' | 'sky' | 'rose'
}

interface FuturisticTransitionLoaderProps {
  isOpen: boolean;
  title?: string;
  subtitle?: string;
  badge?: string;
  icon?: LoaderIconType;
  accentColor?: string;
}

const ACCENT_MAP: Record<string, { border: string; ring: string; text: string; bg: string; badgeBg: string; badgeBorder: string; badgeText: string }> = {
  indigo: {
    border: 'border-indigo-400',
    ring: 'border-indigo-500/30',
    text: 'text-indigo-300',
    bg: 'bg-indigo-600/30',
    badgeBg: 'bg-indigo-500/20',
    badgeBorder: 'border-indigo-500/40',
    badgeText: 'text-indigo-300'
  },
  emerald: {
    border: 'border-emerald-400',
    ring: 'border-emerald-500/30',
    text: 'text-emerald-300',
    bg: 'bg-emerald-600/30',
    badgeBg: 'bg-emerald-500/20',
    badgeBorder: 'border-emerald-500/40',
    badgeText: 'text-emerald-300'
  },
  purple: {
    border: 'border-purple-400',
    ring: 'border-purple-500/30',
    text: 'text-purple-300',
    bg: 'bg-purple-600/30',
    badgeBg: 'bg-purple-500/20',
    badgeBorder: 'border-purple-500/40',
    badgeText: 'text-purple-300'
  },
  amber: {
    border: 'border-amber-400',
    ring: 'border-amber-500/30',
    text: 'text-amber-300',
    bg: 'bg-amber-600/30',
    badgeBg: 'bg-amber-500/20',
    badgeBorder: 'border-amber-500/40',
    badgeText: 'text-amber-300'
  },
  sky: {
    border: 'border-sky-400',
    ring: 'border-sky-500/30',
    text: 'text-sky-300',
    bg: 'bg-sky-600/30',
    badgeBg: 'bg-sky-500/20',
    badgeBorder: 'border-sky-500/40',
    badgeText: 'text-sky-300'
  },
  rose: {
    border: 'border-rose-400',
    ring: 'border-rose-500/30',
    text: 'text-rose-300',
    bg: 'bg-rose-600/30',
    badgeBg: 'bg-rose-500/20',
    badgeBorder: 'border-rose-500/40',
    badgeText: 'text-rose-300'
  }
};

export const FuturisticTransitionLoader: React.FC<FuturisticTransitionLoaderProps> = ({
  isOpen,
  title = 'Processing...',
  subtitle = 'Synchronizing real-time career intelligence...',
  badge = 'Neural Career Engine',
  icon = 'brain',
  accentColor = 'indigo'
}) => {
  if (!isOpen) return null;

  const colorScheme = ACCENT_MAP[accentColor] || ACCENT_MAP.indigo;

  const renderIcon = () => {
    const iconClass = "w-7 h-7 sm:w-8 sm:h-8 animate-pulse";
    switch (icon) {
      case 'globe':
        return <Globe className={iconClass} />;
      case 'target':
        return <Target className={iconClass} />;
      case 'file':
        return <FileText className={iconClass} />;
      case 'sparkles':
        return <Sparkles className={iconClass} />;
      case 'mic':
        return <Mic className={iconClass} />;
      case 'briefcase':
        return <Briefcase className={iconClass} />;
      case 'shield':
        return <Shield className={iconClass} />;
      case 'compass':
        return <Compass className={iconClass} />;
      case 'chart':
        return <BarChart3 className={iconClass} />;
      case 'cpu':
        return <Cpu className={iconClass} />;
      case 'zap':
        return <Zap className={iconClass} />;
      case 'brain':
      default:
        return <Brain className={iconClass} />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center animate-fade-in select-none">
      {/* Concentric Radar Rings & Scanning Beam */}
      <div className="relative w-28 h-28 sm:w-36 sm:h-36 mb-6 flex items-center justify-center">
        {/* Outer Pulsing Echo Ring */}
        <div className={`absolute inset-0 rounded-full border-2 ${colorScheme.ring} animate-ping`} />
        {/* Middle Pulse Ring */}
        <div className={`absolute inset-2 rounded-full border ${colorScheme.ring} animate-pulse`} />
        {/* Inner Solid Tech Ring */}
        <div className={`absolute inset-6 rounded-full border-2 ${colorScheme.ring}`} />
        {/* Spinning Radar Sweep Beam */}
        <div className={`absolute inset-0 rounded-full border-t-2 border-r-2 ${colorScheme.border} animate-spin`} />
        {/* Center Glowing Hub Icon */}
        <div className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full ${colorScheme.bg} border ${colorScheme.border} flex items-center justify-center ${colorScheme.text} shadow-xl shadow-indigo-500/30 backdrop-blur-sm`}>
          {renderIcon()}
        </div>
      </div>

      {/* Text Info */}
      <div className="space-y-2.5 max-w-md px-4">
        <span className={`px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider ${colorScheme.badgeBg} ${colorScheme.badgeText} border ${colorScheme.badgeBorder} inline-flex items-center gap-1.5 shadow-sm`}>
          <Sparkles className="w-3.5 h-3.5" />
          <span>{badge}</span>
        </span>
        <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight">
          {title}
        </h3>
        <p className="text-xs sm:text-sm text-slate-300 font-medium leading-relaxed">
          {subtitle}
        </p>
      </div>

      {/* Progress Shimmer Bar */}
      <div className="w-48 sm:w-56 h-1.5 rounded-full bg-slate-800/80 mt-6 overflow-hidden border border-slate-700/50">
        <div className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 via-sky-400 to-emerald-400 animate-pulse w-full" />
      </div>
    </div>
  );
};
