'use client';
import {upsertTransaction} from '@/actions/txform/index';
import {
  useFormDefaults,
  valuesForDraft,
  valuesForNewType,
} from '@/components/txform/defaults';
import {DraftContextProvider} from '@/components/txform/DraftContext';
import {expenseFormEmpty} from '@/components/txform/expense/defaults';
import {ExpenseForm} from '@/components/txform/expense/ExpenseForm';
import {
  FormTypeSelect,
  TRANSACTION_FORM_TABPANEL_ID,
} from '@/components/txform/FormTypeSelect';
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
import {TransactionDraft} from '@/lib/grpc/gen/prosper/v1/ledger';
import {useDisplayBankAccounts} from '@/lib/model/AppDataModel';
import {Transaction} from '@/lib/model/transaction/Transaction';
import {setFormErrors} from '@/lib/util/forms';
import {zodResolver} from '@hookform/resolvers/zod';
import {useCallback, useState} from 'react';
import {useForm} from 'react-hook-form';
import {mutate} from 'swr';

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
  if (props.transaction?.kind === 'OpeningBalance') {
    // TODO: implement this nicely in the UI.
    throw new Error('OpeningBalance cannot be edited in the UI');
  }
  const {categories} = useCoreDataContext();
  const bankAccounts = useDisplayBankAccounts();
  const [draft, setDraft] = useState<TransactionDraft | null>(null);
  const creatingNewTransaction = !props.transaction;
  // Form values update strategy:
  //  - Existing transaction is either set all the time or not defined. If it's set, there could be no draft.
  //  - Draft might be set only when creating new transaction.
  //    When it changes, the form should reset without preserving any of the state because
  //    cicking on a suggestion should result in consistent action of prefilling the form with the suggested data.
  //  - When the form type changes, the state should be preserved as much a possible as the form type toggle is
  //    like a button which hides/shows some fields.
  const form = useForm<TransactionFormSchema>({
    resolver: zodResolver(transactionFormValidationSchema),
    // Default values used only when the form renders initially,
    // when this happens the draft is always null,
    // so it is not used for default values calculation.
    defaultValues: useFormDefaults(props.transaction),
  });
  const formType = form.watch('formType');
  const onFormTypeChange = (newFormType: FormType): void => {
    form.reset(valuesForNewType(form.getValues(), newFormType, bankAccounts));
  };
  const onDraftChange = useCallback(
    (draft: TransactionDraft): void => {
      setDraft(draft);
      form.reset(valuesForDraft({draft, bankAccounts, categories}));
    },
    [bankAccounts, categories, form]
  );
  const onSubmit = form.handleSubmit(async (data: TransactionFormSchema) => {
    try {
      const transactionId = props.transaction?.id ?? null;
      const origins = draft?.origins ?? [];
      const response = await upsertTransaction(transactionId, origins, data);
      if (response.status === 'SUCCESS') {
        // The recorded event is now linked to the new transaction;
        // refresh the suggestions so it renders as recorded.
        mutate('/api/suggest');
        if (props.transaction) {
          // Close the form after updating the transaction.
          props.onClose();
        } else {
          // Reset the form after successful submission.
          const newFormValues: TransactionFormSchema = {
            formType: 'EXPENSE',
            expense: expenseFormEmpty({bankAccounts, categories}),
          };
          // Keep the account id because the user usually records transactions in a row for the same account.
          newFormValues.expense!.accountId =
            data.expense?.accountId ||
            data.income?.accountId ||
            data.transfer?.toAccountId ||
            null;
          setDraft(null);
          form.reset(newFormValues);
        }
        return;
      }
      setFormErrors(response.errors, form.setError);
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
            activeDraft={draft}
            onItemClick={onDraftChange}
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
      <DraftContextProvider draft={draft}>
        <Form {...form}>
          <form onSubmit={onSubmit}>
            <div className="flex justify-center py-4">
              <FormTypeSelect
                value={formType}
                setValue={onFormTypeChange}
                disabled={form.formState.isSubmitting}
              />
            </div>
            <div
              className="grid grid-cols-6 gap-x-6 gap-y-3"
              id={TRANSACTION_FORM_TABPANEL_ID}
              role="tabpanel"
              aria-labelledby={`tab-${formType.toLowerCase()}`}
            >
              {formType == 'EXPENSE' && (
                <ExpenseForm transaction={props.transaction} />
              )}
              {formType == 'TRANSFER' && (
                <TransferForm transaction={props.transaction} />
              )}
              {formType == 'INCOME' && (
                <IncomeForm transaction={props.transaction} />
              )}
            </div>

            <div className="mt-4 flex justify-between gap-2 border-t py-4">
              <div className="text-destructive text-sm font-medium">
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
      </DraftContextProvider>
    </>
  );
}
