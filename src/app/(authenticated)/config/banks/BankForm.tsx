import {upsertBank} from '@/actions/config/bank';
import {Button} from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {Input} from '@/components/ui/input';
import {
  BankFormSchema,
  bankFormValidationSchema,
} from '@/lib/form-types/BankFormSchema';
import {AddOrUpdateButtonText} from '@/lib/i18n';
import {Bank} from '@/lib/model/BankAccount';
import {setFormErrors} from '@/lib/util/forms';
import {zodResolver} from '@hookform/resolvers/zod';
import {Bank as DBBank} from '@prisma/client';
import {useForm} from 'react-hook-form';

export function BankForm({
  bank,
  displayOrder,
  onAddedOrUpdated,
  onClose,
}: {
  bank?: Bank;
  displayOrder: number;
  onAddedOrUpdated: (x: DBBank) => void;
  onClose: () => void;
}) {
  const form = useForm<BankFormSchema>({
    resolver: zodResolver(bankFormValidationSchema),
    defaultValues: {
      name: bank?.name ?? '',
      displayOrder: bank?.displayOrder ?? displayOrder,
    },
  });
  const handleSubmit = async (values: BankFormSchema) => {
    const result = await upsertBank(bank?.id ?? null, values);
    if (result.status === 'CLIENT_ERROR') {
      setFormErrors(result.errors, form.setError);
      return;
    }
    onAddedOrUpdated(result.data);
  };
  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(handleSubmit)}
        className="flex flex-col gap-4"
      >
        <FormField
          control={form.control}
          name="name"
          render={({field}) => (
            <FormItem>
              <FormLabel>Bank Name</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="displayOrder"
          render={({field}) => (
            <FormItem>
              <FormLabel>Display order (smaller on top)</FormLabel>
              <FormControl>
                <Input type="number" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-between gap-2">
          <div className="text-sm font-medium text-destructive">
            {form.formState.errors.root?.message}
          </div>
          <div className="flex-none space-x-4">
            <Button
              onClick={onClose}
              variant="secondary"
              disabled={form.formState.isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              <AddOrUpdateButtonText add={!bank} />
            </Button>
          </div>
        </div>
      </form>
    </Form>
  );
}
