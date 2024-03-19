import {
  expenseFormDefaultsEmpty,
  expenseFormDefaultsForTransaction,
  expenseFormFromExistingForm,
} from '@/components/txform/v2/expense/defaults';
import {incomeFormDefaultsForTransaction} from '@/components/txform/v2/income/defaults';
import {FormType, TransactionFormSchema} from '@/components/txform/v2/types';
import {assert, assertDefined} from '@/lib/assert';
import {useAllDatabaseDataContext} from '@/lib/context/AllDatabaseDataContext';
import {
  Transaction,
  isExpense,
  isIncome,
  isTransfer,
} from '@/lib/model/transaction/Transaction';
import {TransactionPrototype} from '@/lib/txsuggestions/TransactionPrototype';

export function useFormDefaults(
  prev: TransactionFormSchema | null,
  prefill: Transaction | TransactionPrototype | null,
  nextFormType: FormType | null
): TransactionFormSchema {
  const {transactions, categories, bankAccounts, tags} =
    useAllDatabaseDataContext();
  // Initial values when creating new transaction from scratch.
  if (!prefill && !prev && !nextFormType) {
    return {
      formType: FormType.EXPENSE,
      expense: expenseFormDefaultsEmpty({
        transactions,
        categories,
        bankAccounts,
      }),
    };
  }
  // Switching transaction type, no prefill data.
  if (!prefill) {
    // When nextFormType is defined, previous values should exist.
    assertDefined(prev);
    assertDefined(nextFormType);
    switch (nextFormType) {
      case FormType.EXPENSE:
        return {
          formType: nextFormType,
          expense: expenseFormFromExistingForm(prev),
        };
      case FormType.INCOME:
        return {
          formType: FormType.EXPENSE,
          expense: {},
        };
      case FormType.TRANSFER:
        return {
          formType: FormType.EXPENSE,
          expense: {},
        };
    }
  }
  throw new Error('Not implemented');
}

export function useInitialFormDefaults(
  t: Transaction | null
): TransactionFormSchema {
  const {transactions, categories, bankAccounts, tags} =
    useAllDatabaseDataContext();
  if (!t) {
    return {
      formType: FormType.EXPENSE,
      expense: expenseFormDefaultsEmpty({
        transactions,
        categories,
        bankAccounts,
      }),
    };
  }
  if (isExpense(t)) {
    return {
      formType: FormType.EXPENSE,
      expense: expenseFormDefaultsForTransaction({
        t,
        transactions,
        bankAccounts,
        tags,
      }),
    };
  }
  if (isIncome(t)) {
    return {
      formType: FormType.INCOME,
      income: incomeFormDefaultsForTransaction({
        t,
        transactions,
        bankAccounts,
        tags,
      }),
    };
  }
  if (isTransfer(t)) {
    throw new Error(`Not implemented yet`);
    // return {
    //   formType: FormType.TRANSFER,
    //   transfer: transferFormDefaultsForTransaction({
    //     t,
    //     transactions,
    //     bankAccounts,
    //     tags,
    //   }),
    // };
  }
  const _exhaustiveCheck: never = t;
  throw new Error(`Unknown transaction type for ${_exhaustiveCheck}`);
}
