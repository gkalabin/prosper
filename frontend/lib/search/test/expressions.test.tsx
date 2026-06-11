import {
  clearModel,
  expectSearch,
  modelParams,
  tx,
} from '@/lib/search/test/helpers';
import {test} from '@jest/globals';

beforeEach(clearModel);

describe('search: logical operations', () => {
  const params = modelParams([
    tx('Costa', 3, 'HSBC > Current', 'Coffee'),
    tx('Starbucks', 3.25, 'Amex > Gold', 'Coffee'),
    tx('Tesco', 4, 'HSBC > Current', 'Food'),
    tx('Tesco', 4.1, 'Amex > Gold', 'Food'),
  ]);

  test('single OR', () => {
    expectSearch({
      q: {query: 'costa OR Starbucks', ...params},
      results: [
        {vendor: 'Costa', amountNanos: 3000000000n},
        {vendor: 'Starbucks', amountNanos: 3250000000n},
      ],
    });
  });

  test('single AND', () => {
    expectSearch({
      q: {query: 'tesco AND amex', ...params},
      results: [{vendor: 'Tesco', amountNanos: 4100000000n}],
    });
  });

  test('AND takes priority over OR', () => {
    expectSearch({
      q: {query: 'costa OR tesco AND amex', ...params},
      results: [
        {vendor: 'Costa', amountNanos: 3000000000n},
        {vendor: 'Tesco', amountNanos: 4100000000n},
      ],
    });
  });

  test('expressions in parenthesis take priority', () => {
    expectSearch({
      q: {query: '(costa OR tesco) AND amex', ...params},
      results: [{vendor: 'Tesco', amountNanos: 4100000000n}],
    });
  });

  test('negation', () => {
    expectSearch({
      q: {query: 'NOT Tesco', ...params},
      results: [
        {vendor: 'Costa', amountNanos: 3000000000n},
        {vendor: 'Starbucks', amountNanos: 3250000000n},
      ],
    });
  });
});
