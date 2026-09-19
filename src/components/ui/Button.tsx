import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  fullWidth?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      variant = 'primary',
      size = 'md',
      loading = false,
      leftIcon,
      rightIcon,
      fullWidth = false,
      className = '',
      disabled,
      type = 'button',
      ...props
    },
    ref
  ) => {
    // Base classes for Sakshya buttons
    const baseStyles =
      'inline-flex items-center justify-center font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none select-none rounded-xl';

    // Variants
    const variants = {
      primary:
        'bg-gradient-to-r from-primary via-secondary to-accent text-white shadow-sm hover:opacity-95 hover:shadow-md active:scale-[0.99]',
      secondary:
        'bg-blush/60 text-primary border border-blush hover:bg-blush hover:text-primary-dark active:scale-[0.99]',
      danger:
        'bg-danger text-white shadow-sm hover:bg-danger/90 active:scale-[0.99]',
      success:
        'bg-success text-white shadow-sm hover:bg-success/90 active:scale-[0.99]',
      ghost:
        'bg-transparent text-primary hover:bg-blush/40 hover:text-accent active:bg-blush/60',
      outline:
        'bg-transparent text-primary border border-primary/20 hover:border-primary/40 hover:bg-blush/30 active:scale-[0.99]',
    };

    // Sizes
    const sizes = {
      sm: 'px-3 py-1.5 text-xs gap-1.5 min-h-[32px]',
      md: 'px-4 py-2.5 text-sm gap-2 min-h-[42px]',
      lg: 'px-6 py-3.5 text-base gap-2.5 min-h-[50px] font-semibold',
    };

    const widthClass = fullWidth ? 'w-full' : '';

    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || loading}
        className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${widthClass} ${className}`}
        {...props}
      >
        {loading ? (
          <Loader2 className="animate-spin shrink-0" size={size === 'sm' ? 14 : size === 'lg' ? 20 : 16} />
        ) : (
          leftIcon && <span className="shrink-0">{leftIcon}</span>
        )}
        <span>{children}</span>
        {!loading && rightIcon && <span className="shrink-0">{rightIcon}</span>}
      </button>
    );
  }
);

Button.displayName = 'Button';
