import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Lock, ArrowRight, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { SakshyaLogo } from '@/components/branding/SakshyaLogo';
import { Button } from '@/components/ui/Button';

export function AuthPage() {
  const navigate = useNavigate();
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleTabSwitch = (newMode: 'signin' | 'signup') => {
    if (loading) return;
    setMode(newMode);
    setError(null);
    setInfoMessage(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    setError(null);
    setInfoMessage(null);
    setLoading(true);

    try {
      if (mode === 'signin') {
        const result = await signIn(email, password);
        setLoading(false);
        if (result.error) {
          setError(result.error);
        } else {
          navigate('/dashboard');
        }
      } else {
        const result = await signUp(email, password);
        setLoading(false);
        if (result.error) {
          setError(result.error);
        } else if (result.needsConfirmation) {
          setInfoMessage('Account created! Please check your email to verify your account, then sign in.');
          setMode('signin');
        } else {
          navigate('/dashboard');
        }
      }
    } catch {
      setLoading(false);
      setError('An unexpected error occurred. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-blush/60 flex items-center justify-center p-4">
      <div className="w-full max-w-md animate-fade-in">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <SakshyaLogo size="lg" showWordmark={true} tagline="Preserving your options." />
          </div>
          <p className="text-xs text-muted mt-2">
            {mode === 'signin' ? 'Welcome back. Your safety matters.' : 'Create your private evidence vault.'}
          </p>
        </div>

        <div className="rounded-2xl bg-warmwhite border border-blush shadow-lg p-6 md:p-8">
          <div className="flex gap-2 mb-6 bg-blush/40 p-1 rounded-xl">
            <button
              type="button"
              disabled={loading}
              onClick={() => handleTabSwitch('signin')}
              className={`flex-1 rounded-lg py-2 text-xs font-semibold transition-all ${
                mode === 'signin' ? 'bg-primary text-white shadow-sm' : 'text-muted hover:text-primary'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={() => handleTabSwitch('signup')}
              className={`flex-1 rounded-lg py-2 text-xs font-semibold transition-all ${
                mode === 'signup' ? 'bg-primary text-white shadow-sm' : 'text-muted hover:text-primary'
              }`}
            >
              Sign Up
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-ink mb-1.5">Email Address</label>
              <div className="relative">
                <Mail size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                  className="w-full rounded-xl border border-blush bg-blush/20 pl-10 pr-4 py-3 text-sm text-ink focus:border-accent focus:bg-white focus:outline-none transition-all disabled:opacity-60"
                  placeholder="your@email.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-ink mb-1.5">Password</label>
              <div className="relative">
                <Lock size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                  minLength={6}
                  className="w-full rounded-xl border border-blush bg-blush/20 pl-10 pr-4 py-3 text-sm text-ink focus:border-accent focus:bg-white focus:outline-none transition-all disabled:opacity-60"
                  placeholder="At least 6 characters"
                />
              </div>
            </div>

            {infoMessage && (
              <div className="rounded-xl bg-success/10 border border-success/20 p-3 text-xs text-success flex items-start gap-2">
                <CheckCircle2 size={16} className="shrink-0 mt-0.5" />
                <span>{infoMessage}</span>
              </div>
            )}

            {error && (
              <div className="rounded-xl bg-danger/10 border border-danger/20 p-3 text-xs text-danger flex items-start gap-2">
                <span className="font-semibold shrink-0">•</span>
                <div className="flex-1">
                  <span>{error}</span>
                  {error.toLowerCase().includes('rate limit') && (
                    <p className="mt-1.5 text-[11px] text-ink/80 border-t border-danger/20 pt-1.5">
                      💡 <strong>Tip:</strong> If your account was already created during a previous attempt, click 
                      <button 
                        type="button" 
                        disabled={loading}
                        onClick={() => handleTabSwitch('signin')} 
                        className="underline font-semibold text-accent ml-1"
                      >
                        Sign In
                      </button>, or wait a few minutes for the rate limit to reset.
                    </p>
                  )}
                </div>
              </div>
            )}

            <Button
              type="submit"
              variant="primary"
              size="lg"
              fullWidth
              loading={loading}
              disabled={loading}
              rightIcon={<ArrowRight size={18} />}
            >
              {mode === 'signin' ? 'Sign In to Vault' : 'Create Secure Vault'}
            </Button>
          </form>

          <div className="mt-6 pt-4 border-t border-blush/60 text-center">
            <Link
              to="/"
              className="text-xs font-medium text-muted hover:text-accent transition-colors inline-flex items-center justify-center gap-1"
            >
              ← Back to Calculator Disguise
            </Link>
          </div>
        </div>

        <div className="flex items-center justify-center gap-1.5 text-center text-[11px] text-muted mt-6 px-4">
          <ShieldCheck size={14} className="text-secondary shrink-0" />
          <span>Private & encrypted. Database row-level security enforced.</span>
        </div>
      </div>
    </div>
  );
}
