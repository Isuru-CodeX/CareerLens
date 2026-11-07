import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Sparkles,
  CheckCircle2,
  ShieldCheck,
  Search,
  X,
  Loader2,
  Check,
  AlertCircle
} from 'lucide-react';
import { api } from '../../services/api';
import { ExtractedSocialSkill, SocialSkillExtractionResponse } from '../../types';

// Custom clean icons for professional profiles
const LinkedinIcon = () => (
  <svg className="w-4 h-4 text-[#0077b5]" viewBox="0 0 24 24" fill="currentColor">
    <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z" />
  </svg>
);

const GithubIcon = () => (
  <svg className="w-4 h-4 text-slate-800 dark:text-slate-200" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2A10 10 0 0 0 2 12c0 4.42 2.87 8.17 6.84 9.5.5.08.66-.23.66-.5v-1.69c-2.77.6-3.36-1.34-3.36-1.34-.46-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.87 1.52 2.34 1.07 2.91.83.1-.65.35-1.09.63-1.34-2.22-.25-4.55-1.11-4.55-4.92 0-1.11.38-2 1.03-2.71-.1-.25-.45-1.29.1-2.64 0 0 .84-.27 2.75 1.02.79-.22 1.65-.33 2.5-.33.85 0 1.71.11 2.5.33 1.91-1.29 2.75-1.02 2.75-1.02.55 1.35.2 2.39.1 2.64.65.71 1.03 1.6 1.03 2.71 0 3.82-2.34 4.66-4.57 4.91.36.31.69.92.69 1.85V21c0 .27.16.59.67.5C19.14 20.16 22 16.42 22 12A10 10 0 0 0 12 2z" />
  </svg>
);

interface SocialSkillDiscoveryModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultGithubUrl?: string;
  defaultLinkedinUrl?: string;
  onSkillsImported?: () => void;
}

export const SocialSkillDiscoveryModal: React.FC<SocialSkillDiscoveryModalProps> = ({
  isOpen,
  onClose,
  defaultGithubUrl = '',
  defaultLinkedinUrl = '',
  onSkillsImported
}) => {
  const [githubUrl, setGithubUrl] = useState(defaultGithubUrl);
  const [linkedinUrl, setLinkedinUrl] = useState(defaultLinkedinUrl);
  const [isScanning, setIsScanning] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [scanResult, setScanResult] = useState<SocialSkillExtractionResponse | null>(null);
  const [selectedSkills, setSelectedSkills] = useState<Set<string>>(new Set());
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [error, setError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState<string | null>(null);

  const handleScan = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!githubUrl.trim() && !linkedinUrl.trim()) {
      setError('Please provide at least a GitHub or LinkedIn profile URL to scan.');
      return;
    }

    setIsScanning(true);
    setError(null);
    setImportSuccess(null);
    try {
      const res = await api.extractSocialSkills({
        github_url: githubUrl.trim() || undefined,
        linkedin_url: linkedinUrl.trim() || undefined
      });
      setScanResult(res);

      // Pre-select new skills by default
      const initialSelected = new Set<string>();
      res.skills.forEach((s) => {
        if (!s.already_in_profile) {
          initialSelected.add(s.name);
        }
      });
      setSelectedSkills(initialSelected);
    } catch (err: any) {
      setError(err?.message || 'Failed to scan social profiles.');
    } finally {
      setIsScanning(false);
    }
  };

  const handleToggleSkill = (skillName: string) => {
    const next = new Set(selectedSkills);
    if (next.has(skillName)) {
      next.delete(skillName);
    } else {
      next.add(skillName);
    }
    setSelectedSkills(next);
  };

  const handleSelectAllNew = () => {
    if (!scanResult) return;
    const next = new Set<string>();
    scanResult.skills.forEach((s) => {
      if (!s.already_in_profile) next.add(s.name);
    });
    setSelectedSkills(next);
  };

  const handleDeselectAll = () => {
    setSelectedSkills(new Set());
  };

  const handleImport = async () => {
    if (selectedSkills.size === 0) return;
    setIsImporting(true);
    setError(null);
    try {
      const skillsToImport = Array.from(selectedSkills);
      const res = await api.importSocialSkills(skillsToImport);
      setImportSuccess(`Successfully imported ${res.imported_count} verified skills into your profile!`);
      if (onSkillsImported) {
        onSkillsImported();
      }
      setTimeout(() => {
        onClose();
      }, 1600);
    } catch (err: any) {
      setError(err?.message || 'Failed to import selected skills.');
    } finally {
      setIsImporting(false);
    }
  };

  if (!isOpen) return null;

  const categories = [
    { id: 'all', label: 'All Discovered' },
    { id: 'backend', label: 'Backend & APIs' },
    { id: 'frontend', label: 'Frontend' },
    { id: 'cloud_devops', label: 'Cloud & DevOps' },
    { id: 'data_ai', label: 'Data & AI' },
    { id: 'professional', label: 'Human & Practices' }
  ];

  const filteredSkills = scanResult?.skills.filter((s) => {
    if (selectedCategory === 'all') return true;
    return s.category === selectedCategory;
  }) || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div
        className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      />

      <motion.div
        className="relative w-full max-w-2xl max-h-[90vh] rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 md:p-8 shadow-2xl z-10 flex flex-col overflow-hidden"
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-purple-500/20">
              <Sparkles className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-slate-900 dark:text-white flex items-center gap-2">
                <span>AI Skill Discovery from GitHub &amp; LinkedIn</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Deep codebase &amp; public profile scanning with guaranteed PII sanitization.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Inputs (URLs) */}
        <div className="py-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* GitHub URL */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <GithubIcon />
                <span>GitHub Profile URL</span>
              </label>
              <input
                type="text"
                value={githubUrl}
                onChange={(e) => setGithubUrl(e.target.value)}
                placeholder="https://github.com/alexrivera"
                className="w-full px-3 py-2 rounded-xl text-xs font-medium border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-purple-500"
              />
            </div>

            {/* LinkedIn URL */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <LinkedinIcon />
                <span>LinkedIn Profile URL</span>
              </label>
              <input
                type="text"
                value={linkedinUrl}
                onChange={(e) => setLinkedinUrl(e.target.value)}
                placeholder="https://linkedin.com/in/alexrivera"
                className="w-full px-3 py-2 rounded-xl text-xs font-medium border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-1.5 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Sanitization Active: Strips phone numbers, names, locations, and personal emails.</span>
            </div>

            <button
              type="button"
              onClick={() => handleScan()}
              disabled={isScanning || (!githubUrl.trim() && !linkedinUrl.trim())}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold text-xs shadow-md shadow-purple-500/20 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {isScanning ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Scanning Codebase &amp; Profiles...</span>
                </>
              ) : (
                <>
                  <Search className="w-3.5 h-3.5" />
                  <span>Scan for Skills</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-3 mb-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Success Alert */}
        {importSuccess && (
          <div className="p-3 mb-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2 font-bold animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>{importSuccess}</span>
          </div>
        )}

        {/* Results Body */}
        {scanResult && (
          <div className="flex-1 flex flex-col min-h-0 pt-2 border-t border-slate-100 dark:border-slate-800 space-y-3">
            {/* Summary Bar & Selection Controls */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-purple-50/60 dark:bg-purple-950/30 p-3 rounded-2xl border border-purple-100 dark:border-purple-900/40">
              <div className="space-y-0.5">
                <span className="text-xs font-bold text-purple-900 dark:text-purple-200">
                  Discovered {scanResult.total_extracted} Verified Competencies
                </span>
                <p className="text-[11px] text-purple-700 dark:text-purple-300">
                  {scanResult.new_skills_count} new skills ready to add • {selectedSkills.size} currently selected
                </p>
              </div>

              <div className="flex items-center gap-2 text-xs">
                <button
                  type="button"
                  onClick={handleSelectAllNew}
                  className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold border border-slate-200 dark:border-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Select New
                </button>
                <button
                  type="button"
                  onClick={handleDeselectAll}
                  className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold border border-slate-200 dark:border-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Clear
                </button>
              </div>
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-3 py-1 rounded-xl font-bold whitespace-nowrap cursor-pointer transition-colors ${
                    selectedCategory === cat.id
                      ? 'bg-purple-600 text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Skills Checkbox Grid */}
            <div className="flex-1 overflow-y-auto pr-1 space-y-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {filteredSkills.map((s: ExtractedSocialSkill) => {
                  const isChecked = selectedSkills.has(s.name);
                  return (
                    <div
                      key={s.name}
                      onClick={() => !s.already_in_profile && handleToggleSkill(s.name)}
                      className={`p-3 rounded-2xl border transition-all flex items-start gap-3 cursor-pointer ${
                        s.already_in_profile
                          ? 'bg-slate-50/60 dark:bg-slate-800/30 border-slate-200 dark:border-slate-800 opacity-60 cursor-default'
                          : isChecked
                          ? 'bg-purple-50/70 dark:bg-purple-950/40 border-purple-300 dark:border-purple-800 shadow-2xs'
                          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-purple-200'
                      }`}
                    >
                      <div className="pt-0.5">
                        <div
                          className={`w-4 h-4 rounded-md border flex items-center justify-center transition-colors ${
                            isChecked
                              ? 'bg-purple-600 border-purple-600 text-white'
                              : 'border-slate-300 dark:border-slate-600'
                          }`}
                        >
                          {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>
                      </div>

                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center justify-between gap-1">
                          <span className="font-bold text-xs text-slate-900 dark:text-white truncate">
                            {s.name}
                          </span>
                          {s.already_in_profile ? (
                            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-md bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 shrink-0">
                              In Profile
                            </span>
                          ) : (
                            <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 shrink-0">
                              {Math.round(s.confidence * 100)}% Conf
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                          {s.platform === 'github' ? <GithubIcon /> : <LinkedinIcon />}
                          <span className="truncate">{s.source}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Modal Footer */}
        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <span className="text-xs text-slate-400">
            {scanResult ? `${selectedSkills.size} skills selected` : 'Scan to discover verified skills'}
          </span>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isImporting}
              className="px-4 py-2 text-xs font-semibold rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            >
              Cancel
            </button>
            {scanResult && (
              <button
                type="button"
                onClick={handleImport}
                disabled={isImporting || selectedSkills.size === 0}
                className="px-5 py-2 text-xs font-bold rounded-xl text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 shadow-md shadow-purple-500/20 flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isImporting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Importing to Profile...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Import Verified Skills ({selectedSkills.size})</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
};
