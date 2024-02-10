import {expect, test} from '@jest/globals';
import {
  firstPositiveIntOrNull,
  firstValueOrNull,
  positiveIntOrNull,
} from '@/lib/util/searchParams';

describe('positiveIntOrNull', () => {
  test.each<{input: string | null; expected: string | null}>`
    input                 | expected
    ${null}               | ${null}
    ${''}                 | ${null}
    ${'x'}                | ${null}
    ${'1.0.0'}            | ${null}
    ${'1.0'}              | ${null}
    ${'9999999999999999'} | ${null}
    ${'-1'}               | ${null}
    ${'0'}                | ${null}
    ${'1'}                | ${1}
    ${'735'}              | ${735}
  `('parsing "$input" as int gives "$expected"', ({input, expected}) =>
    expect(positiveIntOrNull(input)).toEqual(expected)
  );
});

describe('firstValueOrNull', () => {
  test.each<{
    input: string | string[] | undefined;
    expected: string | null;
  }>`
    input             | expected
    ${undefined}      | ${null}
    ${[]}             | ${null}
    ${''}             | ${''}
    ${'abc'}          | ${'abc'}
    ${['abc']}        | ${'abc'}
    ${['abc', 'def']} | ${'abc'}
    ${['', 'def']}    | ${''}
  `('firstValueOrNull("$input") is "$expected"', ({input, expected}) =>
    expect(firstValueOrNull(input)).toEqual(expected)
  );
});

describe('firstPositiveIntOrNull', () => {
  test.each<{
    input: string | string[] | undefined;
    expected: number | null;
  }>`
    input             | expected
    ${undefined}      | ${null}
    ${''}             | ${null}
    ${'abc'}          | ${null}
    ${'735'}          | ${735}
    ${[]}             | ${null}
    ${['']}           | ${null}
    ${['abc']}        | ${null}
    ${['abc', 'def']} | ${null}
    ${['', 'def']}    | ${null}
    ${['-1']}         | ${null}
    ${['0']}          | ${null}
    ${['1']}          | ${1}
    ${['735']}        | ${735}
  `('firstPositiveIntOrNull("$input") is $expected', ({input, expected}) =>
    expect(firstPositiveIntOrNull(input)).toEqual(expected)
  );
});
