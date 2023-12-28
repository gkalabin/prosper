import { expect, test } from "@jest/globals";
import { parseAmountAsCents } from "lib/util/util";

describe("parseAmountAsCents", () => {
  test.each(["", " ", " 1", "1.", ".1", "1.123", "x"])(
    "parsing '%s' returns NaN",
    (a) => expect(parseAmountAsCents(a)).toBeNaN(),
  );
  test.each`
    a         | expected
    ${"1"}    | ${100}
    ${"1.00"} | ${100}
    ${"1.03"} | ${103}
    ${"1.23"} | ${123}
    ${"1.20"} | ${120}
    ${"0.23"} | ${23}
    ${"1,5"}  | ${150}
    ${"-1"}   | ${-100}
  `(
    "returns $expected when $a as parsed as amount",
    ({ a, expected }: { a: string; expected: number }) => {
      expect(parseAmountAsCents(a)).toEqual(expected);
    },
  );
});
