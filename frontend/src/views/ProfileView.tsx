import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  User,
  ShieldCheck,
  Download,
  Trash2,
  Save,
  Sun,
  Moon,
  Laptop,
  Check,
  AlertTriangle,
  Briefcase,
  DollarSign,
  MapPin,
  Sparkles
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { CareerProfile, AppearanceMode } from '../types';
import { api } from '../services/api';
import { ConfirmModal } from '../components/ConfirmModal';
import { DisclaimerBanner } from '../components/DisclaimerBanner';

export const ProfileView: React.FC = () => {
  const { user, updateUserAppearance, logout } = useAuth();
  const { mode, resolvedTheme } = useTheme();

  const [profile, setProfile] = useState<CareerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Form fields
  const [targetTitle, setTargetTitle] = useState('');
  const [targetIndustry, setTargetIndustry] = useState('');
  const [yearsExp, setYearsExp] = useState(0);
  const [desiredSalaryMin, setDesiredSalaryMin] = useState<number | ''>('');
  const [desiredSalaryMax, setDesiredSalaryMax] = useState<number | ''>('');
  const [summary, setSummary] = useState('');
  const [skillsList, setSkillsList] = useState<string[]>([]);
  const [newSkillInput, setNewSkillInput] = useState('');

  // Modals
  const [deleteAccountModalOpen, setDeleteAccountModalOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        const p = await api.getProfile();
        setProfile(p);
        setTargetTitle(p.target_title || '');
        setTargetIndustry(p.target_industry || '');
        setYearsExp(p.years_of_experience || 0);
        setDesiredSalaryMin(p.desired_salary_min || '');
        setDesiredSalaryMax(p.desired_salary_max || '');
        setSummary(p.summary || '');
        setSkillsList(p.skills_list || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.updateProfile({
        target_title: targetTitle,
        target_industry: targetIndustry,
        years_of_experience: Number(yearsExp),
        desired_salary_min: desiredSalaryMin ? Number(desiredSalaryMin) : null,
        desired_salary_max: desiredSalaryMax ? Number(desiredSalaryMax) : null,
        summary: summary,
        skills_list: skillsList
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleAddSkill = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && newSkillInput.trim()) {
      e.preventDefault();
      if (!skillsList.includes(newSkillInput.trim())) {
        setSkillsList([...skillsList, newSkillInput.trim()]);
      }
      setNewSkillInput('');
    }
  };

  const handleRemoveSkill = (skill: string) => {
    setSkillsList(skillsList.filter((s) => s !== skill));
  };

  const handleExportData = async () => {
    setIsExporting(true);
    try {
      const data = await api.exportData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `CareerLens_Data_Export_${new Date().toISOString().substring(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
    } finally {
      setIsExporting(false);
    }
  };

  const handleDeleteAccount = async () => {
    try {
      await api.deleteAccount();
      logout();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto">
      <DisclaimerBanner compact />

      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          Career Profile & Privacy Settings
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
          Manage your career target parameters, appearance preferences, and exercise GDPR data export and deletion rights.
        </p>
      </div>

      {/* Appearance Settings Section (Mandatory 3-Mode Specification) */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            Appearance System
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Choose your preferred theme. System follows your operating system and browser preferences automatically.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* System */}
          <button
            type="button"
            onClick={() => updateUserAppearance('system')}
            className={`p-4 rounded-2xl border text-left transition-all relative ${
              mode === 'system'
                ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-950/40 text-blue-900 dark:text-blue-100 shadow-xs'
                : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <Laptop className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              {mode === 'system' && <Check className="w-4 h-4 text-blue-600 dark:text-blue-400" />}
            </div>
            <div className="font-bold text-xs">System Preference</div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              Syncs with OS theme ({resolvedTheme} active)
            </p>
          </button>

          {/* Light */}
          <button
            type="button"
            onClick={() => updateUserAppearance('light')}
            className={`p-4 rounded-2xl border text-left transition-all relative ${
              mode === 'light'
                ? 'border-blue-600 bg-blue-50/50 text-blue-900 shadow-xs'
                : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <Sun className="w-5 h-5 text-amber-500" />
              {mode === 'light' && <Check className="w-4 h-4 text-blue-600" />}
            </div>
            <div className="font-bold text-xs">Light Mode</div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Crisp document-friendly bright canvas
            </p>
          </button>

          {/* Dark */}
          <button
            type="button"
            onClick={() => updateUserAppearance('dark')}
            className={`p-4 rounded-2xl border text-left transition-all relative ${
              mode === 'dark'
                ? 'border-blue-500 bg-blue-950/50 text-white shadow-xs'
                : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <Moon className="w-5 h-5 text-blue-400" />
              {mode === 'dark' && <Check className="w-4 h-4 text-blue-400" />}
            </div>
            <div className="font-bold text-xs">Dark Mode</div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Deep navy surfaces and contrasted indicators
            </p>
          </button>
        </div>
      </div>

      {/* Career Profile Form */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            Career Target & Credentials Profile
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Informs AI recommendations, skill gap suggestions, and match alignment.
          </p>
        </div>

        <form onSubmit={handleSaveProfile} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Target Role Title
              </label>
              <input
                type="text"
                value={targetTitle}
                onChange={(e) => setTargetTitle(e.target.value)}
                placeholder="e.g. Senior Full-Stack Engineer"
                className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Industry Domain
              </label>
              <input
                type="text"
                value={targetIndustry}
                onChange={(e) => setTargetIndustry(e.target.value)}
                placeholder="e.g. Cloud Infrastructure, SaaS, Fintech"
                className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Years of Professional Experience
              </label>
              <input
                type="number"
                min="0"
                max="50"
                value={yearsExp}
                onChange={(e) => setYearsExp(Number(e.target.value))}
                className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Desired Min Base Salary ($ USD)
              </label>
              <input
                type="number"
                placeholder="150000"
                value={desiredSalaryMin}
                onChange={(e) => setDesiredSalaryMin(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Desired Max Base Salary ($ USD)
              </label>
              <input
                type="number"
                placeholder="210000"
                value={desiredSalaryMax}
                onChange={(e) => setDesiredSalaryMax(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>
          </div>

          {/* Core Skills Tags */}
          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Verified Technical & Core Skills
            </label>
            <div className="flex flex-wrap gap-2 p-2 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 min-h-[46px] items-center">
              {skillsList.map((skill) => (
                <span
                  key={skill}
                  className="px-2.5 py-1 rounded-xl bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 font-bold text-xs flex items-center gap-1.5"
                >
                  <span>{skill}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveSkill(skill)}
                    className="hover:text-red-500"
                  >
                    ×
                  </button>
                </span>
              ))}
              <input
                type="text"
                placeholder="Type skill & press Enter..."
                value={newSkillInput}
                onChange={(e) => setNewSkillInput(e.target.value)}
                onKeyDown={handleAddSkill}
                className="flex-1 min-w-[120px] bg-transparent text-xs text-slate-900 dark:text-white outline-hidden p-1"
              />
            </div>
          </div>

          {/* Summary */}
          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Elevator Pitch / Professional Summary
            </label>
            <textarea
              rows={4}
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="Highlight your key achievements, specialties, and leadership track record..."
              className="w-full p-3 rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white leading-relaxed"
            />
          </div>

          <div className="flex items-center justify-between pt-2">
            {saveSuccess ? (
              <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
                <Check className="w-4 h-4" /> Profile updated successfully!
              </span>
            ) : <span />}

            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-md transition-all flex items-center gap-2 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Saving...' : 'Save Career Profile'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* GDPR Data Controls & Security */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Privacy, Consent & Data Governance
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Resumes contain confidential personal data. You retain 100% control over your data.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          {/* Export Data */}
          <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 space-y-2">
            <h3 className="font-bold text-xs text-slate-900 dark:text-white">
              Export Personal Data (GDPR)
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Download a machine-readable JSON archive containing your complete profile, uploaded resume metadata, analysis runs, and job applications.
            </p>
            <button
              onClick={handleExportData}
              disabled={isExporting}
              className="mt-2 px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-xs flex items-center gap-1.5 shadow-xs"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isExporting ? 'Exporting...' : 'Download JSON Data'}</span>
            </button>
          </div>

          {/* Delete Account */}
          <div className="p-4 rounded-2xl border border-red-200 dark:border-red-900/40 bg-red-50/30 dark:bg-red-950/10 space-y-2">
            <h3 className="font-bold text-xs text-red-600 dark:text-red-400">
              Permanent Account Deletion
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Permanently purge your account, profile, all uploaded resume files from private storage, and tracking history. This cannot be undone.
            </p>
            <button
              onClick={() => setDeleteAccountModalOpen(true)}
              className="mt-2 px-3.5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold text-xs flex items-center gap-1.5 shadow-xs"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete Account & Resumes</span>
            </button>
          </div>
        </div>
      </div>

      {/* Delete Account Confirmation */}
      <ConfirmModal
        isOpen={deleteAccountModalOpen}
        title="Permanently Delete Account & Resumes?"
        message="This action will immediately delete your user account, all uploaded resume documents, extracted profiles, analysis histories, and application pipelines. This action is irreversible."
        confirmLabel="Permanently Delete Everything"
        onConfirm={handleDeleteAccount}
        onCancel={() => setDeleteAccountModalOpen(false)}
      />
    </div>
  );
};
