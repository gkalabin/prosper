import {
  clearModel,
  expectSearch,
  modelParams,
  tx,
} from '@/lib/search/test/helpers';
import {test} from '@jest/globals';

beforeEach(clearModel);

describe('search: parenthesis', () => {
  const params = modelParams([
    tx('Costa', 3, 'HSBC > Current', 'Coffee'),
    tx('Starbucks', 3.25, 'Amex > Gold', 'Coffee'),
    tx('Tesco', 4, 'HSBC > Current', 'Food'),
    tx('Tesco', 4.1, 'Amex > Gold', 'Food'),
  ]);

  test('single OR', () => {
    expectSearch({
      q: {query: 'tesco AND (hsbc OR costa)', ...params},
      results: [{vendor: 'Tesco', amountCents: 400}],
    });
  });
});
