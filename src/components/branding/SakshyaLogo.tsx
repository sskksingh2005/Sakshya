
interface SakshyaLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl' | number;
  showWordmark?: boolean;
  variant?: 'full' | 'icon' | 'loading';
  className?: string;
  tagline?: string;
}

export function SakshyaLogo({
  size = 'md',
  className = '',
}: SakshyaLogoProps) {
  const width = typeof size === 'number' ? size : {
    sm: 140,
    md: 176,
    lg: 280,
    xl: 360,
  }[size];

  return (
    <div className={`inline-flex max-w-full items-center select-none ${className}`}>
      <img
        src="/assets/branding/sakshya-logo-full.png"
        alt="Sakshya — Silent Reporting & Evidence System"
        width={992}
        height={600}
        className="h-auto max-w-full object-contain"
        style={{ width: `${width}px` }}
      />
    </div>
  );
}
