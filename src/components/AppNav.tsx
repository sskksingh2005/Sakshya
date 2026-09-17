import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Home, Plus, FileText, Phone, Shield, Settings, LogOut } from 'lucide-react';
import { useAuth } from '@/lib/auth';

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

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex fixed left-0 top-0 h-full w-60 flex-col bg-primary text-white shadow-xl z-30">
        <div className="p-5 border-b border-white/10">
          <Link to="/dashboard" className="flex items-center gap-2">
            <Shield className="text-accent" size={24} />
            <span className="font-heading text-lg font-bold">Sakshya</span>
          </Link>
          <p className="text-xs text-white/60 mt-1">Silent Evidence System</p>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = location.pathname === item.to || (item.to === '/dashboard' && location.pathname.startsWith('/incidents/'));
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                  active
                    ? 'bg-accent text-white font-medium'
                    : 'text-white/80 hover:bg-white/10'
                }`}
              >
                <Icon size={18} />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t border-white/10">
          <button
            onClick={handleSignOut}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-white/80 hover:bg-white/10 transition-colors"
          >
            <LogOut size={18} />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-primary shadow-lg">
        <div className="flex items-center justify-around px-1 py-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = location.pathname === item.to || (item.to === '/dashboard' && location.pathname.startsWith('/incidents/'));
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex flex-col items-center gap-0.5 rounded-lg px-2 py-1.5 text-[10px] transition-colors ${
                  active ? 'text-accent' : 'text-white/70'
                }`}
              >
                <Icon size={20} />
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
