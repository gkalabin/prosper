import {UnitSchema} from '@/lib/form-types/AccountFormSchema';
import {findByCode} from '@/lib/model/Currency';
import prisma from '@/lib/prisma';
import {Prisma} from '@prisma/client';
import yahooFinance from 'yahoo-finance2';
import {type Quote} from 'yahoo-finance2/dist/esm/src/modules/quote';

type UnitId =
  | {
      kind: 'currency';
      currencyCode: string;
    }
  | {
      kind: 'stock';
      stockId: number;
    };

export function setUnitData(
  unitId: UnitId,
  data:
    | Prisma.BankAccountUncheckedCreateInput
    | Prisma.BankAccountUncheckedUpdateInput
): void {
  const unitIdKind = unitId.kind;
  if (unitIdKind == 'currency') {
    data.currencyCode = unitId.currencyCode;
  } else if (unitIdKind == 'stock') {
    data.stockId = unitId.stockId;
  } else {
    const _exhaustivenessCheck: never = unitIdKind;
    throw new Error(`Unknown unit kind: ${_exhaustivenessCheck}`);
  }
}

export async function getOrCreateUnitId(unit: UnitSchema): Promise<UnitId> {
  if (unit.kind === 'currency') {
    return {kind: 'currency', currencyCode: unit.currencyCode};
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
    return {kind: 'stock', stockId: existingStock.id};
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
  return {kind: 'stock', stockId: newStock.id};
}
