// Shared building blocks for the optional-extras home that sits after the core
// fields: a dashed "add" chip and the revealed field it expands into. Keeping
// the extras here means revealing one extends the form at its natural end
// rather than interrupting the core fields.

export function ExtraChip({
  onClick,
  disabled,
  children,
}: {
  onClick: () => void;
  disabled: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="border-input bg-card text-foreground hover:border-tint-foreground inline-flex h-9 items-center gap-1.5 rounded-xl border border-dashed px-3.5 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-50"
    >
      <span className="text-tint-foreground font-bold">+</span>
      {children}
    </button>
  );
}

export function RevealedExtra({
  name,
  onRemove,
  disabled,
  children,
}: {
  name: string;
  onRemove: () => void;
  disabled: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="animate-in fade-in slide-in-from-top-1 relative duration-200">
      <button
        type="button"
        onClick={onRemove}
        disabled={disabled}
        aria-label={`Remove ${name}`}
        className="text-muted-foreground hover:text-foreground absolute right-0 top-0 z-10 text-xs font-semibold disabled:opacity-50"
      >
        Remove
      </button>
      {children}
    </div>
  );
}
