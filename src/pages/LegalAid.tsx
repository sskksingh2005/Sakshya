import { useState, useEffect, useCallback } from 'react';
import { Phone, MapPin, ExternalLink, Info } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Resource, Incident } from '@/types';
import { AppNav } from '@/components/AppNav';
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
    helpline: 'bg-danger/15 text-danger',
    nalsa: 'bg-primary/15 text-primary',
    ncw: 'bg-secondary/15 text-secondary',
    osc: 'bg-accent/15 text-accent',
    dlsa: 'bg-success/15 text-success',
  };

  return (
    <div className="min-h-screen bg-blush">
      <AppNav />
      <main className="md:ml-60 pb-20 md:pb-0">
        <div className="max-w-2xl mx-auto p-4 md:p-8">
          <h1 className="font-heading text-2xl font-bold text-primary mb-1">Legal Aid Directory</h1>
          <p className="text-sm text-muted mb-2">
            Verified contacts for legal support, helplines, and women's services in India.
          </p>

          <div className="rounded-lg bg-secondary/10 border border-secondary/20 p-3 mb-6 flex items-start gap-2">
            <Info size={16} className="text-secondary shrink-0 mt-0.5" />
            <p className="text-xs text-ink">
              <strong>AI-assisted intake preparation — not legal advice.</strong>{' '}
              {recentCategory
                ? `Based on your most recent incident (${getCategoryLabel(recentCategory)}), emergency helplines are shown first.`
                : 'Resources are listed in their default order. Add an incident to get category-based prioritization.'}
            </p>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin-slow w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
            </div>
          ) : (
            <div className="space-y-3">
              {sortedResources.map((res) => (
                <div key={res.id} className="rounded-2xl bg-warmwhite border border-blush p-4 animate-fade-in">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-[10px] font-semibold uppercase tracking-wide rounded-full px-2 py-0.5 ${typeColors[res.type] || 'bg-blush text-muted'}`}>
                          {res.type}
                        </span>
                        {res.last_verified && (
                          <span className="text-[10px] text-muted">
                            Verified: {new Date(res.last_verified).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}
                          </span>
                        )}
                      </div>
                      <h3 className="font-heading text-sm font-semibold text-primary">{res.name}</h3>
                    </div>
                  </div>

                  <p className="text-xs text-ink mb-3 leading-relaxed">{res.description}</p>

                  {res.phone && (
                    <a
                      href={`tel:${res.phone}`}
                      className="inline-flex items-center gap-2 rounded-lg bg-accent text-white px-4 py-2 text-sm font-medium hover:bg-accent-light transition-colors"
                    >
                      <Phone size={14} />
                      {res.phone}
                    </a>
                  )}

                  {!res.phone && (res.type === 'osc' || res.type === 'dlsa') && (
                    <div className="flex items-center gap-1.5 text-xs text-muted">
                      <MapPin size={12} />
                      Search online for your nearest location
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="mt-6 rounded-xl bg-warmwhite border border-blush p-4">
            <p className="text-xs text-muted leading-relaxed">
              These contacts were manually verified at the time of seeding. Always confirm current availability and numbers before relying on them in an emergency. If you are in immediate danger, call <strong className="text-danger">112</strong> or <strong className="text-danger">181</strong>.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
