import {expect, test} from '@jest/globals';
import {AmountWithCurrency} from 'lib/AmountWithCurrency';
import {Currency} from 'lib/model/Currency';
import {parseAmountAsCents, percentile} from 'lib/util/util';

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
  `(
    'returns $expected when $a as parsed as amount',
    ({a, expected}: {a: string; expected: number}) => {
      expect(parseAmountAsCents(a)).toEqual(expected);
    }
  );
});

describe('percentile', () => {
  const zero = AmountWithCurrency.zero(Currency.USD);
  test.each([-1, 101, 1.5])("throws for invalid percentile '%s'", a =>
    expect(() => percentile([zero], a)).toThrow()
  );

  test.each<{items: number[]; p: number; expected: number}>`
    items                   | p      | expected
    ${[100]}                | ${0}   | ${100}
    ${[100]}                | ${25}  | ${100}
    ${[100]}                | ${50}  | ${100}
    ${[100]}                | ${75}  | ${100}
    ${[100]}                | ${99}  | ${100}
    ${[100]}                | ${100} | ${100}
    ${[100, 200]}           | ${0}   | ${100}
    ${[100, 200]}           | ${25}  | ${100}
    ${[100, 200]}           | ${50}  | ${100}
    ${[100, 200]}           | ${75}  | ${200}
    ${[100, 200]}           | ${99}  | ${200}
    ${[100, 200]}           | ${100} | ${200}
    ${[100, 200, 300]}      | ${0}   | ${100}
    ${[100, 200, 300]}      | ${25}  | ${100}
    ${[100, 200, 300]}      | ${50}  | ${200}
    ${[100, 200, 300]}      | ${75}  | ${300}
    ${[100, 200, 300]}      | ${99}  | ${300}
    ${[100, 200, 300]}      | ${100} | ${300}
    ${[100, 200, 300, 400]} | ${0}   | ${100}
    ${[100, 200, 300, 400]} | ${25}  | ${100}
    ${[100, 200, 300, 400]} | ${50}  | ${200}
    ${[100, 200, 300, 400]} | ${75}  | ${300}
    ${[100, 200, 300, 400]} | ${99}  | ${400}
    ${[100, 200, 300, 400]} | ${100} | ${400}
  `(
    '$p-th percentile of $items is $expected',
    (input: {items: number[]; p: number; expected: number}) => {
      const amounts = input.items.map(
        i => new AmountWithCurrency({amountCents: i, currency: Currency.USD})
      );
      const actual = percentile(amounts, input.p);
      expect(actual.cents()).toEqual(input.expected);
    }
  );
});
