import { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Plus, Calendar, ChevronRight, FileText } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import type { Incident } from '@/types';
import { DangerIndicator } from '@/components/DangerIndicator';
import { EscalationBanner } from '@/components/EscalationBanner';
import { DemoModeBadge } from '@/components/DemoModeBadge';
import { AppNav } from '@/components/AppNav';
import { LoadingState } from '@/components/ui/LoadingState';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';
import {
  computeDangerFactors,
  detectEscalation,
  getCategoryLabel,
  getSeverityLabel,
  getSeverityColor,
} from '@/lib/utils';

export function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [evidenceCounts, setEvidenceCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  const loadIncidents = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from('incidents')
      .select('*')
      .order('incident_date', { ascending: false });

    if (error) {
      console.error('Error loading incidents:', error);
      setLoading(false);
      return;
    }

    setIncidents((data || []) as Incident[]);

    // Load evidence counts
    if (data && data.length > 0) {
      const { data: evidence } = await supabase
        .from('evidence')
        .select('incident_id');
      const counts: Record<string, number> = {};
      (evidence || []).forEach((e: { incident_id: string }) => {
        counts[e.incident_id] = (counts[e.incident_id] || 0) + 1;
      });
      setEvidenceCounts(counts);
    }

    setLoading(false);
  }, [user]);

  useEffect(() => {
    loadIncidents();

    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [loadIncidents]);

  const dangerFactors = computeDangerFactors(incidents);
  const escalation = detectEscalation(incidents);

  return (
    <div className="min-h-screen bg-blush/60">
      <AppNav />
      <DemoModeBadge />
      <main className="md:ml-60 pb-24 md:pb-8">
        <div className="max-w-4xl mx-auto p-4 md:p-8 space-y-6">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="font-heading text-2xl md:text-3xl font-bold text-primary mb-1">Vault Dashboard</h1>
              <p className="text-xs md:text-sm text-muted">A calm, private space for your evidence and safety planning.</p>
            </div>
            <Button
              onClick={() => navigate('/incidents/new')}
              variant="primary"
              size="md"
              leftIcon={<Plus size={18} />}
            >
              Add Incident
            </Button>
          </div>

          {/* Offline notice */}
          {isOffline && (
            <div className="rounded-xl bg-warmwhite border border-blush p-3 text-xs text-muted flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
              <span>You're currently offline. Existing evidence is preserved, but adding new records requires a connection.</span>
            </div>
          )}

          {/* Danger indicator + escalation */}
          <div className="space-y-4">
            <DangerIndicator factors={dangerFactors} />
            <EscalationBanner analysis={escalation} />
          </div>

          {/* Add incident CTA card */}
          <div
            onClick={() => navigate('/incidents/new')}
            className="group rounded-2xl bg-gradient-to-r from-primary via-secondary to-accent text-white p-5 shadow-md hover:shadow-lg transition-all cursor-pointer flex items-center justify-between"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <Plus size={24} className="text-white" />
              </div>
              <div>
                <p className="font-heading font-semibold text-base">Document New Incident</p>
                <p className="text-xs text-white/80 mt-0.5">Describe what happened — AI will assist in structuring your evidence.</p>
              </div>
            </div>
            <ChevronRight size={22} className="text-white/70 group-hover:translate-x-1 transition-transform shrink-0" />
          </div>

          {/* Timeline */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-heading text-lg font-semibold text-primary">Incident Timeline</h2>
              {incidents.length > 0 && (
                <span className="text-xs font-medium text-muted">{incidents.length} recorded incident{incidents.length > 1 ? 's' : ''}</span>
              )}
            </div>

            {loading ? (
              <LoadingState message="Loading your evidence records..." />
            ) : incidents.length === 0 ? (
              <EmptyState
                title="No incidents recorded yet"
                description="When you're ready, you can start documenting here. Your records are private, timestamped, and stored securely."
                action={
                  <Button
                    onClick={() => navigate('/incidents/new')}
                    variant="primary"
                    size="sm"
                    leftIcon={<Plus size={16} />}
                  >
                    Add your first incident
                  </Button>
                }
              />
            ) : (
              <div className="space-y-3">
                {incidents.map((inc) => (
                  <Link
                    key={inc.id}
                    to={`/incidents/${inc.id}`}
                    className="block rounded-2xl bg-warmwhite border border-blush/80 p-5 hover:border-accent/30 hover:shadow-md transition-all animate-fade-in group"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <span className="flex items-center gap-1 text-xs text-muted font-medium bg-blush/40 px-2.5 py-0.5 rounded-full">
                            <Calendar size={12} />
                            {new Date(inc.incident_date).toLocaleDateString('en-IN', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </span>
                          {inc.category && (
                            <span className="text-xs font-semibold text-secondary bg-secondary/10 px-2.5 py-0.5 rounded-full">
                              {getCategoryLabel(inc.category)}
                            </span>
                          )}
                          {inc.escalation_flag && (
                            <span className="text-xs font-semibold text-danger bg-danger/10 px-2.5 py-0.5 rounded-full">
                              Escalation Flagged
                            </span>
                          )}
                        </div>

                        <p className="text-sm text-ink line-clamp-2 leading-relaxed">
                          {inc.description}
                        </p>

                        <div className="flex items-center gap-4 mt-3 pt-2 border-t border-blush/40">
                          {inc.severity_score && (
                            <span
                              className="text-xs font-semibold px-2.5 py-0.5 rounded-full"
                              style={{
                                color: getSeverityColor(inc.severity_score),
                                backgroundColor: getSeverityColor(inc.severity_score) + '15',
                              }}
                            >
                              Severity: {getSeverityLabel(inc.severity_score)}
                            </span>
                          )}
                          {evidenceCounts[inc.id] > 0 && (
                            <span className="flex items-center gap-1 text-xs text-muted font-medium">
                              <FileText size={13} className="text-accent" />
                              {evidenceCounts[inc.id]} evidence file{evidenceCounts[inc.id] > 1 ? 's' : ''}
                            </span>
                          )}
                        </div>
                      </div>
                      <ChevronRight size={20} className="text-muted group-hover:text-accent group-hover:translate-x-1 transition-all shrink-0 mt-1" />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
