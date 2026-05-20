import {
  clearModel,
  expectSearch,
  modelParams,
  tx,
} from '@/lib/search/test/helpers';
import {test} from '@jest/globals';

beforeEach(clearModel);

describe('search: amount comparisons', () => {
  const params = modelParams([
    tx('Costa', 3, 'Amex > Gold', 'Coffee'),
    tx('Starbucks', 3.25, 'Amex > Gold', 'Coffee'),
    tx('Electric', 4, 'HSBC > Current', 'Food'),
  ]);
  test('invalid amount', () => {
    expectSearch({q: {query: 'amount>3.03.03', ...params}, results: []});
  });
  test('impossible amount overlap', () => {
    expectSearch({q: {query: 'amount>3 amount<3', ...params}, results: []});
  });
  test('no results lt', () =>
    expectSearch({q: {query: 'amount<3', ...params}, results: []}));
  test('no results le', () => {
    expectSearch({q: {query: 'amount<=2', ...params}, results: []});
  });
  test('no results gt', () => {
    expectSearch({q: {query: 'amount>4', ...params}, results: []});
  });
  test('no results ge', () => {
    expectSearch({q: {query: 'amount>=5', ...params}, results: []});
  });
  test('no results eq', () => {
    expectSearch({q: {query: 'amount=5', ...params}, results: []});
  });
  test('equals match', () => {
    expectSearch({
      q: {query: 'amount=3', ...params},
      results: [{vendor: 'Costa', amountCents: 300}],
    });
  });
  test('gt match', () => {
    expectSearch({
      q: {query: 'amount>3', ...params},
      results: [
        {vendor: 'Starbucks', amountCents: 325},
        {vendor: 'Electric', amountCents: 400},
      ],
    });
  });
  test('ge match', () => {
    expectSearch({
      q: {query: 'amount>=3.25', ...params},
      results: [
        {vendor: 'Starbucks', amountCents: 325},
        {vendor: 'Electric', amountCents: 400},
      ],
    });
  });
  test('overlapping match', () => {
    expectSearch({
      q: {query: 'amount>=3.25 amount<4', ...params},
      results: [{vendor: 'Starbucks', amountCents: 325}],
    });
  });
});

describe('search: date comparisons', () => {
  const t1 = tx('Costa', 3, 'Amex > Gold', 'Coffee');
  const t2 = tx('Starbucks', 3.25, 'Amex > Gold', 'Coffee');
  const t3 = tx('Electric', 4, 'HSBC > Current', 'Food');
  t1.timestampEpoch = new Date('2023-08-12 13:34 UTC').getTime();
  t2.timestampEpoch = new Date('2023-09-28 09:17 UTC').getTime();
  t3.timestampEpoch = new Date('2023-09-28 21:00 UTC').getTime();
  const params = modelParams([t1, t2, t3]);
  test('non existing date', () => {
    expectSearch({q: {query: 'date>2023-02-29', ...params}, results: []});
  });
  test('invalid date', () => {
    expectSearch({q: {query: 'date>monday', ...params}, results: []});
  });
  test('impossible date overlap', () => {
    expectSearch({
      q: {query: 'date>2023-02-02 date<2023-02-01', ...params},
      results: [],
    });
  });
  test('no results lt', () =>
    expectSearch({q: {query: 'date<2023-08-12', ...params}, results: []}));
  test('no results le', () => {
    expectSearch({q: {query: 'date<=2023-01-01', ...params}, results: []});
  });
  test('no results gt', () => {
    expectSearch({q: {query: 'date>2023-09-28', ...params}, results: []});
  });
  test('no results ge', () => {
    expectSearch({q: {query: 'date>2024-01-01', ...params}, results: []});
  });
  test('no results eq', () => {
    expectSearch({q: {query: 'date=2023-09-27', ...params}, results: []});
  });
  test('equals match', () => {
    expectSearch({
      q: {query: 'date=2023-08-12', ...params},
      results: [{vendor: 'Costa', amountCents: 300}],
    });
  });
  test('gt match', () => {
    expectSearch({
      q: {query: 'date>2023-08-12', ...params},
      results: [
        {vendor: 'Starbucks', amountCents: 325},
        {vendor: 'Electric', amountCents: 400},
      ],
    });
  });
  test('ge match', () => {
    expectSearch({
      q: {query: 'date>=2023-09-28', ...params},
      results: [
        {vendor: 'Starbucks', amountCents: 325},
        {vendor: 'Electric', amountCents: 400},
      ],
    });
  });
  test('overlapping match', () => {
    expectSearch({
      q: {query: 'date>2023-08-11 date<2023-09-28', ...params},
      results: [{vendor: 'Costa', amountCents: 300}],
    });
  });
});
