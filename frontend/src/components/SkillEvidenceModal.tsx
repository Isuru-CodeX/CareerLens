import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  ShieldCheck,
  FileText,
  AlertCircle,
  Plus,
  Trash2,
  ExternalLink,
  Award,
  GitBranch
} from 'lucide-react';
import { api } from '../services/api';
import { ProfileSkill, UserSkillEvidence } from '../types';

interface SkillEvidenceModalProps {
  skill: ProfileSkill;
  onClose: (refreshed: boolean) => void;
}

export const SkillEvidenceModal: React.FC<SkillEvidenceModalProps> = ({ skill, onClose }) => {
  const [loading, setLoading] = useState(true);
  const [evidences, setEvidences] = useState<UserSkillEvidence[]>([]);
  const [error, setError] = useState<string | null>(null);

  // New evidence form
  const [showAddForm, setShowAddForm] = useState(false);
  const [sourceType, setSourceType] = useState('project');
  const [sourceRef, setSourceRef] = useState('');
  const [evidenceText, setEvidenceText] = useState('');
  const [proficiency, setProficiency] = useState('Intermediate');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let active = true;
    api.getSkillEvidence(skill.id)
      .then((data) => {
        if (!active) return;
        setEvidences(data);
        setError(null);
      })
      .catch((err: any) => {
        if (!active) return;
        setError(err?.message || 'Failed to load skill evidence.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [skill.id]);

  const refreshEvidence = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getSkillEvidence(skill.id);
      setEvidences(data);
    } catch (err: any) {
      setError(err?.message || 'Failed to load skill evidence.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddEvidence = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!evidenceText.trim() || submitting) return;

    try {
      setSubmitting(true);
      setError(null);
      await api.addSkillEvidence(skill.id, {
        source_type: sourceType,
        source_reference: sourceRef.trim() || undefined,
        evidence_text: evidenceText.trim(),
        proficiency_estimate: proficiency
      });
      setShowAddForm(false);
      setEvidenceText('');
      setSourceRef('');
      await refreshEvidence();
    } catch (err: any) {
      setError(err?.message || 'Failed to add skill evidence.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDispute = async (evidenceId: string, action: 'dispute' | 'remove') => {
    try {
      setError(null);
      await api.disputeSkillEvidence(evidenceId, {
        action,
        reason: action === 'dispute' ? 'Flagged as inaccurate by user' : undefined
      });
      await refreshEvidence();
    } catch (err: any) {
      setError(err?.message || 'Failed to update evidence item.');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="skill-evidence-title"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-3xl max-w-xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 id="skill-evidence-title" className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                  {skill.name}
                </h2>
                <span
                  className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                    skill.verification_status === 'demonstrated'
                      ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                      : skill.verification_status === 'mentioned'
                      ? 'bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-800'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-300 dark:border-slate-700'
                  }`}
                >
                  {skill.verification_status || 'mentioned'}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Assigned Level: <span className="font-semibold text-slate-700 dark:text-slate-200">{skill.proficiency_estimate || 'Intermediate'}</span> &bull; {Math.round((skill.confidence ?? 0.7) * 100)}% Confidence
              </p>
            </div>
          </div>
          <button
            onClick={() => onClose(true)}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-4 flex-1">
          {error && (
            <div className="p-3.5 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 text-xs text-red-700 dark:text-red-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Explanation Alert */}
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            CareerLens distinguishes <span className="font-bold text-slate-800 dark:text-slate-200">&quot;mentioned&quot;</span> skills (declared on a CV) from <span className="font-bold text-emerald-700 dark:text-emerald-400">&quot;demonstrated&quot;</span> skills (verified through projects, code repositories, or passed technical quizzes).
          </div>

          {/* Evidence List Header & Add Button */}
          <div className="flex items-center justify-between pt-1">
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
              Evidence Sources ({evidences.length})
            </span>
            <button
              type="button"
              onClick={() => setShowAddForm(!showAddForm)}
              className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{showAddForm ? 'Cancel' : 'Add Project Evidence'}</span>
            </button>
          </div>

          {/* Add Evidence Form */}
          <AnimatePresence>
            {showAddForm && (
              <motion.form
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                onSubmit={handleAddEvidence}
                className="p-4 rounded-2xl border border-indigo-200 dark:border-indigo-900/60 bg-indigo-50/40 dark:bg-indigo-950/20 space-y-3 overflow-hidden text-xs"
              >
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">Source Type</label>
                    <select
                      value={sourceType}
                      onChange={(e) => setSourceType(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                    >
                      <option value="project">Hands-on Project</option>
                      <option value="github">GitHub Repository</option>
                      <option value="coding_assessment">Technical Quiz</option>
                      <option value="self_declaration">Self-Declaration</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">Proficiency Level</label>
                    <select
                      value={proficiency}
                      onChange={(e) => setProficiency(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                    >
                      <option value="Beginner">Beginner</option>
                      <option value="Developing">Developing</option>
                      <option value="Intermediate">Intermediate</option>
                      <option value="Advanced">Advanced</option>
                      <option value="Expert">Expert</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">Link / Repository URL (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. https://github.com/my-user/repo-name"
                    value={sourceRef}
                    onChange={(e) => setSourceRef(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">Evidence Description & Specifics</label>
                  <textarea
                    rows={2}
                    placeholder="Describe specific features implemented, architectural design choices, or problem solved with this skill..."
                    value={evidenceText}
                    onChange={(e) => setEvidenceText(e.target.value)}
                    required
                    className="w-full px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="submit"
                    disabled={submitting || !evidenceText.trim()}
                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-xs disabled:opacity-50 transition-colors cursor-pointer"
                  >
                    {submitting ? 'Verifying...' : 'Save Evidence'}
                  </button>
                </div>
              </motion.form>
            )}
          </AnimatePresence>

          {/* Evidence Cards */}
          {loading && (
            <div className="py-8 text-center text-xs text-slate-400">Loading evidence trail...</div>
          )}

          {!loading && evidences.length === 0 && (
            <div className="p-6 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 text-center space-y-1">
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">No verified evidence recorded yet.</p>
              <p className="text-[11px] text-slate-400">Click &quot;Add Project Evidence&quot; or complete an adaptive quiz to elevate this skill.</p>
            </div>
          )}

          {!loading && evidences.map((ev) => (
            <div
              key={ev.id}
              className={`p-3.5 rounded-2xl border transition-all text-xs space-y-2 ${
                ev.is_disputed
                  ? 'bg-slate-100 dark:bg-slate-800/40 border-slate-300 dark:border-slate-700 opacity-60'
                  : ev.verification_status === 'demonstrated'
                  ? 'bg-emerald-50/30 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/60'
                  : 'bg-blue-50/30 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800/60'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  {ev.source_type === 'github' ? (
                    <GitBranch className="w-4 h-4 text-slate-700 dark:text-slate-300" />
                  ) : ev.source_type === 'coding_assessment' ? (
                    <Award className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <FileText className="w-4 h-4 text-indigo-600" />
                  )}
                  <span className="font-semibold text-slate-900 dark:text-white capitalize">
                    {ev.source_type.replace('_', ' ')}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    ({Math.round(ev.confidence * 100)}% Conf)
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  {!ev.is_disputed && (
                    <button
                      type="button"
                      onClick={() => handleDispute(ev.id, 'dispute')}
                      className="px-2 py-0.5 rounded-md text-[10px] text-slate-500 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                      title="Flag evidence as inaccurate"
                    >
                      Dispute
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleDispute(ev.id, 'remove')}
                    className="p-1 rounded-md text-slate-400 hover:text-red-500 transition-colors cursor-pointer"
                    title="Remove this evidence item"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {ev.evidence_text && (
                <p className="text-[11px] text-slate-700 dark:text-slate-300 leading-relaxed pl-1">
                  &ldquo;{ev.evidence_text}&rdquo;
                </p>
              )}

              {ev.source_reference && (
                <div className="text-[10px] text-slate-400 flex items-center gap-1 pl-1">
                  <span>Reference:</span>
                  {ev.source_reference.startsWith('http') ? (
                    <a
                      href={ev.source_reference}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-0.5"
                    >
                      <span>{ev.source_reference}</span>
                      <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  ) : (
                    <span className="text-slate-500">{ev.source_reference}</span>
                  )}
                </div>
              )}

              {ev.is_disputed && (
                <p className="text-[10px] text-amber-700 dark:text-amber-300 italic pl-1">
                  Flagged: {ev.dispute_reason || 'Disputed by candidate'}
                </p>
              )}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80 flex items-center justify-end shrink-0">
          <button
            type="button"
            onClick={() => onClose(true)}
            className="px-5 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-semibold text-xs shadow-xs transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </motion.div>
    </div>
  );
};
