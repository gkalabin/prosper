import { DisplaySettings as DBDisplaySettings } from "@prisma/client";
import { useAllDatabaseDataContext } from "lib/ClientSideModel";
import { Currencies, Currency } from "lib/model/Currency";

export const useDisplayCurrency = () => {
  const { displaySettings } = useAllDatabaseDataContext();
  return displaySettings.displayCurrency();
};

export class DisplaySettings {
  private readonly _displayCurrency: Currency;
  private readonly _excludeCategoryIdsInStats: number[];
  private readonly _dbValue: DBDisplaySettings;

  public constructor(init: DBDisplaySettings, currencies: Currencies) {
    this._dbValue = init;
    this._displayCurrency = currencies.findById(init.displayCurrencyId);
    this._excludeCategoryIdsInStats = init.excludeCategoryIdsInStats
      .split(",")
      .map((x) => +x)
      .filter((x) => x);
  }
  displayCurrency() {
    return this._displayCurrency;
  }
  excludeCategoryIdsInStats() {
    return this._excludeCategoryIdsInStats;
  }
}
