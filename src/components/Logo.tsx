import { Shield, ShieldCheck } from 'lucide-react';

export function Logo({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizes = {
    sm: { container: 'w-8 h-8', icon: 16, text: 'text-base' },
    md: { container: 'w-12 h-12', icon: 24, text: 'text-xl' },
    lg: { container: 'w-16 h-16', icon: 32, text: 'text-2xl' },
  };
  const s = sizes[size];

  return (
    <div className="flex items-center gap-2.5">
      <div
        className={`${s.container} rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-md`}
      >
        <ShieldCheck size={s.icon} className="text-white" />
      </div>
      <div>
        <span className={`font-heading font-bold text-primary ${s.text}`}>Sakshya</span>
        <p className="text-[10px] text-muted -mt-0.5">Silent Evidence System</p>
      </div>
    </div>
  );
}
