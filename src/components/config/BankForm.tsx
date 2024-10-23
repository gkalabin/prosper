import {Button} from '@/components/ui/button';
import {AddOrUpdateButtonText} from '@/components/ui/buttons';
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
import {Bank} from '@/lib/model/BankAccount';
import {zodResolver} from '@hookform/resolvers/zod';
import {Bank as DBBank} from '@prisma/client';
import {useState} from 'react';
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
  const [apiError, setApiError] = useState('');
  const isCreate = !bank;

  const handleSubmit = async (values: BankFormSchema) => {
    setApiError('');
    try {
      const dbDbank = await fetch(
        `/api/config/bank/${isCreate ? '' : bank.id}`,
        {
          method: isCreate ? 'POST' : 'PUT',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify(values),
        }
      );
      onAddedOrUpdated(await dbDbank.json());
    } catch (error) {
      setApiError(`Failed to add: ${error}`);
    }
  };

  const form = useForm<BankFormSchema>({
    resolver: zodResolver(bankFormValidationSchema),
    defaultValues: {
      name: bank?.name ?? '',
      displayOrder: bank?.displayOrder ?? displayOrder,
    },
  });

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

        {apiError && (
          <div className="text-sm font-medium text-destructive">{apiError}</div>
        )}

        <div className="flex justify-end gap-2">
          <Button
            onClick={onClose}
            variant="secondary"
            disabled={form.formState.isSubmitting}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={form.formState.isSubmitting}>
            <AddOrUpdateButtonText add={isCreate} />
          </Button>
        </div>
      </form>
    </Form>
  );
}
