import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  UploadCloud,
  Trash2,
  Download,
  Target,
  Sparkles,
  Edit3,
  Check,
  X,
  Plus,
  Printer,
  Calendar,
  Layers,
  FileCheck,
  Award,
  Eye,
  UserCheck,
  UserPlus,
  RefreshCw,
  Loader2,
  CheckCircle2
} from 'lucide-react';
import { Resume } from '../types';
import { api } from '../services/api';
import { ConfirmModal } from '../components/ConfirmModal';
import { DisclaimerBanner } from '../components/DisclaimerBanner';
import { ExperienceIntelligencePanel } from '../components/ExperienceIntelligencePanel';
import { useAuth } from '../context/useAuth';

interface ResumesViewProps {
  onNavigate: (view: string, extra?: any) => void;
  openUploadOnMount?: boolean;
}

export const ResumesView: React.FC<ResumesViewProps> = ({
  onNavigate,
  openUploadOnMount = false
}) => {
  const { user, loginDemo } = useAuth();
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadModalOpen, setUploadModalOpen] = useState(openUploadOnMount);
  const [activeResumeForEdit, setActiveResumeForEdit] = useState<Resume | null>(null);
  const [resumeToDelete, setResumeToDelete] = useState<Resume | null>(null);

  // Upload Form state
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadTargetRole, setUploadTargetRole] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Review & Edit state
  const [editSectionType, setEditSectionType] = useState<string>('summary');
  const [editedContent, setEditedContent] = useState<string>('');
  const [isSavingSection, setIsSavingSection] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Sync CV to Profile state (CV -> Profile)
  const [syncingResumeId, setSyncingResumeId] = useState<string | null>(null);
  const [syncFeedback, setSyncFeedback] = useState<{ resumeId: string; message: string; summary: any } | null>(null);

  // Apply Profile details to Resume state (Profile -> Resume)
  const [syncingFromProfileResumeId, setSyncingFromProfileResumeId] = useState<string | null>(null);
  const [profileSyncFeedback, setProfileSyncFeedback] = useState<{ resumeId: string; message: string; summary: any } | null>(null);

  // Create Resume from Profile state
  const [createFromProfileModalOpen, setCreateFromProfileModalOpen] = useState(false);
  const [createProfileTitle, setCreateProfileTitle] = useState('');
  const [createProfileRole, setCreateProfileRole] = useState('');
  const [isCreatingFromProfile, setIsCreatingFromProfile] = useState(false);
  const [createFromProfileError, setCreateFromProfileError] = useState<string | null>(null);
  const [isFillingFromProfile, setIsFillingFromProfile] = useState(false);

  const handleSyncToProfile = async (r: Resume) => {
    setSyncingResumeId(r.id);
    try {
      const res = await api.syncResumeToProfile(r.id);
      setSyncFeedback({ resumeId: r.id, message: res.message, summary: res.summary });
      setTimeout(() => setSyncFeedback(null), 6000);
    } catch (err: any) {
      alert(err.message || 'Failed to sync CV to profile.');
    } finally {
      setSyncingResumeId(null);
    }
  };

  const handleApplyProfileToResume = async (r: Resume) => {
    setSyncingFromProfileResumeId(r.id);
    try {
      const res = await api.syncProfileToResume(r.id);
      setProfileSyncFeedback({
        resumeId: r.id,
        message: res.message,
        summary: {
          skills_count: res.summary.skills_applied,
          experiences_count: res.summary.experiences_applied,
          education_count: res.summary.education_applied,
          target_role: res.resume.target_role
        }
      });
      await fetchResumes();
      setTimeout(() => setProfileSyncFeedback(null), 7000);
    } catch (err: any) {
      alert(err.message || 'Failed to apply profile details to resume.');
    } finally {
      setSyncingFromProfileResumeId(null);
    }
  };

  const handleCreateFromProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreatingFromProfile(true);
    setCreateFromProfileError(null);
    try {
      if (!user && !api.getToken()) {
        try {
          await loginDemo();
        } catch {
          // ignore
        }
      }
      const newResume = await api.createResumeFromProfile({
        title: createProfileTitle.trim() || undefined,
        target_role: createProfileRole.trim() || undefined
      });
      setCreateFromProfileModalOpen(false);
      setCreateProfileTitle('');
      setCreateProfileRole('');
      await fetchResumes();
      onNavigate('analysis', { resumeId: newResume.id });
    } catch (err: any) {
      setCreateFromProfileError(err.message || 'Failed to generate resume from profile.');
    } finally {
      setIsCreatingFromProfile(false);
    }
  };

  const handleFillSectionFromProfile = async () => {
    setIsFillingFromProfile(true);
    try {
      const profile = await api.getProfile();
      if (editSectionType === 'summary') {
        if (profile.summary) {
          setEditedContent(profile.summary);
        } else {
          alert('No summary found in your profile. You can add one in Profile view.');
        }
      } else if (editSectionType === 'skills') {
        const skills = await api.getProfileSkills();
        if (skills && skills.length > 0) {
          setEditedContent(skills.map((s) => s.name).join(', '));
        } else {
          alert('No skills found in your profile. You can add verified skills in Profile view.');
        }
      } else if (editSectionType === 'contact') {
        const contactLines = [
          user?.full_name || '',
          user?.email || '',
          profile.phone || '',
          [profile.city, profile.region, profile.country].filter(Boolean).join(', '),
          profile.linkedin_url || '',
          profile.github_url || '',
          profile.portfolio_url || ''
        ].filter(Boolean).join(' • ');
        setEditedContent(contactLines);
      }
    } catch (err: any) {
      console.error('Failed to load profile for section:', err);
      alert('Could not fetch profile details. Ensure you are signed in.');
    } finally {
      setIsFillingFromProfile(false);
    }
  };

  const fetchResumes = useCallback(async () => {
    try {
      const list = await api.getResumes();
      setResumes(list);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    api.getResumes()
      .then((list) => {
        if (!isMounted) return;
        setResumes(list);
      })
      .catch((err) => {
        console.error(err);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const handleFileDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const f = e.dataTransfer.files[0];
      setUploadFile(f);
      if (!uploadTitle) setUploadTitle(f.name.replace(/\.[^/.]+$/, ''));
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const f = e.target.files[0];
      setUploadFile(f);
      if (!uploadTitle) setUploadTitle(f.name.replace(/\.[^/.]+$/, ''));
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile) return;

    setIsUploading(true);
    setUploadProgress(20);
    setUploadError(null);

    const progressTimer = setInterval(() => {
      setUploadProgress((prev) => (prev < 90 ? prev + 15 : prev));
    }, 150);

    try {
      if (!user && !api.getToken()) {
        try {
          await loginDemo();
        } catch {
          // ignore
        }
      }
      const newResume = await api.uploadResume(uploadFile, uploadTitle, uploadTargetRole);
      clearInterval(progressTimer);
      setUploadProgress(100);
      setUploadModalOpen(false);
      setUploadFile(null);
      setUploadTitle('');
      setUploadTargetRole('');
      await fetchResumes();
      // Navigate to analysis
      onNavigate('analysis', { resumeId: newResume.id });
    } catch (err: any) {
      clearInterval(progressTimer);
      setUploadError(err.message || 'Upload failed.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteResume = async () => {
    if (!resumeToDelete) return;
    try {
      await api.deleteResume(resumeToDelete.id);
      setResumeToDelete(null);
      fetchResumes();
    } catch (err) {
      console.error(err);
    }
  };

  const openEditor = (resume: Resume) => {
    setActiveResumeForEdit(resume);
    // Find summary
    const sumSec = resume.sections?.find((s) => s.section_type === 'summary');
    setEditedContent(sumSec?.structured_data?.text || resume.raw_text || '');
    setEditSectionType('summary');
  };

  const handleSaveSection = async () => {
    if (!activeResumeForEdit) return;
    setIsSavingSection(true);
    try {
      const targetSec = activeResumeForEdit.sections?.find(
        (s) => s.section_type === editSectionType
      );
      if (targetSec) {
        let structured: any = targetSec.structured_data;
        if (editSectionType === 'summary') {
          structured = { text: editedContent };
        } else if (editSectionType === 'contact') {
          structured = { ...structured, summary_override: editedContent };
        }
        await api.updateSection(activeResumeForEdit.id, targetSec.id, {
          raw_content: editedContent,
          structured_data: structured
        });
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 2000);
        await fetchResumes();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSavingSection(false);
    }
  };

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8 w-full min-w-0">
      <DisclaimerBanner compact />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Resume Library & Parser
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Store role-specific resume versions, review extracted sections, and keep original files immutable.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => {
              setCreateProfileTitle(user?.full_name ? `${user.full_name} - Master Resume` : 'My Master Resume');
              setCreateProfileRole('');
              setCreateFromProfileError(null);
              setCreateFromProfileModalOpen(true);
            }}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-semibold text-xs shadow-md shadow-purple-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
            title="Generate a brand-new resume document directly from your verified profile summary, skills, and work history"
          >
            <UserPlus className="w-4 h-4" />
            <span>Create Resume from Profile</span>
          </button>

          <button
            type="button"
            onClick={() => setUploadModalOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold text-xs shadow-md shadow-blue-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Upload Resume</span>
          </button>
        </div>
      </div>

      {/* Resumes Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-64 bg-slate-200 dark:bg-slate-800 rounded-3xl" />
          ))}
        </div>
      ) : resumes.length === 0 ? (
        <div className="p-12 text-center rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto">
            <UploadCloud className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              No resumes uploaded yet
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto mt-1">
              Upload your resume in PDF or DOCX format to receive instant section parsing, structure scoring, and job matching.
            </p>
          </div>
          <button
            onClick={() => setUploadModalOpen(true)}
            className="px-5 py-2.5 rounded-xl bg-blue-600 text-white font-semibold text-xs shadow-md"
          >
            Upload First Resume
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {resumes.map((r) => (
            <motion.div
              key={r.id}
              whileHover={{ y: -3 }}
              className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between space-y-4"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-xs uppercase">
                      {r.file_type}
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-slate-900 dark:text-white line-clamp-1">
                        {r.title}
                      </h3>
                      <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full">
                        {r.target_role || 'General Role'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <a
                      href={api.getResumeFileUrl(r.id, 'inline')}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 p-1 rounded-lg transition-colors"
                      title="View original / PDF preview in new tab"
                    >
                      <Eye className="w-4 h-4" />
                    </a>
                    <a
                      href={api.getResumeFileUrl(r.id, 'attachment')}
                      download
                      className="text-slate-400 hover:text-blue-600 p-1 rounded-lg transition-colors"
                      title="Download original file"
                    >
                      <Download className="w-4 h-4" />
                    </a>
                    <button
                      onClick={() => setResumeToDelete(r)}
                      className="text-slate-400 hover:text-red-500 p-1 rounded-lg transition-colors"
                      title="Delete resume"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5 text-xs text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Uploaded: {new Date(r.created_at).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Layers className="w-3.5 h-3.5" />
                    <span>File size: {Math.round(r.file_size / 1024)} KB</span>
                  </div>
                  <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-medium">
                    <FileCheck className="w-3.5 h-3.5" />
                    <span>{r.sections?.length || 6} parsed sections extracted</span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => onNavigate('analysis', { resumeId: r.id })}
                    className="py-2 px-3 rounded-xl bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                    <span>Audit Score</span>
                  </button>

                  <button
                    onClick={() => onNavigate('matches', { resumeId: r.id })}
                    className="py-2 px-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Target className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Match JD</span>
                  </button>

                  <a
                    href={api.getResumeFileUrl(r.id, 'inline')}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="py-2 px-3 rounded-xl border border-indigo-200 dark:border-indigo-900 bg-indigo-50/60 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Eye className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                    <span>View CV</span>
                  </a>

                  <button
                    onClick={() => openEditor(r)}
                    className="py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Edit Fields</span>
                  </button>

                  {/* 1-Click Apply Profile Details to Resume (Profile -> Resume) */}
                  <button
                    type="button"
                    onClick={() => handleApplyProfileToResume(r)}
                    disabled={syncingFromProfileResumeId === r.id}
                    className="col-span-2 py-2 px-3 rounded-xl bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 dark:from-emerald-950/50 dark:via-teal-950/40 dark:to-emerald-950/50 hover:from-emerald-100 hover:to-teal-100 dark:hover:from-emerald-900/60 dark:hover:to-teal-900/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 font-semibold text-xs flex items-center justify-center gap-1.5 transition-all shadow-2xs cursor-pointer disabled:opacity-50"
                    title="Apply your verified candidate profile details (skills, experiences, education, contact) into this resume document"
                  >
                    {syncingFromProfileResumeId === r.id ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600 dark:text-emerald-400" />
                        <span>Applying Profile Details...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                        <span>Apply Profile Details to Resume</span>
                      </>
                    )}
                  </button>

                  {/* 1-Click Import CV Data to Profile Button (CV -> Profile) */}
                  <button
                    type="button"
                    onClick={() => handleSyncToProfile(r)}
                    disabled={syncingResumeId === r.id}
                    className="col-span-2 py-2 px-3 rounded-xl bg-gradient-to-r from-purple-50 via-indigo-50 to-purple-50 dark:from-purple-950/50 dark:via-indigo-950/40 dark:to-purple-950/50 hover:from-purple-100 hover:to-indigo-100 dark:hover:from-purple-900/60 dark:hover:to-indigo-900/60 border border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300 font-semibold text-xs flex items-center justify-center gap-1.5 transition-all shadow-2xs cursor-pointer disabled:opacity-50"
                    title="Extract photo, education, experiences, skills & contact directly from this CV into your candidate profile"
                  >
                    {syncingResumeId === r.id ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-purple-600 dark:text-purple-400" />
                        <span>Importing CV to Profile...</span>
                      </>
                    ) : (
                      <>
                        <UserCheck className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                        <span>Review &amp; Import CV to Profile</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Live Sync Confirmation (Profile -> Resume) */}
                {profileSyncFeedback?.resumeId === r.id && (
                  <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-[11px] text-emerald-800 dark:text-emerald-200 flex items-center justify-between animate-in fade-in">
                    <div className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <span>
                        Profile applied! Synced target role ({profileSyncFeedback.summary.target_role || 'General'}), {profileSyncFeedback.summary.skills_count} skills &amp; {profileSyncFeedback.summary.experiences_count} work roles.
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setProfileSyncFeedback(null)}
                      className="text-emerald-600 dark:text-emerald-400 font-bold ml-1 cursor-pointer"
                    >
                      ×
                    </button>
                  </div>
                )}

                {/* Live Sync Confirmation (CV -> Profile) */}
                {syncFeedback?.resumeId === r.id && (
                  <div className="p-2.5 rounded-xl bg-purple-50 dark:bg-purple-950/50 border border-purple-200 dark:border-purple-800 text-[11px] text-purple-800 dark:text-purple-200 flex items-center justify-between animate-in fade-in">
                    <div className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400 shrink-0" />
                      <span>
                        Imported! Added {syncFeedback.summary.education_added} edu, {syncFeedback.summary.experiences_added} roles, {syncFeedback.summary.skills_added} skills
                        {syncFeedback.summary.photo_extracted ? ' & avatar' : ''}!
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSyncFeedback(null)}
                      className="text-purple-600 dark:text-purple-400 font-bold ml-1 cursor-pointer"
                    >
                      ×
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Upload Modal */}
      <AnimatePresence>
        {uploadModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !isUploading && setUploadModalOpen(false)}
            />

            <motion.div
              className="relative w-full max-w-lg rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 md:p-8 shadow-2xl z-10"
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
            >
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950 text-blue-600">
                    <UploadCloud className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-slate-900 dark:text-white">
                      Upload Resume
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      PDF, DOCX, or TXT up to 10MB
                    </p>
                  </div>
                </div>
                {!isUploading && (
                  <button
                    onClick={() => setUploadModalOpen(false)}
                    className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
                  >
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>

              {uploadError && (
                <div className="mt-4 p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300 text-xs">
                  {uploadError}
                </div>
              )}

              <form onSubmit={handleUploadSubmit} className="mt-5 space-y-4">
                {/* Drag Drop Zone */}
                <div
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={handleFileDrop}
                  className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-blue-500 dark:hover:border-blue-500 rounded-2xl p-6 text-center cursor-pointer transition-colors bg-slate-50/50 dark:bg-slate-800/30"
                  onClick={() => document.getElementById('resume-file-input')?.click()}
                >
                  <input
                    id="resume-file-input"
                    type="file"
                    accept=".pdf,.docx,.doc,.txt,.md"
                    className="hidden"
                    onChange={handleFileInputChange}
                  />

                  {uploadFile ? (
                    <div className="space-y-1">
                      <FileCheck className="w-8 h-8 text-emerald-600 mx-auto" />
                      <p className="font-bold text-xs text-slate-900 dark:text-white">
                        {uploadFile.name}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        {Math.round(uploadFile.size / 1024)} KB
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <UploadCloud className="w-8 h-8 text-slate-400 mx-auto" />
                      <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        Drop resume file here or <span className="text-blue-600 dark:text-blue-400 underline">browse</span>
                      </p>
                      <p className="text-[10px] text-slate-400">
                        Supports PDF, Word (DOCX), and Text
                      </p>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Document Label / Title
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Alex Rivera - Senior Full Stack 2026"
                    value={uploadTitle}
                    onChange={(e) => setUploadTitle(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Target Role Label
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Senior Full-Stack Engineer"
                    value={uploadTargetRole}
                    onChange={(e) => setUploadTargetRole(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {isUploading && (
                  <div className="space-y-1 pt-2">
                    <div className="flex justify-between text-xs font-semibold text-slate-600 dark:text-slate-400">
                      <span>Parsing sections & detecting skills...</span>
                      <span>{uploadProgress}%</span>
                    </div>
                    <div className="w-full bg-slate-200 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                      <motion.div
                        className="bg-blue-600 h-full rounded-full"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    disabled={isUploading}
                    onClick={() => setUploadModalOpen(false)}
                    className="px-4 py-2 text-xs font-semibold rounded-xl text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!uploadFile || isUploading}
                    className="px-4 py-2 text-xs font-semibold rounded-xl text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 shadow-xs"
                  >
                    {isUploading ? 'Parsing...' : 'Upload & Parse'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Review & Edit Extracted Fields Modal */}
      <AnimatePresence>
        {activeResumeForEdit && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setActiveResumeForEdit(null)}
            />

            <motion.div
              className={`relative w-full ${editSectionType === 'experience' ? 'max-w-4xl' : 'max-w-3xl'} max-h-[90vh] rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 md:p-8 shadow-2xl z-10 flex flex-col`}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
            >
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <h3 className="font-bold text-base text-slate-900 dark:text-white">
                    {editSectionType === 'experience' ? 'Experience Intelligence & Verification' : 'Review & Correct Extracted Fields'}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Document: {activeResumeForEdit.title} (Original file remains immutable)
                  </p>
                </div>
                <button
                  onClick={() => setActiveResumeForEdit(null)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Section Selector Tabs */}
              <div className="flex flex-wrap gap-2 my-4">
                {['experience', 'summary', 'skills', 'preview'].map((sec) => (
                  <button
                    key={sec}
                    onClick={() => {
                      setEditSectionType(sec);
                      if (sec === 'summary') {
                        const sum = activeResumeForEdit.sections?.find((s) => s.section_type === 'summary');
                        setEditedContent(sum?.structured_data?.text || '');
                      } else if (sec === 'skills') {
                        const sk = activeResumeForEdit.sections?.find((s) => s.section_type === 'skills');
                        const names = (sk?.structured_data?.items || []).map((i: any) => i.name || i).join(', ');
                        setEditedContent(names);
                      }
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold capitalize transition-colors flex items-center gap-1.5 ${
                      editSectionType === sec
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {sec === 'experience' ? (
                      <>
                        <Award className="w-3.5 h-3.5" />
                        <span>Experience Timeline</span>
                      </>
                    ) : sec === 'preview' ? (
                      'Print Preview'
                    ) : (
                      sec
                    )}
                  </button>
                ))}
              </div>

              {/* Content Editor */}
              <div className="flex-1 overflow-y-auto min-h-[250px] p-2">
                {editSectionType === 'experience' ? (
                  <ExperienceIntelligencePanel
                    resumeId={activeResumeForEdit.id}
                    resumeTitle={activeResumeForEdit.title}
                    onExperiencesUpdated={fetchResumes}
                  />
                ) : editSectionType === 'preview' ? (
                  <div className="p-6 rounded-2xl bg-white text-slate-900 border border-slate-300 shadow-inner resume-paper space-y-4 text-xs font-sans">
                    <div className="flex justify-between items-center pb-2 border-b border-slate-300 no-print">
                      <span className="font-bold text-slate-600 uppercase text-[10px]">
                        Clean Print-Friendly Resume Sheet
                      </span>
                      <button
                        onClick={() => window.print()}
                        className="px-3 py-1 rounded-lg bg-slate-900 text-white text-xs font-semibold flex items-center gap-1.5"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>Print Resume</span>
                      </button>
                    </div>

                    <pre className="whitespace-pre-wrap font-sans leading-relaxed text-slate-800">
                      {activeResumeForEdit.raw_text}
                    </pre>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                        Edit Extracted {editSectionType.toUpperCase()}
                      </label>
                      <button
                        type="button"
                        onClick={handleFillSectionFromProfile}
                        disabled={isFillingFromProfile}
                        className="px-2.5 py-1 text-[11px] font-bold rounded-lg border border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 hover:bg-purple-100 flex items-center gap-1 cursor-pointer transition-colors disabled:opacity-50"
                        title="Pull in verified data directly from your candidate profile"
                      >
                        {isFillingFromProfile ? (
                          <RefreshCw className="w-3 h-3 animate-spin" />
                        ) : (
                          <Sparkles className="w-3 h-3 text-purple-500" />
                        )}
                        <span>Fill from Profile</span>
                      </button>
                    </div>
                    <textarea
                      rows={10}
                      value={editedContent}
                      onChange={(e) => setEditedContent(e.target.value)}
                      className="w-full p-3.5 text-xs font-mono rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 leading-relaxed"
                    />
                  </div>
                )}
              </div>

              {editSectionType !== 'preview' && (
                <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
                  {saveSuccess ? (
                    <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
                      <Check className="w-4 h-4" /> Changes verified & saved to profile!
                    </span>
                  ) : <span />}

                  <div className="flex gap-2">
                    <button
                      onClick={() => setActiveResumeForEdit(null)}
                      className="px-4 py-2 text-xs font-semibold rounded-xl text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 cursor-pointer"
                    >
                      Close
                    </button>
                    {editSectionType !== 'experience' && (
                      <button
                        onClick={handleSaveSection}
                        disabled={isSavingSection}
                        className="px-4 py-2 text-xs font-semibold rounded-xl text-white bg-blue-600 hover:bg-blue-700 shadow-xs cursor-pointer"
                      >
                        {isSavingSection ? 'Saving...' : 'Verify & Save Correction'}
                      </button>
                    )}
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Create Resume From Profile Modal */}
      <AnimatePresence>
        {createFromProfileModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !isCreatingFromProfile && setCreateFromProfileModalOpen(false)}
            />

            <motion.div
              className="relative w-full max-w-lg rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 md:p-8 shadow-2xl z-10"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
            >
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-purple-100 dark:bg-purple-950/60 flex items-center justify-center text-purple-600 dark:text-purple-400">
                    <UserPlus className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-slate-900 dark:text-white">
                      Create Resume from Profile
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Generate an ATS-ready resume from your verified profile data
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => !isCreatingFromProfile && setCreateFromProfileModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateFromProfileSubmit} className="mt-5 space-y-4">
                {createFromProfileError && (
                  <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 text-xs">
                    {createFromProfileError}
                  </div>
                )}

                <div className="p-3.5 rounded-2xl bg-purple-50/50 dark:bg-purple-950/30 border border-purple-100 dark:border-purple-900/40 text-xs space-y-2 text-purple-900 dark:text-purple-200">
                  <p className="font-semibold text-purple-800 dark:text-purple-300">
                    This automatically compiles a fresh resume with:
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-[11px] text-purple-700 dark:text-purple-300">
                    <li>Contact details (Email, Phone, Location, Portfolio links)</li>
                    <li>Professional summary from verified profile</li>
                    <li>Categorized technical skills &amp; competencies</li>
                    <li>Chronological work experience with role accomplishments</li>
                    <li>Education history and degree credentials</li>
                  </ul>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Resume Document Title
                  </label>
                  <input
                    type="text"
                    required
                    value={createProfileTitle}
                    onChange={(e) => setCreateProfileTitle(e.target.value)}
                    placeholder="e.g. Full Stack Engineer - Master Resume"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-medium focus:outline-hidden focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Target Role (Optional Override)
                  </label>
                  <input
                    type="text"
                    value={createProfileRole}
                    onChange={(e) => setCreateProfileRole(e.target.value)}
                    placeholder="e.g. Senior Software Engineer"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-medium focus:outline-hidden focus:ring-2 focus:ring-purple-500"
                  />
                  <p className="text-[11px] text-slate-400">
                    Leave blank to automatically use your profile's target role.
                  </p>
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setCreateFromProfileModalOpen(false)}
                    disabled={isCreatingFromProfile}
                    className="px-4 py-2 text-xs font-semibold rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isCreatingFromProfile}
                    className="px-5 py-2.5 text-xs font-bold rounded-xl text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 shadow-md shadow-purple-500/20 flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {isCreatingFromProfile ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Generating Resume...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Generate Resume</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation */}
      <ConfirmModal
        isOpen={!!resumeToDelete}
        title="Delete Resume"
        message={`Are you sure you want to permanently delete "${resumeToDelete?.title}"? This will remove all associated analysis runs and versions from private storage.`}
        confirmLabel="Delete Resume"
        onConfirm={handleDeleteResume}
        onCancel={() => setResumeToDelete(null)}
      />
    </div>
  );
};
