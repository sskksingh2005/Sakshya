import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Upload, Hash, Loader2, Check, AlertCircle, FileText, Info, MessageSquareText, Mic, Square, RotateCcw, Volume2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import {
  uploadEvidence,
  classifyIncident,
  computeSHA256,
  detectEscalation,
  parseWhatsAppChat,
  analyzeWhatsAppChat,
  type WhatsAppImportData,
} from '@/lib/utils';
import type { ClassifyResult, Incident } from '@/types';
import { AppNav } from '@/components/AppNav';
import { Button } from '@/components/ui/Button';

const CATEGORIES = [
  { value: '', label: 'Let AI suggest a category' },
  { value: 'verbal_abuse', label: 'Verbal / Emotional Abuse' },
  { value: 'threat', label: 'Threat / Intimidation' },
  { value: 'physical_abuse', label: 'Physical Abuse' },
  { value: 'economic_abuse', label: 'Economic Abuse' },
  { value: 'stalking_control', label: 'Stalking / Control' },
];

interface UploadedFile {
  file: File;
  hash: string;
  consentStatus: string;
}

export function AddIncident() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const whatsappFileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingStartedAtRef = useRef<number | null>(null);
  const audioUrlRef = useRef<string | null>(null);
  const speechRecognitionRef = useRef<any>(null);
  const speechTranscriptRef = useRef('');
  const stoppingSpeechRecognitionRef = useRef(false);

  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [hashing, setHashing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [classifying, setClassifying] = useState(false);
  const [analyzingWhatsApp, setAnalyzingWhatsApp] = useState(false);
  const [classifyResult, setClassifyResult] = useState<ClassifyResult | null>(null);
  const [classifyError, setClassifyError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [whatsappImport, setWhatsappImport] = useState<WhatsAppImportData | null>(null);
  const [whatsappImportError, setWhatsappImportError] = useState<string | null>(null);
  const [step, setStep] = useState<'form' | 'review'>('form');
  const [recording, setRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [transcribing, setTranscribing] = useState(false);
  const [speechTranscript, setSpeechTranscript] = useState('');
  const [voiceError, setVoiceError] = useState<string | null>(null);

  useEffect(() => {
    if (!recording) return;

    const timer = window.setInterval(() => {
      if (recordingStartedAtRef.current) {
        setRecordingDuration(
          Math.floor(
            (Date.now() - recordingStartedAtRef.current) / 1000
          )
        );
      }
    }, 250);

    return () => window.clearInterval(timer);
  }, [recording]);

  useEffect(() => {
    return () => {
      mediaStreamRef.current?.getTracks().forEach((track) => track.stop());

      if (audioUrlRef.current) {
        URL.revokeObjectURL(audioUrlRef.current);
      }
    };
  }, []);

  const formatDuration = (seconds: number) =>
    `${Math.floor(seconds / 60)
      .toString()
      .padStart(2, '0')}:${(seconds % 60)
      .toString()
      .padStart(2, '0')}`;

  const startRecording = async () => {
    setVoiceError(null);

    if (!navigator.mediaDevices?.getUserMedia) {
      setVoiceError(
        'Microphone recording is not supported by this browser.'
      );
      return;
    }

    if (!window.MediaRecorder) {
      setVoiceError('Recording is not supported by this browser.');
      return;
    }

    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setVoiceError(
        'Speech-to-text is not supported in this browser. Please use Google Chrome.'
      );
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });

      const mimeType = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/mp4',
        'audio/ogg;codecs=opus',
      ].find((type) => MediaRecorder.isTypeSupported(type));

      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);

      const recognition = new SpeechRecognition();

      recognition.lang = 'en-IN';
      recognition.continuous = true;
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      speechTranscriptRef.current = '';
      stoppingSpeechRecognitionRef.current = false;
      speechRecognitionRef.current = recognition;

      recognition.onresult = (event: any) => {
        let newText = '';

        for (
          let i = event.resultIndex;
          i < event.results.length;
          i += 1
        ) {
          if (event.results[i].isFinal) {
            newText += event.results[i][0].transcript + ' ';
          }
        }

        const cleanedText = newText.trim();

        if (!cleanedText) return;

        speechTranscriptRef.current =
          `${speechTranscriptRef.current} ${cleanedText}`.trim();

        setSpeechTranscript(speechTranscriptRef.current);

        setDescription(speechTranscriptRef.current);
      };

      recognition.onerror = (event: any) => {
        console.error(
          'Speech recognition error:',
          event.error
        );

        if (event.error === 'not-allowed') {
          setVoiceError(
            'Microphone permission was denied. Please allow microphone access and try again.'
          );
        } else if (event.error === 'no-speech') {
          // Silence is not treated as a fatal error.
        } else if (event.error === 'network') {
          setVoiceError(
            'Speech-to-text needs an internet connection in this browser. Your audio recording is still available.'
          );
        } else {
          setVoiceError(
            'Speech-to-text could not continue. Your audio recording is still available.'
          );
        }
      };

      recognition.onend = () => {
        if (
          !stoppingSpeechRecognitionRef.current &&
          mediaRecorderRef.current?.state === 'recording'
        ) {
          try {
            recognition.start();
          } catch {
            // Recognition may already be starting.
          }
        }
      };

      mediaStreamRef.current = stream;
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];
      recordingStartedAtRef.current = Date.now();

      setRecordingDuration(0);
      setRecording(true);

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onerror = () => {
        try {
          recognition.stop();
        } catch {
          // Recognition may already have stopped.
        }

        setVoiceError(
          'Recording could not be completed. Please try again.'
        );

        stream.getTracks().forEach((track) => track.stop());

        mediaStreamRef.current = null;
        speechRecognitionRef.current = null;

        setRecording(false);
      };

      recorder.onstop = () => {
        stoppingSpeechRecognitionRef.current = true;

        try {
          recognition.stop();
        } catch {
          // Recognition may already have stopped.
        }

        stream.getTracks().forEach((track) => track.stop());

        mediaStreamRef.current = null;
        speechRecognitionRef.current = null;

        const blob = new Blob(audioChunksRef.current, {
          type: recorder.mimeType || 'audio/webm',
        });

        setRecording(false);

        if (blob.size === 0) {
          setVoiceError(
            'The recording was empty. Please try again.'
          );
          return;
        }

        if (audioUrlRef.current) {
          URL.revokeObjectURL(audioUrlRef.current);
        }

        const nextUrl = URL.createObjectURL(blob);

        audioUrlRef.current = nextUrl;

        setAudioBlob(blob);
        setAudioUrl(nextUrl);

        if (!speechTranscriptRef.current.trim()) {
          setVoiceError(
            'No speech was detected. The audio recording is still available. Please try speaking clearly and re-record.'
          );
        }
      };

      recorder.start();

      try {
        recognition.start();
      } catch (recognitionError) {
        console.error(
          'Unable to start speech recognition:',
          recognitionError
        );

        setVoiceError(
          'Speech-to-text could not start. Your audio recording will still be available.'
        );
      }
    } catch (err) {
      mediaStreamRef.current
        ?.getTracks()
        .forEach((track) => track.stop());

      mediaStreamRef.current = null;
      speechRecognitionRef.current = null;

      setRecording(false);

      setVoiceError(
        err instanceof DOMException &&
        err.name === 'NotAllowedError'
          ? 'Microphone permission was denied.'
          : 'Microphone permission is required to record audio.'
      );
    }
  };

  const stopRecording = () => {
    stoppingSpeechRecognitionRef.current = true;

    if (speechRecognitionRef.current) {
      try {
        speechRecognitionRef.current.stop();
      } catch {
        // Recognition may already have stopped.
      }
    }

    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
    }

    mediaRecorderRef.current = null;
  };

  const resetRecording = () => {
    stoppingSpeechRecognitionRef.current = true;

    if (speechRecognitionRef.current) {
      try {
        speechRecognitionRef.current.abort();
      } catch {
        // Recognition may already have stopped.
      }

      speechRecognitionRef.current = null;
    }

    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
    }

    mediaRecorderRef.current = null;

    mediaStreamRef.current
      ?.getTracks()
      .forEach((track) => track.stop());

    mediaStreamRef.current = null;

    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current);
    }

    audioUrlRef.current = null;
    audioChunksRef.current = [];
    speechTranscriptRef.current = '';

    setSpeechTranscript('');
    setAudioBlob(null);
    setAudioUrl(null);
    setRecordingDuration(0);
    setRecording(false);
    setTranscribing(false);
    setVoiceError(null);
  };

  const handleTranscribe = () => {
    if (transcribing) return;

    const transcript = speechTranscript.trim();

    if (!transcript) {
      setVoiceError(
        'No speech was detected. Please re-record and speak clearly.'
      );
      return;
    }

    setTranscribing(true);
    setVoiceError(null);
    setDescription(transcript);
    setTranscribing(false);
  };

  const handleFileSelect = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const selected = e.target.files;

    if (!selected || selected.length === 0) return;

    setHashing(true);

    const newFiles: UploadedFile[] = [];

    for (const file of Array.from(selected)) {
      if (file.size > 10 * 1024 * 1024) {
        setError(
          `"${file.name}" exceeds 10MB. Please choose a smaller file.`
        );
        continue;
      }

      const hash = await computeSHA256(file);
      const isAudio = file.type.startsWith('audio/');

      newFiles.push({
        file,
        hash,
        consentStatus: isAudio ? 'unsure' : 'obtained',
      });
    }

    setFiles((prev) => [...prev, ...newFiles]);

    setHashing(false);

    e.target.value = '';
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const updateConsent = (
    index: number,
    consent: string
  ) => {
    setFiles((prev) =>
      prev.map((f, i) =>
        i === index
          ? { ...f, consentStatus: consent }
          : f
      )
    );
  };

  const handleWhatsAppFileSelect = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const selected = e.target.files;

    if (!selected || selected.length === 0) return;

    const file = selected[0];

    if (!file.name.toLowerCase().endsWith('.txt')) {
      setWhatsappImportError(
        'Please choose a plain-text WhatsApp export (.txt) file.'
      );

      e.target.value = '';

      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setWhatsappImportError(
        'This chat export is too large. Please choose a smaller .txt file under 5MB.'
      );

      e.target.value = '';

      return;
    }

    try {
      const content = await file.text();

      const parsed = parseWhatsAppChat(content);

      if (!parsed || parsed.messages.length === 0) {
        setWhatsappImportError(
          'This file does not look like a valid WhatsApp export or contains no readable messages.'
        );

        e.target.value = '';

        return;
      }

      const hash = await computeSHA256(file);

      const whatsappFileEntry: UploadedFile = {
        file,
        hash,
        consentStatus: 'obtained',
      };

      setFiles((prev) => {
        const exists = prev.some(
          (item) =>
            item.file.name === file.name &&
            item.file.size === file.size
        );

        return exists
          ? prev
          : [...prev, whatsappFileEntry];
      });

      setWhatsappImport({
        ...parsed,
        fileName: file.name,
      });

      setWhatsappImportError(null);
      setError(null);

      if (parsed.dateRange?.start) {
        setDate(parsed.dateRange.start);
      }
    } catch {
      setWhatsappImportError(
        'This WhatsApp export could not be read. Please try a different file.'
      );
    } finally {
      e.target.value = '';
    }
  };

  const handleAnalyzeWhatsApp = async () => {
    if (!whatsappImport) {
      setWhatsappImportError(
        'Import a WhatsApp chat first.'
      );
      return;
    }

    setAnalyzingWhatsApp(true);
    setWhatsappImportError(null);
    setError(null);

    try {
      const result = await analyzeWhatsAppChat(
        whatsappImport,
        category || null
      );

      if (!result.description) {
        setWhatsappImportError(
          result.error ||
            'Unable to analyze this WhatsApp export.'
        );

        return;
      }

      setDescription(result.description);

      if (result.category) {
        setCategory(result.category);
      }

      if (result.date) {
        setDate(result.date);
      }

      setClassifyResult({
        category:
          result.category ||
          category ||
          'verbal_abuse',
        severity_score:
          result.severity_score || 1,
        summary: result.summary,
        people_involved:
          result.people_involved,
        risk_keywords_detected:
          result.risk_keywords_detected,
        fallback_used: false,
      });

      setClassifyError(result.error);
    } catch {
      setWhatsappImportError(
        'Unable to generate a summary from this WhatsApp export. Please review the imported messages manually.'
      );
    } finally {
      setAnalyzingWhatsApp(false);
    }
  };

  const handleSubmit = async (
    e: React.FormEvent
  ) => {
    e.preventDefault();

    if (!description.trim()) {
      setError(
        'Please describe what happened.'
      );
      return;
    }

    if (!navigator.onLine) {
      setError(
        "You're offline right now — saving new incidents requires an internet connection."
      );
      return;
    }

    setError(null);
    setClassifying(true);
    setClassifyError(null);

    const {
      result,
      error: classifyErr,
    } = await classifyIncident(
      description,
      category || null
    );

    setClassifying(false);

    if (classifyErr || !result) {
      setClassifyError(
        classifyErr ||
          'AI classification was unavailable'
      );

      setClassifyResult(null);
    } else {
      setClassifyResult(result);

      if (!category) {
        setCategory(result.category);
      }
    }

    setStep('review');
  };

  const handleConfirm = async () => {
    if (!user) return;

    setUploading(true);
    setError(null);

    try {
      const finalCategory =
        category ||
        classifyResult?.category ||
        'verbal_abuse';

      const finalSeverity =
        classifyResult?.severity_score || 1;

      const finalSummary =
        classifyResult?.summary ||
        description.substring(0, 200);

      const finalPeople =
        classifyResult?.people_involved || [];

      const finalKeywords =
        classifyResult?.risk_keywords_detected || [];

      const {
        data: incData,
        error: incError,
      } = await supabase
        .from('incidents')
        .insert({
          incident_date: date,
          description,
          category: finalCategory,
          severity_score: finalSeverity,
          ai_summary: finalSummary,
          people_involved: finalPeople,
          risk_keywords_detected: finalKeywords,
          escalation_flag: false,
        })
        .select()
        .single();

      if (incError) {
        throw new Error(incError.message);
      }

      if (!incData) {
        throw new Error(
          'Failed to create incident record'
        );
      }

      if (audioBlob) {
        const extension =
          audioBlob.type.includes('mp4')
            ? 'm4a'
            : audioBlob.type.includes('ogg')
              ? 'ogg'
              : 'webm';

        const recordingFile = new File(
          [audioBlob],
          `voice-recording-${Date.now()}.${extension}`,
          {
            type:
              audioBlob.type ||
              'audio/webm',
          }
        );

        const {
          error: recordingError,
        } = await uploadEvidence(
          recordingFile,
          incData.id,
          user.id,
          'unsure'
        );

        if (recordingError) {
          throw new Error(
            `Audio upload failed. ${recordingError}`
          );
        }
      }

      for (const f of files) {
        const { error: evErr } =
          await uploadEvidence(
            f.file,
            incData.id,
            user.id,
            f.consentStatus
          );

        if (evErr) {
          console.error(
            'Evidence upload error:',
            evErr
          );
        }
      }

      const { data: allIncidents } =
        await supabase
          .from('incidents')
          .select('*')
          .order('incident_date', {
            ascending: false,
          });

      if (
        allIncidents &&
        allIncidents.length >= 2
      ) {
        const escalation =
          detectEscalation(
            allIncidents as Incident[]
          );

        if (escalation.isEscalating) {
          await supabase
            .from('incidents')
            .update({
              escalation_flag: true,
            })
            .eq('id', incData.id);
        }
      }

      navigate(
        `/incidents/${incData.id}`
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Something went wrong. Please try again.'
      );

      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-blush/60">
      <AppNav />

      <main className="md:ml-60 pb-24 md:pb-8">
        <div className="max-w-2xl mx-auto p-4 md:p-8">

          <button
            onClick={() =>
              navigate('/dashboard')
            }
            className="flex items-center gap-1.5 text-xs font-semibold text-muted hover:text-primary transition-colors mb-4"
          >
            <ArrowLeft size={16} />
            Back to Dashboard
          </button>

          <h1 className="font-heading text-2xl font-bold text-primary mb-1">
            {step === 'form'
              ? 'Add Incident Record'
              : 'Review & Confirm Structuring'}
          </h1>

          <p className="text-xs text-muted mb-6">
            {step === 'form'
              ? 'Document what happened safely. Attach photos, audio, or documents as cryptographic evidence.'
              : 'Review the AI-assisted incident structuring before committing to your encrypted vault.'}
          </p>

          {error && (
            <div className="mb-4 rounded-xl bg-danger/10 border border-danger/20 p-3 text-xs text-danger flex items-start gap-2">
              <AlertCircle
                size={16}
                className="shrink-0 mt-0.5"
              />

              <span>{error}</span>
            </div>
          )}

          {step === 'form' ? (
            <form
              onSubmit={handleSubmit}
              className="space-y-5"
            >

              <div className="rounded-2xl bg-warmwhite border border-blush p-5 shadow-sm space-y-4">

                <div>
                  <label className="block text-xs font-semibold text-ink mb-1.5">
                    Date of Incident
                  </label>

                  <input
                    type="date"
                    value={date}
                    onChange={(e) =>
                      setDate(e.target.value)
                    }
                    required
                    max={
                      new Date()
                        .toISOString()
                        .split('T')[0]
                    }
                    className="w-full rounded-xl border border-blush bg-blush/20 px-3.5 py-2.5 text-sm text-ink focus:border-accent focus:bg-warmwhite dark:focus:bg-primary-dark/30 focus:outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-ink mb-1.5">
                    What happened?{' '}
                    <span className="text-muted font-normal">
                      (in your own words)
                    </span>
                  </label>

                  <textarea
                    value={description}
                    onChange={(e) =>
                      setDescription(
                        e.target.value
                      )
                    }
                    required
                    rows={5}
                    className="w-full rounded-xl border border-blush bg-blush/20 px-3.5 py-2.5 text-sm text-ink focus:border-accent focus:bg-warmwhite dark:focus:bg-primary-dark/30 focus:outline-none resize-y leading-relaxed transition-all"
                    placeholder="Describe the incident as clearly as you recall. This narrative will be preserved exactly as written."
                  />

                  <div className="mt-3 rounded-xl border border-blush bg-blush/20 p-3 space-y-3">

                    <div className="flex flex-wrap items-center justify-between gap-2">

                      <div className="flex items-center gap-2">
                        <Mic
                          size={16}
                          className="text-secondary"
                        />

                        <span className="text-xs font-semibold text-ink">
                          Voice recording
                        </span>
                      </div>

                      {recording && (
                        <span
                          className="text-xs font-semibold text-danger"
                          aria-live="polite"
                        >
                          <span aria-hidden="true">
                            ●
                          </span>{' '}
                          Recording{' '}
                          {formatDuration(
                            recordingDuration
                          )}
                        </span>
                      )}
                    </div>

                    {!recording &&
                      !audioUrl && (
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={
                            startRecording
                          }
                          leftIcon={
                            <Mic size={14} />
                          }
                        >
                          Record Voice
                        </Button>
                      )}

                    {recording && (
                      <Button
                        type="button"
                        variant="danger"
                        size="sm"
                        onClick={
                          stopRecording
                        }
                        leftIcon={
                          <Square size={14} />
                        }
                      >
                        Stop Recording
                      </Button>
                    )}

                    {!recording &&
                      audioUrl && (
                        <div className="space-y-3">

                          <div className="flex flex-wrap items-center gap-2">

                            <audio
                              src={audioUrl}
                              controls
                              className="h-9 max-w-full"
                              aria-label="Recorded incident audio"
                            />

                            <span className="text-[11px] text-muted">
                              Duration{' '}
                              {formatDuration(
                                recordingDuration
                              )}
                            </span>
                          </div>

                          <div className="flex flex-wrap gap-2">

                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={
                                resetRecording
                              }
                              leftIcon={
                                <RotateCcw
                                  size={14}
                                />
                              }
                            >
                              Re-record
                            </Button>

                            <Button
                              type="button"
                              variant="secondary"
                              size="sm"
                              onClick={
                                handleTranscribe
                              }
                              disabled={
                                !speechTranscript.trim() ||
                                transcribing
                              }
                              loading={
                                transcribing
                              }
                              leftIcon={
                                <Volume2
                                  size={14}
                                />
                              }
                            >
                              {transcribing
                                ? 'Adding text...'
                                : 'Use Speech Text'}
                            </Button>
                          </div>
                        </div>
                      )}

                    {voiceError && (
                      <p
                        className="text-xs text-danger"
                        role="alert"
                      >
                        {voiceError}
                      </p>
                    )}

                    <p className="text-[11px] text-muted">
                      Speak while recording. Speech-to-text runs in your browser and the recognized text is added to the editable description.
                    </p>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-ink mb-1.5">
                    Category
                  </label>

                  <select
                    value={category}
                    onChange={(e) =>
                      setCategory(
                        e.target.value
                      )
                    }
                    className="w-full rounded-xl border border-blush bg-blush/20 px-3.5 py-2.5 text-sm text-ink focus:border-accent focus:bg-warmwhite dark:focus:bg-primary-dark/30 focus:outline-none transition-all"
                  >
                    {CATEGORIES.map((c) => (
                      <option
                        key={c.value}
                        value={c.value}
                      >
                        {c.label}
                      </option>
                    ))}
                  </select>

                  <p className="text-[11px] text-muted mt-1">
                    AI-assisted classification will analyze and suggest details based on your account.
                  </p>
                </div>
              </div>

              <div className="rounded-2xl bg-warmwhite border border-blush p-5 shadow-sm space-y-3">

                <div className="flex items-center justify-between gap-3">

                  <label className="block text-xs font-semibold text-ink">
                    WhatsApp Import
                  </label>

                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() =>
                      whatsappFileInputRef.current?.click()
                    }
                  >
                    Import WhatsApp Chat
                  </Button>
                </div>

                <input
                  ref={
                    whatsappFileInputRef
                  }
                  type="file"
                  accept=".txt,text/plain"
                  onChange={
                    handleWhatsAppFileSelect
                  }
                  className="hidden"
                />

                <p className="text-[11px] text-muted">
                  Import a plain-text WhatsApp export to review the messages, then generate a safe incident description based on the actual chat content.
                </p>

                {whatsappImportError && (
                  <div className="rounded-xl bg-danger/10 border border-danger/20 p-3 text-xs text-danger flex items-start gap-2">
                    <AlertCircle
                      size={14}
                      className="shrink-0 mt-0.5"
                    />

                    <span>
                      {whatsappImportError}
                    </span>
                  </div>
                )}

                {whatsappImport && (
                  <div className="rounded-xl bg-blush/30 border border-blush p-4 space-y-3">

                    <div className="flex items-start justify-between gap-3">

                      <div className="min-w-0 flex-1">

                        <p className="text-xs font-semibold text-ink truncate">
                          {whatsappImport.fileName}
                        </p>

                        <p className="text-[11px] text-muted mt-1">
                          {
                            whatsappImport
                              .messages
                              .length
                          }{' '}
                          parsed messages

                          {whatsappImport
                            .participants
                            .length > 0
                            ? ` • Participants: ${whatsappImport.participants.join(', ')}`
                            : ''}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          setWhatsappImport(
                            null
                          )
                        }
                        className="text-[11px] text-danger font-semibold hover:underline shrink-0"
                      >
                        Remove
                      </button>
                    </div>

                    {whatsappImport.dateRange && (
                      <p className="text-[11px] text-muted">
                        Date range:{' '}
                        {whatsappImport
                          .dateRange.start ||
                          'Unknown'}{' '}
                        to{' '}
                        {whatsappImport
                          .dateRange.end ||
                          'Unknown'}
                      </p>
                    )}

                    <div className="rounded-lg bg-warmwhite border border-blush p-3">

                      <p className="text-[11px] font-semibold text-ink mb-2">
                        Preview
                      </p>

                      <p className="text-[11px] text-muted whitespace-pre-line leading-relaxed">
                        {
                          whatsappImport.preview
                        }
                      </p>
                    </div>

                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={
                        handleAnalyzeWhatsApp
                      }
                      loading={
                        analyzingWhatsApp
                      }
                      leftIcon={
                        <MessageSquareText
                          size={14}
                        />
                      }
                    >
                      {analyzingWhatsApp
                        ? 'Analyzing...'
                        : 'Analyze with AI'}
                    </Button>
                  </div>
                )}
              </div>

              <div className="rounded-2xl bg-warmwhite border border-blush p-5 shadow-sm space-y-3">

                <label className="block text-xs font-semibold text-ink">
                  Attach Evidence Files
                </label>

                <div
                  onClick={() =>
                    fileInputRef.current?.click()
                  }
                  className="cursor-pointer rounded-xl border-2 border-dashed border-secondary/30 bg-blush/20 p-6 text-center hover:border-accent hover:bg-blush/40 transition-all"
                >
                  <Upload
                    size={28}
                    className="text-secondary mx-auto mb-2"
                  />

                  <p className="text-sm text-ink font-semibold">
                    Tap to attach evidence
                  </p>

                  <p className="text-xs text-muted mt-1">
                    Photos, audio, or PDF documents (max 10MB each)
                  </p>

                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="image/*,audio/*,.pdf,.doc,.docx,.txt"
                    onChange={
                      handleFileSelect
                    }
                    className="hidden"
                  />
                </div>

                {hashing && (
                  <div className="flex items-center gap-2 text-xs text-secondary font-medium">
                    <Loader2
                      size={14}
                      className="animate-spin"
                    />

                    Computing cryptographic SHA-256 evidence hashes...
                  </div>
                )}

                {files.length > 0 && (
                  <div className="space-y-2 pt-2">

                    {files.map((f, i) => (
                      <div
                        key={i}
                        className="rounded-xl bg-blush/30 border border-blush p-3"
                      >

                        <div className="flex items-start justify-between gap-2">

                          <div className="flex items-start gap-2.5 flex-1 min-w-0">

                            <FileText
                              size={18}
                              className="text-accent shrink-0 mt-0.5"
                            />

                            <div className="min-w-0">

                              <p className="text-xs font-semibold text-ink truncate">
                                {f.file.name}
                              </p>

                              <p className="text-[11px] text-muted flex items-center gap-1 mt-0.5 font-mono">

                                <Hash
                                  size={11}
                                  className="text-secondary shrink-0"
                                />

                                <span className="truncate">
                                  {f.hash}
                                </span>
                              </p>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() =>
                              removeFile(i)
                            }
                            className="text-xs text-danger font-semibold hover:underline shrink-0"
                          >
                            Remove
                          </button>
                        </div>

                        {f.file.type.startsWith(
                          'audio/'
                        ) && (
                          <div className="mt-2.5 pt-2 border-t border-blush/50">

                            <label className="text-[11px] text-muted block mb-1">
                              Was this recording made with party consent?
                            </label>

                            <div className="flex gap-2">

                              {[
                                'obtained',
                                'not_obtained',
                                'unsure',
                              ].map((opt) => (
                                <button
                                  key={opt}
                                  type="button"
                                  onClick={() =>
                                    updateConsent(
                                      i,
                                      opt
                                    )
                                  }
                                  className={`text-[11px] font-medium rounded-lg px-2.5 py-1 transition-all ${
                                    f.consentStatus ===
                                    opt
                                      ? 'bg-primary text-white shadow-sm'
                                      : 'bg-blush text-muted hover:text-primary'
                                  }`}
                                >
                                  {opt ===
                                  'obtained'
                                    ? 'Yes (Obtained)'
                                    : opt ===
                                      'not_obtained'
                                      ? 'No'
                                      : 'Unsure'}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <Button
                type="submit"
                variant="primary"
                size="lg"
                fullWidth
                loading={classifying}
              >
                {classifying
                  ? 'Structuring Incident Details...'
                  : 'Continue to Review & Confirm'}
              </Button>
            </form>
          ) : (
            <div className="space-y-5 animate-fade-in">

              <div className="rounded-2xl bg-warmwhite border border-blush p-5 shadow-sm space-y-4">

                <div className="flex items-center justify-between border-b border-blush pb-3">

                  <h3 className="font-heading text-sm font-semibold text-primary">
                    AI Incident Structuring
                  </h3>

                  <span className="text-[11px] text-muted flex items-center gap-1">
                    <Info
                      size={13}
                      className="text-secondary"
                    />

                    Review before saving
                  </span>
                </div>

                {classifyError && (
                  <div className="rounded-xl bg-danger/8 border border-danger/20 p-3 text-xs text-danger dark:bg-danger/10">

                    <p className="font-semibold mb-0.5">
                      Automatic classification unavailable
                    </p>

                    <p className="text-ink">
                      {classifyError}. Standard category fallbacks applied. You can select the correct category below.
                    </p>
                  </div>
                )}

                {classifyResult &&
                  !classifyResult.fallback_used && (
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-success bg-success/10 px-3 py-1.5 rounded-lg">

                      <Check size={14} />

                      Structured by Sakshya AI Assistant
                    </div>
                  )}

                <div className="space-y-3">

                  <div>
                    <label className="text-xs font-semibold text-ink">
                      Category
                    </label>

                    <select
                      value={
                        category ||
                        classifyResult?.category ||
                        ''
                      }
                      onChange={(e) =>
                        setCategory(
                          e.target.value
                        )
                      }
                      className="w-full mt-1 rounded-xl border border-blush bg-blush/20 px-3 py-2 text-xs text-ink font-medium focus:border-accent focus:outline-none"
                    >
                      {CATEGORIES.filter(
                        (c) => c.value
                      ).map((c) => (
                        <option
                          key={c.value}
                          value={c.value}
                        >
                          {c.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {classifyResult && (
                    <>
                      <div>
                        <span className="text-xs font-semibold text-ink block mb-1">
                          AI Structured Summary
                        </span>

                        <p className="text-xs text-ink bg-blush/30 rounded-xl p-3 leading-relaxed">
                          {
                            classifyResult.summary
                          }
                        </p>
                      </div>

                      {classifyResult
                        .people_involved
                        .length > 0 && (
                        <div>

                          <span className="text-xs font-semibold text-ink block mb-1">
                            Entities / Persons Mentioned
                          </span>

                          <div className="flex flex-wrap gap-1.5">

                            {classifyResult.people_involved.map(
                              (p, i) => (
                                <span
                                  key={i}
                                  className="text-xs bg-secondary/10 text-secondary font-medium rounded-full px-2.5 py-0.5"
                                >
                                  {p}
                                </span>
                              )
                            )}
                          </div>
                        </div>
                      )}

                      {classifyResult
                        .risk_keywords_detected
                        .length > 0 && (
                        <div>

                          <span className="text-xs font-semibold text-ink block mb-1">
                            Risk Factors Identified
                          </span>

                          <div className="flex flex-wrap gap-1.5">

                            {classifyResult.risk_keywords_detected.map(
                              (k, i) => (
                                <span
                                  key={i}
                                  className="text-xs bg-danger/10 text-danger font-medium rounded-full px-2.5 py-0.5"
                                >
                                  {k}
                                </span>
                              )
                            )}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>

                <p className="text-[11px] text-muted italic pt-2 border-t border-blush/40">
                  Disclaimer: AI structuring is designed to assist evidence organization and is provided for your review. It does not replace legal analysis.
                </p>
              </div>

              <div className="flex gap-3">

                <Button
                  onClick={() =>
                    setStep('form')
                  }
                  variant="outline"
                  size="lg"
                  className="flex-1"
                >
                  Edit Details
                </Button>

                <Button
                  onClick={handleConfirm}
                  variant="primary"
                  size="lg"
                  loading={uploading}
                  className="flex-1"
                >
                  {uploading
                    ? 'Encrypted Saving...'
                    : 'Save to Vault'}
                </Button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}