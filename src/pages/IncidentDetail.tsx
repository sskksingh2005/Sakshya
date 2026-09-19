import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, Tag, AlertTriangle, FileText, Hash, Download } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Incident, Evidence } from '@/types';
import { AppNav } from '@/components/AppNav';
import { LoadingState } from '@/components/ui/LoadingState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Button } from '@/components/ui/Button';
import { getCategoryLabel, getSeverityLabel, getSeverityColor } from '@/lib/utils';

export function IncidentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [incident, setIncident] = useState<Incident | null>(null);
  const [evidence, setEvidence] = useState<Evidence[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingConsent, setUpdatingConsent] = useState<string | null>(null);

  const loadIncident = useCallback(async () => {
    if (!id) return;
    const { data: inc, error: incErr } = await supabase
      .from('incidents')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (incErr || !inc) {
      setLoading(false);
      return;
    }
    setIncident(inc as Incident);

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

          {/* Incident header card */}
          <div className="rounded-2xl bg-warmwhite border border-blush p-6 shadow-sm space-y-4 animate-fade-in">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs text-muted font-medium bg-blush/40 px-3 py-1 rounded-full">
                <Calendar size={13} />
                {new Date(incident.incident_date).toLocaleDateString('en-IN', {
                  day: 'numeric', month: 'long', year: 'numeric',
                })}
              </div>
              <span className="text-[11px] text-muted font-mono">ID: {incident.id.substring(0, 8)}...</span>
            </div>

            <h1 className="font-heading text-xl font-bold text-primary">Incident Record</h1>

            {/* Category & severity badges */}
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

            {/* Original narrative */}
            <div className="pt-2">
              <label className="text-xs font-semibold text-muted uppercase tracking-wider block mb-1">
                Original Account (Preserved Unedited)
              </label>
              <p className="text-sm text-ink bg-blush/20 border border-blush/60 rounded-xl p-4 leading-relaxed whitespace-pre-wrap">
                {incident.description}
              </p>
            </div>

            {/* AI summary */}
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

            {/* People mentioned */}
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

            {/* Risk keywords */}
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

          {/* Evidence section */}
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
                        onClick={() => downloadFile(ev)}
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

                    {/* Consent status */}
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
                            onClick={() => updateConsent(ev.id, opt)}
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
