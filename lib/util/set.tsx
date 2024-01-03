// TODO: write tests (XS)
export function intersect(
  a: readonly number[],
  b: readonly number[],
): number[] {
  if (a.length > b.length) {
    return intersect(b, a);
  }
  // a.length <= b.length
  const set = new Set(b);
  return a.filter(value => set.has(value));
}

// TODO: write tests (XS)
export function union(a: readonly number[], b: readonly number[]): number[] {
  const set = new Set(a);
  for (const value of b) {
    set.add(value);
  }
  return Array.from(set);
}
