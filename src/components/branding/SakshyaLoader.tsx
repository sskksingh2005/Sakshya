import { SakshyaLogo } from './SakshyaLogo';

interface SakshyaLoaderProps {
  message?: string;
  subtext?: string;
  className?: string;
}

export function SakshyaLoader({
  message = 'Sakshya',
  subtext = 'Preserving your options.',
  className = '',
}: SakshyaLoaderProps) {
  return (
    <div
      className={`min-h-screen w-full bg-warmwhite flex flex-col items-center justify-center p-6 relative overflow-hidden select-none transition-colors duration-200 ${className}`}
      role="status"
      aria-label="Loading Sakshya"
    >
      {/* Soft Background Ambient Glow */}
      <div className="absolute w-72 h-72 rounded-full bg-gradient-to-tr from-blush via-accent-light/10 to-secondary/15 blur-3xl animate-pulse-slow pointer-events-none" />

      {/* Main Centered Content Wrapper */}
      <div className="relative z-10 flex flex-col items-center text-center animate-loader-fade-in">
        {/* Animated Ring & Logo Container */}
        <div className="relative flex items-center justify-center mb-6">
          {/* Subtle Outer Rotating Halo Arc */}
          <div className="absolute w-28 h-28 rounded-full border-2 border-transparent border-t-accent/40 border-r-secondary/20 motion-safe:animate-spin-slow pointer-events-none" />
          
          {/* Soft Radial Backlight */}
          <div className="absolute w-20 h-20 rounded-full bg-gradient-to-br from-primary/20 to-accent/30 blur-md pointer-events-none" />

          {/* Logo */}
          <div className="relative z-10 motion-safe:animate-scale-in">
            <SakshyaLogo size="lg" showWordmark={false} variant="loading" />
          </div>
        </div>

        {/* Brand Name */}
        <h2 className="font-heading text-2xl font-bold text-primary tracking-wide mb-1">
          {message}
        </h2>

        {/* Subtitle / Philosophy */}
        <p className="text-xs font-medium text-muted tracking-wider mb-6">
          {subtext}
        </p>

        {/* Subtle Animated Pulsing Dots */}
        <div className="flex items-center gap-1.5" aria-hidden="true">
          <span className="w-2 h-2 rounded-full bg-primary/70 motion-safe:animate-bounce-dot-1" />
          <span className="w-2 h-2 rounded-full bg-secondary/70 motion-safe:animate-bounce-dot-2" />
          <span className="w-2 h-2 rounded-full bg-accent/70 motion-safe:animate-bounce-dot-3" />
        </div>
      </div>
    </div>
  );
}
