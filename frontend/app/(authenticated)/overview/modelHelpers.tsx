import {BankAccount} from '@/lib/model/BankAccount';
import {Transaction} from '@/lib/model/transaction/Transaction';

export function transactionBelongsToAccount(
  t: Transaction,
  account: BankAccount
): boolean {
  switch (t.kind) {
    case 'ThirdPartyExpense':
      return false;
    case 'PersonalExpense':
    case 'Income':
    case 'OpeningBalance':
      return t.accountId == account.id;
    case 'Transfer':
      return t.fromAccountId == account.id || t.toAccountId == account.id;
    default:
      const _exhaustiveCheck: never = t;
      throw new Error(`Unknown transaction kind ${_exhaustiveCheck}`);
  }
}
