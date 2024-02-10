import {expect, test} from '@jest/globals';
import {intersect, union} from '@/lib/util/set';

describe('intersect', () => {
  test.each<{a: number[]; b: number[]; expected: number[]}>`
    a            | b            | expected
    ${[]}        | ${[]}        | ${[]}
    ${[0]}       | ${[]}        | ${[]}
    ${[]}        | ${[0]}       | ${[]}
    ${[1]}       | ${[0]}       | ${[]}
    ${[0]}       | ${[0]}       | ${[0]}
    ${[0, 1]}    | ${[0]}       | ${[0]}
    ${[0]}       | ${[0, 1]}    | ${[0]}
    ${[0, 0]}    | ${[0, 0]}    | ${[0, 0]}
    ${[0, 0, 0]} | ${[0, 0]}    | ${[0, 0]}
    ${[0, 0, 1]} | ${[0, 0, 0]} | ${[0, 0]}
    ${[1, 2, 4]} | ${[2, 4, 6]} | ${[2, 4]}
  `('intersection of $a and $b is $expected', ({a, b, expected}) =>
    expect(intersect(a, b)).toEqual(expected)
  );
});

describe('union', () => {
  test.each<{a: number[]; b: number[]; expected: number[]}>`
    a            | b            | expected
    ${[]}        | ${[]}        | ${[]}
    ${[0]}       | ${[]}        | ${[0]}
    ${[]}        | ${[0]}       | ${[0]}
    ${[0]}       | ${[0]}       | ${[0]}
    ${[0]}       | ${[1]}       | ${[0, 1]}
    ${[0, 1]}    | ${[0]}       | ${[0, 1]}
    ${[0]}       | ${[0, 1]}    | ${[0, 1]}
    ${[0, 0]}    | ${[0, 0]}    | ${[0]}
    ${[1, 2, 4]} | ${[]}        | ${[1, 2, 4]}
    ${[]}        | ${[2, 4, 6]} | ${[2, 4, 6]}
    ${[1, 2, 4]} | ${[2, 4, 6]} | ${[1, 2, 4, 6]}
  `('union of $a and $b is $expected', ({a, b, expected}) =>
    expect(union(a, b)).toEqual(new Set<number>(expected))
  );
});
