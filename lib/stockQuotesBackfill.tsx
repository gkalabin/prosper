import { addDays, differenceInHours, isSameDay, startOfDay } from "date-fns";
import yahooFinance from "yahoo-finance2";
import { HistoricalRowHistory } from "yahoo-finance2/dist/esm/src/modules/historical";
import { Currencies, Currency } from "./model/Currency";
import prisma from "./prisma";

const UPDATE_FREQUENCY_HOURS = 6;

export async function fetchQuotes({
  startDate,
  stock,
}: {
  startDate: Date;
  stock: Currency;
}) {
  const r = await yahooFinance.historical(
    stock.ticker(),
    {
      period1: startOfDay(startDate),
      interval: "1d",
    },
    { devel: false }
  );
  return r;
}

export async function addLatestStockQuotes() {
  const timingLabel = "Stock quotes backfill";
  console.time(timingLabel);
  const currencies = new Currencies(await prisma.currency.findMany());
  if (currencies.empty()) {
    console.timeEnd(timingLabel);
    return;
  }
  const USD = currencies.findByName("USD");
  for (const stock of currencies.all()) {
    await backfill(stock, USD);
  }
  console.timeEnd(timingLabel);
}

async function backfill(stock: Currency, USD: Currency) {
  if (!stock.isStock()) {
    return;
  }
  const now = new Date();
  const apiModelToDb = (x: HistoricalRowHistory, currencyId: number) => {
    return {
      currencyId: currencyId,
      value: Math.round(x.close * 100),
      ticker: stock.ticker(),
      exchange: stock.exchange(),
      quoteTimestamp: x.date.toISOString(),
    };
  };
  const latest = await prisma.stockQuote.findFirst({
    where: {
      ticker: stock.ticker(),
      exchange: stock.exchange(),
    },
    orderBy: {
      quoteTimestamp: "desc",
    },
  });

  if (!latest) {
    console.warn("%s: no history", stock.name);
    const fetched = await fetchQuotes({ stock, startDate: now });
    if (fetched?.length != 1) {
      console.warn(
        "%s: found %d rates on %s, want 1, ignoring",
        stock.name,
        fetched?.length,
        now.toDateString()
      );
      return;
    }
    // TODO: provide currency for stock when creating stock, not using USD below.
    await prisma.stockQuote.create({
      data: apiModelToDb(fetched[0], USD.id),
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
        stock.name,
        latest.quoteTimestamp.toDateString(),
        ageHours,
        latest.updatedAt
      );
      return;
    }
    console.log(
      "%s: updating today's (%s) quote as it's %d hours old",
      stock.name,
      latest.quoteTimestamp.toDateString(),
      ageHours
    );
    const fetched = await fetchQuotes({ stock, startDate: now });
    if (fetched?.length != 1) {
      console.warn(
        "%s: found %d rates on %s, want 1, ignoring",
        stock.name,
        fetched?.length,
        now.toDateString()
      );
      return;
    }
    await prisma.stockQuote.create({
      data: apiModelToDb(fetched[0], latest.currencyId),
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
      stock.name,
      latest.quoteTimestamp.toDateString(),
      latest.updatedAt.toDateString()
    );
    startDate = addDays(startDate, 1);
  }

  console.log(
    "%s: fetching from %s",
    stock.name,
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
      stock.name,
      toUpdate.date.toDateString()
    );
    await prisma.stockQuote.update({
      data: apiModelToDb(toUpdate, latest.currencyId),
      where: {
        id: latest.id,
      },
    });
  }
  const toInsert = fetched.filter(
    (x) => !isSameDay(x.date, latest.quoteTimestamp)
  );
  if (toInsert) {
    console.log("%s: inserting %d entries", stock.name, toInsert.length);
    await prisma.stockQuote.createMany({
      data: toInsert.map((x) => apiModelToDb(x, latest.currencyId)),
    });
  }
}
