import { AmountWithCurrency } from "lib/AmountWithCurrency";
import { Currency } from "lib/model/Currency";

export function percentile(data: AmountWithCurrency[], p: number) {
  if (p < 0 || p > 100 || p != Math.round(p)) {
    throw new Error(`Invalid percentile '${p}'`);
  }
  const amounts = [...data].sort((a, b) => a.cents() - b.cents());
  const position = Math.round((amounts.length * p) / 100);
  return amounts[position - 1];
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
  let currency: Currency;
  for (const [month, amount] of monthlyAmounts) {
    window.push(amount);
    if (window.length > maxWindowLength) {
      window.shift();
    }
    const amountCurrency = amount.getCurrency();
    if (!currency) {
      currency = amountCurrency;
    } else if (currency.id != amountCurrency.id) {
      throw new Error(
        `Cannot sum over different currencies, got ${currency.name} and ${amountCurrency.name}`
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
