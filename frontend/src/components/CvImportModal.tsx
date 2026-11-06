import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, AlertCircle, Sparkles, X } from 'lucide-react';
import { EmailMismatchDialog } from './EmailMismatchDialog';
import { CvImportStepId, CvImportProgressEvent } from '../types';
import { api } from '../services/api';

interface StepConfig {
  id: CvImportStepId;
  label: string;
}

const STEPS: StepConfig[] = [
  { id: 'upload', label: 'Uploading your CV' },
  { id: 'read', label: 'Reading file & links' },
  { id: 'analyze', label: 'Understanding your experience & skills' },
  { id: 'verify', label: 'Checking email matches account' },
  { id: 'photo', label: 'Looking for a profile photo' },
  { id: 'save', label: 'Saving to your profile' },
];

type StepState = 'pending' | 'active' | 'done';

interface CvImportModalProps {
  jobId: string;
  onClose: (refreshed: boolean) => void;
  onGoSignup?: (email: string) => void;
}

export const CvImportModal: React.FC<CvImportModalProps> = ({
  jobId,
  onClose,
  onGoSignup
}) => {
  const [steps, setSteps] = useState<Record<string, { state: StepState; detail?: string }>>({
    upload: { state: 'done' }
  });
  const [result, setResult] = useState<
    | { ok: true; summary: { resumeId: string; fieldsFilled: number; experiencesAdded: number; skillsAdded: number; photoAdded: boolean } }
    | { ok: false; code: string; message: string; extra?: { cvEmail: string; accountEmail: string } }
    | null
  >(null);

  const pollIntervalRef = useRef<number | null>(null);
  const closedRef = useRef(false);

  useEffect(() => {
    closedRef.current = false;
    const sseUrl = api.getImportEventsUrl(jobId);
    let es: EventSource | null = null;

    const handleEvent = (ev: CvImportProgressEvent) => {
      if (closedRef.current) return;
      if (ev.type === 'step' && ev.step) {
        setSteps((prev) => ({
          ...prev,
          [ev.step!]: { state: ev.status || 'active', detail: ev.detail }
        }));
      } else if (ev.type === 'done') {
        setResult({ ok: true, summary: ev.summary });
        if (es) es.close();
        if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      } else if (ev.type === 'error') {
        setResult({
          ok: false,
          code: ev.code || 'UNKNOWN',
          message: ev.message || 'Import failed.',
          extra: ev.extra
        });
        if (es) es.close();
        if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      }
    };

    try {
      es = new EventSource(sseUrl, { withCredentials: true });
      es.onmessage = (m) => {
        try {
          const ev = JSON.parse(m.data);
          handleEvent(ev);
        } catch {
          // ignore parse error
        }
      };

      es.onerror = () => {
        // SSE disconnected, fallback to polling
        if (!pollIntervalRef.current) {
          pollIntervalRef.current = window.setInterval(async () => {
            try {
              const statusRes = await api.getImportStatus(jobId);
              for (const ev of statusRes.events) {
                handleEvent(ev);
              }
            } catch {
              // ignore polling error
            }
          }, 1500);
        }
      };
    } catch {
      // Fallback polling
      pollIntervalRef.current = window.setInterval(async () => {
        try {
          const statusRes = await api.getImportStatus(jobId);
          for (const ev of statusRes.events) {
            handleEvent(ev);
          }
        } catch {
          // ignore
        }
      }, 1500);
    }

    return () => {
      closedRef.current = true;
      if (es) es.close();
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, [jobId]);

  const doneCount = STEPS.filter((s) => steps[s.id]?.state === 'done').length;
  const pct = result?.ok ? 100 : Math.min(95, Math.round((doneCount / STEPS.length) * 100));

  // If Email Mismatch, show specialized gate popup
  if (result && !result.ok && result.code === 'EMAIL_MISMATCH' && result.extra) {
    return (
      <EmailMismatchDialog
        cvEmail={result.extra.cvEmail}
        accountEmail={result.extra.accountEmail}
        onCancel={() => onClose(false)}
        onGoSignup={onGoSignup}
      />
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="imp-title"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-3xl p-6 sm:p-7 max-w-lg w-full border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 id="imp-title" className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                {!result ? 'Importing your CV...' : result.ok ? 'Your profile is ready' : 'Import stopped'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                AI extraction and profile integration
              </p>
            </div>
          </div>
          {result && !result.ok && (
            <button
              onClick={() => onClose(false)}
              className="p-1 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Animated Progress Bar */}
        <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2.5 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              result?.ok
                ? 'bg-emerald-500'
                : result && !result.ok
                ? 'bg-red-500'
                : 'bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 animate-pulse'
            }`}
            style={{ width: `${pct}%` }}
          />
        </div>

        {/* Steps List */}
        <ul className="space-y-3 pt-2" aria-live="polite">
          {STEPS.map((s) => {
            const st = steps[s.id]?.state ?? 'pending';
            const detail = steps[s.id]?.detail;
            return (
              <li
                key={s.id}
                className={`flex items-start gap-3 text-xs transition-colors ${
                  st === 'done'
                    ? 'text-slate-800 dark:text-slate-200'
                    : st === 'active'
                    ? 'text-blue-600 dark:text-blue-400 font-semibold'
                    : 'text-slate-400 dark:text-slate-600'
                }`}
              >
                <div className="mt-0.5 shrink-0">
                  {st === 'done' ? (
                    <div className="w-4 h-4 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                      <Check className="w-2.5 h-2.5 stroke-[3]" />
                    </div>
                  ) : st === 'active' ? (
                    <div className="w-4 h-4 rounded-full border-2 border-blue-600 dark:border-blue-400 border-t-transparent animate-spin" />
                  ) : (
                    <div className="w-4 h-4 rounded-full border border-slate-300 dark:border-slate-700 flex items-center justify-center">
                      <div className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700" />
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div>{s.label}</div>
                  {detail && (
                    <p className="text-[11px] font-normal text-slate-500 dark:text-slate-400 mt-0.5">
                      {detail}
                    </p>
                  )}
                </div>
              </li>
            );
          })}
        </ul>

        {/* Result summary or error */}
        <AnimatePresence>
          {result?.ok && (
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 space-y-3 pt-3"
            >
              <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-bold text-xs">
                <Check className="w-4 h-4 text-emerald-600" />
                <span>Import Complete</span>
              </div>
              <p className="text-xs text-emerald-700 dark:text-emerald-300 leading-relaxed">
                Added {result.summary.experiencesAdded} experience roles and {result.summary.skillsAdded} technical skills
                {result.summary.photoAdded ? ' along with your profile photo' : ''}. All details have been seamlessly integrated.
              </p>
              <button
                type="button"
                onClick={() => onClose(true)}
                className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-md transition-all cursor-pointer"
              >
                Review My Profile
              </button>
            </motion.div>
          )}

          {result && !result.ok && (
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 space-y-3"
            >
              <div className="flex items-center gap-2 text-red-800 dark:text-red-300 font-bold text-xs">
                <AlertCircle className="w-4 h-4 text-red-600" />
                <span>Import Stopped</span>
              </div>
              <p className="text-xs text-red-700 dark:text-red-300">
                {result.message}
              </p>
              <button
                type="button"
                onClick={() => onClose(false)}
                className="w-full py-2 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-xs transition-colors cursor-pointer"
              >
                Close
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};
