import {IncomeFormSchema} from '@/components/txform/v2/income/validation';
import {
  ExpenseFormSchema,
  TransferFormSchema,
} from '@/components/txform/v2/types';

export function expenseToTransfer(prev: ExpenseFormSchema): TransferFormSchema {
  return {
    timestamp: prev.timestamp,
    amountSent: prev.amount,
    amountReceived: prev.amount,
    categoryId: prev.categoryId,
    fromAccountId: prev.accountId,
    toAccountId: prev.accountId,
    description: prev.vendor,
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
  };
}
