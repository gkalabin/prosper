import {expect, test} from '@jest/globals';
import {intersect, union} from 'lib/util/set';

describe('intersect', () => {
  test.each<{a: number[]; b: number[]; intersection: number[]}>`
    a            | b            | intersection
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
  `(
    'intersection of $a and $b is $intersection',
    (input: {a: number[]; b: number[]; intersection: number[]}) =>
      expect(intersect(input.a, input.b)).toEqual(input.intersection)
  );
});

describe('union', () => {
  test.each<{a: number[]; b: number[]; union: number[]}>`
    a            | b            | union
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
  `(
    'union of $a and $b is $union',
    (input: {a: number[]; b: number[]; union: number[]}) =>
      expect(union(input.a, input.b)).toEqual(new Set<number>(input.union))
  );
});
