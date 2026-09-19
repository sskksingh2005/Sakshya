import { Sun, Moon } from 'lucide-react';
import { useTheme } from '@/lib/theme';

interface ThemeToggleProps {
  variant?: 'icon' | 'full';
  className?: string;
}

export function ThemeToggle({ variant = 'icon', className = '' }: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  const label = isDark ? 'Switch to light mode' : 'Switch to dark mode';

  if (variant === 'full') {
    return (
      <div className={`flex items-center gap-1.5 p-1 rounded-xl bg-blush/40 dark:bg-blush-light/30 border border-blush/60 dark:border-border/50 ${className}`}>
        <button
          type="button"
          onClick={() => isDark && toggleTheme()}
          aria-label="Switch to light mode"
          className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition-all ${
            !isDark
              ? 'bg-primary text-white shadow-sm'
              : 'text-muted hover:text-ink hover:bg-blush/40'
          }`}
        >
          <Sun size={15} />
          <span>Light Mode</span>
        </button>
        <button
          type="button"
          onClick={() => !isDark && toggleTheme()}
          aria-label="Switch to dark mode"
          className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition-all ${
            isDark
              ? 'bg-accent text-white shadow-sm'
              : 'text-muted hover:text-ink hover:bg-blush/40'
          }`}
        >
          <Moon size={15} />
          <span>Dark Mode</span>
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={label}
      title={label}
      className={`relative inline-flex items-center justify-center p-2 rounded-xl text-white/80 hover:text-white hover:bg-white/10 dark:hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent transition-all duration-200 active:scale-95 shrink-0 ${className}`}
    >
      <div className="relative w-5 h-5 flex items-center justify-center">
        <Sun
          size={18}
          className={`absolute transition-all duration-300 transform ${
            isDark
              ? 'rotate-90 scale-0 opacity-0'
              : 'rotate-0 scale-100 opacity-100 text-amber-300'
          }`}
        />
        <Moon
          size={18}
          className={`absolute transition-all duration-300 transform ${
            isDark
              ? 'rotate-0 scale-100 opacity-100 text-accent-light'
              : '-rotate-90 scale-0 opacity-0'
          }`}
        />
      </div>
      <span className="sr-only">{label}</span>
    </button>
  );
}
