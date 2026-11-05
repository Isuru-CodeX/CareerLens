import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText,
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
  FileCheck
} from 'lucide-react';
import { Resume, ParsedSection } from '../types';
import { api } from '../services/api';
import { ConfirmModal } from '../components/ConfirmModal';
import { DisclaimerBanner } from '../components/DisclaimerBanner';

interface ResumesViewProps {
  onNavigate: (view: string, extra?: any) => void;
  openUploadOnMount?: boolean;
}

export const ResumesView: React.FC<ResumesViewProps> = ({
  onNavigate,
  openUploadOnMount = false
}) => {
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

  const fetchResumes = async () => {
    try {
      setLoading(true);
      const list = await api.getResumes();
      setResumes(list);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResumes();
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
    <div className="space-y-6 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
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

        <button
          onClick={() => setUploadModalOpen(true)}
          className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-md shadow-blue-500/20 transition-all flex items-center justify-center gap-2"
        >
          <Plus className="w-4 h-4" />
          <span>Upload Resume</span>
        </button>
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

                  <button
                    onClick={() => setResumeToDelete(r)}
                    className="text-slate-400 hover:text-red-500 p-1 rounded-lg transition-colors"
                    title="Delete resume"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
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
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 grid grid-cols-2 gap-2">
                <button
                  onClick={() => onNavigate('analysis', { resumeId: r.id })}
                  className="py-2 px-3 rounded-xl bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                  <span>Audit Score</span>
                </button>

                <button
                  onClick={() => onNavigate('matches', { resumeId: r.id })}
                  className="py-2 px-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Target className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Match JD</span>
                </button>

                <button
                  onClick={() => openEditor(r)}
                  className="col-span-2 py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Review & Correct Extracted Fields</span>
                </button>
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
              className="relative w-full max-w-3xl max-h-[90vh] rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 md:p-8 shadow-2xl z-10 flex flex-col"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
            >
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <h3 className="font-bold text-base text-slate-900 dark:text-white">
                    Review & Correct Extracted Fields
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
                {['summary', 'skills', 'experience', 'preview'].map((sec) => (
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
                      } else if (sec === 'experience') {
                        const exp = activeResumeForEdit.sections?.find((s) => s.section_type === 'experience');
                        setEditedContent(JSON.stringify(exp?.structured_data?.items || [], null, 2));
                      }
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold capitalize transition-colors ${
                      editSectionType === sec
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {sec === 'preview' ? 'Theme-Neutral Print Preview' : sec}
                  </button>
                ))}
              </div>

              {/* Content Editor */}
              <div className="flex-1 overflow-y-auto min-h-[250px] p-2">
                {editSectionType === 'preview' ? (
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
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Edit Extracted {editSectionType.toUpperCase()}
                    </label>
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
                      className="px-4 py-2 text-xs font-semibold rounded-xl text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800"
                    >
                      Close
                    </button>
                    <button
                      onClick={handleSaveSection}
                      disabled={isSavingSection}
                      className="px-4 py-2 text-xs font-semibold rounded-xl text-white bg-blue-600 hover:bg-blue-700 shadow-xs"
                    >
                      {isSavingSection ? 'Saving...' : 'Verify & Save Correction'}
                    </button>
                  </div>
                </div>
              )}
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
