import {NO_HISTORY_LOOK_BACK_DAYS} from '@/lib/asset-rates/backfill';
import prisma from '@/lib/prisma';
import {Stock as DBStock, Prisma} from '@prisma/client';
import {addDays, differenceInHours, format, isSameDay} from 'date-fns';
import yahooFinance from 'yahoo-finance2';

type StockQuote = {
  stockId: number;
  pricePerShareCents: number;
  quoteTimestamp: Date;
};

async function fetchQuotes({
  startDate,
  stock,
}: {
  startDate: Date;
  stock: DBStock;
}): Promise<StockQuote[]> {
  const rows = await yahooFinance.historical(
    stock.ticker,
    {
      period1: format(startDate, 'yyyy-MM-dd'),
      interval: '1d',
    },
    {
      devel: false,
    }
  );
  const quotes: StockQuote[] = [];
  for (const row of rows) {
    const q = {
      stockId: stock.id,
      pricePerShareCents: Math.round(row.close * 100),
      quoteTimestamp: new Date(row.date),
    };
    if (stock.ticker === '0P00018XAR.L' && q.pricePerShareCents > 1000000) {
      // For an unknown reason, for Vanguard FTSE All-World UCITS ETF,
      // the price is not in cents unlike other quotes, but is off by 100.
      q.pricePerShareCents = Math.round(q.pricePerShareCents / 100);
    }
    quotes.push(q);
  }
  return quotes;
}

function stockQuoteToDbModel(x: StockQuote): Prisma.StockQuoteCreateManyInput {
  // TODO: change schema to explicitly state what's stored in the value.
  return {
    stockId: x.stockId,
    value: x.pricePerShareCents,
    quoteTimestamp: x.quoteTimestamp.toISOString(),
  };
}

/**
 *
 * @param refreshIntervalHours How often to update the latest rate. If the rate is newer than this, it's not updated.
 * @returns True if any quotes were added or updated, false otherwise.
 */
export async function addLatestStockQuotes(
  refreshIntervalHours: number
): Promise<boolean> {
  console.log('Starting stock quotes backfill');
  const timingLabel = 'Stock quotes backfill ' + new Date().getTime();
  console.time(timingLabel);
  const dbStocks = await prisma.stock.findMany();
  if (dbStocks.length == 0) {
    console.log('No stocks to backfill');
    return false;
  }
  await Promise.allSettled(
    dbStocks.map(async s => {
      try {
        await backfill(s, refreshIntervalHours);
      } catch (err) {
        console.error('Error backfilling %s', s.ticker, err);
      }
    })
  );
  console.timeEnd(timingLabel);
  return true;
}

async function backfill(stock: DBStock, refreshIntervalHours: number) {
  console.log('backfilling %s', stock.ticker);
  const now = new Date();
  const latest = await prisma.stockQuote.findFirst({
    where: {
      stockId: stock.id,
    },
    orderBy: [
      {
        quoteTimestamp: 'desc',
      },
      {
        updatedAt: 'desc',
      },
    ],
  });

  if (!latest) {
    console.info('%s: no history', stock.ticker);
    const startDate = addDays(now, -NO_HISTORY_LOOK_BACK_DAYS);
    const fetched = await fetchQuotes({stock, startDate});
    if (fetched?.length == 0) {
      console.warn(
        '%s: historical data not found starting on %s',
        stock.ticker,
        startDate.toDateString()
      );
      return;
    }
    await prisma.stockQuote.createMany({
      data: fetched.map(stockQuoteToDbModel),
    });
    return;
  }

  if (isSameDay(now, latest.quoteTimestamp)) {
    // Latest rate is of today, decide to update it if it's fresh or not.
    // quoteTimestamp is just a date and always a midnight, so use updatedAt for the latest update time
    const ageHours = differenceInHours(now, latest.updatedAt);
    if (ageHours < refreshIntervalHours) {
      console.warn(
        '%s: rate for %s is still fresh, updated %d hours ago on %s',
        stock.ticker,
        latest.quoteTimestamp.toDateString(),
        ageHours,
        latest.updatedAt
      );
      return;
    }
    console.log(
      "%s: updating today's (%s) quote as it's %d hours old",
      stock.ticker,
      latest.quoteTimestamp.toDateString(),
      ageHours
    );
    const fetched = await fetchQuotes({stock, startDate: now});
    if (fetched?.length != 1) {
      console.warn(
        '%s: found %d rates on %s, want 1, ignoring',
        stock.ticker,
        fetched?.length,
        now.toDateString(),
        fetched
      );
      return;
    }
    await prisma.stockQuote.create({
      data: stockQuoteToDbModel(fetched[0]),
    });
    return;
  }

  // Not the same day, adding the whole range.
  let startDate = latest.quoteTimestamp;
  if (!isSameDay(latest.quoteTimestamp, latest.updatedAt)) {
    // If the latest timestamp was updated on the same day we fetch it one last time to make sure we have the most up to date value.
    // When the timestamp was updated on a later date, it's up to date, so not reupdate it.
    console.log(
      '%s: latest rate from %s was updated on %s, skipping additional update',
      stock.ticker,
      latest.quoteTimestamp.toDateString(),
      latest.updatedAt.toDateString()
    );
    startDate = addDays(startDate, 1);
  }

  console.log(
    '%s: fetching from %s',
    stock.ticker,
    startDate.toDateString(),
    now.toDateString()
  );

  const fetched = await fetchQuotes({stock, startDate});
  const toUpdate = fetched.find(x =>
    isSameDay(x.quoteTimestamp, latest.quoteTimestamp)
  );
  if (toUpdate) {
    console.log(
      '%s: updating quote for %s',
      stock.ticker,
      toUpdate.quoteTimestamp.toDateString()
    );
    await prisma.stockQuote.update({
      data: stockQuoteToDbModel(toUpdate),
      where: {
        id: latest.id,
      },
    });
  }
  const toInsert = fetched.filter(
    x => !isSameDay(x.quoteTimestamp, latest.quoteTimestamp)
  );
  if (toInsert) {
    console.log('%s: inserting %d entries', stock.ticker, toInsert.length);
    await prisma.stockQuote.createMany({
      data: toInsert.map(x => stockQuoteToDbModel(x)),
    });
  }
}
