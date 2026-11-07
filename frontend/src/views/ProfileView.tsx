import React, { useState, useEffect, useRef } from 'react';
import {
  ShieldCheck,
  Download,
  Trash2,
  Save,
  Sun,
  Moon,
  Laptop,
  Check,
  Phone,
  Globe,
  Mail,
  Camera,
  Upload,
  AlertCircle,
  Sparkles,
  Loader2
} from 'lucide-react';
import { useAuth } from '../context/useAuth';
import { useTheme } from '../context/useTheme';
import { api } from '../services/api';
import { ConfirmModal } from '../components/ConfirmModal';
import { DisclaimerBanner } from '../components/DisclaimerBanner';
import { AvatarCropModal } from '../components/AvatarCropModal';
import { AddressFields, AddressData } from '../components/AddressFields';
import { LinksEditor } from '../components/LinksEditor';
import { EducationEditor } from '../components/EducationEditor';
import { ExperienceEditor } from '../components/ExperienceEditor';
import { SkillsEditor } from '../components/SkillsEditor';
import { GithubProofOfWorkModal } from '../components/verification/GithubProofOfWorkModal';
import { ProfileExperience, ProfileSkill, EducationItem } from '../types';

// Custom clean icons for professional profiles
const LinkedinIcon = () => (
  <svg className="w-4 h-4 text-[#0077b5]" viewBox="0 0 24 24" fill="currentColor">
    <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z"/>
  </svg>
);

const GithubIcon = () => (
  <svg className="w-4 h-4 text-slate-800 dark:text-slate-200" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2A10 10 0 0 0 2 12c0 4.42 2.87 8.17 6.84 9.5.5.08.66-.23.66-.5v-1.69c-2.77.6-3.36-1.34-3.36-1.34-.46-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.87 1.52 2.34 1.07 2.91.83.1-.65.35-1.09.63-1.34-2.22-.25-4.55-1.11-4.55-4.92 0-1.11.38-2 1.03-2.71-.1-.25-.45-1.29.1-2.64 0 0 .84-.27 2.75 1.02.79-.22 1.65-.33 2.5-.33.85 0 1.71.11 2.5.33 1.91-1.29 2.75-1.02 2.75-1.02.55 1.35.2 2.39.1 2.64.65.71 1.03 1.6 1.03 2.71 0 3.82-2.34 4.66-4.57 4.91.36.31.69.92.69 1.85V21c0 .27.16.59.67.5C19.14 20.16 22 16.42 22 12A10 10 0 0 0 12 2z"/>
  </svg>
);

export const ProfileView: React.FC = () => {
  const { user, updateUserAppearance, logout, refreshUser } = useAuth();
  const { mode, resolvedTheme } = useTheme();

  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Avatar upload & crop state
  const [avatarLoading, setAvatarLoading] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [avatarSuccess, setAvatarSuccess] = useState<string | null>(null);
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Contact info & social links
  const [phone, setPhone] = useState('');
  const [linkedinUrl, setLinkedinUrl] = useState('');
  const [githubUrl, setGithubUrl] = useState('');
  const [portfolioUrl, setPortfolioUrl] = useState('');
  const [otherLinks, setOtherLinks] = useState<{ label: string; url: string }[]>([]);
  const [address, setAddress] = useState<AddressData>({});
  const [showGithubProofModal, setShowGithubProofModal] = useState(false);

  // Career profile fields
  const [targetTitle, setTargetTitle] = useState('');
  const [targetIndustry, setTargetIndustry] = useState('');
  const [yearsExp, setYearsExp] = useState(0);
  const [desiredSalaryMin, setDesiredSalaryMin] = useState<number | ''>('');
  const [desiredSalaryMax, setDesiredSalaryMax] = useState<number | ''>('');
  const [summary, setSummary] = useState('');
  const [educationHistory, setEducationHistory] = useState<EducationItem[]>([]);
  const [profileExperiences, setProfileExperiences] = useState<ProfileExperience[]>([]);
  const [profileSkills, setProfileSkills] = useState<ProfileSkill[]>([]);
  const [suggestingIndustry, setSuggestingIndustry] = useState(false);
  const [industrySuggestedBadge, setIndustrySuggestedBadge] = useState<string | null>(null);

  // Modals
  const [deleteAccountModalOpen, setDeleteAccountModalOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const fetchAllData = async () => {
      try {
        const [p, exps, sks] = await Promise.all([
          api.getProfile(),
          api.getProfileExperiences().catch(() => []),
          api.getProfileSkills().catch(() => [])
        ]);
        if (!isMounted) return;
        setTargetTitle(p.target_title || '');
        setTargetIndustry(p.target_industry || '');
        setYearsExp(p.years_of_experience || 0);
        setDesiredSalaryMin(p.desired_salary_min || '');
        setDesiredSalaryMax(p.desired_salary_max || '');
        setSummary(p.summary || '');
        setPhone(p.phone || '');
        setLinkedinUrl(p.linkedin_url || '');
        setGithubUrl(p.github_url || '');
        setPortfolioUrl(p.portfolio_url || '');
        setOtherLinks(p.other_links || []);
        setAddress({
          address_line1: p.address_line1 || '',
          city: p.city || '',
          region: p.region || '',
          postal_code: p.postal_code || '',
          country: p.country || ''
        });
        setEducationHistory(p.education_history || []);
        setProfileExperiences(exps);
        setProfileSkills(sks);
      } catch (err) {
        console.error(err);
      }
    };
    fetchAllData();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleSuggestIndustry = async () => {
    if (suggestingIndustry) return;
    setSuggestingIndustry(true);
    setIndustrySuggestedBadge(null);
    try {
      const effectiveRole = targetTitle || profileExperiences[0]?.job_title || '';
      const res = await api.suggestIndustry(
        effectiveRole,
        profileSkills.map((s) => s.name)
      );
      if (res.suggested_industry) {
        setTargetIndustry(res.suggested_industry);
        setIndustrySuggestedBadge(res.suggested_industry);
        setTimeout(() => setIndustrySuggestedBadge(null), 3500);
      }
    } catch (err) {
      console.error('Failed to suggest industry domain:', err);
    } finally {
      setSuggestingIndustry(false);
    }
  };

  const handleSaveProfile = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSaving(true);
    try {
      await api.updateProfile({
        target_title: targetTitle,
        target_industry: targetIndustry,
        years_of_experience: Number(yearsExp),
        desired_salary_min: desiredSalaryMin ? Number(desiredSalaryMin) : null,
        desired_salary_max: desiredSalaryMax ? Number(desiredSalaryMax) : null,
        summary: summary,
        phone: phone,
        address_line1: address.address_line1,
        city: address.city,
        region: address.region,
        postal_code: address.postal_code,
        country: address.country,
        linkedin_url: linkedinUrl,
        github_url: githubUrl,
        portfolio_url: portfolioUrl,
        other_links: otherLinks,
        education_history: educationHistory
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveExperience = async (exp: ProfileExperience) => {
    try {
      if (exp.id.startsWith('temp_')) {
        const created = await api.createProfileExperience({
          job_title: exp.job_title,
          company: exp.company,
          industry: exp.industry,
          start_year: exp.start_year,
          start_month: exp.start_month,
          end_year: exp.end_year,
          end_month: exp.end_month,
          is_current: exp.is_current,
          description: exp.description,
          highlights: exp.highlights
        });
        setProfileExperiences((prev) => prev.map((x) => (x.id === exp.id ? created : x)));
      } else {
        const updated = await api.updateProfileExperience(exp.id, exp);
        setProfileExperiences((prev) => prev.map((x) => (x.id === exp.id ? updated : x)));
      }
    } catch (err) {
      console.error('Failed to save experience:', err);
    }
  };

  const handleDeleteExperience = async (id: string) => {
    try {
      if (!id.startsWith('temp_')) {
        await api.deleteProfileExperience(id);
      }
      setProfileExperiences((prev) => prev.filter((x) => x.id !== id));
    } catch (err) {
      console.error('Failed to delete experience:', err);
    }
  };

  const handleAddSkills = async (names: string[]) => {
    try {
      const added = await api.addProfileSkills(names);
      setProfileSkills((prev) => {
        const existingIds = new Set(prev.map((s) => s.id));
        const newOnes = added.filter((a) => !existingIds.has(a.id));
        return [...prev, ...newOnes];
      });
    } catch (err) {
      console.error('Failed to add skills:', err);
    }
  };

  const handleRemoveSkill = async (id: string) => {
    // Optimistically remove skill from state immediately
    setProfileSkills((prev) => prev.filter((s) => s.id !== id));
    try {
      await api.deleteProfileSkill(id);
    } catch (err) {
      console.error('Failed to remove skill:', err);
      // Re-fetch from server if deletion failed
      const sks = await api.getProfileSkills().catch(() => []);
      setProfileSkills(sks);
    }
  };

  const handleAvatarFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setAvatarError(null);
    setAvatarSuccess(null);

    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.type)) {
      setAvatarError('Please upload a valid image (JPEG, PNG, or WebP).');
      return;
    }

    if (file.size > 12 * 1024 * 1024) {
      setAvatarError('Image exceeds the 12 MB file size limit.');
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    setCropImageSrc(previewUrl);
    setCropModalOpen(true);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleCropComplete = async (croppedFile: File) => {
    setCropModalOpen(false);
    if (cropImageSrc) {
      URL.revokeObjectURL(cropImageSrc);
      setCropImageSrc(null);
    }

    setAvatarLoading(true);
    setAvatarError(null);
    setAvatarSuccess(null);
    try {
      const res = await api.uploadAvatar(croppedFile);
      await refreshUser();
      setAvatarSuccess(res.message || 'Profile photo updated successfully!');
      setTimeout(() => setAvatarSuccess(null), 3500);
    } catch (err: any) {
      setAvatarError(err.message || 'Failed to upload photo.');
    } finally {
      setAvatarLoading(false);
    }
  };

  const handleCloseCropModal = () => {
    setCropModalOpen(false);
    if (cropImageSrc) {
      URL.revokeObjectURL(cropImageSrc);
      setCropImageSrc(null);
    }
  };

  const handleRemoveAvatar = async () => {
    setAvatarLoading(true);
    setAvatarError(null);
    setAvatarSuccess(null);
    try {
      const res = await api.deleteAvatar();
      await refreshUser();
      setAvatarSuccess(res.message || 'Profile photo removed.');
      setTimeout(() => setAvatarSuccess(null), 3000);
    } catch (err: any) {
      setAvatarError(err.message || 'Failed to remove photo.');
    } finally {
      setAvatarLoading(false);
    }
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
          Manage your career target parameters, contact information, appearance preferences, and exercise GDPR data export and deletion rights.
        </p>
      </div>

      {/* 0. Profile Photo / Avatar Section */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
            <Camera className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Profile Photo & Avatar
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Personalize your account with a clear professional headshot. Supported formats: JPEG, PNG, WebP (max 5 MB).
            </p>
          </div>
        </div>

        {avatarError && (
          <div className="flex items-center gap-2 p-3 rounded-2xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 text-xs text-red-700 dark:text-red-300">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{avatarError}</span>
          </div>
        )}

        {avatarSuccess && (
          <div className="flex items-center gap-2 p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-900 text-xs text-emerald-700 dark:text-emerald-300">
            <Check className="w-4 h-4 shrink-0" />
            <span>{avatarSuccess}</span>
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 pt-1">
          <div className="relative group shrink-0">
            {user?.avatar_url ? (
              <img
                src={user.avatar_url}
                alt={user.full_name || 'User avatar'}
                className="w-20 h-20 rounded-full object-cover border-2 border-indigo-500/80 shadow-md ring-4 ring-indigo-50 dark:ring-indigo-950/50"
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 text-white font-extrabold text-2xl flex items-center justify-center shadow-md ring-4 ring-slate-100 dark:ring-slate-800">
                {user?.full_name ? user.full_name.charAt(0).toUpperCase() : 'U'}
              </div>
            )}
            {avatarLoading && (
              <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center">
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </div>

          <div className="space-y-2 text-center sm:text-left flex-1">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleAvatarFileSelect}
              className="hidden"
            />
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={avatarLoading}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs disabled:opacity-50 transition-colors cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>{user?.avatar_url ? 'Change Photo' : 'Upload Photo'}</span>
              </button>

              {user?.avatar_url && (
                <button
                  type="button"
                  onClick={handleRemoveAvatar}
                  disabled={avatarLoading}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-red-50 hover:border-red-200 dark:hover:bg-red-950/40 text-slate-700 dark:text-slate-300 hover:text-red-600 dark:hover:text-red-400 text-xs font-medium transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Remove</span>
                </button>
              )}
            </div>
            <p className="text-[11px] text-slate-400 dark:text-slate-500">
              Optimal resolution 400x400px. Maximum upload size 5 MB.
            </p>
          </div>
        </div>
      </div>

      {/* 1. Contact Information & Professional Links Section */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-5">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
              <Phone className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Contact Information & Professional Links
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                These coordinates are automatically inserted into your generated cover letters, resume header exports, and recruiter communications.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          {/* Email */}
          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
              <input
                type="text"
                disabled
                value={user?.email || 'demo@careerlens.ai'}
                className="w-full pl-9 pr-24 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 text-slate-600 dark:text-slate-400 cursor-not-allowed font-mono text-xs"
              />
              <span className="absolute right-2.5 top-2 px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-bold text-[10px]">
                Verified
              </span>
            </div>
          </div>

          {/* Phone / Mobile */}
          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Phone / Mobile Number
            </label>
            <div className="relative">
              <Phone className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+1 (555) 019-2834"
                className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-sans"
              />
            </div>
          </div>

          {/* LinkedIn Profile */}
          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              LinkedIn Profile URL
            </label>
            <div className="relative">
              <div className="absolute left-3 top-2.5">
                <LinkedinIcon />
              </div>
              <input
                type="text"
                value={linkedinUrl}
                onChange={(e) => setLinkedinUrl(e.target.value)}
                placeholder="https://linkedin.com/in/alexrivera"
                className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-sans"
              />
            </div>
          </div>

          {/* GitHub Profile */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block font-semibold text-slate-700 dark:text-slate-300">
                GitHub Profile URL
              </label>
              <button
                type="button"
                onClick={() => setShowGithubProofModal(true)}
                className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                Proof of Work Audit (Module 10)
              </button>
            </div>
            <div className="relative">
              <div className="absolute left-3 top-2.5">
                <GithubIcon />
              </div>
              <input
                type="text"
                value={githubUrl}
                onChange={(e) => setGithubUrl(e.target.value)}
                placeholder="https://github.com/alexrivera"
                className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-sans"
              />
            </div>
          </div>

          {/* Portfolio / Personal Website */}
          <div className="sm:col-span-2">
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Portfolio / Personal Website URL
            </label>
            <div className="relative">
              <Globe className="absolute left-3 top-2.5 w-4 h-4 text-emerald-500" />
              <input
                type="text"
                value={portfolioUrl}
                onChange={(e) => setPortfolioUrl(e.target.value)}
                placeholder="https://alexrivera.dev"
                className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-sans"
              />
            </div>
          </div>
        </div>

        {/* Address Fields */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80">
          <AddressFields value={address} onChange={setAddress} />
        </div>

        {/* Additional Links & Profiles */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80">
          <LinksEditor links={otherLinks} onChange={setOtherLinks} />
        </div>

        {/* Quick Save Contact Button */}
        <div className="flex items-center justify-between pt-2">
          {saveSuccess ? (
            <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
              <Check className="w-4 h-4" /> Contact details saved successfully!
            </span>
          ) : <span />}

          <button
            type="button"
            onClick={() => handleSaveProfile()}
            disabled={saving}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-md transition-all flex items-center gap-2 disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{saving ? 'Saving...' : 'Save Contact Info'}</span>
          </button>
        </div>
      </div>

      {/* 2. Appearance Settings Section */}
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

      {/* 3. Career Profile & Qualifications Form */}
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
              <div className="flex items-center justify-between mb-1">
                <label className="block font-semibold text-slate-700 dark:text-slate-300">
                  Industry Domain
                </label>
                <div className="flex items-center gap-2">
                  {industrySuggestedBadge && (
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold animate-pulse">
                      Suggested!
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={handleSuggestIndustry}
                    disabled={suggestingIndustry}
                    className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 flex items-center gap-1 cursor-pointer disabled:opacity-50"
                    title="Search online & infer best industry domain from role and skills"
                  >
                    {suggestingIndustry ? (
                      <>
                        <Loader2 className="w-3 h-3 animate-spin" />
                        <span>Inferring...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3 h-3" />
                        <span>AI Suggest Domain</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
              <input
                type="text"
                value={targetIndustry}
                onChange={(e) => setTargetIndustry(e.target.value)}
                placeholder="e.g. Cloud Infrastructure, SaaS, Fintech"
                className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>
          </div>

          {/* Education History Section with Presets */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80">
            <EducationEditor
              items={educationHistory}
              onChange={setEducationHistory}
            />
          </div>

          {/* Work Experience Section with auto year calculations */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80">
            <ExperienceEditor
              items={profileExperiences}
              onChange={setProfileExperiences}
              onSaveItem={handleSaveExperience}
              onDeleteItem={handleDeleteExperience}
            />
          </div>

          {/* Verified Technical and Core Skills Section */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80">
            <SkillsEditor
              skills={profileSkills}
              onAddSkills={handleAddSkills}
              onRemoveSkill={handleRemoveSkill}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100 dark:border-slate-800/80">
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

      {/* 4. GDPR Data Controls & Security */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Data Privacy & GDPR Rights Management
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              You own your career telemetry. Export complete machine-readable copies or exercise permanent right-to-be-forgotten.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          {/* Export JSON */}
          <div className="p-4 rounded-2xl border border-emerald-300 dark:border-emerald-600/40 bg-emerald-50/60 dark:bg-emerald-950/40 space-y-2 flex flex-col justify-between shadow-2xs">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 font-bold text-xs text-emerald-800 dark:text-emerald-300">
                <Download className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>Download Machine-Readable Archive</span>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                Exports your user profile, uploaded resumes, parsed credentials, and application tracker logs into a single structured .JSON format.
              </p>
            </div>
            <button
              type="button"
              onClick={handleExportData}
              disabled={isExporting}
              className="mt-2 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center gap-2 shadow-sm transition-colors disabled:opacity-50 self-start cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isExporting ? 'Exporting...' : 'Export Data (.JSON)'}</span>
            </button>
          </div>

          {/* Permanent Deletion */}
          <div className="p-4 rounded-2xl border border-red-200 dark:border-red-950/60 bg-red-50/30 dark:bg-red-950/20 space-y-2">
            <div className="font-bold text-xs text-red-700 dark:text-red-400">
              Permanent Account & Resume Deletion
            </div>
            <p className="text-[11px] text-red-600/80 dark:text-red-300/70">
              Irrevocably deletes your user profile, all uploaded original documents, generated drafts, and analysis history from storage.
            </p>
            <button
              type="button"
              onClick={() => setDeleteAccountModalOpen(true)}
              className="mt-2 px-3.5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold text-xs flex items-center gap-2 shadow-xs transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete Account & Data</span>
            </button>
          </div>
        </div>
      </div>

      {/* Confirmation Modal for Delete Account */}
      <ConfirmModal
        isOpen={deleteAccountModalOpen}
        title="Permanently Delete CareerLens Account?"
        message="This operation cannot be undone. All your resumes, parsed sections, AI analyses, cover letters, and application tracker history will be immediately and irrevocably purged from the database."
        confirmLabel="Purge Everything"
        isDestructive
        onConfirm={handleDeleteAccount}
        onCancel={() => setDeleteAccountModalOpen(false)}
      />

      {/* Avatar Crop & Reposition Modal */}
      {cropModalOpen && cropImageSrc && (
        <AvatarCropModal
          key={cropImageSrc}
          imageSrc={cropImageSrc}
          onCropComplete={handleCropComplete}
          onClose={handleCloseCropModal}
        />
      )}

      {/* GitHub Proof of Work Modal (Module 10) */}
      <GithubProofOfWorkModal
        isOpen={showGithubProofModal}
        onClose={() => setShowGithubProofModal(false)}
        defaultUsername={githubUrl.split('/').filter(Boolean).pop() || 'alexrivera'}
      />
    </div>
  );
};
