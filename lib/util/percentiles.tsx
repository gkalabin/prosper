import { AmountWithCurrency } from "lib/AmountWithCurrency";

export function percentile(data: AmountWithCurrency[], p: number) {
  if (p < 0 || p > 100 || p != Math.round(p)) {
    throw new Error(`Invalid percentile '${p}'`);
  }
  const amounts = [...data].sort((a, b) => a.cents() - b.cents());
  const position = Math.round((amounts.length * p) / 100);
  return amounts[position - 1];
}
