import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Database,
  PenTool,
  Compass,
  Mic,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  Layers,
  FileText,
  Clock,
  Target,
  DollarSign,
  Award,
  Video,
  FileCheck
} from 'lucide-react';

interface ProjectTagsMatrixProps {
  onNavigate?: (view: string, extra?: any) => void;
  compact?: boolean;
}

interface CapabilityItem {
  name: string;
  tag: string;
  badge: string;
  description: string;
  targetView: string;
  icon: React.ReactNode;
}

interface PillarCategory {
  id: string;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  colorScheme: {
    badgeBg: string;
    badgeText: string;
    border: string;
    gradient: string;
  };
  capabilities: CapabilityItem[];
}

export const ProjectTagsMatrix: React.FC<ProjectTagsMatrixProps> = ({
  onNavigate,
  compact = false
}) => {
  const [activeCategory, setActiveCategory] = useState<string>('all');

  const pillars: PillarCategory[] = [
    {
      id: 'data_stats',
      title: 'User Data & Statistics',
      subtitle: 'Candidate master profile, tenure calculations, provenances & GDPR telemetry',
      icon: <Database className="w-4 h-4 text-blue-500" />,
      colorScheme: {
        badgeBg: 'bg-blue-50 dark:bg-blue-950/70',
        badgeText: 'text-blue-700 dark:text-blue-300',
        border: 'border-blue-200 dark:border-blue-900',
        gradient: 'from-blue-600 to-indigo-600'
      },
      capabilities: [
        {
          name: 'Candidate Master Profile',
          tag: 'Profile Core',
          badge: 'Master Record',
          description: 'Single source of truth with presets for university, polytechnic, and professional careers.',
          targetView: 'profile',
          icon: <Database className="w-4 h-4 text-blue-600" />
        },
        {
          name: 'Experience Tenure & Duration Engine',
          tag: 'Tenure Math',
          badge: 'De-duplicated',
          description: 'Consolidates overlapping calendars to calculate non-double-counted career duration.',
          targetView: 'resumes',
          icon: <Clock className="w-4 h-4 text-blue-600" />
        },
        {
          name: 'Verified Skill Evidence Tracker',
          tag: 'Evidence Audit',
          badge: 'Verified Proof',
          description: 'Tracks demonstrated vs mentioned skills with dispute recalculation & proof links.',
          targetView: 'profile',
          icon: <Award className="w-4 h-4 text-blue-600" />
        },
        {
          name: 'Provenance Audit Trail',
          tag: 'Audit Logs',
          badge: 'SHA-256 Ledger',
          description: 'Complete immutable log of profile migrations, CV imports, and application movements.',
          targetView: 'activity',
          icon: <FileCheck className="w-4 h-4 text-blue-600" />
        },
        {
          name: 'GDPR Compliance & JSON Archive',
          tag: 'Privacy',
          badge: 'Article 20',
          description: '1-click export of complete candidate telemetry and permanent database erasure.',
          targetView: 'profile',
          icon: <ShieldCheck className="w-4 h-4 text-blue-600" />
        }
      ]
    },
    {
      id: 'ai_writing',
      title: 'AI Writing & Text Generation',
      subtitle: 'Action-impact bullet rewrites, tailored resumes, and cover letter studios',
      icon: <PenTool className="w-4 h-4 text-purple-500" />,
      colorScheme: {
        badgeBg: 'bg-purple-50 dark:bg-purple-950/70',
        badgeText: 'text-purple-700 dark:text-purple-300',
        border: 'border-purple-200 dark:border-purple-900',
        gradient: 'from-purple-600 to-indigo-600'
      },
      capabilities: [
        {
          name: 'Google XYZ Bullet Rewriter',
          tag: 'NLP Generation',
          badge: 'XYZ Framework',
          description: 'Transforms weak bullet points: "Accomplished [X] measured by [Y] doing [Z]".',
          targetView: 'ai',
          icon: <PenTool className="w-4 h-4 text-purple-600" />
        },
        {
          name: 'Fact-Preserving Resume Tailor',
          tag: 'Tailor Studio',
          badge: 'Zero-Hallucination',
          description: 'Aligns verified accomplishments for target JDs without inventing credentials.',
          targetView: 'resumes',
          icon: <FileText className="w-4 h-4 text-purple-600" />
        },
        {
          name: 'Streaming Cover Letter Studio',
          tag: 'Cover Letters',
          badge: 'Live Streaming',
          description: 'Real-time prose drafting with role alignment, custom tones, and instant export.',
          targetView: 'ai',
          icon: <Sparkles className="w-4 h-4 text-purple-600" />
        },
        {
          name: '"Make More Human" NLP Rewriter',
          tag: 'Humanizer',
          badge: 'Natural Tone',
          description: 'Eliminates passive corporate buzzwords and robotic AI phrasing in candidate text.',
          targetView: 'ai',
          icon: <PenTool className="w-4 h-4 text-purple-600" />
        },
        {
          name: 'ATS Typography & PDF Studio',
          tag: 'Typst/PDF',
          badge: 'ATS Clean',
          description: 'Side-by-side live WYSIWYG section editor with clean single-column PDF export.',
          targetView: 'resumes',
          icon: <Layers className="w-4 h-4 text-purple-600" />
        }
      ]
    },
    {
      id: 'career_analytics',
      title: 'Career Trajectory & Analytics',
      subtitle: 'Knowledge graphs, multi-role matrix comparator & supervised compensation models',
      icon: <Compass className="w-4 h-4 text-indigo-500" />,
      colorScheme: {
        badgeBg: 'bg-indigo-50 dark:bg-indigo-950/70',
        badgeText: 'text-indigo-700 dark:text-indigo-300',
        border: 'border-indigo-200 dark:border-indigo-900',
        gradient: 'from-indigo-600 to-blue-600'
      },
      capabilities: [
        {
          name: 'Side-by-Side Trajectory Comparator',
          tag: 'Path Matrix',
          badge: '54 Specialized Roles',
          description: 'Compare target career trajectories directly against your active profile baseline.',
          targetView: 'career',
          icon: <Layers className="w-4 h-4 text-indigo-600" />
        },
        {
          name: 'Directed Career Knowledge Graph',
          tag: 'Graph Model',
          badge: '54 Roles • 18 Domains',
          description: 'Models role prerequisites, transferrable competencies, and progression hierarchies.',
          targetView: 'career',
          icon: <Compass className="w-4 h-4 text-indigo-600" />
        },
        {
          name: 'Dijkstra Career Bridge Navigator',
          tag: 'Shortest Path',
          badge: 'Pathfinding',
          description: 'Calculates optimal multi-hop progression with estimated transition durations.',
          targetView: 'career',
          icon: <Target className="w-4 h-4 text-indigo-600" />
        },
        {
          name: 'ML Supervised Salary Predictor',
          tag: 'Compensation',
          badge: 'XGBoost Bands',
          description: 'Predicts 25th, median, 75th, and 90th percentile salary bands by role and skills.',
          targetView: 'career',
          icon: <DollarSign className="w-4 h-4 text-indigo-600" />
        },
        {
          name: 'Adaptive Learning Roadmap & Quizzes',
          tag: 'Learning Plan',
          badge: 'Milestone Tracking',
          description: 'Personalized study milestones with interactive quizzes elevating skills to Demonstrated.',
          targetView: 'career',
          icon: <Award className="w-4 h-4 text-indigo-600" />
        }
      ]
    },
    {
      id: 'multimodal_sim',
      title: 'Multimodal AI & Simulation',
      subtitle: 'Voice mock interviews, VU audio visualizers, non-verbal coaching & negotiation',
      icon: <Mic className="w-4 h-4 text-rose-500" />,
      colorScheme: {
        badgeBg: 'bg-rose-50 dark:bg-rose-950/70',
        badgeText: 'text-rose-700 dark:text-rose-300',
        border: 'border-rose-200 dark:border-rose-900',
        gradient: 'from-rose-600 to-pink-600'
      },
      capabilities: [
        {
          name: 'Spoken Voice AI Mock Interviewer',
          tag: 'Voice AI',
          badge: 'Real-Time TTS/STT',
          description: 'Interactive spoken interview simulator with speech pacing (WPM) & filler-word audits.',
          targetView: 'ai',
          icon: <Mic className="w-4 h-4 text-rose-600" />
        },
        {
          name: 'Web Audio API VU Equalizer',
          tag: 'Decibel Visualizer',
          badge: 'Hardware Live',
          description: 'Real-time mic sensitivity feedback and audio stream decibel visualizer (0–100%).',
          targetView: 'ai',
          icon: <Sparkles className="w-4 h-4 text-rose-600" />
        },
        {
          name: 'STAR Framework Compliance Scorer',
          tag: 'STAR Critic',
          badge: 'Answer Evaluation',
          description: 'Evaluates Situation, Task, Action, and Result with exemplar leadership answers.',
          targetView: 'ai',
          icon: <FileCheck className="w-4 h-4 text-rose-600" />
        },
        {
          name: 'Non-Verbal Computer Vision Coach',
          tag: 'Webcam CV',
          badge: 'Posture & Gaze',
          description: 'In-browser gaze tracking, eye contact percentage, and fidget cadence detection.',
          targetView: 'ai',
          icon: <Video className="w-4 h-4 text-rose-600" />
        },
        {
          name: 'Game-Theoretic Negotiation Coach',
          tag: 'Negotiation',
          badge: 'Interactive HR Turn',
          description: 'Simulates HR counter-offers with 5 ready-to-copy structured negotiation scripts.',
          targetView: 'career',
          icon: <DollarSign className="w-4 h-4 text-rose-600" />
        }
      ]
    },
    {
      id: 'verification_audit',
      title: 'Verification, Auditing & Governance',
      subtitle: 'GitHub proof-of-work badges, ATS stress-testing, XAI heatmaps & fairness',
      icon: <ShieldCheck className="w-4 h-4 text-emerald-500" />,
      colorScheme: {
        badgeBg: 'bg-emerald-50 dark:bg-emerald-950/70',
        badgeText: 'text-emerald-700 dark:text-emerald-300',
        border: 'border-emerald-200 dark:border-emerald-900',
        gradient: 'from-emerald-600 to-teal-600'
      },
      capabilities: [
        {
          name: 'GitHub SHA-256 "Proof of Work"',
          tag: 'Code Verification',
          badge: 'Cryptographic',
          description: 'Cross-verifies claimed resume skills against concrete code repositories and commit hashes.',
          targetView: 'profile',
          icon: <ShieldCheck className="w-4 h-4 text-emerald-600" />
        },
        {
          name: 'Social Profile AI Skill Extractor',
          tag: 'Social Ingestion',
          badge: 'Zero PII Sanitizer',
          description: 'Extracts verified technical skills from GitHub & LinkedIn without personal data leakage.',
          targetView: 'profile',
          icon: <Sparkles className="w-4 h-4 text-emerald-600" />
        },
        {
          name: '4-Tier Enterprise ATS Stress-Test',
          tag: 'ATS Emulation',
          badge: 'Workday/Greenhouse',
          description: 'Simulates parsing filters for Workday, Greenhouse, Taleo, and Lever to flag parse errors.',
          targetView: 'matches',
          icon: <Layers className="w-4 h-4 text-emerald-600" />
        },
        {
          name: 'SHAP Token-Level Attribution Heatmaps',
          tag: 'Explainable AI',
          badge: 'XAI Heatmaps',
          description: 'Displays word-level mathematical weights explaining why scores increase or decrease.',
          targetView: 'analysis',
          icon: <Sparkles className="w-4 h-4 text-emerald-600" />
        },
        {
          name: 'DEI Unconscious Bias & Blind Profiler',
          tag: 'Ethics & DEI',
          badge: 'Bias Scanner',
          description: 'Scans for gender-coded jargon, ageism markers, and generates blind recruitment summaries.',
          targetView: 'analysis',
          icon: <ShieldCheck className="w-4 h-4 text-emerald-600" />
        }
      ]
    }
  ];

  const displayedPillars = activeCategory === 'all'
    ? pillars
    : pillars.filter((p) => p.id === activeCategory);

  return (
    <div className="space-y-6">
      {/* Header & Category Switcher */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-bold text-xs uppercase tracking-wider">
              <Layers className="w-3.5 h-3.5" />
              <span>Project Capabilities &amp; Categorized Tag Matrix</span>
            </div>
            <h2 className="text-xl font-extrabold text-slate-900 dark:text-white mt-1">
              Autonomous Career Intelligence Architecture
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Explore platform features organized into dedicated pillars: user data, AI writing, trajectory analytics, simulation &amp; audits.
            </p>
          </div>
        </div>

        {/* Pillar Switcher Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
          <button
            type="button"
            onClick={() => setActiveCategory('all')}
            className={`px-3.5 py-1.5 rounded-xl font-bold whitespace-nowrap cursor-pointer transition-all ${
              activeCategory === 'all'
                ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            All Pillars (25 Modules)
          </button>
          {pillars.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setActiveCategory(p.id)}
              className={`px-3.5 py-1.5 rounded-xl font-bold flex items-center gap-1.5 whitespace-nowrap cursor-pointer transition-all ${
                activeCategory === p.id
                  ? `${p.colorScheme.badgeBg} ${p.colorScheme.badgeText} ring-1 ring-inset ${p.colorScheme.border} shadow-xs`
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              {p.icon}
              <span>{p.title}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Categorized Pillars Content */}
      <div className="space-y-6">
        {displayedPillars.map((pillar) => (
          <div
            key={pillar.id}
            className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4"
          >
            {/* Pillar Section Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className={`p-2 rounded-xl ${pillar.colorScheme.badgeBg} ${pillar.colorScheme.badgeText}`}>
                  {pillar.icon}
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                    {pillar.title}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {pillar.subtitle}
                  </p>
                </div>
              </div>
              <span className={`text-[11px] font-bold px-3 py-1 rounded-full ${pillar.colorScheme.badgeBg} ${pillar.colorScheme.badgeText} border ${pillar.colorScheme.border} w-fit`}>
                {pillar.capabilities.length} Features
              </span>
            </div>

            {/* Pillar Capabilities Cards Grid */}
            <div className={`grid grid-cols-1 sm:grid-cols-2 ${compact ? 'lg:grid-cols-3' : 'lg:grid-cols-3 xl:grid-cols-5'} gap-3`}>
              {pillar.capabilities.map((cap) => (
                <motion.div
                  key={cap.name}
                  whileHover={{ y: -2 }}
                  onClick={() => onNavigate && onNavigate(cap.targetView)}
                  className="p-4 rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/60 hover:bg-white dark:hover:bg-slate-800 hover:shadow-sm transition-all flex flex-col justify-between space-y-3 cursor-pointer group"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="p-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-700">
                        {cap.icon}
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 border border-slate-200/60 dark:border-slate-700">
                        {cap.badge}
                      </span>
                    </div>

                    <div>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                        {cap.name}
                      </h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug mt-1">
                        {cap.description}
                      </p>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between text-[10px] text-slate-400 font-medium">
                    <span>{cap.tag}</span>
                    <span className="text-indigo-600 dark:text-indigo-400 font-bold flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
                      <span>Launch</span>
                      <ArrowRight className="w-3 h-3" />
                    </span>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
