import {Spinner} from '@/components/ui/spinner';
import {cn} from '@/lib/utils';
import {Slot} from '@radix-ui/react-slot';
import * as React from 'react';

const toneClasses = {
  default: 'text-foreground',
  accent: 'text-accent',
  muted: 'text-muted-foreground hover:text-foreground',
  destructive: 'text-destructive',
};

export type TextButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  tone?: keyof typeof toneClasses;
  // Disables the action and shows a spinner while it is in flight.
  pending?: boolean;
  asChild?: boolean;
};

const TextButton = React.forwardRef<HTMLButtonElement, TextButtonProps>(
  (
    {
      className,
      tone = 'default',
      pending,
      asChild,
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    const classes = cn(
      'inline-flex items-center gap-1 rounded-sm align-baseline font-semibold underline-offset-[3px] transition-colors',
      // Keeps icons the same size as the label regardless of font size.
      '[&_svg]:h-[1em] [&_svg]:w-[1em]',
      'hover:underline',
      'ring-offset-background focus-visible:ring-ring focus-visible:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
      'disabled:cursor-not-allowed disabled:text-disabled-foreground disabled:no-underline',
      toneClasses[tone],
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
TextButton.displayName = 'TextButton';

export {TextButton};
