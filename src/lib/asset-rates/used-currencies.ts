import prisma from '@/lib/prisma';
import {notEmpty} from '@/lib/util/util';

/**
 * Returns a set of currency codes that are used in the app (regardless of the entity, like accounts or transactions).
 */
export async function getUsedCurrencyCodes(): Promise<Set<string>> {
  const [accounts, transactions, stocks, displaySettings] = await Promise.all([
    // Accounts can have a default currency
    prisma.bankAccount.findMany({
      select: {currencyCode: true},
      distinct: ['currencyCode'],
      where: {currencyCode: {not: null}},
    }),
    // External transactions (not associated with any account) have a currency explicitly set
    prisma.transaction.findMany({
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
    ...transactions.map(t => t.currencyCode),
    ...stocks.map(s => s.currencyCode),
    ...displaySettings.map(d => d.displayCurrencyCode),
  ].filter(notEmpty);
  return new Set(codes);
}
