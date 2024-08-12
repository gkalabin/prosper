import {
  expenseFormEmpty,
  expenseFromPrototype,
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
import {BankAccount} from '@/lib/model/BankAccount';
import {Category} from '@/lib/model/Category';
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
      formType: 'EXPENSE',
      expense: expenseFormEmpty({
        transactions,
        categories,
        bankAccounts,
      }),
    };
  }
  if (!tx) {
    assertDefined(proto);
    return valuesForPrototype({proto, transactions, categories});
  }
  throw new Error('Not implemented');
}

export function valuesForPrototype({
  proto,
  transactions,
  categories,
}: {
  proto: TransactionPrototype;
  transactions: Transaction[];
  categories: Category[];
}): TransactionFormSchema {
  if (proto.type === 'withdrawal') {
    return {
      formType: 'EXPENSE',
      expense: expenseFromPrototype({proto, transactions, categories}),
    };
  }
  throw new Error('Not implemented');
}

export function valuesForNewType(
  prevForm: TransactionFormSchema,
  next: FormType | null,
  bankAccounts: BankAccount[]
): TransactionFormSchema {
  const prev = prevForm.formType;
  if (prev == next) {
    return prevForm;
  }
  if (prev == 'EXPENSE' && next == 'INCOME') {
    assertDefined(prevForm.expense);
    return {
      formType: next,
      income: expenseToIncome(prevForm.expense, bankAccounts),
    };
  }
  if (prev == 'EXPENSE' && next == 'TRANSFER') {
    assertDefined(prevForm.expense);
    return {
      formType: next,
      transfer: expenseToTransfer(prevForm.expense, bankAccounts),
    };
  }
  if (prev == 'INCOME' && next == 'EXPENSE') {
    assertDefined(prevForm.income);
    return {
      formType: next,
      expense: incomeToExpense(prevForm.income),
    };
  }
  if (prev == 'INCOME' && next == 'TRANSFER') {
    assertDefined(prevForm.income);
    return {
      formType: next,
      transfer: incomeToTransfer(prevForm.income),
    };
  }
  if (prev == 'TRANSFER' && next == 'EXPENSE') {
    assertDefined(prevForm.transfer);
    return {
      formType: next,
      expense: transferToExpense(prevForm.transfer),
    };
  }
  if (prev == 'TRANSFER' && next == 'INCOME') {
    assertDefined(prevForm.transfer);
    return {
      formType: next,
      income: transferToIncome(prevForm.transfer),
    };
  }
  throw new Error(`Unsupported form type transition: ${prev} -> ${next}`);
}
