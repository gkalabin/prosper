import {Currency, formatCurrency} from '@/lib/model/Currency';
import {Stock, formatStock} from '@/lib/model/Stock';

export type Unit = Stock | Currency;

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
