import React, { useState } from 'react';
import { Plus, X, Cpu } from 'lucide-react';
import { ProfileSkill } from '../types';

interface SkillsEditorProps {
  skills: ProfileSkill[];
  onAddSkills: (names: string[]) => Promise<void>;
  onRemoveSkill: (id: string) => Promise<void>;
}

export const SkillsEditor: React.FC<SkillsEditorProps> = ({
  skills,
  onAddSkills,
  onRemoveSkill
}) => {
  const [draft, setDraft] = useState('');
  const [adding, setAdding] = useState(false);

  const handleAdd = async () => {
    const rawNames = draft
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    if (!rawNames.length || adding) return;

    setAdding(true);
    try {
      await onAddSkills(rawNames);
      setDraft('');
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

  return (
    <section className="space-y-3 pt-2">
      <div className="flex items-center gap-2">
        <Cpu className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
        <h3 className="font-bold text-sm text-slate-900 dark:text-white">
          Verified Technical & Core Skills
        </h3>
      </div>
      <p className="text-xs text-slate-500 dark:text-slate-400">
        Skills explicitly extracted from your CVs and manually managed. Aliases like &quot;js&quot; and &quot;node js&quot; are automatically normalized.
      </p>

      {/* Skills Chips */}
      <div className="flex flex-wrap gap-2 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850/40 min-h-[50px] items-center">
        {skills.length === 0 ? (
          <span className="text-xs text-slate-400 italic">
            No verified skills added yet. Type below or import a CV to populate.
          </span>
        ) : (
          skills.map((s) => (
            <span
              key={s.id}
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold shadow-2xs transition-all ${
                s.source === 'cv'
                  ? 'bg-purple-50 dark:bg-purple-950/70 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-900'
                  : 'bg-blue-50 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900'
              }`}
              title={s.source === 'cv' ? 'Added from your CV' : 'Added manually'}
            >
              <span>{s.name}</span>
              <button
                type="button"
                onClick={() => onRemoveSkill(s.id)}
                className="hover:text-red-500 rounded-full p-0.5 transition-colors cursor-pointer"
                aria-label={`Remove ${s.name}`}
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))
        )}
      </div>

      {/* Add Skills Input */}
      <div className="flex gap-2">
        <input
          type="text"
          placeholder="Add skills (e.g. React, Node.js, PostgreSQL) - press Enter..."
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={adding}
          className="flex-1 px-3.5 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
        />
        <button
          type="button"
          onClick={handleAdd}
          disabled={adding || !draft.trim()}
          className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-xs disabled:opacity-50 transition-colors flex items-center gap-1.5 shrink-0 cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>{adding ? 'Adding...' : 'Add'}</span>
        </button>
      </div>
    </section>
  );
};
