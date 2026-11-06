import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Sparkles,
  Copy,
  Check,
  FileText,
  MessageSquare,
  Download,
  ChevronDown,
  ChevronUp,
  UserCheck,
  Globe,
  Link,
  AlertCircle
} from 'lucide-react';
import { Resume, CareerProfile } from '../types';
import { api } from '../services/api';
import { DisclaimerBanner } from '../components/DisclaimerBanner';

interface AIAssistantViewProps {
  initialTab?: 'rewrite' | 'coverletter' | 'interview';
  jobDescription?: string;
  targetRole?: string;
}

export const AIAssistantView: React.FC<AIAssistantViewProps> = ({
  initialTab = 'rewrite',
  jobDescription = '',
  targetRole = ''
}) => {
  const [activeTab, setActiveTab] = useState<'rewrite' | 'coverletter' | 'interview'>(initialTab);
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [selectedResumeId, setSelectedResumeId] = useState<string>('');

  // Tab 1: Rewriter state
  const [rewriteType, setRewriteType] = useState<'bullet' | 'summary' | 'project'>('bullet');
  const [inputText, setInputText] = useState(
    'Responsible for building customer APIs and helped with unit tests.'
  );
  const [rewriteRole, setRewriteRole] = useState(targetRole || 'Senior Full-Stack Engineer');
  const [rewriteResult, setRewriteResult] = useState<any>(null);
  const [isRewriting, setIsRewriting] = useState(false);
  const [copiedRewrite, setCopiedRewrite] = useState(false);

  // Tab 2: Cover Letter state
  const [jobUrl, setJobUrl] = useState('');
  const [isExtractingUrl, setIsExtractingUrl] = useState(false);
  const [extractSuccess, setExtractSuccess] = useState<string | null>(null);
  const [extractError, setExtractError] = useState<string | null>(null);

  const [companyName, setCompanyName] = useState('TechFlow Labs');
  const [coverJobTitle, setCoverJobTitle] = useState(targetRole || 'Senior Full-Stack Engineer');
  const [coverJD, setCoverJD] = useState(
    jobDescription ||
      'Looking for a Senior Full-Stack Engineer with Python, React, and AWS expertise to architect real-time collaboration tools.'
  );
  const [coverLetterResult, setCoverLetterResult] = useState<string>('');
  const [coverLetterFacts, setCoverLetterFacts] = useState<string[]>([]);
  const [isGeneratingCover, setIsGeneratingCover] = useState(false);
  const [copiedCover, setCopiedCover] = useState(false);

  // Profile Contact Info state for Cover Letter
  const [userProfile, setUserProfile] = useState<CareerProfile | null>(null);
  const [includeContactHeader, setIncludeContactHeader] = useState(true);
  const [candidateName, setCandidateName] = useState('');
  const [candidateEmail, setCandidateEmail] = useState('');
  const [candidatePhone, setCandidatePhone] = useState('');
  const [candidateLinkedin, setCandidateLinkedin] = useState('');
  const [candidateGithub, setCandidateGithub] = useState('');
  const [candidatePortfolio, setCandidatePortfolio] = useState('');
  const [contactCustomExpanded, setContactCustomExpanded] = useState(true);

  // Individual field inclusion toggles
  const [showName, setShowName] = useState(true);
  const [showEmail, setShowEmail] = useState(true);
  const [showPhone, setShowPhone] = useState(true);
  const [showLinkedin, setShowLinkedin] = useState(true);
  const [showGithub, setShowGithub] = useState(true);
  const [showPortfolio, setShowPortfolio] = useState(true);
  const [includeProjectLinksBody, setIncludeProjectLinksBody] = useState(true);

  // Tab 3: Interview Prep state
  const [interviewJD, setInterviewJD] = useState(
    jobDescription ||
      'Senior Full-Stack Engineer role requiring expertise in Python, FastAPI, Docker, and distributed microservices.'
  );
  const [interviewQuestions, setInterviewQuestions] = useState<any[]>([]);
  const [isGeneratingQuestions, setIsGeneratingQuestions] = useState(false);

  const [prevInitialTab, setPrevInitialTab] = useState(initialTab);
  const [prevTargetRole, setPrevTargetRole] = useState(targetRole);
  const [prevJobDesc, setPrevJobDesc] = useState(jobDescription);

  if (initialTab !== prevInitialTab || targetRole !== prevTargetRole || jobDescription !== prevJobDesc) {
    setPrevInitialTab(initialTab);
    setPrevTargetRole(targetRole);
    setPrevJobDesc(jobDescription);
    if (initialTab) setActiveTab(initialTab);
    if (targetRole) {
      setRewriteRole(targetRole);
      setCoverJobTitle(targetRole);
    }
    if (jobDescription) {
      setCoverJD(jobDescription);
      setInterviewJD(jobDescription);
    }
  }

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const [resumesList, prof, me] = await Promise.all([
          api.getResumes(),
          api.getProfile().catch(() => null),
          api.getMe().catch(() => null)
        ]);
        setResumes(resumesList);
        if (resumesList.length > 0) {
          setSelectedResumeId(resumesList[0].id);
        }
        if (prof) {
          setUserProfile(prof);
          if (prof.phone) setCandidatePhone(prof.phone);
          if (prof.linkedin_url) setCandidateLinkedin(prof.linkedin_url);
          if (prof.github_url) setCandidateGithub(prof.github_url);
          if (prof.portfolio_url) setCandidatePortfolio(prof.portfolio_url);
        }
        if (me) {
          if (me.full_name) setCandidateName(me.full_name);
          if (me.email) setCandidateEmail(me.email);
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchInitialData();
  }, []);

  // Rewriter Submit
  const handleRewrite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    setIsRewriting(true);
    try {
      const res = await api.rewriteContent({
        text: inputText,
        rewrite_type: rewriteType,
        target_role: rewriteRole,
        job_description: jobDescription
      });
      setRewriteResult(res);
    } catch (err) {
      console.error(err);
    } finally {
      setIsRewriting(false);
    }
  };

  // Cover Letter: Import from Web Link
  const handleExtractFromUrl = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!jobUrl.trim()) return;

    setIsExtractingUrl(true);
    setExtractError(null);
    setExtractSuccess(null);

    try {
      const extracted = await api.extractJobFromUrl(jobUrl.trim());
      if (extracted.company_name) setCompanyName(extracted.company_name);
      if (extracted.job_title) setCoverJobTitle(extracted.job_title);
      if (extracted.job_description) setCoverJD(extracted.job_description);
      setExtractSuccess(`Successfully imported "${extracted.job_title}" at "${extracted.company_name}"!`);
      setTimeout(() => setExtractSuccess(null), 4000);
    } catch (err: any) {
      setExtractError(err.message || 'Failed to extract job details from link.');
    } finally {
      setIsExtractingUrl(false);
    }
  };

  // Cover Letter Submit
  const handleGenerateCoverLetter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedResumeId) return;
    setIsGeneratingCover(true);
    try {
      const res = await api.generateCoverLetter({
        resume_id: selectedResumeId,
        job_description: coverJD,
        company_name: companyName,
        job_title: coverJobTitle,
        candidate_name: (includeContactHeader && showName && candidateName.trim()) ? candidateName.trim() : undefined,
        email: (includeContactHeader && showEmail && candidateEmail.trim()) ? candidateEmail.trim() : undefined,
        phone: (includeContactHeader && showPhone && candidatePhone.trim()) ? candidatePhone.trim() : undefined,
        linkedin_url: (includeContactHeader && showLinkedin && candidateLinkedin.trim()) ? candidateLinkedin.trim() : undefined,
        github_url: (includeContactHeader && showGithub && candidateGithub.trim()) ? candidateGithub.trim() : undefined,
        portfolio_url: (includeContactHeader && showPortfolio && candidatePortfolio.trim()) ? candidatePortfolio.trim() : undefined,
        other_links: includeContactHeader ? (userProfile?.other_links || undefined) : undefined,
        include_project_links_body: (includeContactHeader && includeProjectLinksBody)
      });
      setCoverLetterResult(res.cover_letter);
      setCoverLetterFacts(res.grounded_facts_used);
    } catch (err) {
      console.error(err);
    } finally {
      setIsGeneratingCover(false);
    }
  };

  // Interview Questions Submit
  const handleGenerateQuestions = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!interviewJD.trim()) return;
    setIsGeneratingQuestions(true);
    try {
      const res = await api.generateInterviewPrep({
        resume_id: selectedResumeId,
        job_description: interviewJD,
        target_role: targetRole || 'Senior Engineer'
      });
      setInterviewQuestions(res.questions);
    } catch (err) {
      console.error(err);
    } finally {
      setIsGeneratingQuestions(false);
    }
  };

  const copyToClipboard = (text: string, setter: (val: boolean) => void) => {
    navigator.clipboard.writeText(text);
    setter(true);
    setTimeout(() => setter(false), 2000);
  };

  const downloadCoverLetterTxt = () => {
    if (!coverLetterResult) return;
    const blob = new Blob([coverLetterResult], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Cover_Letter_${companyName.replace(/\s+/g, '_')}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      <DisclaimerBanner />

      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          AI Writing Assistant & Interview Simulator
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
          Transform weak phrases into Google XYZ formulas, compose evidence-grounded cover letters, and practice STAR interview questions.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 p-1.5 rounded-2xl bg-slate-100 dark:bg-slate-800/60 max-w-xl">
        <button
          onClick={() => setActiveTab('rewrite')}
          className={`flex-1 min-w-[140px] py-2 px-3 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-2 ${
            activeTab === 'rewrite'
              ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
              : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-blue-600" />
          <span>XYZ Formula Rewriter</span>
        </button>

        <button
          onClick={() => setActiveTab('coverletter')}
          className={`flex-1 min-w-[140px] py-2 px-3 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-2 ${
            activeTab === 'coverletter'
              ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
              : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <FileText className="w-3.5 h-3.5 text-emerald-600" />
          <span>Grounded Cover Letter</span>
        </button>

        <button
          onClick={() => setActiveTab('interview')}
          className={`flex-1 min-w-[140px] py-2 px-3 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-2 ${
            activeTab === 'interview'
              ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
              : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <MessageSquare className="w-3.5 h-3.5 text-indigo-600" />
          <span>Interview Q&A Practice</span>
        </button>
      </div>

      {/* Tab 1: XYZ Rewriter */}
      {activeTab === 'rewrite' && (
        <div className="space-y-6">
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-500">Rewrite Mode:</span>
                {(['bullet', 'summary', 'project'] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => {
                      setRewriteType(t);
                      if (t === 'bullet') {
                        setInputText('Responsible for building customer APIs and helped with unit tests.');
                      } else if (t === 'summary') {
                        setInputText('Experienced full stack developer looking for a challenging role.');
                      } else {
                        setInputText('Built a web dashboard for data analytics using React.');
                      }
                    }}
                    className={`px-3 py-1 rounded-xl text-xs font-semibold capitalize transition-colors ${
                      rewriteType === t
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {t === 'bullet' ? 'Experience Bullet (XYZ)' : t === 'summary' ? 'Summary Pitch' : 'Project Highlight'}
                  </button>
                ))}
              </div>

              <div className="w-64">
                <input
                  type="text"
                  placeholder="Target Role (e.g. Senior Backend)"
                  value={rewriteRole}
                  onChange={(e) => setRewriteRole(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>
            </div>

            <form onSubmit={handleRewrite} className="space-y-3">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Original Text to Enhance
              </label>
              <textarea
                rows={3}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Paste original bullet point or summary..."
                className="w-full p-3.5 text-xs rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-sans leading-relaxed"
              />

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={isRewriting || !inputText.trim()}
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-md transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>{isRewriting ? 'Enhancing...' : 'Apply XYZ Formula'}</span>
                </button>
              </div>
            </form>
          </div>

          {/* Side-by-Side Comparison */}
          {rewriteResult && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="grid grid-cols-1 md:grid-cols-2 gap-6"
            >
              {/* Original */}
              <div className="p-6 rounded-3xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-3">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Original Wording
                </span>
                <p className="text-xs text-slate-700 dark:text-slate-300 font-mono bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 leading-relaxed">
                  {rewriteResult.original}
                </p>
                <div className="text-[11px] text-slate-500">
                  Status: Contains passive descriptors or unquantified achievements.
                </div>
              </div>

              {/* Improved */}
              <div className="p-6 rounded-3xl bg-gradient-to-br from-blue-50/50 to-indigo-50/50 dark:from-blue-950/20 dark:to-indigo-950/20 border border-blue-200 dark:border-blue-900/50 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-blue-700 dark:text-blue-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                    <span>XYZ Formula Enhanced</span>
                  </span>
                  <button
                    onClick={() => copyToClipboard(rewriteResult.improved, setCopiedRewrite)}
                    className="p-1.5 rounded-lg border border-blue-200 dark:border-blue-800 bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 hover:bg-blue-50 text-xs font-semibold flex items-center gap-1"
                  >
                    {copiedRewrite ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedRewrite ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>

                <p className="text-xs text-slate-900 dark:text-white font-medium bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-blue-200/80 dark:border-blue-900/60 leading-relaxed shadow-xs">
                  {rewriteResult.improved}
                </p>

                <div className="space-y-1.5 pt-1">
                  <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                    Applied Adjustments:
                  </span>
                  {rewriteResult.changes.map((c: string, i: number) => (
                    <div key={i} className="text-[11px] text-emerald-700 dark:text-emerald-400 flex items-start gap-1.5">
                      <Check className="w-3 h-3 shrink-0 mt-0.5" />
                      <span>{c}</span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </div>
      )}

      {/* Tab 2: Grounded Cover Letter */}
      {activeTab === 'coverletter' && (
        <div className="space-y-6">
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            
            {/* Import Job from Web Link (AI Auto-Fill) */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-50/70 via-indigo-50/50 to-blue-50/70 dark:from-slate-800/60 dark:via-indigo-950/30 dark:to-slate-800/60 border border-blue-200/80 dark:border-slate-700/80 space-y-2.5">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-blue-600 text-white shadow-xs">
                  <Globe className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-bold text-xs text-slate-900 dark:text-white">
                    Import Job from Web Link (AI Auto-Fill)
                  </span>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Paste any job posting link (LinkedIn, Indeed, Greenhouse, Lever, etc.) to automatically populate Title, Company, and Description.
                  </p>
                </div>
              </div>

              <form onSubmit={handleExtractFromUrl} className="flex flex-col sm:flex-row gap-2 pt-1">
                <div className="relative flex-1">
                  <Link className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                  <input
                    type="url"
                    value={jobUrl}
                    onChange={(e) => setJobUrl(e.target.value)}
                    placeholder="e.g. https://www.linkedin.com/jobs/view/4463126127/"
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isExtractingUrl || !jobUrl.trim()}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs disabled:opacity-50 transition-colors flex items-center justify-center gap-1.5 shrink-0 cursor-pointer"
                >
                  {isExtractingUrl ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Extracting...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>AI Auto-Fill</span>
                    </>
                  )}
                </button>
              </form>

              {extractSuccess && (
                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-[11px] text-emerald-800 dark:text-emerald-300">
                  <Check className="w-3.5 h-3.5 shrink-0 text-emerald-600" />
                  <span>{extractSuccess}</span>
                </div>
              )}

              {extractError && (
                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-900 text-[11px] text-red-700 dark:text-red-300">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0 text-red-600" />
                  <span>{extractError}</span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Source Resume Facts
                </label>
                <select
                  value={selectedResumeId}
                  onChange={(e) => setSelectedResumeId(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                >
                  {resumes.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Company Name
                </label>
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="e.g. Stripe, TechFlow Labs"
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Target Role Title
                </label>
                <input
                  type="text"
                  value={coverJobTitle}
                  onChange={(e) => setCoverJobTitle(e.target.value)}
                  placeholder="e.g. Senior Full-Stack Engineer"
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Target Job Description
              </label>
              <textarea
                rows={4}
                value={coverJD}
                onChange={(e) => setCoverJD(e.target.value)}
                className="w-full p-3.5 text-xs rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white leading-relaxed"
              />
            </div>

            {/* Contact Information & Links Header Controls */}
            <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 space-y-3.5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeContactHeader}
                    onChange={(e) => setIncludeContactHeader(e.target.checked)}
                    className="w-4 h-4 rounded-md text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                  <span className="font-semibold text-xs text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <UserCheck className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                    <span>Include Profile Contact Header & Links</span>
                  </span>
                </label>

                {includeContactHeader && (
                  <button
                    type="button"
                    onClick={() => setContactCustomExpanded(!contactCustomExpanded)}
                    className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 self-start sm:self-auto cursor-pointer"
                  >
                    <span>{contactCustomExpanded ? 'Collapse Checklist' : 'Customize Included Fields'}</span>
                    {contactCustomExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>
                )}
              </div>

              {/* Badges preview */}
              {includeContactHeader && (
                <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-slate-600 dark:text-slate-400 pt-0.5">
                  <span className="text-slate-400 font-semibold text-[11px]">Included on letter:</span>
                  {showName && candidateName && (
                    <span className="px-2 py-0.5 rounded-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 font-medium">
                      ✓ Name
                    </span>
                  )}
                  {showEmail && candidateEmail && (
                    <span className="px-2 py-0.5 rounded-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 font-medium">
                      ✓ Email
                    </span>
                  )}
                  {showPhone && candidatePhone && (
                    <span className="px-2 py-0.5 rounded-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 font-medium">
                      ✓ Phone
                    </span>
                  )}
                  {showGithub && candidateGithub && (
                    <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 font-medium text-slate-900 dark:text-white">
                      ✓ GitHub
                    </span>
                  )}
                  {showPortfolio && candidatePortfolio && (
                    <span className="px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900 font-medium">
                      ✓ Portfolio
                    </span>
                  )}
                  {showLinkedin && candidateLinkedin && (
                    <span className="px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900 font-medium">
                      ✓ LinkedIn
                    </span>
                  )}
                  {includeProjectLinksBody && (showGithub || showPortfolio) && (
                    <span className="px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-900 font-semibold">
                      ★ Project Intro Paragraph
                    </span>
                  )}
                </div>
              )}

              {/* Comprehensive Checkboxes & Inputs customizer */}
              {includeContactHeader && contactCustomExpanded && (
                <div className="space-y-3 pt-2 border-t border-slate-200 dark:border-slate-700/60 text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {/* 1. Full Name */}
                    <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1.5">
                      <label className="flex items-center gap-2 cursor-pointer font-semibold text-slate-800 dark:text-slate-200">
                        <input
                          type="checkbox"
                          checked={showName}
                          onChange={(e) => setShowName(e.target.checked)}
                          className="w-3.5 h-3.5 text-blue-600 rounded-sm cursor-pointer"
                        />
                        <span>Candidate Name</span>
                      </label>
                      <input
                        type="text"
                        disabled={!showName}
                        value={candidateName}
                        onChange={(e) => setCandidateName(e.target.value)}
                        placeholder="Isuru Rathnayaka"
                        className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white disabled:opacity-40"
                      />
                    </div>

                    {/* 2. Email Address */}
                    <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1.5">
                      <label className="flex items-center gap-2 cursor-pointer font-semibold text-slate-800 dark:text-slate-200">
                        <input
                          type="checkbox"
                          checked={showEmail}
                          onChange={(e) => setShowEmail(e.target.checked)}
                          className="w-3.5 h-3.5 text-blue-600 rounded-sm cursor-pointer"
                        />
                        <span>Email Address</span>
                      </label>
                      <input
                        type="text"
                        disabled={!showEmail}
                        value={candidateEmail}
                        onChange={(e) => setCandidateEmail(e.target.value)}
                        placeholder="isururathnayaka999@gmail.com"
                        className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white disabled:opacity-40"
                      />
                    </div>

                    {/* 3. Mobile / Phone */}
                    <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1.5">
                      <label className="flex items-center gap-2 cursor-pointer font-semibold text-slate-800 dark:text-slate-200">
                        <input
                          type="checkbox"
                          checked={showPhone}
                          onChange={(e) => setShowPhone(e.target.checked)}
                          className="w-3.5 h-3.5 text-blue-600 rounded-sm cursor-pointer"
                        />
                        <span>Phone / Mobile</span>
                      </label>
                      <input
                        type="text"
                        disabled={!showPhone}
                        value={candidatePhone}
                        onChange={(e) => setCandidatePhone(e.target.value)}
                        placeholder="+94 72 793 8613"
                        className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white disabled:opacity-40"
                      />
                    </div>

                    {/* 4. GitHub URL */}
                    <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1.5">
                      <label className="flex items-center gap-2 cursor-pointer font-semibold text-slate-800 dark:text-slate-200">
                        <input
                          type="checkbox"
                          checked={showGithub}
                          onChange={(e) => setShowGithub(e.target.checked)}
                          className="w-3.5 h-3.5 text-blue-600 rounded-sm cursor-pointer"
                        />
                        <span>GitHub Profile</span>
                      </label>
                      <input
                        type="text"
                        disabled={!showGithub}
                        value={candidateGithub}
                        onChange={(e) => setCandidateGithub(e.target.value)}
                        placeholder="https://github.com/Isuru-CodeX"
                        className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white disabled:opacity-40"
                      />
                    </div>

                    {/* 5. Portfolio URL */}
                    <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1.5">
                      <label className="flex items-center gap-2 cursor-pointer font-semibold text-slate-800 dark:text-slate-200">
                        <input
                          type="checkbox"
                          checked={showPortfolio}
                          onChange={(e) => setShowPortfolio(e.target.checked)}
                          className="w-3.5 h-3.5 text-blue-600 rounded-sm cursor-pointer"
                        />
                        <span>Portfolio Website</span>
                      </label>
                      <input
                        type="text"
                        disabled={!showPortfolio}
                        value={candidatePortfolio}
                        onChange={(e) => setCandidatePortfolio(e.target.value)}
                        placeholder="https://yourportfolio.dev"
                        className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white disabled:opacity-40"
                      />
                    </div>

                    {/* 6. LinkedIn URL */}
                    <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1.5">
                      <label className="flex items-center gap-2 cursor-pointer font-semibold text-slate-800 dark:text-slate-200">
                        <input
                          type="checkbox"
                          checked={showLinkedin}
                          onChange={(e) => setShowLinkedin(e.target.checked)}
                          className="w-3.5 h-3.5 text-blue-600 rounded-sm cursor-pointer"
                        />
                        <span>LinkedIn Profile</span>
                      </label>
                      <input
                        type="text"
                        disabled={!showLinkedin}
                        value={candidateLinkedin}
                        onChange={(e) => setCandidateLinkedin(e.target.value)}
                        placeholder="https://linkedin.com/in/..."
                        className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white disabled:opacity-40"
                      />
                    </div>
                  </div>

                  {/* Body Paragraph Project Links Option */}
                  <div className="p-3 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-900/60">
                    <label className="flex items-start gap-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={includeProjectLinksBody}
                        onChange={(e) => setIncludeProjectLinksBody(e.target.checked)}
                        className="w-4 h-4 mt-0.5 text-indigo-600 rounded-sm cursor-pointer"
                      />
                      <div>
                        <span className="font-bold text-xs text-indigo-950 dark:text-indigo-200 block">
                          Introduce GitHub & Portfolio projects in the cover letter body paragraph
                        </span>
                        <p className="text-[11px] text-indigo-800 dark:text-indigo-300 mt-0.5">
                          When checked, the letter includes a dedicated paragraph guiding the recruiter to your GitHub code and portfolio projects before the closing.
                        </p>
                      </div>
                    </label>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end">
              <button
                onClick={handleGenerateCoverLetter}
                disabled={isGeneratingCover || !selectedResumeId}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-md transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                <Sparkles className="w-4 h-4" />
                <span>{isGeneratingCover ? 'Generating Draft...' : 'Generate Grounded Cover Letter'}</span>
              </button>
            </div>
          </div>

          {coverLetterResult && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-6 md:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <span className="font-bold text-xs text-slate-900 dark:text-white">
                  Editable Cover Letter Draft
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={downloadCoverLetterTxt}
                    className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold flex items-center gap-1.5"
                    title="Download as Text"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download .txt</span>
                  </button>
                  <button
                    onClick={() => copyToClipboard(coverLetterResult, setCopiedCover)}
                    className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold flex items-center gap-1.5"
                  >
                    {copiedCover ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedCover ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
              </div>

              <textarea
                rows={14}
                value={coverLetterResult}
                onChange={(e) => setCoverLetterResult(e.target.value)}
                className="w-full p-4 text-xs font-sans rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 text-slate-900 dark:text-white leading-relaxed focus:outline-hidden"
              />

              <div className="p-3.5 rounded-2xl bg-blue-50/60 dark:bg-blue-950/20 border border-blue-200 text-xs text-blue-900 dark:text-blue-300 space-y-1">
                <span className="font-semibold">Candidate details utilized:</span>
                <div className="text-[11px] text-slate-600 dark:text-slate-400 space-y-0.5">
                  {coverLetterFacts.map((fact, idx) => (
                    <div key={idx}>• {fact}</div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </div>
      )}

      {/* Tab 3: Interview Q&A Practice */}
      {activeTab === 'interview' && (
        <div className="space-y-6">
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Target Role & Requirements for Interview Simulation
              </label>
              <textarea
                rows={4}
                value={interviewJD}
                onChange={(e) => setInterviewJD(e.target.value)}
                className="w-full p-3.5 text-xs rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white leading-relaxed"
              />
            </div>

            <div className="flex justify-end">
              <button
                onClick={handleGenerateQuestions}
                disabled={isGeneratingQuestions || !interviewJD.trim()}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-md transition-all flex items-center gap-2 disabled:opacity-50"
              >
                <MessageSquare className="w-4 h-4" />
                <span>{isGeneratingQuestions ? 'Generating Practice Q&A...' : 'Generate Targeted Questions'}</span>
              </button>
            </div>
          </div>

          {interviewQuestions.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                  Targeted Interview Questions & STAR Framework Prompts
                </h3>
                <span className="text-xs text-slate-400">
                  {interviewQuestions.length} practice prompts
                </span>
              </div>

              <div className="space-y-3">
                {interviewQuestions.map((q, idx) => (
                  <div
                    key={idx}
                    className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-lg bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-bold text-xs flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>
                        <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">
                          {q.question}
                        </h4>
                      </div>
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 shrink-0">
                        {q.type}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                      <div className="p-3 rounded-xl bg-blue-50/50 dark:bg-blue-950/20 text-slate-700 dark:text-slate-300">
                        <span className="font-bold text-blue-900 dark:text-blue-300 block mb-1">
                          Key Focus & Tradeoffs:
                        </span>
                        {q.suggested_focus}
                      </div>

                      <div className="p-3 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 text-slate-700 dark:text-slate-300">
                        <span className="font-bold text-emerald-900 dark:text-emerald-300 block mb-1">
                          STAR Method Framing Hint:
                        </span>
                        {q.star_hints}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </div>
      )}
    </div>
  );
};
