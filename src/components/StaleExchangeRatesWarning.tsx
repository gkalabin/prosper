'use client';
import {Button} from '@/components/ui/button';
import {useCoreDataContext} from '@/lib/context/CoreDataContext';
import {ExchangeRate, StockQuote} from '@/lib/grpc/gen/prosper/v1/rates';
import {timestampToEpoch} from '@/lib/grpc/timestamp';
import {Stock} from '@/lib/model/Stock';
import {differenceInDays} from 'date-fns';
import {useState} from 'react';

const STALE_THRESHOLD_DAYS = 7;

type StaleCurrencyPair = {
  currencyCodeFrom: string;
  currencyCodeTo: string;
  observedAtEpoch: number;
};

type StaleStockQuoteEntry = {
  ticker: string;
  observedAtEpoch: number;
};

export function StaleExchangeRatesWarning({
  dbExchangeRates,
  dbStockQuotes,
}: {
  dbExchangeRates: ExchangeRate[];
  dbStockQuotes: StockQuote[];
}) {
  const {stocks} = useCoreDataContext();
  const [showDetails, setShowDetails] = useState(false);
  const now = Date.now();
  const stalePairs = findStaleCurrencyPairs(dbExchangeRates, now);
  const staleTickers = findStaleStockQuotes(dbStockQuotes, stocks, now);
  if (stalePairs.length === 0 && staleTickers.length === 0) {
    return null;
  }
  return (
    <div
      className="my-4 rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-200"
      role="alert"
    >
      <p className="font-medium">
        Exchange rates are outdated. Currency conversions may be inaccurate.{' '}
        <Button
          variant="link"
          size="inherit"
          onClick={() => setShowDetails(prev => !prev)}
        >
          {showDetails ? 'Hide details' : 'Show details'}
        </Button>
      </p>
      {showDetails && (
        <ul className="mt-2 list-inside list-disc space-y-0.5">
          {stalePairs.map(
            ({currencyCodeFrom, currencyCodeTo, observedAtEpoch}) => (
              <li key={`${currencyCodeFrom}-${currencyCodeTo}`}>
                {currencyCodeFrom} → {currencyCodeTo} (observed{' '}
                {formatAge(observedAtEpoch, now)})
              </li>
            )
          )}
          {staleTickers.map(({ticker, observedAtEpoch}) => (
            <li key={ticker}>
              {ticker} (observed {formatAge(observedAtEpoch, now)})
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function findStaleCurrencyPairs(
  rates: ExchangeRate[],
  now: number
): StaleCurrencyPair[] {
  const latestByPair = new Map<
    string,
    {from: string; to: string; observedAtEpoch: number}
  >();
  for (const r of rates) {
    const key = `${r.currencyCodeFrom}-${r.currencyCodeTo}`;
    const observedAtEpoch = timestampToEpoch(r.rateTimestamp);
    const existing = latestByPair.get(key);
    if (!existing || observedAtEpoch > existing.observedAtEpoch) {
      latestByPair.set(key, {
        from: r.currencyCodeFrom,
        to: r.currencyCodeTo,
        observedAtEpoch,
      });
    }
  }
  const stale: StaleCurrencyPair[] = [];
  for (const entry of latestByPair.values()) {
    if (differenceInDays(now, entry.observedAtEpoch) <= STALE_THRESHOLD_DAYS) {
      continue;
    }
    stale.push({
      currencyCodeFrom: entry.from,
      currencyCodeTo: entry.to,
      observedAtEpoch: entry.observedAtEpoch,
    });
  }
  return stale;
}

function findStaleStockQuotes(
  quotes: StockQuote[],
  stocks: Stock[],
  now: number
): StaleStockQuoteEntry[] {
  const tickerByStockId = new Map(stocks.map(s => [s.id, s.ticker]));
  const latestByTicker = new Map<string, number>();
  for (const q of quotes) {
    const observedAtEpoch = timestampToEpoch(q.quoteTimestamp);
    const ticker = tickerByStockId.get(q.stockId);
    if (!ticker) {
      console.warn(
        `Dropping stock quote at ${new Date(observedAtEpoch).toISOString()}: ` +
          `no stock found with id ${q.stockId}`
      );
      continue;
    }
    const existing = latestByTicker.get(ticker);
    if (!existing || observedAtEpoch > existing) {
      latestByTicker.set(ticker, observedAtEpoch);
    }
  }
  const stale: StaleStockQuoteEntry[] = [];
  for (const [ticker, observedAtEpoch] of latestByTicker.entries()) {
    if (differenceInDays(now, observedAtEpoch) <= STALE_THRESHOLD_DAYS) {
      continue;
    }
    stale.push({ticker, observedAtEpoch});
  }
  return stale;
}

function formatAge(observedAtEpoch: number, now: number): string {
  return `${differenceInDays(now, observedAtEpoch)} days ago`;
}
