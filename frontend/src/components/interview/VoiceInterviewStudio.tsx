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
  Briefcase,
  Copy,
  Check,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import {
  InterviewQuestionItem,
  InterviewTurnRecord,
  InterviewScorecard,
  InterviewSessionSummary,
  SpeechMetrics,
  StarEvaluation,
  Resume,
  Preset,
  SuitableAnswer
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
  const [isVoiceDetected, setIsVoiceDetected] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [engineStatus, setEngineStatus] = useState<string>('idle');
  const [isTranscribingBackend, setIsTranscribingBackend] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const [isSpeakingQuestion, setIsSpeakingQuestion] = useState(false);
  const [hasRecordedAudio, setHasRecordedAudio] = useState(false);
  const [transcriptionNotice, setTranscriptionNotice] = useState<{ type: 'info' | 'success' | 'warn'; text: string } | null>(null);

  // Turn Evaluation Feedback State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [latestTurnEval, setLatestTurnEval] = useState<{
    turn: number;
    metrics: SpeechMetrics;
    star: StarEvaluation;
    suitableAnswers: SuitableAnswer[];
    followUp?: string | null;
    nextQuestion?: InterviewQuestionItem | null;
    isLastTurn: boolean;
  } | null>(null);

  // Model Exemplar Answers state
  const [activeModelIndex, setActiveModelIndex] = useState(0);
  const [copiedModelScript, setCopiedModelScript] = useState(false);

  // Scorecard State
  const [scorecard, setScorecard] = useState<InterviewScorecard | null>(null);
  const [showScorecardModal, setShowScorecardModal] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);

  // Past Sessions
  const [pastSessions, setPastSessions] = useState<InterviewSessionSummary[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  // Refs for Dual Audio Capture: Web Speech API & Native MediaRecorder
  const recognitionRef = useRef<any>(null);
  const isRecordingIntentRef = useRef(false);
  const isWebSpeechAliveRef = useRef(true);
  const initialTextRef = useRef('');
  const sessionFinalRef = useRef('');
  const timerIntervalRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordedBlobRef = useRef<Blob | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const syncIntervalRef = useRef<any>(null);

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

  // Initialize and toggle Web Speech Recognition + MediaRecorder dual-pipeline
  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const startRecording = async () => {
    stopTTS();
    setEngineStatus('starting');
    setIsRecording(true);
    isRecordingIntentRef.current = true;
    isWebSpeechAliveRef.current = true;
    initialTextRef.current = transcript.trim();
    sessionFinalRef.current = '';
    audioChunksRef.current = [];
    recordedBlobRef.current = null;
    setHasRecordedAudio(false);
    setTranscriptionNotice(null);
    setAudioLevel(0);

    // 1. Initialize MediaStream & Native MediaRecorder (Reliable browser standard)
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaStreamRef.current = stream;

        // Start native MediaRecorder
        if (typeof MediaRecorder !== 'undefined') {
          let preferredMime = '';
          if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
            preferredMime = 'audio/webm;codecs=opus';
          } else if (MediaRecorder.isTypeSupported('audio/webm')) {
            preferredMime = 'audio/webm';
          } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
            preferredMime = 'audio/mp4';
          }

          const mr = preferredMime
            ? new MediaRecorder(stream, { mimeType: preferredMime })
            : new MediaRecorder(stream);
          mediaRecorderRef.current = mr;

          mr.ondataavailable = (e) => {
            if (e.data && e.data.size > 0) {
              audioChunksRef.current.push(e.data);
            }
          };

          mr.start(250);
        }

        // Initialize AudioContext purely for real-time sound volume visualizer
        try {
          const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
          if (AudioContextClass) {
            const audioCtx = new AudioContextClass();
            audioContextRef.current = audioCtx;
            if (audioCtx.state === 'suspended') {
              await audioCtx.resume();
            }

            const source = audioCtx.createMediaStreamSource(stream);
            const analyser = audioCtx.createAnalyser();
            analyser.fftSize = 256;

            source.connect(analyser);

            const dataArray = new Uint8Array(analyser.frequencyBinCount);
            const checkVolume = () => {
              if (!isRecordingIntentRef.current) return;
              analyser.getByteFrequencyData(dataArray);
              let sum = 0;
              for (let i = 0; i < dataArray.length; i++) {
                sum += dataArray[i];
              }
              const avg = sum / dataArray.length;
              const level = Math.min(100, Math.round((avg / 128) * 100));
              setAudioLevel(level);
              setIsVoiceDetected(level > 12);
              animationFrameRef.current = requestAnimationFrame(checkVolume);
            };
            animationFrameRef.current = requestAnimationFrame(checkVolume);
          }
        } catch (ctxErr) {
          console.warn('AudioContext volume meter init warning:', ctxErr);
        }
      }
    } catch (micErr: any) {
      console.warn('Microphone access error:', micErr);
      if (micErr.name === 'NotAllowedError' || micErr.name === 'PermissionDeniedError') {
        alert('Microphone access was denied. Please allow microphone access in your browser address bar.');
        stopRecording();
        return;
      }
    }

    // 2. Start elapsed timer
    if (!timerIntervalRef.current) {
      timerIntervalRef.current = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    }

    // 3. Start Browser Real-Time Web Speech Recognition (Live typing if supported)
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setEngineStatus('audio_backup_active');
      return;
    }

    try {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {}
        recognitionRef.current = null;
      }

      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setEngineStatus('listening');
      };

      recognition.onresult = (event: any) => {
        setEngineStatus('typing_live');
        let currentFinal = '';
        let currentInterim = '';

        for (let i = 0; i < event.results.length; i++) {
          const item = event.results[i];
          if (item.isFinal) {
            currentFinal += item[0].transcript + ' ';
          } else {
            currentInterim += item[0].transcript;
          }
        }

        sessionFinalRef.current = currentFinal.trim();

        const base = initialTextRef.current;
        const liveText = [base, sessionFinalRef.current, currentInterim.trim()]
          .filter(Boolean)
          .join(' ')
          .replace(/\s+/g, ' ');

        setTranscript(liveText);
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition status/error:', event.error);
        if (event.error === 'network' || event.error === 'not-allowed' || event.error === 'service-not-allowed') {
          // Terminal failure: Disable Web Speech auto-restart to prevent flickering!
          isWebSpeechAliveRef.current = false;
          setEngineStatus('network_offline');
          try {
            recognition.abort();
          } catch {}
          recognitionRef.current = null;
          return;
        }
        if (event.error === 'audio-capture') {
          setEngineStatus('no_mic_detected');
        }
      };

      recognition.onend = () => {
        // ONLY restart if candidate is still recording AND Web Speech hasn't suffered a fatal network/permission error!
        if (isRecordingIntentRef.current && isWebSpeechAliveRef.current) {
          if (sessionFinalRef.current) {
            initialTextRef.current = [initialTextRef.current, sessionFinalRef.current]
              .filter(Boolean)
              .join(' ')
              .replace(/\s+/g, ' ')
              .trim();
            sessionFinalRef.current = '';
          }

          setTimeout(() => {
            if (isRecordingIntentRef.current && isWebSpeechAliveRef.current && recognitionRef.current) {
              try {
                recognitionRef.current.start();
              } catch (e: any) {
                console.warn('Speech recognition restart handled:', e);
              }
            }
          }, 300);
        }
      };

      recognitionRef.current = recognition;
      try {
        recognition.start();
      } catch (startErr) {
        console.warn('Speech recognition start error:', startErr);
        isWebSpeechAliveRef.current = false;
      }
      // 4. Start periodic background audio sync if browser live speech is offline
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
      }
      syncIntervalRef.current = setInterval(async () => {
        if (!isRecordingIntentRef.current) return;
        // If Web Speech is actively typing live, no need for background sync
        if (isWebSpeechAliveRef.current) return;
        if (!audioChunksRef.current || audioChunksRef.current.length < 2) return;

        const currentMime = mediaRecorderRef.current?.mimeType || 'audio/webm';
        const sliceBlob = new Blob([...audioChunksRef.current], { type: currentMime });
        if (sliceBlob.size > 2000) {
          try {
            const res = await api.transcribeAudio(sliceBlob);
            if (res && res.transcript && res.transcript.trim() && isRecordingIntentRef.current) {
              const liveWords = res.transcript.trim();
              setTranscript(liveWords);
              initialTextRef.current = liveWords;
              setEngineStatus('typing_live');
            }
          } catch {
            // Silently continue recording
          }
        }
      }, 4500);

    } catch (err) {
      console.warn('Web Speech API unavailable:', err);
      setEngineStatus('audio_backup_active');
      isWebSpeechAliveRef.current = false;
    }
  };

  const stopRecording = () => {
    isRecordingIntentRef.current = false;
    isWebSpeechAliveRef.current = false;
    setIsRecording(false);
    setIsVoiceDetected(false);
    setAudioLevel(0);

    if (syncIntervalRef.current) {
      clearInterval(syncIntervalRef.current);
      syncIntervalRef.current = null;
    }

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
      recognitionRef.current = null;
    }

    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }

    // Commit any active final text from Web Speech
    let currentText = transcript.trim();
    if (sessionFinalRef.current) {
      currentText = [initialTextRef.current, sessionFinalRef.current]
        .filter(Boolean)
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim();
      initialTextRef.current = currentText;
      sessionFinalRef.current = '';
      setTranscript(currentText);
    }

    // Stop MediaRecorder and trigger server-side audio transcription
    const mr = mediaRecorderRef.current;
    if (mr && mr.state !== 'inactive') {
      try {
        if (mr.state === 'recording') {
          mr.requestData();
        }
      } catch {}

      mr.onstop = async () => {
        const chunks = [...audioChunksRef.current];
        audioChunksRef.current = [];
        const blob = new Blob(chunks, { type: mr.mimeType || 'audio/webm' });
        recordedBlobRef.current = blob;
        setHasRecordedAudio(blob.size > 800);

        // Cleanup audio stream
        if (mediaStreamRef.current) {
          mediaStreamRef.current.getTracks().forEach((track) => track.stop());
          mediaStreamRef.current = null;
        }
        if (audioContextRef.current) {
          try {
            await audioContextRef.current.close();
          } catch {}
          audioContextRef.current = null;
        }

        // Transcribe audio using backend intelligent chunked speech engine
        if (blob.size > 800) {
          setIsTranscribingBackend(true);
          setTranscriptionNotice({ type: 'info', text: 'Transcribing speech audio with AI engine...' });
          try {
            const res = await api.transcribeAudio(blob);
            if (res && res.transcript && res.transcript.trim()) {
              const fullText = res.transcript.trim();
              setTranscript(fullText);
              initialTextRef.current = fullText;
              setTranscriptionNotice({ type: 'success', text: `Transcribed ${res.words_count || fullText.split(' ').length} words successfully!` });
            } else if (!currentText) {
              setTranscriptionNotice({
                type: 'warn',
                text: 'Audio recorded, but no clear speech was recognized. You can speak louder, type your response, or click "Sample Answer" below.'
              });
            }
          } catch (err: any) {
            console.warn('Backend audio transcription fallback error:', err);
            if (!currentText) {
              setTranscriptionNotice({
                type: 'warn',
                text: 'Could not transcribe audio automatically. You can type your response or click "Sample Answer".'
              });
            }
          } finally {
            setIsTranscribingBackend(false);
          }
        }
      };

      try {
        mr.stop();
      } catch {}
      mediaRecorderRef.current = null;
    } else {
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
        mediaStreamRef.current = null;
      }
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {});
        audioContextRef.current = null;
      }
    }
  };

  const handleManualTranscribe = async () => {
    if (!recordedBlobRef.current) return;
    setIsTranscribingBackend(true);
    setTranscriptionNotice({ type: 'info', text: 'Re-transcribing audio with AI engine...' });
    try {
      const res = await api.transcribeAudio(recordedBlobRef.current);
      if (res && res.transcript && res.transcript.trim()) {
        const fullText = res.transcript.trim();
        setTranscript(fullText);
        initialTextRef.current = fullText;
        setTranscriptionNotice({ type: 'success', text: `Transcribed ${res.words_count || fullText.split(' ').length} words successfully!` });
      } else {
        setTranscriptionNotice({
          type: 'warn',
          text: 'No distinct speech detected in audio. Please speak louder, type your response, or click "Sample Answer".'
        });
      }
    } catch (err: any) {
      setTranscriptionNotice({
        type: 'warn',
        text: 'Transcription error: ' + (err.message || 'Could not process audio')
      });
    } finally {
      setIsTranscribingBackend(false);
    }
  };

  const handleInsertSampleAnswer = () => {
    if (!currentQuestion) return;
    const qText = (currentQuestion.question || '').toLowerCase();
    const cat = (currentQuestion.category || '').toLowerCase();
    let sample = '';

    if (qText.includes('conflict') || qText.includes('disagreement')) {
      sample = "During our core platform redesign, our lead frontend developer and backend engineer strongly disagreed on whether to use GraphQL or standard REST endpoints. As the senior engineer, I needed to resolve the deadlock without slowing down our sprint velocity. I set up an objective evaluation spike where both engineers spent one afternoon benchmarking request latency, caching feasibility with Redis, and schema evolution overhead. The empirical metrics demonstrated that REST with HTTP/2 multiplexing delivered 35% lower serialization latency for our high-throughput read workloads. Both engineers reviewed the performance data and agreed on REST with typed OpenAPI specs. We completed the migration on schedule with zero customer-impacting regressions.";
    } else if (cat.includes('tech') || qText.includes('api') || qText.includes('database') || qText.includes('performance')) {
      sample = "In my recent role, our production database began timing out during peak traffic spikes, causing p99 latency to exceed 450ms. I was tasked with identifying root causes and stabilizing the system. Using query profiling and slow-query logs, I identified several unindexed foreign-key joins in our transactions table. I implemented composite B-tree indexes, introduced Redis caching for hot read paths with a 5-minute TTL, and routed analytics queries to a dedicated read-replica. This reduced database CPU utilization by 50% and dropped p99 response times down to 42ms.";
    } else if (cat.includes('system') || qText.includes('design') || qText.includes('scalable') || qText.includes('architect')) {
      sample = "When designing our asynchronous notification processing pipeline, we needed to ensure zero message loss while processing over 10,000 notifications per second across push, SMS, and email. I architected an event-driven system leveraging Apache Kafka for partitioned topic streaming, backed by Redis for idempotency key deduplication. I also implemented a dead-letter queue with exponential backoff retries for third-party provider failures. This architecture achieved 99.99% uptime and processed over 50 million monthly messages seamlessly.";
    } else {
      sample = "At my previous employer, we were faced with an aggressive four-week deadline to deliver a SOC2-compliant role-based access control system. As the project owner, my responsibility was to lead the architecture and coordinate delivery across three time zones. I drafted the technical specifications, decomposed work into modular PRs, and introduced automated policy-as-code linting into our GitHub Actions CI pipeline. By prioritizing critical paths and daily async check-ins, we delivered the security architecture two days ahead of schedule, passing the compliance audit on our initial evaluation.";
    }

    setTranscript(sample);
    initialTextRef.current = sample;
    sessionFinalRef.current = '';
    setTranscriptionNotice({ type: 'info', text: 'Sample STAR answer inserted! You can customize it or click Submit.' });
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopTTS();
      stopRecording();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

      const firstQ: InterviewQuestionItem =
        data.first_question ||
        (data as any).initial_question || {
          question_id: 'q_default_1',
          turn: 1,
          question: `Could you walk me through your technical background and a challenging project you architected as a ${roleTitle}?`,
          category: 'Behavioral & Architecture',
          why_asked: `Evaluates communication clarity and hands-on execution for ${roleTitle}.`,
          star_guidance: 'Structure your response using Situation, Task, Action, and measurable Results.'
        };

      setSessionId(data.session_id);
      setCurrentTurn(data.current_turn || (data as any).turn_no || 1);
      setCurrentQuestion(firstQ);

      if (ttsEnabled && firstQ.question) {
        setTimeout(() => speakText(firstQ.question), 400);
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
        question: currentQuestion.question,
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
        star_evaluation: result.star_evaluation,
        suitable_answers: result.suitable_answers || []
      };

      setTurnsHistory((prev) => [...prev, turnRecord]);

      setLatestTurnEval({
        turn: currentTurn,
        metrics: result.speech_metrics,
        star: result.star_evaluation,
        suitableAnswers: result.suitable_answers || [],
        followUp: result.follow_up_prompt,
        nextQuestion: result.next_question,
        isLastTurn: Boolean(result.is_last_turn || (result as any).is_final_turn || currentTurn >= totalQuestions)
      });
      setActiveModelIndex(0);

      // Clear for next turn
      setTranscript('');
      initialTextRef.current = '';
      sessionFinalRef.current = '';
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
      initialTextRef.current = '';
      sessionFinalRef.current = '';
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
      {sessionId && !currentQuestion && (
        <div className="p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center space-y-3">
          <Loader2 className="w-6 h-6 animate-spin text-indigo-600 dark:text-indigo-400" />
          <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            Preparing your interview stage...
          </p>
        </div>
      )}

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

              {/* Exemplary Suitable Model Answers for this Question */}
              {latestTurnEval.suitableAnswers && latestTurnEval.suitableAnswers.length > 0 && (
                <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
                      <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">
                        Suitable Model Answers ({latestTurnEval.suitableAnswers.length} Benchmark Variations)
                      </h4>
                    </div>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                      Switch between approaches to compare ideal phrasing
                    </span>
                  </div>

                  {/* Variation Selectors */}
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap gap-2">
                      {latestTurnEval.suitableAnswers.map((ans, idx) => {
                        const isSelected = activeModelIndex === idx;
                        return (
                          <button
                            key={ans.id || idx}
                            type="button"
                            onClick={() => setActiveModelIndex(idx)}
                            className={`px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                              isSelected
                                ? 'bg-indigo-600 text-white shadow-xs ring-2 ring-indigo-500/20'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                            }`}
                          >
                            <span>{ans.label}</span>
                            <span
                              className={`px-1.5 py-0.5 rounded-md text-[9px] font-extrabold uppercase ${
                                isSelected
                                  ? 'bg-indigo-800 text-white'
                                  : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                              }`}
                            >
                              {ans.tag}
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    <div className="flex items-center gap-1 self-end sm:self-auto">
                      <button
                        type="button"
                        onClick={() => setActiveModelIndex(Math.max(0, activeModelIndex - 1))}
                        disabled={activeModelIndex <= 0}
                        className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 cursor-pointer transition-colors"
                        title="Previous approach"
                      >
                        <ChevronLeft className="w-3.5 h-3.5" />
                      </button>
                      <span className="text-[11px] font-semibold text-slate-500 px-1">
                        {activeModelIndex + 1} / {latestTurnEval.suitableAnswers.length}
                      </span>
                      <button
                        type="button"
                        onClick={() => setActiveModelIndex(Math.min(latestTurnEval.suitableAnswers.length - 1, activeModelIndex + 1))}
                        disabled={activeModelIndex >= latestTurnEval.suitableAnswers.length - 1}
                        className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 cursor-pointer transition-colors"
                        title="Next approach"
                      >
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Active Selected Model Answer */}
                  {latestTurnEval.suitableAnswers[activeModelIndex] && (
                    <div className="p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/80 space-y-3.5 text-xs animate-in fade-in">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <span className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm">
                            {latestTurnEval.suitableAnswers[activeModelIndex].label}
                          </span>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                            {latestTurnEval.suitableAnswers[activeModelIndex].summary}
                          </p>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => speakText(latestTurnEval.suitableAnswers[activeModelIndex].spoken_script)}
                            className="px-3 py-1.5 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 font-semibold text-xs flex items-center gap-1.5 hover:bg-indigo-50 dark:hover:bg-indigo-950 transition-colors cursor-pointer"
                            title="Hear this model answer spoken aloud with AI Voice"
                          >
                            <Volume2 className="w-3.5 h-3.5" />
                            <span>Listen Aloud</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(latestTurnEval.suitableAnswers[activeModelIndex].spoken_script);
                              setCopiedModelScript(true);
                              setTimeout(() => setCopiedModelScript(false), 2000);
                            }}
                            className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 font-semibold text-xs flex items-center gap-1.5 hover:bg-slate-50 transition-colors cursor-pointer"
                          >
                            {copiedModelScript ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                            <span>{copiedModelScript ? 'Copied' : 'Copy'}</span>
                          </button>
                        </div>
                      </div>

                      {/* Complete Spoken Script Blockquote */}
                      <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 leading-relaxed text-slate-800 dark:text-slate-200 font-medium italic">
                        &quot;{latestTurnEval.suitableAnswers[activeModelIndex].spoken_script}&quot;
                      </div>

                      {/* 4-Pill STAR Breakdown */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 pt-1">
                        <div className="p-3 rounded-xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/40">
                          <span className="font-bold text-[10px] uppercase text-blue-700 dark:text-blue-300 block mb-1">
                            [S] Situation
                          </span>
                          <p className="text-[11px] text-slate-700 dark:text-slate-300 leading-snug">
                            {latestTurnEval.suitableAnswers[activeModelIndex].star_breakdown.situation}
                          </p>
                        </div>

                        <div className="p-3 rounded-xl bg-purple-50/50 dark:bg-purple-950/20 border border-purple-100 dark:border-purple-900/40">
                          <span className="font-bold text-[10px] uppercase text-purple-700 dark:text-purple-300 block mb-1">
                            [T] Task
                          </span>
                          <p className="text-[11px] text-slate-700 dark:text-slate-300 leading-snug">
                            {latestTurnEval.suitableAnswers[activeModelIndex].star_breakdown.task}
                          </p>
                        </div>

                        <div className="p-3 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40">
                          <span className="font-bold text-[10px] uppercase text-emerald-700 dark:text-emerald-300 block mb-1">
                            [A] Action
                          </span>
                          <p className="text-[11px] text-slate-700 dark:text-slate-300 leading-snug">
                            {latestTurnEval.suitableAnswers[activeModelIndex].star_breakdown.action}
                          </p>
                        </div>

                        <div className="p-3 rounded-xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/40">
                          <span className="font-bold text-[10px] uppercase text-amber-700 dark:text-amber-300 block mb-1">
                            [R] Result
                          </span>
                          <p className="text-[11px] text-slate-700 dark:text-slate-300 leading-snug">
                            {latestTurnEval.suitableAnswers[activeModelIndex].star_breakdown.result}
                          </p>
                        </div>
                      </div>

                      {/* Pro Tips Takeaways */}
                      {latestTurnEval.suitableAnswers[activeModelIndex].pro_tips &&
                        latestTurnEval.suitableAnswers[activeModelIndex].pro_tips.length > 0 && (
                          <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800 space-y-1.5">
                            <span className="font-bold text-[11px] uppercase tracking-wider text-slate-600 dark:text-slate-400">
                              Why this answer scores 100% on the rubric:
                            </span>
                            <ul className="space-y-1 text-[11px] text-slate-600 dark:text-slate-400">
                              {latestTurnEval.suitableAnswers[activeModelIndex].pro_tips.map((tip, idx) => (
                                <li key={idx} className="flex items-start gap-1.5">
                                  <span className="text-emerald-500 font-bold">✓</span>
                                  <span>{tip}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                    </div>
                  )}
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

                  {isRecording && (
                    <>
                      <span>•</span>
                      <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800">
                        <span className="text-[10px] font-extrabold uppercase text-emerald-700 dark:text-emerald-300">MIC:</span>
                        <div className="flex items-end gap-0.5 h-3 w-7">
                          <span className="w-1 bg-emerald-500 rounded-xs transition-all duration-75" style={{ height: `${Math.max(20, Math.min(100, audioLevel * 1.5))}%` }} />
                          <span className="w-1 bg-emerald-500 rounded-xs transition-all duration-75" style={{ height: `${Math.max(20, Math.min(100, audioLevel * 2.0))}%` }} />
                          <span className="w-1 bg-emerald-500 rounded-xs transition-all duration-75" style={{ height: `${Math.max(20, Math.min(100, audioLevel * 1.2))}%` }} />
                          <span className="w-1 bg-emerald-500 rounded-xs transition-all duration-75" style={{ height: `${Math.max(20, Math.min(100, audioLevel * 1.8))}%` }} />
                        </div>
                        <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300">
                          {audioLevel > 10 ? `${audioLevel}%` : 'Speak...'}
                        </span>
                      </div>
                    </>
                  )}
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

              {/* Live Status Notices & Feedback */}
              {transcriptionNotice && (
                <div
                  className={`p-3 rounded-2xl flex items-center justify-between gap-3 text-xs font-semibold shadow-xs transition-all ${
                    transcriptionNotice.type === 'success'
                      ? 'bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
                      : transcriptionNotice.type === 'info'
                      ? 'bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-indigo-800 dark:text-indigo-300'
                      : 'bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {transcriptionNotice.type === 'info' ? (
                      <Loader2 className="w-4 h-4 animate-spin shrink-0 text-indigo-600 dark:text-indigo-400" />
                    ) : transcriptionNotice.type === 'success' ? (
                      <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                    ) : (
                      <AlertCircle className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
                    )}
                    <span>{transcriptionNotice.text}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setTranscriptionNotice(null)}
                    className="text-xs opacity-70 hover:opacity-100 cursor-pointer"
                  >
                    ✕
                  </button>
                </div>
              )}

              {/* Status alerts if browser speech engine is offline */}
              {isTranscribingBackend && !transcriptionNotice && (
                <div className="p-3.5 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800/80 flex items-center gap-3 text-xs text-indigo-700 dark:text-indigo-300 font-semibold shadow-xs animate-pulse">
                  <Loader2 className="w-4 h-4 animate-spin text-indigo-600 dark:text-indigo-400 shrink-0" />
                  <div>
                    <p className="font-bold">AI Speech-to-Text Processing</p>
                    <p className="text-[11px] text-indigo-600/80 dark:text-indigo-400/80 font-normal">
                      Transcribing your recorded answer from high-definition audio... This takes just a couple seconds.
                    </p>
                  </div>
                </div>
              )}

              {engineStatus === 'network_offline' && isRecording && (
                <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 text-[11px] text-amber-800 dark:text-amber-300 flex items-center gap-2">
                  <span className="font-bold">ℹ️ Live Speech Sync:</span>
                  <span>Audio is continuously recording and streaming to server for transcription. Speak clearly!</span>
                </div>
              )}

              {/* Transcript Text Area (editable) */}
              <div className="relative">
                <textarea
                  rows={5}
                  value={transcript}
                  onChange={(e) => {
                    setTranscript(e.target.value);
                    initialTextRef.current = e.target.value;
                    sessionFinalRef.current = '';
                  }}
                  placeholder="Click 'Record Answer' below to speak your response aloud, or type your answer here..."
                  className="w-full p-4 rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs sm:text-sm leading-relaxed focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />

                {isRecording && (
                  <div className="absolute right-3 top-3 flex items-center gap-2 px-2.5 py-1 rounded-full bg-rose-50 dark:bg-rose-950/80 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-300 text-[11px] font-bold shadow-xs">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        isVoiceDetected ? 'bg-emerald-500 scale-125 transition-transform' : 'bg-rose-500 animate-pulse'
                      }`}
                    />
                    <span>
                      {engineStatus === 'typing_live'
                        ? 'Live Typing...'
                        : isVoiceDetected
                        ? `Voice Detected (${audioLevel}%)`
                        : 'Listening (Speak now)...'}
                    </span>
                  </div>
                )}
              </div>

              {/* Interaction Controls */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                <div className="flex items-center gap-2">
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

                  <button
                    type="button"
                    onClick={handleInsertSampleAnswer}
                    disabled={isRecording}
                    className="px-3.5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold cursor-pointer flex items-center gap-1.5 transition-colors border border-slate-200 dark:border-slate-700"
                    title="Insert a high-scoring sample STAR answer tailored to this question"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    <span>Sample Answer (STAR)</span>
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  {!transcript.trim() && (hasRecordedAudio || recordedBlobRef.current) && (
                    <button
                      type="button"
                      onClick={handleManualTranscribe}
                      disabled={isTranscribingBackend}
                      className="px-3.5 py-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 text-xs font-bold cursor-pointer flex items-center gap-1.5 transition-colors"
                      title="Re-run AI speech-to-text on your last recorded audio"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>{isTranscribingBackend ? 'Transcribing...' : 'Transcribe Audio with AI'}</span>
                    </button>
                  )}

                  {transcript.trim() && (
                    <button
                      type="button"
                      onClick={() => {
                        setTranscript('');
                        initialTextRef.current = '';
                        sessionFinalRef.current = '';
                        setTranscriptionNotice(null);
                      }}
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
