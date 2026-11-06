import React from 'react';
import { AlertTriangle, UserPlus, X } from 'lucide-react';
import { useAuth } from '../context/useAuth';

interface EmailMismatchDialogProps {
  cvEmail: string;
  accountEmail: string;
  onCancel: () => void;
  onGoSignup?: (email: string) => void;
}

export const EmailMismatchDialog: React.FC<EmailMismatchDialogProps> = ({
  cvEmail,
  accountEmail,
  onCancel,
  onGoSignup
}) => {
  const { logout } = useAuth();

  const handleSignupWithCvEmail = async () => {
    try {
      logout();
    } catch {
      // ignore
    }
    if (onGoSignup) {
      onGoSignup(cvEmail);
    } else {
      window.location.href = `/signup?email=${encodeURIComponent(cvEmail)}`;
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-fade"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="em-title"
    >
      <div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-3xl p-6 sm:p-7 max-w-lg w-full border border-red-200 dark:border-red-900/60 shadow-2xl space-y-4">
        <div className="flex items-start gap-3.5">
          <div className="p-3 rounded-2xl bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400 shrink-0">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <h2 id="em-title" className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
              This CV cannot be added to your account
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Identity Verification Gate Policy
            </p>
          </div>
        </div>

        <div className="space-y-2.5 text-xs text-slate-700 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
          <p>
            The email detected in this CV (<b className="font-mono text-red-600 dark:text-red-400 font-semibold">{cvEmail}</b>) is different from your verified account email (<b className="font-mono text-slate-900 dark:text-white font-semibold">{accountEmail}</b>).
          </p>
          <p>
            CareerLens only imports CV details that belong to the verified email of the signed-in account. This protects your candidate telemetry from being filled with someone else's credentials.
          </p>
          <p className="font-bold text-slate-900 dark:text-white pt-1">
            Nothing from this CV was saved.
          </p>
        </div>

        <p className="text-xs text-slate-500 dark:text-slate-400">
          To use this CV, create an account with <b className="text-slate-700 dark:text-slate-300">{cvEmail}</b>, verify that address, and upload the CV there.
        </p>

        <div className="flex items-center justify-end gap-2.5 pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-xs transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
            <span>Cancel</span>
          </button>
          <button
            type="button"
            onClick={handleSignupWithCvEmail}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Sign up with this email</span>
          </button>
        </div>
      </div>
    </div>
  );
};
