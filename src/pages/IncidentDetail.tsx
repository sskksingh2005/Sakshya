import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Calendar,
  Tag,
  AlertTriangle,
  FileText,
  Hash,
  Download,
  PencilLine,
  Save,
  X,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import type { Incident, Evidence } from '@/types';
import { AppNav } from '@/components/AppNav';
import { LoadingState } from '@/components/ui/LoadingState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Button } from '@/components/ui/Button';
import { getCategoryLabel, getSeverityLabel, getSeverityColor } from '@/lib/utils';

const EDITABLE_CATEGORIES = [
  { value: '', label: 'Let AI suggest a category' },
  { value: 'verbal_abuse', label: 'Verbal / Emotional Abuse' },
  { value: 'threat', label: 'Threat / Intimidation' },
  { value: 'physical_abuse', label: 'Physical Abuse' },
  { value: 'economic_abuse', label: 'Economic Abuse' },
  { value: 'stalking_control', label: 'Stalking / Control' },
];

interface IncidentFormState {
  incident_date: string;
  description: string;
  category: string;
}

export function IncidentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [incident, setIncident] = useState<Incident | null>(null);
  const [evidence, setEvidence] = useState<Evidence[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingConsent, setUpdatingConsent] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [draft, setDraft] = useState<IncidentFormState>({
    incident_date: '',
    description: '',
    category: '',
  });

  const loadIncident = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    const { data: inc, error: incErr } = await supabase
      .from('incidents')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (incErr || !inc) {
      setIncident(null);
      setEvidence([]);
      setLoading(false);
      return;
    }

    setIncident(inc as Incident);
    setDraft({
      incident_date: inc.incident_date || '',
      description: inc.description || '',
      category: inc.category || '',
    });

    const { data: ev } = await supabase
      .from('evidence')
      .select('*')
      .eq('incident_id', id);

    setEvidence((ev || []) as Evidence[]);
    setLoading(false);
  }, [id]);

  useEffect(() => {
    loadIncident();
  }, [loadIncident]);

  const validateDraft = (currentDraft: IncidentFormState) => {
    const nextErrors: Record<string, string> = {};
    const trimmedDescription = currentDraft.description.trim();

    if (!currentDraft.incident_date.trim()) {
      nextErrors.incident_date = 'Incident date is required.';
    } else {
      const parsedDate = new Date(`${currentDraft.incident_date}T00:00:00`);
      if (Number.isNaN(parsedDate.getTime())) {
        nextErrors.incident_date = 'Please provide a valid incident date.';
      } else if (parsedDate > new Date(new Date().setHours(23, 59, 59, 999))) {
        nextErrors.incident_date = 'Incident date cannot be in the future.';
      }
    }

    if (!trimmedDescription) {
      nextErrors.description = 'Incident narrative is required.';
    }

    return nextErrors;
  };

  const openEditForm = () => {
    if (!incident) return;
    setSaveError(null);
    setSuccessMessage(null);
    setValidationErrors({});
    setDraft({
      incident_date: incident.incident_date,
      description: incident.description,
      category: incident.category || '',
    });
    setIsEditing(true);
  };

  const handleSave = async () => {
    if (!id || !user) {
      setSaveError('You must be signed in to edit this incident.');
      return;
    }

    const nextErrors = validateDraft(draft);
    setValidationErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    setSaving(true);
    setSaveError(null);
    setSuccessMessage(null);

    try {
      const { data, error } = await supabase
        .from('incidents')
        .update({
          incident_date: draft.incident_date,
          description: draft.description.trim(),
          category: draft.category || null,
        })
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) {
        const message = error.message || 'Unable to save incident changes.';
        if (/permission|policy|forbidden|row level security|not found/i.test(message)) {
          throw new Error('You do not have permission to edit this incident, or it could not be found.');
        }
        throw new Error(message);
      }

      if (!data) {
        throw new Error('The incident could not be found or is not accessible to your account.');
      }

      setIsEditing(false);
      await loadIncident();
      setSuccessMessage('Incident updated successfully.');
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Something went wrong while saving the incident.');
    } finally {
      setSaving(false);
    }
  };

  const updateConsent = async (evId: string, consent: string) => {
    setUpdatingConsent(evId);
    await supabase.from('evidence').update({ consent_status: consent }).eq('id', evId);
    setEvidence((prev) =>
      prev.map((e) => (e.id === evId ? { ...e, consent_status: consent } : e))
    );
    setUpdatingConsent(null);
  };

  const downloadFile = async (ev: Evidence) => {
    const { data, error } = await supabase.storage
      .from('evidence')
      .download(ev.storage_path);
    if (error) return;
    const url = URL.createObjectURL(data);
    const a = document.createElement('a');
    a.href = url;
    a.download = ev.filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-blush/60">
        <AppNav />
        <main className="md:ml-60 pb-20 md:pb-0">
          <LoadingState message="Loading incident record..." className="py-24" />
        </main>
      </div>
    );
  }

  if (!incident) {
    return (
      <div className="min-h-screen bg-blush/60">
        <AppNav />
        <main className="md:ml-60 pb-20 md:pb-0">
          <div className="max-w-xl mx-auto p-6 md:p-12">
            <ErrorState
              title="Incident Record Not Found"
              message="The requested incident could not be found or may have been deleted."
              action={
                <Button onClick={() => navigate('/dashboard')} variant="primary" size="sm">
                  Back to Dashboard
                </Button>
              }
            />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-blush/60">
      <AppNav />
      <main className="md:ml-60 pb-24 md:pb-8">
        <div className="max-w-2xl mx-auto p-4 md:p-8 space-y-5">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-1.5 text-xs font-semibold text-muted hover:text-primary transition-colors"
          >
            <ArrowLeft size={16} />
            Back to Dashboard
          </button>

          {successMessage && (
            <div className="rounded-xl border border-success/30 bg-success/10 px-4 py-3 flex items-start gap-2 text-xs text-success">
              <CheckCircle2 size={16} className="mt-0.5 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          <div className="rounded-2xl bg-warmwhite border border-blush p-6 shadow-sm space-y-4 animate-fade-in">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-1.5 text-xs text-muted font-medium bg-blush/40 px-3 py-1 rounded-full">
                <Calendar size={13} />
                {new Date(incident.incident_date).toLocaleDateString('en-IN', {
                  day: 'numeric', month: 'long', year: 'numeric',
                })}
              </div>
              <Button
                onClick={openEditForm}
                variant="secondary"
                size="sm"
                leftIcon={<PencilLine size={14} />}
                disabled={saving}
              >
                Edit Incident
              </Button>
            </div>

            <h1 className="font-heading text-xl font-bold text-primary">Incident Record</h1>

            {isEditing && (
              <div className="rounded-2xl border border-primary/20 bg-blush/20 p-4 space-y-4">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="font-heading text-base font-semibold text-primary">Edit Incident</h2>
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditing(false);
                      setSaveError(null);
                      setValidationErrors({});
                    }}
                    className="text-muted hover:text-primary transition-colors"
                    aria-label="Cancel editing"
                  >
                    <X size={16} />
                  </button>
                </div>

                {saveError && (
                  <div className="rounded-xl border border-danger/30 bg-danger/10 px-3 py-2 flex items-start gap-2 text-[11px] text-danger">
                    <AlertCircle size={14} className="mt-0.5 shrink-0" />
                    <span>{saveError}</span>
                  </div>
                )}

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-ink mb-1.5">Date of Incident</label>
                    <input
                      type="date"
                      value={draft.incident_date}
                      max={new Date().toISOString().split('T')[0]}
                      onChange={(e) => {
                        setDraft((prev) => ({ ...prev, incident_date: e.target.value }));
                        setValidationErrors((prev) => ({ ...prev, incident_date: '' }));
                        setSaveError(null);
                      }}
                      className="w-full rounded-xl border border-blush bg-blush/20 px-3.5 py-2.5 text-sm text-ink focus:border-accent focus:bg-white focus:outline-none transition-all"
                    />
                    {validationErrors.incident_date && (
                      <p className="mt-1 text-[11px] text-danger">{validationErrors.incident_date}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-ink mb-1.5">Category</label>
                    <select
                      value={draft.category}
                      onChange={(e) => {
                        setDraft((prev) => ({ ...prev, category: e.target.value }));
                        setSaveError(null);
                      }}
                      className="w-full rounded-xl border border-blush bg-blush/20 px-3.5 py-2.5 text-sm text-ink focus:border-accent focus:bg-white focus:outline-none transition-all"
                    >
                      {EDITABLE_CATEGORIES.map((option) => (
                        <option key={option.value || 'unspecified'} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-ink mb-1.5">
                      What happened? <span className="text-muted font-normal">(in your own words)</span>
                    </label>
                    <textarea
                      value={draft.description}
                      onChange={(e) => {
                        setDraft((prev) => ({ ...prev, description: e.target.value }));
                        setValidationErrors((prev) => ({ ...prev, description: '' }));
                        setSaveError(null);
                      }}
                      rows={6}
                      className="w-full rounded-xl border border-blush bg-blush/20 px-3.5 py-2.5 text-sm text-ink focus:border-accent focus:bg-white focus:outline-none transition-all resize-y"
                    />
                    {validationErrors.description && (
                      <p className="mt-1 text-[11px] text-danger">{validationErrors.description}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <Button
                      type="button"
                      onClick={() => void handleSave()}
                      variant="primary"
                      size="sm"
                      loading={saving}
                      leftIcon={<Save size={14} />}
                      disabled={saving}
                    >
                      {saving ? 'Saving...' : 'Save Changes'}
                    </Button>
                    <Button
                      type="button"
                      onClick={() => {
                        setIsEditing(false);
                        setSaveError(null);
                        setValidationErrors({});
                      }}
                      variant="secondary"
                      size="sm"
                      disabled={saving}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              {incident.category && (
                <span className="flex items-center gap-1 text-xs font-semibold bg-secondary/10 text-secondary rounded-full px-3 py-1">
                  <Tag size={12} />
                  {getCategoryLabel(incident.category)}
                </span>
              )}
              {incident.severity_score !== null && (
                <span
                  className="text-xs font-semibold rounded-full px-3 py-1"
                  style={{
                    color: getSeverityColor(incident.severity_score),
                    backgroundColor: getSeverityColor(incident.severity_score) + '15',
                  }}
                >
                  Severity: {getSeverityLabel(incident.severity_score)}
                </span>
              )}
              {incident.escalation_flag && (
                <span className="flex items-center gap-1 text-xs font-semibold bg-danger/10 text-danger rounded-full px-3 py-1">
                  <AlertTriangle size={12} />
                  Escalation Flagged
                </span>
              )}
            </div>

            <div className="pt-2">
              <label className="text-xs font-semibold text-muted uppercase tracking-wider block mb-1">
                Original Account (Preserved Unedited)
              </label>
              <p className="text-sm text-ink bg-blush/20 border border-blush/60 rounded-xl p-4 leading-relaxed whitespace-pre-wrap">
                {incident.description}
              </p>
            </div>

            {incident.ai_summary && (
              <div>
                <label className="text-xs font-semibold text-muted uppercase tracking-wider block mb-1">
                  AI Structured Summary
                </label>
                <p className="text-xs text-ink bg-blush/30 border border-blush/60 rounded-xl p-3 leading-relaxed">
                  {incident.ai_summary}
                </p>
              </div>
            )}

            {incident.people_involved && incident.people_involved.length > 0 && (
              <div>
                <label className="text-xs font-semibold text-muted uppercase tracking-wider block mb-1">
                  Entities Mentioned
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {incident.people_involved.map((p, i) => (
                    <span key={i} className="text-xs bg-secondary/10 text-secondary font-medium rounded-full px-2.5 py-0.5">
                      {p}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {incident.risk_keywords_detected && incident.risk_keywords_detected.length > 0 && (
              <div>
                <label className="text-xs font-semibold text-muted uppercase tracking-wider block mb-1">
                  Risk Factors
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {incident.risk_keywords_detected.map((k, i) => (
                    <span key={i} className="text-xs bg-danger/10 text-danger font-medium rounded-full px-2.5 py-0.5">
                      {k}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="rounded-2xl bg-warmwhite border border-blush p-6 shadow-sm space-y-4">
            <h2 className="font-heading text-base font-semibold text-primary">Cryptographic Evidence Files</h2>

            {evidence.length === 0 ? (
              <p className="text-xs text-muted py-2">No evidence files attached to this incident record.</p>
            ) : (
              <div className="space-y-3">
                {evidence.map((ev) => (
                  <div key={ev.id} className="rounded-xl bg-blush/20 border border-blush/80 p-4 space-y-2">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-2.5 flex-1 min-w-0">
                        <FileText size={20} className="text-accent shrink-0 mt-0.5" />
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-ink truncate">{ev.filename}</p>
                          <p className="text-[11px] text-muted mt-0.5">
                            Uploaded {new Date(ev.uploaded_at).toLocaleString('en-IN')}
                          </p>
                        </div>
                      </div>
                      <Button
                        onClick={() => void downloadFile(ev)}
                        variant="secondary"
                        size="sm"
                        leftIcon={<Download size={14} />}
                      >
                        Download
                      </Button>
                    </div>

                    <div className="flex items-center gap-1.5 text-[11px] text-muted bg-warmwhite px-3 py-1.5 rounded-lg border border-blush/40 font-mono">
                      <Hash size={12} className="text-secondary shrink-0" />
                      <span className="truncate">{ev.sha256_hash}</span>
                    </div>

                    <div className="pt-2 border-t border-blush/40">
                      <label className="text-[11px] text-muted block mb-1">
                        {ev.file_type.startsWith('audio/') || ev.file_type.includes('audio')
                          ? 'Was this recording made with party consent?'
                          : 'Consent metadata'}
                      </label>
                      <div className="flex gap-2">
                        {['obtained', 'not_obtained', 'unsure'].map((opt) => (
                          <button
                            key={opt}
                            onClick={() => void updateConsent(ev.id, opt)}
                            disabled={updatingConsent === ev.id}
                            className={`text-[11px] font-medium rounded-lg px-2.5 py-1 transition-all disabled:opacity-50 ${
                              ev.consent_status === opt
                                ? 'bg-primary text-white shadow-sm'
                                : 'bg-blush text-muted hover:text-primary'
                            }`}
                          >
                            {opt === 'obtained' ? 'Yes (Obtained)' : opt === 'not_obtained' ? 'No' : 'Unsure'}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
