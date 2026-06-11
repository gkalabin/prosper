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
    case 'OpeningBalance':
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
  let balanceNanos = 0n;
  allTransactions.forEach(t => {
    if (!transactionBelongsToAccount(t, account)) {
      return;
    }
    switch (t.kind) {
      case 'OpeningBalance':
      case 'Income':
        balanceNanos = balanceNanos + t.amountNanos;
        return;
      case 'PersonalExpense':
        balanceNanos = balanceNanos - t.amountNanos;
        return;
      case 'Transfer':
        if (t.fromAccountId == account.id) {
          balanceNanos = balanceNanos - t.sentAmountNanos;
        } else if (t.toAccountId == account.id) {
          balanceNanos = balanceNanos + t.receivedAmountNanos;
        }
        return;
    }
  });
  return new AmountWithUnit({
    amountNanos: balanceNanos,
    unit: accountUnit(account, stocks),
  });
}

// TODO: move to the model folder.
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
          amountNanos: b.nanos(),
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
