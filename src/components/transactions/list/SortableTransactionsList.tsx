import {CurrencyExchangeFailed} from '@/app/(authenticated)/stats/CurrencyExchangeFailed';
import {TransactionsList} from '@/components/transactions/list/TransactionsList';
import {Button} from '@/components/ui/button';
import {AmountWithCurrency} from '@/lib/AmountWithCurrency';
import {AmountWithUnit} from '@/lib/AmountWithUnit';
import {StockAndCurrencyExchange} from '@/lib/ClientSideModel';
import {assertDefined} from '@/lib/assert';
import {useCoreDataContext} from '@/lib/context/CoreDataContext';
import {useDisplayCurrency} from '@/lib/context/DisplaySettingsContext';
import {useMarketDataContext} from '@/lib/context/MarketDataContext';
import {Account, accountUnit, mustFindAccount} from '@/lib/model/Account';
import {Currency} from '@/lib/model/Currency';
import {Stock} from '@/lib/model/Stock';
import {isCurrency, isStock} from '@/lib/model/Unit';
import {findAllPartiesAmount} from '@/lib/model/queries/TransactionAmount';
import {Transaction} from '@/lib/model/transactionNEW/Transaction';
import {useState} from 'react';

export enum SortingMode {
  DATE_ASC,
  DATE_DESC,
  AMOUNT_ASC,
  AMOUNT_DESC,
}

function amountUnit(
  transaction: Transaction,
  accounts: Account[],
  stocks: Stock[]
): AmountWithUnit | undefined {
  const kind = transaction.kind;
  if (kind === 'TRANSFER') {
    const a = mustFindAccount(transaction.fromAccountId, accounts);
    return new AmountWithUnit({
      amountCents: transaction.sentAmount.cents,
      unit: accountUnit(a, stocks),
    });
  }
  if (kind === 'EXPENSE' || kind === 'INCOME') {
    return findAllPartiesAmount({t: transaction, stocks});
  }
  if (kind === 'INITIAL_BALANCE') {
    const a = mustFindAccount(transaction.accountId, accounts);
    return new AmountWithUnit({
      amountCents: transaction.balance.cents,
      unit: accountUnit(a, stocks),
    });
  }
  if (kind === 'NOOP') {
    const a = mustFindAccount(transaction.accountIds[0], accounts);
    return new AmountWithUnit({
      amountCents: 0,
      unit: accountUnit(a, stocks),
    });
  }
  const _exhaustivenessCheck: never = kind;
  throw new Error(`Unknown transaction type: ${_exhaustivenessCheck}`);
}

function amount(
  transaction: Transaction,
  displayCurrency: Currency,
  accounts: Account[],
  stocks: Stock[],
  exchange: StockAndCurrencyExchange
): AmountWithCurrency | undefined {
  const a = amountUnit(transaction, accounts, stocks);
  if (!a) {
    return undefined;
  }
  const unit = a.getUnit();
  if (isCurrency(unit)) {
    const amount = new AmountWithCurrency({
      amountCents: a.cents(),
      currency: unit,
    });
    return exchange.exchangeCurrency(
      amount,
      displayCurrency,
      transaction.timestampEpoch
    );
  }
  if (isStock(unit)) {
    return exchange.exchangeStock(
      a.getAmount(),
      unit,
      displayCurrency,
      transaction.timestampEpoch
    );
  }
  throw new Error(`Unknown unit: ${unit}`);
}

export const SortableTransactionsList = (props: {
  transactions: Transaction[];
  displayLimit?: number;
  initialSorting?: SortingMode;
}) => {
  const [sorting, setSorting] = useState(
    props.initialSorting ?? SortingMode.DATE_ASC
  );
  const {accounts, stocks} = useCoreDataContext();
  const {exchange} = useMarketDataContext();
  const displayCurrency = useDisplayCurrency();
  if (props.transactions.length == 0) {
    return <div>No transactions.</div>;
  }

  let sortedTransactions: Transaction[] = [];
  const failedToExchange: Transaction[] = [];
  if (sorting == SortingMode.AMOUNT_ASC || sorting == SortingMode.AMOUNT_DESC) {
    const transactionsWithAmount: Array<{
      t: Transaction;
      a: AmountWithCurrency | undefined;
    }> = [...props.transactions].map(t => ({
      t,
      a: amount(t, displayCurrency, accounts, stocks, exchange),
    }));
    failedToExchange.push(
      ...transactionsWithAmount.filter(x => !x.a).map(x => x.t)
    );
    sortedTransactions = transactionsWithAmount
      .filter(x => !!x.a)
      .sort((x, y) => {
        assertDefined(x.a);
        assertDefined(y.a);
        switch (sorting) {
          case SortingMode.AMOUNT_ASC:
            return x.a.cents() - y.a.cents();
          case SortingMode.AMOUNT_DESC:
            return y.a.cents() - x.a.cents();
        }
      })
      .map(x => x.t);
  } else {
    sortedTransactions = [...props.transactions].sort((a, b) => {
      switch (sorting) {
        case SortingMode.DATE_ASC:
          return a.timestampEpoch - b.timestampEpoch;
        case SortingMode.DATE_DESC:
          return b.timestampEpoch - a.timestampEpoch;
        default:
          throw new Error('Unknown sorting mode: ' + sorting);
      }
    });
  }

  return (
    <>
      <div className="mb-2 text-xs">
        Sort by{' '}
        <Button
          variant="link"
          size="inherit"
          onClick={() =>
            setSorting(
              sorting == SortingMode.DATE_ASC
                ? SortingMode.DATE_DESC
                : SortingMode.DATE_ASC
            )
          }
        >
          date
        </Button>
        ,{' '}
        <Button
          variant="link"
          size="inherit"
          onClick={() =>
            setSorting(
              sorting == SortingMode.AMOUNT_DESC
                ? SortingMode.AMOUNT_ASC
                : SortingMode.AMOUNT_DESC
            )
          }
        >
          amount
        </Button>
      </div>

      <div>
        <CurrencyExchangeFailed failedTransactions={failedToExchange} />
        <TransactionsList transactions={sortedTransactions} displayLimit={10} />
      </div>
    </>
  );
};
