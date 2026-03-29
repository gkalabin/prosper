'use client';
import {Button} from '@/components/ui/button';
import {useCoreDataContext} from '@/lib/context/CoreDataContext';
import {ExchangeRate, StockQuote} from '@prisma/client';
import {differenceInDays} from 'date-fns';
import {useState} from 'react';

const STALE_THRESHOLD_DAYS = 7;

type StaleCurrencyPair = {
  currencyCodeFrom: string;
  currencyCodeTo: string;
  updatedAt: Date;
};

type StaleStockQuoteEntry = {
  ticker: string;
  updatedAt: Date;
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
  const now = new Date();
  const stockById = new Map(stocks.map(s => [s.id, s]));
  const stalePairs = findStaleCurrencyPairs(dbExchangeRates, now);
  const staleTickers = findStaleStockQuotes(dbStockQuotes, stockById, now);
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
          {stalePairs.map(({currencyCodeFrom, currencyCodeTo, updatedAt}) => (
            <li key={`${currencyCodeFrom}-${currencyCodeTo}`}>
              {currencyCodeFrom} → {currencyCodeTo} (updated{' '}
              {formatAge(updatedAt, now)})
            </li>
          ))}
          {staleTickers.map(({ticker, updatedAt}) => (
            <li key={ticker}>
              {ticker} (updated {formatAge(updatedAt, now)})
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function findStaleCurrencyPairs(
  rates: ExchangeRate[],
  now: Date
): StaleCurrencyPair[] {
  const latestByPair = new Map<
    string,
    {from: string; to: string; updatedAt: Date}
  >();
  for (const r of rates) {
    const key = `${r.currencyCodeFrom}-${r.currencyCodeTo}`;
    const existing = latestByPair.get(key);
    const updatedAt = r.updatedAt;
    if (!existing || updatedAt > existing.updatedAt) {
      latestByPair.set(key, {
        from: r.currencyCodeFrom,
        to: r.currencyCodeTo,
        updatedAt,
      });
    }
  }
  const stale: StaleCurrencyPair[] = [];
  for (const entry of latestByPair.values()) {
    if (differenceInDays(now, entry.updatedAt) <= STALE_THRESHOLD_DAYS) {
      continue;
    }
    stale.push({
      currencyCodeFrom: entry.from,
      currencyCodeTo: entry.to,
      updatedAt: entry.updatedAt,
    });
  }
  return stale;
}

function findStaleStockQuotes(
  quotes: StockQuote[],
  stockById: Map<number, {ticker: string}>,
  now: Date
): StaleStockQuoteEntry[] {
  const latestByStock = new Map<number, Date>();
  for (const q of quotes) {
    const existing = latestByStock.get(q.stockId);
    const updatedAt = q.updatedAt;
    if (!existing || updatedAt > existing) {
      latestByStock.set(q.stockId, updatedAt);
    }
  }
  const stale: StaleStockQuoteEntry[] = [];
  for (const [stockId, updatedAt] of latestByStock.entries()) {
    if (differenceInDays(now, updatedAt) <= STALE_THRESHOLD_DAYS) {
      continue;
    }
    const ticker = stockById.get(stockId)?.ticker ?? `stock #${stockId}`;
    stale.push({ticker, updatedAt});
  }
  return stale;
}

function formatAge(updatedAt: Date, now: Date): string {
  return `${differenceInDays(now, updatedAt)} days ago`;
}
