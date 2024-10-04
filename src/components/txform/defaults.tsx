import {
  expenseFormEmpty,
  expenseFromPrototype,
  expenseFromTransaction,
  incomeToExpense,
  transferToExpense,
} from '@/components/txform/expense/defaults';
import {
  expenseToIncome,
  incomeFormEmpty,
  incomeFromPrototype,
  incomeFromTransaction,
  transferToIncome,
} from '@/components/txform/income/defaults';
import {
  expenseToTransfer,
  incomeToTransfer,
  transferFormEmpty,
  transferFromPrototype,
  transferFromTransaction,
} from '@/components/txform/transfer/defaults';
import {FormType, TransactionFormSchema} from '@/components/txform/types';
import {assertDefined, assertNotDefined} from '@/lib/assert';
import {useAllDatabaseDataContext} from '@/lib/context/AllDatabaseDataContext';
import {BankAccount} from '@/lib/model/BankAccount';
import {Category} from '@/lib/model/Category';
import {Tag} from '@/lib/model/Tag';
import {
  isIncome,
  isTransfer,
  Transaction,
} from '@/lib/model/transaction/Transaction';
import {TransactionLink} from '@/lib/model/TransactionLink';
import {Trip} from '@/lib/model/Trip';
import {TransactionPrototype} from '@/lib/txsuggestions/TransactionPrototype';

export function useFormDefaults(
  tx: Transaction | null,
  proto: TransactionPrototype | null
): TransactionFormSchema {
  const {
    transactions,
    categories,
    bankAccounts,
    transactionLinks,
    tags,
    trips,
  } = useAllDatabaseDataContext();
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
    return valuesForPrototype({proto, transactions, categories, bankAccounts});
  }
  assertNotDefined(proto);
  return valuesForTransaction(tx, transactionLinks, tags, trips);
}

function valuesForTransaction(
  tx: Transaction,
  transactionLinks: TransactionLink[],
  tags: Tag[],
  trips: Trip[]
): TransactionFormSchema {
  if (isIncome(tx)) {
    return {
      formType: 'INCOME',
      income: incomeFromTransaction({
        income: tx,
        allTags: tags,
        allLinks: transactionLinks,
      }),
    };
  }
  if (isTransfer(tx)) {
    return {
      formType: 'TRANSFER',
      transfer: transferFromTransaction({
        transfer: tx,
        allTags: tags,
      }),
    };
  }
  return {
    formType: 'EXPENSE',
    expense: expenseFromTransaction({
      expense: tx,
      allTags: tags,
      allLinks: transactionLinks,
      allTrips: trips,
    }),
  };
}

export function emptyValuesForType({
  formType,
  transactions,
  categories,
  bankAccounts,
}: {
  formType: FormType;
  transactions: Transaction[];
  categories: Category[];
  bankAccounts: BankAccount[];
}): TransactionFormSchema {
  switch (formType) {
    case 'EXPENSE':
      return {
        formType,
        expense: expenseFormEmpty({
          transactions,
          categories,
          bankAccounts,
        }),
      };
    case 'INCOME':
      return {
        formType,
        income: incomeFormEmpty({
          transactions,
          categories,
          bankAccounts,
        }),
      };
    case 'TRANSFER':
      return {
        formType,
        transfer: transferFormEmpty({
          transactions,
          categories,
          bankAccounts,
        }),
      };
    default:
      const _exhaustiveCheck: never = formType;
      throw new Error(`Unsupported form type: ${_exhaustiveCheck}`);
  }
}

export function valuesForPrototype({
  proto,
  transactions,
  categories,
  bankAccounts,
}: {
  proto: TransactionPrototype;
  transactions: Transaction[];
  categories: Category[];
  bankAccounts: BankAccount[];
}): TransactionFormSchema {
  const tt = proto.type;
  switch (tt) {
    case 'withdrawal':
      return {
        formType: 'EXPENSE',
        expense: expenseFromPrototype({
          proto,
          bankAccounts,
          transactions,
          categories,
        }),
      };
    case 'deposit':
      return {
        formType: 'INCOME',
        income: incomeFromPrototype({
          proto,
          bankAccounts,
          transactions,
          categories,
        }),
      };
    case 'transfer':
      return {
        formType: 'TRANSFER',
        transfer: transferFromPrototype({proto, transactions, categories}),
      };
    default:
      const _exhaustiveCheck: never = tt;
      throw new Error(`Unsupported prototype type: ${_exhaustiveCheck}`);
  }
}

export function valuesForNewType(
  prevForm: TransactionFormSchema,
  next: FormType | null,
  bankAccounts: BankAccount[],
  transactions: Transaction[]
): TransactionFormSchema {
  const prev = prevForm.formType;
  if (prev == next) {
    return prevForm;
  }
  if (prev == 'EXPENSE' && next == 'INCOME') {
    assertDefined(prevForm.expense);
    return {
      formType: next,
      income: expenseToIncome({
        prev: prevForm.expense,
        bankAccounts,
        transactions,
      }),
    };
  }
  if (prev == 'EXPENSE' && next == 'TRANSFER') {
    assertDefined(prevForm.expense);
    return {
      formType: next,
      transfer: expenseToTransfer({
        prev: prevForm.expense,
        bankAccounts,
        transactions,
      }),
    };
  }
  if (prev == 'INCOME' && next == 'EXPENSE') {
    assertDefined(prevForm.income);
    return {
      formType: next,
      expense: incomeToExpense({
        prev: prevForm.income,
        transactions,
      }),
    };
  }
  if (prev == 'INCOME' && next == 'TRANSFER') {
    assertDefined(prevForm.income);
    return {
      formType: next,
      transfer: incomeToTransfer({
        prev: prevForm.income,
        transactions,
      }),
    };
  }
  if (prev == 'TRANSFER' && next == 'EXPENSE') {
    assertDefined(prevForm.transfer);
    return {
      formType: next,
      expense: transferToExpense({
        prev: prevForm.transfer,
        transactions,
      }),
    };
  }
  if (prev == 'TRANSFER' && next == 'INCOME') {
    assertDefined(prevForm.transfer);
    return {
      formType: next,
      income: transferToIncome({
        prev: prevForm.transfer,
        transactions,
      }),
    };
  }
  throw new Error(`Unsupported form type transition: ${prev} -> ${next}`);
}
