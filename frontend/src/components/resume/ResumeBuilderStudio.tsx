import React, { useState, useRef, useCallback } from 'react';
import {
  Sparkles,
  Printer,
  Layout,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  RefreshCw,
  Zap,
  Palette,
  UserCheck,
  Wand2,
  BrainCircuit,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  FileSearch,
  Edit3,
  X,
  Info,
  PenLine,
  FolderOpen,
  Layers
} from 'lucide-react';
import { Resume, ResumeTailorResponse, AiGapAnalysis } from '../../types';
import { api } from '../../services/api';
import { useLoader } from '../../context/useLoader';
import { useAuth } from '../../context/useAuth';

interface ResumeBuilderStudioProps {
  initialResume?: Resume | null;
  resumes?: Resume[];
  onTailoredSave?: (updatedText: string) => void;
}

type TemplateTheme = 'executive' | 'tech' | 'minimalist' | 'academic';

interface SectionItem {
  id: string;
  type: 'summary' | 'experience' | 'skills' | 'education' | 'projects' | string;
  title: string;
  content: string[];
}

type EnhancementMode = 'full' | 'section' | 'gap_fill';

const DEFAULT_SECTIONS: SectionItem[] = [
  {
    id: 'sec_sum',
    type: 'summary',
    title: 'Professional Summary',
    content: [
      'Results-driven Senior Full Stack Engineer with 6+ years of experience architecting resilient cloud services, distributed event streaming architectures, and high-performance React frontends. Proven track record reducing API latency by 45% and leading cross-functional sprint deliveries.'
    ]
  },
  {
    id: 'sec_skills',
    type: 'skills',
    title: 'Technical Competencies',
    content: [
      'Languages: TypeScript, JavaScript, Python, Go, SQL',
      'Frontend: React, Next.js, Redux Toolkit, Tailwind CSS, WebSockets',
      'Backend & Cloud: FastAPI, Node.js, PostgreSQL, Redis, Kafka, Docker, Kubernetes, AWS (EKS, S3, RDS)',
      'Engineering Practices: Microservices, CI/CD, Test-Driven Development (pytest, Jest), System Architecture'
    ]
  },
  {
    id: 'sec_exp',
    type: 'experience',
    title: 'Work Experience',
    content: [
      'Senior Full Stack Engineer | CloudScale Systems (2022 - Present)',
      '• Architected high-throughput Kafka streaming pipeline handling 40M+ events daily with 99.99% uptime.',
      '• Engineered real-time reactive dashboards in React and TypeScript with sub-100ms render latency.',
      '• Containerized backend microservices using Docker and orchestrated automated deployments on AWS EKS via GitHub Actions.',
      'Full Stack Software Engineer | Horizon Fintech (2019 - 2022)',
      '• Designed secure RESTful payment endpoints in Python and FastAPI adhering strictly to PCI-DSS compliance standards.',
      '• Optimized slow PostgreSQL reporting queries by redesigning index structures, cutting 95th percentile query times by 60%.'
    ]
  },
  {
    id: 'sec_edu',
    type: 'education',
    title: 'Education & Credentials',
    content: [
      'Bachelor of Science in Computer Science | University of California, Berkeley (2015 - 2019)',
      'AWS Certified Solutions Architect – Associate (2023)'
    ]
  },
  {
    id: 'sec_proj',
    type: 'projects',
    title: 'Selected Technical Projects',
    content: [
      'Distributed Vector Search Engine: Built custom HNSW approximate nearest-neighbor search microservice in Go and Docker.',
      'Open-Source Real-Time Collaboration Canvas: 2,400+ GitHub stars; utilized CRDT algorithms over WebSockets.'
    ]
  }
];

export const ResumeBuilderStudio: React.FC<ResumeBuilderStudioProps> = ({
  initialResume,
  resumes = [],
  onTailoredSave
}) => {
  const { user } = useAuth();
  const { triggerTransition } = useLoader();

  const [selectedResumeId, setSelectedResumeId] = useState<string>(
    initialResume?.id || (resumes[0]?.id || '')
  );
  const [templateTheme, setTemplateTheme] = useState<TemplateTheme>('tech');
  const [candidateName, setCandidateName] = useState<string>(user?.full_name || 'Alex Morgan');
  const [candidateTitle, setCandidateTitle] = useState<string>('Senior Full Stack Engineer');
  const [candidateContact, setCandidateContact] = useState<string>(
    user?.email
      ? `${user.email} • (555) 234-5678 • San Francisco, CA • linkedin.com/in/alexmorgan`
      : 'alex.morgan@example.com • (555) 234-5678 • San Francisco, CA • linkedin.com/in/alexmorgan'
  );
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const [sections, setSections] = useState<SectionItem[]>(DEFAULT_SECTIONS);

  // AI Enhancement state
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [enhancingSection, setEnhancingSection] = useState<string | null>(null);
  const [gapAnalysis, setGapAnalysis] = useState<AiGapAnalysis | null>(null);
  const [enhancementNotes, setEnhancementNotes] = useState<string[]>([]);
  const [autoFixCount, setAutoFixCount] = useState<number>(0);
  const [showGapPanel, setShowGapPanel] = useState(false);
  const [isBuildingFromCv, setIsBuildingFromCv] = useState(false);

  // Canvas inline edit state
  const [canvasEditMode, setCanvasEditMode] = useState(false);
  const [inlineEditCell, setInlineEditCell] = useState<{ secId: string; lineIdx: number } | null>(null);
  const [inlineEditValue, setInlineEditValue] = useState<string>('');
  const inlineInputRef = useRef<HTMLTextAreaElement>(null);

  // Tailor modal
  const [showTailorModal, setShowTailorModal] = useState(false);
  const [targetJobRole, setTargetJobRole] = useState('Senior Distributed Systems Engineer');
  const [targetJobText, setTargetJobText] = useState(`Acme Cloud is seeking a Senior Distributed Systems Engineer.
Requirements:
- Deep expertise in Kubernetes, Docker, and AWS container workloads.
- Hands-on experience with Kafka or RabbitMQ event streaming.
- Strong proficiency in Python or Go.
- Passion for optimizing SQL and database caching layers.`);
  const [isTailoring, setIsTailoring] = useState(false);
  const [tailorResult, setTailorResult] = useState<ResumeTailorResponse | null>(null);

  // ─── Section Reorder ───────────────────────────────────────────────────────
  const moveSectionUp = (idx: number) => {
    if (idx <= 0) return;
    const copy = [...sections];
    [copy[idx - 1], copy[idx]] = [copy[idx], copy[idx - 1]];
    setSections(copy);
  };
  const moveSectionDown = (idx: number) => {
    if (idx >= sections.length - 1) return;
    const copy = [...sections];
    [copy[idx + 1], copy[idx]] = [copy[idx], copy[idx + 1]];
    setSections(copy);
  };

  // ─── Line Editing ──────────────────────────────────────────────────────────
  const updateContentLine = (secIdx: number, lineIdx: number, newText: string) => {
    const copy = [...sections];
    copy[secIdx].content[lineIdx] = newText;
    setSections(copy);
  };
  const addLineToSection = (secIdx: number) => {
    const copy = [...sections];
    copy[secIdx].content.push('• New quantifiable accomplishment with action verb and metric...');
    setSections(copy);
  };
  const removeLineFromSection = (secIdx: number, lineIdx: number) => {
    const copy = [...sections];
    copy[secIdx].content.splice(lineIdx, 1);
    setSections(copy);
  };
  const addSection = () => {
    const id = `sec_custom_${Date.now()}`;
    setSections(prev => [...prev, {
      id,
      type: 'custom',
      title: 'New Section',
      content: ['• Add your content here...']
    }]);
  };
  const removeSection = (secIdx: number) => {
    setSections(prev => prev.filter((_, i) => i !== secIdx));
  };

  // ─── Canvas Inline Edit ────────────────────────────────────────────────────
  const startInlineEdit = useCallback((secId: string, lineIdx: number, currentText: string) => {
    if (!canvasEditMode) return;
    setInlineEditCell({ secId, lineIdx });
    setInlineEditValue(currentText);
    setTimeout(() => inlineInputRef.current?.focus(), 50);
  }, [canvasEditMode]);

  const commitInlineEdit = useCallback(() => {
    if (!inlineEditCell) return;
    const secIdx = sections.findIndex(s => s.id === inlineEditCell.secId);
    if (secIdx >= 0) {
      updateContentLine(secIdx, inlineEditCell.lineIdx, inlineEditValue);
    }
    setInlineEditCell(null);
  }, [inlineEditCell, inlineEditValue, sections]);

  // ─── Load from Profile ─────────────────────────────────────────────────────
  const handleLoadFromProfile = async () => {
    setIsLoadingProfile(true);
    try {
      const profile = await api.getProfile();
      const skills = await api.getProfileSkills();
      const experiences = await api.getProfileExperiences();

      if (user?.full_name) setCandidateName(user.full_name);
      if (profile.target_title) setCandidateTitle(profile.target_title);

      const contactParts = [
        user?.email,
        profile.phone,
        [profile.city, profile.region, profile.country].filter(Boolean).join(', '),
        profile.linkedin_url
          ? `linkedin.com/${profile.linkedin_url.replace(/https?:\/\/(www\.)?linkedin\.com\//, '')}`
          : null,
        profile.github_url
          ? `github.com/${profile.github_url.replace(/https?:\/\/(www\.)?github\.com\//, '')}`
          : null,
        profile.portfolio_url
      ].filter(Boolean);
      if (contactParts.length > 0) setCandidateContact(contactParts.join(' • '));

      const newSections: SectionItem[] = [];
      if (profile.summary) {
        newSections.push({ id: 'sec_sum', type: 'summary', title: 'Professional Summary', content: [profile.summary] });
      }
      if (skills?.length > 0) {
        const skillNames = skills.map((s: any) => s.name);
        newSections.push({
          id: 'sec_skills', type: 'skills', title: 'Technical Competencies',
          content: [
            `Core Skills: ${skillNames.slice(0, 8).join(', ')}`,
            skillNames.length > 8 ? `Additional Technologies: ${skillNames.slice(8).join(', ')}` : ''
          ].filter(Boolean)
        });
      }
      if (experiences?.length > 0) {
        const expLines: string[] = [];
        experiences.forEach((exp: any) => {
          const dateRange = [exp.start_year, exp.is_current ? 'Present' : exp.end_year].filter(Boolean).join(' - ');
          expLines.push(`${exp.job_title} | ${exp.company}${dateRange ? ` (${dateRange})` : ''}`);
          if (exp.description) expLines.push(`• ${exp.description}`);
          (exp.highlights || []).forEach((h: string) => expLines.push(`• ${h}`));
        });
        newSections.push({ id: 'sec_exp', type: 'experience', title: 'Work Experience', content: expLines });
      }
      if (profile.education_history?.length > 0) {
        const eduLines = profile.education_history.map((edu: any) => {
          const yearPart = [edu.startYear, edu.endYear].filter(Boolean).join(' - ');
          const title = [edu.degree, edu.fieldOfStudy].filter(Boolean).join(' in ') || 'Degree';
          return `${title} | ${edu.institution}${yearPart ? ` (${yearPart})` : ''}`;
        });
        newSections.push({ id: 'sec_edu', type: 'education', title: 'Education & Credentials', content: eduLines });
      }
      const existingProj = sections.find(s => s.type === 'projects');
      if (existingProj) newSections.push(existingProj);
      if (newSections.length > 0) setSections(newSections);

      triggerTransition({
        title: 'Profile Details Loaded!',
        subtitle: `Loaded ${skills.length} verified skills, ${experiences.length} positions & education from your profile...`,
        badge: 'Profile Sync Complete',
        icon: 'sparkles',
        accentColor: 'purple'
      }, 400);
    } catch (err: any) {
      console.error('Failed to load profile details into studio:', err);
      alert('Could not load profile details. Ensure you are signed in.');
    } finally {
      setIsLoadingProfile(false);
    }
  };

  // ─── Build Canvas from Existing CV ────────────────────────────────────────
  const handleBuildFromCv = async () => {
    if (!selectedResumeId) {
      alert('Please select a source CV from the dropdown first.');
      return;
    }
    setIsBuildingFromCv(true);
    try {
      const result = await api.aiBuildCanvasFromResume(selectedResumeId);
      if (result.header?.name) setCandidateName(result.header.name);
      if (result.header?.title) setCandidateTitle(result.header.title);
      if (result.header?.contact) setCandidateContact(result.header.contact);
      if (result.sections?.length > 0) setSections(result.sections);
      if (result.gap_analysis) {
        setGapAnalysis(result.gap_analysis);
        setShowGapPanel(true);
      }
      if (result.enhancement_notes) setEnhancementNotes(result.enhancement_notes);
      if (result.auto_fixes_applied) setAutoFixCount(result.auto_fixes_applied);

      triggerTransition({
        title: 'AI CV Canvas Built!',
        subtitle: `Extracted & enhanced ${result.sections?.length || 0} sections from "${result.resume_title}" — ${result.auto_fixes_applied || 0} AI improvements applied.`,
        badge: 'AI CV Builder',
        icon: 'sparkles',
        accentColor: 'emerald'
      }, 500);
    } catch (err: any) {
      console.error('Failed to build canvas from CV:', err);
      alert('Could not build from CV. The resume may need to be re-parsed first.');
    } finally {
      setIsBuildingFromCv(false);
    }
  };

  // ─── AI Full Enhance ───────────────────────────────────────────────────────
  const handleAiEnhance = async (mode: EnhancementMode, sectionId?: string) => {
    setIsEnhancing(true);
    if (sectionId) setEnhancingSection(sectionId);
    try {
      const result = await api.aiEnhanceCanvas({
        sections,
        candidate_name: candidateName,
        candidate_title: candidateTitle,
        candidate_contact: candidateContact,
        enhancement_mode: mode,
        section_id: sectionId,
        target_role: candidateTitle
      });

      if (result.enhanced_sections?.length > 0) {
        if (sectionId) {
          // Merge only the enhanced section back
          setSections(prev => prev.map(s => {
            const enhanced = result.enhanced_sections.find(e => e.id === s.id);
            return enhanced ? { ...s, ...enhanced } : s;
          }));
        } else {
          // Merge all enhanced sections
          setSections(prev => {
            const enhancedMap = new Map(result.enhanced_sections.map(e => [e.id, e]));
            return prev.map(s => {
              const enhanced = enhancedMap.get(s.id);
              return enhanced ? { ...s, ...enhanced } : s;
            });
          });
        }
      }

      if (result.gap_analysis) {
        setGapAnalysis(result.gap_analysis);
        setShowGapPanel(true);
      }
      if (result.enhancement_notes) setEnhancementNotes(result.enhancement_notes);
      if (result.auto_fixes_applied) setAutoFixCount(result.auto_fixes_applied);

      const modeLabel = mode === 'full' ? 'Full CV' : mode === 'section' ? 'Section' : 'Gap Fill';
      triggerTransition({
        title: `AI ${modeLabel} Enhancement Done!`,
        subtitle: `${result.auto_fixes_applied || 0} AI improvements applied — ${result.gap_analysis?.missing_skills?.length || 0} skill gaps detected.`,
        badge: 'AI Enhancement',
        icon: 'sparkles',
        accentColor: 'indigo'
      }, 400);
    } catch (err: any) {
      console.error('AI enhance error:', err);
      alert('AI enhancement failed. Please check that the AI API is configured.');
    } finally {
      setIsEnhancing(false);
      setEnhancingSection(null);
    }
  };

  // ─── 1-Click Targeted Adaptation ──────────────────────────────────────────
  const handleExecuteTargetedAdaptation = async () => {
    if (!selectedResumeId && resumes.length === 0) return;
    setIsTailoring(true);
    try {
      const activeId = selectedResumeId || resumes[0]?.id;
      const res = await api.tailorResumeForJob(activeId, {
        job_text: targetJobText,
        target_role: targetJobRole
      });
      setTailorResult(res);
      setCandidateTitle(res.tailored_title);
      const copy = [...sections];
      const sumSec = copy.find(s => s.type === 'summary');
      if (sumSec) sumSec.content = [res.tailored_summary];
      const expSec = copy.find(s => s.type === 'experience');
      if (expSec && res.reordered_accomplishments.length > 0) {
        const roleHeaders = expSec.content.filter(line => !line.trim().startsWith('•'));
        const newBullets = res.reordered_accomplishments.map(b => `• ${b.text}`);
        expSec.content = [...roleHeaders, ...newBullets];
      }
      setSections(copy);
      if (onTailoredSave) onTailoredSave(res.tailored_summary);
      setShowTailorModal(false);
      triggerTransition({
        title: 'Targeted Adaptation Applied!',
        subtitle: `Elevated ${res.elevated_keywords.length} verified competencies for ${res.tailored_title}...`,
        badge: 'Zero-Hallucination Tailor',
        icon: 'sparkles',
        accentColor: 'emerald'
      }, 450);
    } catch (err) {
      console.error('Tailor execution error:', err);
    } finally {
      setIsTailoring(false);
    }
  };

  // ─── Print ─────────────────────────────────────────────────────────────────
  const handleTriggerPrint = () => window.print();

  // ─── Strength color ────────────────────────────────────────────────────────
  const strengthColor = (s: string) =>
    s === 'strong' ? 'text-emerald-600' : s === 'moderate' ? 'text-amber-600' : 'text-rose-600';
  const strengthBg = (s: string) =>
    s === 'strong' ? 'bg-emerald-50 border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-800'
    : s === 'moderate' ? 'bg-amber-50 border-amber-200 dark:bg-amber-950/40 dark:border-amber-800'
    : 'bg-rose-50 border-rose-200 dark:bg-rose-950/40 dark:border-rose-800';

  return (
    <div className="space-y-6 sm:space-y-8 min-w-0">
      {/* ── Top Banner Toolbar ── */}
      <div className="p-4 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-bold text-xs uppercase tracking-wider">
              <Layout className="w-4 h-4" />
              <span>Pillar 6 • Live Resume Studio & AI CV Enhancement</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-1">
              Interactive Dynamic Resume Builder
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              AI-powered CV canvas editing, automatic gap detection, section reordering, and 1-click targeted role adaptation.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Load from Profile */}
            <button
              type="button"
              onClick={handleLoadFromProfile}
              disabled={isLoadingProfile}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white transition-all shadow-sm shadow-purple-500/20 cursor-pointer active:scale-95 disabled:opacity-50"
              title="Populate builder with your verified candidate profile, skills, and work experiences"
            >
              {isLoadingProfile
                ? <><RefreshCw className="w-4 h-4 animate-spin" /><span>Loading...</span></>
                : <><UserCheck className="w-4 h-4 text-purple-200" /><span>Load Profile</span></>}
            </button>

            {/* Build AI Canvas from CV */}
            <button
              type="button"
              onClick={handleBuildFromCv}
              disabled={isBuildingFromCv || !selectedResumeId}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white transition-all shadow-sm cursor-pointer active:scale-95 disabled:opacity-50"
              title="Build & AI-enhance the canvas from a selected uploaded CV"
            >
              {isBuildingFromCv
                ? <><RefreshCw className="w-4 h-4 animate-spin" /><span>Building...</span></>
                : <><FolderOpen className="w-4 h-4" /><span>Build from CV</span></>}
            </button>

            {/* AI Full Enhance */}
            <button
              type="button"
              onClick={() => handleAiEnhance('full')}
              disabled={isEnhancing}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white transition-all shadow-sm cursor-pointer active:scale-95 disabled:opacity-50"
              title="AI enhances ALL sections and detects skill gaps automatically"
            >
              {isEnhancing && !enhancingSection
                ? <><RefreshCw className="w-4 h-4 animate-spin" /><span>Enhancing...</span></>
                : <><BrainCircuit className="w-4 h-4" /><span>AI Enhance CV</span></>}
            </button>

            {/* Gap Fill */}
            <button
              type="button"
              onClick={() => handleAiEnhance('gap_fill')}
              disabled={isEnhancing}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white transition-all shadow-sm cursor-pointer active:scale-95 disabled:opacity-50"
              title="AI detects missing skills and information and auto-fills them"
            >
              <Wand2 className="w-4 h-4" />
              <span>Auto Fix Gaps</span>
            </button>

            {/* Auto Tailor for Job */}
            <button
              type="button"
              onClick={() => setShowTailorModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white transition-all shadow-sm cursor-pointer active:scale-95"
            >
              <Zap className="w-4 h-4 text-amber-300" />
              <span>Tailor for Job</span>
            </button>

            {/* Print / PDF Export */}
            <button
              type="button"
              onClick={handleTriggerPrint}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 text-white transition-all shadow-sm cursor-pointer active:scale-95"
            >
              <Printer className="w-4 h-4" />
              <span>Print / PDF</span>
            </button>
          </div>
        </div>

        {/* Template Theme + Resume Selector + Canvas Toggle */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-bold text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
              <Palette className="w-3.5 h-3.5 text-indigo-500" />
              <span>Theme:</span>
            </span>
            {(['tech', 'executive', 'minimalist', 'academic'] as TemplateTheme[]).map(thm => (
              <button
                key={thm}
                type="button"
                onClick={() => setTemplateTheme(thm)}
                className={`px-3 py-1.5 rounded-xl font-bold uppercase text-[10px] tracking-wider transition-all cursor-pointer ${
                  templateTheme === thm
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {thm}
              </button>
            ))}

            {/* Canvas Edit Mode Toggle */}
            <button
              type="button"
              onClick={() => setCanvasEditMode(v => !v)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-[10px] uppercase tracking-wider transition-all cursor-pointer ${
                canvasEditMode
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
              title="Enable clicking on the preview to edit it directly"
            >
              <Edit3 className="w-3 h-3" />
              <span>{canvasEditMode ? 'Canvas Edit ON' : 'Canvas Edit'}</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            {resumes.length > 0 && (
              <>
                <span className="font-semibold text-slate-500">Source CV:</span>
                <select
                  value={selectedResumeId}
                  onChange={e => setSelectedResumeId(e.target.value)}
                  className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold text-slate-800 dark:text-slate-200 focus:outline-hidden text-xs max-w-[220px] truncate"
                >
                  {resumes.map(r => (
                    <option key={r.id} value={r.id}>{r.title || r.file_name}</option>
                  ))}
                </select>
              </>
            )}
            <button
              type="button"
              onClick={addSection}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-indigo-50 hover:text-indigo-700 dark:hover:bg-indigo-950/40 cursor-pointer transition-all"
              title="Add a new custom section to the CV"
            >
              <Plus className="w-3 h-3" />
              Add Section
            </button>
          </div>
        </div>

        {/* AI Enhancement Status Bar */}
        {(autoFixCount > 0 || enhancementNotes.length > 0) && (
          <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-1.5 text-xs font-bold text-violet-600 dark:text-violet-400">
              <BrainCircuit className="w-4 h-4" />
              <span>AI Enhanced: {autoFixCount} improvements applied</span>
            </div>
            {enhancementNotes.slice(0, 2).map((note, i) => (
              <span key={i} className="text-[11px] text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-lg">
                {note}
              </span>
            ))}
            {gapAnalysis && (
              <button
                type="button"
                onClick={() => setShowGapPanel(v => !v)}
                className="ml-auto flex items-center gap-1.5 text-xs font-bold text-amber-600 dark:text-amber-400 hover:underline cursor-pointer"
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                {gapAnalysis.missing_skills.length + gapAnalysis.missing_sections.length} gaps detected
                {showGapPanel ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── Gap Analysis Panel ── */}
      {showGapPanel && gapAnalysis && (
        <div className={`p-5 rounded-3xl border ${strengthBg(gapAnalysis.overall_strength)} space-y-3`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BrainCircuit className="w-5 h-5 text-violet-600 dark:text-violet-400" />
              <h3 className="text-sm font-black text-slate-900 dark:text-white">AI Gap Analysis Report</h3>
              <span className={`text-xs font-bold uppercase ${strengthColor(gapAnalysis.overall_strength)}`}>
                · CV Strength: {gapAnalysis.overall_strength.replace('_', ' ')}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setShowGapPanel(false)}
              className="text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {gapAnalysis.missing_skills.length > 0 && (
              <div className="space-y-1.5">
                <h4 className="text-xs font-black text-rose-600 dark:text-rose-400 uppercase tracking-wider flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Missing Skills ({gapAnalysis.missing_skills.length})
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {gapAnalysis.missing_skills.map(skill => (
                    <button
                      key={skill}
                      type="button"
                      onClick={() => {
                        const skillSec = sections.findIndex(s => s.type === 'skills');
                        if (skillSec >= 0) {
                          const copy = [...sections];
                          const lastLine = copy[skillSec].content[copy[skillSec].content.length - 1];
                          if (lastLine.startsWith('Additional:')) {
                            copy[skillSec].content[copy[skillSec].content.length - 1] = lastLine + `, ${skill}`;
                          } else {
                            copy[skillSec].content.push(`Additional: ${skill}`);
                          }
                          setSections(copy);
                        }
                      }}
                      className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300 hover:bg-rose-200 cursor-pointer transition-colors"
                      title="Click to add this skill to your Skills section"
                    >
                      + {skill}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {gapAnalysis.missing_sections.length > 0 && (
              <div className="space-y-1.5">
                <h4 className="text-xs font-black text-amber-600 dark:text-amber-400 uppercase tracking-wider flex items-center gap-1">
                  <Layers className="w-3.5 h-3.5" />
                  Missing Sections
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {gapAnalysis.missing_sections.map(sec => (
                    <button
                      key={sec}
                      type="button"
                      onClick={() => {
                        setSections(prev => [...prev, {
                          id: `sec_${sec}_${Date.now()}`,
                          type: sec,
                          title: sec.charAt(0).toUpperCase() + sec.slice(1),
                          content: ['• Add your content here...']
                        }]);
                      }}
                      className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 hover:bg-amber-200 cursor-pointer transition-colors"
                      title="Click to add this section"
                    >
                      + {sec}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {gapAnalysis.top_recommendations.length > 0 && (
              <div className="space-y-1.5">
                <h4 className="text-xs font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-wider flex items-center gap-1">
                  <Info className="w-3.5 h-3.5" />
                  AI Recommendations
                </h4>
                <ul className="space-y-1">
                  {gapAnalysis.top_recommendations.map((rec, i) => (
                    <li key={i} className="text-[11px] text-slate-700 dark:text-slate-300 flex items-start gap-1.5">
                      <CheckCircle2 className="w-3 h-3 text-indigo-500 mt-0.5 shrink-0" />
                      {rec}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Main Studio Layout ── */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 sm:gap-8 items-start min-w-0">

        {/* ── Left Column: WYSIWYG Editor ── */}
        <div className="xl:col-span-6 space-y-5 min-w-0">
          {/* Header Info Editor */}
          <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
            <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">
              Header & Contact Metadata
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">Full Name</label>
                <input
                  type="text"
                  value={candidateName}
                  onChange={e => setCandidateName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">Target Role Title</label>
                <input
                  type="text"
                  value={candidateTitle}
                  onChange={e => setCandidateTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400"
                />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">Contact Line / Links</label>
              <input
                type="text"
                value={candidateContact}
                onChange={e => setCandidateContact(e.target.value)}
                className="w-full px-3 py-2 rounded-xl text-xs font-medium border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>
          </div>

          {/* Section Blocks */}
          {sections.map((sec, secIdx) => (
            <div
              key={sec.id}
              className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3"
            >
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 shrink-0" />
                  <input
                    type="text"
                    value={sec.title}
                    onChange={e => {
                      const copy = [...sections];
                      copy[secIdx].title = e.target.value;
                      setSections(copy);
                    }}
                    className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white bg-transparent focus:outline-hidden"
                  />
                </div>

                <div className="flex items-center gap-1 text-slate-400">
                  {/* Per-section AI Enhance */}
                  <button
                    type="button"
                    onClick={() => handleAiEnhance('section', sec.id)}
                    disabled={isEnhancing}
                    className="p-1 rounded-lg hover:bg-violet-50 dark:hover:bg-violet-950/40 hover:text-violet-600 disabled:opacity-30 cursor-pointer transition-colors"
                    title="AI enhance this section only"
                  >
                    {enhancingSection === sec.id
                      ? <RefreshCw className="w-3.5 h-3.5 animate-spin text-violet-500" />
                      : <Wand2 className="w-3.5 h-3.5" />
                    }
                  </button>
                  <button
                    type="button"
                    onClick={() => moveSectionUp(secIdx)}
                    disabled={secIdx === 0}
                    className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 cursor-pointer"
                    title="Move section up"
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveSectionDown(secIdx)}
                    disabled={secIdx === sections.length - 1}
                    className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 cursor-pointer"
                    title="Move section down"
                  >
                    <ArrowDown className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => removeSection(secIdx)}
                    className="p-1 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 hover:text-rose-500 cursor-pointer transition-colors"
                    title="Delete this section"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Line items in section */}
              <div className="space-y-2">
                {sec.content.map((line, lineIdx) => (
                  <div key={lineIdx} className="flex items-start gap-2">
                    <textarea
                      rows={line.length > 120 ? 3 : 2}
                      value={line}
                      onChange={e => updateContentLine(secIdx, lineIdx, e.target.value)}
                      className="flex-1 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-medium text-slate-800 dark:text-slate-200 leading-relaxed focus:outline-hidden focus:ring-1 focus:ring-indigo-500 resize-y"
                    />
                    <button
                      type="button"
                      onClick={() => removeLineFromSection(secIdx, lineIdx)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer mt-1"
                      title="Delete line"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={() => addLineToSection(secIdx)}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer pt-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Line Item</span>
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* ── Right Column: Live Preview ── */}
        <div className="xl:col-span-6 space-y-4 min-w-0 xl:sticky xl:top-24">
          <div className="flex items-center justify-between px-2 text-xs font-bold text-slate-500">
            <span className="flex items-center gap-1.5">
              <RefreshCw className="w-3.5 h-3.5 text-emerald-500 animate-spin" />
              <span>Live Zero-Latency Document Renderer ({templateTheme.toUpperCase()})</span>
            </span>
            <div className="flex items-center gap-2">
              {canvasEditMode && (
                <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                  <PenLine className="w-3 h-3" />
                  Click to edit
                </span>
              )}
              <span>A4 Standard Layout • 100% Scale</span>
            </div>
          </div>

          {tailorResult && (
            <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-xs font-bold text-emerald-800 dark:text-emerald-200 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-emerald-600" />
                <span>Tailored for {tailorResult.tailored_title} (+{tailorResult.tailored_match_score_delta}% Match)</span>
              </span>
              <span className="text-[10px] bg-emerald-100 dark:bg-emerald-900/60 px-2 py-0.5 rounded-full text-emerald-700 dark:text-emerald-300">
                {tailorResult.elevated_keywords.length} Keywords Elevated
              </span>
            </div>
          )}

          {/* Compiled Document Sheet */}
          <div
            id="printable-resume-sheet"
            className={`p-8 sm:p-10 rounded-2xl shadow-xl border transition-all ${
              templateTheme === 'executive'
                ? 'bg-[#faf8f5] text-slate-900 border-[#e8e4dc] font-serif'
                : templateTheme === 'minimalist'
                ? 'bg-white text-slate-800 border-slate-200 font-sans'
                : templateTheme === 'academic'
                ? 'bg-white text-slate-900 border-slate-300 font-serif'
                : 'bg-white text-slate-900 border-indigo-100 font-sans shadow-indigo-500/5'
            }`}
          >
            {/* Candidate Header */}
            <div className={`pb-4 mb-5 border-b ${
              templateTheme === 'tech'
                ? 'border-indigo-500 text-left'
                : templateTheme === 'executive'
                ? 'border-slate-800 text-center'
                : 'border-slate-300 text-left'
            }`}>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">{candidateName}</h1>
              <p className={`text-sm font-bold mt-1 ${templateTheme === 'tech' ? 'text-indigo-600' : 'text-slate-600'}`}>
                {candidateTitle}
              </p>
              <p className="text-[11px] text-slate-500 mt-1.5 leading-relaxed font-normal">{candidateContact}</p>
            </div>

            {/* Rendered Sections */}
            <div className="space-y-4">
              {sections.map(sec => (
                <div key={sec.id} className="space-y-1.5">
                  <h2 className={`text-xs font-black uppercase tracking-wider pb-1 border-b ${
                    templateTheme === 'tech'
                      ? 'text-indigo-700 border-indigo-200'
                      : 'text-slate-800 border-slate-200'
                  }`}>
                    {sec.title}
                  </h2>
                  <div className="space-y-1 text-xs text-slate-700 leading-relaxed">
                    {sec.content.map((line, idx) => {
                      const isEditing =
                        inlineEditCell?.secId === sec.id && inlineEditCell?.lineIdx === idx;
                      return isEditing ? (
                        <div key={idx} className="relative">
                          <textarea
                            ref={inlineInputRef}
                            rows={line.length > 100 ? 3 : 2}
                            value={inlineEditValue}
                            onChange={e => setInlineEditValue(e.target.value)}
                            onBlur={commitInlineEdit}
                            onKeyDown={e => {
                              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); commitInlineEdit(); }
                              if (e.key === 'Escape') setInlineEditCell(null);
                            }}
                            className="w-full p-1.5 rounded-lg border-2 border-indigo-500 bg-indigo-50 dark:bg-indigo-950/30 text-xs text-slate-900 dark:text-white resize-y focus:outline-hidden"
                          />
                        </div>
                      ) : (
                        <p
                          key={idx}
                          onClick={() => startInlineEdit(sec.id, idx, line)}
                          className={`${line.trim().startsWith('•') ? 'pl-3 relative' : 'font-semibold text-slate-900 pt-1'} ${
                            canvasEditMode
                              ? 'cursor-text hover:bg-indigo-50 dark:hover:bg-indigo-950/20 hover:text-indigo-700 rounded-md px-1 -mx-1 transition-colors'
                              : ''
                          }`}
                          title={canvasEditMode ? 'Click to edit this line' : undefined}
                        >
                          {canvasEditMode && (
                            <span className="inline-block mr-1 opacity-0 group-hover:opacity-100">
                              <PenLine className="w-2.5 h-2.5 inline text-indigo-400" />
                            </span>
                          )}
                          {line}
                        </p>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* AI Quick Stats Card */}
          {gapAnalysis && (
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-black text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <FileSearch className="w-4 h-4 text-indigo-500" />
                  AI CV Score Summary
                </span>
                <span className={`font-black text-xs uppercase ${strengthColor(gapAnalysis.overall_strength)}`}>
                  {gapAnalysis.overall_strength.replace('_', ' ')}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 pt-1">
                <div className="text-center">
                  <div className={`text-lg font-black ${gapAnalysis.missing_skills.length === 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
                    {gapAnalysis.missing_skills.length}
                  </div>
                  <div className="text-[10px] text-slate-500">Missing Skills</div>
                </div>
                <div className="text-center">
                  <div className={`text-lg font-black ${gapAnalysis.weak_summary ? 'text-amber-500' : 'text-emerald-600'}`}>
                    {gapAnalysis.weak_summary ? '!' : '✓'}
                  </div>
                  <div className="text-[10px] text-slate-500">Summary</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-black text-indigo-600">{autoFixCount}</div>
                  <div className="text-[10px] text-slate-500">AI Fixes</div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleAiEnhance('gap_fill')}
                disabled={isEnhancing}
                className="w-full mt-1 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-violet-600 to-indigo-600 text-white hover:from-violet-700 hover:to-indigo-700 transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {isEnhancing
                  ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" />Fixing gaps...</>
                  : <><Wand2 className="w-3.5 h-3.5" />Auto-Fix All Detected Gaps</>}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Targeted Job Adaptation Modal ── */}
      {showTailorModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-xl rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 sm:p-7 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-indigo-600" />
                <h3 className="text-base font-black text-slate-900 dark:text-white">1-Click Targeted Job Adaptation</h3>
              </div>
              <button type="button" onClick={() => setShowTailorModal(false)} className="text-slate-400 hover:text-slate-600 font-bold cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              Paste the target job description to automatically re-order accomplishments by cosine vector relevance and elevate evidenced keywords while maintaining strict factual claims.
            </p>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Target Role Title</label>
              <input
                type="text"
                value={targetJobRole}
                onChange={e => setTargetJobRole(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold text-slate-900 dark:text-white"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Job Description Text</label>
              <textarea
                rows={6}
                value={targetJobText}
                onChange={e => setTargetJobText(e.target.value)}
                className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-medium text-slate-900 dark:text-white leading-relaxed resize-y"
              />
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowTailorModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 dark:text-slate-400 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteTargetedAdaptation}
                disabled={isTailoring || !targetJobText.trim()}
                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-2 shadow-sm disabled:opacity-50 cursor-pointer"
              >
                {isTailoring ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                <span>{isTailoring ? 'Reordering Vectors...' : 'Apply Targeted Adaptation'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
