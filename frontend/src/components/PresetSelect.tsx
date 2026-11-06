import React, { useState } from 'react';
import { Layers, Settings } from 'lucide-react';
import { Preset, Resume } from '../types';
import { ManagePresetsModal } from './ManagePresetsModal';

interface PresetSelectProps {
  value: string;
  onChange: (presetId: string) => void;
  presets: Preset[];
  resumes: Resume[];
  onPresetsChanged: () => void;
  label?: string;
}

export const PresetSelect: React.FC<PresetSelectProps> = ({
  value,
  onChange,
  presets,
  resumes,
  onPresetsChanged,
  label = 'Candidate Details'
}) => {
  const [modalOpen, setModalOpen] = useState(false);

  // Normalize value so it matches whether the caller passes raw IDs or prefixed strings
  const normalizedValue = React.useMemo(() => {
    if (!value || value === 'all' || value.startsWith('resume:') || value.startsWith('preset:')) {
      return value || 'all';
    }
    if (resumes.some((r) => r.id === value)) {
      return `resume:${value}`;
    }
    if (presets.some((p) => p.id === value)) {
      return `preset:${value}`;
    }
    return value;
  }, [value, resumes, presets]);

  return (
    <>
      <div className="w-full">
        <div className="flex items-center justify-between mb-1 min-h-[18px]">
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 truncate">
            <Layers className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400 shrink-0" />
            <span className="truncate">{label}</span>
          </label>
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="text-[11px] font-medium text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 flex items-center gap-1 transition-colors cursor-pointer shrink-0 ml-1.5 hover:underline"
            title="Manage candidate presets"
          >
            <Settings className="w-3 h-3" />
            <span>Presets</span>
          </button>
        </div>

        <div className="relative">
          <select
            value={normalizedValue}
            onChange={(e) => onChange(e.target.value)}
            className="w-full px-3.5 py-2 text-xs font-medium rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-purple-500 transition-all truncate pr-8 cursor-pointer shadow-2xs"
          >
            <option value="all">🌟 All my CVs combined ({resumes.length} CVs)</option>

            {resumes.length > 0 && (
              <optgroup label="Single CV Files">
                {resumes.map((r) => (
                  <option key={r.id} value={`resume:${r.id}`}>
                    📄 {r.title || r.file_name || 'Resume'} {r.target_role ? `(${r.target_role})` : ''}
                  </option>
                ))}
              </optgroup>
            )}

            {presets.length > 0 && (
              <optgroup label="Custom Presets">
                {presets.map((p) => (
                  <option key={p.id} value={`preset:${p.id}`}>
                    🎯 {p.name} ({p.resume_count} CVs)
                  </option>
                ))}
              </optgroup>
            )}
          </select>
        </div>
      </div>

      {modalOpen && (
        <ManagePresetsModal
          presets={presets}
          resumes={resumes}
          onClose={() => setModalOpen(false)}
          onPresetsChanged={() => {
            onPresetsChanged();
          }}
        />
      )}
    </>
  );
};


