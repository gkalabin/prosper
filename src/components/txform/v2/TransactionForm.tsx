'use client';
import {upsertTransaction} from '@/actions/txform/index';
import {TransactionAPIResponse} from '@/app/api/transaction/dbHelpers';
import {FormTypeSelect} from '@/components/txform/v2/FormTypeSelect';
import {
  useFormDefaults,
  valuesForNewType,
  valuesForPrototype,
} from '@/components/txform/v2/defaults';
import {ExpenseForm} from '@/components/txform/v2/expense/ExpenseForm';
import {IncomeForm} from '@/components/txform/v2/income/IncomeForm';
import {NewTransactionSuggestions} from '@/components/txform/v2/suggestions/NewTransactionSuggestions';
import {TransferForm} from '@/components/txform/v2/transfer/TransferForm';
import {
  type FormType,
  TransactionFormSchema,
  transactionFormValidationSchema,
} from '@/components/txform/v2/types';
import {ButtonFormPrimary, ButtonFormSecondary} from '@/components/ui/buttons';
import {Form} from '@/components/ui/form';
import {useAllDatabaseDataContext} from '@/lib/context/AllDatabaseDataContext';
import {useDisplayBankAccounts} from '@/lib/model/AllDatabaseDataModel';
import {Transaction} from '@/lib/model/transaction/Transaction';
import {TransactionPrototype} from '@/lib/txsuggestions/TransactionPrototype';
import {zodResolver} from '@hookform/resolvers/zod';
import {useState} from 'react';
import {useForm} from 'react-hook-form';

export const TransactionForm = (props: {
  transaction: Transaction | null;
  onChange: (response: TransactionAPIResponse) => void;
  onClose: () => void;
}) => {
  const {transactions, categories} = useAllDatabaseDataContext();
  const bankAccounts = useDisplayBankAccounts();
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
    defaultValues: useFormDefaults(props.transaction, proto),
  });
  const formType = form.watch('formType');
  const onFormTypeChange = (newFormType: FormType): void => {
    form.reset(valuesForNewType(form.getValues(), newFormType, bankAccounts));
  };
  const onPrototypeChange = (proto: TransactionPrototype): void => {
    setProto(proto);
    form.reset(valuesForPrototype({proto, categories, transactions}));
  };
  const onSubmit = form.handleSubmit(async (data: TransactionFormSchema) => {
    try {
      const transactionId = props.transaction?.id ?? null;
      const usedProtos = proto ? [proto] : [];
      const response = await upsertTransaction(transactionId, usedProtos, data);
      if (response.errors) {
        console.error('Validation errors:', response);
      } else {
        console.log('Form submitted successfully:', response);
      }
    } catch (error) {
      console.error('Submission error:', error);
    }
  });
  return (
    // The form provider is at a very high level and includes the forms for all
    // the form types (expense, income, transfer), selector for the form type
    // and the transaction suggestions. This is necessary because
    //   - The form type selector and suggestions don't make sense without the form.
    //     Semantially they are a part of the form.
    //   - Form submission should disable form type selector and suggestions as well.
    //     The alternative is to keep track of isSubmitting state at the higher level,
    //     but it invalidates the purpose of incapsulating the form common logic.
    <Form {...form}>
      <form onSubmit={onSubmit}>
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

        <div className="grid grid-cols-6 gap-x-6 gap-y-3">
          <FormTypeSelect
            value={formType}
            setValue={onFormTypeChange}
            disabled={form.formState.isSubmitting}
          />
          {formType == 'EXPENSE' && <ExpenseForm />}
          {formType == 'TRANSFER' && <TransferForm />}
          {formType == 'INCOME' && <IncomeForm />}
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
    </Form>
  );
};
