import {Amount} from '@/lib/Amount';
import {Currency, formatCurrency} from '@/lib/model/Currency';
import {Stock, formatStock} from '@/lib/model/Stock';

export type Unit = Stock | Currency;

export function formatUnit(
  unit: Unit,
  amount: Amount,
  options?: Intl.NumberFormatOptions
): string {
  switch (unit.kind) {
    case 'currency':
      return formatCurrency(unit, amount, options);
    case 'stock':
      return formatStock(unit, amount, options);
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

// Stable identity of a unit, e.g. for grouping amounts or as a render key.
export function unitKey(unit: Unit): string {
  return isCurrency(unit)
    ? `currency:${unit.code}`
    : `stock:${unit.exchange}:${unit.ticker}`;
}
