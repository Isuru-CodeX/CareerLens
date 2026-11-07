import React, { useState } from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  Copy,
  Check,
  Loader2,
  Award
} from 'lucide-react';
import { api } from '../../services/api';
import { GithubAuditResponse } from '../../types';

const GithubIcon = () => (
  <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
    <path d="M12 2A10 10 0 0 0 2 12c0 4.42 2.87 8.17 6.84 9.5.5.08.66-.23.66-.5v-1.69c-2.77.6-3.36-1.34-3.36-1.34-.46-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.87 1.52 2.34 1.07 2.91.83.1-.65.35-1.09.63-1.34-2.22-.25-4.55-1.11-4.55-4.92 0-1.11.38-2 1.03-2.71-.1-.25-.45-1.29.1-2.64 0 0 .84-.27 2.75 1.02.79-.22 1.65-.33 2.5-.33.85 0 1.71.11 2.5.33 1.91-1.29 2.75-1.02 2.75-1.02.55 1.35.2 2.39.1 2.64.65.71 1.03 1.6 1.03 2.71 0 3.82-2.34 4.66-4.57 4.91.36.31.69.92.69 1.85V21c0 .27.16.59.67.5C19.14 20.16 22 16.42 22 12A10 10 0 0 0 12 2z"/>
  </svg>
);

interface GithubProofOfWorkModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultUsername?: string;
}

export const GithubProofOfWorkModal: React.FC<GithubProofOfWorkModalProps> = ({
  isOpen,
  onClose,
  defaultUsername = ''
}) => {
  const [username, setUsername] = useState(defaultUsername || 'octocat');
  const [isAuditing, setIsAuditing] = useState(false);
  const [auditResult, setAuditResult] = useState<GithubAuditResponse | null>(null);
  const [copiedHash, setCopiedHash] = useState(false);

  if (!isOpen) return null;

  const handleRunAudit = async () => {
    if (!username.trim()) return;
    setIsAuditing(true);
    try {
      const res = await api.auditGithubProofOfWork({ username });
      setAuditResult(res);
    } catch (err: any) {
      console.error('GitHub audit error:', err);
    } finally {
      setIsAuditing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <span className="p-2.5 rounded-xl bg-slate-900 text-white dark:bg-slate-800">
              <GithubIcon />
            </span>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                GitHub Artifact & "Proof of Work" Verifier
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                  Module 10
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Cross-verify resume claims against source code repositories with cryptographic SHA-256 badges
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-sm font-semibold p-1"
          >
            ✕
          </button>
        </div>

        {/* Input Bar */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-mono">
              github.com/
            </span>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="username"
              className="w-full pl-24 pr-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono text-slate-900 dark:text-slate-100"
            />
          </div>
          <button
            onClick={handleRunAudit}
            disabled={isAuditing}
            className="py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-slate-200 dark:text-slate-900 text-white text-xs font-semibold flex items-center gap-2 shrink-0 transition-all shadow-sm"
          >
            {isAuditing ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
            Verify Claims
          </button>
        </div>

        {/* Audit Results */}
        {auditResult && (
          <div className="space-y-4 pt-2">
            {/* Top Scorecard */}
            <div className="grid grid-cols-3 gap-3 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 text-center">
              <div>
                <span className="text-[11px] text-slate-500 block">Repositories</span>
                <span className="text-lg font-black text-slate-900 dark:text-slate-100">
                  {auditResult.repositories_analyzed}
                </span>
              </div>
              <div>
                <span className="text-[11px] text-slate-500 block">Integrity Score</span>
                <span className="text-lg font-black text-emerald-600 dark:text-emerald-400">
                  {auditResult.integrity_score}%
                </span>
              </div>
              <div>
                <span className="text-[11px] text-slate-500 block">Total Commits</span>
                <span className="text-lg font-black text-indigo-600 dark:text-indigo-400">
                  {auditResult.total_commits}
                </span>
              </div>
            </div>

            {/* Claim-to-Code Evidence List */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Claim-to-Code Evidence Breakdown
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                {auditResult.verified_skills.map((s, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20 flex items-start justify-between text-xs"
                  >
                    <div>
                      <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        {s.skill}
                      </div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                        In {s.supporting_repos.length} repos ({s.evidence_level} Evidence)
                      </div>
                    </div>
                    <span className="text-[10px] font-bold font-mono text-emerald-700 dark:text-emerald-300">
                      {s.confidence}% Conf.
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Cryptographic SHA-256 Badge Card */}
            <div className="p-4 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-950/30 dark:to-purple-950/30 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Award className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  <span className="text-xs font-bold text-indigo-950 dark:text-indigo-200">
                    Cryptographic Proof-of-Work Badge
                  </span>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-100 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200 font-bold">
                  {auditResult.proof_of_work_badge.badge_id}
                </span>
              </div>

              <div className="p-2 rounded-lg bg-white/80 dark:bg-slate-900/80 border border-indigo-100 dark:border-slate-800 text-[11px] font-mono break-all text-slate-600 dark:text-slate-300 flex items-center justify-between gap-2">
                <span>{auditResult.proof_of_work_badge.cryptographic_hash}</span>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(auditResult.proof_of_work_badge.cryptographic_hash);
                    setCopiedHash(true);
                    setTimeout(() => setCopiedHash(false), 2000);
                  }}
                  className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 shrink-0"
                >
                  {copiedHash ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>

              <div className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
                <span>Issuer: {auditResult.proof_of_work_badge.issuer}</span>
                <span>Verified: {auditResult.proof_of_work_badge.verified_at}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
