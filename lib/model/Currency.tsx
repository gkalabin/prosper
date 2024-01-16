export const NANOS_MULTIPLIER = 1000000000;

export type Currency = {
  kind: 'currency';
  code: string;
};

const currencies: Currency[] = ['RUB', 'USD', 'GBP', 'EUR'].map(code => ({
  kind: 'currency',
  code,
}));

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
  ['KZT', 'kk-KZ'],
  ['CNY', 'zh-CN'],
  ['JPY', 'ja-JP'],
  ['KRW', 'ko-KR'],
  ['HKD', 'zh-HK'],
]);

export function formatCurrency(
  currency: Currency,
  amountDollar: number,
  options?: Intl.NumberFormatOptions
) {
  const code = currency.code;
  const locale = CURRENCY_TO_LOCALE.get(code);
  const formatter = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: code,
    ...options,
  });
  return formatter.format(amountDollar);
}
