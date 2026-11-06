import React from 'react';
import { Plus, Trash2, ExternalLink, Globe } from 'lucide-react';
import { ProfileLink } from '../types';

interface LinksEditorProps {
  links: ProfileLink[];
  onChange: (links: ProfileLink[]) => void;
}

export const LinksEditor: React.FC<LinksEditorProps> = ({ links, onChange }) => {
  const updateLink = (index: number, key: 'label' | 'url', val: string) => {
    const next = [...links];
    next[index] = { ...next[index], [key]: val };
    onChange(next);
  };

  const addRow = () => {
    onChange([...links, { label: '', url: '' }]);
  };

  const removeRow = (index: number) => {
    onChange(links.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-3 pt-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Globe className="w-4 h-4 text-blue-500" />
          <h3 className="font-semibold text-xs text-slate-800 dark:text-slate-200">
            Additional Links & Profiles (Medium, Behance, X, Dribbble, Blogs)
          </h3>
        </div>
        <button
          type="button"
          onClick={addRow}
          className="flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Link</span>
        </button>
      </div>

      {links.length === 0 ? (
        <p className="text-[11px] text-slate-400 dark:text-slate-500 italic bg-slate-50/50 dark:bg-slate-800/30 p-3 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
          No additional profile links added yet. Click &quot;Add Link&quot; to include personal blogs, Behance portfolios, or writing profiles.
        </p>
      ) : (
        <div className="space-y-2">
          {links.map((link, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Label (e.g. Medium, Behance)"
                value={link.label}
                onChange={(e) => updateLink(idx, 'label', e.target.value)}
                className="w-1/3 px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
              <input
                type="url"
                placeholder="https://..."
                value={link.url}
                onChange={(e) => updateLink(idx, 'url', e.target.value)}
                className="flex-1 px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
              {link.url && (
                <a
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400"
                  title="Open link"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              )}
              <button
                type="button"
                onClick={() => removeRow(idx)}
                className="p-2 text-slate-400 hover:text-red-500 transition-colors cursor-pointer"
                title="Remove link"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

