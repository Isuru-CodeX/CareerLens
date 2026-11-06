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
}

export const PresetSelect: React.FC<PresetSelectProps> = ({
  value,
  onChange,
  presets,
  resumes,
  onPresetsChanged
}) => {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-purple-600 dark:text-purple-400" />
          <label className="text-xs font-semibold text-slate-800 dark:text-slate-200">
            Use candidate details from:
          </label>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="px-3 py-1.5 text-xs font-medium rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-purple-500"
          >
            <option value="all">All my CVs combined ({resumes.length} CVs)</option>
            {presets.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.resume_count} CVs)
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer"
            title="Manage candidate presets"
          >
            <Settings className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Presets</span>
          </button>
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
