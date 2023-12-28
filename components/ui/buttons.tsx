import classNames from "classnames";
import Link from "next/link";

import React, { forwardRef } from "react";

export const ButtonLink = (
  props: React.ButtonHTMLAttributes<HTMLButtonElement>
) => {
  return (
    <button
      type="button"
      {...props}
      className={classNames(
        props.className,
        props.disabled ? "opacity-30" : "hover:text-indigo-500",
        "font-medium text-indigo-600"
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
  const { children, href, ...rest } = props;
  return (
    <Link href={href}>
      <a ref={ref} {...rest}>
        {children}
      </a>
    </Link>
  );
});
AnchorUnstyled.displayName = "AnchorUnstyled";

export const AnchorPagePrimary = (
  props: React.AnchorHTMLAttributes<HTMLAnchorElement> & { label: string }
) => {
  const { label, className, ...rest } = props;
  return (
    <AnchorUnstyled
      className={classNames(
        className,
        "rounded-md bg-indigo-600 px-4 py-1.5 text-base font-medium leading-7 text-white shadow-sm hover:bg-indigo-700 hover:ring-indigo-700"
      )}
      {...rest}
    >
      {label}
    </AnchorUnstyled>
  );
};

export const AnchorLink = (
  props: React.AnchorHTMLAttributes<HTMLAnchorElement> & { label: string }
) => {
  const { label, className, ...rest } = props;
  return (
    <AnchorUnstyled
      className={classNames(
        className,
        "font-medium text-indigo-600 hover:text-indigo-500"
      )}
      {...rest}
    >
      {label}
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
      className={classNames(
        props.className,
        "rounded-md bg-indigo-600 px-4 py-1.5 text-base font-medium leading-7 text-white shadow-sm hover:bg-indigo-700 hover:ring-indigo-700"
      )}
    >
      {props.children}
    </button>
  );
};

export const ButtonFormPrimary = (
  props: React.ButtonHTMLAttributes<HTMLButtonElement>
) => {
  const { className, ...rest } = props;
  return (
    <button
      {...rest}
      className={classNames(
        className,
        props.disabled ? "opacity-30" : "hover:bg-indigo-700",
        "inline-flex justify-center rounded-md border border-transparent bg-indigo-600 py-2 px-4 text-sm font-medium text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
      )}
    >
      {props.children}
    </button>
  );
};

export const ButtonFormSecondary = (
  props: React.ButtonHTMLAttributes<HTMLButtonElement>
) => {
  const { className, ...rest } = props;
  return (
    <button
      type="button"
      {...rest}
      className={classNames(
        className,
        props.disabled ? "opacity-30" : "hover:bg-gray-50",
        "inline-flex justify-center rounded-md border border-gray-300 bg-white py-2 px-4 text-sm font-medium text-gray-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
      )}
    >
      {props.children}
    </button>
  );
};
