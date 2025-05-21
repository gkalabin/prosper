import {Currency, formatCurrency, mustFindByCode} from '@/lib/model/Currency';
import {Stock, formatStock} from '@/lib/model/Stock';

export type Unit = Stock | Currency;

export type UnitId =
  | {
      kind: 'CURRENCY';
      currencyCode: string;
    }
  | {
      kind: 'STOCK';
      stockId: number;
    };

export function formatUnit(
  unit: Unit,
  amountDollar: number,
  options?: Intl.NumberFormatOptions
): string {
  switch (unit.kind) {
    case 'currency':
      return formatCurrency(unit, amountDollar, options);
    case 'stock':
      return formatStock(unit, amountDollar, options);
    default:
      const _exhaustivenessCheck: never = unit;
      throw new Error(`Unknown unit ${_exhaustivenessCheck}`);
  }
}

export function isCurrency(unit: Unit): unit is Currency {
  return unit.kind == 'currency';
}

export function isStock(unit: Unit): unit is Stock {
  return unit.kind == 'stock';
}

export function unitFromId(unitId: UnitId, stocks: Stock[]): Unit {
  switch (unitId.kind) {
    case 'CURRENCY':
      return mustFindByCode(unitId.currencyCode);
    case 'STOCK':
      const stock = stocks.find(s => s.id == unitId.stockId);
      if (!stock) {
        throw new Error(`Stock with id ${unitId.stockId} not found`);
      }
      return stock;
    default:
      const _exhaustivenessCheck: never = unitId;
      throw new Error(`Unknown unit id ${_exhaustivenessCheck}`);
  }
}
