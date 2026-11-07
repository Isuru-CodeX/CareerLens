import React, { useState } from 'react';
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
  UserCheck
} from 'lucide-react';
import { Resume, ResumeTailorResponse } from '../../types';
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
  type: 'summary' | 'experience' | 'skills' | 'education' | 'projects';
  title: string;
  content: string[];
}

export const ResumeBuilderStudio: React.FC<ResumeBuilderStudioProps> = ({
  initialResume,
  resumes = [],
  onTailoredSave
}) => {
  const { user } = useAuth();
  const { triggerTransition } = useLoader();
  const [selectedResumeId, setSelectedResumeId] = useState<string>(initialResume?.id || (resumes[0]?.id || ''));
  const [templateTheme, setTemplateTheme] = useState<TemplateTheme>('tech');
  const [candidateName, setCandidateName] = useState<string>(user?.full_name || 'Alex Morgan');
  const [candidateTitle, setCandidateTitle] = useState<string>('Senior Full Stack Engineer');
  const [candidateContact, setCandidateContact] = useState<string>(
    user?.email
      ? `${user.email} • (555) 234-5678 • San Francisco, CA • linkedin.com/in/alexmorgan`
      : 'alex.morgan@example.com • (555) 234-5678 • San Francisco, CA • linkedin.com/in/alexmorgan'
  );
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  
  // Sections model for drag/move reordering
  const [sections, setSections] = useState<SectionItem[]>([
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
  ]);

  // Target Adaptation Modal / State
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

  // Move section Up
  const moveSectionUp = (idx: number) => {
    if (idx <= 0) return;
    const copy = [...sections];
    const temp = copy[idx - 1];
    copy[idx - 1] = copy[idx];
    copy[idx] = temp;
    setSections(copy);
  };

  // Move section Down
  const moveSectionDown = (idx: number) => {
    if (idx >= sections.length - 1) return;
    const copy = [...sections];
    const temp = copy[idx + 1];
    copy[idx + 1] = copy[idx];
    copy[idx] = temp;
    setSections(copy);
  };

  // Update line content
  const updateContentLine = (secIdx: number, lineIdx: number, newText: string) => {
    const copy = [...sections];
    copy[secIdx].content[lineIdx] = newText;
    setSections(copy);
  };

  // Add line to section
  const addLineToSection = (secIdx: number) => {
    const copy = [...sections];
    copy[secIdx].content.push('• New quantifiable accomplishment with action verb and metric...');
    setSections(copy);
  };

  // Remove line from section
  const removeLineFromSection = (secIdx: number, lineIdx: number) => {
    const copy = [...sections];
    copy[secIdx].content.splice(lineIdx, 1);
    setSections(copy);
  };

  // Execute 1-Click Targeted Adaptation
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

      // Apply tailored title & summary directly to builder
      setCandidateTitle(res.tailored_title);
      const copy = [...sections];
      const sumSec = copy.find(s => s.type === 'summary');
      if (sumSec) {
        sumSec.content = [res.tailored_summary];
      }

      // Reorder Experience section bullets based on vector similarity
      const expSec = copy.find(s => s.type === 'experience');
      if (expSec && res.reordered_accomplishments.length > 0) {
        // Keep role header, reorder bullets
        const roleHeaders = expSec.content.filter(line => !line.trim().startsWith('•'));
        const newBullets = res.reordered_accomplishments.map(b => `• ${b.text}`);
        expSec.content = [...roleHeaders, ...newBullets];
      }

      setSections(copy);
      if (onTailoredSave) {
        onTailoredSave(res.tailored_summary);
      }
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

  // Populate Builder Studio with Candidate's Verified Profile Details
  const handleLoadFromProfile = async () => {
    setIsLoadingProfile(true);
    try {
      const profile = await api.getProfile();
      const skills = await api.getProfileSkills();
      const experiences = await api.getProfileExperiences();

      if (user?.full_name) {
        setCandidateName(user.full_name);
      }
      if (profile.target_title) {
        setCandidateTitle(profile.target_title);
      }

      // Contact line
      const contactParts = [
        user?.email,
        profile.phone,
        [profile.city, profile.region, profile.country].filter(Boolean).join(', '),
        profile.linkedin_url ? `linkedin.com/${profile.linkedin_url.replace(/https?:\/\/(www\.)?linkedin\.com\//, '')}` : null,
        profile.github_url ? `github.com/${profile.github_url.replace(/https?:\/\/(www\.)?github\.com\//, '')}` : null,
        profile.portfolio_url
      ].filter(Boolean);
      if (contactParts.length > 0) {
        setCandidateContact(contactParts.join(' • '));
      }

      const newSections: SectionItem[] = [];

      // 1. Summary
      if (profile.summary) {
        newSections.push({
          id: 'sec_sum',
          type: 'summary',
          title: 'Professional Summary',
          content: [profile.summary]
        });
      }

      // 2. Skills
      if (skills && skills.length > 0) {
        const skillNames = skills.map((s) => s.name);
        newSections.push({
          id: 'sec_skills',
          type: 'skills',
          title: 'Technical Competencies',
          content: [
            `Core Skills: ${skillNames.slice(0, 8).join(', ')}`,
            skillNames.length > 8 ? `Additional Technologies: ${skillNames.slice(8).join(', ')}` : ''
          ].filter(Boolean)
        });
      }

      // 3. Experiences
      if (experiences && experiences.length > 0) {
        const expLines: string[] = [];
        experiences.forEach((exp) => {
          const startStr = exp.start_year ? `${exp.start_year}` : '';
          const endStr = exp.is_current ? 'Present' : exp.end_year ? `${exp.end_year}` : '';
          const dateRange = [startStr, endStr].filter(Boolean).join(' - ');
          expLines.push(`${exp.job_title} | ${exp.company}${dateRange ? ` (${dateRange})` : ''}`);
          if (exp.description) {
            expLines.push(`• ${exp.description}`);
          }
          if (exp.highlights && exp.highlights.length > 0) {
            exp.highlights.forEach((h: string) => expLines.push(`• ${h}`));
          }
        });
        newSections.push({
          id: 'sec_exp',
          type: 'experience',
          title: 'Work Experience',
          content: expLines
        });
      }

      // 4. Education
      if (profile.education_history && profile.education_history.length > 0) {
        const eduLines = profile.education_history.map((edu) => {
          const yearPart = [edu.startYear, edu.endYear].filter(Boolean).join(' - ');
          const title = [edu.degree, edu.fieldOfStudy].filter(Boolean).join(' in ') || 'Degree';
          return `${title} | ${edu.institution}${yearPart ? ` (${yearPart})` : ''}`;
        });
        newSections.push({
          id: 'sec_edu',
          type: 'education',
          title: 'Education & Credentials',
          content: eduLines
        });
      }

      // 5. Keep or add projects
      const existingProj = sections.find((s) => s.type === 'projects');
      if (existingProj) {
        newSections.push(existingProj);
      }

      if (newSections.length > 0) {
        setSections(newSections);
      }

      triggerTransition(
        {
          title: 'Profile Details Loaded!',
          subtitle: `Loaded ${skills.length} verified skills, ${experiences.length} positions & education from your profile...`,
          badge: 'Profile Sync Complete',
          icon: 'sparkles',
          accentColor: 'purple'
        },
        400
      );
    } catch (err: any) {
      console.error('Failed to load profile details into studio:', err);
      alert('Could not load profile details. Ensure you are signed in.');
    } finally {
      setIsLoadingProfile(false);
    }
  };

  // Print / PDF Compilation Trigger
  const handleTriggerPrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 sm:space-y-8 min-w-0">
      {/* Top Banner Toolbar */}
      <div className="p-4 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-bold text-xs uppercase tracking-wider">
              <Layout className="w-4 h-4" />
              <span>Pillar 6 • Live Resume Studio &amp; Typst/PDF Renderer</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-1">
              Interactive Dynamic Resume Builder
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Live side-by-side compilation, section reordering, modern templates, and 1-click targeted role adaptation.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Populate with Profile Details */}
            <button
              type="button"
              onClick={handleLoadFromProfile}
              disabled={isLoadingProfile}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white transition-all shadow-sm shadow-purple-500/20 cursor-pointer active:scale-95 disabled:opacity-50"
              title="Populate builder with your verified candidate profile, skills, and work experiences"
            >
              {isLoadingProfile ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Loading Profile...</span>
                </>
              ) : (
                <>
                  <UserCheck className="w-4 h-4 text-purple-200" />
                  <span>Load Profile Details</span>
                </>
              )}
            </button>

            {/* 1-Click Targeted Adaptation CTA */}
            <button
              type="button"
              onClick={() => setShowTailorModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white transition-all shadow-sm cursor-pointer active:scale-95"
            >
              <Zap className="w-4 h-4 text-amber-300" />
              <span>Auto-Tailor for Job</span>
            </button>

            {/* Print / PDF Export */}
            <button
              type="button"
              onClick={handleTriggerPrint}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 text-white transition-all shadow-sm cursor-pointer active:scale-95"
            >
              <Printer className="w-4 h-4" />
              <span>Print / Save as PDF</span>
            </button>
          </div>
        </div>

        {/* Template Theme Switcher & Resume Selector */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
              <Palette className="w-3.5 h-3.5 text-indigo-500" />
              <span>Template Theme:</span>
            </span>
            {(['tech', 'executive', 'minimalist', 'academic'] as TemplateTheme[]).map((thm) => (
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
          </div>

          {resumes.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-500">Source CV:</span>
              <select
                value={selectedResumeId}
                onChange={(e) => setSelectedResumeId(e.target.value)}
                className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold text-slate-800 dark:text-slate-200 focus:outline-hidden text-xs max-w-[200px] truncate"
              >
                {resumes.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.title || r.file_name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Main Side-by-Side Studio Layout (6 Cols Editor, 6 Cols Live Preview) */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 sm:gap-8 items-start min-w-0">
        {/* Left Column: Interactive WYSIWYG Section Editor (6 Cols) */}
        <div className="xl:col-span-6 space-y-5 min-w-0">
          {/* Header Info Editor */}
          <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
            <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">
              Header &amp; Contact Metadata
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">Full Name</label>
                <input
                  type="text"
                  value={candidateName}
                  onChange={(e) => setCandidateName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">Target Role Title</label>
                <input
                  type="text"
                  value={candidateTitle}
                  onChange={(e) => setCandidateTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400"
                />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">Contact Line / Links</label>
              <input
                type="text"
                value={candidateContact}
                onChange={(e) => setCandidateContact(e.target.value)}
                className="w-full px-3 py-2 rounded-xl text-xs font-medium border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>
          </div>

          {/* Section Blocks Reordering & Editing */}
          {sections.map((sec, secIdx) => (
            <div
              key={sec.id}
              className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3"
            >
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
                  <input
                    type="text"
                    value={sec.title}
                    onChange={(e) => {
                      const copy = [...sections];
                      copy[secIdx].title = e.target.value;
                      setSections(copy);
                    }}
                    className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white bg-transparent focus:outline-hidden"
                  />
                </div>

                <div className="flex items-center gap-1 text-slate-400">
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
                </div>
              </div>

              {/* Line items in section */}
              <div className="space-y-2">
                {sec.content.map((line, lineIdx) => (
                  <div key={lineIdx} className="flex items-start gap-2">
                    <textarea
                      rows={line.length > 120 ? 3 : 2}
                      value={line}
                      onChange={(e) => updateContentLine(secIdx, lineIdx, e.target.value)}
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

        {/* Right Column: Live Side-by-Side Compilation Preview (6 Cols) */}
        <div className="xl:col-span-6 space-y-4 min-w-0 xl:sticky xl:top-24">
          <div className="flex items-center justify-between px-2 text-xs font-bold text-slate-500">
            <span className="flex items-center gap-1.5">
              <RefreshCw className="w-3.5 h-3.5 text-emerald-500 animate-spin" />
              <span>Live Zero-Latency Document Renderer ({templateTheme.toUpperCase()})</span>
            </span>
            <span>A4 Standard Layout • 100% Scale</span>
          </div>

          {tailorResult && (
            <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-xs font-bold text-emerald-800 dark:text-emerald-200 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-emerald-600" />
                <span>Zero-Hallucination Vector Tailored for {tailorResult.tailored_title} (+{tailorResult.tailored_match_score_delta}% Match Uplift)</span>
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
            {/* Candidate Header Block */}
            <div className={`pb-4 mb-5 border-b ${
              templateTheme === 'tech'
                ? 'border-indigo-500 text-left'
                : templateTheme === 'executive'
                ? 'border-slate-800 text-center'
                : 'border-slate-300 text-left'
            }`}>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
                {candidateName}
              </h1>
              <p className={`text-sm font-bold mt-1 ${templateTheme === 'tech' ? 'text-indigo-600' : 'text-slate-600'}`}>
                {candidateTitle}
              </p>
              <p className="text-[11px] text-slate-500 mt-1.5 leading-relaxed font-normal">
                {candidateContact}
              </p>
            </div>

            {/* Rendered Sections */}
            <div className="space-y-4">
              {sections.map((sec) => (
                <div key={sec.id} className="space-y-1.5">
                  <h2 className={`text-xs font-black uppercase tracking-wider pb-1 border-b ${
                    templateTheme === 'tech'
                      ? 'text-indigo-700 border-indigo-200'
                      : 'text-slate-800 border-slate-200'
                  }`}>
                    {sec.title}
                  </h2>
                  <div className="space-y-1 text-xs text-slate-700 leading-relaxed">
                    {sec.content.map((line, idx) => (
                      <p
                        key={idx}
                        className={line.trim().startsWith('•') ? 'pl-3 relative' : 'font-semibold text-slate-900 pt-1'}
                      >
                        {line}
                      </p>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Targeted Job Adaptation Modal */}
      {showTailorModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-xl rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 sm:p-7 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-indigo-600" />
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  1-Click Targeted Job Adaptation
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowTailorModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ×
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
                onChange={(e) => setTargetJobRole(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold text-slate-900 dark:text-white"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Job Description Text</label>
              <textarea
                rows={6}
                value={targetJobText}
                onChange={(e) => setTargetJobText(e.target.value)}
                className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-medium text-slate-900 dark:text-white leading-relaxed resize-y"
              />
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowTailorModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 dark:text-slate-400"
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
