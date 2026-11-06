import React from 'react';
import { Sparkles } from 'lucide-react';

export type WritingStyle = 'professional' | 'human';
export type SpellingVariant = 'en-GB' | 'en-US';

interface StyleToggleProps {
  style: WritingStyle;
  onStyleChange: (s: WritingStyle) => void;
  variant: SpellingVariant;
  onVariantChange: (v: SpellingVariant) => void;
}

export const StyleToggle: React.FC<StyleToggleProps> = ({
  style,
  onStyleChange,
  variant,
  onVariantChange
}) => {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-2xl bg-slate-50/90 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs shadow-2xs">
      <div className="flex items-center gap-2.5">
        <span className="font-semibold text-slate-700 dark:text-slate-200">
          Tone & Writing Voice:
        </span>
        <div className="inline-flex rounded-xl bg-slate-200/80 dark:bg-slate-950 p-1 border border-slate-200/60 dark:border-slate-800">
          <button
            type="button"
            onClick={() => onStyleChange('professional')}
            className={`px-3 py-1 rounded-lg font-semibold text-xs transition-all cursor-pointer ${
              style === 'professional'
                ? 'bg-blue-600 dark:bg-blue-600 text-white shadow-xs border border-blue-500'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-300/40 dark:hover:bg-slate-800/60'
            }`}
          >
            Professional
          </button>
          <button
            type="button"
            onClick={() => onStyleChange('human')}
            className={`px-3 py-1 rounded-lg font-semibold text-xs transition-all flex items-center gap-1 cursor-pointer ${
              style === 'human'
                ? 'bg-purple-600 dark:bg-purple-600 text-white shadow-xs border border-purple-500'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-300/40 dark:hover:bg-slate-800/60'
            }`}
          >
            <Sparkles className="w-3 h-3 text-purple-200" />
            <span>Natural / Human</span>
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-300">Spelling:</span>
        <div className="inline-flex rounded-lg bg-slate-200/80 dark:bg-slate-950 p-0.5 text-[11px] border border-slate-200/60 dark:border-slate-800">
          <button
            type="button"
            onClick={() => onVariantChange('en-GB')}
            className={`px-2.5 py-0.5 rounded-md font-medium transition-colors cursor-pointer ${
              variant === 'en-GB'
                ? 'bg-indigo-600 dark:bg-indigo-600 text-white font-bold shadow-xs border border-indigo-500'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-300/40 dark:hover:bg-slate-800/60'
            }`}
          >
            UK (en-GB)
          </button>
          <button
            type="button"
            onClick={() => onVariantChange('en-US')}
            className={`px-2.5 py-0.5 rounded-md font-medium transition-colors cursor-pointer ${
              variant === 'en-US'
                ? 'bg-indigo-600 dark:bg-indigo-600 text-white font-bold shadow-xs border border-indigo-500'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-300/40 dark:hover:bg-slate-800/60'
            }`}
          >
            US (en-US)
          </button>
        </div>
      </div>
    </div>
  );
};
