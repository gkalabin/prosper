import { DisplaySettings as DBDisplaySettings } from "@prisma/client";
import { useAllDatabaseDataContext } from "lib/ClientSideModel";
import { Currency } from "lib/model/Currency";

export const useDisplayCurrency = (): Currency => {
  const { displaySettings } = useAllDatabaseDataContext();
  return displaySettings.displayCurrency();
};

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
