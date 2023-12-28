import classNames from "classnames";
import Link from "next/link";

import React, { forwardRef } from "react";

export const AnchorUnstyled = forwardRef<
  HTMLAnchorElement,
  React.AnchorHTMLAttributes<HTMLAnchorElement>
>((props, ref) => {
  const { children, href, ...rest } = props;
  return (
    <Link href={href} ref={ref} {...rest}>
      {children}
    </Link>
  );
});
AnchorUnstyled.displayName = "AnchorUnstyled";

export const AnchorPagePrimary = (
  props: React.AnchorHTMLAttributes<HTMLAnchorElement> & { label: string },
) => {
  const { label, className, ...rest } = props;
  return (
    <AnchorUnstyled
      className={classNames(
        className,
        "rounded-md bg-indigo-600 px-4 py-1.5 text-base font-medium leading-7 text-white shadow-sm hover:bg-indigo-700 hover:ring-indigo-700",
      )}
      {...rest}
    >
      {label}
    </AnchorUnstyled>
  );
};

export const AnchorLink = (
  props: React.AnchorHTMLAttributes<HTMLAnchorElement>,
) => {
  const { className, ...rest } = props;
  return (
    <AnchorUnstyled
      className={classNames(
        className,
        "font-medium text-indigo-600 hover:text-indigo-500",
      )}
      {...rest}
    >
      {props.children}
    </AnchorUnstyled>
  );
};

export const ExternalAnchorLink = (
  props: React.AnchorHTMLAttributes<HTMLAnchorElement>,
) => {
  const { className, ...rest } = props;
  return (
    <a
      className={classNames(
        className,
        "font-medium text-indigo-600 hover:text-indigo-500",
      )}
      {...rest}
    >
      {props.children}
    </a>
  );
};