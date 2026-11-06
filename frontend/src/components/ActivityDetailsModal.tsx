import React from 'react';
import {
  X,
  Clock,
  Sparkles,
  Target,
  FileText,
  UserCheck,
  Briefcase,
  CheckCircle,
  ExternalLink,
  Cpu,
  Layers,
  Activity
} from 'lucide-react';
import { UserActivity } from '../types';

interface ActivityDetailsModalProps {
  activity: UserActivity | null;
  onClose: () => void;
  onNavigate?: (view: string, params?: any) => void;
}

export const ActivityDetailsModal: React.FC<ActivityDetailsModalProps> = ({
  activity,
  onClose,
  onNavigate
}) => {
  if (!activity) return null;

  const metadata = activity.activity_metadata || activity.metadata || {};

  const getEventStyle = (eventType: string) => {
    const ev = eventType.toLowerCase();
    if (ev.includes('cover') || ev.includes('rewrite') || ev.includes('interview')) {
      return {
        icon: Sparkles,
        color: 'text-indigo-600 dark:text-indigo-400',
        bg: 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-200 dark:border-indigo-900/60',
        label: 'AI Writing & Generation'
      };
    }
    if (ev.includes('match') || ev.includes('job')) {
      return {
        icon: Target,
        color: 'text-blue-600 dark:text-blue-400',
        bg: 'bg-blue-50 dark:bg-blue-950/60 border-blue-200 dark:border-blue-900/60',
        label: 'Job Matcher & Scoring'
      };
    }
    if (ev.includes('resume') || ev.includes('experience')) {
      return {
        icon: FileText,
        color: 'text-emerald-600 dark:text-emerald-400',
        bg: 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-900/60',
        label: 'Resume & Experience'
      };
    }
    if (ev.includes('profile') || ev.includes('avatar') || ev.includes('auth')) {
      return {
        icon: UserCheck,
        color: 'text-purple-600 dark:text-purple-400',
        bg: 'bg-purple-50 dark:bg-purple-950/60 border-purple-200 dark:border-purple-900/60',
        label: 'Profile & Identity'
      };
    }
    return {
      icon: Briefcase,
      color: 'text-amber-600 dark:text-amber-400',
      bg: 'bg-amber-50 dark:bg-amber-950/60 border-amber-200 dark:border-amber-900/60',
      label: 'Application Tracking'
    };
  };

  const style = getEventStyle(activity.event_type);
  const Icon = style.icon;

  const handleGoToResource = () => {
    if (!onNavigate) return;
    const ev = activity.event_type.toLowerCase();
    const ent = (activity.entity_type || '').toLowerCase();

    if (ent === 'cover_letter' || ev.includes('cover')) {
      onNavigate('ai', { tab: 'cover' });
    } else if (ent === 'job_match' || ev.includes('match')) {
      onNavigate('matches');
    } else if (ent === 'resume' || ev.includes('resume') || ev.includes('experience')) {
      onNavigate('resumes');
    } else if (ent === 'application' || ev.includes('application')) {
      onNavigate('applications');
    } else if (ent === 'profile' || ent === 'user' || ev.includes('profile') || ev.includes('avatar')) {
      onNavigate('profile');
    } else {
      onNavigate('dashboard');
    }
    onClose();
  };

  const formatDate = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleString(undefined, {
        dateStyle: 'full',
        timeStyle: 'medium'
      });
    } catch {
      return isoString;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Modal Container */}
      <div className="relative w-full max-w-lg rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 sm:p-7 shadow-2xl z-10 space-y-5 animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="flex items-start justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-2xl border ${style.bg} ${style.color}`}>
              <Icon className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                {style.label}
              </span>
              <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white leading-tight">
                Activity Details
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg cursor-pointer transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Description & Timestamp */}
        <div className="space-y-2">
          <p className="text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200 leading-relaxed bg-slate-50 dark:bg-slate-800/40 p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-700/60">
            {activity.description}
          </p>
          <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 font-mono pl-1">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>{formatDate(activity.created_at)}</span>
          </div>
        </div>

        {/* Technical & Execution Metadata Cards */}
        <div className="space-y-2 pt-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block">
            Execution Parameters & Metadata
          </span>

          <div className="grid grid-cols-2 gap-2 text-xs">
            {/* Event Identifier */}
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/30 border border-slate-200/60 dark:border-slate-800 space-y-0.5">
              <span className="text-[10px] text-slate-400 flex items-center gap-1 font-mono">
                <Activity className="w-3 h-3 text-slate-400" />
                <span>Event Key</span>
              </span>
              <p className="font-mono font-semibold text-slate-800 dark:text-slate-200 truncate">
                {activity.event_type}
              </p>
            </div>

            {/* Model Used */}
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/30 border border-slate-200/60 dark:border-slate-800 space-y-0.5">
              <span className="text-[10px] text-slate-400 flex items-center gap-1 font-mono">
                <Cpu className="w-3 h-3 text-indigo-500" />
                <span>AI Engine</span>
              </span>
              <p className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                {metadata.model_name || 'CareerLens Core Engine'}
              </p>
            </div>

            {/* Tokens / Work metric */}
            {metadata.tokens_used !== undefined && (
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/30 border border-slate-200/60 dark:border-slate-800 space-y-0.5">
                <span className="text-[10px] text-slate-400 flex items-center gap-1 font-mono">
                  <Layers className="w-3 h-3 text-blue-500" />
                  <span>Tokens Processed</span>
                </span>
                <p className="font-semibold text-slate-800 dark:text-slate-200">
                  {metadata.tokens_used} tokens
                </p>
              </div>
            )}

            {/* Estimated Duration */}
            {metadata.estimated_duration_seconds !== undefined && (
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/30 border border-slate-200/60 dark:border-slate-800 space-y-0.5">
                <span className="text-[10px] text-slate-400 flex items-center gap-1 font-mono">
                  <Clock className="w-3 h-3 text-amber-500" />
                  <span>Execution Time</span>
                </span>
                <p className="font-semibold text-slate-800 dark:text-slate-200">
                  ~{metadata.estimated_duration_seconds}s
                </p>
              </div>
            )}

            {/* Entity Target */}
            {activity.entity_type && (
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/30 border border-slate-200/60 dark:border-slate-800 space-y-0.5 col-span-2">
                <span className="text-[10px] text-slate-400 font-mono">
                  Entity Reference
                </span>
                <p className="font-semibold text-slate-800 dark:text-slate-200 truncate flex items-center gap-1.5">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span>{activity.entity_type.toUpperCase()}</span>
                  {activity.entity_id && (
                    <span className="text-slate-400 font-mono text-[10px]">
                      ({activity.entity_id.substring(0, 8)}...)
                    </span>
                  )}
                </p>
              </div>
            )}
          </div>

          {/* Contact Fields Included badge row if applicable */}
          {metadata.contact_fields_included && Array.isArray(metadata.contact_fields_included) && (
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/30 border border-slate-200/60 dark:border-slate-800 space-y-1.5">
              <span className="text-[10px] text-slate-400 font-mono block">
                Included Contact & Links Channels
              </span>
              <div className="flex flex-wrap gap-1.5">
                {metadata.contact_fields_included.length > 0 ? (
                  metadata.contact_fields_included.map((f: string) => (
                    <span
                      key={f}
                      className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-900/60"
                    >
                      {f}
                    </span>
                  ))
                ) : (
                  <span className="text-[11px] text-slate-400 italic">None (Omitted)</span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
          >
            Close
          </button>

          <button
            type="button"
            onClick={handleGoToResource}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-md transition-all cursor-pointer"
          >
            <span>Open Tool / Resource</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
