import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Sparkles,
  Award,
  Clock,
  Target,
  Send,
  Loader2,
  TrendingUp,
  History,
  Building,
  Briefcase
} from 'lucide-react';
import {
  InterviewQuestionItem,
  InterviewTurnRecord,
  InterviewScorecard,
  InterviewSessionSummary,
  SpeechMetrics,
  StarEvaluation,
  Resume,
  Preset
} from '../../types';
import { api } from '../../services/api';
import { InterviewScorecardModal } from './InterviewScorecardModal';

interface VoiceInterviewStudioProps {
  resumes?: Resume[];
  presets?: Preset[];
  defaultRole?: string;
  defaultCompany?: string;
}

const FORMAT_OPTIONS = [
  { id: 'mixed', label: '🌟 Comprehensive Mixed', desc: 'Balanced blend of behavioral, technical, and scenario questions.' },
  { id: 'behavioral', label: '🤝 Behavioral (STAR)', desc: 'Focuses on team dynamics, conflict resolution, and leadership.' },
  { id: 'technical', label: '💻 Technical & Architecture', desc: 'Deep dive into system trade-offs, code quality, and debugging.' },
  { id: 'system_design', label: '🏗️ System Design', desc: 'High-level scalability, data modeling, APIs, and resiliency.' },
  { id: 'leadership', label: '👑 Leadership & Delivery', desc: 'Mentorship, roadmapping, cross-functional stakeholder management.' }
];

export const VoiceInterviewStudio: React.FC<VoiceInterviewStudioProps> = ({
  resumes = [],
  presets = [],
  defaultRole = '',
  defaultCompany = ''
}) => {
  // Session Configuration State
  const [roleTitle, setRoleTitle] = useState(defaultRole || 'Senior Full-Stack Engineer');
  const [company, setCompany] = useState(defaultCompany || 'TechFlow Labs');
  const [formatType, setFormatType] = useState('mixed');
  const [totalQuestions, setTotalQuestions] = useState(4);
  const [selectedResumeId, setSelectedResumeId] = useState<string>('all');

  // Active Session State
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [currentTurn, setCurrentTurn] = useState<number>(1);
  const [currentQuestion, setCurrentQuestion] = useState<InterviewQuestionItem | null>(null);
  const [turnsHistory, setTurnsHistory] = useState<InterviewTurnRecord[]>([]);

  // Recording & Speech State
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const [isSpeakingQuestion, setIsSpeakingQuestion] = useState(false);

  // Turn Evaluation Feedback State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [latestTurnEval, setLatestTurnEval] = useState<{
    turn: number;
    metrics: SpeechMetrics;
    star: StarEvaluation;
    followUp?: string | null;
    nextQuestion?: InterviewQuestionItem | null;
    isLastTurn: boolean;
  } | null>(null);

  // Scorecard State
  const [scorecard, setScorecard] = useState<InterviewScorecard | null>(null);
  const [showScorecardModal, setShowScorecardModal] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);

  // Past Sessions
  const [pastSessions, setPastSessions] = useState<InterviewSessionSummary[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  // Refs for Speech Recognition
  const recognitionRef = useRef<any>(null);
  const timerIntervalRef = useRef<any>(null);

  // Load past sessions
  const loadPastSessions = async () => {
    try {
      const list = await api.getInterviewSessions();
      setPastSessions(list);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    let active = true;
    api.getInterviewSessions().then((list) => {
      if (active) setPastSessions(list);
    }).catch(() => {});
    return () => { active = false; };
  }, []);

  // Update default role when initial props populate
  const prevDefaultRole = useRef(defaultRole);
  const prevDefaultCompany = useRef(defaultCompany);
  useEffect(() => {
    if (!sessionId) {
      if (defaultRole && defaultRole !== prevDefaultRole.current) {
        setRoleTitle(defaultRole);
        prevDefaultRole.current = defaultRole;
      }
      if (defaultCompany && defaultCompany !== prevDefaultCompany.current) {
        setCompany(defaultCompany);
        prevDefaultCompany.current = defaultCompany;
      }
    }
  }, [defaultRole, defaultCompany, sessionId]);

  // Handle TTS: Speak Question Aloud
  const speakText = (text: string) => {
    if (!ttsEnabled || typeof window === 'undefined' || !('speechSynthesis' in window)) {
      return;
    }
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      utterance.onstart = () => setIsSpeakingQuestion(true);
      utterance.onend = () => setIsSpeakingQuestion(false);
      utterance.onerror = () => setIsSpeakingQuestion(false);

      // Prefer a natural English voice if available
      const voices = window.speechSynthesis.getVoices();
      const naturalVoice = voices.find(
        (v) => v.lang.startsWith('en') && (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Samantha') || v.name.includes('Daniel'))
      );
      if (naturalVoice) {
        utterance.voice = naturalVoice;
      }

      window.speechSynthesis.speak(utterance);
    } catch {
      setIsSpeakingQuestion(false);
    }
  };

  // Stop TTS
  const stopTTS = () => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsSpeakingQuestion(false);
    }
  };

  // Initialize and toggle Web Speech Recognition
  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const startRecording = () => {
    stopTTS();
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert(
        'Speech Recognition is not supported by your browser. You can still type your answers directly in the response box!'
      );
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsRecording(true);
      };

      recognition.onresult = (event: any) => {
        let fullTranscript = '';
        for (let i = 0; i < event.results.length; i++) {
          fullTranscript += event.results[i][0].transcript + ' ';
        }
        setTranscript(fullTranscript.trim());
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition error:', event.error);
        if (event.error === 'not-allowed') {
          alert('Microphone access was denied. Please allow microphone permissions in your browser.');
          stopRecording();
        }
      };

      recognition.onend = () => {
        // Only stop if user explicitly stopped
        setIsRecording(false);
      };

      recognitionRef.current = recognition;
      recognition.start();

      // Start elapsed timer
      setElapsedSeconds(0);
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.error('Failed to initialize speech recognition:', err);
    }
  };

  const stopRecording = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
      recognitionRef.current = null;
    }
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    setIsRecording(false);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopTTS();
      stopRecording();
    };
  }, []);

  // Compute live metrics for HUD
  const wordsCount = transcript.trim().split(/\s+/).filter(Boolean).length;
  const liveWpm = elapsedSeconds > 4 ? Math.round((wordsCount / elapsedSeconds) * 60) : 0;
  const detectedFillers = (transcript.match(/\b(um|uh|like|you know|basically|actually|sort of|kind of)\b/gi) || []).length;

  // Start Interview Session
  const handleStartSession = async () => {
    if (!roleTitle.trim()) return;
    setIsStarting(true);
    setScorecard(null);
    setLatestTurnEval(null);
    setTurnsHistory([]);
    setTranscript('');
    try {
      const data = await api.startInterviewSession({
        role_title: roleTitle.trim(),
        company: company.trim() || undefined,
        format: formatType,
        total_questions: totalQuestions,
        resume_id: selectedResumeId
      });

      setSessionId(data.session_id);
      setCurrentTurn(1);
      setCurrentQuestion(data.first_question);

      if (ttsEnabled && data.first_question?.question) {
        setTimeout(() => speakText(data.first_question.question), 400);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to initialize interview simulator');
    } finally {
      setIsStarting(false);
    }
  };

  // Submit Answer for Current Turn
  const handleSubmitAnswer = async () => {
    if (!sessionId || !currentQuestion || isSubmitting) return;
    stopRecording();
    stopTTS();

    const answer = transcript.trim();
    if (!answer) {
      alert('Please speak or type your answer before submitting.');
      return;
    }

    setIsSubmitting(true);
    const duration = Math.max(8, elapsedSeconds);

    try {
      const result = await api.submitInterviewAnswer(sessionId, {
        turn_index: currentTurn,
        answer_text: answer,
        duration_seconds: duration
      });

      // Save turn into history
      const turnRecord: InterviewTurnRecord = {
        turn: currentTurn,
        question: currentQuestion.question,
        transcript: answer,
        duration_seconds: duration,
        speech_metrics: result.speech_metrics,
        star_evaluation: result.star_evaluation
      };

      setTurnsHistory((prev) => [...prev, turnRecord]);

      setLatestTurnEval({
        turn: currentTurn,
        metrics: result.speech_metrics,
        star: result.star_evaluation,
        followUp: result.follow_up_prompt,
        nextQuestion: result.next_question,
        isLastTurn: result.is_last_turn
      });

      // Clear for next turn
      setTranscript('');
      setElapsedSeconds(0);
    } catch (err: any) {
      alert(err.message || 'Failed to evaluate answer');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Advance to Next Question
  const handleNextQuestion = () => {
    if (!latestTurnEval) return;
    if (latestTurnEval.nextQuestion) {
      const nextQ = latestTurnEval.nextQuestion;
      setCurrentQuestion(nextQ);
      setCurrentTurn(nextQ.turn);
      setLatestTurnEval(null);
      setTranscript('');
      setElapsedSeconds(0);

      if (ttsEnabled && nextQ.question) {
        setTimeout(() => speakText(nextQ.question), 300);
      }
    } else {
      handleCompleteInterview();
    }
  };

  // Complete Interview and Load Scorecard
  const handleCompleteInterview = async () => {
    if (!sessionId) return;
    stopTTS();
    stopRecording();
    setIsCompleting(true);
    try {
      const res = await api.completeInterviewSession(sessionId);
      setScorecard(res.scorecard);
      setShowScorecardModal(true);
      loadPastSessions();
    } catch (err: any) {
      alert(err.message || 'Failed to compile interview scorecard');
    } finally {
      setIsCompleting(false);
    }
  };

  // Reset to Studio Setup
  const handleResetSession = () => {
    stopTTS();
    stopRecording();
    setSessionId(null);
    setCurrentQuestion(null);
    setLatestTurnEval(null);
    setScorecard(null);
    setShowScorecardModal(false);
    setTranscript('');
    setTurnsHistory([]);
    setElapsedSeconds(0);
  };

  return (
    <div className="space-y-6">
      {/* 1. SETUP STAGE (If no session is running) */}
      {!sessionId && (
        <div className="p-6 md:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white flex items-center justify-center shadow-md">
                <Mic className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span>Real-Time Voice AI Mock Interview Simulator</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                    Multimodal AI
                  </span>
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Practice natural voice interviews with instant STAR rubric grading, live WPM pacing, and filler word detection.
                </p>
              </div>
            </div>

            {pastSessions.length > 0 && (
              <button
                type="button"
                onClick={() => setShowHistory(!showHistory)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors self-start sm:self-auto cursor-pointer"
              >
                <History className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                <span>Past Sessions ({pastSessions.length})</span>
              </button>
            )}
          </div>

          {/* Past Sessions Drawer */}
          {showHistory && pastSessions.length > 0 && (
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-3">
              <h3 className="font-bold text-xs uppercase tracking-wider text-slate-600 dark:text-slate-400">
                Completed Interview Simulations
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {pastSessions.map((s) => (
                  <div
                    key={s.id}
                    className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900 dark:text-white truncate">
                        {s.role_title}
                      </span>
                      <span className="font-extrabold text-indigo-600 dark:text-indigo-400">
                        {s.overall_score}%
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                      {s.company || 'General Practice'} • {s.turns_count} turns
                    </div>
                    {s.recommendation && (
                      <span className="inline-block px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300">
                        {s.recommendation}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Configuration Inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                <Briefcase className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                <span>Target Role / Position</span>
              </label>
              <input
                type="text"
                value={roleTitle}
                onChange={(e) => setRoleTitle(e.target.value)}
                placeholder="e.g. Senior Full-Stack Engineer"
                className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                <Building className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                <span>Target Company (Optional)</span>
              </label>
              <input
                type="text"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="e.g. Stripe, Google, or TechFlow Labs"
                className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Format Options */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
              Select Interview Focus & Format
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {FORMAT_OPTIONS.map((f) => {
                const isSelected = formatType === f.id;
                return (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setFormatType(f.id)}
                    className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'border-indigo-500 bg-indigo-50/70 dark:bg-indigo-950/40 ring-2 ring-indigo-500/20'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50/50 dark:bg-slate-800/20'
                    }`}
                  >
                    <div className="font-bold text-xs text-slate-900 dark:text-white mb-1">
                      {f.label}
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                      {f.desc}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Number of Questions & CV Context */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100 dark:border-slate-800">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Candidate CV Profile Grounding
              </label>
              <select
                value={selectedResumeId}
                onChange={(e) => setSelectedResumeId(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white cursor-pointer"
              >
                <option value="all">🌟 All my CVs combined ({resumes.length} CVs)</option>
                {presets.length > 0 && (
                  <optgroup label="Custom Presets">
                    {presets.map((p) => (
                      <option key={p.id} value={`preset:${p.id}`}>
                        🎯 {p.name} ({p.resume_count} CVs)
                      </option>
                    ))}
                  </optgroup>
                )}
                {resumes.length > 0 && (
                  <optgroup label="Single CVs">
                    {resumes.map((r) => (
                      <option key={r.id} value={r.id}>
                        📄 {r.title || r.file_name || 'Resume'} {r.target_role ? `(${r.target_role})` : ''}
                      </option>
                    ))}
                  </optgroup>
                )}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Interview Length ({totalQuestions} Questions)
              </label>
              <div className="flex items-center gap-2 pt-1">
                {[3, 4, 5].map((count) => (
                  <button
                    key={count}
                    type="button"
                    onClick={() => setTotalQuestions(count)}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                      totalQuestions === count
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                    }`}
                  >
                    {count} Questions (~{count * 2.5} mins)
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Start Button */}
          <div className="pt-2 flex justify-end">
            <button
              type="button"
              onClick={handleStartSession}
              disabled={isStarting || !roleTitle.trim()}
              className="px-6 py-3 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold text-xs sm:text-sm shadow-md transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isStarting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Configuring Interview Studio...</span>
                </>
              ) : (
                <>
                  <Mic className="w-4 h-4" />
                  <span>Start Voice Mock Interview Session</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* 2. ACTIVE INTERVIEW STAGE */}
      {sessionId && currentQuestion && (
        <div className="p-6 md:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-6">
          {/* Header Progress Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2.5">
              <span className="w-8 h-8 rounded-xl bg-indigo-600 text-white font-black text-xs flex items-center justify-center">
                {currentTurn}
              </span>
              <div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                  Question {currentTurn} of {totalQuestions}
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {roleTitle} {company ? `• ${company}` : ''}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* TTS Voice Toggle */}
              <button
                type="button"
                onClick={() => {
                  if (ttsEnabled) stopTTS();
                  setTtsEnabled(!ttsEnabled);
                }}
                className={`p-2 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                  ttsEnabled
                    ? 'border-indigo-200 dark:border-indigo-800 bg-indigo-50/70 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300'
                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-500'
                }`}
                title={ttsEnabled ? 'Interviewer voice output enabled' : 'Interviewer voice output muted'}
              >
                {ttsEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                <span className="hidden sm:inline">{ttsEnabled ? 'AI Voice On' : 'AI Voice Muted'}</span>
              </button>

              {/* End Early */}
              <button
                type="button"
                onClick={handleResetSession}
                className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-500 hover:text-red-500 dark:hover:text-red-400 transition-colors cursor-pointer"
              >
                End Session
              </button>
            </div>
          </div>

          {/* Interviewer Stage Banner */}
          <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-r from-indigo-50/60 via-purple-50/40 to-slate-50/60 dark:from-indigo-950/30 dark:via-purple-950/20 dark:to-slate-900/60 border border-indigo-200/70 dark:border-indigo-900/50 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-300">
                  Interviewer Question
                </span>
                {currentQuestion.category && (
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                    {currentQuestion.category}
                  </span>
                )}
                {isSpeakingQuestion && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 animate-pulse">
                    <Volume2 className="w-3 h-3" />
                    <span>Speaking...</span>
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={() => speakText(currentQuestion.question)}
                className="p-1.5 rounded-lg text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-colors cursor-pointer"
                title="Re-play question audio"
              >
                <Volume2 className="w-4 h-4" />
              </button>
            </div>

            <p className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-relaxed">
              &quot;{currentQuestion.question}&quot;
            </p>

            {currentQuestion.star_guidance && (
              <div className="pt-2 border-t border-indigo-100 dark:border-indigo-950/60 flex items-start gap-2 text-xs text-slate-600 dark:text-slate-400">
                <Target className="w-3.5 h-3.5 text-indigo-600 shrink-0 mt-0.5" />
                <span>
                  <strong>STAR Framework Tip:</strong> {currentQuestion.star_guidance}
                </span>
              </div>
            )}
          </div>

          {/* If Turn Evaluation is Ready: Display Turn Score & Next Action */}
          {latestTurnEval && (
            <div className="p-5 sm:p-6 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/80 space-y-4 animate-in fade-in">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Award className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  <span className="font-bold text-sm text-emerald-900 dark:text-emerald-200">
                    Turn {latestTurnEval.turn} Evaluation Score:{' '}
                    <span className="text-lg font-black text-emerald-600 dark:text-emerald-400">
                      {latestTurnEval.star.overall_star_score}/100
                    </span>
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-xl text-xs font-bold bg-white dark:bg-slate-900 border border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300">
                    Pacing: {latestTurnEval.metrics.wpm} WPM ({latestTurnEval.metrics.pacing_status})
                  </span>
                  <span className="px-2.5 py-1 rounded-xl text-xs font-bold bg-white dark:bg-slate-900 border border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300">
                    Fillers: {latestTurnEval.metrics.filler_count}
                  </span>
                </div>
              </div>

              {/* STAR 4-Pill Breakdown */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
                <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-emerald-200/60 dark:border-emerald-900/40">
                  <span className="text-[10px] text-slate-400 block font-bold">Situation</span>
                  <span className="font-extrabold text-slate-900 dark:text-white">
                    {latestTurnEval.star.situation_score}%
                  </span>
                </div>
                <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-emerald-200/60 dark:border-emerald-900/40">
                  <span className="text-[10px] text-slate-400 block font-bold">Task</span>
                  <span className="font-extrabold text-slate-900 dark:text-white">
                    {latestTurnEval.star.task_score}%
                  </span>
                </div>
                <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-emerald-200/60 dark:border-emerald-900/40">
                  <span className="text-[10px] text-slate-400 block font-bold">Action</span>
                  <span className="font-extrabold text-slate-900 dark:text-white">
                    {latestTurnEval.star.action_score}%
                  </span>
                </div>
                <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-emerald-200/60 dark:border-emerald-900/40">
                  <span className="text-[10px] text-slate-400 block font-bold">Result</span>
                  <span className="font-extrabold text-slate-900 dark:text-white">
                    {latestTurnEval.star.result_score}%
                  </span>
                </div>
              </div>

              {/* Follow-up Probing if applicable */}
              {latestTurnEval.followUp && (
                <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 text-xs text-amber-900 dark:text-amber-200 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold">
                    <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                    <span>Adaptive Follow-Up Probing:</span>
                  </div>
                  <p className="leading-relaxed">&quot;{latestTurnEval.followUp}&quot;</p>
                </div>
              )}

              {/* Progression Action */}
              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  onClick={handleNextQuestion}
                  disabled={isCompleting}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-2 cursor-pointer shadow-xs"
                >
                  {isCompleting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Compiling Performance Scorecard...</span>
                    </>
                  ) : latestTurnEval.isLastTurn ? (
                    <>
                      <Award className="w-4 h-4" />
                      <span>Complete Interview & View Scorecard</span>
                    </>
                  ) : (
                    <>
                      <span>Proceed to Next Question</span>
                      <TrendingUp className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Live Recording HUD & Spoken Transcript */}
          {!latestTurnEval && (
            <div className="space-y-4">
              {/* Real-time HUD stats bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 text-xs">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-blue-500" />
                    <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                      {Math.floor(elapsedSeconds / 60)}:
                      {String(elapsedSeconds % 60).padStart(2, '0')}
                    </span>
                  </div>
                  <span>•</span>
                  <div>
                    <span className="text-slate-500">Words:</span>{' '}
                    <strong className="text-slate-900 dark:text-white">{wordsCount}</strong>
                  </div>
                  <span>•</span>
                  <div>
                    <span className="text-slate-500">Pacing:</span>{' '}
                    <strong className="text-indigo-600 dark:text-indigo-400">
                      {liveWpm} WPM
                    </strong>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-slate-500">Fillers:</span>
                  <span
                    className={`px-2 py-0.5 rounded-md font-bold text-[11px] ${
                      detectedFillers > 2
                        ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                        : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                    }`}
                  >
                    {detectedFillers} detected
                  </span>
                </div>
              </div>

              {/* Transcript Text Area (editable) */}
              <div className="relative">
                <textarea
                  rows={5}
                  value={transcript}
                  onChange={(e) => setTranscript(e.target.value)}
                  placeholder="Click 'Record Answer' below to speak your response aloud, or type your answer here..."
                  className="w-full p-4 rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs sm:text-sm leading-relaxed focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />

                {isRecording && (
                  <div className="absolute right-3 top-3 flex items-center gap-2 px-2.5 py-1 rounded-full bg-rose-50 dark:bg-rose-950/80 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-300 text-[11px] font-bold animate-pulse">
                    <span className="w-2 h-2 rounded-full bg-rose-500" />
                    <span>Listening...</span>
                  </div>
                )}
              </div>

              {/* Interaction Controls */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                <button
                  type="button"
                  onClick={toggleRecording}
                  className={`px-5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all cursor-pointer shadow-xs ${
                    isRecording
                      ? 'bg-rose-600 hover:bg-rose-700 text-white animate-pulse'
                      : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                  }`}
                >
                  {isRecording ? (
                    <>
                      <MicOff className="w-4 h-4" />
                      <span>Stop Recording</span>
                    </>
                  ) : (
                    <>
                      <Mic className="w-4 h-4" />
                      <span>Record Answer (Microphone)</span>
                    </>
                  )}
                </button>

                <div className="flex items-center gap-2">
                  {transcript.trim() && (
                    <button
                      type="button"
                      onClick={() => setTranscript('')}
                      className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-slate-800 text-xs font-semibold cursor-pointer"
                    >
                      Clear
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={handleSubmitAnswer}
                    disabled={isSubmitting || !transcript.trim()}
                    className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-2 cursor-pointer shadow-xs disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Evaluating STAR Adherence & Speech...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        <span>Submit Answer & Evaluate</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 3. MULTIMODAL PERFORMANCE SCORECARD MODAL */}
      {showScorecardModal && scorecard && (
        <InterviewScorecardModal
          scorecard={scorecard}
          roleTitle={roleTitle}
          company={company}
          turns={turnsHistory}
          onClose={() => setShowScorecardModal(false)}
          onRestart={handleResetSession}
        />
      )}
    </div>
  );
};
