import React from 'react';

interface CareerLensLogoProps {
  size?: number;
  className?: string;
  showText?: boolean;
  textClassName?: string;
  variant?: 'icon' | 'full' | 'monochrome';
}

export const CareerLensLogo: React.FC<CareerLensLogoProps> = ({
  size = 36,
  className = '',
  showText = false,
  textClassName = '',
  variant = 'icon'
}) => {
  const icon = (
    <div
      style={{ width: size, height: size }}
      className={`relative shrink-0 flex items-center justify-center select-none group ${className}`}
    >
      <svg
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full drop-shadow-md group-hover:scale-105 transition-transform duration-300"
      >
        <defs>
          {/* Nexora-Inspired Multi-Stop Dynamic Gradient */}
          <linearGradient id="clGradientPrimary" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#01C7F4" />
            <stop offset="35%" stopColor="#3B82F6" />
            <stop offset="70%" stopColor="#7C3AED" />
            <stop offset="100%" stopColor="#D803B3" />
          </linearGradient>

          {/* Accent Prism Refraction Gradient */}
          <linearGradient id="clGradientRefraction" x1="100%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#38BDF8" />
            <stop offset="50%" stopColor="#818CF8" />
            <stop offset="100%" stopColor="#F43F5E" />
          </linearGradient>

          {/* Core Lens Flare Gradient */}
          <radialGradient id="clCoreFlare" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#38BDF8" stopOpacity="0.9" />
            <stop offset="40%" stopColor="#6366F1" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#4F46E5" stopOpacity="0" />
          </radialGradient>

          {/* Background Squircle Gradient */}
          <linearGradient id="clBgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0F172A" />
            <stop offset="100%" stopColor="#030712" />
          </linearGradient>

          {/* Soft Glow Filter */}
          <filter id="clGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Squircle Base Frame */}
        <rect
          x="4"
          y="4"
          width="92"
          height="92"
          rx="24"
          fill="url(#clBgGradient)"
          stroke="url(#clGradientPrimary)"
          strokeWidth="2.5"
          className="transition-all"
        />

        {/* Ambient Lens Halo */}
        <circle cx="50" cy="50" r="34" fill="url(#clCoreFlare)" />

        {/* Outer Optical Lens Ring (Calibrated Scale) */}
        <circle
          cx="50"
          cy="50"
          r="32"
          stroke="url(#clGradientPrimary)"
          strokeWidth="2"
          strokeDasharray="4 3"
          strokeOpacity="0.6"
        />

        {/* Aperture Iris Blades (Tri-Blade Optical Geometry) */}
        {/* Blade 1 */}
        <path
          d="M 50 18 C 66 18, 80 32, 80 48 L 62 48 C 62 40, 56 34, 48 34 Z"
          fill="url(#clGradientPrimary)"
          fillOpacity="0.75"
        />
        {/* Blade 2 */}
        <path
          d="M 82 50 C 82 66, 68 80, 52 80 L 52 62 C 60 62, 66 56, 66 48 Z"
          fill="url(#clGradientPrimary)"
          fillOpacity="0.65"
        />
        {/* Blade 3 */}
        <path
          d="M 48 82 C 32 82, 18 68, 18 52 L 36 52 C 36 60, 42 66, 50 66 Z"
          fill="url(#clGradientRefraction)"
          fillOpacity="0.8"
        />
        {/* Blade 4 */}
        <path
          d="M 18 48 C 18 32, 32 18, 48 18 L 48 36 C 40 36, 34 42, 34 50 Z"
          fill="url(#clGradientPrimary)"
          fillOpacity="0.6"
        />

        {/* Central Dynamic Career Prism / Chevron Focal Core */}
        {/* Upper Facet - Ascending Arrowhead */}
        <path
          d="M 50 32 L 64 50 L 50 45 L 36 50 Z"
          fill="#FFFFFF"
          filter="url(#clGlow)"
        />
        {/* Lower Facet - Diamond Anchor */}
        <path
          d="M 50 45 L 64 50 L 50 68 L 36 50 Z"
          fill="url(#clGradientRefraction)"
        />

        {/* Focal Apex Specular Highlight Spark */}
        <circle cx="50" cy="46" r="3.5" fill="#FFFFFF" />
        <circle cx="50" cy="46" r="6" fill="#01C7F4" fillOpacity="0.4" />

        {/* Micro Telemetry Focus Ticks */}
        <line x1="50" y1="8" x2="50" y2="13" stroke="#01C7F4" strokeWidth="2" strokeLinecap="round" />
        <line x1="50" y1="87" x2="50" y2="92" stroke="#D803B3" strokeWidth="2" strokeLinecap="round" />
        <line x1="8" y1="50" x2="13" y2="50" stroke="#01C7F4" strokeWidth="2" strokeLinecap="round" />
        <line x1="87" y1="50" x2="92" y2="50" stroke="#D803B3" strokeWidth="2" strokeLinecap="round" />
      </svg>
    </div>
  );

  if (!showText) {
    return icon;
  }

  return (
    <div className={`flex items-center gap-2.5 ${textClassName}`}>
      {icon}
      <div className="flex flex-col">
        <div className="flex items-center gap-1.5 leading-none">
          <span className="font-extrabold text-base tracking-tight text-slate-900 dark:text-white">
            CareerLens
          </span>
          <span className="text-[10px] font-black px-1.5 py-0.5 rounded-md bg-gradient-to-r from-cyan-500 to-indigo-600 text-white shadow-xs tracking-wider">
            AI
          </span>
        </div>
        <span className="text-[10px] font-medium text-slate-400 dark:text-slate-400 tracking-tight mt-0.5 hidden sm:block">
          Autonomous Career Intelligence
        </span>
      </div>
    </div>
  );
};

export default CareerLensLogo;
