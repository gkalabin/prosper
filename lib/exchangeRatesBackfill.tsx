import { addDays, differenceInHours, isSameDay, startOfDay } from "date-fns";
import yahooFinance from "yahoo-finance2";
import { HistoricalRowHistory } from "yahoo-finance2/dist/esm/src/modules/historical";
import { Currencies, Currency } from "./ClientSideModel";
import prisma from "./prisma";

export const NANOS_MULTIPLIER = 1000000000;
const UPDATE_FREQUENCY_HOURS = 6;

export async function fetchExchangeRates({
  startDate,
  sell,
  buy,
}: {
  startDate: Date;
  sell: Currency;
  buy: Currency;
}) {
  const symbol = `${sell.name}${buy.name}=X`;
  const r = await yahooFinance.historical(symbol, {
    period1: startOfDay(startDate),
    interval: "1d",
  }, {devel: false});
  return r;
}

export async function addLatestExchangeRates() {
  const timingLabel = "Exchange rate backfill"
  console.time(timingLabel);
  const currencies = new Currencies(await prisma.currency.findMany());
  if (currencies.empty()) {
    console.timeEnd(timingLabel);
    return;
  }
  for (const sell of currencies.all()) {
    for (const buy of currencies.all()) {
      await backfill({ sell, buy });
    }
  }
  console.timeEnd(timingLabel);
}

async function backfill({ sell, buy }: { sell: Currency; buy: Currency }) {
  if (sell.id == buy.id || sell.isStock() || buy.isStock()) {
    return;
  }
  const now = new Date();
  const apiModelToDb = (x: HistoricalRowHistory) => {
    return {
      currencyFromId: sell.id,
      currencyToId: buy.id,
      rateTimestamp: x.date.toISOString(),
      rateNanos: Math.round(x.close * NANOS_MULTIPLIER),
    };
  };
  const latest = await prisma.exchangeRate.findFirst({
    where: {
      currencyFromId: sell.id,
      currencyToId: buy.id,
    },
    orderBy: {
      rateTimestamp: "desc",
    },
  });

  if (!latest) {
    console.warn(`${sell.name}->${buy.name}: no history`);
    const fetched = await fetchExchangeRates({ sell, buy, startDate: now });
    if (fetched?.length != 1) {
      console.warn(
        "%s->%s: found %d rates on %s, want 1, ignoring",
        sell.name,
        buy.name,
        fetched?.length,
        now.toDateString()
      );
      return;
    }
    console.log(
      "%s->%s: inserting a new rate for %s",
      sell.name,
      buy.name,
      fetched[0].date.toDateString()
    )
    await prisma.exchangeRate.create({
      data: apiModelToDb(fetched[0]),
    });
    return;
  }

  if (isSameDay(now, latest.rateTimestamp)) {
    // Latest rate is of today, decide to update it if it's fresh or not.
    // rateTimestamp is just a date and always a midnight, so use updatedAt for the latest update time
    const ageHours = differenceInHours(now, latest.updatedAt);
    if (ageHours < UPDATE_FREQUENCY_HOURS) {
      console.warn(
        "%s->%s: rate for %s is still fresh, updated %d hours ago on %s",
        sell.name,
        buy.name,
        latest.rateTimestamp.toDateString(),
        ageHours,
        latest.updatedAt
      );
      return;
    }
    console.log(
      "%s->%s: updating today's (%s) rate as it's %d hours old",
      sell.name,
      buy.name,
      latest.rateTimestamp.toDateString(),
      ageHours
    );
    const fetched = await fetchExchangeRates({ sell, buy, startDate: now });
    if (fetched?.length != 1) {
      console.warn(
        "%s->%s: found %d rates on %s, want 1, ignoring",
        sell.name,
        buy.name,
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
      "%s->%s: latest rate from %s was updated on %s, skipping additional update",
      sell.name,
      buy.name,
      latest.rateTimestamp.toDateString(),
      latest.updatedAt.toDateString()
    );
    startDate = addDays(startDate, 1);
  }

  console.log(
    "%s->%s: fetching from %s",
    sell.name,
    buy.name,
    startDate.toDateString(),
    now.toDateString()
  );

  const fetched = await fetchExchangeRates({ sell, buy, startDate });
  const toUpdate = fetched.find((x) => isSameDay(x.date, latest.rateTimestamp));
  if (toUpdate) {
    console.log(
      "%s->%s: updating rate for %s",
      sell.name,
      buy.name,
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
    (x) => !isSameDay(x.date, latest.rateTimestamp)
  );
  if (toInsert) {
    console.log(
      "%s->%s: inserting %d quotes",
      sell.name,
      buy.name,
      toInsert.length
    );
    await prisma.exchangeRate.createMany({
      data: toInsert.map(apiModelToDb),
    });
  }
}
