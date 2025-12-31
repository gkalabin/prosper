import {NO_HISTORY_LOOK_BACK_DAYS} from '@/lib/asset-rates/backfill';
import {getUsedCurrencyCodes} from '@/lib/asset-rates/used-currencies';
import {Currency, NANOS_MULTIPLIER, allCurrencies} from '@/lib/model/Currency';
import prisma from '@/lib/prisma';
import {addDays, differenceInHours, format, isSameDay} from 'date-fns';
import yahooFinance from 'yahoo-finance2';
import {type HistoricalRowHistory} from 'yahoo-finance2/dist/esm/src/modules/historical';

export async function fetchExchangeRates({
  startDate,
  sell,
  buy,
}: {
  startDate: Date;
  sell: Currency;
  buy: Currency;
}) {
  const symbol = `${sell.code}${buy.code}=X`;
  const r = await yahooFinance.historical(
    symbol,
    {
      period1: format(startDate, 'yyyy-MM-dd'),
      interval: '1d',
    },
    {devel: false}
  );
  return r;
}

/**
 * @param refreshIntervalHours How often to update the latest rate. If the rate is newer than this, it's not updated.
 */
export async function addLatestExchangeRates(refreshIntervalHours: number) {
  const timingLabel = 'Exchange rate backfill ' + new Date().getTime();
  console.time(timingLabel);

  const usedCurrencyCodes = await getUsedCurrencyCodes();
  console.log('Used currencies', usedCurrencyCodes);
  const backfillPromises: Promise<void>[] = [];
  for (const sell of allCurrencies()) {
    if (!usedCurrencyCodes.has(sell.code)) {
      continue;
    }
    for (const buy of allCurrencies()) {
      if (!usedCurrencyCodes.has(buy.code)) {
        continue;
      }
      backfillPromises.push(backfill({sell, buy, refreshIntervalHours}));
    }
  }
  await Promise.allSettled(backfillPromises);
  console.timeEnd(timingLabel);
}

async function backfill({
  sell,
  buy,
  refreshIntervalHours,
}: {
  sell: Currency;
  buy: Currency;
  refreshIntervalHours: number;
}) {
  if (sell.code == buy.code) {
    return;
  }
  const now = new Date();
  const apiModelToDb = (x: HistoricalRowHistory) => {
    return {
      currencyCodeFrom: sell.code,
      currencyCodeTo: buy.code,
      rateTimestamp: x.date.toISOString(),
      rateNanos: Math.round(x.close * NANOS_MULTIPLIER),
    };
  };
  const latest = await prisma.exchangeRate.findFirst({
    where: {
      currencyCodeFrom: sell.code,
      currencyCodeTo: buy.code,
    },
    orderBy: [
      {
        rateTimestamp: 'desc',
      },
      {
        updatedAt: 'desc',
      },
    ],
  });

  if (!latest) {
    console.info(`${sell.code}->${buy.code}: no history`);
    const startDate = addDays(now, -NO_HISTORY_LOOK_BACK_DAYS);
    const fetched = await fetchExchangeRates({sell, buy, startDate});
    if (fetched?.length == 0) {
      console.warn(
        '%s->%s: historical data not found starting on %s',
        sell.code,
        buy.code,
        startDate.toDateString()
      );
      return;
    }
    console.log(
      '%s->%s: inserting a new rate for %s',
      sell.code,
      buy.code,
      fetched[0].date.toDateString()
    );
    await prisma.exchangeRate.createMany({
      data: fetched.map(apiModelToDb),
    });
    return;
  }

  if (isSameDay(now, latest.rateTimestamp)) {
    // Latest rate is of today, decide to update it if it's fresh or not.
    // rateTimestamp is just a date and always a midnight, so use updatedAt for the latest update time
    const ageHours = differenceInHours(now, latest.updatedAt);
    if (ageHours < refreshIntervalHours) {
      console.warn(
        '%s->%s: rate for %s is still fresh, updated %d hours ago on %s',
        sell.code,
        buy.code,
        latest.rateTimestamp.toDateString(),
        ageHours,
        latest.updatedAt
      );
      return;
    }
    console.log(
      "%s->%s: updating today's (%s) rate as it's %d hours old",
      sell.code,
      buy.code,
      latest.rateTimestamp.toDateString(),
      ageHours
    );
    const fetched = await fetchExchangeRates({sell, buy, startDate: now});
    if (fetched?.length != 1) {
      console.warn(
        '%s->%s: found %d rates on %s, want 1, ignoring',
        sell.code,
        buy.code,
        fetched?.length,
        now.toDateString()
      );
      return;
    }
    await prisma.exchangeRate.create({
      data: apiModelToDb(fetched[0]),
    });
    return;
  }

  // Not the same day, adding the whole range.
  let startDate = latest.rateTimestamp;
  if (!isSameDay(latest.rateTimestamp, latest.updatedAt)) {
    // If the latest timestamp was updated on the same day we fetch it one last time to make sure we have the most up to date value.
    // When the timestamp was updated on a later date, it's up to date, so not reupdate it.
    console.log(
      '%s->%s: latest rate from %s was updated on %s, skipping additional update',
      sell.code,
      buy.code,
      latest.rateTimestamp.toDateString(),
      latest.updatedAt.toDateString()
    );
    startDate = addDays(startDate, 1);
  }

  console.log(
    '%s->%s: fetching from %s',
    sell.code,
    buy.code,
    startDate.toDateString(),
    now.toDateString()
  );

  const fetched = await fetchExchangeRates({sell, buy, startDate});
  const toUpdate = fetched.find(x => isSameDay(x.date, latest.rateTimestamp));
  if (toUpdate) {
    console.log(
      '%s->%s: updating rate for %s',
      sell.code,
      buy.code,
      latest.rateTimestamp.toDateString()
    );
    await prisma.exchangeRate.update({
      data: apiModelToDb(toUpdate),
      where: {
        id: latest.id,
      },
    });
  }
  const toInsert = fetched.filter(
    x => !isSameDay(x.date, latest.rateTimestamp)
  );
  if (toInsert) {
    console.log(
      '%s->%s: inserting %d quotes',
      sell.code,
      buy.code,
      toInsert.length
    );
    await prisma.exchangeRate.createMany({
      data: toInsert.map(apiModelToDb),
    });
  }
}
