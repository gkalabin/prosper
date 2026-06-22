import {
  expenseFormEmpty,
  expenseFromDraft,
  expenseFromTransaction,
  incomeToExpense,
  transferToExpense,
} from '@/components/txform/expense/defaults';
import {
  expenseToIncome,
  incomeFromDraft,
  incomeFromTransaction,
  transferToIncome,
} from '@/components/txform/income/defaults';
import {
  expenseToTransfer,
  incomeToTransfer,
  transferFromDraft,
  transferFromTransaction,
} from '@/components/txform/transfer/defaults';
import {FormType, TransactionFormSchema} from '@/components/txform/types';
import {assertDefined} from '@/lib/assert';
import {useCoreDataContext} from '@/lib/context/CoreDataContext';
import {useTransactionDataContext} from '@/lib/context/TransactionDataContext';
import {BankAccount} from '@/lib/model/BankAccount';
import {Category} from '@/lib/model/Category';
import {Tag} from '@/lib/model/Tag';
import {OpeningBalance} from '@/lib/model/transaction/OpeningBalance';
import {
  isIncome,
  isTransfer,
  Transaction,
} from '@/lib/model/transaction/Transaction';
import {TransactionLink} from '@/lib/model/TransactionLink';
import {Trip} from '@/lib/model/Trip';
import {
  FormType as PbFormType,
  TransactionDraft,
} from '@/lib/grpc/gen/prosper/v1/ledger';
import {draftFormType} from '@/lib/txsuggestions/draft';

// Excluding OpeningBalance from Transaction type as these cannot be edited in the regular form and instead should be edited on the bank account page.
export function useFormDefaults(
  tx: Exclude<Transaction, OpeningBalance> | null
): TransactionFormSchema {
  const {categories, bankAccounts, tags, trips} = useCoreDataContext();
  const {transactionLinks} = useTransactionDataContext();
  // Initial values when creating new transaction from scratch.
  if (!tx) {
    return {
      formType: 'EXPENSE',
      expense: expenseFormEmpty({categories, bankAccounts}),
    };
  }
  return valuesForTransaction(tx, transactionLinks, tags, trips);
}

function valuesForTransaction(
  tx: Exclude<Transaction, OpeningBalance>,
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

// valuesForDraft maps a resolved transaction draft into form values:
// each set field prefills its input, unset fields keep the form's
// plain defaults.
export function valuesForDraft({
  draft,
  categories,
  bankAccounts,
}: {
  draft: TransactionDraft;
  categories: Category[];
  bankAccounts: BankAccount[];
}): TransactionFormSchema {
  const formType = draftFormType(draft);
  switch (formType) {
    case PbFormType.INCOME:
      return {
        formType: 'INCOME',
        income: incomeFromDraft({draft, categories, bankAccounts}),
      };
    case PbFormType.TRANSFER:
      return {
        formType: 'TRANSFER',
        transfer: transferFromDraft({draft, categories, bankAccounts}),
      };
    default:
      return {
        formType: 'EXPENSE',
        expense: expenseFromDraft({draft, categories, bankAccounts}),
      };
  }
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
      income: expenseToIncome({
        prev: prevForm.expense,
        bankAccounts,
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
      }),
    };
  }
  if (prev == 'INCOME' && next == 'EXPENSE') {
    assertDefined(prevForm.income);
    return {
      formType: next,
      expense: incomeToExpense({
        prev: prevForm.income,
      }),
    };
  }
  if (prev == 'INCOME' && next == 'TRANSFER') {
    assertDefined(prevForm.income);
    return {
      formType: next,
      transfer: incomeToTransfer({
        prev: prevForm.income,
      }),
    };
  }
  if (prev == 'TRANSFER' && next == 'EXPENSE') {
    assertDefined(prevForm.transfer);
    return {
      formType: next,
      expense: transferToExpense({
        prev: prevForm.transfer,
      }),
    };
  }
  if (prev == 'TRANSFER' && next == 'INCOME') {
    assertDefined(prevForm.transfer);
    return {
      formType: next,
      income: transferToIncome({
        prev: prevForm.transfer,
      }),
    };
  }
  throw new Error(`Unsupported form type transition: ${prev} -> ${next}`);
}
