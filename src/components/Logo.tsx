import { SakshyaLogo } from './branding/SakshyaLogo';

export function Logo({
  size = 'md',
  showWordmark = true,
  className = '',
}: {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showWordmark?: boolean;
  className?: string;
}) {
  return <SakshyaLogo size={size} showWordmark={showWordmark} className={className} />;
}
