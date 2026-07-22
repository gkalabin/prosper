import {cn} from '@/lib/utils';

// AddOnButton is the low-profile dashed control that reveals an occasional
// modifier (splitting, someone-else-paid, income split). At rest it reads as a
// quiet add-on; the 90% case scans straight past it.
export function AddOnButton({
  onClick,
  disabled,
  icon,
  className,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  icon: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'border-input bg-card text-foreground flex h-11 flex-1 items-center justify-center gap-2',
        'rounded-xl border border-dashed text-sm font-semibold transition-colors',
        'hover:border-tint-foreground hover:text-tint-foreground',
        'disabled:cursor-not-allowed disabled:opacity-50',
        className
      )}
    >
      {icon}
      {children}
    </button>
  );
}
