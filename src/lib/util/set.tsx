/**
 * Intersect calculates an intersection of two arrays of numbers. The order of the results is not guaranteed.
 *
 * @param a array of numbers to intersect with the other param.
 * @param b another array of numbers to intersect.
 * @returns array of numbers, each number in the result is present in both arrays.
 */
export function intersect(
  a: readonly number[],
  b: readonly number[]
): number[] {
  if (a.length > b.length) {
    return intersect(b, a);
  }
  // At this point a.length <= b.length.
  const freq = new Map<number, number>();
  // Calculate the frequency of each number in one of the arrays.
  // This allows to correctly calculate the intersections of the inputs
  // with duplicate items.
  for (const x of a) {
    const existing = freq.get(x);
    if (existing === undefined) {
      freq.set(x, 1);
      continue;
    }
    freq.set(x, existing + 1);
  }
  // Return the results of the second array which are present in the first
  // taking into account duplicates.
  return b.filter(value => {
    const f = freq.get(value);
    if (!f) {
      return false;
    }
    freq.set(value, f - 1);
    return true;
  });
}

/**
 * Union calculates a union of two arrays of numbers. Duplicate items are removed.
 *
 * @param a first array to union with the other array.
 * @param b the other array to union.
 * @returns set which includes all the unique items present in either of the arrays.
 */
export function union(a: readonly number[], b: readonly number[]): Set<number> {
  const set = new Set(a);
  for (const value of b) {
    set.add(value);
  }
  return set;
}
