import {TextButton} from '@/components/ui/text-button';

// RevealBlock is a tinted, accent-ruled container for a titled section that
// appears in place and can be dismissed.
export function RevealBlock({
  heading,
  onRemove,
  disabled,
  children,
}: {
  heading: string;
  onRemove: () => void;
  disabled: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="animate-in fade-in slide-in-from-top-1 bg-tint relative rounded-2xl py-3.5 pl-5 pr-4 duration-200">
      <span className="bg-accent absolute inset-y-3 left-0 w-1 rounded-full" />
      <div className="mb-3 flex items-center justify-between gap-2">
        <span className="text-accent text-xs font-bold uppercase tracking-wider">
          {heading}
        </span>
        <TextButton
          type="button"
          tone="muted"
          onClick={onRemove}
          disabled={disabled}
        >
          Remove
        </TextButton>
      </div>
      {children}
    </div>
  );
}
