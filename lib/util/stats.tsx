import {AmountWithCurrency} from 'lib/AmountWithCurrency';
import {Currency} from 'lib/model/Currency';

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

export function topN<T>(
  data: Map<T, number>,
  n: number
): {
  top: Array<[T, number]>;
  otherSum: number;
  otherCount: number;
} {
  const sorted = [...data].sort((a, b) => b[1] - a[1]);
  const top = sorted.slice(0, n);
  const otherItems = sorted.slice(n);
  const otherSum = otherItems.map(([_, sum]) => sum).reduce((p, c) => p + c, 0);
  return {
    top,
    otherSum,
    otherCount: otherItems.length,
  };
}
