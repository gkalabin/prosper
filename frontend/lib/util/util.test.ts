import {
  appendNewItems,
  capitalize as capitalise,
  dollarToNanos,
  evenlySpacedNumbers,
  nanosToDollar,
  notEmpty,
  parseAmountAsNanos,
  removeQuotes,
  roundToCent,
  splitAmount,
} from '@/lib/util/util';
import {expect, test} from '@jest/globals';

describe('parseAmountAsNanos', () => {
  test.each(['', ' ', ' 1', '1.', '.1', '1.123', 'x'])(
    "parsing '%s' returns null",
    a => expect(parseAmountAsNanos(a)).toBeNull()
  );
  test.each<{a: string; expected: bigint}>`
    a         | expected
    ${'1'}    | ${1_000_000_000n}
    ${'1.00'} | ${1_000_000_000n}
    ${'1.03'} | ${1_030_000_000n}
    ${'1.23'} | ${1_230_000_000n}
    ${'1.20'} | ${1_200_000_000n}
    ${'0.23'} | ${230_000_000n}
    ${'1,5'}  | ${1_500_000_000n}
    ${'-1'}   | ${-1_000_000_000n}
  `('returns $expected when $a as parsed as amount', ({a, expected}) => {
    expect(parseAmountAsNanos(a)).toEqual(expected);
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

describe('nanosToDollar', () => {
  test.each<{nanos: bigint; expected: number}>`
    nanos              | expected
    ${0n}              | ${0}
    ${1_000_000_000n}  | ${1}
    ${1_500_000_000n}  | ${1.5}
    ${990_000_000n}    | ${0.99}
    ${-1_000_000_000n} | ${-1}
  `('converts $nanos nanos to $expected dollars', ({nanos, expected}) =>
    expect(nanosToDollar(nanos)).toEqual(expected)
  );
});

describe('roundToCent', () => {
  test.each<{dollar: number; expected: number}>`
    dollar    | expected
    ${0}      | ${0}
    ${1.5}    | ${1.5}
    ${0.555}  | ${0.56}
    ${-0.555} | ${-0.56}
    ${1.2345} | ${1.23}
  `('rounds $dollar to $expected', ({dollar, expected}) =>
    expect(roundToCent(dollar)).toEqual(expected)
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

describe('evenlySpacedNumbers', () => {
  test.each<{start: number; end: number; count: number; expected: number[]}>`
    start | end   | count | expected
    ${0}  | ${0}  | ${1}  | ${[0]}
    ${0}  | ${0}  | ${5}  | ${[0]}
    ${0}  | ${10} | ${1}  | ${[10]}
    ${0}  | ${10} | ${0}  | ${[10]}
    ${0}  | ${10} | ${2}  | ${[0, 10]}
    ${0}  | ${10} | ${3}  | ${[0, 5, 10]}
    ${0}  | ${10} | ${5}  | ${[0, 3, 5, 8, 10]}
  `(
    'spans [$start, $end] in $count yields $expected',
    ({start, end, count, expected}) =>
      expect(evenlySpacedNumbers({start, end}, count)).toEqual(expected)
  );

  test('throws when end is before start', () => {
    expect(() => evenlySpacedNumbers({start: 10, end: 0}, 3)).toThrow();
  });
});

describe('splitAmount', () => {
  test.each<{formatted: string; whole: string; fraction: string}>`
    formatted         | whole             | fraction
    ${'€184,393.00'}  | ${'€184,393'}     | ${'.00'}
    ${'$1,234.56'}    | ${'$1,234'}       | ${'.56'}
    ${'$5'}           | ${'$5'}           | ${''}
    ${'-$5.50'}       | ${'-$5'}          | ${'.50'}
    ${'184.393,00 €'} | ${'184.393,00 €'} | ${''}
  `(
    'splits $formatted into $whole and $fraction',
    ({formatted, whole, fraction}) =>
      expect(splitAmount(formatted)).toEqual({whole, fraction})
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
