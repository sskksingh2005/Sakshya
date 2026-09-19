import type { ReactNode } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from './Button';

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  action?: ReactNode;
  className?: string;
}

export function ErrorState({
  title = 'Something went wrong',
  message = 'Your saved information has not been changed. Please try again.',
  onRetry,
  action,
  className = '',
}: ErrorStateProps) {
  return (
    <div className={`rounded-2xl bg-warmwhite border border-danger/20 p-6 text-center shadow-sm ${className}`}>
      <div className="w-12 h-12 rounded-full bg-danger/10 text-danger flex items-center justify-center mx-auto mb-3">
        <AlertCircle size={24} />
      </div>
      <h3 className="font-heading text-base font-semibold text-primary mb-1">{title}</h3>
      <p className="text-xs text-muted max-w-md mx-auto mb-4 leading-relaxed">{message}</p>
      <div className="flex items-center justify-center gap-3">
        {onRetry && (
          <Button variant="secondary" size="sm" onClick={onRetry} leftIcon={<RefreshCw size={14} />}>
            Try Again
          </Button>
        )}
        {action}
      </div>
    </div>
  );
}
