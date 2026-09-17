import { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Plus, Calendar, ChevronRight, FileText, Inbox } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import type { Incident, Evidence } from '@/types';
import { DangerIndicator } from '@/components/DangerIndicator';
import { EscalationBanner } from '@/components/EscalationBanner';
import { DemoModeBadge } from '@/components/DemoModeBadge';
import { AppNav } from '@/components/AppNav';
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
      return;
    }

    setIncidents((data || []) as Incident[]);

    // Load evidence counts
    if (data && data.length > 0) {
      const { data: evidence } = await supabase
        .from('evidence')
        .select('incident_id');
      const counts: Record<string, number> = {};
      (evidence || []).forEach((e: any) => {
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
    <div className="min-h-screen bg-blush">
      <AppNav />
      <DemoModeBadge />
      <main className="md:ml-60 pb-20 md:pb-0">
        <div className="max-w-4xl mx-auto p-4 md:p-8">
          {/* Header */}
          <div className="mb-6">
            <h1 className="font-heading text-2xl font-bold text-primary mb-1">Your Dashboard</h1>
            <p className="text-sm text-muted">A calm, private space for your evidence and safety planning.</p>
          </div>

          {/* Offline notice */}
          {isOffline && (
            <div className="mb-4 rounded-xl bg-warmwhite border border-blush p-3 text-sm text-muted">
              You're offline right now. Your existing evidence is still visible below, but adding new incidents requires an internet connection.
            </div>
          )}

          {/* Danger indicator + escalation */}
          <div className="space-y-4 mb-6">
            <DangerIndicator factors={dangerFactors} />
            <EscalationBanner analysis={escalation} />
          </div>

          {/* Add incident CTA */}
          <Link
            to="/incidents/new"
            className="block rounded-2xl bg-accent text-white p-4 shadow-md hover:bg-accent-light transition-colors mb-6"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Plus size={24} />
                <div>
                  <p className="font-semibold">Add New Incident</p>
                  <p className="text-xs text-white/80">Document what happened — AI will help classify it</p>
                </div>
              </div>
              <ChevronRight size={20} />
            </div>
          </Link>

          {/* Timeline */}
          <div>
            <h2 className="font-heading text-lg font-semibold text-primary mb-3">Incident Timeline</h2>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin-slow w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
            </div>
          ) : incidents.length === 0 ? (
            <div className="rounded-2xl bg-warmwhite border border-blush p-8 text-center">
              <Inbox size={32} className="text-muted mx-auto mb-3" />
              <p className="text-sm font-medium text-ink mb-1">No incidents yet</p>
              <p className="text-xs text-muted mb-4">
                When you're ready, you can start documenting here. Your records are private and only visible to you.
              </p>
              <Link
                to="/incidents/new"
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary text-white px-4 py-2 text-sm font-medium hover:bg-secondary transition-colors"
              >
                <Plus size={16} />
                Add your first incident
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {incidents.map((inc) => (
                <Link
                  key={inc.id}
                  to={`/incidents/${inc.id}`}
                  className="block rounded-xl bg-warmwhite border border-blush p-4 hover:shadow-md transition-shadow animate-fade-in"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5">
                        <Calendar size={14} className="text-muted" />
                        <span className="text-xs text-muted">
                          {new Date(inc.incident_date).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </span>
                        {inc.category && (
                          <span className="text-xs font-medium text-secondary">
                            {getCategoryLabel(inc.category)}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-ink line-clamp-2">
                        {inc.description}
                      </p>
                      <div className="flex items-center gap-3 mt-2">
                        {inc.severity_score && (
                          <span
                            className="text-xs font-medium px-2 py-0.5 rounded-full"
                            style={{
                              color: getSeverityColor(inc.severity_score),
                              backgroundColor: getSeverityColor(inc.severity_score) + '15',
                            }}
                          >
                            {getSeverityLabel(inc.severity_score)}
                          </span>
                        )}
                        {evidenceCounts[inc.id] > 0 && (
                          <span className="flex items-center gap-1 text-xs text-muted">
                            <FileText size={12} />
                            {evidenceCounts[inc.id]} evidence file{evidenceCounts[inc.id] > 1 ? 's' : ''}
                          </span>
                        )}
                        {inc.escalation_flag && (
                          <span className="text-xs font-medium text-danger">Escalation flagged</span>
                        )}
                      </div>
                    </div>
                    <ChevronRight size={18} className="text-muted shrink-0 mt-1" />
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
