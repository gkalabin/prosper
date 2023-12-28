import { addDays, differenceInHours, format, isSameDay } from "date-fns";
import { Stock } from "lib/model/Stock";
import prisma from "lib/prisma";
import yahooFinance from "yahoo-finance2";
import { HistoricalRowHistory } from "yahoo-finance2/dist/esm/src/modules/historical";

const UPDATE_FREQUENCY_HOURS = 6;

export async function fetchQuotes({
  startDate,
  stock,
}: {
  startDate: Date;
  stock: Stock;
}) {
  const r = await yahooFinance.historical(
    stock.ticker(),
    {
      period1: format(startDate, "yyyy-MM-dd"),
      interval: "1d",
    },
    {
      devel: false,
    }
  );
  return r;
}

export async function addLatestStockQuotes() {
  const timingLabel = "Stock quotes backfill " + new Date().getTime();
  console.time(timingLabel);
  const dbStocks = await prisma.stock.findMany();
  const stocks = dbStocks.map((x) => new Stock(x));
  for (const stock of stocks) {
    await backfill(stock);
  }
  console.timeEnd(timingLabel);
}

async function backfill(stock: Stock) {
  const now = new Date();
  const apiModelToDb = (x: HistoricalRowHistory) => {
    return {
      currencyId: 7354,
      currencyCode: stock.currency().code(),
      ticker: stock.ticker(),
      exchange: stock.exchange(),
      value: Math.round(x.close * 100),
      quoteTimestamp: x.date.toISOString(),
    };
  };
  const latest = await prisma.stockQuote.findFirst({
    where: {
      ticker: stock.ticker(),
      exchange: stock.exchange(),
    },
    orderBy: [
      {
        quoteTimestamp: "desc",
      },
      {
        updatedAt: "desc",
      },
    ],
  });

  if (!latest) {
    console.warn("%s: no history", stock.ticker());
    const fetched = await fetchQuotes({ stock, startDate: now });
    if (fetched?.length != 1) {
      console.warn(
        "%s: found %d rates on %s, want 1, ignoring",
        stock.ticker(),
        fetched?.length,
        now.toDateString()
      );
      return;
    }
    // TODO: provide currency for stock when creating stock, not using USD below.
    await prisma.stockQuote.create({
      data: apiModelToDb(fetched[0]),
    });
    return;
  }

  if (isSameDay(now, latest.quoteTimestamp)) {
    // Latest rate is of today, decide to update it if it's fresh or not.
    // quoteTimestamp is just a date and always a midnight, so use updatedAt for the latest update time
    const ageHours = differenceInHours(now, latest.updatedAt);
    if (ageHours < UPDATE_FREQUENCY_HOURS) {
      console.warn(
        "%s: rate for %s is still fresh, updated %d hours ago on %s",
        stock.ticker(),
        latest.quoteTimestamp.toDateString(),
        ageHours,
        latest.updatedAt
      );
      return;
    }
    console.log(
      "%s: updating today's (%s) quote as it's %d hours old",
      stock.ticker(),
      latest.quoteTimestamp.toDateString(),
      ageHours
    );
    const fetched = await fetchQuotes({ stock, startDate: now });
    if (fetched?.length != 1) {
      console.warn(
        "%s: found %d rates on %s, want 1, ignoring",
        stock.ticker(),
        fetched?.length,
        now.toDateString(),
        fetched
      );
      return;
    }
    await prisma.stockQuote.create({
      data: apiModelToDb(fetched[0]),
    });
    return;
  }

  // Not the same day, adding the whole range.
  let startDate = latest.quoteTimestamp;
  if (!isSameDay(latest.quoteTimestamp, latest.updatedAt)) {
    // If the latest timestamp was updated on the same day we fetch it one last time to make sure we have the most up to date value.
    // When the timestamp was updated on a later date, it's up to date, so not reupdate it.
    console.log(
      "%s: latest rate from %s was updated on %s, skipping additional update",
      stock.ticker(),
      latest.quoteTimestamp.toDateString(),
      latest.updatedAt.toDateString()
    );
    startDate = addDays(startDate, 1);
  }

  console.log(
    "%s: fetching from %s",
    stock.ticker(),
    startDate.toDateString(),
    now.toDateString()
  );

  const fetched = await fetchQuotes({ stock, startDate });
  const toUpdate = fetched.find((x) =>
    isSameDay(x.date, latest.quoteTimestamp)
  );
  if (toUpdate) {
    console.log(
      "%s: updating quote for %s",
      stock.ticker(),
      toUpdate.date.toDateString()
    );
    await prisma.stockQuote.update({
      data: apiModelToDb(toUpdate),
      where: {
        id: latest.id,
      },
    });
  }
  const toInsert = fetched.filter(
    (x) => !isSameDay(x.date, latest.quoteTimestamp)
  );
  if (toInsert) {
    console.log("%s: inserting %d entries", stock.ticker(), toInsert.length);
    await prisma.stockQuote.createMany({
      data: toInsert.map((x) => apiModelToDb(x)),
    });
  }
}
