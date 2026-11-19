'use client';
import {cn} from '@/lib/utils';
import * as PopoverPrimitive from '@radix-ui/react-popover';
import * as React from 'react';

const Popover = PopoverPrimitive.Root;

const PopoverTrigger = PopoverPrimitive.Trigger;

const PopoverContent = React.forwardRef<
  React.ElementRef<typeof PopoverPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Content>
>(({className, align = 'center', sideOffset = 4, ...props}, ref) => (
  <PopoverPrimitive.Content
    ref={ref}
    align={align}
    sideOffset={sideOffset}
    side="bottom"
    className={cn(
      'z-50 w-72 rounded-md border bg-popover p-4 text-popover-foreground shadow-md outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2',
      className
    )}
    {...props}
  />
));
PopoverContent.displayName = PopoverPrimitive.Content.displayName;

export type SelectTriggerProps = Omit<
  React.ButtonHTMLAttributes<HTMLButtonElement>,
  'type'
> & {
  // Nothing is selected yet, so the content is a placeholder rather than a value.
  empty?: boolean;
};

const SelectTrigger = React.forwardRef<HTMLButtonElement, SelectTriggerProps>(
  ({className, empty, children, ...props}, ref) => (
    <PopoverPrimitive.Trigger
      role="combobox"
      className={cn(
        'flex min-h-10 w-full items-center justify-between gap-2 rounded-md border border-input bg-card p-2 text-left text-base ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-disabled disabled:text-disabled-foreground',
        empty && 'text-muted-foreground',
        className
      )}
      ref={ref}
      {...props}
    >
      {children}
    </PopoverPrimitive.Trigger>
  )
);
SelectTrigger.displayName = 'SelectTrigger';

export {Popover, PopoverContent, PopoverTrigger, SelectTrigger};
