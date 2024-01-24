import {expect, test} from '@jest/globals';
import {AmountWithCurrency} from 'lib/AmountWithCurrency';
import {USD} from 'lib/model/Currency';
import {percentile, topN} from 'lib/util/stats';

describe('percentile', () => {
  const zero = AmountWithCurrency.zero(USD);
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
  `('$p-th percentile of $items is $expected', ({items, p, expected}) => {
    const amounts = items.map(
      i => new AmountWithCurrency({amountCents: i, currency: USD})
    );
    const actual = percentile(amounts, p);
    expect(actual.cents()).toEqual(expected);
  });
});

describe('topN', () => {
  test('empty input', () => {
    expect(topN(new Map(), 1)).toMatchObject({
      top: [],
      otherSum: 0,
      otherCount: 0,
    });
  });
  test('single item', () => {
    const items = new Map<string, number>([['foo', 70]]);
    expect(topN(items, 1)).toMatchObject({
      top: [['foo', 70]],
      otherSum: 0,
      otherCount: 0,
    });
  });
  test('N > length', () => {
    const items = new Map<string, number>([
      ['foo', 70],
      ['bar', 20],
      ['baz', 140],
    ]);
    expect(topN(items, 10)).toMatchObject({
      top: [
        ['baz', 140],
        ['foo', 70],
        ['bar', 20],
      ],
      otherSum: 0,
      otherCount: 0,
    });
  });
  test('N < length', () => {
    const items = new Map<string, number>([
      ['foo', 70],
      ['bar', 20],
      ['baz', 140],
      ['qux', 30],
    ]);
    expect(topN(items, 2)).toMatchObject({
      top: [
        ['baz', 140],
        ['foo', 70],
      ],
      otherSum: 50,
      otherCount: 2,
    });
  });
});
