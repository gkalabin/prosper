import {addLatestExchangeRates} from '@/lib/asset-rates/currency-rates';
import {addLatestStockQuotes} from '@/lib/asset-rates/stock-quotes';
import {differenceInHours} from 'date-fns';
import {after} from 'next/server';
import {invalidateMarketDataCache} from '../db/cache';
export const REFRESH_INTERVAL_HOURS = 6;
export const NO_HISTORY_LOOK_BACK_DAYS = 30;

function isFresh(entries: Array<{updatedAt: Date}>) {
  const now = new Date();
  // Normally, a cron job updates the rates, but in case it is broken, fall back to updating the rates here.
  // Use extendeed refresh interval to make the cron job take precedence.
  const maxFreshnessHours = REFRESH_INTERVAL_HOURS * 2;
  for (const {updatedAt} of entries) {
    if (differenceInHours(now, updatedAt) < maxFreshnessHours) {
      return true;
    }
  }
  return false;
}

export async function updateRatesFallback({
  dbExchangeRates,
  dbStockQuotes,
}: {
  dbExchangeRates: Array<{updatedAt: Date}>;
  dbStockQuotes: Array<{updatedAt: Date}>;
}) {
  if (isFresh(dbExchangeRates) || isFresh(dbStockQuotes)) {
    return;
  }
  console.warn(
    'Update the exchange rates in fallback, configure the cron job to update the rates in the background.'
  );
  const updated = await Promise.all([
    addLatestExchangeRates(REFRESH_INTERVAL_HOURS * 2),
    addLatestStockQuotes(REFRESH_INTERVAL_HOURS * 2),
  ]);
  if (updated.some(x => x)) {
    after(async () => {
      // FIXME: this results in an error in console, but doesn't fail the page render.
      console.log('Invalidating market data cache...');
      await invalidateMarketDataCache(-1);
      console.log('Invalidating market data cache done');
    });
  }
}
