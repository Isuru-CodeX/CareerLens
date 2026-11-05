import React from 'react';
import { motion } from 'framer-motion';

interface ScoreGaugeProps {
  score: number;
  size?: number;
  strokeWidth?: number;
  label?: string;
  sublabel?: string;
}

export const ScoreGauge: React.FC<ScoreGaugeProps> = ({
  score,
  size = 160,
  strokeWidth = 12,
  label = 'Overall Score',
  sublabel
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const safeScore = Math.min(100, Math.max(0, score));
  const strokeDashoffset = circumference - (safeScore / 100) * circumference;

  let strokeColor = '#10b981'; // emerald
  let bgColor = 'rgba(16, 185, 129, 0.15)';
  let ratingText = 'Strong Match';

  if (safeScore < 60) {
    strokeColor = '#ef4444'; // danger/red
    bgColor = 'rgba(239, 68, 68, 0.15)';
    ratingText = 'Needs Work';
  } else if (safeScore < 75) {
    strokeColor = '#f59e0b'; // warning/amber
    bgColor = 'rgba(245, 158, 11, 0.15)';
    ratingText = 'Fair Quality';
  } else if (safeScore < 88) {
    strokeColor = '#2563eb'; // royal blue
    bgColor = 'rgba(37, 99, 235, 0.15)';
    ratingText = 'Competitive';
  }

  return (
    <div className="flex flex-col items-center justify-center p-3">
      <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="transform -rotate-90">
          {/* Background circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="currentColor"
            strokeWidth={strokeWidth}
            className="text-slate-200 dark:text-slate-700/60"
            fill="transparent"
          />
          {/* Animated score stroke */}
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset }}
            transition={{ duration: 1.2, ease: 'easeOut' }}
            strokeLinecap="round"
            fill="transparent"
          />
        </svg>

        {/* Center Content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <motion.span
            className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white"
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            {Math.round(safeScore)}
            <span className="text-lg font-medium text-slate-500 dark:text-slate-400">/100</span>
          </motion.span>
          <span
            className="text-xs font-semibold px-2 py-0.5 rounded-full mt-1"
            style={{ backgroundColor: bgColor, color: strokeColor }}
          >
            {ratingText}
          </span>
        </div>
      </div>

      <span className="mt-2 text-sm font-semibold text-slate-800 dark:text-slate-200">{label}</span>
      {sublabel && <span className="text-xs text-slate-500 dark:text-slate-400 text-center">{sublabel}</span>}
    </div>
  );
};

