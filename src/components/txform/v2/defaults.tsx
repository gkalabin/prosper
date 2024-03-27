import {
  expenseFormEmpty,
  incomeToExpense,
  transferToExpense,
} from '@/components/txform/v2/expense/defaults';
import {
  expenseToIncome,
  transferToIncome,
} from '@/components/txform/v2/income/defaults';
import {
  expenseToTransfer,
  incomeToTransfer,
} from '@/components/txform/v2/transfer/defaults';
import {FormType, TransactionFormSchema} from '@/components/txform/v2/types';
import {assertDefined} from '@/lib/assert';
import {useAllDatabaseDataContext} from '@/lib/context/AllDatabaseDataContext';
import {Transaction} from '@/lib/model/transaction/Transaction';
import {TransactionPrototype} from '@/lib/txsuggestions/TransactionPrototype';

export function useFormDefaults(
  tx: Transaction | null,
  proto: TransactionPrototype | null
): TransactionFormSchema {
  const {transactions, categories, bankAccounts} = useAllDatabaseDataContext();
  // Initial values when creating new transaction from scratch.
  if (!tx && !proto) {
    return {
      formType: FormType.EXPENSE,
      expense: expenseFormEmpty({
        transactions,
        categories,
        bankAccounts,
      }),
    };
  }
  throw new Error('Not implemented');
}

export function valuesForNewType(
  prevForm: TransactionFormSchema,
  next: FormType | null
): TransactionFormSchema {
  const prev = prevForm.formType;
  if (prev == next) {
    return prevForm;
  }
  if (prev == FormType.EXPENSE && next == FormType.INCOME) {
    assertDefined(prevForm.expense);
    return {
      formType: next,
      income: expenseToIncome(prevForm.expense),
    };
  }
  if (prev == FormType.EXPENSE && next == FormType.TRANSFER) {
    assertDefined(prevForm.expense);
    return {
      formType: next,
      transfer: expenseToTransfer(prevForm.expense),
    };
  }
  if (prev == FormType.INCOME && next == FormType.EXPENSE) {
    assertDefined(prevForm.income);
    return {
      formType: next,
      expense: incomeToExpense(prevForm.income),
    };
  }
  if (prev == FormType.INCOME && next == FormType.TRANSFER) {
    assertDefined(prevForm.income);
    return {
      formType: next,
      transfer: incomeToTransfer(prevForm.income),
    };
  }
  if (prev == FormType.TRANSFER && next == FormType.EXPENSE) {
    assertDefined(prevForm.transfer);
    return {
      formType: next,
      expense: transferToExpense(prevForm.transfer),
    };
  }
  if (prev == FormType.TRANSFER && next == FormType.INCOME) {
    assertDefined(prevForm.transfer);
    return {
      formType: next,
      income: transferToIncome(prevForm.transfer),
    };
  }
  throw new Error(`Unsupported form type transition: ${prev} -> ${next}`);
}

// export function useInitialFormDefaults(
//   t: Transaction | null
// ): TransactionFormSchema {
//   const {transactions, categories, bankAccounts, tags} =
//     useAllDatabaseDataContext();
//   if (!t) {
//     return {
//       formType: FormType.EXPENSE,
//       expense: expenseFormEmpty({
//         transactions,
//         categories,
//         bankAccounts,
//       }),
//     };
//   }
//   if (isExpense(t)) {
//     return {
//       formType: FormType.EXPENSE,
//       expense: expenseFormDefaultsForTransaction({
//         t,
//         transactions,
//         bankAccounts,
//         tags,
//       }),
//     };
//   }
//   if (isIncome(t)) {
//     return {
//       formType: FormType.INCOME,
//       income: incomeFormDefaultsForTransaction({
//         t,
//         transactions,
//         bankAccounts,
//         tags,
//       }),
//     };
//   }
//   if (isTransfer(t)) {
//     throw new Error(`Not implemented yet`);
//     // return {
//     //   formType: FormType.TRANSFER,
//     //   transfer: transferFormDefaultsForTransaction({
//     //     t,
//     //     transactions,
//     //     bankAccounts,
//     //     tags,
//     //   }),
//     // };
//   }
//   const _exhaustiveCheck: never = t;
//   throw new Error(`Unknown transaction type for ${_exhaustiveCheck}`);
// }
