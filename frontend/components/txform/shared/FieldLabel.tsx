import {FormLabel} from '@/components/ui/form';

// Label rendered above every transaction form field.
export function FieldLabel({children}: {children: React.ReactNode}) {
  return (
    <FormLabel className="text-muted-foreground text-xs font-semibold">
      {children}
    </FormLabel>
  );
}
