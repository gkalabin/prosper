import {StockAndCurrencyExchange} from '@/lib/ClientSideModel';
import {
  ExchangedTransaction,
  ExchangedTransactions,
} from '@/lib/ExchangedTransactions';
import {Currency} from '@/lib/model/Currency';
import {exchangeAmountWithUnit} from '@/lib/model/queries/ExchangeAmount';
import {
  findAllPartiesAmount,
  findOwnShareAmount,
} from '@/lib/model/queries/TransactionAmount';
import {Stock} from '@/lib/model/Stock';
import {Expense} from '../transactionNEW/Expense';
import {Income} from '../transactionNEW/Income';

// TODO: exchangeTransactionAmounts vs exchangeTransactionsAmounts vs exchangeTransactionsAmount
export function exchangeTransactionAmounts({
  targetCurrency,
  transactions,
  stocks,
  exchange,
}: {
  targetCurrency: Currency;
  transactions: (Income | Expense)[];
  stocks: Stock[];
  exchange: StockAndCurrencyExchange;
}): {
  exchanged: ExchangedTransactions;
  failed: (Income | Expense)[];
} {
  const failed: (Income | Expense)[] = [];
  const exchanged: ExchangedTransaction[] = [];
  for (const t of transactions) {
    const own = findOwnShareAmount({t, stocks});
    const ownExchanged = exchangeAmountWithUnit({
      amount: own,
      target: targetCurrency,
      timestampEpoch: t.timestampEpoch,
      exchange,
    });
    if (!ownExchanged) {
      failed.push(t);
      continue;
    }
    const all = findAllPartiesAmount({t, stocks});
    const allExchanged = exchangeAmountWithUnit({
      amount: all,
      target: targetCurrency,
      timestampEpoch: t.timestampEpoch,
      exchange,
    });
    if (!allExchanged) {
      failed.push(t);
      continue;
    }
    exchanged.push({
      t,
      ownShare: ownExchanged,
      allParties: allExchanged,
    });
  }
  return {
    exchanged: new ExchangedTransactions(exchanged, targetCurrency),
    failed,
  };
}
