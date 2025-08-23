'use client';
import {upsertTransaction} from '@/actions/txform/index';
import {
  emptyValuesForType,
  useFormDefaults,
  valuesForNewType,
  valuesForPrototype,
} from '@/components/txform/defaults';
import {ExpenseForm} from '@/components/txform/expense/ExpenseForm';
import {FormTypeSelect} from '@/components/txform/FormTypeSelect';
import {IncomeForm} from '@/components/txform/income/IncomeForm';
import {NewTransactionSuggestions} from '@/components/txform/NewTransactionSuggestions';
import {TransferForm} from '@/components/txform/transfer/TransferForm';
import {
  type FormType,
  TransactionFormSchema,
  transactionFormValidationSchema,
} from '@/components/txform/types';
import {Button} from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {Form} from '@/components/ui/form';
import {useCoreDataContext} from '@/lib/context/CoreDataContext';
import {useTransactionDataContext} from '@/lib/context/TransactionDataContext';
import {useDisplayBankAccounts} from '@/lib/model/AllDatabaseDataModel';
import {Transaction} from '@/lib/model/transactionNEW/Transaction';
import {TransactionPrototype} from '@/lib/txsuggestions/TransactionPrototype';
import {zodResolver} from '@hookform/resolvers/zod';
import {useCallback, useState} from 'react';
import {useForm} from 'react-hook-form';

export function NewTransactionFormDialog({
  transaction,
  open,
  onOpenChange,
}: {
  transaction: Transaction | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange} modal={true}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {transaction ? 'Update transaction' : 'Create new transaction'}
          </DialogTitle>
          <DialogDescription>
            Use the form below to{' '}
            {transaction ? 'update transaction' : 'create a new transaction'}
          </DialogDescription>
        </DialogHeader>
        <TransactionForm
          transaction={transaction}
          onClose={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

export function TransactionForm(props: {
  transaction: Transaction | null;
  onClose: () => void;
}) {
  const {categories} = useCoreDataContext();
  const {transactions} = useTransactionDataContext();
  const accounts = useDisplayBankAccounts();
  const [proto, setProto] = useState<TransactionPrototype | null>(null);
  const creatingNewTransaction = !props.transaction;
  // Form values update strategy:
  //  - Existing transaction is either set all the time or not defined. If it's set, there could be no prototype.
  //  - Prototype might be set only when creating new transaction.
  //    When it changes, the form should reset without preserving any of the state because
  //    cicking on a prototype should result in consistent action of prefilling the form with the prototype data.
  //  - When the form type changes, the state should be preserved as much a possible as the form type toggle is
  //    like a button which hides/shows some fields.
  const form = useForm<TransactionFormSchema>({
    resolver: zodResolver(transactionFormValidationSchema),
    // Default values used only when the form renders initially,
    // when this happens the proto is always null,
    // so proto is not used for default values calculation.
    defaultValues: useFormDefaults(props.transaction),
  });
  const formType = form.watch('formType');
  const onFormTypeChange = (newFormType: FormType): void => {
    form.reset(
      valuesForNewType(form.getValues(), newFormType, accounts, transactions)
    );
  };
  const onPrototypeChange = useCallback(
    (proto: TransactionPrototype): void => {
      setProto(proto);
      form.reset(
        valuesForPrototype({proto, accounts, categories, transactions})
      );
    },
    [accounts, categories, form, transactions]
  );
  const onSubmit = form.handleSubmit(async (data: TransactionFormSchema) => {
    try {
      const transactionId = props.transaction?.transactionId ?? null;
      const usedProtos = proto ? [proto] : [];
      const response = await upsertTransaction(transactionId, usedProtos, data);
      if (response.status === 'SUCCESS') {
        if (props.transaction) {
          // Close the form after updating the transaction.
          props.onClose();
        } else {
          setProto(null);
          form.reset(
            emptyValuesForType({
              formType,
              transactions,
              accounts,
              categories,
            })
          );
        }
        return;
      }
      // Handle client errors
      const {errors} = response;
      Object.entries(errors).forEach(([field, messages]) => {
        if (!messages) {
          return;
        }
        form.setError(field as keyof TransactionFormSchema, {
          message: messages.join(', '),
        });
      });
    } catch (error) {
      form.setError('root', {
        message: 'Failed to save transaction. Server says: ' + error,
      });
    }
  });
  return (
    <>
      {/* Transaction suggestions only make sense when creating new transaction,
          they are hidden when updating an existing transaction.
       */}
      {creatingNewTransaction && (
        <div className="mb-2">
          <NewTransactionSuggestions
            activePrototype={proto}
            onItemClick={onPrototypeChange}
            disabled={form.formState.isSubmitting}
          />
        </div>
      )}

      {/**The form provider is at a very high level and includes the forms for all
          the form types (expense, income, transfer) and selector for the form types.
          This is necessary because
            - The form type selector and suggestions don't make sense without the form.
              Semantially they are a part of the form.
            - Form submission should disable form type selector and suggestions as well.
              The alternative is to keep track of isSubmitting state at the higher level,
              but it invalidates the purpose of incapsulating the form common logic.
    */}
      <Form {...form}>
        <form onSubmit={onSubmit}>
          <div className="grid grid-cols-6 gap-x-6 gap-y-3">
            <FormTypeSelect
              value={formType}
              setValue={onFormTypeChange}
              disabled={form.formState.isSubmitting}
            />
            {formType == 'EXPENSE' && (
              <ExpenseForm transaction={props.transaction} proto={proto} />
            )}
            {formType == 'TRANSFER' && (
              <TransferForm transaction={props.transaction} />
            )}
            {formType == 'INCOME' && (
              <IncomeForm transaction={props.transaction} />
            )}
          </div>

          <div className="mt-4 flex justify-between gap-2 border-t py-4">
            <div className="text-sm font-medium text-destructive">
              {form.formState.errors.root?.message}
            </div>
            <div className="flex-none space-x-4">
              <Button
                type="button"
                variant="secondary"
                onClick={props.onClose}
                disabled={form.formState.isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {creatingNewTransaction &&
                  form.formState.isSubmitting &&
                  'Adding…'}
                {creatingNewTransaction &&
                  !form.formState.isSubmitting &&
                  'Add'}
                {!creatingNewTransaction &&
                  form.formState.isSubmitting &&
                  'Updating…'}
                {!creatingNewTransaction &&
                  !form.formState.isSubmitting &&
                  'Update'}
              </Button>
            </div>
          </div>
        </form>
      </Form>
    </>
  );
}
