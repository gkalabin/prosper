import {cn} from '@/lib/utils';
import Link from 'next/link';
import React, {forwardRef} from 'react';
import {useFormContext} from 'react-hook-form';

export const ButtonLink = (
  props: React.ButtonHTMLAttributes<HTMLButtonElement>
) => {
  return (
    <button
      type="button"
      {...props}
      className={cn(
        props.className,
        props.disabled ? 'opacity-30' : 'hover:text-indigo-500',
        'font-medium text-indigo-600'
      )}
    >
      {props.children}
    </button>
  );
};

export const AnchorUnstyled = forwardRef<
  HTMLAnchorElement,
  React.AnchorHTMLAttributes<HTMLAnchorElement>
>((props, ref) => {
  const {children, href, ...rest} = props;
  return (
    <Link href={href ?? ''} ref={ref} {...rest}>
      {children}
    </Link>
  );
});
AnchorUnstyled.displayName = 'AnchorUnstyled';

export const AnchorLink = (
  props: React.AnchorHTMLAttributes<HTMLAnchorElement>
) => {
  const {className, ...rest} = props;
  return (
    <AnchorUnstyled
      className={cn(
        className,
        'font-medium text-indigo-600 hover:text-indigo-500'
      )}
      {...rest}
    >
      {props.children}
    </AnchorUnstyled>
  );
};

export const ButtonPagePrimary = (
  props: React.ButtonHTMLAttributes<HTMLButtonElement>
) => {
  return (
    <button
      type="button"
      {...props}
      className={cn(
        props.className,
        props.disabled
          ? 'opacity-30'
          : 'hover:bg-indigo-700 hover:ring-indigo-700',
        'rounded-md bg-indigo-600 px-4 py-1.5 text-base font-medium leading-7 text-white shadow-sm'
      )}
    >
      {props.children}
    </button>
  );
};

export const ButtonFormPrimary = (
  props: React.ButtonHTMLAttributes<HTMLButtonElement>
) => {
  const {className, ...rest} = props;
  return (
    <button
      {...rest}
      className={cn(
        className,
        props.disabled ? 'opacity-30' : 'hover:bg-indigo-700',
        'inline-flex justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2'
      )}
    >
      {props.children}
    </button>
  );
};

export const ButtonFormSecondary = (
  props: React.ButtonHTMLAttributes<HTMLButtonElement>
) => {
  const {className, ...rest} = props;
  return (
    <button
      type="button"
      {...rest}
      className={cn(
        className,
        props.disabled ? 'opacity-30' : 'hover:bg-gray-50',
        'inline-flex justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2'
      )}
    >
      {props.children}
    </button>
  );
};

export const AddOrUpdateButtonText = ({add}: {add: boolean}) => {
  const {formState} = useFormContext();
  if (add) {
    return <>{formState.isSubmitting ? 'Adding…' : 'Add'}</>;
  }
  return <>{formState.isSubmitting ? 'Updating…' : 'Update'}</>;
};
