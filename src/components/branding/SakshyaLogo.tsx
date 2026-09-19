
interface SakshyaLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl' | number;
  showWordmark?: boolean;
  variant?: 'full' | 'icon' | 'loading';
  className?: string;
  tagline?: string;
}

export function SakshyaLogo({
  size = 'md',
  showWordmark = true,
  variant = 'full',
  className = '',
  tagline,
}: SakshyaLogoProps) {
  const getDimension = () => {
    if (typeof size === 'number') return size;
    switch (size) {
      case 'sm':
        return 32;
      case 'md':
        return 42;
      case 'lg':
        return 64;
      case 'xl':
        return 96;
      default:
        return 42;
    }
  };

  const dim = getDimension();

  const getWordmarkSize = () => {
    if (typeof size === 'number') return Math.max(14, Math.round(size * 0.45));
    switch (size) {
      case 'sm':
        return 'text-base';
      case 'md':
        return 'text-xl';
      case 'lg':
        return 'text-3xl';
      case 'xl':
        return 'text-4xl';
      default:
        return 'text-xl';
    }
  };

  return (
    <div className={`inline-flex items-center gap-3 select-none ${className}`}>
      {/* SVG Emblem */}
      <div className="relative flex items-center justify-center shrink-0">
        <svg
          width={dim}
          height={dim}
          viewBox="0 0 120 120"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          role="img"
          aria-label="Sakshya Emblem"
          className="transition-transform duration-300 hover:scale-105"
        >
          <defs>
            {/* Primary Gradient: Deep Purple to Magenta */}
            <linearGradient id="sakshyaPrimaryGrad" x1="15" y1="10" x2="105" y2="110" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#3D1F5C" />
              <stop offset="50%" stopColor="#6B2FA0" />
              <stop offset="100%" stopColor="#D6208F" />
            </linearGradient>

            {/* Soft Accent Gradient */}
            <linearGradient id="sakshyaAccentGrad" x1="30" y1="20" x2="90" y2="100" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#D6208F" />
              <stop offset="100%" stopColor="#E8579E" />
            </linearGradient>

            {/* Inner Glow/Highlight */}
            <linearGradient id="sakshyaHighlightGrad" x1="60" y1="15" x2="60" y2="105" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#FFF9FB" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#FBE4EC" stopOpacity="0.3" />
            </linearGradient>

            {/* Soft Drop Shadow for Depth */}
            <filter id="sakshyaGlow" x="0" y="0" width="120" height="120" filterUnits="userSpaceOnUse">
              <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="#3D1F5C" floodOpacity="0.25" />
            </filter>
          </defs>

          {/* Outer Protective Shield Base */}
          <path
            d="M60 12 C82 12 100 20 100 44 C100 76 74 98 60 108 C46 98 20 76 20 44 C20 20 38 12 60 12 Z"
            fill="url(#sakshyaPrimaryGrad)"
            filter="url(#sakshyaGlow)"
          />

          {/* Flowing Silhouette & Inner Shield Arch */}
          <path
            d="M60 22 C76 22 90 29 90 48 C90 73 70 90 60 98 C50 90 30 73 30 48 C30 29 44 22 60 22 Z"
            fill="#FFF9FB"
            fillOpacity="0.1"
          />

          {/* Human Silhouette / Dignified Flowing Form */}
          {/* Head & Crown */}
          <circle cx="60" cy="38" r="8.5" fill="url(#sakshyaHighlightGrad)" />

          {/* Flowing Shoulders & Protective Canopy */}
          <path
            d="M60 48 C51 48 42 54 40 64 C39 69 41 78 46 84 C52 79 57 74 60 67 C63 74 68 79 74 84 C79 78 81 69 80 64 C78 54 69 48 60 48 Z"
            fill="url(#sakshyaHighlightGrad)"
          />

          {/* Evidence Integrity Keyhole / Document Accent */}
          <path
            d="M60 56 C57.8 56 56 57.8 56 60 C56 61.5 56.8 62.8 58 63.5 V69 C58 70.1 58.9 71 60 71 C61.1 71 62 70.1 62 69 V63.5 C63.2 62.8 64 61.5 64 60 C64 57.8 62.2 56 60 56 Z"
            fill="url(#sakshyaAccentGrad)"
          />

          {/* Subtle Outer Halo Ring */}
          <path
            d="M60 16 C78 16 94 23 94 46 C94 73 71 93 60 102"
            stroke="url(#sakshyaAccentGrad)"
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray="4 4"
            opacity="0.6"
          />
        </svg>
      </div>

      {/* Optional Wordmark */}
      {showWordmark && (
        <div className="flex flex-col justify-center">
          <span
            className={`font-heading font-bold tracking-tight text-primary leading-none ${
              typeof getWordmarkSize() === 'string' ? getWordmarkSize() : ''
            }`}
            style={typeof getWordmarkSize() === 'number' ? { fontSize: `${getWordmarkSize()}px` } : undefined}
          >
            SAKSHYA
          </span>
          {tagline ? (
            <span className="text-[11px] font-medium text-muted tracking-wide mt-1">{tagline}</span>
          ) : variant === 'full' ? (
            <span className="text-[11px] font-medium text-muted tracking-wide mt-0.5">Silent Evidence System</span>
          ) : null}
        </div>
      )}
    </div>
  );
}
