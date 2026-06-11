import {fallbackSearch} from '@/lib/search/search';
import {
  clearModel,
  expectSearch,
  modelParams,
  tx,
} from '@/lib/search/test/helpers';
import {expect, test} from '@jest/globals';

beforeEach(clearModel);

describe('search: empty query', () => {
  const params = modelParams([
    tx('Costa', 3, 'Amex > Gold', 'Coffee'),
    tx('Starbucks', 3.25, 'Amex > Gold', 'Coffee'),
    tx('Electric', 4, 'HSBC > Current', 'Food'),
  ]);
  test('empty string matches everything', () => {
    expectSearch({
      q: {query: '', ...params},
      results: [
        {vendor: 'Costa', amountNanos: 3000000000n},
        {vendor: 'Starbucks', amountNanos: 3250000000n},
        {vendor: 'Electric', amountNanos: 4000000000n},
      ],
    });
  });
  test('spaces only query is the same as empty string', () => {
    expectSearch({
      q: {query: '  ', ...params},
      results: [
        {vendor: 'Costa', amountNanos: 3000000000n},
        {vendor: 'Starbucks', amountNanos: 3250000000n},
        {vendor: 'Electric', amountNanos: 4000000000n},
      ],
    });
  });
});

describe('fallback search: empty query', () => {
  const params = modelParams([
    tx('Costa', 3, 'Amex > Gold', 'Coffee'),
    tx('Starbucks', 3.25, 'Amex > Gold', 'Coffee'),
    tx('Electric', 4, 'HSBC > Current', 'Food'),
  ]);
  const allItems = expect.arrayContaining([
    expect.objectContaining({vendor: 'Costa', amountNanos: 3000000000n}),
    expect.objectContaining({vendor: 'Starbucks', amountNanos: 3250000000n}),
    expect.objectContaining({vendor: 'Electric', amountNanos: 4000000000n}),
  ]);
  test('empty string matches everything', () => {
    expect(fallbackSearch({query: '', ...params})).toEqual(allItems);
  });
  test('spaces only query is the same as empty string', () => {
    expect(fallbackSearch({query: '  ', ...params})).toEqual(allItems);
  });
});
