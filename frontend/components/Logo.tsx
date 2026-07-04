import {cn} from '@/lib/utils';

export function Logo({className}: {className?: string}) {
  return (
    <svg
      viewBox="15 22 70 56"
      fill="none"
      stroke="currentColor"
      strokeWidth="13.5"
      strokeLinecap="round"
      aria-hidden="true"
      className={cn('h-[0.95em] w-[1.2em]', className)}
    >
      <path d="M24 69L46 31" />
      <path d="M54 69L76 31" />
    </svg>
  );
}
