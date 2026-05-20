import {AmountWithCurrency} from '@/lib/AmountWithCurrency';
import {assert} from '@/lib/assert';
import {Currency} from '@/lib/model/Currency';
import {Granularity} from '@/lib/util/Granularity';
import {
  percentile as numbersPercentile,
  runningAverage as numbersRunningAverage,
} from '@/lib/util/stats';
import {startOfMonth, startOfQuarter, startOfYear} from 'date-fns';

type AddFunction<T> = (a: T, b: T) => T;

// TODO: add tests.
export class AbstractTimeseries<T> {
  protected readonly data: Map<number, T>;
  private readonly granularity: Granularity;
  private readonly addFn: AddFunction<T>;
  private readonly zero: T;

  constructor(granularity: Granularity, addFn: AddFunction<T>, zero: T) {
    this.granularity = granularity;
    this.data = new Map();
    this.addFn = addFn;
    this.zero = zero;
  }

  private bucket(time: Date | number | string): Date {
    switch (this.granularity) {
      case Granularity.MONTHLY:
        return startOfMonth(time);
      case Granularity.QUARTERLY:
        return startOfQuarter(time);
      case Granularity.YEARLY:
        return startOfYear(time);
      default:
        const _exhaustivenessCheck: never = this.granularity;
        throw new Error(`Unknown granularity ${_exhaustivenessCheck}`);
    }
  }

  getGranularity(): Granularity {
    return this.granularity;
  }

  increment(time: Date | number, i: T): void {
    const k = this.bucket(time).getTime();
    const existing = this.data.get(k) ?? this.zero;
    const sum = this.addFn(existing, i);
    this.data.set(k, sum);
  }

  set(time: Date | number, i: T) {
    const k = this.bucket(time).getTime();
    this.data.set(k, i);
  }

  get(time: Date | number | string): T {
    const k = this.bucket(time).getTime();
    return this.data.get(k) ?? this.zero;
  }
}

export class NumberTimeseries extends AbstractTimeseries<number> {
  constructor(granularity: Granularity) {
    super(granularity, (a, b) => a + b, 0);
  }
}

type MoneyTimeseriesEntry = {
  time: Date;
  sum: AmountWithCurrency;
};

export class MoneyTimeseries extends AbstractTimeseries<AmountWithCurrency> {
  private readonly currency: Currency;

  constructor(currency: Currency, granularity: Granularity) {
    super(
      granularity,
      AmountWithCurrency.add,
      AmountWithCurrency.zero(currency)
    );
    this.currency = currency;
  }

  getCurrency(): Currency {
    return this.currency;
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
