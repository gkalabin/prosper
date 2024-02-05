import {startOfMonth, startOfYear} from 'date-fns';
import {AmountWithCurrency} from 'lib/AmountWithCurrency';
import {assert} from 'lib/assert';
import {Currency} from 'lib/model/Currency';
import {
  percentile as numbersPercentile,
  runningAverage as numbersRunningAverage,
} from 'lib/util/stats';

export enum Granularity {
  MONTHLY,
  YEARLY,
}

type MoneyTimeseriesEntry = {
  time: Date;
  sum: AmountWithCurrency;
};

export class MoneyTimeseries {
  private readonly data: Map<number, AmountWithCurrency>;
  private readonly currency: Currency;
  private readonly granularity: Granularity;

  constructor(currency: Currency, granularity: Granularity) {
    this.currency = currency;
    this.granularity = granularity;
    this.data = new Map();
  }

  private bucket(time: Date | number): Date {
    switch (this.granularity) {
      case Granularity.MONTHLY:
        return startOfMonth(time);
      case Granularity.YEARLY:
        return startOfYear(time);
      default:
        const _exhaustivenessCheck: never = this.granularity;
        throw new Error(`Unknown granularity ${_exhaustivenessCheck}`);
    }
  }

  getCurrency(): Currency {
    return this.currency;
  }

  getGranularity(): Granularity {
    return this.granularity;
  }

  increment(time: Date | number, i: AmountWithCurrency): void {
    if (i.getCurrency().code != this.currency.code) {
      throw new Error(
        `Cannot insert amount in ${i.getCurrency().code} into ${this.currency.code} timeseries`
      );
    }
    const k = this.bucket(time).getTime();
    const existing = this.data.get(k) ?? AmountWithCurrency.zero(this.currency);
    this.data.set(k, existing.add(i));
  }

  set(time: Date | number, i: AmountWithCurrency) {
    if (i.getCurrency().code != this.currency.code) {
      throw new Error(
        `Cannot insert amount in ${i.getCurrency().code} into ${this.currency.code} timeseries`
      );
    }
    const k = this.bucket(time).getTime();
    this.data.set(k, i);
  }

  get(time: Date | number): AmountWithCurrency {
    const k = this.bucket(time).getTime();
    return this.data.get(k) ?? AmountWithCurrency.zero(this.currency);
  }

  entries(): MoneyTimeseriesEntry[] {
    const out: MoneyTimeseriesEntry[] = [];
    [...this.data.entries()]
      .sort(([t1], [t2]) => t1 - t2)
      .forEach(([t, v]) => {
        out.push({
          time: new Date(t),
          sum: v,
        });
      });
    return out;
  }
}

export function runningAverage(ts: MoneyTimeseries, window: number) {
  const entries = ts.entries();
  const cents = entries.map(x => x.sum.cents());
  const averagesCent = numbersRunningAverage(cents, window);
  assert(entries.length == averagesCent.length);
  const out = new MoneyTimeseries(ts.getCurrency(), ts.getGranularity());
  for (let i = 0; i < entries.length; i++) {
    out.set(
      entries[i].time,
      new AmountWithCurrency({
        // TODO: write tests for Math.round
        amountCents: Math.round(averagesCent[i]),
        currency: ts.getCurrency(),
      })
    );
  }
  return out;
}

export function percentile(ts: MoneyTimeseries, p: number) {
  const entries = ts.entries();
  const cents = entries.map(x => x.sum.cents());
  const percentileCent = numbersPercentile(cents, p);
  return new AmountWithCurrency({
    amountCents: percentileCent,
    currency: ts.getCurrency(),
  });
}
