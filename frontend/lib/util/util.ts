const NANOS_PER_DOLLAR = 1_000_000_000;

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
  // The next line is just some always true expression to make
  // the compiler happy about the usage of the variable above.
  return exhaustivenessCheck !== null && exhaustivenessCheck !== undefined;
}

// parseAmountAsNanos parses a user-entered amount like "12.34" or "-5,5"
// into nanos, returning null for malformed input. At most two fractional
// digits are accepted, matching what amount inputs allow.
export function parseAmountAsNanos(s: string): bigint | null {
  const sign = s.startsWith('-') ? -1n : 1n;
  if (sign < 0n) {
    s = s.slice(1);
  }
  const match = s.match(/^([0-9]+)((\.|,)[0-9]{1,2})?$/);
  if (!match) {
    return null;
  }
  let nanos = BigInt(match[1]) * BigInt(NANOS_PER_DOLLAR);
  if (match[2]) {
    let fractionString = match[2].slice(1);
    if (fractionString.length == 1) {
      fractionString = fractionString + '0';
    }
    nanos += BigInt(fractionString) * BigInt(NANOS_PER_DOLLAR / 100);
  }
  return sign * nanos;
}

export function nanosToDollar(nanos: bigint | number): number {
  return Number(nanos) / NANOS_PER_DOLLAR;
}

export function dollarToNanos(dollar: number): bigint {
  return BigInt(Math.round(dollar * NANOS_PER_DOLLAR));
}

// roundToCent rounds a dollar amount to the nearest cent, e.g. when
// splitting an amount in half produces sub-cent fractions.
export function roundToCent(dollar: number): number {
  return Math.round(dollar * 100) / 100;
}

export function appendNewItems(target: number[], newItems: number[]): number[] {
  const existing = new Set(target);
  const newUnseen = newItems.filter(x => !existing.has(x));
  return [...target, ...newUnseen];
}

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
