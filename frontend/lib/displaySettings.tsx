import {DisplaySettings as PbDisplaySettings} from '@/lib/grpc/gen/prosper/v1/ledger';
import {Currency, mustFindByCode} from '@/lib/model/Currency';

export class DisplaySettings {
  private readonly _displayCurrency: Currency;
  private readonly _excludeCategoryIdsInStats: number[];

  public constructor(init: PbDisplaySettings) {
    this._displayCurrency = mustFindByCode(init.displayCurrencyCode);
    this._excludeCategoryIdsInStats = init.excludeCategoryIdsInStats;
  }
  displayCurrency(): Currency {
    return this._displayCurrency;
  }
  excludeCategoryIdsInStats() {
    return this._excludeCategoryIdsInStats;
  }
}
