import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Check,
  X,
  AlertTriangle,
  FileText,
  User,
  Briefcase,
  GraduationCap,
  Sparkles,
  CheckCircle2
} from 'lucide-react';
import { api } from '../services/api';
import { CvReviewData } from '../types';

interface CvReviewModalProps {
  resumeId: string;
  onClose: (refreshed: boolean) => void;
}

export const CvReviewModal: React.FC<CvReviewModalProps> = ({ resumeId, onClose }) => {
  const [loading, setLoading] = useState(true);
  const [reviewData, setReviewData] = useState<CvReviewData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // User decisions
  const [fieldDecisions, setFieldDecisions] = useState<Record<string, { action: string; value?: any }>>({});
  const [expDecisions, setExpDecisions] = useState<Record<string, string>>({});
  const [skillDecisions, setSkillDecisions] = useState<Record<string, { action: string; proficiency: string }>>({});
  const [eduDecisions, setEduDecisions] = useState<Record<string, string>>({});

  useEffect(() => {
    let active = true;
    api.getCvReview(resumeId)
      .then((data) => {
        if (!active) return;
        setReviewData(data);

        // Initialize default decisions
        const initFields: Record<string, { action: string; value?: any }> = {};
        data.fields.forEach((f) => {
          initFields[f.key] = {
            action: f.recommendation === 'keep_current' ? 'reject' : 'accept',
            value: f.extracted_value ?? f.current_value
          };
        });
        setFieldDecisions(initFields);

        const initExp: Record<string, string> = {};
        data.experiences.forEach((e) => {
          initExp[e.temp_id] = e.is_duplicate ? 'skip' : 'accept';
        });
        setExpDecisions(initExp);

        const initSkills: Record<string, { action: string; proficiency: string }> = {};
        data.skills.forEach((s) => {
          initSkills[s.name] = {
            action: s.is_duplicate ? 'skip' : 'accept',
            proficiency: s.proficiency || 'Intermediate'
          };
        });
        setSkillDecisions(initSkills);

        const initEdu: Record<string, string> = {};
        data.education.forEach((ed) => {
          initEdu[ed.temp_id] = 'accept';
        });
        setEduDecisions(initEdu);
        setError(null);
      })
      .catch((err: any) => {
        if (!active) return;
        setError(err?.message || 'Failed to load CV extraction review data.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => { active = false; };
  }, [resumeId]);

  const handleConfirmImport = async () => {
    if (!reviewData) return;
    try {
      setSubmitting(true);
      setError(null);

      // Prepare payload
      const experiencesToApply = reviewData.experiences
        .filter((e) => expDecisions[e.temp_id] === 'accept')
        .map((e) => ({
          action: 'accept',
          job_title: e.job_title,
          company: e.company,
          industry: e.industry,
          start_year: e.start_year,
          start_month: e.start_month,
          end_year: e.end_year,
          end_month: e.end_month,
          is_current: e.is_current,
          description: e.description,
          highlights: e.highlights
        }));

      const skillsToApply = reviewData.skills
        .filter((s) => skillDecisions[s.name]?.action === 'accept')
        .map((s) => ({
          action: 'accept',
          name: s.name,
          proficiency: skillDecisions[s.name]?.proficiency || 'Intermediate'
        }));

      const eduToApply = reviewData.education
        .filter((ed) => eduDecisions[ed.temp_id] === 'accept')
        .map((ed) => ({
          action: 'accept',
          institution: ed.institution,
          degree: ed.degree,
          field_of_study: ed.field_of_study,
          start_year: ed.start_year,
          end_year: ed.end_year
        }));

      await api.confirmCvImport(resumeId, {
        fields: fieldDecisions,
        experiences: experiencesToApply,
        skills: skillsToApply,
        education: eduToApply
      });

      onClose(true);
    } catch (err: any) {
      setError(err?.message || 'Failed to apply confirmed changes to profile.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="review-modal-title"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-3xl max-w-4xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[92vh] my-auto"
      >
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 id="review-modal-title" className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                Review Extracted CV Details
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Verify each proposed field before saving. Your existing edits will never be overwritten without your explicit consent.
              </p>
            </div>
          </div>
          <button
            onClick={() => onClose(false)}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1">
          {loading && (
            <div className="py-16 text-center space-y-3">
              <div className="w-8 h-8 rounded-full border-2 border-indigo-600 border-t-transparent animate-spin mx-auto" />
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Comparing extracted CV data against your existing profile...
              </p>
            </div>
          )}

          {error && (
            <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 text-xs text-red-700 dark:text-red-300 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {reviewData && !loading && (
            <>
              {/* Document Banner */}
              <div className="p-3.5 rounded-2xl bg-slate-100/70 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2.5">
                  <FileText className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{reviewData.file_name}</span>
                  <span className="text-slate-400">({reviewData.resume_title})</span>
                </div>
                <span className="text-[11px] text-slate-500">
                  {reviewData.skills.length} skills &bull; {reviewData.experiences.length} roles found
                </span>
              </div>

              {/* 1. Contact & Identity Fields */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                  <User className="w-4 h-4 text-indigo-600" />
                  <span>Profile Information & Links</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {reviewData.fields.map((f) => {
                    const currentDecision = fieldDecisions[f.key]?.action || 'accept';
                    const currentValue = fieldDecisions[f.key]?.value ?? f.extracted_value;

                    return (
                      <div
                        key={f.key}
                        className={`p-3.5 rounded-2xl border transition-all text-xs space-y-2.5 ${
                          currentDecision === 'accept'
                            ? 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/60'
                            : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-slate-900 dark:text-white">{f.label}</span>
                          <div className="flex items-center gap-1.5">
                            {f.is_low_confidence && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 text-[10px]">
                                <AlertTriangle className="w-3 h-3" /> Low Confidence
                              </span>
                            )}
                            <span className="text-[10px] text-slate-400">
                              {Math.round(f.confidence * 100)}% Match
                            </span>
                          </div>
                        </div>

                        {/* Extracted vs Current */}
                        <div className="space-y-1 text-[11px]">
                          {f.extracted_value ? (
                            <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                              <span className="text-slate-400 block text-[10px]">Extracted from CV:</span>
                              <span className="font-medium text-slate-800 dark:text-slate-200">
                                {String(currentValue)}
                              </span>
                            </div>
                          ) : (
                            <span className="text-slate-400 italic">Not found in CV</span>
                          )}

                          {f.current_value && f.is_diff && (
                            <div className="text-[10px] text-slate-500 pl-1">
                              Current in Profile: <span className="text-slate-600 dark:text-slate-300 font-medium">{String(f.current_value)}</span>
                            </div>
                          )}
                        </div>

                        {/* Decision Buttons */}
                        {f.extracted_value && (
                          <div className="flex items-center gap-2 pt-1">
                            <button
                              type="button"
                              onClick={() =>
                                setFieldDecisions((prev) => ({
                                  ...prev,
                                  [f.key]: { action: 'accept', value: f.extracted_value }
                                }))
                              }
                              className={`flex-1 py-1 px-2.5 rounded-xl font-medium text-[11px] transition-all flex items-center justify-center gap-1 cursor-pointer ${
                                currentDecision === 'accept'
                                  ? 'bg-emerald-600 text-white shadow-xs'
                                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                              }`}
                            >
                              <Check className="w-3 h-3" /> Accept
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                setFieldDecisions((prev) => ({
                                  ...prev,
                                  [f.key]: { action: 'reject', value: f.current_value }
                                }))
                              }
                              className={`py-1 px-2.5 rounded-xl font-medium text-[11px] transition-all flex items-center justify-center gap-1 cursor-pointer ${
                                currentDecision === 'reject'
                                  ? 'bg-slate-700 text-white'
                                  : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200'
                              }`}
                            >
                              <X className="w-3 h-3" /> Keep Existing
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 2. Experiences Section */}
              {reviewData.experiences.length > 0 && (
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                      <Briefcase className="w-4 h-4 text-blue-600" />
                      <span>Work Experiences ({reviewData.experiences.length})</span>
                    </div>
                  </div>

                  <div className="space-y-2.5">
                    {reviewData.experiences.map((exp) => {
                      const isAccepted = expDecisions[exp.temp_id] === 'accept';
                      return (
                        <div
                          key={exp.temp_id}
                          className={`p-3.5 rounded-2xl border transition-all text-xs space-y-2 ${
                            isAccepted
                              ? 'bg-blue-50/30 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800/60'
                              : 'bg-slate-50 dark:bg-slate-800/30 border-slate-200 dark:border-slate-800 opacity-60'
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <div>
                              <h4 className="font-bold text-slate-900 dark:text-white">
                                {exp.job_title} &bull; <span className="font-normal text-slate-600 dark:text-slate-300">{exp.company}</span>
                              </h4>
                              <p className="text-[11px] text-slate-500">
                                {exp.start_year} &ndash; {exp.is_current ? 'Present' : exp.end_year || 'N/A'} ({exp.industry})
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() =>
                                setExpDecisions((prev) => ({
                                  ...prev,
                                  [exp.temp_id]: isAccepted ? 'skip' : 'accept'
                                }))
                              }
                              className={`px-2.5 py-1 rounded-xl text-[11px] font-semibold flex items-center gap-1 transition-all cursor-pointer ${
                                isAccepted
                                  ? 'bg-blue-600 text-white'
                                  : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                              }`}
                            >
                              {isAccepted ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                              {isAccepted ? 'Importing' : 'Skip'}
                            </button>
                          </div>
                          {exp.description && (
                            <p className="text-[11px] text-slate-600 dark:text-slate-400 line-clamp-2">
                              {exp.description}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 3. Skills Section */}
              {reviewData.skills.length > 0 && (
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                      <Sparkles className="w-4 h-4 text-purple-600" />
                      <span>Extracted Skills ({reviewData.skills.length})</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {reviewData.skills.map((sk) => {
                      const dec = skillDecisions[sk.name]?.action || 'accept';
                      const isAccepted = dec === 'accept';
                      return (
                        <div
                          key={sk.name}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs transition-all ${
                            isAccepted
                              ? 'bg-purple-50 dark:bg-purple-950/40 border-purple-200 dark:border-purple-800 text-purple-900 dark:text-purple-200'
                              : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400 line-through'
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() =>
                              setSkillDecisions((prev) => ({
                                ...prev,
                                [sk.name]: {
                                  action: isAccepted ? 'skip' : 'accept',
                                  proficiency: prev[sk.name]?.proficiency || 'Intermediate'
                                }
                              }))
                            }
                            className="cursor-pointer"
                          >
                            {isAccepted ? <Check className="w-3 h-3 text-purple-600" /> : <X className="w-3 h-3" />}
                          </button>
                          <span className="font-semibold">{sk.name}</span>
                          {isAccepted && (
                            <select
                              value={skillDecisions[sk.name]?.proficiency || 'Intermediate'}
                              onChange={(e) =>
                                setSkillDecisions((prev) => ({
                                  ...prev,
                                  [sk.name]: { action: 'accept', proficiency: e.target.value }
                                }))
                              }
                              className="bg-transparent border-0 text-[10px] text-purple-700 dark:text-purple-300 font-medium focus:ring-0 cursor-pointer pl-1"
                            >
                              <option value="Beginner">Beginner</option>
                              <option value="Developing">Developing</option>
                              <option value="Intermediate">Intermediate</option>
                              <option value="Advanced">Advanced</option>
                              <option value="Expert">Expert</option>
                            </select>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 4. Education Section */}
              {reviewData.education.length > 0 && (
                <div className="space-y-3 pt-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                    <GraduationCap className="w-4 h-4 text-emerald-600" />
                    <span>Education ({reviewData.education.length})</span>
                  </div>

                  <div className="space-y-2">
                    {reviewData.education.map((ed) => {
                      const isAccepted = eduDecisions[ed.temp_id] === 'accept';
                      return (
                        <div
                          key={ed.temp_id}
                          className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs"
                        >
                          <div>
                            <span className="font-bold text-slate-900 dark:text-white">{ed.degree}</span>
                            <span className="text-slate-500 block text-[11px]">{ed.institution} ({ed.start_year || 'N/A'} - {ed.end_year || 'N/A'})</span>
                          </div>
                          <button
                            type="button"
                            onClick={() =>
                              setEduDecisions((prev) => ({
                                ...prev,
                                [ed.temp_id]: isAccepted ? 'skip' : 'accept'
                              }))
                            }
                            className={`px-2 py-1 rounded-xl text-[11px] font-medium transition-colors cursor-pointer ${
                              isAccepted ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-600'
                            }`}
                          >
                            {isAccepted ? 'Import' : 'Skip'}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={() => onClose(false)}
            className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-xs transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirmImport}
            disabled={submitting || loading || !reviewData}
            className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold text-xs shadow-md transition-all flex items-center gap-2 cursor-pointer"
          >
            {submitting ? (
              <>
                <div className="w-3.5 h-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                <span>Applying Changes...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>Confirm & Save to Profile</span>
              </>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
};
