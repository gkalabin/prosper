import {IncomeFormSchema} from '@/components/txform/v2/income/validation';
import {
  ExpenseFormSchema,
  TransferFormSchema,
} from '@/components/txform/v2/types';

export function expenseToIncome(prev: ExpenseFormSchema): IncomeFormSchema {
  const values: IncomeFormSchema = {
    timestamp: prev.timestamp,
    amount: prev.amount,
    ownShareAmount: prev.ownShareAmount,
    payer: prev.vendor,
    categoryId: prev.categoryId,
    accountId: prev.accountId,
    tagNames: [],
    companion: prev.companion,
    description: prev.description,
    parentTransactionId: null,
  };
  return values;
}

export function transferToIncome(prev: TransferFormSchema): IncomeFormSchema {
  const values: IncomeFormSchema = {
    timestamp: prev.timestamp,
    amount: prev.amountSent,
    ownShareAmount: prev.amountSent,
    payer: prev.description ?? '',
    categoryId: prev.categoryId,
    accountId: prev.fromAccountId,
    tagNames: [],
    companion: null,
    description: null,
    parentTransactionId: null,
  };
  return values;
}
