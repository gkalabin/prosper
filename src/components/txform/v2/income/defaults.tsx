import {IncomeFormSchema} from '@/components/txform/v2/income/validation';
import {
  ExpenseFormSchema,
  TransferFormSchema,
} from '@/components/txform/v2/types';
import {assert} from '@/lib/assert';
import {BankAccount} from '@/lib/model/BankAccount';

export function expenseToIncome(
  prev: ExpenseFormSchema,
  bankAccounts: BankAccount[]
): IncomeFormSchema {
  assert(bankAccounts.length > 0);
  const values: IncomeFormSchema = {
    timestamp: prev.timestamp,
    amount: prev.amount,
    ownShareAmount: prev.ownShareAmount,
    payer: prev.vendor,
    categoryId: prev.categoryId,
    accountId: prev.accountId ?? bankAccounts[0].id,
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
