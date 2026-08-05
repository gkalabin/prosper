import {Button} from '@/components/ui/button';

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
      <span className="bg-tint-foreground absolute inset-y-3 left-0 w-1 rounded-full" />
      <div className="mb-3 flex items-center justify-between gap-2">
        <span className="text-tint-foreground text-xs font-bold uppercase tracking-wider">
          {heading}
        </span>
        <Button
          type="button"
          variant="link"
          size="inherit"
          onClick={onRemove}
          disabled={disabled}
          className="text-muted-foreground hover:text-foreground text-xs font-semibold"
        >
          Remove
        </Button>
      </div>
      {children}
    </div>
  );
}
