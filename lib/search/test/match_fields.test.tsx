import { expect, test } from "@jest/globals";
import { search } from "lib/search/search";
import { clearModel, modelParams, tx } from "lib/search/test/helpers";

beforeEach(clearModel);

describe("search: match individual fields", () => {
  test("can find by vendor", () => {
    const params = modelParams([
      tx("Starbucks", 3.25, "Amex > Gold", "Coffee"),
      tx("Tesco", 10, "HSBC > Current", "Food"),
    ]);
    expect(search({ query: "tESCO", ...params })).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ vendor: "Tesco", amountCents: 1000 }),
      ]),
    );
  });

  test("can find by amount", () => {
    const params = modelParams([
      tx("Starbucks", 3.2, "Amex > Gold", "Coffee"),
      tx("BP", 13.25, "HSBC > Current", "Gas"),
      tx("Esso", 3.25, "HSBC > Current", "Gas"),
    ]);
    expect(search({ query: "3.2", ...params })).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ vendor: "Starbucks", amountCents: 320 }),
      ]),
    );
  });

  test("can find by bank", () => {
    const params = modelParams([
      tx("Starbucks", 3.2, "Amex > Gold", "Coffee"),
      tx("BP", 10, "HSBC > Current", "Gas"),
    ]);
    expect(search({ query: "amex", ...params })).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ vendor: "Starbucks", amountCents: 320 }),
      ]),
    );
  });

  test("can find by account", () => {
    const params = modelParams([
      tx("Starbucks", 3.25, "Amex > Gold", "Coffee"),
      tx("BP", 10, "HSBC > Current", "Gas"),
    ]);
    expect(search({ query: "current", ...params })).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ vendor: "BP", amountCents: 1000 }),
      ]),
    );
  });

  test("can find by category", () => {
    const params = modelParams([
      tx("Starbucks", 3.25, "Amex > Gold", "Coffee"),
      tx("BP", 10, "HSBC > Current", "Gas"),
    ]);
    expect(search({ query: "gas", ...params })).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ vendor: "BP", amountCents: 1000 }),
      ]),
    );
  });

  test("can find by transaction ID", () => {
    const t1 = tx("Starbucks", 3.25, "Amex > Gold", "Coffee");
    const t2 = tx("Esso", 4.15, "HSBC > Current", "Gas");
    const t3 = tx("Tesco", 2.49, "Amex > Gold", "Food");
    t1.id = 5;
    t2.id = 15;
    t3.id = 50;
    const params = modelParams([t1, t2, t3]);
    expect(search({ query: "5", ...params })).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 5, vendor: "Starbucks", amountCents: 325 }),
      ]),
    );
  });
});
