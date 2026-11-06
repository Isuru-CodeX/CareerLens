import React, { useState } from 'react';
import { X, Plus, Trash2, Layers, Edit2 } from 'lucide-react';
import { Preset, Resume } from '../types';
import { api } from '../services/api';

interface ManagePresetsModalProps {
  presets: Preset[];
  resumes: Resume[];
  onClose: () => void;
  onPresetsChanged: () => void;
}

export const ManagePresetsModal: React.FC<ManagePresetsModalProps> = ({
  presets,
  resumes,
  onClose,
  onPresetsChanged
}) => {
  const [editingPreset, setEditingPreset] = useState<Preset | null>(null);
  const [name, setName] = useState('');
  const [targetRole, setTargetRole] = useState('');
  const [includeManual, setIncludeManual] = useState(true);
  const [selectedResumeIds, setSelectedResumeIds] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startCreate = () => {
    setEditingPreset(null);
    setName('');
    setTargetRole('');
    setIncludeManual(true);
    setSelectedResumeIds(resumes.map((r) => r.id));
    setError(null);
  };

  const startEdit = (p: Preset) => {
    setEditingPreset(p);
    setName(p.name);
    setTargetRole(p.target_role || '');
    setIncludeManual(p.include_manual);
    setSelectedResumeIds(p.resume_ids || []);
    setError(null);
  };

  const toggleResume = (id: string) => {
    if (selectedResumeIds.includes(id)) {
      setSelectedResumeIds(selectedResumeIds.filter((x) => x !== id));
    } else {
      setSelectedResumeIds([...selectedResumeIds, id]);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please provide a preset name.');
      return;
    }

    setIsSaving(true);
    setError(null);
    try {
      if (editingPreset) {
        await api.updatePreset(editingPreset.id, {
          name: name.trim(),
          target_role: targetRole.trim() || null,
          include_manual: includeManual,
          resume_ids: selectedResumeIds
        });
      } else {
        await api.createPreset({
          name: name.trim(),
          target_role: targetRole.trim() || null,
          include_manual: includeManual,
          resume_ids: selectedResumeIds
        });
      }
      onPresetsChanged();
      startCreate();
    } catch (err: any) {
      setError(err.message || 'Failed to save preset.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this preset?')) return;
    try {
      await api.deletePreset(id);
      onPresetsChanged();
      if (editingPreset?.id === id) startCreate();
    } catch (err: any) {
      setError(err.message || 'Failed to delete preset.');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-3xl p-6 sm:p-7 max-w-2xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                Candidate Detail Presets
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Isolate role-specific CVs (e.g. Backend vs Data) for targeting in Job Matcher and Cover Letters.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Existing Presets List */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Your Presets ({presets.length})
            </span>
            <button
              type="button"
              onClick={startCreate}
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Preset</span>
            </button>
          </div>

          {presets.length === 0 ? (
            <p className="text-xs text-slate-400 italic bg-slate-50 dark:bg-slate-800/30 p-3 rounded-xl">
              No custom presets saved. Default is &quot;All my CVs combined&quot;.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {presets.map((p) => (
                <div
                  key={p.id}
                  className={`p-3 rounded-2xl border transition-all flex items-center justify-between ${
                    editingPreset?.id === p.id
                      ? 'border-purple-500 bg-purple-50/50 dark:bg-purple-950/30'
                      : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50'
                  }`}
                >
                  <div>
                    <h4 className="font-bold text-xs text-slate-900 dark:text-white">
                      {p.name}
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      {p.resume_count} CVs linked {p.target_role ? `• ${p.target_role}` : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => startEdit(p)}
                      className="p-1 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer"
                      title="Edit preset"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(p.id)}
                      className="p-1 text-slate-400 hover:text-red-500 cursor-pointer"
                      title="Delete preset"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Create / Edit Form */}
        <form onSubmit={handleSave} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/80 space-y-3.5 text-xs">
          <h3 className="font-bold text-xs text-slate-900 dark:text-white">
            {editingPreset ? `Edit Preset: ${editingPreset.name}` : 'Create New Preset'}
          </h3>

          {error && <p className="text-xs text-red-500 font-medium">{error}</p>}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Preset Name
              </label>
              <input
                type="text"
                placeholder="e.g. Backend Engineering"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Target Role Alignment (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Senior Backend Lead"
                value={targetRole}
                onChange={(e) => setTargetRole(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs"
              />
            </div>
          </div>

          <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700 dark:text-slate-300">
            <input
              type="checkbox"
              checked={includeManual}
              onChange={(e) => setIncludeManual(e.target.checked)}
              className="w-4 h-4 text-purple-600 rounded-sm cursor-pointer"
            />
            <span>Include skills and jobs added by hand in profile</span>
          </label>

          {/* CV Checklist */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Select which CVs belong to this preset:
            </label>
            {resumes.length === 0 ? (
              <p className="text-[11px] text-slate-400 italic">
                No CVs uploaded yet. Please upload CVs first.
              </p>
            ) : (
              <div className="space-y-1.5 max-h-40 overflow-y-auto">
                {resumes.map((r) => (
                  <label
                    key={r.id}
                    className="flex items-center gap-2 p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedResumeIds.includes(r.id)}
                      onChange={() => toggleResume(r.id)}
                      className="w-3.5 h-3.5 text-purple-600 rounded-sm cursor-pointer"
                    />
                    <div className="flex-1 min-w-0">
                      <span className="font-semibold text-xs text-slate-900 dark:text-white truncate block">
                        {r.title}
                      </span>
                      <span className="text-[10px] text-slate-500">
                        {r.role_category || r.target_role || 'General'}
                      </span>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={startCreate}
              className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-xs cursor-pointer"
            >
              Reset
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs shadow-md transition-all cursor-pointer"
            >
              {isSaving ? 'Saving...' : editingPreset ? 'Update Preset' : 'Create Preset'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
