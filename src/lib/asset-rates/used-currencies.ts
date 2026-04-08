import prisma from '@/lib/prisma';
import {notEmpty} from '@/lib/util/util';

/**
 * Returns a set of currency codes that are used in the app (regardless of the entity, like accounts or transactions).
 */
export async function getUsedCurrencyCodes(): Promise<Set<string>> {
  const [accounts, entryLines, stocks, displaySettings] = await Promise.all([
    // Accounts can have a default currency
    prisma.bankAccount.findMany({
      select: {currencyCode: true},
      distinct: ['currencyCode'],
      where: {currencyCode: {not: null}},
    }),
    // External transactions (not associated with any account) do not have a currency set on the corresponding account.
    prisma.entryLine.findMany({
      select: {currencyCode: true},
      distinct: ['currencyCode'],
      where: {currencyCode: {not: null}},
    }),
    // Stocks are quoted in a currency
    prisma.stock.findMany({
      select: {currencyCode: true},
      distinct: ['currencyCode'],
    }),
    // Display settings have a preferred currency
    prisma.displaySettings.findMany({
      select: {displayCurrencyCode: true},
      distinct: ['displayCurrencyCode'],
    }),
  ]);
  const codes = [
    ...accounts.map(a => a.currencyCode),
    ...entryLines.map(l => l.currencyCode),
    ...stocks.map(s => s.currencyCode),
    ...displaySettings.map(d => d.displayCurrencyCode),
  ].filter(notEmpty);
  return new Set(codes);
}
