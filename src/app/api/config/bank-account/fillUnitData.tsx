import {UnitSchema} from '@/lib/form-types/AccountFormSchema';
import {findByCode} from '@/lib/model/Currency';
import prisma from '@/lib/prisma';
import {Prisma} from '@prisma/client';
import yahooFinance from 'yahoo-finance2';
import {type Quote} from 'yahoo-finance2/dist/esm/src/modules/quote';

export async function fillUnitData(
  unit: UnitSchema,
  data:
    | Prisma.BankAccountUncheckedCreateInput
    | Prisma.BankAccountUncheckedUpdateInput
): Promise<void> {
  if (unit.kind === 'currency') {
    data.currencyCode = unit.currencyCode;
    return;
  }
  if (unit.kind !== 'stock') {
    throw new Error('unknown unit kind: ' + unit);
  }
  const existingStock = await prisma.stock.findFirst({
    where: {
      exchange: unit.exchange,
      ticker: unit.ticker,
    },
  });
  if (existingStock) {
    data.stockId = existingStock.id;
    return;
  }
  const quote: Quote = await yahooFinance.quote(unit.ticker);
  if (!quote) {
    throw new Error('could not find stock: ' + unit.ticker);
  }
  if (!quote.currency) {
    throw new Error(`quote for ${unit.ticker} has no currency`);
  }
  const currency = findByCode(quote.currency.toUpperCase());
  if (!currency) {
    throw new Error(
      `could not find currency '${quote.currency}' when creating stock ${unit.ticker}`
    );
  }
  const newStock = await prisma.stock.create({
    data: {
      exchange: quote.exchange,
      ticker: quote.symbol,
      currencyCode: currency.code,
      name: quote.longName ?? quote.shortName ?? quote.symbol,
    },
  });
  data.stockId = newStock.id;
}
