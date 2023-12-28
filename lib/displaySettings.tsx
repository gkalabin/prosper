import { DisplaySettings as DBDisplaySettings } from "@prisma/client";
import { Currency } from "lib/model/Currency";

export class DisplaySettings {
  private readonly _displayCurrency: Currency;
  private readonly _excludeCategoryIdsInStats: number[];

  public constructor(init: DBDisplaySettings) {
    this._displayCurrency = Currency.findByCode(init.displayCurrencyCode);
    this._excludeCategoryIdsInStats = init.excludeCategoryIdsInStats
      .split(",")
      .map((x) => +x)
      .filter((x) => x);
  }
  displayCurrency(): Currency {
    return this._displayCurrency;
  }
  excludeCategoryIdsInStats() {
    return this._excludeCategoryIdsInStats;
  }
}
