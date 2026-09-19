import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Upload, Hash, Loader2, Check, AlertCircle, FileText, Info } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { uploadEvidence, classifyIncident, computeSHA256, detectEscalation } from '@/lib/utils';
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

  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [hashing, setHashing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [classifying, setClassifying] = useState(false);
  const [classifyResult, setClassifyResult] = useState<ClassifyResult | null>(null);
  const [classifyError, setClassifyError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<'form' | 'review'>('form');

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files;
    if (!selected || selected.length === 0) return;

    setHashing(true);
    const newFiles: UploadedFile[] = [];
    for (const file of Array.from(selected)) {
      if (file.size > 10 * 1024 * 1024) {
        setError(`"${file.name}" exceeds 10MB. Please choose a smaller file.`);
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

  const updateConsent = (index: number, consent: string) => {
    setFiles((prev) =>
      prev.map((f, i) => (i === index ? { ...f, consentStatus: consent } : f))
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) {
      setError('Please describe what happened.');
      return;
    }
    if (!navigator.onLine) {
      setError("You're offline right now — saving new incidents requires an internet connection.");
      return;
    }

    setError(null);
    setClassifying(true);
    setClassifyError(null);

    const { result, error: classifyErr } = await classifyIncident(description, category || null);

    setClassifying(false);

    if (classifyErr || !result) {
      setClassifyError(classifyErr || 'AI classification was unavailable');
      setClassifyResult(null);
    } else {
      setClassifyResult(result);
      if (!category) setCategory(result.category);
    }

    setStep('review');
  };

  const handleConfirm = async () => {
    if (!user) return;
    setUploading(true);
    setError(null);

    try {
      const finalCategory = category || classifyResult?.category || 'verbal_abuse';
      const finalSeverity = classifyResult?.severity_score || 1;
      const finalSummary = classifyResult?.summary || description.substring(0, 200);
      const finalPeople = classifyResult?.people_involved || [];
      const finalKeywords = classifyResult?.risk_keywords_detected || [];

      const { data: incData, error: incError } = await supabase
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

      if (incError) throw new Error(incError.message);
      if (!incData) throw new Error('Failed to create incident record');

      // Upload evidence files
      for (const f of files) {
        const { error: evErr } = await uploadEvidence(
          f.file,
          incData.id,
          user.id,
          f.consentStatus
        );
        if (evErr) {
          console.error('Evidence upload error:', evErr);
        }
      }

      // Update escalation flag based on all incidents
      const { data: allIncidents } = await supabase
        .from('incidents')
        .select('*')
        .order('incident_date', { ascending: false });

      if (allIncidents && allIncidents.length >= 2) {
        const escalation = detectEscalation(allIncidents as Incident[]);
        if (escalation.isEscalating) {
          await supabase
            .from('incidents')
            .update({ escalation_flag: true })
            .eq('id', incData.id);
        }
      }

      navigate(`/incidents/${incData.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-blush/60">
      <AppNav />
      <main className="md:ml-60 pb-24 md:pb-8">
        <div className="max-w-2xl mx-auto p-4 md:p-8">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-1.5 text-xs font-semibold text-muted hover:text-primary transition-colors mb-4"
          >
            <ArrowLeft size={16} />
            Back to Dashboard
          </button>

          <h1 className="font-heading text-2xl font-bold text-primary mb-1">
            {step === 'form' ? 'Add Incident Record' : 'Review & Confirm Structuring'}
          </h1>
          <p className="text-xs text-muted mb-6">
            {step === 'form'
              ? 'Document what happened safely. Attach photos, audio, or documents as cryptographic evidence.'
              : 'Review the AI-assisted incident structuring before committing to your encrypted vault.'}
          </p>

          {error && (
            <div className="mb-4 rounded-xl bg-danger/10 border border-danger/20 p-3 text-xs text-danger flex items-start gap-2">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {step === 'form' ? (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="rounded-2xl bg-warmwhite border border-blush p-5 shadow-sm space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-ink mb-1.5">Date of Incident</label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    required
                    max={new Date().toISOString().split('T')[0]}
                    className="w-full rounded-xl border border-blush bg-blush/20 px-3.5 py-2.5 text-sm text-ink focus:border-accent focus:bg-white focus:outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-ink mb-1.5">
                    What happened? <span className="text-muted font-normal">(in your own words)</span>
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    required
                    rows={5}
                    className="w-full rounded-xl border border-blush bg-blush/20 px-3.5 py-2.5 text-sm text-ink focus:border-accent focus:bg-white focus:outline-none resize-y leading-relaxed transition-all"
                    placeholder="Describe the incident as clearly as you recall. This narrative will be preserved exactly as written."
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-ink mb-1.5">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full rounded-xl border border-blush bg-blush/20 px-3.5 py-2.5 text-sm text-ink focus:border-accent focus:bg-white focus:outline-none transition-all"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                  <p className="text-[11px] text-muted mt-1">
                    AI-assisted classification will analyze and suggest details based on your account.
                  </p>
                </div>
              </div>

              {/* Evidence File Dropzone */}
              <div className="rounded-2xl bg-warmwhite border border-blush p-5 shadow-sm space-y-3">
                <label className="block text-xs font-semibold text-ink">Attach Evidence Files</label>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="cursor-pointer rounded-xl border-2 border-dashed border-secondary/30 bg-blush/20 p-6 text-center hover:border-accent hover:bg-blush/40 transition-all"
                >
                  <Upload size={28} className="text-secondary mx-auto mb-2" />
                  <p className="text-sm text-ink font-semibold">Tap to attach evidence</p>
                  <p className="text-xs text-muted mt-1">Photos, audio, or PDF documents (max 10MB each)</p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="image/*,audio/*,.pdf,.doc,.docx,.txt"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                </div>

                {hashing && (
                  <div className="flex items-center gap-2 text-xs text-secondary font-medium">
                    <Loader2 size={14} className="animate-spin" />
                    Computing cryptographic SHA-256 evidence hashes...
                  </div>
                )}

                {files.length > 0 && (
                  <div className="space-y-2 pt-2">
                    {files.map((f, i) => (
                      <div key={i} className="rounded-xl bg-blush/30 border border-blush p-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-start gap-2.5 flex-1 min-w-0">
                            <FileText size={18} className="text-accent shrink-0 mt-0.5" />
                            <div className="min-w-0">
                              <p className="text-xs font-semibold text-ink truncate">{f.file.name}</p>
                              <p className="text-[11px] text-muted flex items-center gap-1 mt-0.5 font-mono">
                                <Hash size={11} className="text-secondary shrink-0" />
                                <span className="truncate">{f.hash}</span>
                              </p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeFile(i)}
                            className="text-xs text-danger font-semibold hover:underline shrink-0"
                          >
                            Remove
                          </button>
                        </div>
                        {f.file.type.startsWith('audio/') && (
                          <div className="mt-2.5 pt-2 border-t border-blush/50">
                            <label className="text-[11px] text-muted block mb-1">
                              Was this recording made with party consent?
                            </label>
                            <div className="flex gap-2">
                              {['obtained', 'not_obtained', 'unsure'].map((opt) => (
                                <button
                                  key={opt}
                                  type="button"
                                  onClick={() => updateConsent(i, opt)}
                                  className={`text-[11px] font-medium rounded-lg px-2.5 py-1 transition-all ${
                                    f.consentStatus === opt
                                      ? 'bg-primary text-white shadow-sm'
                                      : 'bg-blush text-muted hover:text-primary'
                                  }`}
                                >
                                  {opt === 'obtained' ? 'Yes (Obtained)' : opt === 'not_obtained' ? 'No' : 'Unsure'}
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
                {classifying ? 'Structuring Incident Details...' : 'Continue to Review & Confirm'}
              </Button>
            </form>
          ) : (
            <div className="space-y-5 animate-fade-in">
              {/* AI Structuring Review Card */}
              <div className="rounded-2xl bg-warmwhite border border-blush p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-blush pb-3">
                  <h3 className="font-heading text-sm font-semibold text-primary">AI Incident Structuring</h3>
                  <span className="text-[11px] text-muted flex items-center gap-1">
                    <Info size={13} className="text-secondary" />
                    Review before saving
                  </span>
                </div>

                {classifyError && (
                  <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800">
                    <p className="font-semibold mb-0.5">Automatic classification unavailable</p>
                    <p>{classifyError}. Standard category fallbacks applied. You can select the correct category below.</p>
                  </div>
                )}

                {classifyResult && !classifyResult.fallback_used && (
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-success bg-success/10 px-3 py-1.5 rounded-lg">
                    <Check size={14} />
                    Structured by Sakshya AI Assistant
                  </div>
                )}

                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-semibold text-ink">Category</label>
                    <select
                      value={category || classifyResult?.category || ''}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full mt-1 rounded-xl border border-blush bg-blush/20 px-3 py-2 text-xs text-ink font-medium focus:border-accent focus:outline-none"
                    >
                      {CATEGORIES.filter((c) => c.value).map((c) => (
                        <option key={c.value} value={c.value}>{c.label}</option>
                      ))}
                    </select>
                  </div>

                  {classifyResult && (
                    <>
                      <div>
                        <span className="text-xs font-semibold text-ink block mb-1">AI Structured Summary</span>
                        <p className="text-xs text-ink bg-blush/30 rounded-xl p-3 leading-relaxed">
                          {classifyResult.summary}
                        </p>
                      </div>

                      {classifyResult.people_involved.length > 0 && (
                        <div>
                          <span className="text-xs font-semibold text-ink block mb-1">Entities / Persons Mentioned</span>
                          <div className="flex flex-wrap gap-1.5">
                            {classifyResult.people_involved.map((p, i) => (
                              <span key={i} className="text-xs bg-secondary/10 text-secondary font-medium rounded-full px-2.5 py-0.5">
                                {p}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {classifyResult.risk_keywords_detected.length > 0 && (
                        <div>
                          <span className="text-xs font-semibold text-ink block mb-1">Risk Factors Identified</span>
                          <div className="flex flex-wrap gap-1.5">
                            {classifyResult.risk_keywords_detected.map((k, i) => (
                              <span key={i} className="text-xs bg-danger/10 text-danger font-medium rounded-full px-2.5 py-0.5">
                                {k}
                              </span>
                            ))}
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

              {/* Action Buttons */}
              <div className="flex gap-3">
                <Button
                  onClick={() => setStep('form')}
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
                  {uploading ? 'Encrypted Saving...' : 'Save to Vault'}
                </Button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
