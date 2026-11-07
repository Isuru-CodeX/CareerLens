import React, { useState } from 'react';
import { Plus, X, Cpu } from 'lucide-react';
import { ProfileSkill } from '../types';
import { SkillEvidenceModal } from './SkillEvidenceModal';

interface SkillsEditorProps {
  skills: ProfileSkill[];
  onAddSkills: (names: string[]) => Promise<void>;
  onRemoveSkill: (id: string) => Promise<void>;
  onRefreshSkills?: () => void;
}

export const SkillsEditor: React.FC<SkillsEditorProps> = ({
  skills,
  onAddSkills,
  onRemoveSkill,
  onRefreshSkills
}) => {
  const [draft, setDraft] = useState('');
  const [adding, setAdding] = useState(false);
  const [selectedSkill, setSelectedSkill] = useState<ProfileSkill | null>(null);

  const handleAdd = async () => {
    const rawNames = draft
      .split(/[,;/|•\n]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (!rawNames.length || adding) return;

    setAdding(true);
    try {
      await onAddSkills(rawNames);
      setDraft('');
      if (onRefreshSkills) onRefreshSkills();
    } finally {
      setAdding(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAdd();
    }
  };

  const demonstratedCount = skills.filter((s) => s.verification_status === 'demonstrated').length;
  const mentionedCount = skills.filter((s) => s.verification_status !== 'demonstrated' && s.verification_status !== 'unverified').length;

  return (
    <section className="space-y-3 pt-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Cpu className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <h3 className="font-bold text-sm text-slate-900 dark:text-white">
            Unified Evidence-Based Skill Profile
          </h3>
        </div>
        <div className="flex items-center gap-2 text-[11px] font-medium">
          <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400">
            <span className="w-2 h-2 rounded-full bg-emerald-500" /> {demonstratedCount} Demonstrated
          </span>
          <span className="inline-flex items-center gap-1 text-blue-700 dark:text-blue-400">
            <span className="w-2 h-2 rounded-full bg-blue-500" /> {mentionedCount} Mentioned
          </span>
        </div>
      </div>
      <p className="text-xs text-slate-500 dark:text-slate-400">
        Every skill tracks verifiable evidence from CVs, projects, and assessments. Click any skill chip to inspect evidence provenance or add proof.
      </p>

      {/* Skills Chips */}
      <div className="flex flex-wrap gap-2 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/60 min-h-[50px] items-center">
        {skills.length === 0 ? (
          <span className="text-xs text-slate-400 dark:text-slate-500 italic">
            No verified skills added yet. Type below and press Enter to add.
          </span>
        ) : (
          skills.map((s) => {
            const isDemonstrated = s.verification_status === 'demonstrated';
            const isUnverified = s.verification_status === 'unverified';

            return (
              <span
                key={s.id}
                className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold shadow-2xs transition-all border ${
                  isDemonstrated
                    ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-200 border-emerald-300 dark:border-emerald-800/80'
                    : isUnverified
                    ? 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-700'
                    : 'bg-blue-50 dark:bg-blue-950/50 text-blue-800 dark:text-blue-200 border-blue-200 dark:border-blue-800/80'
                }`}
              >
                <button
                  type="button"
                  onClick={() => setSelectedSkill(s)}
                  className="flex items-center gap-1.5 hover:underline cursor-pointer text-left"
                  title="Click to view multi-source evidence and verification history"
                >
                  <span>{s.name}</span>
                  <span
                    className={`text-[9px] px-1 py-0.2 rounded font-bold uppercase ${
                      isDemonstrated
                        ? 'bg-emerald-200/70 dark:bg-emerald-800 text-emerald-900 dark:text-emerald-100'
                        : isUnverified
                        ? 'bg-slate-200 text-slate-700'
                        : 'bg-blue-200/70 dark:bg-blue-800 text-blue-900 dark:text-blue-100'
                    }`}
                  >
                    {s.proficiency_estimate || 'Intermediate'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemoveSkill(s.id);
                  }}
                  className="hover:text-red-500 dark:hover:text-red-400 rounded-full p-0.5 transition-colors cursor-pointer"
                  aria-label={`Remove ${s.name}`}
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            );
          })
        )}
      </div>

      {/* Add Skills Input */}
      <div className="flex gap-2">
        <input
          type="text"
          placeholder="Add skills (e.g. React, Docker, Kubernetes) - press Enter..."
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={adding}
          className="flex-1 px-3.5 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
        />
        <button
          type="button"
          onClick={handleAdd}
          disabled={adding || !draft.trim()}
          className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-xs disabled:opacity-50 transition-colors flex items-center gap-1.5 shrink-0 cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add</span>
        </button>
      </div>

      {/* Evidence Inspection Modal */}
      {selectedSkill && (
        <SkillEvidenceModal
          skill={selectedSkill}
          onClose={() => {
            setSelectedSkill(null);
            if (onRefreshSkills) onRefreshSkills();
          }}
        />
      )}
    </section>
  );
};


