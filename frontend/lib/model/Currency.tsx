import {Amount} from '@/lib/Amount';

export const NANOS_MULTIPLIER = 1000000000;

export type Currency = {
  kind: 'currency';
  code: string;
};

const currencies: Currency[] = ['RUB', 'USD', 'GBP', 'EUR', 'CHF'].map(
  code => ({
    kind: 'currency',
    code,
  })
);

export function mustFindByCode(code: string): Currency {
  const found = findByCode(code);
  if (!found) {
    throw new Error(`Cannot find currency '${code}'`);
  }
  return found;
}

export function findByCode(code: string): Currency | null {
  const found = currencies.find(c => c.code == code);
  if (!found) {
    return null;
  }
  return found;
}

export function allCurrencies(): Currency[] {
  return [...currencies];
}

export const USD = mustFindByCode('USD');

const CURRENCY_TO_LOCALE: Map<string, string> = new Map([
  // TODO: use client's locale or provide a way to override it.
  ['EUR', 'nl-NL'],
  ['RUB', 'ru-RU'],
  ['GBP', 'en-GB'],
  ['USD', 'en-US'],
  ['CHF', 'de-CH'],
  ['KZT', 'kk-KZ'],
  ['CNY', 'zh-CN'],
  ['JPY', 'ja-JP'],
  ['KRW', 'ko-KR'],
  ['HKD', 'zh-HK'],
]);

// currencySymbol returns the symbol the currency renders with (e.g. "$", "€").
export function currencySymbol(currency: Currency): string {
  const parts = new Intl.NumberFormat(CURRENCY_TO_LOCALE.get(currency.code), {
    style: 'currency',
    currency: currency.code,
    maximumFractionDigits: 0,
  }).formatToParts(0);
  const symbol = parts.find(p => p.type === 'currency');
  if (!symbol) {
    throw new Error(`Cannot find symbol for currency '${currency.code}'`);
  }
  return symbol.value;
}

export function formatCurrency(
  currency: Currency,
  amount: Amount,
  options?: Intl.NumberFormatOptions
) {
  const code = currency.code;
  const locale = CURRENCY_TO_LOCALE.get(code);
  const formatter = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: code,
    maximumFractionDigits: amount.isRound() ? 0 : 2,
    ...options,
  });
  return formatter.format(amount.dollar());
}
