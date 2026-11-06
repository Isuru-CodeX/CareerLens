import React from 'react';
import { GraduationCap, Plus, Trash2, BookOpen, Award, School } from 'lucide-react';
import { EducationItem, EducationPreset } from '../types';
import { currentYear } from '../utils/years';

interface EducationEditorProps {
  items: EducationItem[];
  onChange: (items: EducationItem[]) => void;
}

const THIS_YEAR = currentYear();
const YEARS = Array.from({ length: THIS_YEAR - 1970 + 5 }, (_, i) => THIS_YEAR + 4 - i);

const PRESET_CONFIG: Record<EducationPreset, { label: string; icon: React.FC<{ className?: string }>; badgeColor: string }> = {
  university: {
    label: 'University Degree',
    icon: GraduationCap,
    badgeColor: 'bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-900'
  },
  diploma: {
    label: 'Diploma / Associate',
    icon: BookOpen,
    badgeColor: 'bg-purple-100 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-900'
  },
  course: {
    label: 'Course / Certification',
    icon: Award,
    badgeColor: 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900'
  },
  school: {
    label: 'School / High School',
    icon: School,
    badgeColor: 'bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-900'
  }
};

export const EducationEditor: React.FC<EducationEditorProps> = ({ items, onChange }) => {
  const handleAddItem = (preset: EducationPreset = 'university') => {
    const newItem: EducationItem = {
      id: `edu_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      presetType: preset,
      institution: '',
      degree: '',
      fieldOfStudy: '',
      startYear: THIS_YEAR - 4,
      endYear: THIS_YEAR,
      grade: '',
      highlights: ''
    };
    onChange([...items, newItem]);
  };

  const handleRemove = (index: number) => {
    const updated = items.filter((_, i) => i !== index);
    onChange(updated);
  };

  const patch = (index: number, change: Partial<EducationItem>) => {
    const updated = items.map((item, i) => {
      if (i !== index) return item;
      return { ...item, ...change };
    });
    onChange(updated);
  };

  return (
    <section className="space-y-4 pt-2">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <GraduationCap className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">
              Education & Academic Credentials
            </h3>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Auto-filled from imported CVs. Select presets to structure university degrees, diplomas, or certifications.
          </p>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            type="button"
            onClick={() => handleAddItem('university')}
            className="px-3 py-1.5 rounded-xl border border-blue-200 dark:border-blue-900 bg-blue-50/70 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ University</span>
          </button>
          <button
            type="button"
            onClick={() => handleAddItem('diploma')}
            className="px-2.5 py-1.5 rounded-xl border border-purple-200 dark:border-purple-900 bg-purple-50/70 dark:bg-purple-950/40 hover:bg-purple-100 dark:hover:bg-purple-900/60 text-purple-700 dark:text-purple-300 font-semibold text-xs transition-colors cursor-pointer"
          >
            + Diploma
          </button>
          <button
            type="button"
            onClick={() => handleAddItem('course')}
            className="px-2.5 py-1.5 rounded-xl border border-emerald-200 dark:border-emerald-900 bg-emerald-50/70 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 font-semibold text-xs transition-colors cursor-pointer"
          >
            + Course / Cert
          </button>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="text-center p-8 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/40 space-y-2">
          <GraduationCap className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600" />
          <p className="text-xs text-slate-500 dark:text-slate-400">
            No education entries yet. Import your CV to auto-fill or add your academic history manually.
          </p>
          <button
            type="button"
            onClick={() => handleAddItem('university')}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-xs cursor-pointer"
          >
            + Add First Education Record
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((item, index) => {
            const presetCfg = PRESET_CONFIG[item.presetType] || PRESET_CONFIG.university;
            const Icon = presetCfg.icon;

            return (
              <article
                key={item.id || `edu_${index}`}
                className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3.5 relative"
              >
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <span className={`px-2.5 py-0.5 rounded-md text-[11px] font-bold border flex items-center gap-1.5 ${presetCfg.badgeColor}`}>
                      <Icon className="w-3.5 h-3.5" />
                      <span>{presetCfg.label}</span>
                    </span>

                    {/* Preset Switcher Dropdown */}
                    <select
                      value={item.presetType}
                      onChange={(e) => patch(index, { presetType: e.target.value as EducationPreset })}
                      className="text-[11px] font-medium rounded-lg px-2 py-0.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 cursor-pointer"
                    >
                      <option value="university">University Degree</option>
                      <option value="diploma">Diploma / Associate</option>
                      <option value="course">Course / Certification</option>
                      <option value="school">School / High School</option>
                    </select>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleRemove(index)}
                    className="text-slate-400 hover:text-red-500 dark:hover:text-red-400 p-1.5 rounded-lg transition-colors cursor-pointer"
                    title="Remove education"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Form Fields based on Preset */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
                  {/* Degree / Qualification */}
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      {item.presetType === 'course' ? 'Certification / Course Name' : 'Degree / Qualification'}
                    </label>
                    <input
                      type="text"
                      value={item.degree}
                      onChange={(e) => patch(index, { degree: e.target.value })}
                      placeholder={
                        item.presetType === 'course'
                          ? 'e.g. AWS Solutions Architect, Full-Stack Bootcamp'
                          : item.presetType === 'diploma'
                          ? 'e.g. Higher National Diploma in Computing'
                          : 'e.g. Bachelor of Science, Master of Business'
                      }
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
                    />
                  </div>

                  {/* Institution */}
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      {item.presetType === 'course' ? 'Issuing Organization / Platform' : 'Institution / University'}
                    </label>
                    <input
                      type="text"
                      value={item.institution}
                      onChange={(e) => patch(index, { institution: e.target.value })}
                      placeholder={
                        item.presetType === 'course'
                          ? 'e.g. Coursera, AWS, Udacity'
                          : 'e.g. Stanford University, Georgia State'
                      }
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
                    />
                  </div>

                  {/* Major / Field */}
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      {item.presetType === 'course' ? 'Credential ID / URL' : 'Field of Study / Major'}
                    </label>
                    <input
                      type="text"
                      value={item.fieldOfStudy || ''}
                      onChange={(e) => patch(index, { fieldOfStudy: e.target.value })}
                      placeholder={
                        item.presetType === 'course'
                          ? 'e.g. ID: 89412-ABC or verify link'
                          : 'e.g. Computer Science, Telecommunications'
                      }
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  {/* Start Year */}
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Start Year
                    </label>
                    <select
                      value={item.startYear ?? ''}
                      onChange={(e) => patch(index, { startYear: e.target.value ? Number(e.target.value) : null })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white font-mono cursor-pointer"
                    >
                      <option value="">(Select Year)</option>
                      {YEARS.map((y) => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>
                  </div>

                  {/* End Year */}
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      End / Completion Year
                    </label>
                    <select
                      value={item.endYear ?? ''}
                      onChange={(e) => patch(index, { endYear: e.target.value ? Number(e.target.value) : null })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white font-mono cursor-pointer"
                    >
                      <option value="">(Select Year)</option>
                      {YEARS.map((y) => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>
                  </div>

                  {/* Grade / GPA */}
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Grade / GPA / Honours
                    </label>
                    <input
                      type="text"
                      value={item.grade || ''}
                      onChange={(e) => patch(index, { grade: e.target.value })}
                      placeholder="e.g. 3.8 / 4.0, First Class, Pass"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
                    />
                  </div>
                </div>

                {/* Highlights / Activities / Honors */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Key Highlights, Relevant Coursework, or Honors
                  </label>
                  <textarea
                    rows={2}
                    value={item.highlights || ''}
                    onChange={(e) => patch(index, { highlights: e.target.value })}
                    placeholder="e.g. Dean's List (2022-2024), Capstone project on distributed systems, President of Computing Society"
                    className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white text-xs leading-relaxed"
                  />
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
};

