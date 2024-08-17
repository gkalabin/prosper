import {IncomeFormSchema} from '@/components/txform/v2/income/validation';
import {
  ExpenseFormSchema,
  TransferFormSchema,
} from '@/components/txform/v2/types';
import {assert} from '@/lib/assert';
import {BankAccount} from '@/lib/model/BankAccount';

export function expenseToTransfer(
  prev: ExpenseFormSchema,
  bankAccounts: BankAccount[]
): TransferFormSchema {
  assert(bankAccounts.length > 0);
  return {
    timestamp: prev.timestamp,
    amountSent: prev.amount,
    amountReceived: prev.amount,
    categoryId: prev.categoryId,
    fromAccountId: prev.accountId ?? bankAccounts[0].id,
    toAccountId: prev.accountId ?? bankAccounts[0].id,
    description: prev.vendor,
    tagNames: [...prev.tagNames],
  };
}

export function incomeToTransfer(prev: IncomeFormSchema): TransferFormSchema {
  return {
    timestamp: prev.timestamp,
    amountSent: prev.amount,
    amountReceived: prev.amount,
    categoryId: prev.categoryId,
    fromAccountId: prev.accountId,
    toAccountId: prev.accountId,
    description: prev.payer,
    tagNames: [...prev.tagNames],
  };
}
