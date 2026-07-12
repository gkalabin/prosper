import {PlusIcon} from '@heroicons/react/24/outline';
import {useFormContext} from 'react-hook-form';

// Dashed pill revealing one of the optional form fields (note, trip, refund).
export function ExtraChip({
  onClick,
  children,
}: {
  onClick: () => void;
  children: React.ReactNode;
}) {
  const {formState} = useFormContext();
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={formState.isSubmitting}
      className="border-input text-muted-foreground hover:border-brand hover:text-brand-ink inline-flex items-center gap-1.5 rounded-full border border-dashed bg-transparent px-3 py-1.5 text-[13px] font-semibold disabled:opacity-50"
    >
      <PlusIcon className="h-3.5 w-3.5" />
      {children}
    </button>
  );
}

// Wraps a revealed optional field with a link to hide and clear it. The
// remove link sits at the top right, on the same line as the field's label.
export function RemovableField({
  onRemove,
  children,
}: {
  onRemove: () => void;
  children: React.ReactNode;
}) {
  const {formState} = useFormContext();
  return (
    <div className="relative col-span-6">
      <div className="grid grid-cols-6 gap-x-2.5 gap-y-4">{children}</div>
      <button
        type="button"
        onClick={onRemove}
        disabled={formState.isSubmitting}
        className="text-muted-foreground hover:text-destructive absolute right-0 top-0 text-xs underline disabled:opacity-50"
      >
        Remove
      </button>
    </div>
  );
}
