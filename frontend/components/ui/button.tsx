import {Spinner} from '@/components/ui/spinner';
import {cn} from '@/lib/utils';
import {Slot} from '@radix-ui/react-slot';
import * as React from 'react';

const variantClasses = {
  primary:
    'bg-primary text-primary-foreground hover:bg-primary/90 disabled:bg-disabled',
  outline:
    'border-input bg-card text-foreground hover:bg-secondary border disabled:border-transparent disabled:bg-disabled',
  secondary: 'text-foreground/70 hover:bg-muted hover:text-foreground',
};

const sizeClasses = {
  sm: 'h-8 rounded-sm px-3 text-[13px] [&_svg]:h-4 [&_svg]:w-4',
  md: 'h-10 rounded-md px-4 text-sm [&_svg]:h-4 [&_svg]:w-4',
  lg: 'h-12 rounded-lg px-5 text-[15px] [&_svg]:h-5 [&_svg]:w-5',
};

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: keyof typeof variantClasses;
  size?: keyof typeof sizeClasses;
  // Disables the button and shows a spinner while its action is in flight.
  pending?: boolean;
  asChild?: boolean;
};

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      pending,
      asChild,
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    const classes = cn(
      'inline-flex items-center justify-center gap-2 whitespace-nowrap font-semibold transition-colors',
      'ring-offset-background focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
      'disabled:cursor-not-allowed disabled:text-disabled-foreground',
      variantClasses[variant],
      sizeClasses[size],
      className
    );
    if (asChild) {
      return (
        <Slot className={classes} ref={ref} {...props}>
          {children}
        </Slot>
      );
    }
    return (
      <button
        className={classes}
        ref={ref}
        disabled={disabled || pending}
        {...props}
      >
        {pending && <Spinner />}
        {children}
      </button>
    );
  }
);
Button.displayName = 'Button';

export {Button};
