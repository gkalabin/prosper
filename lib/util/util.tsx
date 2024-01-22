import {AmountWithCurrency} from 'lib/AmountWithCurrency';
import {Currency} from 'lib/model/Currency';
import {AppendMap} from 'lib/util/AppendingMap';

export function percentile(
  data: AmountWithCurrency[],
  p: number
): AmountWithCurrency {
  if (p < 0 || p > 100 || !Number.isInteger(p)) {
    throw new Error(`Invalid percentile '${p}'`);
  }
  if (!data?.length) {
    throw new Error(`Cannot calculate percentile of empty data`);
  }
  if (p == 0) {
    return data[0];
  }
  const amounts = [...data].sort((a, b) => a.cents() - b.cents());
  const position = Math.ceil((data.length * p) / 100) - 1;
  return amounts[position];
}

export function runningAverage(
  timeseries: Map<number, AmountWithCurrency>,
  maxWindowLength: number
) {
  const monthlyAmounts = [...timeseries.entries()].sort(
    ([t1], [t2]) => t1 - t2
  );
  const window = [] as AmountWithCurrency[];
  const averages = new Map<number, AmountWithCurrency>();
  let currency: Currency | null = null;
  for (const [month, amount] of monthlyAmounts) {
    window.push(amount);
    if (window.length > maxWindowLength) {
      window.shift();
    }
    const amountCurrency = amount.getCurrency();
    if (!currency) {
      currency = amountCurrency;
    } else if (currency.code != amountCurrency.code) {
      throw new Error(
        `Cannot sum over different currencies, got ${currency.code} and ${amountCurrency.code}`
      );
    }
    const sum = AmountWithCurrency.sum(window, currency);
    const avg = new AmountWithCurrency({
      amountCents: Math.round(sum.cents() / window.length),
      currency,
    });
    averages.set(month, avg);
  }
  return averages;
}

export function topNAmount<T>(
  data: AppendMap<T, AmountWithCurrency>,
  n: number,
  otherFormatter: (otherPoints: number) => T
): [T, AmountWithCurrency][] {
  // Using n+1 here to avoid rolling up a single value into "other".
  if (data.size <= n + 1) {
    return [...data.entries()];
  }
  const sorted = [...data].sort((a, b) => b[1].subtract(a[1]).cents());
  const topSum = sorted.slice(0, n);
  const sumOther = sorted
    .slice(n)
    .map(([_, sum]) => sum)
    .reduce((p, c) => p.add(c));
  return topSum.concat([[otherFormatter(sorted.length - n), sumOther]]);
}

export function topN<T>(
  data: AppendMap<T, number>,
  n: number,
  otherFormatter: (otherPoints: number) => T
): [T, number][] {
  // Using n+1 here to avoid rolling up a single value into "other".
  if (data.size <= n + 1) {
    return [...data.entries()];
  }
  const sorted = [...data].sort((a, b) => b[1] - a[1]);
  const topSum = sorted.slice(0, n);
  const sumOther = sorted
    .slice(n)
    .map(([_, sum]) => sum)
    .reduce((p, c) => p + c, 0);
  return topSum.concat([[otherFormatter(sorted.length - n), sumOther]]);
}

export function capitalize(s: string): string {
  if (s.length < 1) {
    return s;
  }
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function notEmpty<T>(value: T | null | undefined): value is T {
  if (value === null || value === undefined) {
    return false;
  }
  // This assignment makes compile-time check that the value is T.
  const exhaustivenessCheck: T = value;
  // This return should always be true, it is here only to prevent unused variable.
  return !!exhaustivenessCheck;
}

export function parseAmountAsCents(s: string): number {
  const sign = s.startsWith('-') ? -1 : 1;
  if (sign < 0) {
    s = s.slice(1);
  }
  const match = s.match(/^([0-9]+)((\.|,)[0-9]{1,2})?$/);
  if (!match) {
    return NaN;
  }
  const cents = parseInt(match[1], 10) * 100;
  if (match[2]) {
    let fractionString = match[2].slice(1);
    if (fractionString.length == 1) {
      fractionString = fractionString + '0';
    }
    const fraction = parseInt(fractionString, 10);
    if (fraction > 0) {
      return sign * (cents + fraction);
    }
  }
  return sign * cents;
}

// TODO: write tests (XS)
export function removeQuotes(s: string): string {
  if (s.startsWith('"') && s.endsWith('"')) {
    return s.substring(1, s.length - 1);
  }
  return s;
}

type DisplayOrderAndId = {
  id: number;
  displayOrder: number;
};
export function byDisplayOrderThenId(
  a: DisplayOrderAndId,
  b: DisplayOrderAndId
) {
  if (a.displayOrder != b.displayOrder) {
    return a.displayOrder - b.displayOrder;
  }
  return a.id - b.id;
}
