import {Button} from '@/components/ui/button';
import {TextButton} from '@/components/ui/text-button';
import {PlusIcon} from '@heroicons/react/24/outline';
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

// ExtraChip is the affordance that reveals an optional field.
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
      size="sm"
      onClick={onClick}
      disabled={disabled}
    >
      <PlusIcon />
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
      <TextButton
        type="button"
        tone="muted"
        className="absolute right-0 top-0 text-xs leading-none"
        aria-label={removeLabel}
        onClick={onRemove}
        disabled={disabled}
      >
        Remove
      </TextButton>
    </div>
  );
}
