import {cn} from '@/lib/utils';
import Link from 'next/link';
import React, {forwardRef} from 'react';
import {useFormContext} from 'react-hook-form';

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

export const AddOrUpdateButtonText = ({add}: {add: boolean}) => {
  const {formState} = useFormContext();
  if (add) {
    return <>{formState.isSubmitting ? 'Adding…' : 'Add'}</>;
  }
  return <>{formState.isSubmitting ? 'Updating…' : 'Update'}</>;
};
