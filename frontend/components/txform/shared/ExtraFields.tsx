import {Button} from '@/components/ui/button';
import {useState} from 'react';
import {useFormContext} from 'react-hook-form';

export type ExtraField = {
  key: string;
  revealLabel: string;
  removeLabel: string;
  initiallyShown: boolean;
  onRemove: () => void;
  children: React.ReactNode;
};

// ExtraFields renders a set of optional fields, each revealed by a chip and
// hidden again by a remove control.
export function ExtraFields({fields}: {fields: ExtraField[]}) {
  const {formState} = useFormContext();
  const disabled = formState.isSubmitting;
  const [revealedKeys, setRevealedKeys] = useState(
    () => new Set(fields.filter(f => f.initiallyShown).map(f => f.key))
  );
  const reveal = (field: ExtraField) =>
    setRevealedKeys(prev => {
      const next = new Set(prev);
      next.add(field.key);
      return next;
    });
  const remove = (field: ExtraField) => {
    setRevealedKeys(prev => {
      const next = new Set(prev);
      next.delete(field.key);
      return next;
    });
    field.onRemove();
  };
  const hidden = fields.filter(f => !revealedKeys.has(f.key));
  return (
    <div className="space-y-3 border-t pt-4">
      {fields
        .filter(f => revealedKeys.has(f.key))
        .map(f => (
          <RemovableField
            key={f.key}
            removeLabel={f.removeLabel}
            disabled={disabled}
            onRemove={() => remove(f)}
          >
            {f.children}
          </RemovableField>
        ))}
      {hidden.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {hidden.map(f => (
            <ExtraChip
              key={f.key}
              onClick={() => reveal(f)}
              disabled={disabled}
            >
              {f.revealLabel}
            </ExtraChip>
          ))}
        </div>
      )}
    </div>
  );
}

// ExtraChip is the dashed affordance that reveals an optional field.
function ExtraChip({
  onClick,
  disabled,
  children,
}: {
  onClick: () => void;
  disabled: boolean;
  children: React.ReactNode;
}) {
  return (
    <Button
      type="button"
      variant="outline"
      size="inherit"
      onClick={onClick}
      disabled={disabled}
      className="border-input bg-card text-foreground hover:border-tint-foreground hover:bg-card hover:text-foreground inline-flex h-9 items-center gap-1.5 rounded-xl border-dashed px-3.5 text-xs font-semibold"
    >
      <span aria-hidden="true" className="text-tint-foreground font-bold">
        +
      </span>
      {children}
    </Button>
  );
}

// RemovableField wraps a revealed field with the control that hides it again.
function RemovableField({
  removeLabel,
  onRemove,
  disabled,
  children,
}: {
  removeLabel: string;
  onRemove: () => void;
  disabled: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="animate-in fade-in slide-in-from-top-1 relative duration-200">
      {children}
      <Button
        type="button"
        variant="link"
        size="inherit"
        onClick={onRemove}
        disabled={disabled}
        aria-label={removeLabel}
        className="text-muted-foreground hover:text-foreground absolute right-0 top-0 text-xs font-semibold leading-none"
      >
        Remove
      </Button>
    </div>
  );
}
