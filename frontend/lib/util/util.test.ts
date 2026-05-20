import {
  appendNewItems,
  capitalize as capitalise,
  centsToDollar,
  centsToNanos,
  dollarToCents,
  dollarToNanos,
  nanosToCents,
  notEmpty,
  parseAmountAsCents,
  removeQuotes,
} from '@/lib/util/util';
import {expect, test} from '@jest/globals';

describe('parseAmountAsCents', () => {
  test.each(['', ' ', ' 1', '1.', '.1', '1.123', 'x'])(
    "parsing '%s' returns NaN",
    a => expect(parseAmountAsCents(a)).toBeNaN()
  );
  test.each<{a: string; expected: number}>`
    a         | expected
    ${'1'}    | ${100}
    ${'1.00'} | ${100}
    ${'1.03'} | ${103}
    ${'1.23'} | ${123}
    ${'1.20'} | ${120}
    ${'0.23'} | ${23}
    ${'1,5'}  | ${150}
    ${'-1'}   | ${-100}
  `('returns $expected when $a as parsed as amount', ({a, expected}) => {
    expect(parseAmountAsCents(a)).toEqual(expected);
  });
});

describe('removeQuotes', () => {
  test.each<{s: string; expected: number}>`
    s        | expected
    ${``}    | ${``}
    ${`x`}   | ${`x`}
    ${`x`}   | ${`x`}
    ${`""`}  | ${``}
    ${`"x"`} | ${`x`}
    ${`"`}   | ${`"`}
  `('removeQuotes of $s is $expected', ({s, expected}) =>
    expect(removeQuotes(s)).toEqual(expected)
  );
});

describe('capitalize', () => {
  test.each<{s: string; expected: number}>`
    s        | expected
    ${``}    | ${``}
    ${`7`}   | ${`7`}
    ${`x`}   | ${`X`}
    ${`X`}   | ${`X`}
    ${`xyz`} | ${`Xyz`}
    ${`Xyz`} | ${`Xyz`}
  `('capitalize of $s is $expected', ({s, expected}) =>
    expect(capitalise(s)).toEqual(expected)
  );
});

describe('notEmpty', () => {
  test.each<{x: string; expected: number}>`
    x            | expected
    ${null}      | ${false}
    ${undefined} | ${false}
    ${''}        | ${true}
    ${'abc'}     | ${true}
    ${0}         | ${true}
    ${1}         | ${true}
    ${{}}        | ${true}
  `('notEmpty of $x is $expected', ({x, expected}) =>
    expect(notEmpty(x)).toEqual(expected)
  );
});

describe('centsToDollar', () => {
  test.each<{cents: number; expected: number}>`
    cents   | expected
    ${0}    | ${0}
    ${100}  | ${1}
    ${150}  | ${1.5}
    ${99}   | ${0.99}
    ${-100} | ${-1}
    ${3.99} | ${0.04}
  `('converts $cents cents to $expected dollars', ({cents, expected}) =>
    expect(centsToDollar(cents)).toEqual(expected)
  );
});

describe('dollarToCents', () => {
  test.each<{dollar: number; expected: number}>`
    dollar    | expected
    ${0}      | ${0}
    ${1}      | ${100}
    ${1.5}    | ${150}
    ${0.99}   | ${99}
    ${-1}     | ${-100}
    ${1.23}   | ${123}
    ${1.2345} | ${123}
  `('converts $dollar dollars to $expected cents', ({dollar, expected}) =>
    expect(dollarToCents(dollar)).toEqual(expected)
  );
});

describe('nanosToCents', () => {
  test.each<{nanos: bigint; expected: number}>`
    nanos              | expected
    ${0n}              | ${0}
    ${10_000_000n}     | ${1}
    ${1_000_000_000n}  | ${100}
    ${-10_000_000n}    | ${-1}
    ${-1_000_000_000n} | ${-100}
    ${15_000_000n}     | ${1}
    ${19_999_999n}     | ${1}
  `('converts $nanos nanos to $expected cents', ({nanos, expected}) =>
    expect(nanosToCents(nanos)).toEqual(expected)
  );
});

describe('centsToNanos', () => {
  test.each<{cents: number; expected: bigint}>`
    cents   | expected
    ${0}    | ${0n}
    ${1}    | ${10_000_000n}
    ${100}  | ${1_000_000_000n}
    ${-1}   | ${-10_000_000n}
    ${1234} | ${12_340_000_000n}
  `('converts $cents cents to $expected nanos', ({cents, expected}) =>
    expect(centsToNanos(cents)).toEqual(expected)
  );
});

describe('dollarToNanos', () => {
  test.each<{dollar: number; expected: bigint}>`
    dollar    | expected
    ${0}      | ${0n}
    ${1}      | ${1_000_000_000n}
    ${1.5}    | ${1_500_000_000n}
    ${-1}     | ${-1_000_000_000n}
    ${0.001}  | ${1_000_000n}
    ${1.2345} | ${1_234_500_000n}
  `('converts $dollar dollars to $expected nanos', ({dollar, expected}) =>
    expect(dollarToNanos(dollar)).toEqual(expected)
  );
});

describe('appendNewItems', () => {
  test('appends new items correctly', () => {
    expect(appendNewItems([], [1, 2])).toEqual([1, 2]);
    expect(appendNewItems([1], [2])).toEqual([1, 2]);
    expect(appendNewItems([1, 2], [2, 3])).toEqual([1, 2, 3]);
    expect(appendNewItems([1, 2], [1, 2])).toEqual([1, 2]);
    expect(appendNewItems([1, 2], [])).toEqual([1, 2]);
    expect(appendNewItems([], [])).toEqual([]);
  });
});
