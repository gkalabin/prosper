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
import {assertDefined} from '@/lib/assert';
import {useCoreDataContext} from '@/lib/context/CoreDataContext';
import {useTransactionDataContext} from '@/lib/context/TransactionDataContext';
import {Account} from '@/lib/model/Account';
import {Category} from '@/lib/model/Category';
import {Tag} from '@/lib/model/Tag';
import {TransactionLink} from '@/lib/model/TransactionLink';
import {Transaction} from '@/lib/model/transactionNEW/Transaction';
import {Trip} from '@/lib/model/Trip';
import {TransactionPrototype} from '@/lib/txsuggestions/TransactionPrototype';

export function useFormDefaults(tx: Transaction | null): TransactionFormSchema {
  const {categories, accounts, tags, trips} = useCoreDataContext();
  const {transactions, transactionLinks} = useTransactionDataContext();
  // Initial values when creating new transaction from scratch.
  if (!tx) {
    return {
      formType: 'EXPENSE',
      expense: expenseFormEmpty({
        transactions,
        categories,
        accounts,
      }),
    };
  }
  return valuesForTransaction(tx, transactionLinks, tags, trips);
}

function valuesForTransaction(
  tx: Transaction,
  transactionLinks: TransactionLink[],
  tags: Tag[],
  trips: Trip[]
): TransactionFormSchema {
  if (tx.kind === 'INCOME') {
    return {
      formType: 'INCOME',
      income: incomeFromTransaction({
        income: tx,
        allTags: tags,
        allLinks: transactionLinks,
      }),
    };
  }
  if (tx.kind === 'TRANSFER') {
    return {
      formType: 'TRANSFER',
      transfer: transferFromTransaction({
        transfer: tx,
        allTags: tags,
      }),
    };
  }
  if (tx.kind === 'EXPENSE') {
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
  throw new Error(`Unsupported transaction kind: ${tx.kind}`);
}

export function emptyValuesForType({
  formType,
  transactions,
  categories,
  accounts,
}: {
  formType: FormType;
  transactions: Transaction[];
  categories: Category[];
  accounts: Account[];
}): TransactionFormSchema {
  switch (formType) {
    case 'EXPENSE':
      return {
        formType,
        expense: expenseFormEmpty({
          transactions,
          categories,
          accounts,
        }),
      };
    case 'INCOME':
      return {
        formType,
        income: incomeFormEmpty({
          transactions,
          categories,
          accounts,
        }),
      };
    case 'TRANSFER':
      return {
        formType,
        transfer: transferFormEmpty({
          transactions,
          categories,
          accounts,
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
  accounts,
}: {
  proto: TransactionPrototype;
  transactions: Transaction[];
  categories: Category[];
  accounts: BankAccount[];
}): TransactionFormSchema {
  const tt = proto.type;
  switch (tt) {
    case 'withdrawal':
      return {
        formType: 'EXPENSE',
        expense: expenseFromPrototype({
          proto,
          accounts,
          transactions,
          categories,
        }),
      };
    case 'deposit':
      return {
        formType: 'INCOME',
        income: incomeFromPrototype({
          proto,
          accounts,
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
  accounts: Account[],
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
        accounts,
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
        accounts,
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
