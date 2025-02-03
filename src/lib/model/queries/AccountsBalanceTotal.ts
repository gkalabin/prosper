import {AmountWithCurrency} from '@/lib/AmountWithCurrency';
import {StockAndCurrencyExchange} from '@/lib/ClientSideModel';
import {Account} from '@/lib/model/Account';
import {Currency} from '@/lib/model/Currency';
import {Stock} from '@/lib/model/Stock';
import {isCurrency, isStock} from '@/lib/model/Unit';
import {findAccountBalance} from '@/lib/model/queries/AccountBalance';
import {Transaction} from '@/lib/model/transactionNEW/Transaction';

export function findAccountsBalanceTotal({
  accounts,
  targetCurrency,
  exchange,
  transactions,
  stocks,
}: {
  accounts: Account[];
  targetCurrency: Currency;
  exchange: StockAndCurrencyExchange;
  transactions: Transaction[];
  stocks: Stock[];
}): AmountWithCurrency | undefined {
  let sum = AmountWithCurrency.zero(targetCurrency);
  const now = new Date();
  accounts.forEach(x => {
    const b = findAccountBalance({account: x, transactions, stocks});
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
