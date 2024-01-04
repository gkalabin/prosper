import {expect, test} from '@jest/globals';
import {fallbackSearch} from 'lib/search/search';
import {
  clearModel,
  expectSearch,
  modelParams,
  tx,
} from 'lib/search/test/helpers';

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
        {vendor: 'Costa', amountCents: 300},
        {vendor: 'Starbucks', amountCents: 325},
        {vendor: 'Electric', amountCents: 400},
      ],
    });
  });
  test('spaces only query is the same as empty string', () => {
    expectSearch({
      q: {query: '  ', ...params},
      results: [
        {vendor: 'Costa', amountCents: 300},
        {vendor: 'Starbucks', amountCents: 325},
        {vendor: 'Electric', amountCents: 400},
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
    expect.objectContaining({vendor: 'Costa', amountCents: 300}),
    expect.objectContaining({vendor: 'Starbucks', amountCents: 325}),
    expect.objectContaining({vendor: 'Electric', amountCents: 400}),
  ]);
  test('empty string matches everything', () => {
    expect(fallbackSearch({query: '', ...params})).toEqual(allItems);
  });
  test('spaces only query is the same as empty string', () => {
    expect(fallbackSearch({query: '  ', ...params})).toEqual(allItems);
  });
});
