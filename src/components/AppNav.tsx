import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Home, Plus, FileText, Phone, Shield, Settings, LogOut, ExternalLink } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { SakshyaLogo } from '@/components/branding/SakshyaLogo';
import { ThemeToggle } from '@/components/ThemeToggle';

export function AppNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut } = useAuth();

  const navItems = [
    { to: '/dashboard', label: 'Dashboard', icon: Home },
    { to: '/incidents/new', label: 'Add Incident', icon: Plus },
    { to: '/dossier', label: 'Dossier', icon: FileText },
    { to: '/legal-aid', label: 'Legal Aid', icon: Phone },
    { to: '/safety', label: 'Safety', icon: Shield },
    { to: '/settings', label: 'Settings', icon: Settings },
  ];
  const normalizedPathname = location.pathname.replace(/\/+$/, '') || '/';
  const isNavItemActive = (to: string) =>
    normalizedPathname === to ||
    (to === '/dashboard' &&
      (normalizedPathname.startsWith('/dashboard/') ||
        (normalizedPathname.startsWith('/incidents/') && normalizedPathname !== '/incidents/new')));

  const handleQuickExit = async () => {
    // Immediate redirect to decoy calculator for survivor safety
    navigate('/');
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <>
      {/* Mobile top bar */}
      <header className="md:hidden sticky top-0 z-30 bg-primary/95 backdrop-blur-md text-white px-4 py-3 shadow-md flex items-center justify-between border-b border-white/10">
        <Link to="/dashboard" className="flex items-center gap-2 rounded-md bg-white px-2 py-1 dark:bg-transparent">
          <SakshyaLogo size="sm" showWordmark={true} className="[&_span]:text-white [&_span.text-muted]:text-white/70" />
        </Link>

        <div className="flex items-center gap-1.5">
          <ThemeToggle className="!text-white/80" />
          <button
            onClick={handleQuickExit}
            className="px-3 py-1.5 rounded-lg bg-accent text-white text-xs font-semibold hover:bg-accent-light transition-colors flex items-center gap-1 shadow-sm active:scale-95"
            title="Quick exit to calculator"
          >
            <span>Quick Exit</span>
            <ExternalLink size={12} />
          </button>
        </div>
      </header>

      {/* Desktop sidebar */}
      <aside className="hidden md:flex fixed left-0 top-0 h-full w-60 flex-col bg-primary text-white shadow-xl z-30 border-r border-white/10">
        <div className="p-5 border-b border-white/10">
          <Link to="/dashboard" className="block w-fit rounded-md bg-white px-2 py-1 dark:bg-transparent">
            <SakshyaLogo size="md" showWordmark={true} className="[&_span]:text-white [&_span.text-muted]:text-white/70" />
          </Link>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isNavItemActive(item.to);

            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm transition-all ${
                  active
                    ? 'bg-accent text-white font-semibold shadow-sm'
                    : 'text-white/80 hover:bg-white/10 hover:text-white'
                }`}
              >
                <Icon size={18} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-white/10 space-y-2">
          <button
            onClick={handleQuickExit}
            className="flex w-full items-center justify-between rounded-xl px-3.5 py-2.5 text-xs font-semibold bg-accent text-white hover:bg-accent-light transition-colors shadow-sm"
          >
            <span>Quick Exit (Calculator)</span>
            <ExternalLink size={14} />
          </button>

          <div className="flex items-center justify-between px-1">
            <span className="text-xs text-white/60 font-medium">Appearance</span>
            <ThemeToggle />
          </div>
          
          <button
            onClick={handleSignOut}
            className="flex w-full items-center gap-3 rounded-xl px-3.5 py-2 text-xs text-white/70 hover:bg-white/10 hover:text-white transition-colors"
          >
            <LogOut size={16} />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-primary/95 backdrop-blur-md border-t border-white/10 shadow-lg">
        <div className="flex items-center justify-around px-1 py-1.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isNavItemActive(item.to);

            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex flex-col items-center gap-0.5 rounded-lg px-2 py-1 text-[10px] font-medium transition-colors ${
                  active ? 'text-accent font-semibold' : 'text-white/70 hover:text-white'
                }`}
              >
                <Icon size={18} />
                <span className="truncate max-w-[56px]">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
