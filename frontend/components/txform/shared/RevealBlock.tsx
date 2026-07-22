import {cn} from '@/lib/utils';

// RevealBlock is the tinted, accent-ruled container that houses the form's
// anchored reveals (split settlement, someone-else-paid, repayment). The
// container and the rule down its edge announce that the block belongs to the
// control that revealed it and mark where it starts and ends. It is the
// deliberate exception to the otherwise boxless form.
export function RevealBlock({
  heading,
  onRemove,
  removeLabel = 'Remove',
  disabled,
  className,
  children,
}: {
  heading: string;
  onRemove?: () => void;
  removeLabel?: string;
  disabled?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        'animate-in fade-in slide-in-from-top-1 duration-200',
        'bg-tint relative rounded-2xl py-3.5 pl-5 pr-4',
        className
      )}
    >
      <span className="bg-tint-foreground absolute inset-y-3 left-0 w-1 rounded-full" />
      <div className="mb-3 flex items-center justify-between gap-2">
        <span className="text-tint-foreground text-[11px] font-bold uppercase tracking-wider">
          {heading}
        </span>
        {onRemove && (
          <button
            type="button"
            onClick={onRemove}
            disabled={disabled}
            className="text-muted-foreground hover:text-foreground text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-50"
          >
            {removeLabel}
          </button>
        )}
      </div>
      {children}
    </div>
  );
}
