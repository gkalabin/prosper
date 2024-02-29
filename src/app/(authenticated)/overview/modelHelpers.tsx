import {AmountWithCurrency} from '@/lib/AmountWithCurrency';
import {AmountWithUnit} from '@/lib/AmountWithUnit';
import {StockAndCurrencyExchange} from '@/lib/ClientSideModel';
import {BankAccount, accountUnit} from '@/lib/model/BankAccount';
import {Currency} from '@/lib/model/Currency';
import {Stock} from '@/lib/model/Stock';
import {isCurrency, isStock} from '@/lib/model/Unit';
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
      return t.accountId == account.id;
    case 'Transfer':
      return t.fromAccountId == account.id || t.toAccountId == account.id;
    default:
      const _exhaustiveCheck: never = t;
      throw new Error(`Unknown transaction kind ${_exhaustiveCheck}`);
  }
}

export function accountBalance(
  account: BankAccount,
  allTransactions: Transaction[],
  stocks: Stock[]
): AmountWithUnit {
  let balance = account.initialBalanceCents;
  allTransactions.forEach(t => {
    if (!transactionBelongsToAccount(t, account)) {
      return;
    }
    switch (t.kind) {
      case 'PersonalExpense':
        balance = balance - t.amountCents;
        return;
      case 'Income':
        balance = balance + t.amountCents;
        return;
      case 'Transfer':
        if (t.fromAccountId == account.id) {
          balance = balance - t.sentAmountCents;
        } else if (t.toAccountId == account.id) {
          balance = balance + t.receivedAmountCents;
        }
        return;
    }
  });
  return new AmountWithUnit({
    amountCents: balance,
    unit: accountUnit(account, stocks),
  });
}

export function accountsSum(
  accounts: BankAccount[],
  targetCurrency: Currency,
  exchange: StockAndCurrencyExchange,
  allTransactions: Transaction[],
  stocks: Stock[]
): AmountWithCurrency | undefined {
  let sum = AmountWithCurrency.zero(targetCurrency);
  const now = new Date();
  accounts.forEach(x => {
    const b = accountBalance(x, allTransactions, stocks);
    const unit = b.getUnit();
    if (isCurrency(unit)) {
      const delta = exchange.exchangeCurrency(
        new AmountWithCurrency({
          amountCents: b.cents(),
          currency: unit,
        }),
        targetCurrency,
        now
      );
      if (!delta) {
        return undefined;
      }
      sum = sum.add(delta);
      return;
    }
    if (isStock(unit)) {
      const delta = exchange.exchangeStock(
        b.getAmount(),
        unit,
        targetCurrency,
        now
      );
      if (!delta) {
        return undefined;
      }
      sum = sum.add(delta);
      return;
    }
    throw new Error(`Unknown unit: ${unit} for ${x.id}`);
  });
  return sum;
}
