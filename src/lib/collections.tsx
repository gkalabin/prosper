// TODO: write tests.
export function uniqMostFrequent<T>(items: T[]): T[] {
  const frequency = new Map<T, number>();
  items.forEach(x => frequency.set(x, (frequency.get(x) ?? 0) + 1));
  return [...frequency.entries()]
    .sort(([_v1, f1], [_v2, f2]) => f2 - f1)
    .map(([value]) => value);
}
