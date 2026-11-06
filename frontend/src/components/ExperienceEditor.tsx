import React, { useRef } from 'react';
import { Plus, Trash2, Briefcase, Award } from 'lucide-react';
import { ProfileExperience } from '../types';
import { yearsCount, totalYears, INDUSTRIES, currentYear } from '../utils/years';

interface ExperienceEditorProps {
  items: ProfileExperience[];
  onChange: (items: ProfileExperience[]) => void;
  onSaveItem?: (item: ProfileExperience) => void;
  onDeleteItem?: (id: string) => void;
  onAddItem?: () => void;
}

const THIS_YEAR = currentYear();
const YEARS = Array.from({ length: THIS_YEAR - 1974 }, (_, i) => THIS_YEAR - i);

export const ExperienceEditor: React.FC<ExperienceEditorProps> = ({
  items,
  onChange,
  onSaveItem,
  onDeleteItem,
  onAddItem
}) => {
  const timers = useRef<Record<string, number>>({});

  const scheduleSave = (updatedItem: ProfileExperience) => {
    if (!onSaveItem) return;
    if (timers.current[updatedItem.id]) {
      window.clearTimeout(timers.current[updatedItem.id]);
    }
    timers.current[updatedItem.id] = window.setTimeout(() => {
      onSaveItem(updatedItem);
    }, 600);
  };

  const patch = (id: string, change: Partial<ProfileExperience>) => {
    const updated = items.map((e) => {
      if (e.id !== id) return e;
      const n: ProfileExperience = { ...e, ...change };
      if (n.is_current) {
        n.end_year = null;
        n.end_month = null;
      } else if (n.end_year === null || n.end_year === undefined) {
        n.end_year = n.start_year;
      }
      if (n.end_year !== null && n.end_year !== undefined && n.end_year < n.start_year) {
        n.end_year = n.start_year;
      }
      n.years_count = yearsCount({
        startYear: n.start_year,
        endYear: n.end_year,
        isCurrent: n.is_current
      });
      scheduleSave(n);
      return n;
    });
    onChange(updated);
  };

  const handleAddJob = () => {
    if (onAddItem) {
      onAddItem();
    } else {
      const newJob: ProfileExperience = {
        id: `temp_${Date.now()}`,
        job_title: '',
        company: '',
        industry: 'Software & SaaS',
        start_year: THIS_YEAR,
        end_year: THIS_YEAR,
        is_current: false,
        description: '',
        highlights: [],
        source: 'manual',
        years_count: 0,
        created_at: new Date().toISOString()
      };
      onChange([newJob, ...items]);
    }
  };

  const handleRemove = (id: string) => {
    if (onDeleteItem) {
      onDeleteItem(id);
    } else {
      onChange(items.filter((x) => x.id !== id));
    }
  };

  const totalExperienceYears = totalYears(
    items.map((e) => ({
      startYear: e.start_year,
      endYear: e.end_year,
      isCurrent: e.is_current
    }))
  );

  return (
    <section className="space-y-4 pt-2">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <Briefcase className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">
              Work Experience History
            </h3>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Auto-filled from imported CVs and manually editable. Years calculate automatically.
          </p>
        </div>

        <button
          type="button"
          onClick={handleAddJob}
          className="px-3 py-1.5 rounded-xl border border-blue-200 dark:border-blue-900 bg-blue-50/70 dark:bg-blue-950/40 hover:bg-blue-100 text-blue-700 dark:text-blue-300 font-semibold text-xs flex items-center gap-1.5 transition-colors self-start sm:self-auto cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Another Job</span>
        </button>
      </div>

      {items.length === 0 ? (
        <div className="text-center p-8 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/40 space-y-2">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            No work experience roles logged yet. Import a CV to auto-fill or add your roles manually.
          </p>
          <button
            type="button"
            onClick={handleAddJob}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-xs"
          >
            + Add First Role
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((e) => {
            const calculatedYears = yearsCount({
              startYear: e.start_year,
              endYear: e.end_year,
              isCurrent: e.is_current
            });

            return (
              <article
                key={e.id}
                className="p-5 rounded-2xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/70 shadow-xs space-y-3.5 relative"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                        e.source === 'cv'
                          ? 'bg-purple-100 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300'
                          : 'bg-slate-200/80 dark:bg-slate-700/80 text-slate-700 dark:text-slate-200'
                      }`}
                    >
                      {e.source === 'cv' ? 'From CV' : 'Manual Entry'}
                    </span>
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                      Role ID: {e.id.substring(0, 8)}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleRemove(e.id)}
                    className="text-slate-400 hover:text-red-500 dark:hover:text-red-400 p-1 rounded-lg transition-colors cursor-pointer"
                    title="Remove job"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  {/* Job Title */}
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Job Title
                    </label>
                    <input
                      type="text"
                      value={e.job_title}
                      onChange={(ev) => patch(e.id, { job_title: ev.target.value })}
                      placeholder="e.g. Senior Software Engineer"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                    />
                  </div>

                  {/* Company */}
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Company / Organization
                    </label>
                    <input
                      type="text"
                      value={e.company}
                      onChange={(ev) => patch(e.id, { company: ev.target.value })}
                      placeholder="e.g. Acme Corp"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                    />
                  </div>

                  {/* Industry */}
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Industry Domain
                    </label>
                    <select
                      value={e.industry || 'Other'}
                      onChange={(ev) => patch(e.id, { industry: ev.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                    >
                      {INDUSTRIES.map((ind) => (
                        <option key={ind} value={ind}>
                          {ind}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Start Year */}
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Start Year
                    </label>
                    <select
                      value={e.start_year}
                      onChange={(ev) => patch(e.id, { start_year: Number(ev.target.value) })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono"
                    >
                      {YEARS.map((y) => (
                        <option key={y} value={y}>
                          {y}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* End Year */}
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      End Year
                    </label>
                    <select
                      disabled={e.is_current}
                      value={e.end_year ?? e.start_year}
                      onChange={(ev) => patch(e.id, { end_year: Number(ev.target.value) })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono disabled:opacity-40"
                    >
                      {YEARS.filter((y) => y >= e.start_year).map((y) => (
                        <option key={y} value={y}>
                          {y}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Current Job & Auto Year Count Output */}
                  <div className="flex items-center justify-between pt-4">
                    <label className="flex items-center gap-2 cursor-pointer select-none text-xs font-medium text-slate-800 dark:text-slate-200">
                      <input
                        type="checkbox"
                        checked={e.is_current}
                        onChange={(ev) => patch(e.id, { is_current: ev.target.checked })}
                        className="w-4 h-4 text-blue-600 rounded-sm cursor-pointer accent-blue-600"
                      />
                      <span>I currently work here</span>
                    </label>

                    <div className="text-right">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">
                        Duration
                      </span>
                      <span className="font-extrabold text-blue-600 dark:text-blue-400 text-sm">
                        {calculatedYears} {calculatedYears === 1 ? 'year' : 'years'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Job Description / Context
                  </label>
                  <textarea
                    rows={2}
                    value={e.description || ''}
                    onChange={(ev) => patch(e.id, { description: ev.target.value })}
                    placeholder="Brief 1-2 sentence overview of scope, team, or responsibilities..."
                    className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs leading-relaxed"
                  />
                </div>

                {/* Highlights */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Key Responsibilities & Achievements (one per line)
                  </label>
                  <textarea
                    rows={3}
                    value={(e.highlights || []).join('\n')}
                    onChange={(ev) =>
                      patch(e.id, {
                        highlights: ev.target.value.split('\n')
                      })
                    }
                    placeholder="Designed and launched cloud REST APIs&#10;Mentored junior engineers and led code reviews"
                    className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs leading-relaxed font-mono"
                  />
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Total Experience Summary */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/40 dark:to-indigo-950/40 border border-blue-200 dark:border-blue-900/60 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Award className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          <div>
            <div className="text-xs font-bold text-slate-900 dark:text-white">
              Total Professional Experience
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Computed automatically from role intervals. Overlapping periods are merged and counted once.
            </p>
          </div>
        </div>

        <div className="text-right shrink-0">
          <span className="text-lg sm:text-xl font-extrabold text-blue-600 dark:text-blue-400">
            {totalExperienceYears}
          </span>
          <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 ml-1">
            {totalExperienceYears === 1 ? 'Year' : 'Years'}
          </span>
        </div>
      </div>
    </section>
  );
};
