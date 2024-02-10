import {expect, test} from '@jest/globals';
import {
  capitalize as capitalise,
  notEmpty,
  parseAmountAsCents,
  removeQuotes,
} from '@/lib/util/util';

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
