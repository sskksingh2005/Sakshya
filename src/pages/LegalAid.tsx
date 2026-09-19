import { useState, useEffect, useCallback } from 'react';
import { Phone, MapPin, Info } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Resource } from '@/types';
import { AppNav } from '@/components/AppNav';
import { LoadingState } from '@/components/ui/LoadingState';
import { getCategoryLabel } from '@/lib/utils';

export function LegalAid() {
  const [resources, setResources] = useState<Resource[]>([]);
  const [recentCategory, setRecentCategory] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    const { data: res } = await supabase
      .from('resources')
      .select('*')
      .order('name', { ascending: true });

    setResources((res || []) as Resource[]);

    // Get most recent incident category for filtering
    const { data: inc } = await supabase
      .from('incidents')
      .select('category, severity_score')
      .order('incident_date', { ascending: false })
      .limit(1);

    if (inc && inc.length > 0) {
      setRecentCategory(inc[0].category);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Sort: if recent incident is physical abuse or high severity, show helplines first
  const sortedResources = [...resources].sort((a, b) => {
    const highSeverity = recentCategory === 'physical_abuse' || recentCategory === 'threat';
    if (highSeverity) {
      if (a.type === 'helpline' && b.type !== 'helpline') return -1;
      if (b.type === 'helpline' && a.type !== 'helpline') return 1;
    }
    return 0;
  });

  const typeColors: Record<string, string> = {
    helpline: 'bg-danger/15 text-danger border-danger/30',
    nalsa: 'bg-primary/15 text-primary border-primary/30',
    ncw: 'bg-secondary/15 text-secondary border-secondary/30',
    osc: 'bg-accent/15 text-accent border-accent/30',
    dlsa: 'bg-success/15 text-success border-success/30',
  };

  return (
    <div className="min-h-screen bg-blush/60">
      <AppNav />
      <main className="md:ml-60 pb-24 md:pb-8">
        <div className="max-w-2xl mx-auto p-4 md:p-8 space-y-5">
          <div>
            <h1 className="font-heading text-2xl md:text-3xl font-bold text-primary mb-1">Support & Legal-Resource Pathways</h1>
            <p className="text-xs md:text-sm text-muted">
              Verified contacts for legal support, emergency helplines, and women's protection services in India.
            </p>
          </div>

          <div className="rounded-2xl bg-secondary/10 border border-secondary/20 p-4 flex items-start gap-3">
            <Info size={18} className="text-secondary shrink-0 mt-0.5" />
            <p className="text-xs text-ink leading-relaxed">
              <strong>Support Pathway Prioritization — Not Legal Advice.</strong>{' '}
              {recentCategory
                ? `Based on your most recent incident (${getCategoryLabel(recentCategory)}), urgent helplines are prioritized first.`
                : 'Resources are listed in standard order. Add an incident to enable category-matched prioritization.'}
            </p>
          </div>

          {loading ? (
            <LoadingState message="Loading support directory..." className="py-20" />
          ) : (
            <div className="space-y-3.5">
              {sortedResources.map((res) => (
                <div key={res.id} className="rounded-2xl bg-warmwhite border border-blush/80 p-5 shadow-sm animate-fade-in space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className={`text-[10px] font-semibold uppercase tracking-wider rounded-full px-2.5 py-0.5 border ${typeColors[res.type] || 'bg-blush text-muted border-blush'}`}>
                          {res.type}
                        </span>
                        {res.last_verified && (
                          <span className="text-[10px] text-muted font-medium">
                            Verified {new Date(res.last_verified).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}
                          </span>
                        )}
                      </div>
                      <h3 className="font-heading text-base font-semibold text-primary">{res.name}</h3>
                    </div>
                  </div>

                  <p className="text-xs text-ink leading-relaxed">{res.description}</p>

                  {res.phone && (
                    <a
                      href={`tel:${res.phone}`}
                      className="inline-flex items-center gap-2 rounded-xl bg-accent text-white px-4 py-2.5 text-xs font-semibold hover:bg-accent-light transition-all shadow-sm active:scale-98"
                    >
                      <Phone size={14} />
                      Call {res.phone}
                    </a>
                  )}

                  {!res.phone && (res.type === 'osc' || res.type === 'dlsa') && (
                    <div className="flex items-center gap-1.5 text-xs text-muted font-medium pt-1">
                      <MapPin size={14} className="text-secondary shrink-0" />
                      Search online for your nearest District Legal Services Authority or One Stop Center
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="rounded-2xl bg-warmwhite border border-blush p-4">
            <p className="text-xs text-muted leading-relaxed">
              Contacts are updated periodically. Always verify emergency availability directly. If you are in immediate physical danger, call <strong className="text-danger">112</strong> or <strong className="text-danger">181</strong> immediately.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
