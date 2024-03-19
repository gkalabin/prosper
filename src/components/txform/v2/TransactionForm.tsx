import {TransactionAPIResponse} from '@/app/api/transaction/dbHelpers';
import {NewTransactionSuggestions} from '@/components/txform/NewTransactionSuggestions';
import {FormTypeSelect} from '@/components/txform/v2/FormTypeSelect';
import {useInitialFormDefaults} from '@/components/txform/v2/defaults';
import {ExpenseForm} from '@/components/txform/v2/expense/ExpenseForm';
import {IncomeForm} from '@/components/txform/v2/income/IncomeForm';
import {
  FormType,
  TransactionFormSchema,
  transactionFormValidationSchema,
} from '@/components/txform/v2/types';
import {ButtonFormPrimary, ButtonFormSecondary} from '@/components/ui/buttons';
import {Transaction} from '@/lib/model/transaction/Transaction';
import {TransactionPrototype} from '@/lib/txsuggestions/TransactionPrototype';
import {zodResolver} from '@hookform/resolvers/zod';
import {useState} from 'react';
import {FormProvider, useForm} from 'react-hook-form';

export const TransactionForm = (props: {
  transaction: Transaction | null;
  onChange: (response: TransactionAPIResponse) => void;
  onClose: () => void;
}) => {
  const [prototype, setPrototype] = useState<TransactionPrototype | null>(null);
  const creatingNewTransaction = !props.transaction;
  const form = useForm<TransactionFormSchema>({
    resolver: zodResolver(transactionFormValidationSchema),
    defaultValues: useInitialFormDefaults(props.transaction),
  });
  const formType = form.watch('formType');
  const onFormTypeChange = (x: FormType) => {
    return form.setValue('formType', x);
  }
  const onSubmit = (x: TransactionFormSchema): void => {
    console.log(x);
  };
  return (
    // The form provider is at a very high level and includes the forms for all
    // the form types (expense, income, transfer), selector for the form type
    // and the transaction suggestions. This is necessary because
    //   - The form type selector and suggestions don't make sense without the form.
    //     Semantially they are a part of the form.
    //   - Form submission should disable form type selector and suggestions as well.
    //     The alternative is to keep track of isSubmitting state at the higher level,
    //     but it invalidates the purpose of incapsulating the form common logic.
    <FormProvider {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        {/* Transaction suggestions only make sense when creating new transaction,
          they are hidden when updating an existing transaction.
       */}
        {creatingNewTransaction && (
          <div className="mb-2">
            <NewTransactionSuggestions
              activePrototype={prototype}
              onItemClick={setPrototype}
            />
          </div>
        )}

        <div className="grid grid-cols-6 gap-x-6 gap-y-3">
          <FormTypeSelect
            value={formType}
            setValue={onFormTypeChange}
            disabled={form.formState.isSubmitting}
          />
          {formType == FormType.EXPENSE && (
            <ExpenseForm
              transaction={props.transaction}
              prototype={prototype}
            />
          )}
          {formType == FormType.INCOME && (
            <IncomeForm transaction={props.transaction} prototype={prototype} />
          )}
        </div>

        <div className="flex justify-end gap-2 bg-gray-50 px-4 py-3 sm:px-6">
          <ButtonFormSecondary className="self-start" onClick={props.onClose}>
            Cancel
          </ButtonFormSecondary>
          <ButtonFormPrimary className="self-start" type="submit">
            {creatingNewTransaction && form.formState.isSubmitting && 'Adding…'}
            {creatingNewTransaction && !form.formState.isSubmitting && 'Add'}
            {!creatingNewTransaction &&
              form.formState.isSubmitting &&
              'Updating…'}
            {!creatingNewTransaction &&
              !form.formState.isSubmitting &&
              'Update'}
          </ButtonFormPrimary>
        </div>
      </form>
    </FormProvider>
  );
};
