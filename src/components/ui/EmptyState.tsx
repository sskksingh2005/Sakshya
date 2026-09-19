import type { ReactNode } from 'react';
import { Inbox } from 'lucide-react';

interface EmptyStateProps {
  title?: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({
  title = 'Your evidence vault is empty',
  description = "Add evidence when you're ready. Your records are private and encrypted.",
  icon,
  action,
  className = '',
}: EmptyStateProps) {
  return (
    <div className={`rounded-2xl bg-warmwhite border border-blush p-8 text-center shadow-sm ${className}`}>
      <div className="w-12 h-12 rounded-full bg-blush/60 text-primary flex items-center justify-center mx-auto mb-3">
        {icon || <Inbox size={24} className="text-secondary" />}
      </div>
      <h3 className="font-heading text-base font-semibold text-primary mb-1">{title}</h3>
      <p className="text-xs text-muted max-w-md mx-auto mb-5 leading-relaxed">{description}</p>
      {action && <div className="flex justify-center">{action}</div>}
    </div>
  );
}
