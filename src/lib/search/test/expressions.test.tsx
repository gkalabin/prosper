import {test} from '@jest/globals';
import {
  clearModel,
  expectSearch,
  modelParams,
  tx,
} from '@/lib/search/test/helpers';

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
        {vendor: 'Costa', amountCents: 300},
        {vendor: 'Starbucks', amountCents: 325},
      ],
    });
  });

  test('single AND', () => {
    expectSearch({
      q: {query: 'tesco AND amex', ...params},
      results: [{vendor: 'Tesco', amountCents: 410}],
    });
  });

  test('AND takes priority over OR', () => {
    expectSearch({
      q: {query: 'costa OR tesco AND amex', ...params},
      results: [
        {vendor: 'Costa', amountCents: 300},
        {vendor: 'Tesco', amountCents: 410},
      ],
    });
  });

  test('expressions in parenthesis take priority', () => {
    expectSearch({
      q: {query: '(costa OR tesco) AND amex', ...params},
      results: [{vendor: 'Tesco', amountCents: 410}],
    });
  });

  test('negation', () => {
    expectSearch({
      q: {query: 'NOT Tesco', ...params},
      results: [
        {vendor: 'Costa', amountCents: 300},
        {vendor: 'Starbucks', amountCents: 325},
      ],
    });
  });
});
