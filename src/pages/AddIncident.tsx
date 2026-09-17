import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Upload, Hash, Loader2, Check, AlertCircle, FileText } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { uploadEvidence, classifyIncident, computeSHA256, detectEscalation } from '@/lib/utils';
import type { ClassifyResult } from '@/types';
import { AppNav } from '@/components/AppNav';
import { getCategoryLabel } from '@/lib/utils';

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
        setError(`"${file.name}" is larger than 10MB. Please choose a smaller file.`);
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
      setError("You're offline right now — this needs an internet connection. Your existing evidence is still visible on the dashboard.");
      return;
    }

    setError(null);
    setClassifying(true);
    setClassifyError(null);

    const { result, error: classifyErr } = await classifyIncident(description, category || null);

    setClassifying(false);

    if (classifyErr || !result) {
      setClassifyError(classifyErr || 'Classification failed');
      // Still proceed with manual category
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
      // Insert incident
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
      if (!incData) throw new Error('Failed to create incident');

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
        const escalation = detectEscalation(allIncidents as any);
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
    <div className="min-h-screen bg-blush">
      <AppNav />
      <main className="md:ml-60 pb-20 md:pb-0">
        <div className="max-w-2xl mx-auto p-4 md:p-8">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-1.5 text-sm text-muted hover:text-primary transition-colors mb-4"
          >
            <ArrowLeft size={16} />
            Back to Dashboard
          </button>

          <h1 className="font-heading text-2xl font-bold text-primary mb-1">
            {step === 'form' ? 'Add New Incident' : 'Review & Confirm'}
          </h1>
          <p className="text-sm text-muted mb-6">
            {step === 'form'
              ? 'Document what happened. You can include photos, audio, or documents as evidence.'
              : 'Please review the AI classification below. You can adjust the category before saving.'}
          </p>

          {error && (
            <div className="mb-4 rounded-lg bg-danger/10 border border-danger/20 p-3 text-sm text-danger flex items-start gap-2">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              {error}
            </div>
          )}

          {step === 'form' ? (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-ink mb-1.5">Date of Incident</label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                  max={new Date().toISOString().split('T')[0]}
                  className="w-full rounded-lg border border-blush bg-warmwhite px-3 py-2.5 text-sm text-ink focus:border-accent focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-ink mb-1.5">
                  What happened? <span className="text-muted font-normal">(in your own words)</span>
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                  rows={5}
                  className="w-full rounded-lg border border-blush bg-warmwhite px-3 py-2.5 text-sm text-ink focus:border-accent focus:outline-none resize-y"
                  placeholder="Describe the incident as it happened. This text will be preserved exactly as you write it."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-ink mb-1.5">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full rounded-lg border border-blush bg-warmwhite px-3 py-2.5 text-sm text-ink focus:border-accent focus:outline-none"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
                <p className="text-xs text-muted mt-1">
                  You can leave this to AI, or pre-select if you prefer.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-ink mb-1.5">Evidence Files</label>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="cursor-pointer rounded-lg border-2 border-dashed border-secondary/30 bg-warmwhite p-6 text-center hover:border-accent transition-colors"
                >
                  <Upload size={24} className="text-muted mx-auto mb-2" />
                  <p className="text-sm text-ink font-medium">Tap to upload evidence</p>
                  <p className="text-xs text-muted mt-1">Photos, audio, or documents (max 10MB each)</p>
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
                  <div className="mt-3 flex items-center gap-2 text-sm text-secondary">
                    <Loader2 size={16} className="animate-spin" />
                    Computing SHA-256 hash...
                  </div>
                )}

                {files.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {files.map((f, i) => (
                      <div key={i} className="rounded-lg bg-warmwhite border border-blush p-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-start gap-2 flex-1 min-w-0">
                            <FileText size={16} className="text-secondary shrink-0 mt-0.5" />
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-ink truncate">{f.file.name}</p>
                              <p className="text-xs text-muted flex items-center gap-1">
                                <Hash size={10} />
                                <span className="font-mono text-[10px]">{f.hash.substring(0, 24)}...</span>
                              </p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeFile(i)}
                            className="text-xs text-danger hover:underline shrink-0"
                          >
                            Remove
                          </button>
                        </div>
                        {f.file.type.startsWith('audio/') && (
                          <div className="mt-2">
                            <label className="text-xs text-muted block mb-1">
                              Was this recording made with the other person's knowledge?
                            </label>
                            <div className="flex gap-2">
                              {['obtained', 'not_obtained', 'unsure'].map((opt) => (
                                <button
                                  key={opt}
                                  type="button"
                                  onClick={() => updateConsent(i, opt)}
                                  className={`text-xs rounded-full px-2.5 py-1 transition-colors ${
                                    f.consentStatus === opt
                                      ? 'bg-primary text-white'
                                      : 'bg-blush text-muted hover:text-primary'
                                  }`}
                                >
                                  {opt === 'obtained' ? 'Yes' : opt === 'not_obtained' ? 'No' : 'Unsure'}
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

              <button
                type="submit"
                disabled={classifying}
                className="w-full rounded-lg bg-accent text-white py-3 text-sm font-semibold hover:bg-accent-light transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {classifying ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    AI is classifying...
                  </>
                ) : (
                  'Continue to Review'
                )}
              </button>
            </form>
          ) : (
            <div className="space-y-5">
              {/* Review classification */}
              <div className="rounded-xl bg-warmwhite border border-blush p-4">
                <h3 className="font-heading text-sm font-semibold text-primary mb-3">AI Classification Result</h3>

                {classifyError && (
                  <div className="mb-3 rounded-lg bg-danger/8 border border-danger/20 p-3 text-sm text-danger">
                    <p className="font-medium mb-1">Automatic classification was unavailable</p>
                    <p className="text-xs">{classifyError}. A basic fallback was used. You can manually select the correct category below.</p>
                  </div>
                )}

                {classifyResult && !classifyResult.fallback_used && (
                  <div className="mb-3 flex items-center gap-2 text-xs text-success">
                    <Check size={14} />
                    Classified by AI (OpenAI)
                  </div>
                )}

                {classifyResult && classifyResult.fallback_used && (
                  <div className="mb-3 flex items-center gap-2 text-xs text-muted">
                    <AlertCircle size={14} />
                    Fallback classifier used (AI was unavailable)
                  </div>
                )}

                <div className="space-y-2">
                  <div>
                    <label className="text-xs text-muted">Category — you can change this</label>
                    <select
                      value={category || classifyResult?.category || ''}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full mt-1 rounded-lg border border-blush bg-blush/30 px-3 py-2 text-sm text-ink focus:border-accent focus:outline-none"
                    >
                      {CATEGORIES.filter((c) => c.value).map((c) => (
                        <option key={c.value} value={c.value}>{c.label}</option>
                      ))}
                    </select>
                  </div>

                  {classifyResult && (
                    <>
                      <div className="flex items-center gap-3 pt-2">
                        <div>
                          <span className="text-xs text-muted">Severity</span>
                          <p className="text-sm font-semibold text-primary">
                            {classifyResult.severity_score} / 4 — {getCategoryLabel(null)}
                          </p>
                        </div>
                      </div>
                      {classifyResult.summary && (
                        <div>
                          <span className="text-xs text-muted">AI Summary</span>
                          <p className="text-sm text-ink bg-blush/30 rounded-lg p-2 mt-1">{classifyResult.summary}</p>
                        </div>
                      )}
                      {classifyResult.people_involved.length > 0 && (
                        <div>
                          <span className="text-xs text-muted">People mentioned</span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {classifyResult.people_involved.map((p, i) => (
                              <span key={i} className="text-xs bg-secondary/15 text-secondary rounded-full px-2 py-0.5">{p}</span>
                            ))}
                          </div>
                        </div>
                      )}
                      {classifyResult.risk_keywords_detected.length > 0 && (
                        <div>
                          <span className="text-xs text-muted">Risk keywords detected</span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {classifyResult.risk_keywords_detected.map((k, i) => (
                              <span key={i} className="text-xs bg-danger/15 text-danger rounded-full px-2 py-0.5">{k}</span>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Summary of what will be saved */}
              <div className="rounded-xl bg-warmwhite border border-blush p-4">
                <h3 className="font-heading text-sm font-semibold text-primary mb-2">Incident Summary</h3>
                <div className="space-y-1 text-sm text-ink">
                  <p><span className="text-muted">Date:</span> {new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                  <p><span className="text-muted">Description:</span> {description.substring(0, 100)}{description.length > 100 ? '...' : ''}</p>
                  <p><span className="text-muted">Evidence files:</span> {files.length}</p>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setStep('form')}
                  className="flex-1 rounded-lg border border-primary text-primary py-3 text-sm font-medium hover:bg-primary/5 transition-colors"
                >
                  Back to Edit
                </button>
                <button
                  onClick={handleConfirm}
                  disabled={uploading}
                  className="flex-1 rounded-lg bg-accent text-white py-3 text-sm font-semibold hover:bg-accent-light transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {uploading ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Confirm & Save'
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
