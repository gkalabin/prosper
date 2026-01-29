import {assertDefined} from '@/lib/assert';

export function percentile(data: number[], p: number): number {
  if (p < 0 || p > 100 || !Number.isInteger(p)) {
    throw new Error(`Invalid percentile '${p}'`);
  }
  if (!data?.length) {
    throw new Error(`Cannot calculate percentile of empty data`);
  }
  if (p == 0) {
    return data[0];
  }
  // Default sort is lexicographic, make sure to provide a number comparator.
  const sorted = [...data].sort((a, b) => a - b);
  const position = Math.ceil((data.length * p) / 100) - 1;
  return sorted[position];
}

export function runningAverage(data: number[], window: number) {
  if (window <= 0 || !Number.isInteger(window)) {
    throw new Error(`Invalid window length '${window}'`);
  }
  const slidingWindow = [] as number[];
  let sum = 0;
  const averages: number[] = [];
  for (const amount of data) {
    slidingWindow.push(amount);
    sum += amount;
    if (slidingWindow.length > window) {
      const leftItem = slidingWindow.shift();
      assertDefined(leftItem);
      sum -= leftItem;
    }
    const avg = sum / slidingWindow.length;
    averages.push(avg);
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
