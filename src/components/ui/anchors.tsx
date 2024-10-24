import {cn} from '@/lib/utils';
import Link from 'next/link';
import React, {forwardRef} from 'react';

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

export const ExternalAnchorLink = (
  props: React.AnchorHTMLAttributes<HTMLAnchorElement>
) => {
  const {className, ...rest} = props;
  return (
    <a
      className={cn(
        className,
        'font-medium text-indigo-600 hover:text-indigo-500'
      )}
      {...rest}
    >
      {props.children}
    </a>
  );
};
