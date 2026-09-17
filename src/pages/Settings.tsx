import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, AlertCircle, Bell, X, Check, MapPin, Trash2 } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { AppNav } from '@/components/AppNav';
import { DemoModeBadge } from '@/components/DemoModeBadge';

export function Settings() {
  const navigate = useNavigate();
  const { signOut, user } = useAuth();
  const [sosOpen, setSosOpen] = useState(false);
  const [sosSent, setSosSent] = useState(false);
  const [clearConfirm, setClearConfirm] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [cleared, setCleared] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const handleSOS = () => {
    setSosSent(true);
    setTimeout(() => {
      setSosSent(false);
      setSosOpen(false);
    }, 4000);
  };

  const handleClearData = async () => {
    if (!user) return;
    setClearing(true);
    // Delete all evidence files from storage
    const { data: evidence } = await supabase.from('evidence').select('storage_path');
    if (evidence) {
      for (const ev of evidence) {
        await supabase.storage.from('evidence').remove([ev.storage_path]);
      }
    }
    // Delete all incidents (cascade will delete evidence rows)
    await supabase.from('incidents').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    setClearing(false);
    setCleared(true);
    setClearConfirm(false);
    setTimeout(() => setCleared(false), 3000);
  };

  return (
    <div className="min-h-screen bg-blush">
      <AppNav />
      <DemoModeBadge />
      <main className="md:ml-60 pb-20 md:pb-0">
        <div className="max-w-2xl mx-auto p-4 md:p-8">
          <h1 className="font-heading text-2xl font-bold text-primary mb-1">Settings</h1>
          <p className="text-sm text-muted mb-6">Account, safety features, and data management.</p>

          {/* Account */}
          <div className="rounded-2xl bg-warmwhite border border-blush p-5 mb-4">
            <h2 className="font-heading text-base font-semibold text-primary mb-3">Account</h2>
            <div className="text-sm text-ink mb-4">
              <p className="text-xs text-muted">Signed in as</p>
              <p className="font-medium">{user?.email}</p>
            </div>
            <button
              onClick={handleSignOut}
              className="flex items-center gap-2 rounded-lg bg-primary text-white px-4 py-2.5 text-sm font-medium hover:bg-secondary transition-colors"
            >
              <LogOut size={16} />
              Sign Out
            </button>
            <p className="text-xs text-muted mt-2">
              Signing out returns you to the calculator screen. Your data remains safely stored in your private account.
            </p>
          </div>

          {/* Silent SOS */}
          <div className="rounded-2xl bg-warmwhite border border-blush p-5 mb-4">
            <h2 className="font-heading text-base font-semibold text-primary mb-1">Silent SOS</h2>
            <p className="text-xs text-muted mb-4">
              Simulated feature — no real message is sent. In a real deployment, this would alert your trusted contact.
            </p>
            <button
              onClick={() => setSosOpen(true)}
              className="flex items-center gap-2 rounded-lg bg-danger text-white px-4 py-2.5 text-sm font-medium hover:opacity-90 transition-opacity"
            >
              <Bell size={16} />
              Trigger Silent SOS
            </button>
          </div>

          {/* Clear data */}
          <div className="rounded-2xl bg-warmwhite border border-blush p-5 mb-4">
            <h2 className="font-heading text-base font-semibold text-primary mb-1">Clear My Data</h2>
            <p className="text-xs text-muted mb-4">
              Permanently delete all your incidents and evidence files. This cannot be undone.
            </p>
            {!clearConfirm ? (
              <button
                onClick={() => setClearConfirm(true)}
                className="flex items-center gap-2 rounded-lg border border-danger text-danger px-4 py-2.5 text-sm font-medium hover:bg-danger/5 transition-colors"
              >
                <Trash2 size={16} />
                Clear All Data
              </button>
            ) : (
              <div className="rounded-lg bg-danger/8 border border-danger/20 p-4">
                <div className="flex items-start gap-2 mb-3">
                  <AlertCircle size={16} className="text-danger shrink-0 mt-0.5" />
                  <p className="text-sm text-ink">
                    Are you sure? This will permanently delete all incidents and evidence. This action cannot be undone.
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setClearConfirm(false)}
                    className="flex-1 rounded-lg border border-muted text-muted py-2 text-sm font-medium hover:text-primary transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleClearData}
                    disabled={clearing}
                    className="flex-1 rounded-lg bg-danger text-white py-2 text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
                  >
                    {clearing ? 'Clearing...' : 'Yes, Delete Everything'}
                  </button>
                </div>
              </div>
            )}
            {cleared && (
              <div className="mt-3 flex items-center gap-2 text-sm text-success">
                <Check size={16} />
                All data cleared successfully.
              </div>
            )}
          </div>

          {/* Roadmap */}
          <div className="rounded-2xl bg-warmwhite border border-blush p-5">
            <h2 className="font-heading text-base font-semibold text-primary mb-3">Project to Product Roadmap</h2>
            <p className="text-xs text-muted mb-3">
              Sakshya is a hackathon MVP with a clear path to a real product. Here's what's planned for future phases:
            </p>
            <div className="space-y-3">
              <Phase
                title="Phase 2 — Enhanced Safety"
                items={[
                  'Real offline-first sync with IndexedDB queuing for low-connectivity field conditions',
                  'Native mobile app with hidden icon (true stealth, not browser-based disguise)',
                  'Multi-language voice input (Hindi, regional languages)',
                  'Real SOS integration via SMS / WhatsApp / push notifications',
                ]}
              />
              <Phase
                title="Phase 3 — Legal Integration"
                items={[
                  'Formal partnerships with DLSAs and One Stop Centres for direct case referral',
                  'WhatsApp evidence import with metadata preservation',
                  'Expert network for Section 63 Part B certificate completion',
                  'Court-ready dossier templates validated by legal professionals',
                ]}
              />
            </div>
          </div>
        </div>
      </main>

      {/* SOS Modal */}
      {sosOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-fade-in" onClick={() => !sosSent && setSosOpen(false)}>
          <div className="w-full max-w-sm rounded-2xl bg-warmwhite p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            {sosSent ? (
              <div className="text-center">
                <div className="w-14 h-14 rounded-full bg-success/15 flex items-center justify-center mx-auto mb-4">
                  <Check size={28} className="text-success" />
                </div>
                <h3 className="font-heading text-lg font-semibold text-primary mb-2">Alert Prepared</h3>
                <p className="text-sm text-ink mb-1">
                  Alert prepared for <strong>Trusted Contact</strong> (placeholder).
                </p>
                <p className="text-xs text-muted">
                  This is a demo simulation — no real message is sent.
                </p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-heading text-lg font-semibold text-primary">Silent SOS</h3>
                  <button onClick={() => setSosOpen(false)} className="text-muted hover:text-ink">
                    <X size={20} />
                  </button>
                </div>
                <p className="text-sm text-ink mb-2">
                  This will prepare a silent alert for your trusted contact.
                </p>
                <div className="rounded-lg bg-blush/50 p-3 mb-4">
                  <p className="text-xs text-muted mb-1">Trusted Contact (placeholder):</p>
                  <p className="text-sm font-medium text-ink">Trusted Family Member</p>
                </div>
                <div className="flex items-start gap-2 rounded-lg bg-danger/8 p-3 mb-4">
                  <AlertCircle size={14} className="text-danger shrink-0 mt-0.5" />
                  <p className="text-xs text-ink">
                    <strong>Simulated feature:</strong> No real message will be sent. In a real deployment, this would send an SMS or notification to your trusted contact with your location.
                  </p>
                </div>
                <button
                  onClick={handleSOS}
                  className="w-full rounded-lg bg-danger text-white py-3 text-sm font-semibold hover:opacity-90 transition-opacity"
                >
                  Send Alert
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Phase({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-secondary mb-1.5">{title}</h3>
      <ul className="space-y-1 ml-4">
        {items.map((item, i) => (
          <li key={i} className="list-disc text-xs text-ink leading-relaxed">{item}</li>
        ))}
      </ul>
    </div>
  );
}
