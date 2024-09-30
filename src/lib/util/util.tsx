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

// TODO: add tests.
export function centsToDollar(cents: number): number {
  return Math.round(cents) / 100;
}

// TODO: add tests.
export function dollarToCents(dollar: number): number {
  return Math.round(dollar * 100);
}

// TODO: add tests.
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
