import { Stock as DBStock } from "@prisma/client";
import { addDays, differenceInHours, format, isSameDay } from "date-fns";
import prisma from "lib/prisma";
import yahooFinance from "yahoo-finance2";
import { HistoricalRowHistory } from "yahoo-finance2/dist/esm/src/modules/historical";

const UPDATE_FREQUENCY_HOURS = 6;
const NO_HISTORY_LOOK_BACK_DAYS = 30;

export async function fetchQuotes({
  startDate,
  stock,
}: {
  startDate: Date;
  stock: DBStock;
}) {
  const r = await yahooFinance.historical(
    stock.ticker,
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
  console.log("Starting stock quotes backfill");
  const timingLabel = "Stock quotes backfill " + new Date().getTime();
  console.time(timingLabel);
  const dbStocks = await prisma.stock.findMany();
  await Promise.allSettled(dbStocks.map(async (s) => {
    try {
      await backfill(s);
    } catch (err) {
      console.error("Error backfilling %s", s.ticker, err);
    }
  }));
  console.timeEnd(timingLabel);
}

async function backfill(stock: DBStock) {
  console.log("backfilling %s", stock.ticker)
  const now = new Date();
  const apiModelToDb = (x: HistoricalRowHistory) => {
    return {
      stockId: stock.id,
      value: Math.round(x.close * 100),
      quoteTimestamp: x.date.toISOString(),
    };
  };
  const latest = await prisma.stockQuote.findFirst({
    where: {
      stockId: stock.id,
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
    console.info("%s: no history", stock.ticker);
    const startDate = addDays(now, -NO_HISTORY_LOOK_BACK_DAYS);
    const fetched = await fetchQuotes({ stock, startDate });
    if (fetched?.length == 0) {
      console.warn(
        "%s: historical data not found starting on %s",
        stock.ticker,
        startDate.toDateString()
      );
      return;
    }
    await prisma.stockQuote.createMany({
      data: fetched.map(apiModelToDb),
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
    const fetched = await fetchQuotes({ stock, startDate: now });
    if (fetched?.length != 1) {
      console.warn(
        "%s: found %d rates on %s, want 1, ignoring",
        stock.ticker,
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
      stock.ticker,
      latest.quoteTimestamp.toDateString(),
      latest.updatedAt.toDateString()
    );
    startDate = addDays(startDate, 1);
  }

  console.log(
    "%s: fetching from %s",
    stock.ticker,
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
      stock.ticker,
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
    console.log("%s: inserting %d entries", stock.ticker, toInsert.length);
    await prisma.stockQuote.createMany({
      data: toInsert.map((x) => apiModelToDb(x)),
    });
  }
}
