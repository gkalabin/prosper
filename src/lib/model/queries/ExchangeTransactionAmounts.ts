import {AmountWithCurrency} from '@/lib/AmountWithCurrency';
import {StockAndCurrencyExchange} from '@/lib/ClientSideModel';
import {
  ExchangedTransaction,
  ExchangedTransactions,
} from '@/lib/ExchangedTransactions';
import {Account} from '@/lib/model/Account';
import {Currency} from '@/lib/model/Currency';
import {exchangeAmountWithUnit} from '@/lib/model/queries/ExchangeAmount';
import {
  findAllPartiesAmount,
  findOwnShareAmount,
} from '@/lib/model/queries/TransactionAmount';
import {Stock} from '@/lib/model/Stock';
import {Transaction} from '@/lib/model/transactionNEW/Transaction';

// TODO: exchangeTransactionAmounts vs exchangeTransactionsAmounts vs exchangeTransactionsAmount
export function exchangeTransactionAmounts({
  targetCurrency,
  transactions,
  accounts,
  stocks,
  exchange,
}: {
  targetCurrency: Currency;
  transactions: Transaction[];
  accounts: Account[];
  stocks: Stock[];
  exchange: StockAndCurrencyExchange;
}): {
  exchanged: ExchangedTransactions;
  failed: Transaction[];
} {
  const failed: Transaction[] = [];
  const exchanged: ExchangedTransaction[] = [];
  for (const t of transactions) {
    if (t.kind == 'TRANSFER' || t.kind == 'NOOP') {
      exchanged.push({
        t,
        ownShare: AmountWithCurrency.zero(targetCurrency),
        allParties: AmountWithCurrency.zero(targetCurrency),
      });
      continue;
    }
    const own = findOwnShareAmount({t, accounts, stocks});
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
    const all = findAllPartiesAmount({t, accounts, stocks});
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
