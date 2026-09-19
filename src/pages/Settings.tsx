import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, AlertCircle, Bell, X, Check, Trash2 } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { AppNav } from '@/components/AppNav';
import { DemoModeBadge } from '@/components/DemoModeBadge';
import { Button } from '@/components/ui/Button';

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
    }, 3500);
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
    <div className="min-h-screen bg-blush/60">
      <AppNav />
      <DemoModeBadge />
      <main className="md:ml-60 pb-24 md:pb-8">
        <div className="max-w-2xl mx-auto p-4 md:p-8 space-y-5">
          <div>
            <h1 className="font-heading text-2xl md:text-3xl font-bold text-primary mb-1">Account & Vault Settings</h1>
            <p className="text-xs md:text-sm text-muted">Account management, safety alert simulations, and data controls.</p>
          </div>

          {/* Account Card */}
          <div className="rounded-2xl bg-warmwhite border border-blush p-6 shadow-sm space-y-4 animate-fade-in">
            <h2 className="font-heading text-base font-semibold text-primary">Account Overview</h2>
            <div className="text-xs text-ink bg-blush/30 p-3.5 rounded-xl border border-blush/50">
              <span className="text-muted block text-[11px] mb-0.5">Signed in as</span>
              <span className="font-semibold text-sm">{user?.email || 'Vault Account Holder'}</span>
            </div>
            <Button
              onClick={handleSignOut}
              variant="outline"
              size="md"
              leftIcon={<LogOut size={16} />}
            >
              Sign Out & Disguise
            </Button>
            <p className="text-[11px] text-muted">
              Signing out locks your vault session and returns to the calculator entry screen.
            </p>
          </div>

          {/* Silent SOS */}
          <div className="rounded-2xl bg-warmwhite border border-blush p-6 shadow-sm space-y-3 animate-fade-in">
            <h2 className="font-heading text-base font-semibold text-primary">Silent SOS Simulation</h2>
            <p className="text-xs text-muted leading-relaxed">
              Demonstration heuristic — in full deployment, this dispatches encrypted emergency alerts to your designated trusted contacts.
            </p>
            <Button
              onClick={() => setSosOpen(true)}
              variant="danger"
              size="md"
              leftIcon={<Bell size={16} />}
            >
              Trigger Silent SOS Demo
            </Button>
          </div>

          {/* Clear Vault Data */}
          <div className="rounded-2xl bg-warmwhite border border-blush p-6 shadow-sm space-y-3 animate-fade-in">
            <h2 className="font-heading text-base font-semibold text-primary">Vault Erase (Emergency Purge)</h2>
            <p className="text-xs text-muted leading-relaxed">
              Permanently delete all incident logs and evidence files stored in your account.
            </p>
            {!clearConfirm ? (
              <Button
                onClick={() => setClearConfirm(true)}
                variant="outline"
                size="md"
                className="text-danger border-danger/30 hover:bg-danger/10"
                leftIcon={<Trash2 size={16} />}
              >
                Purge All Vault Data
              </Button>
            ) : (
              <div className="rounded-xl bg-danger/10 border border-danger/20 p-4 space-y-3">
                <div className="flex items-start gap-2.5 text-xs text-ink">
                  <AlertCircle size={18} className="text-danger shrink-0 mt-0.5" />
                  <span><strong>Warning:</strong> Permanently deletes all recorded incidents and cryptographic evidence files. This action cannot be reversed.</span>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={() => setClearConfirm(false)}
                    variant="secondary"
                    size="sm"
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleClearData}
                    variant="danger"
                    size="sm"
                    loading={clearing}
                    className="flex-1"
                  >
                    {clearing ? 'Purging Data...' : 'Confirm Permanent Deletion'}
                  </Button>
                </div>
              </div>
            )}
            {cleared && (
              <div className="flex items-center gap-2 text-xs font-semibold text-success bg-success/10 p-3 rounded-xl">
                <Check size={16} />
                All vault data cleared successfully.
              </div>
            )}
          </div>

          {/* Product Roadmap */}
          <div className="rounded-2xl bg-warmwhite border border-blush p-6 shadow-sm space-y-4">
            <h2 className="font-heading text-base font-semibold text-primary">Sakshya Architectural Roadmap</h2>
            <div className="space-y-4 text-xs text-ink">
              <Phase
                title="Phase 2 — Enhanced Offline & Mobile Stealth"
                items={[
                  'Offline-first IndexedDB queue for low-connectivity environments',
                  'Native mobile stealth mode with hidden icon',
                  'Multi-lingual voice input (Hindi, Marathi, regional languages)',
                  'Direct emergency SMS / WhatsApp webhook alerts',
                ]}
              />
              <Phase
                title="Phase 3 — Legal & Institution Integration"
                items={[
                  'Formal DLSA / One Stop Centre referral portal integration',
                  'WhatsApp export parser with metadata preservation',
                  'Verified computer forensics expert directory for Section 63 Part B certification',
                  'Court-validated dossier templates',
                ]}
              />
            </div>
          </div>
        </div>
      </main>

      {/* SOS Modal */}
      {sosOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in" onClick={() => !sosSent && setSosOpen(false)}>
          <div className="w-full max-w-sm rounded-2xl bg-warmwhite p-6 shadow-2xl space-y-4 border border-blush" onClick={(e) => e.stopPropagation()}>
            {sosSent ? (
              <div className="text-center space-y-3 py-2">
                <div className="w-12 h-12 rounded-full bg-success/15 flex items-center justify-center mx-auto text-success">
                  <Check size={28} />
                </div>
                <h3 className="font-heading text-base font-bold text-primary">Emergency Alert Prepared</h3>
                <p className="text-xs text-ink">
                  Simulated dispatch to designated <strong>Trusted Contact</strong>.
                </p>
                <p className="text-[11px] text-muted">
                  Demo simulation complete. No external network request was emitted.
                </p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <h3 className="font-heading text-base font-bold text-primary">Silent SOS Simulation</h3>
                  <button onClick={() => setSosOpen(false)} className="text-muted hover:text-ink">
                    <X size={18} />
                  </button>
                </div>
                <p className="text-xs text-ink">
                  This feature prepares a silent emergency alert containing location telemetry for your designated contact.
                </p>
                <div className="rounded-xl bg-blush/40 p-3 text-xs text-ink border border-blush/60">
                  <span className="text-muted block text-[11px]">Primary Emergency Contact</span>
                  <span className="font-semibold">Trusted Family Member (Demo)</span>
                </div>
                <Button
                  onClick={handleSOS}
                  variant="danger"
                  size="md"
                  fullWidth
                >
                  Send Simulated Alert
                </Button>
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
    <div className="space-y-1.5">
      <h3 className="text-xs font-bold text-secondary">{title}</h3>
      <ul className="space-y-1 pl-4">
        {items.map((item, i) => (
          <li key={i} className="list-disc text-xs text-ink leading-relaxed">{item}</li>
        ))}
      </ul>
    </div>
  );
}
