import {
  uniqMostFrequent,
  uniqMostFrequentIgnoringEmpty,
} from '@/lib/collections';
import {describe, expect, test} from '@jest/globals';

describe('uniqMostFrequent', () => {
  test('returns empty array for empty input', () => {
    expect(uniqMostFrequent([])).toEqual([]);
  });

  test('returns single element for single element input', () => {
    expect(uniqMostFrequent([1])).toEqual([1]);
  });

  test('returns elements sorted by frequency descending', () => {
    expect(uniqMostFrequent([1, 2, 2, 3, 3, 3])).toEqual([3, 2, 1]);
  });

  test('handles string arrays', () => {
    expect(uniqMostFrequent(['a', 'b', 'b', 'c', 'c', 'c'])).toEqual([
      'c',
      'b',
      'a',
    ]);
  });

  test('removes duplicates', () => {
    expect(uniqMostFrequent([1, 1, 1])).toEqual([1]);
  });

  test('preserves order of first appearance for elements with same frequency', () => {
    expect(uniqMostFrequent([1, 2])).toEqual([1, 2]);
    expect(uniqMostFrequent([2, 1])).toEqual([2, 1]);
  });
});

describe('uniqMostFrequentIgnoringEmpty', () => {
  test('ignores null and undefined values', () => {
    expect(uniqMostFrequentIgnoringEmpty([1, null, 2, undefined, 2])).toEqual([
      2, 1,
    ]);
  });

  test('returns empty array if all values are empty', () => {
    expect(uniqMostFrequentIgnoringEmpty([null, undefined])).toEqual([]);
  });

  test('handles string arrays with empty values', () => {
    expect(uniqMostFrequentIgnoringEmpty(['a', null, 'b', 'b'])).toEqual([
      'b',
      'a',
    ]);
  });
});
