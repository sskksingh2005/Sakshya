import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Calendar, Tag, AlertTriangle, FileText, Hash, Check, Download } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Incident, Evidence } from '@/types';
import { AppNav } from '@/components/AppNav';
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
      <div className="min-h-screen bg-blush">
        <AppNav />
        <main className="md:ml-60 pb-20 md:pb-0">
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin-slow w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
          </div>
        </main>
      </div>
    );
  }

  if (!incident) {
    return (
      <div className="min-h-screen bg-blush">
        <AppNav />
        <main className="md:ml-60 pb-20 md:pb-0">
          <div className="max-w-2xl mx-auto p-8 text-center">
            <p className="text-sm text-muted">This incident could not be found.</p>
            <Link to="/dashboard" className="text-sm text-accent hover:underline mt-2 inline-block">
              Back to Dashboard
            </Link>
          </div>
        </main>
      </div>
    );
  }

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

          {/* Incident header */}
          <div className="rounded-2xl bg-warmwhite border border-blush p-5 mb-4">
            <div className="flex items-center gap-2 text-xs text-muted mb-2">
              <Calendar size={14} />
              {new Date(incident.incident_date).toLocaleDateString('en-IN', {
                day: 'numeric', month: 'long', year: 'numeric',
              })}
            </div>
            <h1 className="font-heading text-xl font-bold text-primary mb-3">Incident Details</h1>

            {/* Badges */}
            <div className="flex flex-wrap gap-2 mb-4">
              {incident.category && (
                <span className="flex items-center gap-1 text-xs bg-secondary/15 text-secondary rounded-full px-2.5 py-1">
                  <Tag size={11} />
                  {getCategoryLabel(incident.category)}
                </span>
              )}
              {incident.severity_score !== null && (
                <span
                  className="text-xs font-medium rounded-full px-2.5 py-1"
                  style={{
                    color: getSeverityColor(incident.severity_score),
                    backgroundColor: getSeverityColor(incident.severity_score) + '15',
                  }}
                >
                  Severity: {getSeverityLabel(incident.severity_score)}
                </span>
              )}
              {incident.escalation_flag && (
                <span className="flex items-center gap-1 text-xs bg-danger/15 text-danger rounded-full px-2.5 py-1">
                  <AlertTriangle size={11} />
                  Escalation flagged
                </span>
              )}
            </div>

            {/* Original description */}
            <div className="mb-4">
              <label className="text-xs font-medium text-muted">Your original description (preserved unedited)</label>
              <p className="text-sm text-ink bg-blush/30 rounded-lg p-3 mt-1 whitespace-pre-wrap">{incident.description}</p>
            </div>

            {/* AI summary */}
            {incident.ai_summary && (
              <div className="mb-4">
                <label className="text-xs font-medium text-muted">AI-generated summary</label>
                <p className="text-sm text-ink bg-blush/30 rounded-lg p-3 mt-1">{incident.ai_summary}</p>
              </div>
            )}

            {/* People involved */}
            {incident.people_involved && incident.people_involved.length > 0 && (
              <div className="mb-4">
                <label className="text-xs font-medium text-muted">People mentioned</label>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {incident.people_involved.map((p, i) => (
                    <span key={i} className="text-xs bg-secondary/15 text-secondary rounded-full px-2.5 py-1">{p}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Risk keywords */}
            {incident.risk_keywords_detected && incident.risk_keywords_detected.length > 0 && (
              <div>
                <label className="text-xs font-medium text-muted">Risk keywords detected</label>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {incident.risk_keywords_detected.map((k, i) => (
                    <span key={i} className="text-xs bg-danger/15 text-danger rounded-full px-2.5 py-1">{k}</span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Evidence */}
          <div className="rounded-2xl bg-warmwhite border border-blush p-5">
            <h2 className="font-heading text-base font-semibold text-primary mb-3">Evidence Files</h2>

            {evidence.length === 0 ? (
              <p className="text-sm text-muted">No evidence files attached to this incident.</p>
            ) : (
              <div className="space-y-3">
                {evidence.map((ev) => (
                  <div key={ev.id} className="rounded-lg bg-blush/30 p-3 border border-blush">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-start gap-2 flex-1 min-w-0">
                        <FileText size={18} className="text-secondary shrink-0 mt-0.5" />
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-ink truncate">{ev.filename}</p>
                          <p className="text-xs text-muted">
                            Uploaded {new Date(ev.uploaded_at).toLocaleString('en-IN')}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => downloadFile(ev)}
                        className="text-secondary hover:text-accent shrink-0"
                        aria-label="Download file"
                      >
                        <Download size={16} />
                      </button>
                    </div>

                    <div className="flex items-center gap-1.5 text-xs text-muted mb-2">
                      <Hash size={10} />
                      <span className="font-mono text-[10px] break-all">{ev.sha256_hash}</span>
                    </div>

                    {/* Consent status */}
                    <div>
                      <label className="text-xs text-muted block mb-1">
                        {ev.file_type.startsWith('audio/') || ev.file_type.includes('audio')
                          ? 'Was this recording made with the other person\'s knowledge?'
                          : 'Consent status'}
                      </label>
                      <div className="flex gap-2">
                        {['obtained', 'not_obtained', 'unsure'].map((opt) => (
                          <button
                            key={opt}
                            onClick={() => updateConsent(ev.id, opt)}
                            disabled={updatingConsent === ev.id}
                            className={`text-xs rounded-full px-2.5 py-1 transition-colors disabled:opacity-50 ${
                              ev.consent_status === opt
                                ? 'bg-primary text-white'
                                : 'bg-blush text-muted hover:text-primary'
                            }`}
                          >
                            {opt === 'obtained' ? 'Yes' : opt === 'not_obtained' ? 'No' : 'Unsure'}
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
